// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Account Pool + Pooled Client tests.
 *
 * Every request goes to a fake fetch that decides its answer from the cookie
 * header, so each account can be given its own status codes and rate-limit
 * headers. No network, no real accounts. The SQLite store lives in a temp dir.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createAccountPool,
  createPooledClient,
  AccountPoolError,
  normalizeCookies,
  operationFromUrl,
} from '../../src/scrapers/twitter/http/accountPool.js';
import { AuthError, RateLimitError, NotFoundError } from '../../src/scrapers/twitter/http/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir;
let openPools;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-pool-'));
  openPools = [];
});

afterEach(() => {
  vi.useRealTimers();
  for (const pool of openPools) {
    try {
      pool.close();
    } catch {
      /* already closed */
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function storePath(name = 'accounts.db') {
  return path.join(tmpDir, name);
}

function track(pool) {
  openPools.push(pool);
  return pool;
}

/**
 * Which account sent a request, read back from its cookie header.
 */
function accountOf(init) {
  const m = /auth_token=([^;]+)/.exec(init?.headers?.cookie || '');
  return m ? m[1] : null;
}

function response(status, body = {}, headers = {}) {
  const map = new Map(Object.entries(headers));
  return {
    status,
    headers: { get: (k) => map.get(k) ?? null },
    json: async () => body,
  };
}

/**
 * Fake fetch: `plan[account]` is a function `(callIndexForThatAccount, url) => response`.
 */
function fetchByAccount(plan) {
  const counts = {};
  const calls = [];
  const fetch = vi.fn(async (url, init) => {
    const account = accountOf(init);
    calls.push({ account, url, init });
    counts[account] = (counts[account] || 0) + 1;
    const handler = plan[account];
    if (!handler) throw new Error(`no plan for account ${account}`);
    return handler(counts[account] - 1, url);
  });
  fetch.calls = calls;
  return fetch;
}

const accounts = (names) =>
  names.map((n) => ({ name: n, authToken: n, ct0: `csrf-${n}` }));

const OK = (extraHeaders = {}) =>
  response(200, { data: { user: { result: { rest_id: '1' } } } }, extraHeaders);

// ---------------------------------------------------------------------------
// Cookie normalisation and operation parsing
// ---------------------------------------------------------------------------

describe('normalizeCookies', () => {
  it('accepts header strings, arrays, maps, and Netscape exports', () => {
    expect(normalizeCookies('auth_token=abc; ct0=def')).toBe('auth_token=abc; ct0=def');
    expect(normalizeCookies([{ name: 'auth_token', value: 'abc' }, { name: 'ct0', value: 'def' }])).toBe(
      'auth_token=abc; ct0=def',
    );
    expect(normalizeCookies({ auth_token: 'abc', ct0: 'def' })).toBe('auth_token=abc; ct0=def');
    const netscape = [
      '# Netscape HTTP Cookie File',
      '.x.com\tTRUE\t/\tTRUE\t2000000000\tauth_token\tabc',
      '.x.com\tTRUE\t/\tTRUE\t2000000000\tct0\tdef',
    ].join('\n');
    const out = normalizeCookies(netscape);
    expect(out).toContain('auth_token=abc');
    expect(out).toContain('ct0=def');
  });
});

describe('operationFromUrl', () => {
  it('extracts the GraphQL operation and falls back to the REST path', () => {
    expect(operationFromUrl('https://x.com/i/api/graphql/abc123/Followers?variables=%7B%7D')).toBe('Followers');
    expect(operationFromUrl('https://x.com/i/api/1.1/friendships/create.json')).toBe(
      '/i/api/1.1/friendships/create.json',
    );
  });
});

// ---------------------------------------------------------------------------
// Persistence and management
// ---------------------------------------------------------------------------

describe('createAccountPool persistence', () => {
  it('persists accounts, locks, and rate-limit windows across pool instances', () => {
    const first = track(createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b']) }));
    first.markLocked('b', 'HTTP 403 on Followers');
    first.recordResponse('a', 'Followers', { status: 200, remaining: 0, resetAt: Date.now() + 60_000 });
    first.close();

    const second = track(createAccountPool({ storePath: storePath() }));
    const list = second.list();
    expect(list.map((a) => a.name)).toEqual(['a', 'b']);
    expect(second.get('b')).toMatchObject({ locked: true, lockReason: 'HTTP 403 on Followers' });
    expect(second.get('a').limits.Followers).toMatchObject({ remaining: 0, coolingDown: true });
    expect(second.stats()).toMatchObject({ total: 2, locked: 1, coolingDown: 1, available: 0 });
  });

  it('add/remove/importCookies manage the store and refuse cookies without auth_token', () => {
    const pool = track(createAccountPool({ storePath: storePath() }));
    expect(pool.size()).toBe(0);

    pool.add({ name: 'x', cookies: 'auth_token=tok; ct0=csrf', proxy: 'http://127.0.0.1:8080' });
    expect(pool.get('x')).toMatchObject({ name: 'x', proxy: 'http://127.0.0.1:8080', locked: false });

    pool.importCookies('y', '.x.com\tTRUE\t/\tTRUE\t2000000000\tauth_token\tytok\n.x.com\tTRUE\t/\tTRUE\t2000000000\tct0\tyc');
    expect(pool.list().map((a) => a.name)).toEqual(['x', 'y']);

    expect(() => pool.add({ name: 'z', cookies: { ct0: 'only' } })).toThrow(/auth_token/);
    expect(() => pool.add({ name: 'z' })).toThrow(/cookies|authToken/);

    expect(pool.remove('x')).toBe(true);
    expect(pool.remove('x')).toBe(false);
    expect(pool.list().map((a) => a.name)).toEqual(['y']);
  });

  it('gives each account its own client carrying its cookies and proxy', async () => {
    const pool = track(
      createAccountPool({
        storePath: storePath(),
        accounts: [{ name: 'p', authToken: 'p', ct0: 'c', proxy: 'socks5://10.0.0.1:1080' }],
        clientOptions: { maxRetries: 0 },
      }),
    );
    const lease = await pool.acquire('Followers');
    expect(lease.name).toBe('p');
    expect(lease.client.isAuthenticated()).toBe(true);
    expect(lease.client.getCsrfToken()).toBe('c');
    expect(lease.client._proxy).toBe('socks5://10.0.0.1:1080');
    lease.release();
  });
});

// ---------------------------------------------------------------------------
// Leasing
// ---------------------------------------------------------------------------

describe('pool.acquire', () => {
  it('hands out the least-recently-used unlocked account and skips leased ones', async () => {
    let clock = 1_000;
    const pool = track(
      createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b', 'c']), now: () => (clock += 1) }),
    );

    const l1 = await pool.acquire('Followers');
    expect(l1.name).toBe('a');
    const l2 = await pool.acquire('Followers');
    expect(l2.name).toBe('b'); // a is leased
    l1.release();
    l2.release();

    const l3 = await pool.acquire('Followers');
    expect(l3.name).toBe('c'); // never used yet
    l3.release();
    const l4 = await pool.acquire('Followers');
    expect(l4.name).toBe('a'); // oldest last_used among the three
    l4.release();
    expect(pool.stats().leased).toBe(0);
  });

  it('throws a clear error when the pool is empty or every account is locked', async () => {
    const empty = track(createAccountPool({ storePath: storePath('empty.db') }));
    await expect(empty.acquire('Followers')).rejects.toThrow(/pool is empty/);

    const pool = track(createAccountPool({ storePath: storePath(), accounts: accounts(['a']) }));
    pool.markLocked('a', 'suspended');
    await expect(pool.acquire('Followers')).rejects.toBeInstanceOf(AccountPoolError);
    await expect(pool.acquire('Followers')).rejects.toThrow(/locked, excluded, or already in use/);
    pool.unlock('a');
    const lease = await pool.acquire('Followers');
    expect(lease.name).toBe('a');
    lease.release();
  });

  it('waits until the earliest reset when every account is cooling down', async () => {
    vi.useFakeTimers();
    const pool = track(createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b']) }));
    const t0 = Date.now();
    pool.recordResponse('a', 'Followers', { status: 429, resetAt: t0 + 30_000 });
    pool.recordResponse('b', 'Followers', { status: 200, remaining: 0, resetAt: t0 + 5_000 });

    let resolved = null;
    const pending = pool.acquire('Followers').then((lease) => {
      resolved = lease;
      lease.release();
    });

    await vi.advanceTimersByTimeAsync(4_000);
    expect(resolved).toBeNull();
    await vi.advanceTimersByTimeAsync(1_500);
    await pending;
    expect(resolved.name).toBe('b'); // its window reopened first

    // Other operations are unaffected by the Followers window
    const other = await pool.acquire('UserTweets');
    expect(other.name).toBe('a');
    other.release();
  });

  it('refuses to wait beyond maxWaitMs and names the next reset', async () => {
    vi.useFakeTimers();
    const pool = track(createAccountPool({ storePath: storePath(), accounts: accounts(['a']) }));
    const resetAt = Date.now() + 10 * 60_000;
    pool.recordResponse('a', 'Followers', { status: 429, resetAt });

    const err = await pool.acquire('Followers', { maxWaitMs: 1_000 }).catch((e) => e);
    expect(err).toBeInstanceOf(AccountPoolError);
    expect(err.nextResetAt).toBe(resetAt);
    expect(err.message).toMatch(/beyond the 1000ms wait budget/);
  });
});

// ---------------------------------------------------------------------------
// Pooled client rotation
// ---------------------------------------------------------------------------

describe('createPooledClient', () => {
  const GQL = 'https://x.com/i/api/graphql/QID/Followers';

  it('rotates to the next account on 429 and remembers the window in SQLite', async () => {
    const resetSec = Math.floor(Date.now() / 1000) + 600;
    const fetch = fetchByAccount({
      a: () => response(429, {}, { 'x-rate-limit-remaining': '0', 'x-rate-limit-reset': String(resetSec) }),
      b: () => OK({ 'x-rate-limit-remaining': '49', 'x-rate-limit-reset': String(resetSec) }),
    });
    const pool = track(
      createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b']), clientOptions: { fetch, maxRetries: 0 } }),
    );
    const rotations = [];
    const client = createPooledClient(pool, { onRotate: (e) => rotations.push(e) });

    const result = await client.graphql('QID', 'Followers', { userId: '1' });
    expect(result.data.user.result.rest_id).toBe('1');
    expect(fetch.calls.map((c) => c.account)).toEqual(['a', 'b']);
    expect(rotations).toHaveLength(1);
    expect(rotations[0]).toMatchObject({ from: 'a', operation: 'Followers', reason: 'rate-limited' });
    expect(rotations[0].error).toBeInstanceOf(RateLimitError);

    // The window is persisted per account per operation, with the header's reset time
    const a = pool.get('a').limits.Followers;
    expect(a.remaining).toBe(0);
    expect(a.resetAt).toBe(resetSec * 1000);
    expect(pool.get('b').limits.Followers.remaining).toBe(49);

    // The next call goes straight to b: a is inside its window
    await client.graphql('QID', 'Followers', { userId: '1' });
    expect(fetch.calls.map((c) => c.account)).toEqual(['a', 'b', 'b']);
    expect(pool.stats().leased).toBe(0);
  });

  it('locks an account on 403 and continues with the next one', async () => {
    const fetch = fetchByAccount({
      a: () => response(403, { errors: [{ message: 'locked' }] }),
      b: () => OK(),
    });
    const pool = track(
      createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b']), clientOptions: { fetch, maxRetries: 0 } }),
    );
    const client = createPooledClient(pool);

    await client.graphql('QID', 'Followers', {});
    expect(fetch.calls.map((c) => c.account)).toEqual(['a', 'b']);
    expect(pool.get('a')).toMatchObject({ locked: true, lockReason: 'HTTP 403 on Followers' });
    expect(client.isAuthenticated()).toBe(true);

    await client.graphql('QID', 'Followers', {});
    expect(fetch.calls.map((c) => c.account)).toEqual(['a', 'b', 'b']);
  });

  it('moves to the next account when a successful response reports remaining 0', async () => {
    const resetSec = Math.floor(Date.now() / 1000) + 600;
    const fetch = fetchByAccount({
      a: () => OK({ 'x-rate-limit-remaining': '0', 'x-rate-limit-reset': String(resetSec) }),
      b: () => OK({ 'x-rate-limit-remaining': '48', 'x-rate-limit-reset': String(resetSec) }),
    });
    const pool = track(
      createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b']), clientOptions: { fetch, maxRetries: 0 } }),
    );
    const client = createPooledClient(pool);

    await client.graphql('QID', 'Followers', {});
    await client.graphql('QID', 'Followers', {});
    await client.graphql('QID', 'Followers', {});
    expect(fetch.calls.map((c) => c.account)).toEqual(['a', 'b', 'b']);
  });

  it('gives up with the last error after trying every account', async () => {
    const fetch = fetchByAccount({
      a: () => response(429, {}),
      b: () => response(403, {}),
    });
    const pool = track(
      createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b']), clientOptions: { fetch, maxRetries: 0 } }),
    );
    const client = createPooledClient(pool, { maxWaitMs: 0 });

    const err = await client.request(GQL).catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(fetch.calls.map((c) => c.account)).toEqual(['a', 'b']);
    expect(pool.stats()).toMatchObject({ total: 2, locked: 1, coolingDown: 1 });

    // Nothing left to serve: a is cooling down for 15 minutes, b is locked
    const next = await client.request(GQL).catch((e) => e);
    expect(next).toBeInstanceOf(AccountPoolError);
  });

  it('does not rotate on errors that are not about the account (404)', async () => {
    const fetch = fetchByAccount({
      a: () => response(404, {}),
      b: () => OK(),
    });
    const pool = track(
      createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b']), clientOptions: { fetch, maxRetries: 0 } }),
    );
    const client = createPooledClient(pool);
    await expect(client.request(GQL)).rejects.toBeInstanceOf(NotFoundError);
    expect(fetch.calls.map((c) => c.account)).toEqual(['a']);
    expect(pool.get('a').locked).toBe(false);
  });

  it('paginates through graphqlPaginate across accounts', async () => {
    const page = (cursor) => ({
      data: {
        user: {
          result: {
            timeline: {
              timeline: {
                instructions: [
                  {
                    type: 'TimelineAddEntries',
                    entries: cursor ? [{ entryId: 'cursor-bottom-1', content: { value: cursor } }] : [],
                  },
                ],
              },
            },
          },
        },
      },
    });
    const fetch = fetchByAccount({
      a: (i) => (i === 0 ? response(200, page('c2'), { 'x-rate-limit-remaining': '0' }) : response(200, page(null))),
      b: () => response(200, page(null)),
    });
    const pool = track(
      createAccountPool({ storePath: storePath(), accounts: accounts(['a', 'b']), clientOptions: { fetch, maxRetries: 0 } }),
    );
    const client = createPooledClient(pool);

    const pages = [];
    for await (const p of client.graphqlPaginate('QID', 'Followers', { userId: '1' })) pages.push(p);
    expect(pages).toHaveLength(2);
    expect(pages[0].cursor).toBe('c2');
    expect(fetch.calls.map((c) => c.account)).toEqual(['a', 'b']);
    // Followers is one of the POST_QUERY_OPERATIONS, so its variables ride in
    // the request body rather than the query string.
    expect(JSON.parse(fetch.calls[1].init.body).variables.cursor).toBe('c2');
  });
});
