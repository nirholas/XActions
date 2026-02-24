import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Search tweets
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 50, filter } = req.query;
    if (!query) return res.status(400).json({ error: 'Search query is required' });

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'searchTweets',
        status: 'pending',
        config: JSON.stringify({ query, limit: parseInt(limit), filter }),
      },
    });

    await queueJob({
      type: 'searchTweets',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { query, limit: parseInt(limit), filter, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Search queued' });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// Get trends
router.get('/trends', async (req, res) => {
  try {
    const { category } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getTrends',
        status: 'pending',
        config: JSON.stringify({ category }),
      },
    });

    await queueJob({
      type: 'getTrends',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { category, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Trends fetch queued' });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get explore feed
router.get('/explore', async (req, res) => {
  try {
    const { category = 'trending', limit = 30 } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getExploreFeed',
        status: 'pending',
        config: JSON.stringify({ category, limit: parseInt(limit) }),
      },
    });

    await queueJob({
      type: 'getExploreFeed',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { category, limit: parseInt(limit), sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Explore feed fetch queued' });
  } catch (error) {
    console.error('Explore error:', error);
    res.status(500).json({ error: 'Failed to fetch explore feed' });
  }
});

export default router;
