import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Get settings snapshot
router.get('/', async (req, res) => {
  try {
    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getSettings',
        status: 'pending',
        config: JSON.stringify({}),
      },
    });

    await queueJob({
      type: 'getSettings',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Settings fetch queued' });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Toggle protected account
router.put('/protected', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled (boolean) is required' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'toggleProtected',
        status: 'pending',
        config: JSON.stringify({ enabled }),
      },
    });

    await queueJob({
      type: 'toggleProtected',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { enabled, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Protected toggle queued' });
  } catch (error) {
    console.error('Protected toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle protected' });
  }
});

// Get blocked accounts
router.get('/blocked', async (req, res) => {
  try {
    const { limit = 200 } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getBlocked',
        status: 'pending',
        config: JSON.stringify({ limit: parseInt(limit) }),
      },
    });

    await queueJob({
      type: 'getBlocked',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { limit: parseInt(limit), sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Blocked list fetch queued' });
  } catch (error) {
    console.error('Blocked error:', error);
    res.status(500).json({ error: 'Failed to get blocked accounts' });
  }
});

// Get muted accounts
router.get('/muted', async (req, res) => {
  try {
    const { limit = 200 } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getMuted',
        status: 'pending',
        config: JSON.stringify({ limit: parseInt(limit) }),
      },
    });

    await queueJob({
      type: 'getMuted',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { limit: parseInt(limit), sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Muted list fetch queued' });
  } catch (error) {
    console.error('Muted error:', error);
    res.status(500).json({ error: 'Failed to get muted accounts' });
  }
});

// Request data download
router.post('/download-data', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'requestDataDownload',
        status: 'pending',
        config: JSON.stringify({}),
      },
    });

    await queueJob({
      type: 'requestDataDownload',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Data download request queued' });
  } catch (error) {
    console.error('Data download error:', error);
    res.status(500).json({ error: 'Failed to request data download' });
  }
});

export default router;
