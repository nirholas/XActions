// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - `xactions doctor` line renderers. Offline: pure functions over status objects.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describeAccounts, describeQueryIds, describeRefreshFailure, formatCacheAge, runDoctorChecks } from '../../src/cli/commands/doctor.js';

const NOW = Date.parse('2026-08-27T12:00:00.000Z');
const CACHE = '/tmp/xactions-home/query-ids.json';

describe('doctor', () => {
  describe('formatCacheAge', () => {
    it('renders minutes, hours and days', () => {
      expect(formatCacheAge('2026-08-27T11:59:40.000Z', NOW)).toBe('under a minute old');
      expect(formatCacheAge('2026-08-27T11:30:00.000Z', NOW)).toBe('30m old');
      expect(formatCacheAge('2026-08-27T07:00:00.000Z', NOW)).toBe('5h old');
      expect(formatCacheAge('2026-08-20T12:00:00.000Z', NOW)).toBe('7d old');
      expect(formatCacheAge('garbage', NOW)).toBe('unknown age');
    });
  });

  describe('describeRefreshFailure', () => {
    const previous = { status: 'ok', detail: '123 IDs cached' };

    it('warns without blaming the network when x.com served the x-web client', () => {
      const err = Object.assign(new Error('Could not locate x.com client bundle.'), { code: 'X_WEB_CLIENT' });
      const result = describeRefreshFailure(err, previous);
      expect(result.status).toBe('warn');
      expect(result.detail).toContain('x-web');
      expect(result.detail).toContain('123 IDs cached');
      expect(result.fix).not.toMatch(/network|proxy/i);
    });

    it('fails with the network fix for any other refresh error', () => {
      const result = describeRefreshFailure(new Error('fetch failed'), previous);
      expect(result.status).toBe('fail');
      expect(result.detail).toContain('fetch failed');
      expect(result.fix).toMatch(/network/);
    });
  });

  describe('describeQueryIds', () => {
    it('warns with the refresh fix when nothing is cached', () => {
      const result = describeQueryIds({ cached: false, fetchedAt: null, count: 0, cachePath: CACHE, stale: true }, NOW);
      expect(result.status).toBe('warn');
      expect(result.detail).toMatch(/pinned table/);
      expect(result.fix).toContain('xactions doctor --refresh-ids');
      expect(result.fix).toContain(CACHE);
    });

    it('warns with the age when the cache is stale', () => {
      const result = describeQueryIds(
        { cached: true, fetchedAt: '2026-08-25T12:00:00.000Z', count: 140, cachePath: CACHE, stale: true },
        NOW
      );
      expect(result.status).toBe('warn');
      expect(result.detail).toBe('140 query IDs cached, 2d old, past the 24h freshness window');
      expect(result.fix).toContain('xactions doctor --refresh-ids');
    });

    it('is ok with count, age and path when fresh', () => {
      const result = describeQueryIds(
        { cached: true, fetchedAt: '2026-08-27T09:00:00.000Z', count: 140, cachePath: CACHE, stale: false },
        NOW
      );
      expect(result).toEqual({ status: 'ok', detail: `140 query IDs cached, 3h old (${CACHE})` });
    });
  });

  describe('describeAccounts', () => {
    const store = '/tmp/xactions-home/accounts.db';

    it('warns, without failing, when no pool exists', () => {
      const result = describeAccounts(null, store, NOW);
      expect(result.status).toBe('warn');
      expect(result.detail).toContain(store);
    });

    it('is ok when accounts are available', () => {
      const result = describeAccounts({ total: 3, locked: 0, leased: 0, available: 3, coolingDown: 0, nextResetAt: null }, store, NOW);
      expect(result).toEqual({ status: 'ok', detail: '3 accounts, 3 available' });
    });

    it('names the cooling and locked counts with the next reset', () => {
      const result = describeAccounts(
        { total: 3, locked: 1, leased: 0, available: 1, coolingDown: 1, nextResetAt: NOW + 7 * 60000 },
        store,
        NOW
      );
      expect(result.status).toBe('warn');
      expect(result.detail).toBe('3 accounts, 1 available, 1 rate limited, next reset in 7m, 1 locked');
      expect(result.fix).toMatch(/401\/403/);
    });

    it('fails when every account is locked', () => {
      const result = describeAccounts({ total: 2, locked: 2, leased: 0, available: 0, coolingDown: 0, nextResetAt: null }, store, NOW);
      expect(result.status).toBe('fail');
      expect(result.detail).toBe('2 accounts, 0 available, 2 locked');
    });
  });

  describe('runDoctorChecks', () => {
    /** A sandbox HOME with a saved session whose values must never be printed. */
    function sandbox() {
      const home = mkdtempSync(join(tmpdir(), 'xactions-doctor-'));
      const xhome = join(home, '.xactions');
      mkdirSync(xhome, { recursive: true });
      writeFileSync(join(xhome, 'cookies.json'), JSON.stringify([
        { name: 'auth_token', value: 'doctor-secret-auth' },
        { name: 'ct0', value: 'doctor-secret-ct0' },
      ]));
      return { home, xhome };
    }

    it('offline, runs only the local checks and reports them as data', async () => {
      const { home, xhome } = sandbox();
      const prev = { HOME: process.env.HOME, XACTIONS_HOME: process.env.XACTIONS_HOME };
      process.env.HOME = home;
      process.env.XACTIONS_HOME = xhome;
      try {
        const report = await runDoctorChecks({ offline: true });
        expect(report.offline).toBe(true);
        expect(report.sections.map((s) => s.name)).toEqual(['Environment', 'Session tier']);
        const names = report.sections.flatMap((s) => s.checks.map((c) => c.name));
        expect(names).toEqual(['Node', 'Browser', 'MCP server', 'Skills', 'GraphQL query IDs', 'Session saved', 'Accounts']);
        expect(report.sections[1].checks[0]).toMatchObject({ name: 'Session saved', status: 'ok' });
        expect(JSON.stringify(report)).not.toMatch(/doctor-secret/);
        const all = report.sections.flatMap((s) => s.checks);
        expect(report.summary).toEqual({
          ok: all.filter((c) => c.status === 'ok').length,
          warn: all.filter((c) => c.status === 'warn').length,
          fail: all.filter((c) => c.status === 'fail').length,
        });
      } finally {
        for (const [k, v] of Object.entries(prev)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
        rmSync(home, { recursive: true, force: true });
      }
    });

    it('`xactions doctor --offline --json` prints the report and nothing else', () => {
      const { home, xhome } = sandbox();
      try {
        const cli = new URL('../../src/cli/index.js', import.meta.url).pathname;
        const run = spawnSync(process.execPath, [cli, 'doctor', '--offline', '--json'], {
          env: { ...process.env, HOME: home, XACTIONS_HOME: xhome, FORCE_COLOR: '0', PUPPETEER_EXECUTABLE_PATH: '/nonexistent/xactions-test-chrome' },
          encoding: 'utf8',
          timeout: 60000,
        });
        const report = JSON.parse(run.stdout);
        expect(report.offline).toBe(true);
        expect(run.stdout).not.toMatch(/doctor-secret/);
        expect(run.status).toBe(report.summary.fail > 0 ? 1 : 0);
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    }, 60000);
  });
});
