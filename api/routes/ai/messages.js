// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Messages / DM Endpoints
 *
 * Send direct messages, list conversations, export DM history.
 *
 * @module api/routes/ai/messages
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
      message: 'X/Twitter session cookie is required for DM operations',
    });
  }
  req.sessionCookie = sessionCookie;
  next();
});

/**
 * POST /api/ai/messages/send
 * Send a direct message to a user
 */
router.post('/send', async (req, res) => {
  const { username, message, mediaUrl } = req.body;

  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });
  if (!message) return res.status(400).json({ error: 'INVALID_INPUT', message: 'message is required' });
  if (message.length > 10000) return res.status(400).json({ error: 'INVALID_INPUT', message: 'message exceeds 10,000 characters' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'sendDM',
      config: {
        username: cleanUsername,
        message,
        mediaUrl: mediaUrl || null,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'send-dm',
      recipient: cleanUsername,
      messageLength: message.length,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    }, { warning: 'Respect user preferences — only DM users who expect contact' });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/messages/conversations
 * List DM conversations
 */
router.post('/conversations', async (req, res) => {
  const { limit = 20 } = req.body;
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'getDMConversations',
      config: { limit: effectiveLimit, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'get-conversations',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/messages/export
 * Export all DM history
 */
router.post('/export', async (req, res) => {
  const { format = 'json', limit = 1000 } = req.body;
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 1000, 1), 5000);
  const validFormats = ['json', 'csv', 'txt'];
  const effectiveFormat = validFormats.includes(format) ? format : 'json';

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'exportDMs',
      config: {
        format: effectiveFormat,
        limit: effectiveLimit,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    const estimatedMinutes = Math.ceil(effectiveLimit / 200);
    return successResponse(res, {
      operationId, status: 'queued', type: 'export-dms',
      config: { format: effectiveFormat, limit: effectiveLimit },
      estimatedDuration: `~${estimatedMinutes} minutes`,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 10000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

export default router;
