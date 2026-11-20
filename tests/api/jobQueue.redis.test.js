// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The job queue against a real Redis: a busy one-at-a-time type must not hold
 * the shared queue's slots, and every lookup, cancel, listing and event
 * handler must find a job on whichever queue it runs.
 *
 * Bull claimed every job into one of the shared queue's eight slots before
 * the per-type limit was checked, so nine queued smartUnfollow jobs left one
 * running and seven waiting inside claimed slots (shown as started), and no
 * other type started until the backlog drained, hours later.
 *
 * Needs Redis: XACTIONS_TEST_REDIS_URL, or redis://127.0.0.1:6379. Skipped
 * when neither answers. REDIS_URL is deliberately not used, so a test run can
 * never touch a deployment's Redis. Keys go under a prefix unique to the run
 * and are deleted afterwards.
 *
 * The two job types the assertions time (smartUnfollow, one at a time, and
 * getTrends, on the shared queue) keep their real registry definitions, so
 * the routing under test is the shipped one; only their run() is replaced by
 * one the test controls.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, afterAll, vi } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import Redis from 'ioredis';
import { db } from '../fixtures/memoryPrisma.js';

const REDIS = process.env.XACTIONS_TEST_REDIS_URL || 'redis://127.0.0.1:6379';
const PREFIX = `xactions-test-${process.pid}-${Date.now()}`;

function reachable(url) {
  const { hostname, port } = new URL(url);
  return new Promise((resolve) => {
    const socket = net.connect({ host: hostname, port: Number(port) || 6379 });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(1_000, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

const redisUp = await reachable(REDIS);

process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-jobqueue-redis-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'jobqueue-redis-test-jwt-secret';
process.env.REDIS_URL = REDIS;
process.env.REDIS_QUEUE_PREFIX = PREFIX;
process.env.XACTIONS_QUEUE_TIMEOUT_MS = '2000';
delete process.env.XACTIONS_WORKER_CONCURRENCY;

vi.mock('@prisma/client', () => import('../fixtures/memoryPrisma.js'));

/** A gate the long job waits on, and a record of who ran when. */
const runs = vi.hoisted(() => {
  const state = {
    started: [],
    running: 0,
    maxRunning: 0,
    quick: [],
    gate: null,
    release: null,
    close() {
      state.gate = new Promise((resolve) => { state.release = resolve; });
    },
  };
  state.close();
  return state;
});

vi.mock('../../api/services/processors/registry.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    async loadProcessors(dir) {
      const processors = new Map(await real.loadProcessors(dir));
      processors.set('smartUnfollow', {
        ...processors.get('smartUnfollow'),
        async run(ctx) {
          runs.started.push(ctx.operationId);
          runs.running++;
          runs.maxRunning = Math.max(runs.maxRunning, runs.running);
          try {
            await runs.gate;
            return { unfollowed: 0 };
          } finally {
            runs.running--;
          }
        },
      });
      processors.set('getTrends', {
        ...processors.get('getTrends'),
        async run(ctx) {
          runs.quick.push(ctx.operationId);
          return { trends: [] };
        },
      });
      return processors;
    },
  };
});

const queue = redisUp ? await import('../../api/services/jobQueue.js') : null;

const newId = () => `op-${crypto.randomUUID()}`;

async function until(check, ms = 10_000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`condition not met within ${ms}ms: ${check}`);
}

afterAll(async () => {
  if (!queue) return;
  runs.release();
  await queue.closeQueues();
  const redis = new Redis(REDIS);
  const keys = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', `${PREFIX}:*`, 'COUNT', 1000);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  if (keys.length) await redis.del(...keys);
  await redis.quit();
});

