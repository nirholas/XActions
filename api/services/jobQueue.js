// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The operations job queue: one Bull queue per concurrency class.
 *
 * Every type that can share a slot runs on the shared `operations` queue,
 * `XACTIONS_WORKER_CONCURRENCY` (default 8) at a time, each type also held to
 * its own limit. A type that runs one at a time (`concurrency: 1`), or that
 * declares `ownQueue: true` because it runs for hours, gets a queue of its own
 * whose Bull concurrency is that type's limit. Bull claims a job into a slot
 * before the processor runs, so a type limit enforced inside the shared
 * queue's processor left its backlog waiting in claimed slots: eight queued
 * smartUnfollow jobs held all eight and nothing else started for hours. A job
 * waiting for its own queue's slot stays "waiting" and holds nothing.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */
import Queue from 'bull';
import { createRequire } from 'node:module';
import { prisma } from '../../src/utils/prisma.js';
import crypto from 'node:crypto';
import { SESSION_KEYS, createJobContext, isPermanentFailure, sessionHashOf } from './processors/context.js';
import { assertRunnable, loadProcessors } from './processors/registry.js';
import { assertPublicUrl, publicFetch } from '../utils/publicUrl.js';

// The ioredis Bull itself depends on, which can differ from the app's own.
const requireHere = createRequire(import.meta.url);
const Redis = createRequire(requireHere.resolve('bull'))('ioredis');

// In-memory job cancellation tracking
const cancelledJobs = new Set();

const processors = await loadProcessors();

// ── Redis connections ───────────────────────────────────────────────────────
// Bull opens three connections per queue: commands, pub/sub, and a blocking
// one for its worker loop. Every queue here shares the first two, as Bull
// allows through `createClient`; only the blocking one cannot be shared. So a
// process holds (number of queues + 2) connections, not three per queue.

/** Every connection opened for the queues, closed by closeQueues(). */
const connections = [];
const sharedConnections = {};

function createRedisClient(type, config) {
  // Bull refuses a pub/sub or blocking connection that retries per request.
  const options = type === 'client' ? config : { ...config, maxRetriesPerRequest: null, enableReadyCheck: false };
  if (type === 'bclient') {
    const client = new Redis(options);
    connections.push(client);
    return client;
  }
  if (!sharedConnections[type]) {
    const client = new Redis(options);
    // Each queue adds its own 'error' (and, on the subscriber, message)
    // listeners to the shared connection; that many is expected.
    client.setMaxListeners(0);
    connections.push(client);
    sharedConnections[type] = client;
  }
  return sharedConnections[type];
}

// prefix keeps keys namespaced when this Redis instance is shared with other services.
// REDIS_URL (set by Railway and most hosts) wins over REDIS_HOST/PORT/PASSWORD;
// it was ignored, so those deployments queued against localhost.
const queueOptions = {
  prefix: process.env.REDIS_QUEUE_PREFIX || 'xactions',
  createClient: createRedisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    // Status is promised for 24 hours after an operation is queued.
    removeOnComplete: { age: 86_400, count: 5_000 },
    removeOnFail: { age: 86_400, count: 5_000 }
  }
};

function createQueue(name) {
  return process.env.REDIS_URL
    ? new Queue(name, process.env.REDIS_URL, queueOptions)
    : new Queue(name, {
      ...queueOptions,
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });
}

// ── Queues ─────────────────────────────────────────────────────────────────

const SHARED_QUEUE = 'operations';
const WORKER_CONCURRENCY = Math.max(1, parseInt(process.env.XACTIONS_WORKER_CONCURRENCY, 10) || 8);

/** Whether a type runs on a queue of its own rather than the shared one. */
const hasOwnQueue = (def) => def.concurrency <= 1 || def.ownQueue;

