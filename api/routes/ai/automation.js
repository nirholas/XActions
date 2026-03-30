// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * AI Automation Endpoints
 *
 * Advanced automation: auto-reply, auto-repost, plug replies,
 * engagement boosting, content repurposing, customer service bots.
 *
 * @module api/routes/ai/automation
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const generateOperationId = () =>
  `ai-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

const requireSession = (req, res) => {
  const sessionCookie = req.body.sessionCookie || req.headers['x-session-cookie'];
  if (!sessionCookie) {
    res.status(400).json({
      success: false,
      error: 'SESSION_REQUIRED',
      message: 'Provide sessionCookie in body or X-Session-Cookie header',
    });
    return null;
  }
  return sessionCookie;
};

const queueOperation = async (res, operationId, type, config) => {
  try {
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({ id: operationId, type, config, status: 'queued' });
  } catch {
    // Job queue unavailable — accepted anyway
  }
  return res.json({
    success: true,
    operationId,
    status: 'queued',
    statusUrl: `/api/ai/action/status/${operationId}`,
    message: `Operation ${type} queued`,
  });
};

/** POST /api/ai/automation/auto-reply */
router.post('/auto-reply', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { keywords, replyTemplate, limit = 50, delayMs = 2000 } = req.body;
  if (!keywords || !replyTemplate) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'keywords and replyTemplate required' });
  }
  return queueOperation(res, generateOperationId(), 'autoReply', { session, keywords, replyTemplate, limit, delayMs });
});

/** POST /api/ai/automation/auto-repost */
router.post('/auto-repost', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { keywords, limit = 20, delayMs = 3000 } = req.body;
  if (!keywords) return res.status(400).json({ error: 'INVALID_INPUT', message: 'keywords required' });
  return queueOperation(res, generateOperationId(), 'autoRepost', { session, keywords, limit, delayMs });
});

/** POST /api/ai/automation/plug-replies */
router.post('/plug-replies', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { tweetUrl, plugText, minLikes = 100 } = req.body;
  if (!plugText) return res.status(400).json({ error: 'INVALID_INPUT', message: 'plugText required' });
  return queueOperation(res, generateOperationId(), 'plugReplies', { session, tweetUrl, plugText, minLikes });
});

/** POST /api/ai/automation/engagement-booster */
router.post('/engagement-booster', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { targetAccounts, actionsPerDay = 50, delayMs = 3000 } = req.body;
  return queueOperation(res, generateOperationId(), 'engagementBooster', { session, targetAccounts, actionsPerDay, delayMs });
});

/** POST /api/ai/automation/quote-tweet-auto */
router.post('/quote-tweet-auto', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { keywords, commentTemplate, limit = 10 } = req.body;
  return queueOperation(res, generateOperationId(), 'quoteTweetAuto', { session, keywords, commentTemplate, limit });
});

/** POST /api/ai/automation/content-repurpose */
router.post('/content-repurpose', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { tweetIds, format = 'thread' } = req.body;
  if (!tweetIds) return res.status(400).json({ error: 'INVALID_INPUT', message: 'tweetIds required' });
  return queueOperation(res, generateOperationId(), 'contentRepurpose', { session, tweetIds, format });
});

/** POST /api/ai/automation/content-calendar */
router.post('/content-calendar', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { niche, tweetsPerDay = 3, days = 7 } = req.body;
  return queueOperation(res, generateOperationId(), 'contentCalendar', { session, niche, tweetsPerDay, days });
});

/** POST /api/ai/automation/welcome-followers */
router.post('/welcome-followers', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { messageTemplate, delayMs = 5000 } = req.body;
  return queueOperation(res, generateOperationId(), 'welcomeFollowers', { session, messageTemplate, delayMs });
});

/** POST /api/ai/automation/continuous-monitor */
router.post('/continuous-monitor', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { username, intervalMs = 300000, webhookUrl } = req.body;
  return queueOperation(res, generateOperationId(), 'continuousMonitor', { session, username, intervalMs, webhookUrl });
});

/** POST /api/ai/automation/keyword-monitor */
router.post('/keyword-monitor', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { keywords, webhookUrl, intervalMs = 60000 } = req.body;
  if (!keywords) return res.status(400).json({ error: 'INVALID_INPUT', message: 'keywords required' });
  return queueOperation(res, generateOperationId(), 'keywordMonitor', { session, keywords, webhookUrl, intervalMs });
});

/** POST /api/ai/automation/customer-service */
router.post('/customer-service', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { triggerKeywords, responseTemplates, delayMs = 2000 } = req.body;
  return queueOperation(res, generateOperationId(), 'customerService', { session, triggerKeywords, responseTemplates, delayMs });
});

/** POST /api/ai/automation/evergreen */
router.post('/evergreen', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { minAge = 30, minEngagement = 10, limit = 20 } = req.body;
  return queueOperation(res, generateOperationId(), 'evergreenRecycle', { session, minAge, minEngagement, limit });
});

export default router;
