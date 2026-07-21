// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Sentiment & Reputation Endpoints
 *
 * Sentiment analysis, reputation monitoring, reputation reports.
 *
 * @module api/routes/ai/sentiment
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

// Simple rule-based sentiment scorer
function scoreSentiment(text) {
  const t = text.toLowerCase();
  const positive = ['great', 'love', 'amazing', 'excellent', 'best', 'awesome', 'good', 'thanks', 'happy', 'win', '🔥', '❤️', '✅', '💯', '🎉', '🙌'];
  const negative = ['hate', 'worst', 'terrible', 'awful', 'bad', 'broken', 'scam', 'fail', 'wrong', 'stupid', 'dumb', '💀', '🤬', '😡', '❌'];
  let score = 0;
  for (const w of positive) if (t.includes(w)) score += 0.1;
  for (const w of negative) if (t.includes(w)) score -= 0.1;
  return Math.max(-1, Math.min(1, score));
}

function labelScore(score) {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

/**
 * POST /api/ai/sentiment/analyze
 * Analyze sentiment of text(s) or tweets from a search
 */
router.post('/analyze', async (req, res) => {
  const { text, texts, query, limit = 50, mode = 'rule' } = req.body;

  // Mode 1: analyze provided text(s)
  if (text || texts) {
    const items = texts || [text];
    const startTime = Date.now();
    const analyzed = items.map(t => {
      const score = scoreSentiment(t);
      return { text: t, score: parseFloat(score.toFixed(3)), label: labelScore(score) };
    });

    const avgScore = analyzed.reduce((s, a) => s + a.score, 0) / analyzed.length;

    return successResponse(res, {
      mode: 'text',
      analyzed,
      summary: {
        avgScore: parseFloat(avgScore.toFixed(3)),
        label: labelScore(avgScore),
        positive: analyzed.filter(a => a.label === 'positive').length,
        neutral: analyzed.filter(a => a.label === 'neutral').length,
        negative: analyzed.filter(a => a.label === 'negative').length,
      },
    }, { durationMs: Date.now() - startTime });
  }

  // Mode 2: search Twitter and analyze results
  if (query) {
    const effectiveLimit = Math.min(Math.max(parseInt(limit) || 50, 10), 200);
    try {
      const startTime = Date.now();
      const { searchTweets } = await import('../../services/browserAutomation.js');
      const results = await searchTweets(req.sessionCookie, query, { limit: effectiveLimit, filter: 'latest' });

      const analyzed = (results.items || []).map(t => ({
        text: t.text,
        author: t.author?.username || t.username,
        score: parseFloat(scoreSentiment(t.text).toFixed(3)),
        label: labelScore(scoreSentiment(t.text)),
        likes: parseInt(t.likes) || 0,
      }));

      const avgScore = analyzed.length > 0
        ? analyzed.reduce((s, a) => s + a.score, 0) / analyzed.length
        : 0;

      return successResponse(res, {
        mode: 'query', query,
        summary: {
          avgScore: parseFloat(avgScore.toFixed(3)),
          label: labelScore(avgScore),
          positive: analyzed.filter(a => a.label === 'positive').length,
          neutral: analyzed.filter(a => a.label === 'neutral').length,
          negative: analyzed.filter(a => a.label === 'negative').length,
          total: analyzed.length,
        },
        tweets: analyzed,
      }, { durationMs: Date.now() - startTime });
    } catch (error) {
      return errorResponse(res, 500, 'ANALYSIS_FAILED', error.message);
    }
  }

  return res.status(400).json({
    error: 'INVALID_INPUT',
    message: 'Provide text, texts array, or query to analyze',
    schema: {
      text: { type: 'string', description: 'Single text to analyze' },
      texts: { type: 'array', items: 'string', description: 'Multiple texts to analyze' },
      query: { type: 'string', description: 'Search query — will fetch and analyze tweets' },
      limit: { type: 'number', default: 50, description: 'Max tweets to fetch (query mode)' },
    },
  });
});

/**
 * POST /api/ai/sentiment/monitor
 * Start/stop/list reputation monitoring
 */
router.post('/monitor', async (req, res) => {
  const { action = 'start', username, monitorId, interval = '1h' } = req.body;

  const validActions = ['start', 'stop', 'list', 'status'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: `action must be one of: ${validActions.join(', ')}` });
  }

  try {
    const { queueJob, cancelJob, getRecentJobs, getJobStatus } = await import('../../services/jobQueue.js');

    if (action === 'list') {
      const jobs = await getRecentJobs({ type: 'reputationMonitor', limit: 20 });
      return successResponse(res, {
        monitors: jobs.map(j => ({ monitorId: j.id, username: j.config?.username, status: j.status, createdAt: j.createdAt })),
      });
    }

    if (action === 'status' && monitorId) {
      const status = await getJobStatus(monitorId);
      return successResponse(res, { monitorId, status: status?.status || 'not_found', result: status?.result });
    }

    if (action === 'stop' && monitorId) {
      await cancelJob(monitorId);
      return successResponse(res, { monitorId, status: 'cancelled' });
    }

    // action === 'start'
    if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required to start monitoring' });

    const operationId = generateOperationId();
    await queueJob({
      id: operationId,
      type: 'reputationMonitor',
      config: {
        username: username.replace(/^@/, '').toLowerCase(),
        interval,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      monitorId: operationId,
      status: 'started',
      username: username.replace(/^@/, '').toLowerCase(),
      interval,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 60000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/sentiment/report
 * Generate a full reputation report for a username
 */
router.post('/report', async (req, res) => {
  const { username, limit = 100 } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 20), 300);

  try {
    const startTime = Date.now();
    const { scrapeProfile, searchTweets } = await import('../../services/browserAutomation.js');
    const [profile, mentions] = await Promise.all([
      scrapeProfile(req.sessionCookie, cleanUsername),
      searchTweets(req.sessionCookie, `@${cleanUsername}`, { limit: effectiveLimit, filter: 'latest' }),
    ]);

    const items = mentions.items || [];
    const scored = items.map(t => ({
      text: t.text,
      author: t.author?.username || t.username,
      score: scoreSentiment(t.text),
      likes: parseInt(t.likes) || 0,
      url: t.url,
    }));

    const avgScore = scored.length > 0
      ? scored.reduce((s, t) => s + t.score, 0) / scored.length
      : 0;

    const positive = scored.filter(t => t.score > 0.1);
    const negative = scored.filter(t => t.score < -0.1);

    return successResponse(res, {
      username: cleanUsername,
      profile: {
        followers: parseInt(profile.followers) || 0,
        verified: profile.verified || false,
        bio: profile.bio,
      },
      reputation: {
        overallScore: parseFloat(avgScore.toFixed(3)),
        label: labelScore(avgScore),
        mentionsAnalyzed: scored.length,
        positive: positive.length,
        negative: negative.length,
        neutral: scored.length - positive.length - negative.length,
      },
      highlights: {
        mostPositive: positive.sort((a, b) => b.likes - a.likes).slice(0, 3),
        mostNegative: negative.sort((a, b) => b.likes - a.likes).slice(0, 3),
      },
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    return errorResponse(res, 500, 'ANALYSIS_FAILED', error.message);
  }
});

export default router;
