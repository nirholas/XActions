/**
 * AI Action Endpoints
 * 
 * Automation actions (unfollow, like, follow, etc.)
 * These modify account state and require careful handling.
 * 
 * All actions are queued and processed asynchronously.
 * Use the status endpoint to check progress.
 * 
 * @module api/routes/ai/actions
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

/**
 * Generate unique operation ID
 */
const generateOperationId = () => {
  return `ai-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Helper: Create consistent error response
 */
const errorResponse = (res, statusCode, error, message, extras = {}) => {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
    retryable: extras.retryable ?? true,
    retryAfterMs: extras.retryAfterMs ?? 5000,
    timestamp: new Date().toISOString(),
    ...extras,
  });
};

// Require session cookie for all actions
router.use(async (req, res, next) => {
  // Skip for status endpoint
  if (req.path.startsWith('/status/')) {
    return next();
  }
  
  const sessionCookie = req.body.sessionCookie || req.headers['x-session-cookie'];
  
  if (!sessionCookie) {
    return res.status(400).json({
      error: 'SESSION_REQUIRED',
      code: 'E_SESSION_MISSING',
      message: 'X/Twitter session cookie is required for actions',
      hint: 'Include sessionCookie in request body or X-Session-Cookie header',
      docs: 'https://xactions.app/docs/ai-api#authentication',
    });
  }
  
  req.sessionCookie = sessionCookie;
  next();
});

/**
 * POST /api/ai/action/unfollow-non-followers
 * Unfollow accounts that don't follow back
 */
router.post('/unfollow-non-followers', async (req, res) => {
  const { 
    maxUnfollows = 100, 
    dryRun = false,
    excludeUsernames = [],
    excludeVerified = false,
    delayMs = 2000,
  } = req.body;
  
  // Validate inputs
  const effectiveMax = Math.min(Math.max(parseInt(maxUnfollows) || 100, 1), 500);
  const excludeList = Array.isArray(excludeUsernames) 
    ? excludeUsernames.map(u => u.replace(/^@/, '').toLowerCase())
    : [];
  
  try {
    const operationId = generateOperationId();
    
    // Queue the job
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'unfollowNonFollowers',
      config: {
        maxUnfollows: effectiveMax,
        dryRun: !!dryRun,
        excludeUsernames: excludeList,
        excludeVerified: !!excludeVerified,
        delayMs: Math.max(parseInt(delayMs) || 2000, 1000),
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      agentType: req.headers['x-agent-type'] || 'unknown',
      createdAt: new Date().toISOString(),
    });
    
    const estimatedMinutes = Math.ceil((effectiveMax * 3) / 60);
    
    res.json({
      success: true,
      data: {
        operationId,
        status: 'queued',
        type: 'unfollow-non-followers',
        config: {
          maxUnfollows: effectiveMax,
          dryRun: !!dryRun,
          excludeVerified: !!excludeVerified,
          excludeCount: excludeList.length,
        },
        estimatedDuration: `${estimatedMinutes} minutes`,
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 5000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        note: dryRun 
          ? 'Dry run mode - no accounts will be unfollowed, only analyzed'
          : 'Live operation - accounts will be unfollowed',
        warning: dryRun ? null : 'This action cannot be undone automatically',
      },
    });
  } catch (error) {
    console.error('Unfollow non-followers error:', error);
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/action/unfollow-everyone
 * Unfollow all accounts
 */
router.post('/unfollow-everyone', async (req, res) => {
  const { 
    maxUnfollows = 100,
    dryRun = false,
    excludeUsernames = [],
    delayMs = 2000,
  } = req.body;
  
  const effectiveMax = Math.min(Math.max(parseInt(maxUnfollows) || 100, 1), 500);
  const excludeList = Array.isArray(excludeUsernames)
    ? excludeUsernames.map(u => u.replace(/^@/, '').toLowerCase())
    : [];
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'unfollowEveryone',
      config: {
        maxUnfollows: effectiveMax,
        dryRun: !!dryRun,
        excludeUsernames: excludeList,
        delayMs: Math.max(parseInt(delayMs) || 2000, 1000),
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      data: {
        operationId,
        status: 'queued',
        type: 'unfollow-everyone',
        config: {
          maxUnfollows: effectiveMax,
          dryRun: !!dryRun,
          excludeCount: excludeList.length,
        },
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 5000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        warning: dryRun 
          ? 'Dry run - will only analyze, not unfollow'
          : '⚠️ DESTRUCTIVE: This will unfollow ALL accounts (except excluded). Cannot be undone.',
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/action/detect-unfollowers
 * Detect who has unfollowed (compares with previous snapshot)
 */
router.post('/detect-unfollowers', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
      schema: {
        username: { type: 'string', required: true, description: 'Your X username to check' },
      },
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'detectUnfollowers',
      config: {
        username: cleanUsername,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      data: {
        operationId,
        status: 'queued',
        type: 'detect-unfollowers',
        username: cleanUsername,
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 5000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        note: 'Compares current followers with previous snapshot. First run creates baseline.',
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/action/auto-like
 * Auto-like tweets matching criteria
 */
router.post('/auto-like', async (req, res) => {
  const {
    username,       // Like tweets from specific user
    hashtag,        // Like tweets with hashtag
    keyword,        // Like tweets containing keyword
    maxLikes = 50,
    dryRun = false,
    delayMs = 3000,
  } = req.body;
  
  if (!username && !hashtag && !keyword) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_TARGET',
      message: 'At least one of username, hashtag, or keyword is required',
      schema: {
        username: { type: 'string', description: 'Like tweets from this user' },
        hashtag: { type: 'string', description: 'Like tweets with this hashtag' },
        keyword: { type: 'string', description: 'Like tweets containing this keyword' },
        maxLikes: { type: 'number', default: 50, max: 200 },
        dryRun: { type: 'boolean', default: false },
      },
    });
  }
  
  const effectiveMax = Math.min(Math.max(parseInt(maxLikes) || 50, 1), 200);
  const target = username 
    ? { type: 'username', value: username.replace(/^@/, '').toLowerCase() }
    : hashtag 
      ? { type: 'hashtag', value: hashtag.replace(/^#/, '') }
      : { type: 'keyword', value: keyword };
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'autoLike',
      config: {
        target,
        maxLikes: effectiveMax,
        dryRun: !!dryRun,
        delayMs: Math.max(parseInt(delayMs) || 3000, 2000),
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      data: {
        operationId,
        status: 'queued',
        type: 'auto-like',
        config: {
          targetType: target.type,
          targetValue: target.value,
          maxLikes: effectiveMax,
          dryRun: !!dryRun,
        },
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 5000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        note: dryRun ? 'Dry run - tweets will be found but not liked' : 'Live operation',
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/action/follow-engagers
 * Follow users who engaged with a tweet
 */
router.post('/follow-engagers', async (req, res) => {
  const {
    tweetUrl,
    tweetId,
    engagementType = 'all', // 'likes', 'retweets', 'replies', 'all'
    maxFollows = 50,
    dryRun = false,
    delayMs = 3000,
    filters = {},
  } = req.body;
  
  if (!tweetUrl && !tweetId) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_TWEET_REF',
      message: 'tweetUrl or tweetId is required',
      schema: {
        tweetUrl: { type: 'string', example: 'https://x.com/naval/status/1234567890' },
        tweetId: { type: 'string', example: '1234567890' },
        engagementType: { type: 'string', enum: ['likes', 'retweets', 'replies', 'all'], default: 'all' },
        maxFollows: { type: 'number', default: 50, max: 200 },
        dryRun: { type: 'boolean', default: false },
        filters: {
          minFollowers: { type: 'number', description: 'Minimum followers to follow' },
          maxFollowers: { type: 'number', description: 'Maximum followers to follow' },
          mustHaveBio: { type: 'boolean', description: 'Only follow users with bio' },
        },
      },
    });
  }
  
  // Extract tweet ID
  let effectiveTweetId = tweetId;
  if (tweetUrl) {
    const match = tweetUrl.match(/status\/(\d+)/);
    if (match) effectiveTweetId = match[1];
  }
  
  const effectiveMax = Math.min(Math.max(parseInt(maxFollows) || 50, 1), 200);
  const validEngagementTypes = ['likes', 'retweets', 'replies', 'all'];
  const effectiveEngagement = validEngagementTypes.includes(engagementType) ? engagementType : 'all';
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'followEngagers',
      config: {
        tweetId: effectiveTweetId,
        tweetUrl: tweetUrl || `https://x.com/i/status/${effectiveTweetId}`,
        engagementType: effectiveEngagement,
        maxFollows: effectiveMax,
        dryRun: !!dryRun,
        delayMs: Math.max(parseInt(delayMs) || 3000, 2000),
        filters: {
          minFollowers: filters.minFollowers || null,
          maxFollowers: filters.maxFollowers || null,
          mustHaveBio: filters.mustHaveBio || false,
        },
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      data: {
        operationId,
        status: 'queued',
        type: 'follow-engagers',
        config: {
          tweetId: effectiveTweetId,
          engagementType: effectiveEngagement,
          maxFollows: effectiveMax,
          dryRun: !!dryRun,
          filters,
        },
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 5000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/action/keyword-follow
 * Follow users tweeting about keyword
 */
router.post('/keyword-follow', async (req, res) => {
  const {
    keyword,
    maxFollows = 50,
    dryRun = false,
    delayMs = 3000,
    filters = {},
  } = req.body;
  
  if (!keyword) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_KEYWORD',
      message: 'keyword is required',
      schema: {
        keyword: { type: 'string', required: true, example: 'web3 developer' },
        maxFollows: { type: 'number', default: 50, max: 200 },
        dryRun: { type: 'boolean', default: false },
        filters: {
          minFollowers: { type: 'number', default: 100 },
          maxFollowers: { type: 'number' },
          mustHaveBio: { type: 'boolean' },
          excludeVerified: { type: 'boolean' },
        },
      },
    });
  }
  
  const effectiveMax = Math.min(Math.max(parseInt(maxFollows) || 50, 1), 200);
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'keywordFollow',
      config: {
        keyword,
        maxFollows: effectiveMax,
        dryRun: !!dryRun,
        delayMs: Math.max(parseInt(delayMs) || 3000, 2000),
        filters: {
          minFollowers: filters.minFollowers || 100,
          maxFollowers: filters.maxFollowers || null,
          mustHaveBio: filters.mustHaveBio || false,
          excludeVerified: filters.excludeVerified || false,
        },
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      data: {
        operationId,
        status: 'queued',
        type: 'keyword-follow',
        config: {
          keyword,
          maxFollows: effectiveMax,
          dryRun: !!dryRun,
          filters,
        },
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 5000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/action/auto-comment
 * Auto-comment on tweets matching criteria
 */
router.post('/auto-comment', async (req, res) => {
  const {
    username,
    hashtag,
    keyword,
    comments,       // Array of possible comments to randomly select from
    maxComments = 10,
    dryRun = false,
    delayMs = 10000, // Longer delay for comments
  } = req.body;
  
  if (!username && !hashtag && !keyword) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_TARGET',
      message: 'At least one of username, hashtag, or keyword is required',
    });
  }
  
  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_COMMENTS',
      message: 'comments array is required with at least one comment template',
      example: {
        comments: [
          'Great insight! 🔥',
          'Thanks for sharing this!',
          'This is really helpful 👏',
        ],
      },
    });
  }
  
  const effectiveMax = Math.min(Math.max(parseInt(maxComments) || 10, 1), 50);
  const target = username 
    ? { type: 'username', value: username.replace(/^@/, '').toLowerCase() }
    : hashtag 
      ? { type: 'hashtag', value: hashtag.replace(/^#/, '') }
      : { type: 'keyword', value: keyword };
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'autoComment',
      config: {
        target,
        comments: comments.slice(0, 20), // Limit to 20 templates
        maxComments: effectiveMax,
        dryRun: !!dryRun,
        delayMs: Math.max(parseInt(delayMs) || 10000, 5000),
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      data: {
        operationId,
        status: 'queued',
        type: 'auto-comment',
        config: {
          targetType: target.type,
          targetValue: target.value,
          commentTemplates: comments.length,
          maxComments: effectiveMax,
          dryRun: !!dryRun,
        },
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 10000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        note: 'Comments are selected randomly from provided templates',
        warning: dryRun ? null : 'Be mindful of spam - use varied, genuine comments',
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'ACTION_FAILED', error.message);
  }
});

