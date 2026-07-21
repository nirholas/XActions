// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Push Notification Endpoints
 *
 * Send and test webhook/push notifications.
 *
 * @module api/routes/ai/notifications
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

// No session required for notification endpoints — webhook URL is the auth
router.use((req, res, next) => next());

/**
 * POST /api/ai/notify/send
 * Send a push notification / webhook
 */
router.post('/send', async (req, res) => {
  const { webhookUrl, event, data, channel = 'webhook' } = req.body;

  if (!webhookUrl && channel === 'webhook') {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'webhookUrl is required for webhook notifications',
      schema: {
        webhookUrl: { type: 'string', description: 'HTTPS webhook endpoint' },
        event: { type: 'string', description: 'Event name (e.g., new_follower, mention)' },
        data: { type: 'object', description: 'Payload to send' },
        channel: { type: 'string', enum: ['webhook', 'email', 'slack'], default: 'webhook' },
      },
    });
  }

  const operationId = generateOperationId();

  try {
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'sendNotification',
      config: {
        webhookUrl: webhookUrl || null,
        event: event || 'xactions.notification',
        data: data || {},
        channel,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'send-notification',
      config: { channel, event },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/notify/test
 * Send a test notification to verify webhook
 */
router.post('/test', async (req, res) => {
  const { webhookUrl } = req.body;

  if (!webhookUrl) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'webhookUrl is required' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-XActions-Event': 'test', 'User-Agent': 'XActions/1.0' },
      body: JSON.stringify({
        event: 'xactions.test',
        message: 'XActions webhook test — if you see this, the connection works! ✅',
        timestamp: new Date().toISOString(),
        source: 'xactions-ai-api',
      }),
      signal: AbortSignal.timeout(10000),
    });

    return successResponse(res, {
      webhookUrl,
      status: response.ok ? 'success' : 'failed',
      responseStatus: response.status,
      responseStatusText: response.statusText,
    });
  } catch (error) {
    return errorResponse(res, 400, 'WEBHOOK_UNREACHABLE',
      `Could not reach webhook: ${error.message}`, { retryable: false });
  }
});

export default router;
