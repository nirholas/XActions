// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Topic Management Endpoints
 *
 * @module api/routes/ai/topics
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const generateOperationId = () => `ai-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
/** @param {import('express').Request} req @param {import('express').Response} res @returns {string | null} */
const requireSession = (req, res) => {
  const s = req.body.sessionCookie || req.headers['x-session-cookie'];
  if (!s) { res.status(400).json({ success: false, error: 'SESSION_REQUIRED', message: 'Provide sessionCookie in body or X-Session-Cookie header' }); return null; }
  return s;
};
/** @param {import('express').Response} res @param {string} id @param {string} type @param {Record<string, unknown>} config */
const queueOp = async (res, id, type, config) => {
  try { const { queueJob } = await import('../../services/jobQueue.js'); await queueJob({ id, type, config, status: 'queued' }); } catch { /* */ }
  return res.json({ success: true, operationId: id, status: 'queued', statusUrl: `/api/ai/action/status/${id}` });
};

/** POST /api/ai/topics/follow */
router.post('/follow', async (req, res) => { const s = requireSession(req, res); if (!s) return; const { topicId } = req.body; if (!topicId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'topicId required' }); return queueOp(res, generateOperationId(), 'topicFollow', { session: s, topicId }); });
/** POST /api/ai/topics/unfollow */
router.post('/unfollow', async (req, res) => { const s = requireSession(req, res); if (!s) return; const { topicId } = req.body; if (!topicId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'topicId required' }); return queueOp(res, generateOperationId(), 'topicUnfollow', { session: s, topicId }); });
/** POST /api/ai/topics/discover */
router.post('/discover', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'topicDiscover', { session: s, ...req.body }); });
/** POST /api/ai/topics/list */
router.post('/list', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'topicList', { session: s }); });

export default router;
