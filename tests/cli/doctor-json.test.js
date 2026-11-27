// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions doctor --json`, `--report` and `--issue`, run as the real binary
 * against a throwaway home. `--offline` keeps x.com out of it, so the result
 * is the same on a laptop and in CI.
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

import { CHECK_IDS, exitCodeFor } from '../../src/cli/commands/doctor.js';

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/cli/index.js');

/** The ids are a public contract: scripts and issue triage key on them. */
const STABLE_IDS = [
  'node', 'sqlite', 'home', 'shadowed-install', 'browser', 'mcp', 'skills', 'query-ids', 'clock',
  'guest-profile', 'guest-timeline',
  'session-saved', 'session-valid', 'accounts',
];
const NETWORK_IDS = ['clock', 'guest-profile', 'guest-timeline', 'session-valid'];

const AUTH_TOKEN = '9e8d7c6b5a49382716059e8d7c6b5a4938271605';
const CT0 = '0123456789abcdef'.repeat(10);
const PROXY = 'http://scraper:hunter2pass@172.16.9.9:8080';
const SOCKS = 'socks5://egress.corp-example.net:1080';

let tmp;

/**
 * @param {string[]} args
 * @param {Record<string, string>} [extraEnv]
 */
function doctor(args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [CLI, 'doctor', ...args], {
    encoding: 'utf-8',
    timeout: 90000,
    env: {
      ...process.env,
      HOME: path.join(tmp, 'home'),
      USERPROFILE: path.join(tmp, 'home'),
      XACTIONS_HOME: path.join(tmp, 'home', '.xactions'),
      NO_COLOR: '1',
      ...extraEnv,
    },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-doctor-cli-'));
  await fs.mkdir(path.join(tmp, 'home', '.xactions'), { recursive: true });
  await fs.writeFile(
    path.join(tmp, 'home', '.xactions', 'cookies.json'),
    JSON.stringify([{ name: 'auth_token', value: AUTH_TOKEN }, { name: 'ct0', value: CT0 }]),
  );
});

afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('exitCodeFor', () => {
  it('is 1 when any check failed and 0 otherwise', () => {
    expect(exitCodeFor([{ status: 'ok' }, { status: 'warn' }])).toBe(0);
    expect(exitCodeFor([{ status: 'ok' }, { status: 'fail' }])).toBe(1);
    expect(exitCodeFor([])).toBe(0);
  });
});

describe('xactions doctor --json', () => {
  let run;
  let parsed;

  beforeAll(() => {
    run = doctor(['--json', '--offline']);
    parsed = JSON.parse(run.stdout);
  });

  it('prints one JSON document on stdout and nothing else', () => {
    expect(run.stdout.trim().startsWith('{')).toBe(true);
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('reports every check, in a stable order, with stable ids', () => {
    expect(parsed.checks.map((c) => c.id)).toEqual(STABLE_IDS);
    expect(CHECK_IDS).toEqual(STABLE_IDS);
  });

  it('gives each check exactly id, group, name, status, detail and fix', () => {
    for (const check of parsed.checks) {
      expect(Object.keys(check).sort()).toEqual(['detail', 'fix', 'group', 'id', 'name', 'status']);
      expect(['ok', 'warn', 'fail']).toContain(check.status);
      expect(typeof check.detail).toBe('string');
      expect(check.fix === null || typeof check.fix === 'string').toBe(true);
    }
  });

  it('summarises the statuses and exits non-zero exactly when one failed', () => {
    const counts = { ok: 0, warn: 0, fail: 0 };
    for (const c of parsed.checks) counts[c.status] += 1;
    expect(parsed.summary).toEqual(counts);
    expect(run.code).toBe(counts.fail > 0 ? 1 : 0);
  });

  it('skips the checks that reach x.com under --offline', () => {
    for (const id of NETWORK_IDS) {
      const check = parsed.checks.find((c) => c.id === id);
      expect(check.status).toBe('warn');
      expect(check.detail).toMatch(/--offline/);
    }
  });

  it('exits 1 with the failing check marked when XACTIONS_HOME cannot be written', async () => {
    const blocker = path.join(tmp, 'blocker');
    await fs.writeFile(blocker, '');
    const failing = doctor(['--json', '--offline'], { XACTIONS_HOME: path.join(blocker, 'home') });
    expect(failing.code).toBe(1);
    const home = JSON.parse(failing.stdout).checks.find((c) => c.id === 'home');
    expect(home.status).toBe('fail');
    expect(home.fix).toContain('XACTIONS_HOME');
  });
});

describe('xactions doctor --report and --issue', () => {
  const secretEnv = {
    HTTPS_PROXY: PROXY,
    ALL_PROXY: SOCKS,
    XACTIONS_SESSION_COOKIE: AUTH_TOKEN,
    X_BEARER_TOKEN: 'AAAAAAAAAAAAAAAAAAAAAPrivateBearerValue0123456789',
  };
  const leaks = () => [AUTH_TOKEN, CT0, PROXY, SOCKS, 'hunter2pass', '172.16.9.9', 'corp-example', 'PrivateBearerValue', tmp, os.homedir()];

  it('prints a redacted Markdown report on stdout', () => {
    const run = doctor(['--report', '--offline'], secretEnv);
    expect(run.stdout.startsWith('### xactions doctor report')).toBe(true);
    expect(run.stdout).toMatch(/\| Session \| saved, carries ct0/);
    expect(run.stdout).toContain('| `home` |');
    for (const leak of leaks()) expect(run.stdout).not.toContain(leak);
    expect(run.stderr).toMatch(/Paste/);
  });

  it('prints the report and a prefilled issue link, and opens nothing', () => {
    const run = doctor(['--issue', '--offline'], secretEnv);
    expect(run.stdout.startsWith('### xactions doctor report')).toBe(true);
    const link = run.stdout.split('\n').find((l) => l.startsWith('https://'));
    const url = new URL(link);
    expect(url.pathname).toMatch(/\/issues\/new$/);
    expect(url.searchParams.get('template')).toBe('bug_report.yml');
    expect(url.searchParams.get('doctor-report')).toContain('### xactions doctor report');
    for (const leak of leaks()) expect(decodeURIComponent(link)).not.toContain(leak);
    expect(run.stderr).not.toMatch(/Opening/);
  });
});
