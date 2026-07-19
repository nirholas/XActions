// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import { processUnfollowNonFollowers } from './operations/unfollowNonFollowers.js';
import { processUnfollowEveryone } from './operations/unfollowEveryone.js';
import { processDetectUnfollowers } from './operations/detectUnfollowers.js';
import { processAutoLike } from './operations/autoLike.js';
import { processFollowEngagers } from './operations/followEngagers.js';
import { processKeywordFollow } from './operations/keywordFollow.js';
import { processAutoComment } from './operations/autoComment.js';

// Puppeteer processors
import { unfollowNonFollowersBrowser } from './operations/puppeteer/unfollowNonFollowers.js';
import { unfollowEveryoneBrowser } from './operations/puppeteer/unfollowEveryone.js';
import { detectUnfollowersBrowser } from './operations/puppeteer/detectUnfollowers.js';
import { autoLikeBrowser } from './operations/puppeteer/autoLike.js';
import { followEngagersBrowser } from './operations/puppeteer/followEngagers.js';
import { keywordFollowBrowser } from './operations/puppeteer/keywordFollow.js';
import { autoCommentBrowser } from './operations/puppeteer/autoComment.js';
import { runBrowserScript } from './operations/puppeteer/scriptRunner.js';

const prisma = new PrismaClient();

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
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

/**
 * Add a new job to the queue
 * @param {string} type - Job type (operation name)
 * @param {object} data - Job data including sessionCookie, config, etc.
 * @param {object} options - Queue options (priority, delay, etc.)
 */
async function addJob(type, data, options = {}) {
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
 * Queue job (legacy function for backward compatibility)
 */
async function queueJob(jobData) {
  const job = await operationsQueue.add(jobData.type, jobData, {
    priority: jobData.priority || 10
  });
  
  console.log(`📨 Job queued: ${job.id} (${jobData.type})`);
  return job;
}

/**
 * Get job status and details
 * @param {string} jobId - The operation/job ID
 */
async function getJob(jobId) {
  // Get from database
  const operation = await prisma.operation.findUnique({
    where: { id: jobId }
  });

  if (!operation) {
    return null;
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
    result: operation.result,
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

  // Update database
  await prisma.operation.update({
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

// Process jobs - unfollowNonFollowers
operationsQueue.process('unfollowNonFollowers', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: unfollowNonFollowers`);
  
  // Check if browser automation or API
  if (job.data.authMethod === 'session') {
    return await unfollowNonFollowersBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message),
      () => isJobCancelled(job.data.operationId)
    );
  }
  
  return await processUnfollowNonFollowers(job.data, () => isJobCancelled(job.data.operationId));
});

// Process jobs - unfollowEveryone
operationsQueue.process('unfollowEveryone', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: unfollowEveryone`);
  
  if (job.data.authMethod === 'session') {
    return await unfollowEveryoneBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message),
      () => isJobCancelled(job.data.operationId)
    );
  }
  
  return await processUnfollowEveryone(job.data, () => isJobCancelled(job.data.operationId));
});

// Process jobs - detectUnfollowers
operationsQueue.process('detectUnfollowers', 3, async (job) => {
  console.log(`🔄 Processing job ${job.id}: detectUnfollowers`);
  
  if (job.data.authMethod === 'session') {
    return await detectUnfollowersBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message),
      () => isJobCancelled(job.data.operationId)
    );
  }
  
  return await processDetectUnfollowers(job.data, () => isJobCancelled(job.data.operationId));
});

// Process jobs - autoLike
operationsQueue.process('autoLike', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: autoLike`);
  
  if (job.data.authMethod === 'session') {
    return await autoLikeBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message),
      () => isJobCancelled(job.data.operationId)
    );
  }
  
  return await processAutoLike(job.data, () => isJobCancelled(job.data.operationId));
});

// Process jobs - followEngagers
operationsQueue.process('followEngagers', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: followEngagers`);
  
  if (job.data.authMethod === 'session') {
    return await followEngagersBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message),
      () => isJobCancelled(job.data.operationId)
    );
  }
  
  return await processFollowEngagers(job.data, () => isJobCancelled(job.data.operationId));
});

