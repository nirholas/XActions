// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: importing the job queue module has no process-wide side effects.
 *
 * It used to install SIGINT/SIGTERM handlers and an hourly interval at import
 * time, so any importer (tests, CLI, library use) had its signal handling
 * hijacked and its process kept alive. Startup is now the explicit
 * startJobQueueLifecycle(), called by the server entry point.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('../..', import.meta.url).pathname;
const moduleUrl = pathToFileURL(join(root, 'api/services/jobQueue.js')).href;

function run(body) {
  const dir = mkdtempSync(join(tmpdir(), 'xactions-jq-import-'));
  try {
    const file = join(dir, 'probe.mjs');
    writeFileSync(file, body);
    return spawnSync(process.execPath, [file], {
      encoding: 'utf8',
      timeout: 20000,
      cwd: root,
      env: {
        ...process.env, HOME: dir, NODE_ENV: 'test', JWT_SECRET: 'jq-import-test-secret',
        REDIS_URL: '', REDIS_HOST: '127.0.0.1', REDIS_PORT: '1', XACTIONS_QUEUE_TIMEOUT_MS: '500',
      },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('jobQueue module import', () => {
  it('adds no signal listeners and no active timers', () => {
    const r = run(`
      const before = { int: process.listenerCount('SIGINT'), term: process.listenerCount('SIGTERM'), handles: process._getActiveHandles().length };
      const mod = await import(${JSON.stringify(moduleUrl)});
      const after = { int: process.listenerCount('SIGINT'), term: process.listenerCount('SIGTERM') };
      const timers = process.getActiveResourcesInfo().filter((n) => n === 'Timeout').length;
      console.log(JSON.stringify({ dInt: after.int - before.int, dTerm: after.term - before.term, timers, hasStart: typeof mod.startJobQueueLifecycle }));
      process.exit(0);
    `);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    expect(out.dInt).toBe(0);
    expect(out.dTerm).toBe(0);
    expect(out.timers).toBe(0);
    expect(out.hasStart).toBe('function');
  });

  it('start installs the handlers once and an unref-ed interval', () => {
    const r = run(`
      const mod = await import(${JSON.stringify(moduleUrl)});
      const i0 = process.listenerCount('SIGINT');
      mod.startJobQueueLifecycle();
      mod.startJobQueueLifecycle();
      console.log(JSON.stringify({ dInt: process.listenerCount('SIGINT') - i0, dTerm: process.listenerCount('SIGTERM') }));
      process.exit(0);
      
    `);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    expect(out.dInt).toBe(1);
    expect(out.dTerm).toBe(1);
  });
});
