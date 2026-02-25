/**
 * XActions Local Scheduler
 * Cron-based task scheduler with job history and webhook triggers.
 *
 * Kills: Phantombuster (cloud scheduling), Apify (actors + schedules)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import cron from 'node-cron';
import { execFile, spawn } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

const CONFIG_DIR = path.join(os.homedir(), '.xactions');
const SCHEDULER_FILE = path.join(CONFIG_DIR, 'scheduler.json');
const HISTORY_DIR = path.join(CONFIG_DIR, 'scheduler-history');

// ============================================================================
// Scheduler Class
// ============================================================================

export class Scheduler extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map(); // name → { config, cronTask }
    this.running = false;
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }

  /**
   * Load saved jobs from disk
   */
  async load() {
    try {
      const data = JSON.parse(await fsp.readFile(SCHEDULER_FILE, 'utf-8'));
      for (const config of data.jobs || []) {
        this._registerJob(config);
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
    const { name, cron: cronExpr, command, args = [], enabled = true, maxRetries = 2, timeout = 300000 } = config;

    if (!name || !cronExpr || !command) {
      throw new Error('Job requires: name, cron, command');
    }

    if (!cron.validate(cronExpr)) {
      throw new Error(`Invalid cron expression: ${cronExpr}`);
    }

    if (this.jobs.has(name)) {
      throw new Error(`Job "${name}" already exists. Remove it first.`);
    }

    const jobConfig = { name, cron: cronExpr, command, args, enabled, maxRetries, timeout, createdAt: new Date().toISOString() };
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
      const files = (await fsp.readdir(HISTORY_DIR))
        .filter(f => f.startsWith(`${name}_`))
        .sort()
        .reverse()
        .slice(0, limit);

      const history = [];
      for (const file of files) {
        try {
          const content = await fsp.readFile(path.join(HISTORY_DIR, file), 'utf-8');
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
    const task = cron.schedule(config.cron, () => {
      this._executeJob(this.jobs.get(config.name));
    }, { scheduled: false });

    this.jobs.set(config.name, {
      config,
      cronTask: task,
      lastRun: null,
      lastStatus: null,
    });
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

    while (retries <= config.maxRetries) {
      try {
        result = await this._runCommand(config.command, config.args, config.timeout);
        break;
      } catch (error) {
        retries++;
        if (retries <= config.maxRetries) {
          const delay = Math.min(60000, 2000 * Math.pow(2, retries));
          console.log(`⚠️  Job "${config.name}" failed (attempt ${retries}/${config.maxRetries + 1}), retrying in ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          result = { exitCode: 1, stdout: '', stderr: error.message, error: true };
        }
      }
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    job.lastRun = startTime.toISOString();
    job.lastStatus = result.error ? 'failed' : 'success';

    // Save history
    const historyFile = path.join(HISTORY_DIR, `${config.name}_${timestamp}.log`);
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

  _runCommand(command, args = [], timeout = 300000) {
    return new Promise((resolve, reject) => {
      const cliPath = path.join(process.cwd(), 'bin', 'unfollowx');
      const fullArgs = command.split(/\s+/).concat(args);

      const proc = spawn('node', [cliPath, ...fullArgs], {
        cwd: process.cwd(),
        env: { ...process.env },
        timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          resolve({ exitCode: code, stdout, stderr, error: true });
        } else {
          resolve({ exitCode: 0, stdout, stderr, error: false });
        }
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
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(SCHEDULER_FILE, JSON.stringify(data, null, 2));
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
