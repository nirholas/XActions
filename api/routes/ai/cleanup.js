// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Content Cleanup Endpoints
 *
 * @module api/routes/ai/cleanup
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

/** POST /api/ai/cleanup/delete-tweets */
router.post('/delete-tweets', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'cleanupDeleteTweets', { session: s, ...req.body }); });
/** POST /api/ai/cleanup/unlike-all */
router.post('/unlike-all', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'cleanupUnlikeAll', { session: s }); });
/** POST /api/ai/cleanup/clear-reposts */
router.post('/clear-reposts', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'cleanupClearReposts', { session: s }); });
/** POST /api/ai/cleanup/clear-history */
router.post('/clear-history', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'cleanupClearHistory', { session: s }); });
/** POST /api/ai/cleanup/bulk-delete */
router.post('/bulk-delete', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'cleanupBulkDelete', { session: s, ...req.body }); });
/** POST /api/ai/cleanup/archive */
router.post('/archive', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'cleanupArchive', { session: s, ...req.body }); });

export default router;