describe.skipIf(!redisUp)('job queue on Redis', () => {
  it('runs other types while a one-at-a-time type has a backlog larger than the shared slots', async () => {
    const { queueJob, getQueuedJob } = queue;
    runs.close();
    const backlog = Array.from({ length: 9 }, newId);
    for (const id of backlog) await queueJob({ id, type: 'smartUnfollow', config: {} });
    await until(() => runs.started.length === 1);

    const quick = newId();
    await queueJob({ id: quick, type: 'getTrends', config: {} });
    await until(async () => (await getQueuedJob(quick))?.status === 'completed');

    // The backlog waits unclaimed: one running, eight queued and not started.
    expect(runs.started).toHaveLength(1);
    const states = await Promise.all(backlog.map((id) => getQueuedJob(id)));
    expect(states.filter((job) => job.status === 'processing')).toHaveLength(1);
    const waiting = states.filter((job) => job.status === 'queued');
    expect(waiting).toHaveLength(8);
    expect(waiting.every((job) => job.startedAt === null)).toBe(true);

    runs.release();
    await until(async () => (await Promise.all(backlog.map((id) => getQueuedJob(id))))
      .every((job) => job.status === 'completed'), 20_000);
    expect(runs.started).toHaveLength(9);
    expect(runs.maxRunning).toBe(1);
  });

  it('keeps the Operation row lifecycle for a job on its own queue', async () => {
    const { addJob, getJob, cancelJob } = queue;
    runs.close();
    db.table('user').push({ id: 'u1', username: 'owner' });
    const first = await addJob('smartUnfollow', { userId: 'u1', config: { limit: 1 } });
    const second = await addJob('smartUnfollow', { userId: 'u1', config: { limit: 2 } });
    const row = (id) => db.table('operation').find((r) => r.id === id);

    await until(() => row(first.jobId).status === 'processing');
    expect(row(first.jobId).startedAt).toBeInstanceOf(Date);
    // The second waits on its queue: not started, and Bull says waiting.
    expect(row(second.jobId)).toMatchObject({ status: 'queued' });
    expect(row(second.jobId).startedAt).toBeUndefined();
    expect(await getJob(second.jobId)).toMatchObject({ type: 'smartUnfollow', status: 'waiting', startedAt: undefined });

    expect(await cancelJob(second.jobId)).toMatchObject({ success: true });
    expect(row(second.jobId).status).toBe('cancelled');
    expect(await queue.queueFor('smartUnfollow').getJob(second.jobId)).toBeNull();

    runs.release();
    await until(() => row(first.jobId).status === 'completed');
    expect(JSON.parse(row(first.jobId).result)).toEqual({ unfollowed: 0 });
    expect(await getJob(first.jobId)).toMatchObject({ status: 'completed' });
  });

  it('finds, lists and cancels agent jobs on whichever queue holds them', async () => {
    const { queueJob, getQueuedJob, cancelQueuedJob, getRecentJobs } = queue;
    runs.close();
    const config = { sessionCookie: 'agent-session' };
    const running = newId();
    const waiting = newId();
    const quick = newId();
    await queueJob({ id: running, type: 'smartUnfollow', config });
    await until(() => runs.started.includes(running));
    await queueJob({ id: waiting, type: 'smartUnfollow', config });
    await queueJob({ id: quick, type: 'getTrends', config });
    await until(async () => (await getQueuedJob(quick))?.status === 'completed');

    const mine = await getRecentJobs({ sessionCookie: 'agent-session' });
    expect(mine.map((job) => job.id).sort()).toEqual([running, waiting, quick].sort());
    expect(await getRecentJobs({ sessionCookie: 'agent-session', type: 'getTrends' })).toHaveLength(1);
    expect(await getRecentJobs({ sessionCookie: 'someone-else' })).toEqual([]);

    // Another session cannot cancel it; its own can, and a waiting job is removed.
    expect(await cancelQueuedJob(waiting, { sessionCookie: 'someone-else' })).toBeNull();
    expect(await cancelQueuedJob(waiting, { sessionCookie: 'agent-session' })).toMatchObject({ success: true });
    expect(await getQueuedJob(waiting)).toBeNull();
    expect(await getQueuedJob(running)).toMatchObject({ type: 'smartUnfollow', status: 'processing' });

    runs.release();
    await until(async () => (await getQueuedJob(running))?.status === 'completed');
    // The session is scrubbed from a finished job on its own queue too.
    const finished = await queue.queueFor('smartUnfollow').getJob(running);
    expect(finished.data.config.sessionCookie).toBeUndefined();
  });

  it('stops a repeating job on its own queue by the id it was queued under', async () => {
    const { queueJob, removeRepeatingJob } = queue;
    const id = newId();
    await queueJob({ id, type: 'smartUnfollow', config: {}, repeat: { cron: '0 0 1 1 *' } });
    expect(await queue.queueFor('smartUnfollow').getRepeatableJobs()).toHaveLength(1);
    expect(await queue.operationsQueue.getRepeatableJobs()).toHaveLength(0);
    expect(await removeRepeatingJob(id)).toBe(true);
    expect(await removeRepeatingJob(id)).toBe(false);
    expect(await queue.queueFor('smartUnfollow').getRepeatableJobs()).toHaveLength(0);
  });

  it('still runs a job left on the shared queue by an earlier deploy, held to its type limit', async () => {
    const { operationsQueue, getQueuedJob } = queue;
    runs.close();
    const before = runs.started.length;
    const legacy = [newId(), newId()];
    // What the previous version queued: smartUnfollow on the shared queue.
    for (const id of legacy) await operationsQueue.add('smartUnfollow', { type: 'smartUnfollow', id, config: {} }, { jobId: id });
    await until(() => runs.started.length === before + 1);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(runs.started.length).toBe(before + 1);
    expect(runs.running).toBe(1);
    runs.release();
    await until(async () => (await Promise.all(legacy.map((id) => getQueuedJob(id))))
      .every((job) => job?.status === 'completed'));
  });
});