/** Queue name → { queue, concurrency }. The shared queue is first. */
const queues = new Map([[SHARED_QUEUE, { queue: createQueue(SHARED_QUEUE), concurrency: WORKER_CONCURRENCY }]]);
for (const [type, def] of processors) {
  if (!hasOwnQueue(def)) continue;
  const name = `${SHARED_QUEUE}-${type}`;
  queues.set(name, { queue: createQueue(name), concurrency: def.concurrency });
}

const operationsQueue = queues.get(SHARED_QUEUE).queue;

/** Every queue, the shared one first. */
const allQueues = () => [...queues.values()].map((entry) => entry.queue);

/**
 * The name of the queue a job type runs on.
 * @param {string} type
 */
function queueNameFor(type) {
  const own = `${SHARED_QUEUE}-${type}`;
  return queues.has(own) ? own : SHARED_QUEUE;
}

/**
 * The Bull queue a job type runs on.
 * @param {string} type
 */
function queueFor(type) {
  return queues.get(queueNameFor(type)).queue;
}

/** How long a request waits for Redis before the queue is reported unavailable. */
const QUEUE_READY_TIMEOUT_MS = Math.max(500, parseInt(process.env.XACTIONS_QUEUE_TIMEOUT_MS, 10) || 5_000);

/** Redis is down or unreachable, so nothing can be queued. Retrying later may work. */
class QueueUnavailableError extends Error {
  constructor(cause) {
    super(`The job queue is unavailable (Redis did not answer within ${QUEUE_READY_TIMEOUT_MS / 1000}s). Try again shortly.`);
    this.name = 'QueueUnavailableError';
    this.code = 'QUEUE_UNAVAILABLE';
    this.status = 503;
    this.cause = cause;
  }
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timed out')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Add a job to the queue its type runs on, failing fast when Redis is
 * unreachable. Bull queues commands while its client is offline, so add() on
 * a dead Redis never settled and the request (and its Operation row) hung at
 * "pending". Nothing is added unless the client is connected first.
 */
async function addToQueue(name, data, opts) {
  await queueReady();
  return queueFor(name).add(name, data, opts);
}

/**
 * Resolve once the Redis client is connected, or throw QueueUnavailableError.
 * Bull's own isReady() resolves even while Redis is unreachable, so the
 * client's connection status is what is checked. Every queue shares this
 * client.
 */
async function queueReady() {
  const client = operationsQueue.client;
  if (client.status === 'ready') return;
  let onReady;
  try {
    await withTimeout(new Promise((resolve) => client.once('ready', (onReady = resolve))), QUEUE_READY_TIMEOUT_MS);
  } catch (err) {
    throw new QueueUnavailableError(err);
  } finally {
    client.removeListener('ready', onReady);
  }
}

/**
 * The Bull job with this id, from whichever queue holds it, failing fast
 * instead of hanging when Redis is down. When the type is known its own queue
 * is asked first; every queue is asked otherwise, and when that misses (a job
 * queued before its type moved queues).
 *
 * @param {string} jobId
 * @param {string} [type]
 */
async function bullJobById(jobId, type) {
  await queueReady();
  if (type) {
    const job = await queueFor(type).getJob(jobId);
    if (job) return job;
  }
  const found = await Promise.all(allQueues().map((queue) => queue.getJob(jobId)));
  return found.find(Boolean) || null;
}

/**
 * Add a new job to the queue
 * @param {string} type - Job type (operation name)
 * @param {object} data - Job data including sessionCookie, config, etc.
 * @param {object} options - Queue options (priority, delay, etc.)
 */
async function addJob(type, data, options = {}) {
  assertRunnable(processors, type);
  await checkCallbackUrl(data.config);

  // Create operation record in database. Operation.config is a TEXT column:
  // an object here failed validation, so every addJob caller (A2A task
  // submission among them) answered 500. The session is never stored.
  const operation = await prisma.operation.create({
    data: {
      type,
      status: 'queued',
      userId: data.userId,
      config: JSON.stringify(redactSession(data.config) || {}),
      createdAt: new Date()
    }
  });

  const jobData = {
    type,
    operationId: operation.id,
    ...data
  };

  let job;
  try {
    job = await addToQueue(type, jobData, {
      priority: options.priority || 10,
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      jobId: operation.id // Use operation ID as job ID for easy lookup
    });
  } catch (err) {
    await prisma.operation.update({
      where: { id: operation.id },
      data: { status: 'failed', error: err.message, completedAt: new Date() }
    }).catch(() => {});
    throw err;
  }
  
  console.log(`📨 Job queued: ${job.id} (${type})`);
  return { jobId: operation.id, bullJobId: job.id, operation };
}

/**
 * Queue a job.
 *
 * Dashboard routes create an Operation row first and pass its id as
 * `operationId`; AI routes pass their own `id`. Either becomes the Bull job
 * id, so a status poll finds the job by the id the route handed out. A type
 * with no processor is refused here, before anything is queued or charged.
 *
 * @param {object} jobData - `{ type, operationId?, id?, userId?, config, delay?, repeat? }`
 */
async function queueJob(jobData) {
  assertRunnable(processors, jobData.type);
  await checkCallbackUrl(jobData.config);

  const jobId = String(jobData.operationId || jobData.id || `op-${crypto.randomUUID()}`);
  const data = {
    ...jobData,
    id: jobId,
    queuedAt: new Date().toISOString(),
    sessionHash: sessionHashOf(jobData.config),
  };
  const job = await addToQueue(jobData.type, data, {
    jobId,
    priority: jobData.priority || 10,
    // A delay in ms, or a repeat such as { cron: '0 9 * * *', tz: 'Europe/Berlin' }.
    ...(jobData.delay > 0 ? { delay: jobData.delay } : {}),
    ...(jobData.repeat ? { repeat: jobData.repeat } : {}),
  });

  console.log(`📨 Job queued: ${job.id} (${jobData.type})`);
  return job;
}

/**
 * Stop a repeating job queued with `repeat`, by the id it was queued under.
 * @param {string} jobId
 * @returns {Promise<boolean>} whether one was found
 */
async function removeRepeatingJob(jobId) {
  await queueReady();
  const removed = await Promise.all(allQueues().map(async (queue) => {
    const matches = (await queue.getRepeatableJobs()).filter((job) => job.id === jobId);
    await Promise.all(matches.map((job) => queue.removeRepeatableByKey(job.key)));
    return matches.length;
  }));
  return removed.some((count) => count > 0);
}

/**
 * Get job status and details
 * @param {string} jobId - The operation/job ID
 */
async function getJob(jobId) {
  // Dashboard operations have a database row; AI operations live in Bull.
  const operation = await prisma.operation.findUnique({ where: { id: jobId } }).catch(() => null);

  if (!operation) {
    const bullJob = await bullJobById(jobId);
    return bullJob ? describeBullJob(bullJob) : null;
  }

  // Get Bull job for live progress (the row alone answers when Redis is down)
  const bullJob = await bullJobById(jobId, operation.type).catch(() => null);
  let progress = null;
  let state = operation.status;

  if (bullJob) {
    progress = await bullJob.progress();
    state = await bullJob.getState();
  }

  return {
    id: operation.id,
    type: operation.type,
    status: state || operation.status,
    progress,
    config: parseResult(operation.config),
    result: parseResult(operation.result),
    error: operation.error,
    createdAt: operation.createdAt,
    startedAt: operation.startedAt,
    completedAt: operation.completedAt,
    retryCount: operation.retryCount || 0,
    cancelled: cancelledJobs.has(jobId)
  };
}

/**
 * Get job history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Max results (default 50)
 */
async function getHistory(userId, limit = 50) {
  const operations = await prisma.operation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      status: true,
      config: true,
      result: true,
      error: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      retryCount: true
    }
  });

  return operations;
}

