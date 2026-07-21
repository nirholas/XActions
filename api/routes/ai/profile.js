// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Profile Management Endpoints
 *
 * Update profile, get settings, toggle protected, check premium, blocked accounts.
 *
 * @module api/routes/ai/profile
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
    return res.status(400).json({
      error: 'SESSION_REQUIRED',
      code: 'E_SESSION_MISSING',
      message: 'X/Twitter session cookie is required',
    });
  }
  req.sessionCookie = sessionCookie;
  next();
});

/**
 * POST /api/ai/profile/update
 * Update profile fields (name, bio, location, website, avatar, banner)
 */
router.post('/update', async (req, res) => {
  const { name, bio, location, website, avatarUrl, bannerUrl } = req.body;

  if (!name && !bio && !location && !website && !avatarUrl && !bannerUrl) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'At least one field to update is required',
      schema: {
        name: { type: 'string', maxLength: 50 },
        bio: { type: 'string', maxLength: 160 },
        location: { type: 'string', maxLength: 30 },
        website: { type: 'string', format: 'url' },
        avatarUrl: { type: 'string', description: 'URL to new avatar image' },
        bannerUrl: { type: 'string', description: 'URL to new banner image' },
      },
    });
  }

  const updates = {};
  if (name !== undefined) updates.name = String(name).slice(0, 50);
  if (bio !== undefined) updates.bio = String(bio).slice(0, 160);
  if (location !== undefined) updates.location = String(location).slice(0, 30);
  if (website !== undefined) updates.website = website;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'updateProfile',
      config: { updates, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'update-profile',
      fields: Object.keys(updates),
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/profile/check-premium
 * Check if a user has X Premium (Blue/Gold/Verified)
 */
router.post('/check-premium', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();

  try {
    const startTime = Date.now();
    const { scrapeProfile } = await import('../../services/browserAutomation.js');
    const profile = await scrapeProfile(req.sessionCookie, cleanUsername);

    return successResponse(res, {
      username: cleanUsername,
      premium: {
        hasBlue: profile.verified || false,
        verified: profile.verified || false,
        verifiedType: profile.verifiedType || null,
        label: profile.affiliatedLabel || null,
      },
      profile: {
        followersCount: parseInt(profile.followers) || 0,
        tweetsCount: parseInt(profile.tweets) || 0,
        joinDate: profile.joinDate || null,
      },
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    if (error.message?.includes('not found')) {
      return errorResponse(res, 404, 'USER_NOT_FOUND', `User @${cleanUsername} not found`, { retryable: false });
    }
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/profile/settings
 * Get account settings
 */
router.post('/settings', async (req, res) => {
  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'getAccountSettings',
      config: { sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'get-settings',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/profile/toggle-protected
 * Toggle protected tweets (private/public account)
 */
router.post('/toggle-protected', async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'enabled (boolean) is required',
      schema: { enabled: { type: 'boolean', description: 'true = protect tweets, false = make public' } },
    });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'toggleProtectedTweets',
      config: { enabled, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'toggle-protected',
      config: { protected: enabled },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/profile/blocked
 * Get list of blocked accounts
 */
router.post('/blocked', async (req, res) => {
  const { limit = 100 } = req.body;
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 1000);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'getBlockedAccounts',
      config: { limit: effectiveLimit, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'get-blocked',
      config: { limit: effectiveLimit },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

export default router;
