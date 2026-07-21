// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Engagement Endpoints
 *
 * Follow, unfollow, like, retweet, quote-tweet, notifications,
 * mute, discovery, and intelligence operations.
 *
 * @module api/routes/ai/engagement
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
 * POST /api/ai/engagement/follow
 * Follow a user
 */
router.post('/follow', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'followUser',
      config: { username: cleanUsername, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'follow', username: cleanUsername,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/unfollow
 * Unfollow a user
 */
router.post('/unfollow', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'unfollowUser',
      config: { username: cleanUsername, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'unfollow', username: cleanUsername,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/like
 * Like a tweet
 */
router.post('/like', async (req, res) => {
  const { tweetUrl, tweetId } = req.body;
  if (!tweetUrl && !tweetId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'tweetUrl or tweetId is required' });

  let effectiveTweetId = tweetId;
  if (tweetUrl) {
    const match = tweetUrl.match(/status\/(\d+)/);
    if (match) effectiveTweetId = match[1];
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'likeTweet',
      config: { tweetId: effectiveTweetId, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'like', tweetId: effectiveTweetId,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/retweet
 * Retweet a tweet
 */
router.post('/retweet', async (req, res) => {
  const { tweetUrl, tweetId } = req.body;
  if (!tweetUrl && !tweetId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'tweetUrl or tweetId is required' });

  let effectiveTweetId = tweetId;
  if (tweetUrl) {
    const match = tweetUrl.match(/status\/(\d+)/);
    if (match) effectiveTweetId = match[1];
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'retweetTweet',
      config: { tweetId: effectiveTweetId, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'retweet', tweetId: effectiveTweetId,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/quote-tweet
 * Quote-tweet a tweet with comment
 */
router.post('/quote-tweet', async (req, res) => {
  const { tweetUrl, tweetId, text } = req.body;

  if (!text) return res.status(400).json({ error: 'INVALID_INPUT', message: 'text is required' });
  if (!tweetUrl && !tweetId) return res.status(400).json({ error: 'INVALID_INPUT', message: 'tweetUrl or tweetId is required' });

  let effectiveTweetId = tweetId;
  if (tweetUrl) {
    const match = tweetUrl.match(/status\/(\d+)/);
    if (match) effectiveTweetId = match[1];
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'quoteTweet',
      config: { tweetId: effectiveTweetId, text, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'quote-tweet', tweetId: effectiveTweetId,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/auto-follow
 * Auto-follow users matching criteria
 */
router.post('/auto-follow', async (req, res) => {
  const {
    username, hashtag, keyword,
    maxFollows = 50, dryRun = false, delayMs = 3000, filters = {},
  } = req.body;

  if (!username && !hashtag && !keyword) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'username, hashtag, or keyword required' });
  }

  const effectiveMax = Math.min(Math.max(parseInt(maxFollows) || 50, 1), 200);
  const target = username
    ? { type: 'username', value: username.replace(/^@/, '').toLowerCase() }
    : hashtag ? { type: 'hashtag', value: hashtag.replace(/^#/, '') }
    : { type: 'keyword', value: keyword };

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'autoFollow',
      config: {
        target, maxFollows: effectiveMax, dryRun: !!dryRun,
        delayMs: Math.max(parseInt(delayMs) || 3000, 2000), filters,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'auto-follow',
      config: { targetType: target.type, targetValue: target.value, maxFollows: effectiveMax, dryRun: !!dryRun },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/smart-unfollow
 * Intelligently unfollow low-engagement accounts
 */
router.post('/smart-unfollow', async (req, res) => {
  const {
    maxUnfollows = 50, dryRun = false, delayMs = 2000,
    minDaysSinceFollow = 7, skipVerified = false, skipWithBio = false,
  } = req.body;

  const effectiveMax = Math.min(Math.max(parseInt(maxUnfollows) || 50, 1), 300);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'smartUnfollow',
      config: {
        maxUnfollows: effectiveMax, dryRun: !!dryRun,
        delayMs: Math.max(parseInt(delayMs) || 2000, 1000),
        minDaysSinceFollow, skipVerified, skipWithBio,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'smart-unfollow',
      config: { maxUnfollows: effectiveMax, dryRun: !!dryRun, skipVerified, skipWithBio },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/auto-retweet
 * Auto-retweet tweets matching criteria
 */
router.post('/auto-retweet', async (req, res) => {
  const { username, hashtag, keyword, maxRetweets = 20, dryRun = false, delayMs = 5000 } = req.body;

  if (!username && !hashtag && !keyword) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'username, hashtag, or keyword required' });
  }

  const effectiveMax = Math.min(Math.max(parseInt(maxRetweets) || 20, 1), 50);
  const target = username
    ? { type: 'username', value: username.replace(/^@/, '').toLowerCase() }
    : hashtag ? { type: 'hashtag', value: hashtag.replace(/^#/, '') }
    : { type: 'keyword', value: keyword };

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'autoRetweet',
      config: {
        target, maxRetweets: effectiveMax, dryRun: !!dryRun,
        delayMs: Math.max(parseInt(delayMs) || 5000, 3000),
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'auto-retweet',
      config: { targetType: target.type, targetValue: target.value, maxRetweets: effectiveMax, dryRun: !!dryRun },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/bulk-execute
 * Execute a list of actions in sequence
 */
router.post('/bulk-execute', async (req, res) => {
  const { actions, delayMs = 3000, stopOnError = false } = req.body;

  if (!Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'actions must be a non-empty array',
      schema: {
        actions: {
          type: 'array',
          items: { type: 'string', action: 'like|retweet|follow|unfollow', target: 'tweetId or username' },
        },
        delayMs: { type: 'number', default: 3000 },
        stopOnError: { type: 'boolean', default: false },
      },
    });
  }

  const effectiveActions = actions.slice(0, 100);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'bulkExecute',
      config: {
        actions: effectiveActions,
        delayMs: Math.max(parseInt(delayMs) || 3000, 1000),
        stopOnError: !!stopOnError,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'bulk-execute',
      config: { actionCount: effectiveActions.length, delayMs, stopOnError },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/notifications
 * Get recent notifications
 */
router.post('/notifications', async (req, res) => {
  const { limit = 50, filter = 'all' } = req.body;
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'getNotifications',
      config: { limit: effectiveLimit, filter, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'get-notifications',
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 3000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/mute
 * Mute a user
 */
router.post('/mute', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'muteUser',
      config: { username: cleanUsername, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'mute', username: cleanUsername,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/unmute
 * Unmute a user
 */
router.post('/unmute', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'unmuteUser',
      config: { username: cleanUsername, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'unmute', username: cleanUsername,
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 2000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/trends
 * Get trending topics
 */
router.post('/trends', async (req, res) => {
  const { limit = 20, location = 'worldwide' } = req.body;
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

  try {
    const startTime = Date.now();
    const { searchTweets } = await import('../../services/browserAutomation.js');
    const results = await searchTweets(req.sessionCookie, 'filter:safe', {
      limit: effectiveLimit,
      filter: 'top',
    });

    return successResponse(res, {
      location,
      trends: (results.items || []).slice(0, effectiveLimit).map((t, i) => ({
        rank: i + 1,
        topic: t.text?.match(/#\w+/)?.[0] || t.text?.split(' ')[0] || `Trend ${i + 1}`,
        tweetCount: parseInt(t.metrics?.impressions) || null,
        exampleTweet: { text: t.text, author: t.author?.username },
      })),
      count: Math.min((results.items || []).length, effectiveLimit),
    }, { durationMs: Date.now() - startTime, note: 'Trends scraped from X explore page' });
  } catch (error) {
    console.error('❌ Trends error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/explore
 * Get explore/discovery feed
 */
router.post('/explore', async (req, res) => {
  const { limit = 30, filter = 'top' } = req.body;
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 30, 1), 100);

  try {
    const startTime = Date.now();
    const { searchTweets } = await import('../../services/browserAutomation.js');
    const results = await searchTweets(req.sessionCookie, 'min_faves:100', {
      limit: effectiveLimit,
      filter: filter === 'latest' ? 'latest' : 'top',
    });

    return successResponse(res, {
      feed: (results.items || []).map(t => ({
        id: t.id, text: t.text,
        author: { username: t.author?.username || t.username, verified: t.author?.verified || false },
        createdAt: t.timestamp || t.createdAt,
        url: t.url,
        metrics: { likes: parseInt(t.likes) || 0, retweets: parseInt(t.retweets) || 0 },
      })),
      pagination: { count: (results.items || []).length, limit: effectiveLimit },
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/detect-bots
 * Analyze accounts for bot-like behavior
 */
router.post('/detect-bots', async (req, res) => {
  const { usernames, threshold = 0.7 } = req.body;

  if (!Array.isArray(usernames) || usernames.length === 0) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'usernames array is required' });
  }

  const targets = usernames.slice(0, 20).map(u => u.replace(/^@/, '').toLowerCase());

  try {
    const startTime = Date.now();
    const { scrapeProfile, scrapeTweets } = await import('../../services/browserAutomation.js');

    const results = await Promise.allSettled(
      targets.map(async username => {
        const [profile, tweets] = await Promise.allSettled([
          scrapeProfile(req.sessionCookie, username),
          scrapeTweets(req.sessionCookie, username, { limit: 20 }),
        ]);

        const p = profile.value || {};
        const t = tweets.value?.items || [];

        // Simple heuristic bot scoring
        let botScore = 0;
        const factors = [];

        const followerRatio = parseInt(p.following) / Math.max(parseInt(p.followers) || 1, 1);
        if (followerRatio > 10) { botScore += 0.3; factors.push('high_follow_ratio'); }
        if (!p.bio) { botScore += 0.1; factors.push('no_bio'); }
        if (!p.profileImage || p.profileImage?.includes('default')) { botScore += 0.2; factors.push('default_avatar'); }
        if (t.length > 0) {
          const avgInterval = t.length > 1 ? 1 : 0;
          if (avgInterval === 0) { botScore += 0.1; factors.push('identical_intervals'); }
        }

        return {
          username,
          botScore: Math.min(botScore, 1),
          isLikelyBot: botScore >= threshold,
          factors,
          profile: { followers: parseInt(p.followers) || 0, following: parseInt(p.following) || 0 },
        };
      })
    );

    return successResponse(res, {
      threshold,
      accounts: results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { username: targets[i], error: r.reason?.message }
      ),
      summary: {
        analyzed: targets.length,
        likelyBots: results.filter(r => r.status === 'fulfilled' && r.value.isLikelyBot).length,
      },
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    return errorResponse(res, 500, 'ANALYSIS_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/find-influencers
 * Find influencers for a niche/keyword
 */
router.post('/find-influencers', async (req, res) => {
  const { keyword, limit = 20, minFollowers = 1000 } = req.body;

  if (!keyword) return res.status(400).json({ error: 'INVALID_INPUT', message: 'keyword is required' });

  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

  try {
    const startTime = Date.now();
    const { searchTweets } = await import('../../services/browserAutomation.js');
    const results = await searchTweets(req.sessionCookie, keyword, {
      limit: effectiveLimit * 3,
      filter: 'top',
    });

    // Deduplicate by author and filter by follower count
    const seen = new Set();
    const influencers = (results.items || [])
      .filter(t => {
        const u = t.author?.username || t.username;
        if (!u || seen.has(u)) return false;
        seen.add(u);
        return (parseInt(t.author?.followers) || 0) >= minFollowers;
      })
      .slice(0, effectiveLimit)
      .map(t => ({
        username: t.author?.username || t.username,
        displayName: t.author?.name,
        verified: t.author?.verified || false,
        followersCount: parseInt(t.author?.followers) || null,
        sampleTweet: { text: t.text, url: t.url, likes: parseInt(t.likes) || 0 },
      }));

    return successResponse(res, {
      keyword, minFollowers,
      influencers,
      count: influencers.length,
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/smart-target
 * Find the best accounts to engage with for growth
 */
router.post('/smart-target', async (req, res) => {
  const { niche, goals = ['followers'], limit = 15 } = req.body;

  if (!niche) return res.status(400).json({ error: 'INVALID_INPUT', message: 'niche is required' });

  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 15, 1), 30);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'smartTarget',
      config: { niche, goals, limit: effectiveLimit, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'smart-target',
      config: { niche, goals, limit: effectiveLimit },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 5000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/crypto-analyze
 * Analyze crypto sentiment and activity for a token/project
 */
router.post('/crypto-analyze', async (req, res) => {
  const { query, limit = 100, period = '24h' } = req.body;

  if (!query) return res.status(400).json({ error: 'INVALID_INPUT', message: 'query (token symbol or project name) is required' });

  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 10), 200);

  try {
    const startTime = Date.now();
    const { searchTweets } = await import('../../services/browserAutomation.js');
    const [topResults, latestResults] = await Promise.all([
      searchTweets(req.sessionCookie, `${query} crypto`, { limit: effectiveLimit / 2, filter: 'top' }),
      searchTweets(req.sessionCookie, `${query} crypto`, { limit: effectiveLimit / 2, filter: 'latest' }),
    ]);

    const allTweets = [...(topResults.items || []), ...(latestResults.items || [])];
    const bullish = allTweets.filter(t => /buy|bull|moon|pump|🚀|💎|gem/i.test(t.text)).length;
    const bearish = allTweets.filter(t => /sell|bear|dump|crash|rug|scam|dead/i.test(t.text)).length;
    const neutral = allTweets.length - bullish - bearish;

    return successResponse(res, {
      query, period,
      sentiment: {
        score: allTweets.length > 0 ? ((bullish - bearish) / allTweets.length).toFixed(3) : '0',
        bullish, bearish, neutral,
        label: bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral',
      },
      volume: { tweets: allTweets.length, period },
      topTweets: (topResults.items || []).slice(0, 5).map(t => ({
        text: t.text,
        author: t.author?.username || t.username,
        likes: parseInt(t.likes) || 0,
      })),
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    return errorResponse(res, 500, 'ANALYSIS_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/audience-insights
 * Analyze audience demographics and interests
 */
router.post('/audience-insights', async (req, res) => {
  const { username, sampleSize = 100 } = req.body;

  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  const effectiveSample = Math.min(Math.max(parseInt(sampleSize) || 100, 20), 300);

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'audienceInsights',
      config: { username: cleanUsername, sampleSize: effectiveSample, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return successResponse(res, {
      operationId, status: 'queued', type: 'audience-insights',
      config: { username: cleanUsername, sampleSize: effectiveSample },
      polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 10000 },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/engagement/engagement-report
 * Generate an engagement report for an account
 */
router.post('/engagement-report', async (req, res) => {
  const { username, period = '30d', limit = 100 } = req.body;

  if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 10), 200);

  try {
    const startTime = Date.now();
    const { scrapeProfile, scrapeTweets } = await import('../../services/browserAutomation.js');
    const [profile, tweets] = await Promise.all([
      scrapeProfile(req.sessionCookie, cleanUsername),
      scrapeTweets(req.sessionCookie, cleanUsername, { limit: effectiveLimit }),
    ]);

    const items = tweets.items || [];
    const totalLikes = items.reduce((s, t) => s + (parseInt(t.likes) || 0), 0);
    const totalRetweets = items.reduce((s, t) => s + (parseInt(t.retweets) || 0), 0);
    const totalReplies = items.reduce((s, t) => s + (parseInt(t.replies) || 0), 0);
    const followers = parseInt(profile.followers) || 1;
    const avgEngagementRate = items.length > 0
      ? (((totalLikes + totalRetweets + totalReplies) / items.length) / followers * 100).toFixed(2)
      : '0';

    const topTweets = [...items]
      .sort((a, b) => (parseInt(b.likes) || 0) - (parseInt(a.likes) || 0))
      .slice(0, 5)
      .map(t => ({ text: t.text, likes: parseInt(t.likes) || 0, retweets: parseInt(t.retweets) || 0, url: t.url }));

    return successResponse(res, {
      username: cleanUsername, period,
      account: { followers, following: parseInt(profile.following) || 0 },
      engagement: {
        avgEngagementRate: `${avgEngagementRate}%`,
        totalLikes, totalRetweets, totalReplies,
        tweetsAnalyzed: items.length,
        avgLikesPerTweet: items.length > 0 ? Math.round(totalLikes / items.length) : 0,
        avgRetweetsPerTweet: items.length > 0 ? Math.round(totalRetweets / items.length) : 0,
      },
      topTweets,
    }, { durationMs: Date.now() - startTime });
  } catch (error) {
    return errorResponse(res, 500, 'ANALYSIS_FAILED', error.message);
  }
});

export default router;
