// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Workflows Endpoints
 *
 * Create, run, list, and inspect multi-step automation workflows.
 *
 * @module api/routes/ai/workflows
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const generateOperationId = () =>
  `ai-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

const errorResponse = (res, statusCode, error, message, extras = {}) =>
  res.status(statusCode).json({
    success: false, error, message,
    retryable: extras.retryable ?? true,
    retryAfterMs: extras.retryAfterMs ?? 5000,
    timestamp: new Date().toISOString(),
    ...extras,
  });

const successResponse = (res, data, meta = {}) =>
  res.json({ success: true, data, meta: { processedAt: new Date().toISOString(), ...meta } });

// Session middleware
router.use((req, res, next) => {
  const sessionCookie = req.body.sessionCookie || req.headers['x-session-cookie'];
  if (!sessionCookie) {
    return res.status(400).json({ error: 'SESSION_REQUIRED', message: 'Session cookie is required' });
  }
  req.sessionCookie = sessionCookie;
  next();
});

/**
 * POST /api/ai/workflows/actions
 * List available workflow action types
 */
router.post('/actions', async (req, res) => {
  return successResponse(res, {
    actions: [
      { type: 'scrape_profile', description: 'Get profile data', params: ['username'] },
      { type: 'scrape_tweets', description: 'Get tweets', params: ['username', 'limit'] },
      { type: 'search', description: 'Search tweets', params: ['query', 'filter', 'limit'] },
      { type: 'follow', description: 'Follow a user', params: ['username'] },
      { type: 'unfollow', description: 'Unfollow a user', params: ['username'] },
      { type: 'like', description: 'Like a tweet', params: ['tweetId'] },
      { type: 'retweet', description: 'Retweet a tweet', params: ['tweetId'] },
      { type: 'post_tweet', description: 'Post a tweet', params: ['text'] },
      { type: 'reply', description: 'Reply to a tweet', params: ['tweetId', 'text'] },
      { type: 'send_dm', description: 'Send a DM', params: ['username', 'message'] },
      { type: 'auto_like', description: 'Auto-like tweets', params: ['username|hashtag|keyword', 'maxLikes'] },
      { type: 'auto_follow', description: 'Auto-follow users', params: ['username|hashtag|keyword', 'maxFollows'] },
      { type: 'delay', description: 'Wait N seconds', params: ['seconds'] },
      { type: 'condition', description: 'Branch on condition', params: ['field', 'operator', 'value'] },
    ],
  });
});

/**
 * POST /api/ai/workflows/create
 * Create a named workflow
 */
router.post('/create', async (req, res) => {
  const { name, description, steps, schedule } = req.body;

  if (!name) return res.status(400).json({ error: 'INVALID_INPUT', message: 'name is required' });
  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'steps must be a non-empty array',
      example: {
        name: 'Morning engagement',
        steps: [
          { type: 'search', params: { query: 'ai technology', limit: 20 } },
          { type: 'auto_like', params: { keyword: 'ai technology', maxLikes: 10 } },
          { type: 'delay', params: { seconds: 5 } },
        ],
      },
    });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'workflowCreate',
      config: {
        name, description: description || null,
        steps: steps.slice(0, 50),
        schedule: schedule || null,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'workflow-create',
      config: { name, stepCount: steps.length, scheduled: !!schedule },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/workflows/run
 * Execute a workflow (inline or by ID)
 */
router.post('/run', async (req, res) => {
  const { workflowId, workflow, context = {}, dryRun = false } = req.body;

  if (!workflowId && !workflow) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'workflowId or workflow definition is required' });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'workflowRun',
      config: {
        workflowId: workflowId || null,
        workflow: workflow || null,
        context,
        dryRun: !!dryRun,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'workflow-run',
      config: { dryRun: !!dryRun, workflowId: workflowId || null },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/workflows/list
 * List saved workflows
 */
router.post('/list', async (req, res) => {
  const { limit = 20 } = req.body;

  try {
    const { getRecentJobs } = await import('../../services/jobQueue.js');
    const jobs = await getRecentJobs({ type: 'workflowCreate', limit: Math.min(parseInt(limit) || 20, 100) });

    return successResponse(res, {
      workflows: jobs.map(j => ({
        workflowId: j.id,
        name: j.config?.name,
        stepCount: j.config?.steps?.length || 0,
        status: j.status,
        createdAt: j.createdAt,
      })),
      count: jobs.length,
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

export default router;
