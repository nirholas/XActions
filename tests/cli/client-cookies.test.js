// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: the `xactions client` commands refuse a saved cookie file they cannot
 * read, instead of silently running as a guest.
 *
 * Offline: the failure happens before any request, in a temp XACTIONS_HOME.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../../src/cli/index.js', import.meta.url));

let home;

beforeAll(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-client-cookies-'));
  await fs.writeFile(path.join(home, 'cookies.json'), '{ this is not json');
});

afterAll(() => fs.rm(home, { recursive: true, force: true }));

describe('xactions client with a corrupt cookies.json', () => {
  it('fails with the file path instead of answering as a guest', () => {
    const r = spawnSync(process.execPath, [CLI, 'client', 'profile', 'nichxbt'], {
      env: { ...process.env, XACTIONS_HOME: home, HOME: home, FORCE_COLOR: '0', NO_COLOR: '1' },
      encoding: 'utf-8',
      timeout: 60000,
    });
    const output = r.stdout + r.stderr;
    expect(r.status).toBe(1);
    expect(output).toContain(`Could not load saved cookies from ${path.join(home, 'cookies.json')}`);
  });
});
