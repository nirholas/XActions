// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Creator Monetization Endpoints
 *
 * @module api/routes/ai/creator
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

/** POST /api/ai/creator/analytics */
router.post('/analytics', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'creatorAnalytics', { session: s, ...req.body }); });
/** POST /api/ai/creator/revenue */
router.post('/revenue', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'creatorRevenue', { session: s }); });
/** POST /api/ai/creator/subscribers */
router.post('/subscribers', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'creatorSubscribers', { session: s }); });
/** POST /api/ai/creator/studio */
router.post('/studio', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'creatorStudio', { session: s }); });
/** POST /api/ai/creator/subscriptions */
router.post('/subscriptions', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'creatorSubscriptions', { session: s }); });

export default router;
