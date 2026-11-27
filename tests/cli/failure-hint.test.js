// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * A failed command ends with one line pointing at `xactions doctor --report`,
 * so a bug report arrives with the facts. Usage mistakes and doctor itself
 * do not get the line: neither is a bug to report.
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

import { REPORT_HINT, shouldHint, reportFatal } from '../../src/cli/failure-hint.js';

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/cli/index.js');
let tmp;

/**
 * @param {string[]} args
 * @param {Record<string, string>} [env]
 */
function cli(args, env = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 90000,
    env: { ...process.env, HOME: tmp, USERPROFILE: tmp, XACTIONS_HOME: path.join(tmp, '.xactions'), NO_COLOR: '1', ...env },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** @param {string} text */
const lastLine = (text) => text.trim().split('\n').pop();

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-hint-'));
});

afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('shouldHint', () => {
  it('hints on a failed command only', () => {
    expect(shouldHint({ code: 1, command: 'profile', usageError: false })).toBe(true);
    expect(shouldHint({ code: 0, command: 'profile', usageError: false })).toBe(false);
    expect(shouldHint({ code: 1, command: 'profile', usageError: true })).toBe(false);
    expect(shouldHint({ code: 1, command: 'doctor', usageError: false })).toBe(false);
    expect(shouldHint({ code: 1, command: null, usageError: false })).toBe(true);
  });
});

describe('reportFatal', () => {
  it('prints the message, not a stack, and marks the run failed', () => {
    const written = [];
    const proc = { exitCode: 0, env: {} };
    reportFatal(new Error('boom'), { write: (s) => written.push(s), proc });
    expect(written.join('')).toBe('boom\n');
    expect(proc.exitCode).toBe(1);
  });

  it('adds the stack when DEBUG is set', () => {
    const written = [];
    reportFatal(new Error('boom'), { write: (s) => written.push(s), proc: { exitCode: 0, env: { DEBUG: '1' } } });
    expect(written.join('')).toMatch(/boom\n[\s\S]*at /);
  });
});

describe('the CLI', () => {
  it('ends a failed command with the doctor --report line on stderr', () => {
    const run = cli(['skills', 'show', 'no-such-skill']);
    expect(run.code).toBe(1);
    expect(lastLine(run.stderr)).toBe(REPORT_HINT);
    expect(run.stdout).not.toContain(REPORT_HINT);
  });

  it('says nothing extra for a usage error', () => {
    for (const args of [['no-such-command'], ['profile']]) {
      const run = cli(args);
      expect(run.code).toBe(1);
      expect(run.stderr).not.toContain(REPORT_HINT);
    }
  });

  it('says nothing extra when the command succeeds', () => {
    const run = cli(['--version']);
    expect(run.code).toBe(0);
    expect(run.stderr).not.toContain(REPORT_HINT);
  });

  it('says nothing extra when doctor itself finds a failure', async () => {
    const blocker = path.join(tmp, 'blocker');
    await fs.writeFile(blocker, '');
    const run = cli(['doctor', '--json', '--offline'], { XACTIONS_HOME: path.join(blocker, 'home') });
    expect(run.code).toBe(1);
    expect(run.stderr).not.toContain(REPORT_HINT);
  });
});
