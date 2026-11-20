// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: api/server.js starts listening when launched through a symlink (an
 * npx or bin shim), not only when argv[1] is its literal path.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;

describe('api/server.js entry point', () => {
  it('binds a port when started via a symlink to it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xactions-server-entry-'));
    const link = join(dir, 'xactions-api.js');
    symlinkSync(join(root, 'api/server.js'), link);
    const child = spawn(process.execPath, [link], {
      cwd: dir,
      env: {
        ...process.env, HOME: dir, NODE_ENV: 'test', PORT: '0', REDIS_URL: '',
        JWT_SECRET: 'server-entry-test-secret-0123456789abcdef', REDIS_HOST: '127.0.0.1', REDIS_PORT: '1',
      },
    });
    let out = '';
    try {
      const listening = await new Promise((resolve) => {
        const done = (v) => { clearTimeout(timer); resolve(v); };
        const timer = setTimeout(() => done(false), 40000);
        child.stdout.on('data', (b) => { out += b; if (/XActions API Server running/.test(out)) done(true); });
        child.stderr.on('data', (b) => { out += b; });
        child.on('exit', () => done(false));
      });
      expect(listening, out).toBe(true);
    } finally {
      child.kill('SIGKILL');
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60000);
});
