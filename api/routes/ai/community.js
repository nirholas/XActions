// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * AI Community Endpoints
 *
 * Join, leave, create, and manage X/Twitter Communities.
 *
 * @module api/routes/ai/community
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const generateOperationId = () =>
  `ai-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

const requireSession = (req, res) => {
  const sessionCookie = req.body.sessionCookie || req.headers['x-session-cookie'];
  if (!sessionCookie) {
    res.status(400).json({ success: false, error: 'SESSION_REQUIRED', message: 'Provide sessionCookie in body or X-Session-Cookie header' });
    return null;
  }
  return sessionCookie;
};

const queueOperation = async (res, operationId, type, config) => {
  try { const { queueJob } = await import('../../services/jobQueue.js'); await queueJob({ id: operationId, type, config, status: 'queued' }); } catch { /* queue unavailable */ }
  return res.json({ success: true, operationId, status: 'queued', statusUrl: `/api/ai/action/status/${operationId}` });
};

/** POST /api/ai/community/join */
router.post('/join', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { communityId, keyword } = req.body;
  if (!communityId && !keyword) return res.status(400).json({ error: 'INVALID_INPUT', message: 'communityId or keyword required' });
  return queueOperation(res, generateOperationId(), 'communityJoin', { session, communityId, keyword });
});

/** POST /api/ai/community/leave */
router.post('/leave', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { communityId } = req.body;
  if (!communityId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'communityId required' });
  return queueOperation(res, generateOperationId(), 'communityLeave', { session, communityId });
});

/** POST /api/ai/community/leave-all */
router.post('/leave-all', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  return queueOperation(res, generateOperationId(), 'communityLeaveAll', { session });
});

/** POST /api/ai/community/create */
router.post('/create', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { name, description, rules } = req.body;
  if (!name) return res.status(400).json({ error: 'INVALID_INPUT', message: 'name required' });
  return queueOperation(res, generateOperationId(), 'communityCreate', { session, name, description, rules });
});

/** POST /api/ai/community/manage */
router.post('/manage', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { communityId, action, targetUsername } = req.body;
  if (!communityId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'communityId required' });
  return queueOperation(res, generateOperationId(), 'communityManage', { session, communityId, action, targetUsername });
});

/** POST /api/ai/community/notes */
router.post('/notes', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { tweetId, action = 'view' } = req.body;
  return queueOperation(res, generateOperationId(), 'communityNotes', { session, tweetId, action });
});

/** POST /api/ai/community/list */
router.post('/list', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  return queueOperation(res, generateOperationId(), 'communityList', { session });
});

/** POST /api/ai/community/members */
router.post('/members', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { communityId, limit = 100 } = req.body;
  if (!communityId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'communityId required' });
  return queueOperation(res, generateOperationId(), 'communityMembers', { session, communityId, limit });
});

/** POST /api/ai/community/search */
router.post('/search', async (req, res) => {
  const session = requireSession(req, res); if (!session) return;
  const { query, limit = 20 } = req.body;
  if (!query) return res.status(400).json({ error: 'INVALID_INPUT', message: 'query required' });
  return queueOperation(res, generateOperationId(), 'communitySearch', { session, query, limit });
});

export default router;
