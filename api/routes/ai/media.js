// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Media Studio Endpoints
 *
 * @module api/routes/ai/media
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

/** POST /api/ai/media/upload */
router.post('/upload', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'mediaUpload', { session: s, ...req.body }); });
/** POST /api/ai/media/library */
router.post('/library', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'mediaLibrary', { session: s }); });
/** POST /api/ai/media/analytics */
router.post('/analytics', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'mediaAnalytics', { session: s, ...req.body }); });
/** POST /api/ai/media/captions */
router.post('/captions', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'mediaCaptions', { session: s, ...req.body }); });
/** POST /api/ai/media/studio */
router.post('/studio', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'mediaStudio', { session: s }); });
/** POST /api/ai/media/download-batch */
router.post('/download-batch', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'mediaDownloadBatch', { session: s, ...req.body }); });

export default router;
