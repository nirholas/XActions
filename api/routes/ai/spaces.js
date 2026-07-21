// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Spaces Endpoints
 *
 * Discover, scrape, join, and manage X Spaces.
 *
 * @module api/routes/ai/spaces
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

/**
 * POST /api/ai/spaces/list
 * Discover live and scheduled Spaces
 */
router.post('/list', async (req, res) => {
  const { query, limit = 20, type = 'live' } = req.body;
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

  try {
    const startTime = Date.now();
    const { searchTweets } = await import('../../services/browserAutomation.js');
    const searchQuery = query ? `${query} filter:spaces` : 'filter:spaces';
    const results = await searchTweets(req.sessionCookie, searchQuery, {
      limit: effectiveLimit,
      filter: 'top',
    });

    return successResponse(res, {
      spaces: (results.items || []).map(t => ({
        title: t.text?.match(/🎙|Spaces/i) ? t.text : `Space by @${t.author?.username}`,
        hostUsername: t.author?.username || t.username,
        url: t.url,
        tweet: { id: t.id, text: t.text, createdAt: t.timestamp },
      })),
      count: (results.items || []).length,
      type,
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/spaces/scrape
 * Scrape metadata from a Space URL
 */
router.post('/scrape', async (req, res) => {
  const { spaceUrl, spaceId } = req.body;

  if (!spaceUrl && !spaceId) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'spaceUrl or spaceId is required',
    });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'scrapeSpace',
      config: {
        spaceUrl: spaceUrl || null,
        spaceId: spaceId || null,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'scrape-space',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/spaces/join
 * Join a Space as a listener (with optional AI co-host)
 */
router.post('/join', async (req, res) => {
  const { spaceUrl, spaceId, provider = 'openai', systemPrompt, model } = req.body;

  if (!spaceUrl && !spaceId) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'spaceUrl or spaceId is required' });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'spaceJoin',
      config: {
        spaceUrl: spaceUrl || null,
        spaceId: spaceId || null,
        provider,
        systemPrompt: systemPrompt || null,
        model: model || null,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'space-join',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/spaces/leave
 * Leave an active Space session
 */
router.post('/leave', async (req, res) => {
  const { operationId: spaceOperationId } = req.body;

  try {
    const { cancelJob } = await import('../../services/jobQueue.js');
    if (spaceOperationId) {
      await cancelJob(spaceOperationId);
    }

    return successResponse(res, { status: 'left', spaceOperationId: spaceOperationId || null });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/spaces/status
 * Get status of a Space session
 */
router.post('/status', async (req, res) => {
  const { operationId: spaceOperationId } = req.body;

  if (!spaceOperationId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'operationId is required' });

  try {
    const { getJobStatus } = await import('../../services/jobQueue.js');
    const status = await getJobStatus(spaceOperationId);

    if (!status) return res.status(404).json({ error: 'NOT_FOUND', message: 'Space session not found' });

    return successResponse(res, {
      operationId: spaceOperationId,
      status: status.status,
      result: status.result || null,
      timing: { startedAt: status.startedAt, completedAt: status.completedAt },
    });
  } catch (error) {
    return errorResponse(res, 500, 'STATUS_FAILED', error.message);
  }
});

/**
 * POST /api/ai/spaces/transcript
 * Get transcript from a completed Space session
 */
router.post('/transcript', async (req, res) => {
  const { operationId: spaceOperationId, format = 'text' } = req.body;

  if (!spaceOperationId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'operationId is required' });

  try {
    const { getJobStatus } = await import('../../services/jobQueue.js');
    const status = await getJobStatus(spaceOperationId);

    if (!status) return res.status(404).json({ error: 'NOT_FOUND', message: 'Space session not found' });

    const transcript = status.result?.transcript || null;

    return successResponse(res, {
      operationId: spaceOperationId,
      transcript: format === 'json' ? transcript : transcript?.map(e => `[${e.speaker}]: ${e.text}`).join('\n') || null,
      format,
      available: !!transcript,
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

export default router;
