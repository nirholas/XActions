// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import Queue from 'bull';
import { prisma } from '../../src/utils/prisma.js';
import crypto from 'node:crypto';
import { SESSION_KEYS, createJobContext, isPermanentFailure, sessionHashOf } from './processors/context.js';
import { assertRunnable, loadProcessors } from './processors/registry.js';
import { assertPublicUrl } from '../utils/publicUrl.js';

// In-memory job cancellation tracking
const cancelledJobs = new Set();

// Create Bull queue with Redis
// prefix keeps keys namespaced when this Redis instance is shared with other services
const operationsQueue = new Queue('operations', {
  prefix: process.env.REDIS_QUEUE_PREFIX || 'xactions',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  },
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
});

const processors = await loadProcessors();

/**
 * Add a new job to the queue
 * @param {string} type - Job type (operation name)
 * @param {object} data - Job data including sessionCookie, config, etc.
 * @param {object} options - Queue options (priority, delay, etc.)
 */
async function addJob(type, data, options = {}) {
  assertRunnable(processors, type);
  await checkCallbackUrl(data.config);

  // Create operation record in database
  const operation = await prisma.operation.create({
    data: {
      type,
      status: 'queued',
      userId: data.userId,
      config: data.config || {},
      createdAt: new Date()
    }
  });

  const jobData = {
    type,
    operationId: operation.id,
    ...data
  };

  const job = await operationsQueue.add(type, jobData, {
    priority: options.priority || 10,
    delay: options.delay || 0,
    attempts: options.attempts || 3,
    jobId: operation.id // Use operation ID as job ID for easy lookup
  });
  
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
  const job = await operationsQueue.add(jobData.type, data, {
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
  const repeating = await operationsQueue.getRepeatableJobs();
  const matches = repeating.filter((job) => job.id === jobId);
  await Promise.all(matches.map((job) => operationsQueue.removeRepeatableByKey(job.key)));
  return matches.length > 0;
}

/**
 * Get job status and details
 * @param {string} jobId - The operation/job ID
 */
async function getJob(jobId) {
  // Dashboard operations have a database row; AI operations live in Bull.
  const operation = await prisma.operation.findUnique({ where: { id: jobId } }).catch(() => null);

  if (!operation) {
    const bullJob = await operationsQueue.getJob(jobId);
    return bullJob ? describeBullJob(bullJob) : null;
  }

  // Get Bull job for live progress
  const bullJob = await operationsQueue.getJob(jobId);
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
    config: operation.config,
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
 * Cancel a running job
 * @param {string} jobId - The operation/job ID
 */
async function cancelJob(jobId) {
  // Mark as cancelled in memory (for long-running operations to check)
  cancelledJobs.add(jobId);

  // Try to remove from Bull queue if not yet started
  const bullJob = await operationsQueue.getJob(jobId);
  
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

  // Update database (AI operations have no row)
  await prisma.operation.updateMany({
    where: { id: jobId },
    data: {
      status: 'cancelled',
      completedAt: new Date()
    }
  });

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
    if (isPermanentFailure(err)) await job.discard();
    throw err;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Cap how many jobs of one type run at once in this process. One wildcard
 * worker serves every type (a named `process()` per type adds Redis listeners
 * for each of the hundreds of types), so the per-type limit is kept here.
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
const WORKER_CONCURRENCY = Math.max(1, parseInt(process.env.XACTIONS_WORKER_CONCURRENCY, 10) || 8);

operationsQueue.process('*', WORKER_CONCURRENCY, (job) => {
  const def = processors.get(job.name);
  if (!def) throw new Error(`No processor for "${job.name}" on this worker. Deploy the same version as the API.`);
  return limits.get(job.name)(() => runProcessor(job, def));
});

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
  const jobs = await operationsQueue.getJobs(['active', 'waiting', 'delayed', 'completed', 'failed'], 0, 999);
  const mine = jobs
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
    await assertPublicUrl(url, 'callbackUrl');
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-XActions-Event': payload.event },
      body: JSON.stringify(payload),
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
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

operationsQueue.on('active', async (job) => {
  if (loud(job)) console.log(`▶️  Job active: ${job.id} (${job.data.type || job.name})`);
  await updateOperation(job, { status: 'processing', startedAt: new Date() });
  global.io?.to(`job:${roomOf(job)}`).emit('job:active', {
    jobId: roomOf(job),
    type: job.data.type,
    startedAt: new Date().toISOString(),
  });
});

operationsQueue.on('progress', (job, progress) => {
  global.io?.to(`job:${roomOf(job)}`).emit('job:progress', {
    jobId: roomOf(job),
    progress,
  });
});

operationsQueue.on('completed', async (job, result) => {
  if (loud(job)) console.log(`✅ Job completed: ${job.id}`);
  await updateOperation(job, { status: 'completed', completedAt: new Date(), result: serializeResult(result) });
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
});

operationsQueue.on('failed', async (job, err) => {
  console.error(`❌ Job failed: ${job.id}`, err.message);
  const final = job.attemptsMade >= (job.opts.attempts ?? 1) || isPermanentFailure(err);
  await updateOperation(job, { status: 'failed', error: err.message, retryCount: job.attemptsMade });
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
});

operationsQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job stalled: ${job.id}`);
});

// ── Graceful shutdown ───────────────────────────────────────────────────────

async function gracefulShutdown(signal) {
  console.log(`📊 Received ${signal} — draining job queue…`);
  try {
    await operationsQueue.pause(true /* isLocal */);

    await Promise.race([
      operationsQueue.whenCurrentJobsFinished(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Drain timeout after 30s')), 30_000)
      ),
    ]).catch(err => console.warn(`⚠️  ${err.message} — forcing shutdown`));

    // Close any Puppeteer browsers still open
    if (global.activeBrowsers?.size) {
      console.log(`🧹 Closing ${global.activeBrowsers.size} browser(s)…`);
      await Promise.allSettled(
        Array.from(global.activeBrowsers).map(b => b.close().catch(() => {}))
      );
    }

    await operationsQueue.close();
    await prisma.$disconnect();
    console.log('✅ Graceful shutdown complete.');
  } catch (err) {
    console.error('❌ Shutdown error:', err.message);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Periodic cleanup of cancelled job markers
setInterval(cleanupCancelledJobs, 3600000); // Every hour

export {
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
  operationsQueue,
  processors
};
