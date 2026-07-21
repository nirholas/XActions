// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI CRM Endpoints
 *
 * Sync followers to CRM, tag/segment contacts, search CRM data.
 *
 * @module api/routes/ai/crm
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
 * POST /api/ai/crm/sync
 * Sync followers/following to CRM database
 */
router.post('/sync', async (req, res) => {
  const { username, type = 'followers', limit = 1000 } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const validTypes = ['followers', 'following', 'both'];
  const effectiveType = validTypes.includes(type) ? type : 'followers';
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 1000, 100), 10000);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'crmSync',
      config: {
        username: username.replace(/^@/, '').toLowerCase(),
        syncType: effectiveType,
        limit: effectiveLimit,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    const estimatedMinutes = Math.ceil(effectiveLimit / 200);
    return successResponse(res, {
      operationId, status: 'queued', type: 'crm-sync',
      config: { syncType: effectiveType, limit: effectiveLimit },
      estimatedDuration: `~${estimatedMinutes} minutes`,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 10000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/crm/tag
 * Tag a contact in the CRM
 */
router.post('/tag', async (req, res) => {
  const { username, tags, remove = false } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });
  if (!Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'tags array is required' });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'crmTag',
      config: {
        username: username.replace(/^@/, '').toLowerCase(),
        tags, remove: !!remove,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'crm-tag',
      config: { username, tags, remove: !!remove },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/crm/search
 * Search CRM contacts
 */
router.post('/search', async (req, res) => {
  const { query, tags, minFollowers, maxFollowers, limit = 50 } = req.body;

  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'crmSearch',
      config: {
        query: query || null,
        tags: Array.isArray(tags) ? tags : null,
        minFollowers: minFollowers || null,
        maxFollowers: maxFollowers || null,
        limit: effectiveLimit,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'crm-search',
      filters: { query, tags, minFollowers, maxFollowers, limit: effectiveLimit },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/crm/segment
 * Get or create a CRM segment
 */
router.post('/segment', async (req, res) => {
  const { name, criteria, action = 'get' } = req.body;

  const validActions = ['get', 'create', 'list'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: `action must be one of: ${validActions.join(', ')}` });
  }

  if (action !== 'list' && !name) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'name is required' });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'crmSegment',
      config: { action, name: name || null, criteria: criteria || null, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'crm-segment',
      config: { action, name },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

export default router;