/**
 * Cancel a queued or running job.
 * @param {string} jobId - The operation/job ID
 * @returns {Promise<object|null>} null when there is no such job or operation
 */
async function cancelJob(jobId) {
  // With Redis down nothing can run, so the row alone is cancelled.
  const bullJob = await bullJobById(jobId).catch(() => null);
  // Dashboard operations have a row; AI operations do not.
  const updated = await prisma.operation.updateMany({
    where: { id: jobId, status: { notIn: ['completed', 'failed', 'cancelled'] } },
    data: {
      status: 'cancelled',
      completedAt: new Date()
    }
  }).catch(() => ({ count: 0 }));

  if (!bullJob && updated.count === 0) return null;

  // Mark as cancelled in memory (for long-running operations to check)
  cancelledJobs.add(jobId);

  if (bullJob) {
    const state = await bullJob.getState();
    
    if (state === 'waiting' || state === 'delayed') {
      await bullJob.remove();
      console.log(`🛑 Job removed from queue: ${jobId}`);
    } else if (state === 'active') {
      // Job is running - mark for cancellation (operation will check this)
      console.log(`⚠️ Job ${jobId} is active, marked for cancellation`);
    }
  }

  return { success: true, jobId, message: 'Job cancelled' };
}

/**
 * Ids the AI and agent routes hand out (ai-…, op-…, script-run-…). Only these
 * resolve on their unauthenticated status and cancel endpoints: a dashboard
 * operation's id is a row id, and its owner reads it through /api/operations.
 */
