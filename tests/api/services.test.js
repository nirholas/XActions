// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Regressions in api/services: the job queue, the bulk operation engines, the
 * follower scanner and Stripe payment recording.
 *
 * Prisma is the in-memory table store in tests/fixtures/memoryPrisma.js. Redis
 * is pointed at a closed port, which is itself one of the cases (the queue must
 * fail fast). X is answered by small local stand-ins for the two things these
 * engines call: the X API v2 client and the follower scraper.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { db } from '../fixtures/memoryPrisma.js';

process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-services-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'services-test-jwt-secret';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '1';
process.env.XACTIONS_QUEUE_TIMEOUT_MS = '500';

vi.mock('@prisma/client', () => import('../fixtures/memoryPrisma.js'));

const x = vi.hoisted(() => ({ client: null, scrape: null }));

// The X API v2 client the OAuth engines get from routes/twitter.js.
vi.mock('../../api/routes/twitter.js', () => ({
  default: {},
  getTwitterClient: async () => x.client,
}));

// The browser scraper the follower scanner calls.
vi.mock('../../api/services/browserAutomation.js', async (importOriginal) => ({
  ...(await importOriginal()),
  scrapeFollowers: (...args) => x.scrape(...args),
}));

/**
 * An X API v2 client answering from fixed data. `followers` pages are served
 * with next_token; a `fail` entry makes that path answer with its status.
 */
function xClient({ me = 'me', following = [], followerPages = [[]], fail = {} }) {
  const deleted = [];
  const requested = [];
  const answer = (path, data) => {
    requested.push(path);
    if (fail[path]) return Promise.reject(Object.assign(new Error(`Request failed with status code ${fail[path]}`), { response: { status: fail[path] } }));
    return Promise.resolve({ data });
  };
  return {
    deleted,
    requested,
    get(path, { params = {} } = {}) {
      if (path === '/users/me') return answer(path, { data: { id: me } });
      if (path === `/users/${me}/following`) return answer(path, { data: following });
      if (path === `/users/${me}/followers`) {
        const page = Number(params.pagination_token || 0);
        const next = page + 1 < followerPages.length ? String(page + 1) : undefined;
        return answer(path, { data: followerPages[page], meta: next ? { next_token: next } : {} });
      }
      return answer(path, { data: [] });
    },
    delete(path) {
      deleted.push(path.split('/').pop());
      return Promise.resolve({ data: {} });
    },
    post: () => Promise.resolve({ data: {} }),
  };
}

const capError = () => Object.assign(new Error('Daily cap reached for "unfollow"'), { name: 'ActionCapExceededError' });
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  db.reset();
  db.table('user').push({ id: 'u1', username: 'owner', twitterAccessToken: 'at' });
});

