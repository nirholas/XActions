// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Grok Endpoints
 *
 * Query Grok AI, summarize topics, analyze images via Grok.
 *
 * @module api/routes/ai/grok
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
    return res.status(400).json({
      error: 'SESSION_REQUIRED',
      code: 'E_SESSION_MISSING',
      message: 'X/Twitter session cookie is required for Grok operations',
      hint: 'Grok requires an X Premium subscription on the authenticated account',
    });
  }
  req.sessionCookie = sessionCookie;
  next();
});

/**
 * POST /api/ai/grok/query
 * Query Grok with a question or prompt
 */
router.post('/query', async (req, res) => {
  const { query, mode = 'fun' } = req.body;

  if (!query) return res.status(400).json({ error: 'INVALID_INPUT', message: 'query is required' });
  if (query.length > 4000) return res.status(400).json({ error: 'INVALID_INPUT', message: 'query exceeds 4,000 characters' });

  const validModes = ['fun', 'regular'];
  const effectiveMode = validModes.includes(mode) ? mode : 'fun';

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'grokQuery',
      config: { query, mode: effectiveMode, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'grok-query',
      config: { queryLength: query.length, mode: effectiveMode },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    }, { note: 'Requires X Premium on the authenticated account' });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/grok/summarize
 * Summarize a topic using Grok
 */
router.post('/summarize', async (req, res) => {
  const { topic, context } = req.body;

  if (!topic) return res.status(400).json({ error: 'INVALID_INPUT', message: 'topic is required' });

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'grokSummarize',
      config: { topic, context: context || null, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'grok-summarize',
      config: { topic },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/grok/analyze-image
 * Analyze an image using Grok's vision
 */
router.post('/analyze-image', async (req, res) => {
  const { imageUrl, tweetUrl, question = 'What is in this image?' } = req.body;

  if (!imageUrl && !tweetUrl) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'imageUrl or tweetUrl is required',
      schema: {
        imageUrl: { type: 'string', description: 'Direct URL to an image' },
        tweetUrl: { type: 'string', description: 'URL of a tweet containing an image' },
        question: { type: 'string', description: 'Question to ask about the image', default: 'What is in this image?' },
      },
    });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'grokAnalyzeImage',
      config: {
        imageUrl: imageUrl || null,
        tweetUrl: tweetUrl || null,
        question,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'grok-analyze-image',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

export default router;
