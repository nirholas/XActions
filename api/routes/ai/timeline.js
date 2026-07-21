// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Timeline Viewing Endpoints
 *
 * @module api/routes/ai/timeline
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

/** POST /api/ai/timeline/view */
router.post('/view', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'timelineView', { session: s, ...req.body }); });
/** POST /api/ai/timeline/scroll */
router.post('/scroll', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'timelineScroll', { session: s, ...req.body }); });
/** POST /api/ai/timeline/collect */
router.post('/collect', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'timelineCollect', { session: s, ...req.body }); });
/** POST /api/ai/timeline/export */
router.post('/export', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'timelineExport', { session: s, ...req.body }); });
/** POST /api/ai/timeline/switch-feed */
router.post('/switch-feed', async (req, res) => { const s = requireSession(req, res); if (!s) return; const { feed = 'following' } = req.body; return queueOp(res, generateOperationId(), 'timelineSwitchFeed', { session: s, feed }); });

export default router;
