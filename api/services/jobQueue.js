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

const prisma = new PrismaClient();

// In-memory job cancellation tracking
const cancelledJobs = new Set();

// Create Bull queue with Redis
const operationsQueue = new Queue('operations', {
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

// Job event handlers
operationsQueue.on('completed', async (job, result) => {
  console.log(`✅ Job completed: ${job.id}`);
  
  await prisma.operation.update({
    where: { id: job.data.operationId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      result
    }
  });
});

operationsQueue.on('failed', async (job, err) => {
  console.error(`❌ Job failed: ${job.id}`, err);
  
  await prisma.operation.update({
    where: { id: job.data.operationId },
    data: {
      status: 'failed',
      error: err.message,
      retryCount: job.attemptsMade
    }
  });
});

operationsQueue.on('stalled', async (job) => {
  console.warn(`⚠️ Job stalled: ${job.id}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📊 Closing queue...');
  await operationsQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

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
