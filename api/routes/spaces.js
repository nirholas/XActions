import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Get live Spaces
router.get('/live', async (req, res) => {
  try {
    const { topic, limit = 20 } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getLiveSpaces',
        status: 'pending',
        config: JSON.stringify({ topic, limit: parseInt(limit) }),
      },
    });

    await queueJob({
      type: 'getLiveSpaces',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { topic, limit: parseInt(limit), sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Spaces fetch queued' });
  } catch (error) {
    console.error('Spaces error:', error);
    res.status(500).json({ error: 'Failed to get Spaces' });
  }
});

// Get scheduled Spaces
router.get('/scheduled', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getScheduledSpaces',
        status: 'pending',
        config: JSON.stringify({ limit: parseInt(limit) }),
      },
    });

    await queueJob({
      type: 'getScheduledSpaces',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { limit: parseInt(limit), sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Scheduled Spaces fetch queued' });
  } catch (error) {
    console.error('Scheduled Spaces error:', error);
    res.status(500).json({ error: 'Failed to get scheduled Spaces' });
  }
});

// Scrape a specific Space
router.get('/scrape', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Space URL is required' });

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'scrapeSpace',
        status: 'pending',
        config: JSON.stringify({ url }),
      },
    });

    await queueJob({
      type: 'scrapeSpace',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { url, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Space scrape queued' });
  } catch (error) {
    console.error('Space scrape error:', error);
    res.status(500).json({ error: 'Failed to scrape Space' });
  }
});

export default router;