/**
 * POST /api/ai/action/cancel/:operationId
 * Cancel a queued or running operation
 */
router.post('/cancel/:operationId', async (req, res) => {
  const { operationId } = req.params;
  
  try {
    const { cancelJob } = await import('../../services/jobQueue.js');
    const result = await cancelJob(operationId);
    
    if (!result) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Operation not found or already completed',
      });
    }
    
    res.json({
      success: true,
      data: {
        operationId,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'CANCEL_FAILED', error.message);
  }
});

/**
 * GET /api/ai/action/status/:operationId
 * Check operation status (included with original payment - no extra charge)
 */
router.get('/status/:operationId', async (req, res) => {
  const { operationId } = req.params;
  
  try {
    const { getJobStatus } = await import('../../services/jobQueue.js');
    const status = await getJobStatus(operationId);
    
    if (!status) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        code: 'E_OPERATION_NOT_FOUND',
        message: 'Operation not found',
        hint: 'Operation IDs expire after 24 hours',
      });
    }
    
    res.json({
      success: true,
      data: {
        operationId,
        status: status.status, // 'queued', 'processing', 'completed', 'failed', 'cancelled'
        type: status.type,
        progress: status.progress || null,
        result: status.result || null,
        error: status.error || null,
        timing: {
          createdAt: status.createdAt,
          startedAt: status.startedAt || null,
          completedAt: status.completedAt || null,
          durationMs: status.completedAt && status.startedAt
            ? Date.parse(status.completedAt) - Date.parse(status.startedAt)
            : null,
        },
      },
      meta: {
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'STATUS_CHECK_FAILED', error.message);
  }
});

/**
 * GET /api/ai/action/history
 * Get recent operation history for this session
 */
router.get('/history', async (req, res) => {
  const { limit = 20 } = req.query;
  
  try {
    const { getRecentJobs } = await import('../../services/jobQueue.js');
    const jobs = await getRecentJobs({
      source: 'ai-api',
      limit: Math.min(parseInt(limit) || 20, 100),
    });
    
    res.json({
      success: true,
      data: {
        operations: jobs.map(job => ({
          operationId: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        })),
        count: jobs.length,
      },
      meta: {
        queriedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'HISTORY_FAILED', error.message);
  }
});

export default router;
