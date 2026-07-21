// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Portability Endpoints
 *
 * Export account data, migrate to other platforms, diff exports,
 * import data, convert formats, list supported platforms.
 *
 * @module api/routes/ai/portability
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
 * POST /api/ai/portability/platforms
 * List supported import/export platforms
 */
router.post('/platforms', async (req, res) => {
  return successResponse(res, {
    platforms: [
      { id: 'twitter', name: 'X / Twitter', formats: ['json', 'csv'], import: true, export: true },
      { id: 'bluesky', name: 'Bluesky (AT Protocol)', formats: ['json'], import: true, export: true },
      { id: 'mastodon', name: 'Mastodon', formats: ['json', 'csv'], import: true, export: true },
      { id: 'threads', name: 'Threads (Meta)', formats: ['json'], import: false, export: true },
      { id: 'nostr', name: 'Nostr', formats: ['json'], import: true, export: true },
    ],
    supportedFormats: ['json', 'csv', 'txt', 'ndjson'],
  });
});

/**
 * POST /api/ai/portability/export-account
 * Export full account data
 */
router.post('/export-account', async (req, res) => {
  const {
    username,
    formats = ['json'],
    only = ['profile', 'tweets', 'followers', 'following'],
    limit = 1000,
  } = req.body;

  const validFormats = ['json', 'csv', 'txt'];
  const validSections = ['profile', 'tweets', 'followers', 'following', 'bookmarks', 'dms', 'likes'];
  const effectiveFormats = formats.filter(f => validFormats.includes(f));
  const effectiveSections = Array.isArray(only) ? only.filter(s => validSections.includes(s)) : validSections;
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 1000, 100), 10000);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'exportAccount',
      config: {
        username: username ? username.replace(/^@/, '').toLowerCase() : null,
        formats: effectiveFormats,
        sections: effectiveSections,
        limit: effectiveLimit,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    const estimatedMinutes = Math.ceil(effectiveSections.length * 2);
    return successResponse(res, {
      operationId, status: 'queued', type: 'export-account',
      config: { formats: effectiveFormats, sections: effectiveSections, limit: effectiveLimit },
      estimatedDuration: `~${estimatedMinutes} minutes`,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 15000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/portability/migrate
 * Migrate account data to another platform
 */
router.post('/migrate', async (req, res) => {
  const { username, platform, dryRun = true, exportDir } = req.body;

  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });
  if (!platform) return res.status(400).json({ error: 'INVALID_INPUT', message: 'platform is required (bluesky|mastodon|nostr)' });

  const validPlatforms = ['bluesky', 'mastodon', 'nostr'];
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: `platform must be one of: ${validPlatforms.join(', ')}` });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'migrateAccount',
      config: {
        username: username.replace(/^@/, '').toLowerCase(),
        platform, dryRun: !!dryRun,
        exportDir: exportDir || null,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'migrate-account',
      config: { platform, dryRun: !!dryRun },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 15000 },
    }, { note: dryRun ? 'Dry run — no data will be written to target platform' : `Live migration to ${platform}` });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/portability/diff
 * Diff two exports to find changes
 */
router.post('/diff', async (req, res) => {
  const { exportA, exportB, dirA, dirB } = req.body;

  if (!exportA && !exportB && !dirA && !dirB) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Provide exportA+exportB (data objects) or dirA+dirB (file paths)',
    });
  }

  // If data objects provided, diff inline
  if (exportA && exportB) {
    const followersA = new Set((exportA.followers || []).map(u => u.username));
    const followersB = new Set((exportB.followers || []).map(u => u.username));
    const gained = [...followersB].filter(u => !followersA.has(u));
    const lost = [...followersA].filter(u => !followersB.has(u));

    return successResponse(res, {
      mode: 'inline',
      followers: { gained: gained.length, lost: lost.length, gainedUsers: gained, lostUsers: lost },
      tweets: {
        countA: (exportA.tweets || []).length,
        countB: (exportB.tweets || []).length,
        delta: (exportB.tweets || []).length - (exportA.tweets || []).length,
      },
    });
  }

  // File-path based diff
  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'diffExports',
      config: { dirA: dirA || null, dirB: dirB || null, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'diff-exports',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/portability/import
 * Import data from another platform
 */
router.post('/import', async (req, res) => {
  const { data, from, dryRun = true } = req.body;

  if (!data) return res.status(400).json({ error: 'INVALID_INPUT', message: 'data is required' });
  if (!from) return res.status(400).json({ error: 'INVALID_INPUT', message: 'from platform is required' });

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'importData',
      config: { data, from, dryRun: !!dryRun, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'import-data',
      config: { from, dryRun: !!dryRun },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/portability/convert
 * Convert data between formats (synchronous)
 */
router.post('/convert', async (req, res) => {
  const { data, from = 'json', to = 'csv' } = req.body;

  if (!data) return res.status(400).json({ error: 'INVALID_INPUT', message: 'data is required' });

  const validFormats = ['json', 'csv', 'txt', 'ndjson'];
  if (!validFormats.includes(to)) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: `to format must be one of: ${validFormats.join(', ')}` });
  }

  try {
    let converted;
    const items = Array.isArray(data) ? data : [data];

    if (to === 'csv') {
      if (items.length === 0) { converted = ''; }
      else {
        const headers = Object.keys(items[0]).join(',');
        const rows = items.map(item => Object.values(item).map(v => JSON.stringify(v)).join(','));
        converted = [headers, ...rows].join('\n');
      }
    } else if (to === 'ndjson') {
      converted = items.map(i => JSON.stringify(i)).join('\n');
    } else if (to === 'txt') {
      converted = items.map(i => typeof i === 'string' ? i : JSON.stringify(i, null, 2)).join('\n\n');
    } else {
      converted = JSON.stringify(items, null, 2);
    }

    return successResponse(res, {
      from, to,
      converted,
      itemCount: items.length,
      byteSize: Buffer.byteLength(String(converted)),
    });
  } catch (error) {
    return errorResponse(res, 500, 'CONVERSION_FAILED', error.message);
  }
});

export default router;
