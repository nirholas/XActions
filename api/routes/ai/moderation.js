// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * AI Moderation Endpoints
 *
 * Block bots, mass block/unblock/mute, remove followers,
 * shadowban check, manage muted words, verified-only replies.
 *
 * @module api/routes/ai/moderation
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const generateOperationId = () =>
  `ai-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

const requireSession = (req, res) => {
  const sessionCookie = req.body.sessionCookie || req.headers['x-session-cookie'];
  if (!sessionCookie) { res.status(400).json({ success: false, error: 'SESSION_REQUIRED', message: 'Provide sessionCookie in body or X-Session-Cookie header' }); return null; }
  return sessionCookie;
};

const queueOperation = async (res, operationId, type, config) => {
  try { const { queueJob } = await import('../../services/jobQueue.js'); await queueJob({ id: operationId, type, config, status: 'queued' }); } catch { /* queue unavailable */ }
  return res.json({ success: true, operationId, status: 'queued', statusUrl: `/api/ai/action/status/${operationId}` });
};

/** POST /api/ai/moderation/block-bots */
router.post('/block-bots', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { threshold = 0.7, dryRun = false, limit = 100 } = req.body;
  return queueOperation(res, generateOperationId(), 'blockBots', { session, threshold, dryRun, limit });
});

/** POST /api/ai/moderation/mass-block */
router.post('/mass-block', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { usernames, delayMs = 2000 } = req.body;
  if (!usernames?.length) return res.status(400).json({ error: 'INVALID_INPUT', message: 'usernames array required' });
  return queueOperation(res, generateOperationId(), 'massBlock', { session, usernames, delayMs });
});

/** POST /api/ai/moderation/mass-unblock */
router.post('/mass-unblock', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { usernames, delayMs = 2000 } = req.body;
  if (!usernames?.length) return res.status(400).json({ error: 'INVALID_INPUT', message: 'usernames array required' });
  return queueOperation(res, generateOperationId(), 'massUnblock', { session, usernames, delayMs });
});

/** POST /api/ai/moderation/mass-unmute */
router.post('/mass-unmute', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { usernames, delayMs = 2000 } = req.body;
  return queueOperation(res, generateOperationId(), 'massUnmute', { session, usernames, delayMs });
});

/** POST /api/ai/moderation/mute-keywords */
router.post('/mute-keywords', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { keywords } = req.body;
  if (!keywords?.length) return res.status(400).json({ error: 'INVALID_INPUT', message: 'keywords array required' });
  return queueOperation(res, generateOperationId(), 'muteKeywords', { session, keywords });
});

/** POST /api/ai/moderation/muted-words */
router.post('/muted-words', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { action = 'list' } = req.body;
  return queueOperation(res, generateOperationId(), 'mutedWords', { session, action });
});

/** POST /api/ai/moderation/remove-followers */
router.post('/remove-followers', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { usernames, delayMs = 3000 } = req.body;
  if (!usernames?.length) return res.status(400).json({ error: 'INVALID_INPUT', message: 'usernames array required' });
  return queueOperation(res, generateOperationId(), 'removeFollowers', { session, usernames, delayMs });
});

/** POST /api/ai/moderation/report-spam */
router.post('/report-spam', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { usernames } = req.body;
  if (!usernames?.length) return res.status(400).json({ error: 'INVALID_INPUT', message: 'usernames array required' });
  return queueOperation(res, generateOperationId(), 'reportSpam', { session, usernames });
});

/** POST /api/ai/moderation/shadowban-check */
router.post('/shadowban-check', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username required' });
  return queueOperation(res, generateOperationId(), 'shadowbanCheck', { session, username });
});

/** POST /api/ai/moderation/verified-only */
router.post('/verified-only', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { enabled = true } = req.body;
  return queueOperation(res, generateOperationId(), 'verifiedOnly', { session, enabled });
});

/** POST /api/ai/moderation/blocked-list */
router.post('/blocked-list', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  return queueOperation(res, generateOperationId(), 'blockedList', { session });
});

/** POST /api/ai/moderation/muted-list */
router.post('/muted-list', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  return queueOperation(res, generateOperationId(), 'mutedList', { session });
});

export default router;
