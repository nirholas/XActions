// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Local Scheduler
 * Cron-based task scheduler with job history and webhook triggers.
 *
 * Kills: Phantombuster (cloud scheduling), Apify (actors + schedules)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import cron from 'node-cron';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { xactionsHome } from '../utils/savedSession.js';
import { EventEmitter } from 'events';

// Resolved per call, not at import, so XACTIONS_HOME set after import (by a
// test, or a CLI flag) is honoured.
const configDir = () => xactionsHome();
const schedulerFile = () => path.join(configDir(), 'scheduler.json');
const historyDir = () => path.join(configDir(), 'scheduler-history');

/**
 * The xactions CLI that jobs run, resolved from this module rather than the
 * working directory: a job must run the installed XActions, not whatever
 * `bin/` happens to sit in the directory the scheduler was started from.
 */
export const CLI_PATH = fileURLToPath(new URL('../cli/index.js', import.meta.url));

// ============================================================================
// Scheduler Class
// ============================================================================

export class Scheduler extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map(); // name → { config, cronTask }
    this.running = false;
    fs.mkdirSync(configDir(), { recursive: true });
    fs.mkdirSync(historyDir(), { recursive: true });
  }

  /**
   * Load saved jobs from disk
   */
  async load() {
    try {
      const data = JSON.parse(await fsp.readFile(schedulerFile(), 'utf-8'));
      if (!Array.isArray(data?.jobs) || data.jobs.some((job) =>
        !job || typeof job.name !== 'string' || typeof job.cron !== 'string' || !cron.validate(job.cron))) {
        return this;
      }
      // Reconcile against the snapshot: jobs removed through another process
      // (CLI vs API share the same file) must disappear here too, or the next
      // _save() writes them back and deleted jobs resurrect.
      const savedNames = new Set(data.jobs.map(({ name }) => name));
      for (const [name, job] of this.jobs) {
        if (!savedNames.has(name)) {
          try { job.cronTask.destroy(); } catch { try { job.cronTask.stop(); } catch { /* already stopped */ } }
          this.jobs.delete(name);
        }
      }
      for (const config of data.jobs) {
        const existing = this.jobs.get(config.name);
        if (JSON.stringify(existing?.config) !== JSON.stringify(config)) {
          this._registerJob(config);
        }
      }
      console.log(`📋 Loaded ${this.jobs.size} scheduled jobs`);
    } catch {
      // No saved jobs
    }
    return this;
  }

  /**
   * Add a new scheduled job
   */
  addJob(config) {
    const { name, cron: cronExpr, command, args = [], enabled = true, maxRetries = 2, timeout = 300000, webhookSecret } = config;

    if (!name || !cronExpr || !command) {
      throw new Error('Job requires: name, cron, command');
    }
    // The name becomes part of the history file path, so it must be a plain name.
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(name) || name.includes('..')) {
      throw new Error(`Invalid job name "${String(name).slice(0, 64)}": use letters, digits, ".", "-" and "_"`);
    }

    if (!cron.validate(cronExpr)) {
      throw new Error(`Invalid cron expression: ${cronExpr}`);
    }

    if (this.jobs.has(name)) {
      throw new Error(`Job "${name}" already exists. Remove it first.`);
    }

    if (webhookSecret !== undefined && (typeof webhookSecret !== 'string' || webhookSecret.length < 16)) {
      throw new Error('webhookSecret must be a string of at least 16 characters');
    }

    const jobConfig = {
      name, cron: cronExpr, command, args, enabled, maxRetries, timeout,
      ...(webhookSecret && { webhookSecret }),
      createdAt: new Date().toISOString(),
    };
    this._registerJob(jobConfig);
    this._save();

    console.log(`✅ Job "${name}" added: ${cronExpr} → ${command}`);
    return jobConfig;
  }

  /**
   * Remove a job
   */
  removeJob(name) {
    const job = this.jobs.get(name);
    if (!job) return { error: `Job "${name}" not found` };

    if (job.cronTask) job.cronTask.stop();
    this.jobs.delete(name);
    this._save();

    console.log(`🗑️  Job "${name}" removed`);
    return { status: 'removed', name };
  }

  /**
   * Enable a job
   */
  enableJob(name) {
    const job = this.jobs.get(name);
    if (!job) return { error: `Job "${name}" not found` };

    job.config.enabled = true;
    if (job.cronTask && this.running) job.cronTask.start();
    this._save();
    return { status: 'enabled', name };
  }

  /**
   * Disable a job
   */
  disableJob(name) {
    const job = this.jobs.get(name);
    if (!job) return { error: `Job "${name}" not found` };

    job.config.enabled = false;
    if (job.cronTask) job.cronTask.stop();
    this._save();
    return { status: 'disabled', name };
  }

  /**
   * Set (or generate) the secret a webhook must present to trigger this job.
   * A job without one cannot be triggered over HTTP at all.
   *
   * @param {string} name
   * @param {string} [secret] at least 16 characters; omitted, a random one is made
   * @returns {{ name: string, webhookSecret: string } | { error: string }}
   */
  setWebhookSecret(name, secret) {
    const job = this.jobs.get(name);
    if (!job) return { error: `Job "${name}" not found` };
    const value = secret ?? crypto.randomBytes(24).toString('base64url');
    if (typeof value !== 'string' || value.length < 16) {
      return { error: 'webhookSecret must be a string of at least 16 characters' };
    }
    job.config.webhookSecret = value;
    this._save();
    return { name, webhookSecret: value };
  }

  /**
   * List all jobs with status
   */
  listJobs() {
    const result = [];
    for (const [name, job] of this.jobs) {
      result.push({
        name,
        cron: job.config.cron,
        command: job.config.command,
        enabled: job.config.enabled,
        lastRun: job.lastRun || null,
        lastStatus: job.lastStatus || null,
        createdAt: job.config.createdAt,
      });
    }
    return result;
  }

  /**
   * Get job run history
   */
  async getJobHistory(name, limit = 10) {
    try {
      const files = (await fsp.readdir(historyDir()))
        .filter(f => f.startsWith(`${name}_`))
        .sort()
        .reverse()
        .slice(0, limit);

      const history = [];
      for (const file of files) {
        try {
          const content = await fsp.readFile(path.join(historyDir(), file), 'utf-8');
          const [meta, ...outputLines] = content.split('\n---OUTPUT---\n');
          const metadata = JSON.parse(meta);
          history.push({ ...metadata, outputPreview: outputLines.join('\n').slice(0, 500) });
        } catch {
          history.push({ file, error: 'Could not parse' });
        }
      }
      return history;
    } catch {
      return [];
    }
  }

  /**
   * Run a job immediately
   */
  async runJobNow(name) {
    const job = this.jobs.get(name);
    if (!job) return { error: `Job "${name}" not found` };

    return await this._executeJob(job);
  }

  /**
   * Start the scheduler daemon
   */
  start() {
    this.running = true;
    for (const [, job] of this.jobs) {
      if (job.config.enabled && job.cronTask) {
        job.cronTask.start();
      }
    }
    console.log('🚀 Scheduler started');
    return { status: 'running', jobs: this.jobs.size };
  }

  /**
   * Stop the scheduler daemon
   */
  stop() {
    this.running = false;
    for (const [, job] of this.jobs) {
      if (job.cronTask) job.cronTask.stop();
    }
    console.log('⏹️  Scheduler stopped');
    return { status: 'stopped' };
  }

  // ── Internal ──

  _registerJob(config) {
    // createTask, not schedule: node-cron 4 starts a scheduled task
    // immediately, and jobs here must stay idle until start() is called.
    const existing = this.jobs.get(config.name);
    if (existing?.cronTask) {
      // destroy() removes the task from node-cron's registry; stop() only
      // halts it and leaves the dead entry there.
      // Replacing a job: whichever teardown this node-cron build supports is
      // enough, and a task that is already stopped needs neither.
      try { existing.cronTask.destroy(); } catch { try { existing.cronTask.stop(); } catch { /* already stopped */ } }
    }

    const task = cron.createTask(config.cron, () => {
      this._executeJob(this.jobs.get(config.name));
    });

    this.jobs.set(config.name, {
      config,
      cronTask: task,
      // Keep run history across load() refreshes so listJobs() keeps
      // reporting lastRun/lastStatus in long-lived processes.
      lastRun: existing?.lastRun ?? null,
      lastStatus: existing?.lastStatus ?? null,
    });

    // load() may re-register a job while the daemon is running — the new
    // task is created idle, so it must be started here or the job stops firing.
    if (this.running && config.enabled !== false) task.start();
  }

  async _executeJob(job) {
    if (!job) return { error: 'Job not found' };

    const { config } = job;
    const startTime = new Date();
    const timestamp = startTime.toISOString().replace(/[:.]/g, '-');

    this.emit('job:start', { name: config.name, startTime: startTime.toISOString() });
    console.log(`▶️  Running job "${config.name}": ${config.command}`);

    let retries = 0;
    let result = null;
    const maxRetries = config.maxRetries ?? 2;

    // _runCommand rejects on a non-zero exit as well as a spawn failure, so a
    // command that fails is retried rather than recorded as done on try one.
    while (retries <= maxRetries) {
      try {
        result = await this._runCommand(config.command, config.args, config.timeout);
        break;
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const delay = this._retryDelay(retries);
          console.log(`⚠️  Job "${config.name}" failed (attempt ${retries}/${maxRetries + 1}), retrying in ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          result = {
            exitCode: error.exitCode ?? 1,
            stdout: error.stdout || '',
            stderr: error.stderr || error.message,
            error: true,
          };
        }
      }
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    job.lastRun = startTime.toISOString();
    job.lastStatus = result.error ? 'failed' : 'success';

    // Save history
    const historyFile = path.join(historyDir(), `${config.name}_${timestamp}.log`);
    const metadata = {
      name: config.name,
      command: config.command,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration}ms`,
      exitCode: result.exitCode,
      status: result.error ? 'failed' : 'success',
      retries,
    };
    await fsp.writeFile(historyFile, JSON.stringify(metadata) + '\n---OUTPUT---\n' + (result.stdout || '') + '\n' + (result.stderr || ''));

    if (result.error) {
      this.emit('job:error', { name: config.name, error: result.stderr || 'Unknown error' });
      console.log(`❌ Job "${config.name}" failed after ${retries} retries`);
    } else {
      this.emit('job:complete', { name: config.name, duration });
      console.log(`✅ Job "${config.name}" completed in ${duration}ms`);
    }

    return { ...metadata, outputPreview: (result.stdout || '').slice(0, 500) };
  }

  /** Backoff before retry `n` (1-based). */
  _retryDelay(n) {
    return Math.min(60000, 2000 * Math.pow(2, n));
  }

  /**
   * Run one xactions CLI command. Resolves on exit code 0; rejects otherwise
   * (non-zero exit, killed by the timeout, or failed to spawn) with
   * `exitCode`, `stdout` and `stderr` attached to the error.
   */
  _runCommand(command, args = [], timeout = 300000) {
    return new Promise((resolve, reject) => {
      const fullArgs = command.split(/\s+/).filter(Boolean).concat(args);

      // process.execPath, not "node" from PATH, so the job runs under the same
      // Node that runs the scheduler.
      const proc = spawn(process.execPath, [CLI_PATH, ...fullArgs], {
        cwd: process.cwd(),
        env: { ...process.env },
        timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code, signal) => {
        if (code === 0) {
          resolve({ exitCode: 0, stdout, stderr, error: false });
          return;
        }
        const reason = code === null ? `killed by ${signal || 'signal'}` : `exited with code ${code}`;
        const error = new Error(`Command "${command}" ${reason}`);
        error.exitCode = code ?? 1;
        error.stdout = stdout;
        error.stderr = stderr || error.message;
        reject(error);
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  _save() {
    const data = { jobs: [] };
    for (const [, job] of this.jobs) {
      data.jobs.push(job.config);
    }
    fs.mkdirSync(configDir(), { recursive: true });
    fs.writeFileSync(schedulerFile(), JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance = null;

export function getScheduler() {
  if (!_instance) {
    _instance = new Scheduler();
  }
  return _instance;
}

// ============================================================================
// Job Templates
// ============================================================================

export const JOB_TEMPLATES = [
  { name: 'daily-snapshot', cron: '0 9 * * *', command: 'history:snapshot myaccount', description: 'Daily follower snapshot at 9am' },
  { name: 'hourly-trends', cron: '0 * * * *', command: 'search "from:competitor" --output latest.json', description: 'Hourly trend monitor' },
  { name: 'weekly-cleanup', cron: '0 10 * * 1', command: 'non-followers myaccount --output cleanup.csv', description: 'Weekly non-follower cleanup' },
  { name: 'engagement-check', cron: '0 */6 * * *', command: 'history:snapshot myaccount', description: 'Every 6 hours: engagement check' },
];

// by nichxbt
