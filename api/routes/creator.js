import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Get account analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = '28d' } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getCreatorAnalytics',
        status: 'pending',
        config: JSON.stringify({ period }),
      },
    });

    await queueJob({
      type: 'getCreatorAnalytics',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { period, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Analytics fetch queued' });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get revenue info
router.get('/revenue', async (req, res) => {
  try {
    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getRevenue',
        status: 'pending',
        config: JSON.stringify({}),
      },
    });

    await queueJob({
      type: 'getRevenue',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Revenue fetch queued' });
  } catch (error) {
    console.error('Revenue error:', error);
    res.status(500).json({ error: 'Failed to get revenue' });
  }
});

// Get subscribers
router.get('/subscribers', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getSubscribers',
        status: 'pending',
        config: JSON.stringify({ limit: parseInt(limit) }),
      },
    });

    await queueJob({
      type: 'getSubscribers',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { limit: parseInt(limit), sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Subscribers fetch queued' });
  } catch (error) {
    console.error('Subscribers error:', error);
    res.status(500).json({ error: 'Failed to get subscribers' });
  }
});

export default router;