// ── B6, B11: unfollow non-followers ─────────────────────────────────────────
describe('unfollow non-followers (X API engine)', () => {
  const following = [{ id: 'mutual_late', username: 'a' }, { id: 'stranger', username: 'b' }, { id: 'mutual_early', username: 'c' }];
  // mutual_late follows back, but only on the second page of followers.
  const followerPages = [[{ id: 'mutual_early' }, { id: 'someone' }], [{ id: 'mutual_late' }]];

  it('reads your whole follower list once and unfollows only real non-followers', async () => {
    const { processUnfollowNonFollowers } = await import('../../api/services/operations/unfollowNonFollowers.js');
    db.table('operation').push({ id: 'op1', userId: 'u1' });
    x.client = xClient({ following, followerPages });

    const result = await processUnfollowNonFollowers({ operationId: 'op1', userId: 'u1', config: { maxUnfollows: 10 } });

    expect(x.client.deleted).toEqual(['stranger']);
    expect(result.nonFollowers.map((u) => u.id)).toEqual(['stranger']);
    // No per-account follower lookups (one call each, 429s swallowed).
    expect(x.client.requested.filter((p) => p.startsWith('/users/mutual'))).toEqual([]);
  });

  it('unfollows nobody when the follower list cannot be read in full', async () => {
    const { processUnfollowNonFollowers } = await import('../../api/services/operations/unfollowNonFollowers.js');
    db.table('operation').push({ id: 'op1', userId: 'u1' });
    x.client = xClient({ following, followerPages, fail: { '/users/me/followers': 429 } });

    await expect(processUnfollowNonFollowers({ operationId: 'op1', userId: 'u1', config: {} })).rejects.toThrow(/429/);
    expect(x.client.deleted).toEqual([]);
  });

  it('charges every unfollow against the daily cap and stops, keeping the result, when it is reached', async () => {
    const { processUnfollowEveryone } = await import('../../api/services/operations/unfollowEveryone.js');
    db.table('operation').push({ id: 'op1', userId: 'u1' });
    x.client = xClient({ following: [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }] });
    const charged = [];
    const charge = async (cls) => {
      if (charged.length === 1) throw capError();
      charged.push(cls);
    };

    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const run = processUnfollowEveryone({ operationId: 'op1', userId: 'u1', config: { maxUnfollows: 10 } }, () => false, charge);
      await vi.runAllTimersAsync();
      const result = await run;
      expect(charged).toEqual(['unfollow']);
      expect(x.client.deleted).toEqual(['f1']);
      expect(result.stoppedReason).toMatch(/Daily cap/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops when the job is cancelled', async () => {
    const { processUnfollowEveryone } = await import('../../api/services/operations/unfollowEveryone.js');
    db.table('operation').push({ id: 'op1', userId: 'u1' });
    x.client = xClient({ following: [{ id: 'f1' }, { id: 'f2' }] });
    const result = await processUnfollowEveryone({ operationId: 'op1', userId: 'u1', config: {} }, () => true, async () => {});
    expect(x.client.deleted).toEqual([]);
    expect(result.cancelled).toBe(true);
  });
});

// ── B14: detect unfollowers ─────────────────────────────────────────────────
describe('detect unfollowers (X API engine)', () => {
  it('reads the previous run\'s result from its TEXT column', async () => {
    const { processDetectUnfollowers } = await import('../../api/services/operations/detectUnfollowers.js');
    db.table('operation').push(
      { id: 'prev', userId: 'u1', type: 'detectUnfollowers', status: 'completed', createdAt: new Date(0),
        result: JSON.stringify({ followers: [{ id: 'stays' }, { id: 'left', username: 'left' }] }) },
      { id: 'op1', userId: 'u1', type: 'detectUnfollowers', status: 'processing' },
    );
    x.client = xClient({ followerPages: [[{ id: 'stays' }]] });

    const result = await processDetectUnfollowers({ operationId: 'op1', userId: 'u1' });
    expect(result.unfollowers.map((u) => u.id)).toEqual(['left']);
  });
});

// ── B3, B4: follower scanner ────────────────────────────────────────────────
describe('follower scanner', () => {
  const people = (n, prefix = 'p') => Array.from({ length: n }, (_, i) => ({ username: `${prefix}${i}` }));
  const seed = (n) => db.table('followerSnapshot').push({
    id: 'snap0', userId: 'u1', username: 'owner', createdAt: new Date(0),
    followers: JSON.stringify(people(n).map((p) => ({ ...p, followedSince: '2020-01-01T00:00:00.000Z' }))),
  });

  it('an empty scrape (logged out or rate limited) records nothing', async () => {
    const { runFollowerScan } = await import('../../api/services/followerScanner.js');
    seed(40);
    x.scrape = async () => ({ users: [] });
    await expect(runFollowerScan('u1', 'token', 'owner')).rejects.toThrow(/returned no followers/);
    expect(db.table('followerChange')).toEqual([]);
    expect(db.table('followerSnapshot')).toHaveLength(1);
  });

  it('a scrape that collapses below half the previous count is not diffed', async () => {
    const { runFollowerScan } = await import('../../api/services/followerScanner.js');
    seed(40);
    x.scrape = async () => ({ users: people(5) });
    const result = await runFollowerScan('u1', 'token', 'owner');
    expect(result).toMatchObject({ incomplete: true, lost: [], gained: [] });
    expect(db.table('followerChange')).toEqual([]);
    expect(db.table('followerSnapshot')).toHaveLength(1);
  });

  it('a normal scan diffs and keeps each follower\'s followedSince', async () => {
    const { runFollowerScan } = await import('../../api/services/followerScanner.js');
    seed(40);
    x.scrape = async () => ({ users: [...people(39), { username: 'newbie' }] });
    const result = await runFollowerScan('u1', 'token', 'owner');
    expect(result.lost.map((u) => u.username)).toEqual(['p39']);
    expect(result.gained.map((u) => u.username)).toEqual(['newbie']);
    const saved = JSON.parse(db.table('followerSnapshot')[1].followers);
    expect(saved.find((f) => f.username === 'p0').followedSince).toBe('2020-01-01T00:00:00.000Z');
  });
});

