// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import express from 'express';
import { prisma } from '../../src/utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';
import { clientForUser, listDmGroups, XSessionError } from '../services/xSession.js';

const router = express.Router();

router.use(authMiddleware);

// Send a DM
router.post('/send', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { username, message } = req.body;
    if (!username || !message) {
      return res.status(400).json({ error: 'Username and message are required' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'sendDM',
        status: 'pending',
        config: JSON.stringify({ username, message }),
      },
    });

    await queueJob({
      type: 'sendDM',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { username, message },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'DM queued' });
  } catch (error) {
    console.error('❌ Send DM error:', error);
    res.status(500).json({ error: 'Failed to send DM' });
  }
});

// Get conversations
router.get('/conversations', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getConversations',
        status: 'pending',
        config: JSON.stringify({ limit: parseInt(limit) }),
      },
    });

    await queueJob({
      type: 'getConversations',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { limit: parseInt(limit) },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Conversations fetch queued' });
  } catch (error) {
    console.error('❌ Conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// List the group DMs the connected X session belongs to
router.get('/groups', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  try {
    const scraper = await clientForUser(req.user.id);
    const groups = await listDmGroups(scraper, limit);
    res.json({ groups, count: groups.length });
  } catch (error) {
    if (error instanceof XSessionError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    console.error('❌ DM groups error:', error);
    res.status(502).json({ error: 'Could not read DM groups from X', code: 'X_REQUEST_FAILED' });
  }
});

// Export DMs
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', limit = 100 } = req.query;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'exportDMs',
        status: 'pending',
        config: JSON.stringify({ format, limit: parseInt(limit) }),
      },
    });

    await queueJob({
      type: 'exportDMs',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { format, limit: parseInt(limit) },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'DM export queued' });
  } catch (error) {
    console.error('❌ Export DMs error:', error);
    res.status(500).json({ error: 'Failed to export DMs' });
  }
});

export default router;
