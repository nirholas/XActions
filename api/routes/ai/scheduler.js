// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Scheduler / RSS Endpoints
 *
 * Schedule posts, manage RSS feeds, find evergreen content.
 *
 * @module api/routes/ai/scheduler
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
 * POST /api/ai/schedule/add
 * Add a scheduled post (cron or datetime)
 */
router.post('/add', async (req, res) => {
  const { text, scheduledAt, cron, timezone = 'UTC', repeat = false } = req.body;

  if (!text) return res.status(400).json({ error: 'INVALID_INPUT', message: 'text is required' });
  if (!scheduledAt && !cron) return res.status(400).json({ error: 'INVALID_INPUT', message: 'scheduledAt or cron is required' });

  if (scheduledAt) {
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime()) || date <= new Date()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'scheduledAt must be a valid future datetime' });
    }
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'scheduleAdd',
      config: {
        text,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        cron: cron || null,
        timezone, repeat: !!repeat,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'schedule-add',
      config: { scheduledAt, cron, repeat: !!repeat },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/schedule/list
 * List scheduled posts
 */
router.post('/list', async (req, res) => {
  const { status = 'pending', limit = 50 } = req.body;

  try {
    const { getRecentJobs } = await import('../../services/jobQueue.js');
    const jobs = await getRecentJobs({ type: 'scheduleAdd', limit: Math.min(parseInt(limit) || 50, 200) });

    const filtered = status === 'all' ? jobs : jobs.filter(j => j.status === status);

    return successResponse(res, {
      scheduled: filtered.map(j => ({
        scheduleId: j.id,
        text: j.config?.text?.slice(0, 100),
        scheduledAt: j.config?.scheduledAt,
        cron: j.config?.cron,
        status: j.status,
        createdAt: j.createdAt,
      })),
      count: filtered.length,
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/schedule/remove
 * Remove a scheduled post
 */
router.post('/remove', async (req, res) => {
  const { scheduleId } = req.body;
  if (!scheduleId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'scheduleId is required' });

  try {
    const { cancelJob } = await import('../../services/jobQueue.js');
    await cancelJob(scheduleId);

    return successResponse(res, { scheduleId, status: 'removed', removedAt: new Date().toISOString() });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/schedule/rss-add
 * Add an RSS feed for auto-posting
 */
router.post('/rss-add', async (req, res) => {
  const { url, postTemplate, interval = '1h', maxPerDay = 5 } = req.body;

  if (!url) return res.status(400).json({ error: 'INVALID_INPUT', message: 'url is required' });

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'rssAdd',
      config: {
        url, postTemplate: postTemplate || '{{title}} {{url}}',
        interval, maxPerDay: Math.min(parseInt(maxPerDay) || 5, 20),
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'rss-add',
      config: { url, interval, maxPerDay },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/schedule/rss-check
 * Manually check RSS feed for new items
 */
router.post('/rss-check', async (req, res) => {
  const { feedId, url } = req.body;

  if (!feedId && !url) return res.status(400).json({ error: 'INVALID_INPUT', message: 'feedId or url is required' });

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'rssCheck',
      config: { feedId: feedId || null, url: url || null, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'rss-check',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/schedule/rss-drafts
 * Get draft posts from RSS feed items
 */
router.post('/rss-drafts', async (req, res) => {
  const { feedId, limit = 10 } = req.body;
  if (!feedId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'feedId is required' });

  try {
    const { getJobStatus } = await import('../../services/jobQueue.js');
    const feedStatus = await getJobStatus(feedId);

    return successResponse(res, {
      feedId,
      drafts: (feedStatus?.result?.drafts || []).slice(0, Math.min(parseInt(limit) || 10, 50)),
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/schedule/evergreen
 * Find evergreen (timeless) tweets to re-share
 */
router.post('/evergreen', async (req, res) => {
  const { username, minLikes = 50, minAgeDays = 30, limit = 10 } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 30);

  try {
    const startTime = Date.now();
    const { scrapeTweets } = await import('../../services/browserAutomation.js');
    const tweets = await scrapeTweets(req.sessionCookie, cleanUsername, { limit: 200 });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (parseInt(minAgeDays) || 30));

    const evergreen = (tweets.items || [])
      .filter(t => {
        const ts = t.timestamp || t.createdAt;
        if (!ts) return false;
        const tweetDate = new Date(ts);
        return tweetDate < cutoffDate && (parseInt(t.likes) || 0) >= (parseInt(minLikes) || 50);
      })
      .sort((a, b) => (parseInt(b.likes) || 0) - (parseInt(a.likes) || 0))
      .slice(0, effectiveLimit)
      .map(t => ({
        id: t.id,
        text: t.text,
        createdAt: t.timestamp || t.createdAt,
        url: t.url,
        likes: parseInt(t.likes) || 0,
        retweets: parseInt(t.retweets) || 0,
      }));

    return successResponse(res, {
      username: cleanUsername, minLikes, minAgeDays,
      evergreenTweets: evergreen,
      count: evergreen.length,
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    return errorResponse(res, 500, 'ANALYSIS_FAILED', error.message);
  }
});

export default router;