// ── B5, B7, B9, B10: job queue ──────────────────────────────────────────────
describe('job queue', () => {
  it('fails fast when Redis is unreachable, and stores config as text', async () => {
    const { addJob, QueueUnavailableError } = await import('../../api/services/jobQueue.js');
    const started = Date.now();
    await expect(addJob('detectUnfollowers', { userId: 'u1', config: { limit: 5, sessionCookie: 'secret' } }))
      .rejects.toBeInstanceOf(QueueUnavailableError);
    expect(Date.now() - started).toBeLessThan(5_000);
    const [row] = db.table('operation');
    expect(typeof row.config).toBe('string');
    expect(JSON.parse(row.config)).toEqual({ limit: 5 });
    expect(row.status).toBe('failed');
  });

  const fakeJob = (operationId, attemptsMade) => ({
    id: operationId,
    name: 'detectUnfollowers',
    data: { operationId, type: 'detectUnfollowers', config: {} },
    attemptsMade,
    opts: { attempts: 3 },
    update: async () => {},
  });

  it('a failed attempt that will be retried is not reported as a failure', async () => {
    const { operationsQueue } = await import('../../api/services/jobQueue.js');
    db.table('operation').push({ id: 'row1', status: 'processing' });

    operationsQueue.emit('failed', fakeJob('row1', 1), new Error('flaky'));
    await settle();
    expect(db.table('operation')[0]).toMatchObject({ status: 'processing', retryCount: 1 });

    operationsQueue.emit('failed', fakeJob('row1', 3), new Error('flaky'));
    await settle();
    expect(db.table('operation')[0]).toMatchObject({ status: 'failed', retryCount: 3 });
  });

  it('cancelling reports a missing job, and a cancelled job stays cancelled when it ends', async () => {
    const { cancelJob, operationsQueue } = await import('../../api/services/jobQueue.js');
    db.table('operation').push({ id: 'row2', status: 'processing' });

    expect(await cancelJob('no-such-job')).toBeNull();
    expect(await cancelJob('row2')).toMatchObject({ success: true });

    operationsQueue.emit('completed', fakeJob('row2', 1), { unfollowed: 3 });
    await settle();
    expect(db.table('operation')[0].status).toBe('cancelled');
    expect(JSON.parse(db.table('operation')[0].result)).toEqual({ unfollowed: 3 });
  });
});

// ── B8: Stripe payments ─────────────────────────────────────────────────────
describe('Stripe payment recording', () => {
  it('records each PaymentIntent once, and a late failure does not undo a success', async () => {
    const { handleWebhookEvent } = await import('../../api/services/stripeService.js');
    db.table('subscription').push({ id: 's1', userId: 'u1', stripeCustomerId: 'cus_1', status: 'active' });
    const invoice = { id: 'in_1', customer: 'cus_1', amount_paid: 900, amount_due: 900, currency: 'usd', payment_intent: 'pi_1' };

    await handleWebhookEvent({ type: 'invoice.payment_failed', data: { object: invoice } });
    await handleWebhookEvent({ type: 'invoice.payment_succeeded', data: { object: invoice } });
    await handleWebhookEvent({ type: 'invoice.payment_succeeded', data: { object: invoice } });
    await handleWebhookEvent({ type: 'invoice.payment_failed', data: { object: invoice } });

    expect(db.table('payment')).toHaveLength(1);
    expect(db.table('payment')[0]).toMatchObject({ stripePaymentId: 'pi_1', status: 'succeeded' });
  });
});
