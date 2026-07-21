// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Discovery & Explore Endpoints
 *
 * @module api/routes/ai/discovery
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

/** POST /api/ai/discovery/trending */
router.post('/trending', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'discoveryTrending', { session: s }); });
/** POST /api/ai/discovery/trending-monitor */
router.post('/trending-monitor', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'discoveryTrendingMonitor', { session: s, ...req.body }); });
/** POST /api/ai/discovery/save-search */
router.post('/save-search', async (req, res) => { const s = requireSession(req, res); if (!s) return; const { query } = req.body; if (!query) return res.status(400).json({ error: 'INVALID_INPUT', message: 'query required' }); return queueOp(res, generateOperationId(), 'discoverySaveSearch', { session: s, query }); });
/** POST /api/ai/discovery/saved-searches */
router.post('/saved-searches', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'discoverySavedSearches', { session: s }); });
/** POST /api/ai/discovery/topics */
router.post('/topics', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'discoveryTopics', { session: s, ...req.body }); });
/** POST /api/ai/discovery/explore */
router.post('/explore', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'discoveryExplore', { session: s }); });
/** POST /api/ai/discovery/search */
router.post('/search', async (req, res) => { const s = requireSession(req, res); if (!s) return; const { query } = req.body; if (!query) return res.status(400).json({ error: 'INVALID_INPUT', message: 'query required' }); return queueOp(res, generateOperationId(), 'discoverySearch', { session: s, query, ...req.body }); });
/** POST /api/ai/discovery/for-you */
router.post('/for-you', async (req, res) => { const s = requireSession(req, res); if (!s) return; return queueOp(res, generateOperationId(), 'discoveryForYou', { session: s }); });

export default router;