const QUEUED_JOB_ID = /^(?:ai|op|script-run)-[A-Za-z0-9-]{16,}$/;

/** Whether an id is one the anonymous AI status and cancel endpoints may resolve. */
function isQueuedJobId(jobId) {
  return typeof jobId === 'string' && QUEUED_JOB_ID.test(jobId);
}

/**
 * Status of a job queued by the AI routes, from Bull only. Never reads or
 * returns an Operation row.
 * @param {string} jobId
 */
async function getQueuedJob(jobId) {
  if (!isQueuedJobId(jobId)) return null;
  const bullJob = await bullJobById(jobId);
  return bullJob ? describeBullJob(bullJob) : null;
}

/**
 * Cancel a job queued by the AI routes. Never touches an Operation row.
 * @param {string} jobId
 * @param {{ sessionCookie?: string }} [caller] - when given, a job queued with
 *   a session is cancelled only by a caller presenting that same session
 * @returns {Promise<object|null>} null when there is no such job
 */
async function cancelQueuedJob(jobId, caller) {
  if (!isQueuedJobId(jobId)) return null;
  const bullJob = await bullJobById(jobId);
  if (!bullJob) return null;
  const owner = bullJob.data?.sessionHash;
  if (caller && owner && owner !== sessionHashOf({ sessionCookie: caller.sessionCookie })) return null;
  const state = await bullJob.getState();
  if (state === 'completed' || state === 'failed') return null;
  cancelledJobs.add(jobId);
  if (state === 'waiting' || state === 'delayed' || state === 'paused') await bullJob.remove();
  return { success: true, jobId, message: 'Job cancelled' };
}

/**
 * Check if a job has been cancelled
 * @param {string} jobId - The operation/job ID
 */
function isJobCancelled(jobId) {
  return cancelledJobs.has(jobId);
}

/**
 * Clean up old cancelled job markers
 */
function cleanupCancelledJobs() {
  // Clear cancelled markers older than 1 hour (they're in-memory only)
  // In production, you might want to persist this to Redis
  if (cancelledJobs.size > 1000) {
    cancelledJobs.clear();
  }
}

// ── Processors ─────────────────────────────────────────────────────────────
// One registration per type in api/services/processors/*.processors.js.

/** Whether a job's lifecycle is worth a log line (frequent internal ticks are not). */
const loud = (job) => !processors.get(job.name)?.quiet;