// Process jobs - keywordFollow
operationsQueue.process('keywordFollow', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: keywordFollow`);
  
  if (job.data.authMethod === 'session') {
    return await keywordFollowBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message),
      () => isJobCancelled(job.data.operationId)
    );
  }
  
  return await processKeywordFollow(job.data, () => isJobCancelled(job.data.operationId));
});

// Process jobs - autoComment
operationsQueue.process('autoComment', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: autoComment`);
  
  if (job.data.authMethod === 'session') {
    return await autoCommentBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message),
      () => isJobCancelled(job.data.operationId)
    );
  }
  
  return await processAutoComment(job.data, () => isJobCancelled(job.data.operationId));
});

// Process jobs - scriptRun (generic browser script executor)
operationsQueue.process('scriptRun', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: scriptRun (${job.data.config?.scriptPath})`);
  return await runBrowserScript(
    job.data.config,
    (message) => job.progress(message),
    () => isJobCancelled(job.data.operationId)
  );
});

// Process jobs - datasetFetch
operationsQueue.process('datasetFetch', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: datasetFetch (${job.data.config?.dataset})`);
  const { dataset, limit, offset, sessionCookie } = job.data.config || {};
  if (!dataset) throw new Error('datasetFetch: config.dataset is required');

  const { DatasetStore } = await import('../../src/scraping/paginationEngine.js');
  const ds = new DatasetStore(dataset, sessionCookie);
  job.progress({ status: 'running', message: `Fetching dataset: ${dataset}` });
  const data = await ds.getData({ offset: offset || 0, limit: limit || 100 });
  job.progress({ status: 'done', message: `Fetched ${data?.items?.length ?? 0} records` });
  return data;
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Fire a best-effort POST to a callbackUrl with the job result */
function deliverCallback(url, payload) {
  if (!url) return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-XActions-Event': payload.event },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  }).catch(err => console.warn(`⚠️  callbackUrl delivery failed (${url}): ${err.message}`));
}

// ── Job event handlers ──────────────────────────────────────────────────────

operationsQueue.on('active', async (job) => {
  console.log(`▶️  Job active: ${job.id} (${job.data.type || job.name})`);
  try {
    await prisma.operation.update({
      where: { id: job.data.operationId },
      data: { status: 'processing', startedAt: new Date() },
    });
  } catch (err) {
    console.warn(`⚠️  Could not set startedAt for ${job.data.operationId}: ${err.message}`);
  }
  global.io?.to(`job:${job.data.operationId}`).emit('job:active', {
    jobId: job.data.operationId,
    type: job.data.type,
    startedAt: new Date().toISOString(),
  });
});

operationsQueue.on('progress', (job, progress) => {
  global.io?.to(`job:${job.data.operationId}`).emit('job:progress', {
    jobId: job.data.operationId,
    progress,
  });
});

operationsQueue.on('completed', async (job, result) => {
  console.log(`✅ Job completed: ${job.id}`);

  await prisma.operation.update({
    where: { id: job.data.operationId },
    data: { status: 'completed', completedAt: new Date(), result },
  });

  global.io?.to(`job:${job.data.operationId}`).emit('job:completed', {
    jobId: job.data.operationId,
    result,
    completedAt: new Date().toISOString(),
  });

  deliverCallback(job.data.config?.callbackUrl, {
    event: 'job.completed',
    jobId: job.data.operationId,
    type: job.data.type,
    result,
    completedAt: new Date().toISOString(),
  });
});

operationsQueue.on('failed', async (job, err) => {
  console.error(`❌ Job failed: ${job.id}`, err);

  await prisma.operation.update({
    where: { id: job.data.operationId },
    data: { status: 'failed', error: err.message, retryCount: job.attemptsMade },
  });

  global.io?.to(`job:${job.data.operationId}`).emit('job:failed', {
    jobId: job.data.operationId,
    error: err.message,
    failedAt: new Date().toISOString(),
  });

  deliverCallback(job.data.config?.callbackUrl, {
    event: 'job.failed',
    jobId: job.data.operationId,
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
  getHistory,
  cancelJob,
  isJobCancelled,
  operationsQueue
};
