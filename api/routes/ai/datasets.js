// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Datasets Endpoints
 *
 * List and retrieve curated datasets for AI training and analysis.
 *
 * @module api/routes/ai/datasets
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const generateOperationId = () =>
  `ai-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

const errorResponse = (res, statusCode, error, message, extras = {}) =>
  res.status(statusCode).json({
    success: false, error, message,
    retryable: extras.retryable ?? true,
    retryAfterMs: extras.retryAfterMs ?? 5000,
    timestamp: new Date().toISOString(),
    ...extras,
  });

const successResponse = (res, data, meta = {}) =>
  res.json({ success: true, data, meta: { processedAt: new Date().toISOString(), ...meta } });

// Session middleware
router.use((req, res, next) => {
  const sessionCookie = req.body.sessionCookie || req.headers['x-session-cookie'];
  if (!sessionCookie) {
    return res.status(400).json({ error: 'SESSION_REQUIRED', message: 'Session cookie is required' });
  }
  req.sessionCookie = sessionCookie;
  next();
});

// Built-in dataset catalog
const DATASET_CATALOG = [
  {
    name: 'trending-hashtags',
    description: 'Real-time trending hashtags with tweet counts',
    schema: { hashtag: 'string', tweetCount: 'number', rank: 'number' },
    updateFrequency: 'hourly',
    tags: ['trends', 'hashtags'],
  },
  {
    name: 'viral-tweets',
    description: 'High-engagement tweets from the past 24h (>1k likes)',
    schema: { id: 'string', text: 'string', author: 'string', likes: 'number', retweets: 'number' },
    updateFrequency: 'hourly',
    tags: ['viral', 'engagement'],
  },
  {
    name: 'influencer-index',
    description: 'Top accounts by engagement rate across major niches',
    schema: { username: 'string', niche: 'string', followers: 'number', engagementRate: 'string' },
    updateFrequency: 'daily',
    tags: ['influencers', 'analytics'],
  },
  {
    name: 'sentiment-corpus',
    description: 'Labeled tweet corpus for sentiment training (positive/negative/neutral)',
    schema: { text: 'string', label: 'string', score: 'number' },
    updateFrequency: 'weekly',
    tags: ['sentiment', 'ml', 'nlp'],
  },
  {
    name: 'crypto-mentions',
    description: 'Crypto token mentions with sentiment and volume',
    schema: { token: 'string', mentions: 'number', sentiment: 'string', price_correlation: 'number' },
    updateFrequency: 'hourly',
    tags: ['crypto', 'finance'],
  },
];

/**
 * POST /api/ai/datasets/list
 * List available datasets
 */
router.post('/list', async (req, res) => {
  const { tags, search } = req.body;

  let filtered = DATASET_CATALOG;

  if (tags && Array.isArray(tags)) {
    filtered = filtered.filter(d => tags.some(t => d.tags.includes(t)));
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d =>
      d.name.includes(q) || d.description.toLowerCase().includes(q) || d.tags.some(t => t.includes(q))
    );
  }

  return successResponse(res, {
    datasets: filtered,
    count: filtered.length,
    totalDatasets: DATASET_CATALOG.length,
  });
});

/**
 * POST /api/ai/datasets/get
 * Fetch a dataset (live-scraped)
 */
router.post('/get', async (req, res) => {
  const { name, limit = 100, offset = 0 } = req.body;

  if (!name) return res.status(400).json({ error: 'INVALID_INPUT', message: 'name is required' });

  const dataset = DATASET_CATALOG.find(d => d.name === name);
  if (!dataset) {
    return res.status(404).json({
      error: 'DATASET_NOT_FOUND',
      message: `Dataset "${name}" not found`,
      available: DATASET_CATALOG.map(d => d.name),
    });
  }

  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 1000);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'datasetFetch',
      config: {
        dataset: name,
        limit: effectiveLimit,
        offset: parseInt(offset) || 0,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'dataset-fetch',
      dataset: { name: dataset.name, description: dataset.description, schema: dataset.schema },
      config: { limit: effectiveLimit, offset: parseInt(offset) || 0 },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

export default router;
