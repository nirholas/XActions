import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import { processUnfollowNonFollowers } from './operations/unfollowNonFollowers.js';
import { processUnfollowEveryone } from './operations/unfollowEveryone.js';
import { processDetectUnfollowers } from './operations/detectUnfollowers.js';

// Puppeteer processors
import { unfollowNonFollowersBrowser } from './operations/puppeteer/unfollowNonFollowers.js';
import { unfollowEveryoneBrowser } from './operations/puppeteer/unfollowEveryone.js';
import { detectUnfollowersBrowser } from './operations/puppeteer/detectUnfollowers.js';

const prisma = new PrismaClient();

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

// Queue job
async function queueJob(jobData) {
  const job = await operationsQueue.add(jobData.type, jobData, {
    priority: jobData.priority || 10
  });
  
  console.log(`📨 Job queued: ${job.id} (${jobData.type})`);
  return job;
}

// Process jobs
operationsQueue.process('unfollowNonFollowers', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: unfollowNonFollowers`);
  
  // Check if browser automation or API
  if (job.data.authMethod === 'session') {
    return await unfollowNonFollowersBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message)
    );
  }
  
  return await processUnfollowNonFollowers(job.data);
});

operationsQueue.process('unfollowEveryone', 2, async (job) => {
  console.log(`🔄 Processing job ${job.id}: unfollowEveryone`);
  
  if (job.data.authMethod === 'session') {
    return await unfollowEveryoneBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message)
    );
  }
  
  return await processUnfollowEveryone(job.data);
});

operationsQueue.process('detectUnfollowers', 3, async (job) => {
  console.log(`🔄 Processing job ${job.id}: detectUnfollowers`);
  
  if (job.data.authMethod === 'session') {
    return await detectUnfollowersBrowser(
      job.data.userId,
      job.data.config,
      (message) => job.progress(message)
    );
  }
  
  return await processDetectUnfollowers(job.data);
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

export {
  queueJob,
  operationsQueue
};
