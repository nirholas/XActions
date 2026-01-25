import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { getTwitterClient } from './twitter.js';
import { queueJob } from '../services/jobQueue.js';

// Payment routes archived - XActions is now 100% free and open-source
// All credit checks have been removed - unlimited operations for all users

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// Unfollow non-followers
router.post('/unfollow-non-followers', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected - use OAuth or Session Cookie' });
    }

    const { maxUnfollows = 100, dryRun = false } = req.body;

    // Create operation record
    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'unfollowNonFollowers',
        status: 'pending',
        config: JSON.stringify({ maxUnfollows, dryRun })
      }
    });

    // Queue the job
    await queueJob({
      type: 'unfollowNonFollowers',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { 
        maxUnfollows, 
        dryRun,
        username: req.user.twitterUsername,
        sessionCookie: req.user.sessionCookie
      }
    });

    res.json({
      operationId: operation.id,
      status: 'queued',
      message: 'Unfollow operation queued successfully'
    });
  } catch (error) {
    console.error('Unfollow non-followers error:', error);
    res.status(500).json({ error: 'Failed to start unfollow operation' });
  }
});

// Unfollow everyone
router.post('/unfollow-everyone', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected - use OAuth or Session Cookie' });
    }

    const { maxUnfollows = 100, dryRun = false } = req.body;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'unfollowEveryone',
        status: 'pending',
        config: JSON.stringify({ maxUnfollows, dryRun })
      }
    });

    await queueJob({
      type: 'unfollowEveryone',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { 
        maxUnfollows, 
        dryRun,
        username: req.user.twitterUsername,
        sessionCookie: req.user.sessionCookie
      }
    });

    res.json({
      operationId: operation.id,
      status: 'queued',
      message: 'Unfollow everyone operation queued successfully'
    });
  } catch (error) {
    console.error('Unfollow everyone error:', error);
    res.status(500).json({ error: 'Failed to start unfollow operation' });
  }
});

// Detect unfollowers
router.post('/detect-unfollowers', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected - use OAuth or Session Cookie' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'detectUnfollowers',
        status: 'pending',
        config: JSON.stringify({})
      }
    });

    await queueJob({
      type: 'detectUnfollowers',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: {
        username: req.user.twitterUsername,
        sessionCookie: req.user.sessionCookie
      }
    });

    res.json({
      operationId: operation.id,
      status: 'queued',
      message: 'Detect unfollowers operation queued successfully'
    });
  } catch (error) {
    console.error('Detect unfollowers error:', error);
    res.status(500).json({ error: 'Failed to start detect operation' });
  }
});

// Get operation status
router.get('/status/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;

    const operation = await prisma.operation.findFirst({
      where: {
        id: operationId,
        userId: req.user.id
      }
    });

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    res.json(operation);
  } catch (error) {
    console.error('Operation status error:', error);
    res.status(500).json({ error: 'Failed to fetch operation status' });
  }
});

// Cancel operation
router.post('/cancel/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;

    const operation = await prisma.operation.findFirst({
      where: {
        id: operationId,
        userId: req.user.id,
        status: { in: ['pending', 'processing'] }
      }
    });

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found or already completed' });
    }

    await prisma.operation.update({
      where: { id: operationId },
      data: { status: 'cancelled' }
    });

    res.json({ message: 'Operation cancelled successfully' });
  } catch (error) {
    console.error('Operation cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel operation' });
  }
});

// List all operations
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (type) where.type = type;

    const [operations, total] = await Promise.all([
      prisma.operation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.operation.count({ where })
    ]);

    res.json({
      operations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Operations list error:', error);
    res.status(500).json({ error: 'Failed to fetch operations' });
  }
});

export default router;