async function runProcessor(job, def) {
  if (!def.quiet) console.log(`🔄 Processing job ${job.id}: ${job.name}`);
  const ctx = createJobContext(job, { isCancelled: isJobCancelled });
  try {
    return await def.run(ctx);
  } catch (err) {
    // A missing session or bad input fails the same way on every retry.
    // A cancelled job is not retried either.
    if (isPermanentFailure(err) || isJobCancelled(String(ctx.operationId))) await job.discard();
    throw err;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Cap how many jobs of one type run at once in this process, across queues.
 * On a type's own queue Bull's concurrency already is that limit; on the
 * shared queue this is what holds each type to its own. A job waiting here
 * holds a shared slot, which is why a type that runs one at a time, or for
 * hours, has a queue of its own instead. (A named `process(type, n)` per type
 * does not help: in Bull 4 every named processor's loop takes any job from
 * the queue, and their concurrencies add up.)
 */
function limiter(limit) {
  let running = 0;
  const waiting = [];
  return async (fn) => {
    if (running >= limit) await new Promise((resolve) => waiting.push(resolve));
    running++;
    try {
      return await fn();
    } finally {
      running--;
      waiting.shift()?.();
    }
  };
}

const limits = new Map([...processors].map(([type, def]) => [type, limiter(def.concurrency)]));

// Every queue runs any type it is handed, so a job queued on the shared queue
// before its type got a queue of its own still runs after a deploy.
for (const { queue, concurrency } of queues.values()) {
  queue.process('*', concurrency, (job) => {
    const def = processors.get(job.name);
    if (!def) throw new Error(`No processor for "${job.name}" on this worker. Deploy the same version as the API.`);
    return limits.get(job.name)(() => runProcessor(job, def));
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** A job config without the session it carried. */
function redactSession(config) {
  if (!config || typeof config !== 'object') return config ?? null;
  const copy = { ...config };
  for (const key of SESSION_KEYS) delete copy[key];
  return copy;
}

const BULL_STATUS = {
  waiting: 'queued',
  delayed: 'queued',
  paused: 'queued',
  active: 'processing',
  completed: 'completed',
  failed: 'failed',
};

const isoOrNull = (ms) => (ms ? new Date(ms).toISOString() : null);

/** Status document for a job that has no database row (AI operations). */
async function describeBullJob(job) {
  const id = String(job.id);
  const state = await job.getState();
  return {
    id,
    type: job.name,
    status: cancelledJobs.has(id) ? 'cancelled' : BULL_STATUS[state] || state,
    progress: job.progress() || null,
    config: redactSession(job.data?.config),
    result: job.returnvalue ?? null,
    error: job.failedReason || null,
    createdAt: isoOrNull(job.timestamp),
    startedAt: isoOrNull(job.processedOn),
    completedAt: isoOrNull(job.finishedOn),
    retryCount: job.attemptsMade || 0,
    cancelled: cancelledJobs.has(id),
  };
}

/**
 * Recent operations queued with the given session, newest first.
 *
 * @param {{ sessionCookie?: string, source?: string, type?: string, limit?: number }} options
 */
async function getRecentJobs({ sessionCookie, source, type, limit = 20 } = {}) {
  const hash = sessionHashOf({ sessionCookie });
  if (!hash) return [];
  await queueReady();
  const perQueue = await Promise.all(allQueues().map((queue) =>
    queue.getJobs(['active', 'waiting', 'delayed', 'completed', 'failed'], 0, 999)));
  const mine = perQueue.flat()
    .filter((job) => job?.data?.sessionHash === hash)
    .filter((job) => (!source || job.data.source === source) && (!type || job.name === type))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
  return Promise.all(mine.map(describeBullJob));
}

/** Drop the session from a job's stored data once nothing will run it again. */
async function forgetSession(job, final) {
  if (!final || !SESSION_KEYS.some((key) => job.data?.config?.[key])) return;
  try {
    await job.update({ ...job.data, config: redactSession(job.data.config) });
  } catch (err) {
    console.warn(`⚠️  Could not scrub the session from job ${job.id}: ${err.message}`);
  }
}

/** Operation.result is a TEXT column; processors return objects. */
function serializeResult(result) {
  if (result === undefined || result === null) return null;
  return typeof result === 'string' ? result : JSON.stringify(result);
}

function parseResult(stored) {
  if (typeof stored !== 'string') return stored ?? null;
  try {
    return JSON.parse(stored);
  } catch {
    return stored;
  }
}

/**
 * Best-effort POST of the job result to the caller's callbackUrl. The URL is
 * checked again at delivery (DNS can change after queueing) and redirects are
 * not followed, so a callback cannot be steered at the server's own network.
 */
async function deliverCallback(url, payload) {
  if (!url) return;
  try {
    await publicFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-XActions-Event': payload.event },
      body: JSON.stringify(payload),
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    }, { label: 'callbackUrl' });
  } catch (err) {
    console.warn(`⚠️  callbackUrl delivery failed (${url}): ${err.message}`);
  }
}

/** Refuse a callbackUrl the server must not call, before anything is queued. */
async function checkCallbackUrl(config) {
  if (config?.callbackUrl) await assertPublicUrl(config.callbackUrl, 'callbackUrl');
}

// ── Job event handlers ──────────────────────────────────────────────────────
// Dashboard jobs mirror their state into the Operation row; AI jobs have none.

const roomOf = (job) => String(job.data.operationId || job.data.id || job.id);

async function updateOperation(job, data) {
  if (!job.data.operationId) return;
  try {
    await prisma.operation.update({ where: { id: job.data.operationId }, data });
  } catch (err) {
    console.warn(`⚠️  Could not update operation ${job.data.operationId}: ${err.message}`);
  }
}

const onActive = async (job) => {
  if (loud(job)) console.log(`▶️  Job active: ${job.id} (${job.data.type || job.name})`);
  await updateOperation(job, { status: 'processing', startedAt: new Date() });
  global.io?.to(`job:${roomOf(job)}`).emit('job:active', {
    jobId: roomOf(job),
    type: job.data.type,
    startedAt: new Date().toISOString(),
  });
};

const onProgress = (job, progress) => {
  global.io?.to(`job:${roomOf(job)}`).emit('job:progress', {
    jobId: roomOf(job),
    progress,
  });
};

const onCompleted = async (job, result) => {
  if (loud(job)) console.log(`✅ Job completed: ${job.id}`);
  // A cancelled job that ran to its end keeps the status "cancelled" (its
  // partial result is still stored); it was overwritten with "completed".
  const cancelled = cancelledJobs.has(roomOf(job));
  await updateOperation(job, cancelled
    ? { result: serializeResult(result) }
    : { status: 'completed', completedAt: new Date(), result: serializeResult(result) });
  await forgetSession(job, true);

  global.io?.to(`job:${roomOf(job)}`).emit('job:completed', {
    jobId: roomOf(job),
    result,
    completedAt: new Date().toISOString(),
  });

  deliverCallback(job.data.config?.callbackUrl, {
    event: 'job.completed',
    jobId: roomOf(job),
    type: job.data.type,
    result,
    completedAt: new Date().toISOString(),
  });
};

const onFailed = async (job, err) => {
  const final = job.attemptsMade >= (job.opts.attempts ?? 1) || isPermanentFailure(err) || cancelledJobs.has(roomOf(job));
  // Bull fires 'failed' on every attempt. Until the last one the job is only
  // being retried: record the attempt, but do not mark the operation failed,
  // tell the dashboard it failed, or POST job.failed to the callback.
  if (!final) {
    console.warn(`↻ Job ${job.id} attempt ${job.attemptsMade} failed, retrying: ${err.message}`);
    await updateOperation(job, { error: err.message, retryCount: job.attemptsMade });
    return;
  }
  console.error(`❌ Job failed: ${job.id}`, err.message);
  const cancelled = cancelledJobs.has(roomOf(job));
  await updateOperation(job, cancelled
    ? { error: err.message, retryCount: job.attemptsMade }
    : { status: 'failed', error: err.message, retryCount: job.attemptsMade });
  await forgetSession(job, final);

  global.io?.to(`job:${roomOf(job)}`).emit('job:failed', {
    jobId: roomOf(job),
    error: err.message,
    failedAt: new Date().toISOString(),
  });

  deliverCallback(job.data.config?.callbackUrl, {
    event: 'job.failed',
    jobId: roomOf(job),
    type: job.data.type,
    error: err.message,
    failedAt: new Date().toISOString(),
  });
};

const onStalled = (job) => {
  console.warn(`⚠️ Job stalled: ${job.id}`);
};

// Every queue reports the same lifecycle, whichever one a job ran on.
for (const queue of allQueues()) {
  queue.on('active', onActive);
  queue.on('progress', onProgress);
  queue.on('completed', onCompleted);
  queue.on('failed', onFailed);
  queue.on('stalled', onStalled);
}

// ── Graceful shutdown ───────────────────────────────────────────────────────

/**
 * Close every queue and the Redis connections they share, without waiting for
 * running jobs (gracefulShutdown waits for those first).
 */
async function closeQueues() {
  await Promise.all(allQueues().map((queue) => queue.close(true /* doNotWaitJobs */)));
  // Bull leaves open the connections it was handed through createClient.
  for (const client of connections) client.disconnect();
}

let shuttingDown = null;

function gracefulShutdown(signal) {
  shuttingDown ??= drainAndExit(signal);
  return shuttingDown;
}

async function drainAndExit(signal) {
  console.log(`📊 Received ${signal} — draining ${queues.size} job queues…`);
  try {
    // A local pause stops each queue taking new jobs and resolves once its
    // running jobs finish. It was awaited before the 30s race, so the timeout
    // never applied; running jobs now get 30s, then the queues close anyway.
    let timer;
    await Promise.race([
      Promise.all(allQueues().map((queue) => queue.pause(true /* isLocal */))),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Drain timeout after 30s')), 30_000);
      }),
    ]).catch(err => console.warn(`⚠️  ${err.message} — forcing shutdown`))
      .finally(() => clearTimeout(timer));

    // Close any Puppeteer browsers still open
    if (global.activeBrowsers?.size) {
      console.log(`🧹 Closing ${global.activeBrowsers.size} browser(s)…`);
      await Promise.allSettled(
        Array.from(global.activeBrowsers).map(b => b.close().catch(() => {}))
      );
    }

    await closeQueues();
    await prisma.$disconnect();
    console.log('✅ Graceful shutdown complete.');
  } catch (err) {
    console.error('❌ Shutdown error:', err.message);
  } finally {
    process.exit(0);
  }
}

let lifecycleStarted = false;

/**
 * Install the process-wide parts of the queue: graceful shutdown on SIGTERM and
 * SIGINT, and the hourly cleanup of cancelled-job markers. Only the server
 * entry point calls this. Importing the module must stay side-effect free, or
 * every importer (tests, CLI, library use) has its signal handling taken over
 * and is kept alive by the interval. Idempotent.
 */
function startJobQueueLifecycle() {
  if (lifecycleStarted) return;
  lifecycleStarted = true;
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
  // unref: the cleanup timer alone must never hold the process open.
  setInterval(cleanupCancelledJobs, 3600000).unref(); // Every hour
}

export {
  startJobQueueLifecycle,
  addJob,
  queueJob,
  getJob,
  // Twenty route handlers across api/routes/ai/ import getJobStatus, which
  // was never exported: every one of them threw "getJobStatus is not a
  // function" on the first status poll. getJob already returns the status,
  // progress, result and error, so it is the function they meant.
  getJob as getJobStatus,
  getHistory,
  getRecentJobs,
  sessionHashOf,
  removeRepeatingJob,
  cancelJob,
  isJobCancelled,
  isQueuedJobId,
  getQueuedJob,
  cancelQueuedJob,
  QueueUnavailableError,
  operationsQueue,
  queueFor,
  queueNameFor,
  allQueues,
  closeQueues,
  processors
};
