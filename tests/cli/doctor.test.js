// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - `xactions doctor` line renderers. Offline: pure functions over status objects.

import { describe, it, expect } from 'vitest';

import { checkSessionStored, describeAccounts, describeQueryIds, describeRefreshFailure, formatCacheAge } from '../../src/cli/commands/doctor.js';

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

  // In a container the session usually arrives as XACTIONS_SESSION_COOKIE,
  // which every read uses ahead of a saved one; doctor reported "No session
  // saved" for it.
  describe('checkSessionStored with the session in the environment', () => {
    const AUTH = '1'.repeat(40);
    const CT0 = 'e'.repeat(32);

    it('reports the environment session as present when both cookies are set', async () => {
      const result = await checkSessionStored({ XACTIONS_SESSION_COOKIE: AUTH, XACTIONS_CSRF_TOKEN: CT0 });
      expect(result.status).toBe('ok');
      expect(result.detail).toBe('Both cookies present in XACTIONS_SESSION_COOKIE and XACTIONS_CSRF_TOKEN');
      expect(result.cookieString).toBe(`auth_token=${AUTH}; ct0=${CT0}`);
    });

    it('fails with the variable to set when ct0 is missing', async () => {
      const result = await checkSessionStored({ XACTIONS_SESSION_COOKIE: AUTH });
      expect(result.status).toBe('fail');
      expect(result.detail).toBe('XACTIONS_SESSION_COOKIE is set but XACTIONS_CSRF_TOKEN (ct0) is not');
      expect(result.fix).toMatch(/Set XACTIONS_CSRF_TOKEN/);
      // The live check then tests the cookie that reads will actually send,
      // not a saved file the environment overrides.
      expect(result.cookieString).toBe(`auth_token=${AUTH}`);
    });
  });
});
