import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Get profile info
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getProfile',
        status: 'pending',
        config: JSON.stringify({ username }),
      },
    });

    await queueJob({
      type: 'getProfile',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { username, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Profile fetch queued' });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/update', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { name, bio, location, website } = req.body;
    if (!name && !bio && !location && !website) {
      return res.status(400).json({ error: 'At least one field required' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'updateProfile',
        status: 'pending',
        config: JSON.stringify({ name, bio, location, website }),
      },
    });

    await queueJob({
      type: 'updateProfile',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { name, bio, location, website, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Profile update queued' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
