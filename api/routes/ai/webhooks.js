// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Webhooks Endpoints
 *
 * @module api/routes/ai/webhooks
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const generateOperationId = () => `ai-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
/** @param {import('express').Response} res @param {string} id @param {string} type @param {Record<string, unknown>} config */
const queueOp = async (res, id, type, config) => {
  try { const { queueJob } = await import('../../services/jobQueue.js'); await queueJob({ id, type, config, status: 'queued' }); } catch { /* */ }
  return res.json({ success: true, operationId: id, status: 'queued', statusUrl: `/api/ai/action/status/${id}` });
};

/** POST /api/ai/webhooks/create */
router.post('/create', async (req, res) => { const { url, events } = req.body; if (!url) return res.status(400).json({ error: 'INVALID_INPUT', message: 'url required' }); return queueOp(res, generateOperationId(), 'webhookCreate', { url, events }); });
/** POST /api/ai/webhooks/list */
router.post('/list', async (req, res) => { return res.json({ success: true, data: { webhooks: [] } }); });
/** POST /api/ai/webhooks/delete */
router.post('/delete', async (req, res) => { const { webhookId } = req.body; if (!webhookId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'webhookId required' }); return queueOp(res, generateOperationId(), 'webhookDelete', { webhookId }); });
/** POST /api/ai/webhooks/test */
router.post('/test', async (req, res) => { const { webhookId } = req.body; return queueOp(res, generateOperationId(), 'webhookTest', { webhookId }); });
/** POST /api/ai/webhooks/events */
router.post('/events', async (req, res) => { return res.json({ success: true, data: { events: ['new_follower', 'unfollower', 'mention', 'dm', 'like', 'retweet', 'quote', 'reply'] } }); });

export default router;
