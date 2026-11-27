// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - `xactions doctor` line renderers. Offline: pure functions over status objects.

import { describe, it, expect } from 'vitest';

import {
  describeAccounts,
  describePublicVerification,
  describeQueryIds,
  describeRefreshFailure,
  fetchPublicVerification,
  formatCacheAge,
} from '../../src/cli/commands/doctor.js';
import { buildStatus, LIVE_STATUS_URL } from '../../src/utils/liveStatus.js';

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

  describe('public verification line', () => {
    const check = (id, status, detail = `${id} ${status}`) => ({ id, label: id, feature: id, tier: 'guest', status, ms: 10, detail });
    const published = (checks, generatedAt = '2026-08-27T04:17:00.000Z') =>
      buildStatus({ checks, generatedAt, packageVersion: '5.0.0', node: 'v22', durationMs: 1 });

    it('says when x.com was last verified and that every check passed', () => {
      const result = describePublicVerification(published([check('profile', 'pass'), check('tweets', 'pass')]), NOW);
      expect(result).toEqual({ status: 'ok', detail: 'Verified against x.com on 2026-08-27: all 2 checks passed' });
    });

    it('warns and names the failing checks, pointing at the status page rather than this machine', () => {
      const result = describePublicVerification(published([check('profile', 'pass'), check('hashtag', 'fail')]), NOW);
      expect(result.status).toBe('warn');
      expect(result.detail).toBe('Verified against x.com on 2026-08-27: 1/2 passed, failing: hashtag');
      expect(result.fix).toContain('https://xactions.app/status');
      expect(result.fix).toMatch(/not.*this machine/i);
    });

    it('warns when the nightly run has gone quiet', () => {
      const result = describePublicVerification(published([check('profile', 'pass')], '2026-08-20T04:17:00.000Z'), NOW);
      expect(result.status).toBe('warn');
      expect(result.detail).toContain('2026-08-20');
      expect(result.detail).toContain('7d ago');
    });

    it('prints nothing for a missing or unreadable file', () => {
      expect(describePublicVerification(null, NOW)).toBeNull();
      expect(describePublicVerification({ version: 9 }, NOW)).toBeNull();
    });

    it('fetches the published file with a timeout', async () => {
      const body = published([check('profile', 'pass')]);
      const seen = [];
      const fetchFn = async (url, init) => {
        seen.push({ url, hasSignal: Boolean(init?.signal) });
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'text/plain' } });
      };
      expect(await fetchPublicVerification({ fetch: fetchFn })).toEqual(body);
      expect(seen).toEqual([{ url: LIVE_STATUS_URL, hasSignal: true }]);
    });

    it('returns null, silently, offline or on a bad answer', async () => {
      const offline = async () => {
        throw new TypeError('fetch failed');
      };
      expect(await fetchPublicVerification({ fetch: offline })).toBeNull();
      expect(await fetchPublicVerification({ fetch: async () => new Response('Not Found', { status: 404 }) })).toBeNull();
      expect(await fetchPublicVerification({ fetch: async () => new Response('<html>', { status: 200 }) })).toBeNull();
    });

    it('gives up at the timeout instead of holding doctor open', async () => {
      const hang = (url, init) =>
        new Promise((resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(init.signal.reason));
        });
      const started = Date.now();
      expect(await fetchPublicVerification({ fetch: hang, timeoutMs: 50 })).toBeNull();
      expect(Date.now() - started).toBeLessThan(2000);
    });
  });
});
