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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

  it('persists the default command when -c is omitted', () => {
    execFileSync(
      process.execPath,
      [CLI, 'schedule', 'add', 'cli-default', '0 10 * * *'],
      { env: { ...process.env, HOME: tmpHome } }
    );
    const job = savedJobs().find((j) => j.name === 'cli-default');
    assert.ok(job);
    assert.equal(job.command, 'echo "Job: cli-default"');
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
    assert.match(out, /cli-default/);
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
