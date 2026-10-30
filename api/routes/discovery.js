// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import express from 'express';
import { prisma } from '../../src/utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';

const router = express.Router();

router.use(authMiddleware);

// Search tweets
router.get('/search', async (req, res) => {
  try {
    const { limit = 50, filter } = req.query;
    // `q` is the name the docs and x.com's own search URL use.
    const query = req.query.query || req.query.q;
    if (!query) return res.status(400).json({ error: 'Search query is required (?q= or ?query=)' });

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
      config: { query, limit: parseInt(limit), filter },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Search queued' });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// Get trends
router.get('/trends', async (req, res) => {
  try {
    const { category, woeid, limit = 30 } = req.query;
    const config = { category, woeid, limit: parseInt(limit) };

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'getTrends',
        status: 'pending',
        config: JSON.stringify(config),
      },
    });

    await queueJob({
      type: 'getTrends',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config,
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Trends fetch queued' });
  } catch (error) {
    console.error('❌ Trends error:', error);
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
      config: { category, limit: parseInt(limit) },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Explore feed fetch queued' });
  } catch (error) {
    console.error('❌ Explore error:', error);
    res.status(500).json({ error: 'Failed to fetch explore feed' });
  }
});

export default router;
