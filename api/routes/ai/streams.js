// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Streams Endpoints
 *
 * Start, stop, pause, resume, and query real-time tweet streams.
 *
 * @module api/routes/ai/streams
 */

import express from 'express';
import crypto from 'crypto';
import { monitors, sessionOwnerKey } from '../../services/processors/messaging.processors.js';

const router = express.Router();

const generateOperationId = () =>
  `ai-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;

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
  req.ownerKey = sessionOwnerKey(sessionCookie);
  next();
});

/**
 * The stream a streamId names, if it belongs to this session. A start that is
 * still queued has not created it yet, so the queued job is reported instead.
 */
async function findStream(req, res, streamId) {
  const stream = await monitors.get(req.ownerKey, String(streamId));
  if (stream && stream.type === 'streamStart') return stream;
  const { getQueuedJob } = await import('../../services/jobQueue.js');
  const job = await getQueuedJob(String(streamId));
  if (job && job.type === 'streamStart' && ['queued', 'processing'].includes(job.status)) {
    successResponse(res, { streamId, status: job.status === 'queued' ? 'starting' : 'taking first reading', itemsCollected: 0, latestItems: [] });
    return null;
  }
  if (job && job.type === 'streamStart' && job.status === 'failed') {
    res.status(422).json({ success: false, error: 'STREAM_FAILED', message: job.error || 'The stream failed to start' });
    return null;
  }
  res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'No stream with that id belongs to this session' });
  return null;
}

/**
 * POST /api/ai/streams/start
 * Start a keyword/user stream
 */
router.post('/start', async (req, res) => {
  const {
    type = 'keyword',
    username, keyword, hashtag,
    interval = 60, maxItems = 1000,
  } = req.body;

  const validTypes = ['keyword', 'user', 'hashtag', 'mentions'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: `type must be one of: ${validTypes.join(', ')}` });
  }

  if (type === 'keyword' && !keyword) return res.status(400).json({ error: 'INVALID_INPUT', message: 'keyword is required for keyword streams' });
  if (type === 'user' && !username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required for user streams' });
  if (type === 'hashtag' && !hashtag) return res.status(400).json({ error: 'INVALID_INPUT', message: 'hashtag is required for hashtag streams' });

  const effectiveInterval = Math.max(parseInt(interval) || 60, 30); // min 30s
  const effectiveMax = Math.min(parseInt(maxItems) || 1000, 10000);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'streamStart',
      config: {
        streamType: type,
        username: username ? username.replace(/^@/, '').toLowerCase() : null,
        keyword: keyword || null,
        hashtag: hashtag ? hashtag.replace(/^#/, '') : null,
        intervalSeconds: effectiveInterval,
        maxItems: effectiveMax,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    const manage = (endpoint) => ({ method: 'POST', endpoint: `/api/ai/streams/${endpoint}`, body: { streamId: operationId } });
    return successResponse(res, {
      streamId: operationId,
      status: 'starting',
      type,
      config: { intervalSeconds: effectiveInterval, maxItems: effectiveMax },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
      manage: { status: manage('status'), history: manage('history'), pause: manage('pause'), resume: manage('resume'), stop: manage('stop') },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/streams/stop
 * Stop a running stream
 */
router.post('/stop', async (req, res) => {
  const { streamId } = req.body;
  if (!streamId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'streamId is required' });

  try {
    const stopped = await monitors.stop(req.ownerKey, String(streamId));
    if (stopped && stopped.type === 'streamStart') {
      return successResponse(res, { streamId, status: stopped.status, stoppedAt: stopped.updatedAt, itemsCollected: stopped.stats?.events ?? 0 });
    }
    const { cancelQueuedJob, getQueuedJob } = await import('../../services/jobQueue.js');
    const job = await getQueuedJob(String(streamId));
    if (job && job.type === 'streamStart' && job.status === 'queued') {
      await cancelQueuedJob(String(streamId));
      return successResponse(res, { streamId, status: 'cancelled', stoppedAt: new Date().toISOString() });
    }
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'No running stream with that id belongs to this session' });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/streams/list
 * List this session's streams
 */
router.post('/list', async (req, res) => {
  const { limit = 20 } = req.body;

  try {
    const streams = (await monitors.list(req.ownerKey, { type: 'streamStart' })).slice(0, Math.min(parseInt(limit) || 20, 100));

    return successResponse(res, {
      streams: streams.map(s => ({
        streamId: s.monitorId,
        type: s.params?.streamType,
        label: s.label,
        status: s.status,
        itemsCollected: s.stats?.events ?? 0,
        createdAt: s.createdAt,
        completedAt: ['stopped', 'completed', 'failed'].includes(s.status) ? s.updatedAt : null,
      })),
      count: streams.length,
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/streams/pause
 * Pause a stream
 */
router.post('/pause', async (req, res) => {
  const { streamId } = req.body;
  if (!streamId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'streamId is required' });

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'streamPause',
      config: { streamId, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      streamId, operationId, status: 'pausing',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/streams/resume
 * Resume a paused stream
 */
router.post('/resume', async (req, res) => {
  const { streamId } = req.body;
  if (!streamId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'streamId is required' });

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'streamResume',
      config: { streamId, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      streamId, operationId, status: 'resuming',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/streams/status
 * Get stream status and recent results
 */
router.post('/status', async (req, res) => {
  const { streamId } = req.body;
  if (!streamId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'streamId is required' });

  try {
    const stream = await findStream(req, res, streamId);
    if (!stream) return;
    const latestItems = await monitors.events(req.ownerKey, String(streamId), { limit: 10 });

    return successResponse(res, {
      streamId,
      status: stream.status,
      statusReason: stream.statusReason,
      label: stream.label,
      progress: stream.latest,
      itemsCollected: stream.stats?.events ?? 0,
      maxItems: stream.maxItems,
      latestItems,
      timing: {
        startedAt: stream.createdAt,
        updatedAt: stream.updatedAt,
        lastPollAt: stream.stats?.lastPollAt ?? null,
        nextPollAt: stream.nextPollAt,
        intervalSeconds: Math.round(stream.intervalMs / 1000),
      },
      lastError: stream.stats?.lastError ?? null,
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/streams/history
 * Get historical items collected by a stream, newest first
 */
router.post('/history', async (req, res) => {
  const { streamId, limit = 100, eventType } = req.body;
  if (!streamId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'streamId is required' });

  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 1000);

  try {
    const stream = await findStream(req, res, streamId);
    if (!stream) return;
    const items = await monitors.events(req.ownerKey, String(streamId), { limit: effectiveLimit, type: eventType });

    return successResponse(res, {
      streamId,
      status: stream.status,
      items,
      count: items.length,
      filters: { eventType: eventType || null, limit: effectiveLimit },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

export default router;
