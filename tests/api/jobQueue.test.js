// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The job queue's routing, with Redis unreachable: which queue each type runs
 * on, how many Redis connections the queues hold, and that every lookup and
 * the shutdown still fail fast or finish instead of hanging.
 *
 * What the routing buys (a busy one-at-a-time type no longer holds the shared
 * queue's slots) needs a real Redis and is in jobQueue.redis.test.js.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-jobqueue-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'jobqueue-test-jwt-secret';
delete process.env.REDIS_URL;
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '1';
process.env.XACTIONS_QUEUE_TIMEOUT_MS = '500';

vi.mock('@prisma/client', () => import('../fixtures/memoryPrisma.js'));

const queue = await import('../../api/services/jobQueue.js');

describe('job queue routing', () => {
  it('gives a type that runs one at a time, or asks for it, a queue of its own', () => {
    const { queueNameFor, processors } = queue;
    expect(processors.get('smartUnfollow').concurrency).toBe(1);
    expect(queueNameFor('smartUnfollow')).toBe('operations-smartUnfollow');
    expect(queueNameFor('bulkExecute')).toBe('operations-bulkExecute');
    // Hours long at a limit of two.
    expect(processors.get('personaRun')).toMatchObject({ concurrency: 2, ownQueue: true });
    expect(queueNameFor('personaRun')).toBe('operations-personaRun');
    // Everything else shares one queue.
    expect(queueNameFor('getTrends')).toBe('operations');
    expect(queueNameFor('detectUnfollowers')).toBe('operations');
  });

  it('creates one queue per own-queue type plus the shared one, each with a processor', () => {
    const { allQueues, queueFor, operationsQueue, processors } = queue;
    const own = [...processors].filter(([, def]) => def.concurrency <= 1 || def.ownQueue).map(([type]) => type);
    expect(allQueues()).toHaveLength(own.length + 1);
    expect(allQueues()[0]).toBe(operationsQueue);
    expect(new Set(own.map((type) => queueFor(type))).size).toBe(own.length);
    expect(queueFor('getTrends')).toBe(operationsQueue);
    // Each queue's concurrency is checked against a real Redis in
    // jobQueue.redis.test.js; Bull does not expose it on the queue.
    expect(operationsQueue.handlers['*']).toBeTypeOf('function');
    expect(queueFor('smartUnfollow').name).toBe('operations-smartUnfollow');
    expect(queueFor('smartUnfollow').handlers['*']).toBeTypeOf('function');
  });

  it('shares the command and pub/sub connections, so N queues hold N + 2', () => {
    const { allQueues } = queue;
    const all = allQueues();
    const clients = new Set(all.map((q) => q.client));
    const subscribers = new Set(all.map((q) => q.eclient));
    const blocking = new Set(all.map((q) => q.bclient));
    expect(clients.size).toBe(1);
    expect(subscribers.size).toBe(1);
    expect(blocking.size).toBe(all.length);
    expect(clients.size + subscribers.size + blocking.size).toBe(all.length + 2);
  });

  it('every lookup across the queues fails fast while Redis is down', async () => {
    const { getQueuedJob, cancelQueuedJob, getRecentJobs, removeRepeatingJob, queueJob, QueueUnavailableError } = queue;
    const id = 'op-0123456789abcdef0123';
    for (const call of [
      () => getQueuedJob(id),
      () => cancelQueuedJob(id),
      () => getRecentJobs({ sessionCookie: 'cookie' }),
      () => removeRepeatingJob(id),
      () => queueJob({ id, type: 'smartUnfollow', config: {} }),
    ]) {
      const started = Date.now();
      await expect(call()).rejects.toBeInstanceOf(QueueUnavailableError);
      expect(Date.now() - started).toBeLessThan(5_000);
    }
  });

  it('closes every queue and connection without Redis, and does not hang', async () => {
    const { allQueues, closeQueues } = queue;
    const all = allQueues();
    const started = Date.now();
    await closeQueues();
    expect(Date.now() - started).toBeLessThan(10_000);
    expect(all.every((q) => q.closed)).toBe(true);
    // A connection closed between retries stays 'reconnecting' with its retry
    // timer cleared (ioredis), so what matters is that none tries again.
    const connections = [...new Set(all.flatMap((q) => [q.client, q.eclient, q.bclient]))];
    let retries = 0;
    for (const client of connections) {
      expect(['end', 'reconnecting']).toContain(client.status);
      for (const event of ['reconnecting', 'connect', 'ready']) client.on(event, () => retries++);
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    expect(retries).toBe(0);
  });
});
