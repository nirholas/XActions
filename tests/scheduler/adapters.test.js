// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @author nich (@nichxbt) - https://github.com/nirholas
 *
 * Regression: `xactions schedule add` and `x_schedule_add` used to pass
 * `action:` to Scheduler.addJob, which requires `command:` — every add threw
 * and nothing persisted. These tests exercise both adapters end-to-end and
 * assert the job lands in ~/.xactions/scheduler.json with `command` set.
 *
 * Isolation: scheduler.js computes CONFIG_DIR from os.homedir() at module
 * load, so HOME must point at a temp dir BEFORE the first dynamic import.
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const CLI = path.resolve('src/cli/index.js');

let tmpHome;
let originalHome;

function schedulerFile() {
  return path.join(tmpHome, '.xactions', 'scheduler.json');
}
function savedJobs() {
  const data = JSON.parse(fs.readFileSync(schedulerFile(), 'utf-8'));
  return data.jobs;
}

beforeAll(() => {
  originalHome = process.env.HOME;
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-sched-'));
  process.env.HOME = tmpHome;
});

afterAll(() => {
  process.env.HOME = originalHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

describe('xactions schedule add (CLI)', () => {
  it('persists a job with the -c command', () => {
    execFileSync(
      process.execPath,
      [CLI, 'schedule', 'add', 'cli-cmd', '0 9 * * *', '-c', 'echo hi'],
      { env: { ...process.env, HOME: tmpHome } }
    );
    const jobs = savedJobs();
    const job = jobs.find((j) => j.name === 'cli-cmd');
    assert.ok(job, 'job must be persisted to scheduler.json');
    assert.equal(job.command, 'echo hi');
  });

  it('rejects a missing or blank command without persisting a job', () => {
    for (const options of [[], ['--command', '   ']]) {
      assert.throws(() => execFileSync(process.execPath,
        [CLI, 'schedule', 'add', 'cli-missing-command', '0 10 * * *', ...options],
        { env: { ...process.env, HOME: tmpHome }, stdio: 'pipe' },
      ), (error) => error.status === 1 && /--command is required/.test(error.stderr.toString()));
    }
    assert.ok(!savedJobs().some((j) => j.name === 'cli-missing-command'));
  });

  it('keeps earlier jobs when adding another explicit command', () => {
    execFileSync(
      process.execPath,
      [CLI, 'schedule', 'add', 'cli-second', '0 10 * * *', '--command', 'doctor'],
      { env: { ...process.env, HOME: tmpHome } }
    );
    const job = savedJobs().find((j) => j.name === 'cli-second');
    assert.ok(job);
    assert.equal(job.command, 'doctor');
    // Regression: without load() before add, each add overwrote scheduler.json
    // with only the newest job — the earlier one vanished from disk.
    assert.ok(
      savedJobs().some((j) => j.name === 'cli-cmd'),
      'earlier job must still be persisted — add must not clobber the file'
    );
  });

  it('schedule list shows the added jobs', () => {
    const out = execFileSync(process.execPath, [CLI, 'schedule', 'list'], {
      env: { ...process.env, HOME: tmpHome },
      encoding: 'utf-8',
    });
    assert.match(out, /cli-cmd/);
    assert.match(out, /cli-second/);
  });

  it('reports a child command failure with a nonzero CLI exit', () => {
    execFileSync(process.execPath, [CLI, 'schedule', 'add', 'cli-fail', '0 9 * * *', '-c', 'unknown-regression-command']);
    assert.throws(() => execFileSync(process.execPath, [CLI, 'schedule', 'run', 'cli-fail'], { stdio: 'pipe' }),
      (error) => error.status === 1 && /cli-fail.*failed.*exit/i.test(error.stderr.toString()));
  });

  it('reconciles two schedulers without rewriting disk or replacing unchanged tasks', async () => {
    const { Scheduler } = await import('../../src/scheduler/scheduler.js');
    const first = await new Scheduler().load();
    first.addJob({ name: 'external-removal', cron: '0 9 * * *', command: 'doctor' });
    const other = await new Scheduler().load();
    const unchanged = other.jobs.get('cli-second').cronTask;
    first.removeJob('external-removal');
    first.addJob({ name: 'external-add', cron: '0 9 * * *', command: 'doctor' });
    const snapshot = fs.readFileSync(schedulerFile(), 'utf8');
    await other.load();
    assert.equal(other.jobs.get('cli-second').cronTask, unchanged);
    assert.equal(other.jobs.has('external-removal'), false);
    assert.ok(other.jobs.has('external-add'));
    assert.equal(fs.readFileSync(schedulerFile(), 'utf8'), snapshot);
    other.addJob({ name: 'after-reload', cron: '0 9 * * *', command: 'doctor' });
    assert.ok(!savedJobs().some((job) => job.name === 'external-removal'));
  });
});

describe('x_schedule_add (MCP)', () => {
  it('persists a job with command mapped from args.action', async () => {
    const { executeTool } = await import('../../src/mcp/server.js');
    const result = await executeTool('x_schedule_add', {
      name: 'mcp-cmd',
      cron: '0 8 * * *',
      action: 'echo mcp',
    });
    assert.equal(result.status, 'scheduled');
    const job = savedJobs().find((j) => j.name === 'mcp-cmd');
    assert.ok(job, 'job must be persisted to scheduler.json');
    assert.equal(job.command, 'echo mcp');
  });

  it('defaults command to the job name when action is omitted', async () => {
    const { executeTool } = await import('../../src/mcp/server.js');
    await executeTool('x_schedule_add', { name: 'mcp-default', cron: '0 7 * * *' });
    const job = savedJobs().find((j) => j.name === 'mcp-default');
    assert.ok(job);
    assert.equal(job.command, 'mcp-default');
  });

  it('x_schedule_list returns the persisted jobs', async () => {
    const { executeTool } = await import('../../src/mcp/server.js');
    const jobs = await executeTool('x_schedule_list', {});
    const names = jobs.map((j) => j.name);
    assert.ok(names.includes('mcp-cmd'));
    assert.ok(names.includes('mcp-default'));
  });
});
