// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Monitoring Endpoints
 * 
 * Track account changes, follower movements, and alerts.
 * Supports comparing snapshots over time to detect changes.
 * 
 * @module api/routes/ai/monitor
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

// Require session cookie for monitoring
router.use(async (req, res, next) => {
  // Skip for certain read-only endpoints
  if (req.path.startsWith('/snapshot/') && req.method === 'GET') {
    return next();
  }
  
  const sessionCookie = req.body.sessionCookie || req.headers['x-session-cookie'];
  
  if (!sessionCookie) {
    return res.status(400).json({
      error: 'SESSION_REQUIRED',
      code: 'E_SESSION_MISSING',
      message: 'X/Twitter session cookie is required for monitoring',
      docs: 'https://xactions.app/docs/ai-api#authentication',
    });
  }
  
  req.sessionCookie = sessionCookie;
  next();
});

/**
 * POST /api/ai/monitor/account
 * Create or update account monitoring snapshot
 */
router.post('/account', async (req, res) => {
  const { username, includeFollowers = true, includeFollowing = true, includeStats = true } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
      schema: {
        username: { type: 'string', required: true },
        includeFollowers: { type: 'boolean', default: true, description: 'Scrape full followers list' },
        includeFollowing: { type: 'boolean', default: true, description: 'Scrape full following list' },
        includeStats: { type: 'boolean', default: true, description: 'Include profile stats' },
      },
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'monitorAccount',
      config: {
        username: cleanUsername,
        includeFollowers: !!includeFollowers,
        includeFollowing: !!includeFollowing,
        includeStats: !!includeStats,
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
        type: 'monitor-account',
        username: cleanUsername,
        config: {
          includeFollowers,
          includeFollowing,
          includeStats,
        },
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 10000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        note: 'Creates a snapshot that can be compared with future snapshots',
      },
    });
  } catch (error) {
    console.error('❌ Monitor account error:', error);
    return errorResponse(res, 500, 'MONITOR_FAILED', error.message);
  }
});

/**
 * POST /api/ai/monitor/followers
 * Monitor follower changes for an account
 */
router.post('/followers', async (req, res) => {
  const { username, compareWithPrevious = true } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'monitorFollowers',
      config: {
        username: cleanUsername,
        compareWithPrevious: !!compareWithPrevious,
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
        type: 'monitor-followers',
        username: cleanUsername,
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 10000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        note: compareWithPrevious 
          ? 'Will compare with previous snapshot to show gained/lost followers'
          : 'Will create new baseline snapshot',
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'MONITOR_FAILED', error.message);
  }
});

/**
 * POST /api/ai/monitor/following
 * Monitor following changes for an account
 */
router.post('/following', async (req, res) => {
  const { username, compareWithPrevious = true } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  
  try {
    const operationId = generateOperationId();
    
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'monitorFollowing',
      config: {
        username: cleanUsername,
        compareWithPrevious: !!compareWithPrevious,
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
        type: 'monitor-following',
        username: cleanUsername,
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 10000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        note: compareWithPrevious
          ? 'Will compare with previous snapshot to show new follows/unfollows'
          : 'Will create new baseline snapshot',
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'MONITOR_FAILED', error.message);
  }
});

/**
 * GET /api/ai/monitor/snapshot/:username
 * Get latest monitoring snapshot for a username
 */
router.get('/snapshot/:username', async (req, res) => {
  const { username } = req.params;
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  
  try {
    const { getLatestSnapshot } = await import('../../services/monitoring.js');
    const snapshot = await getLatestSnapshot(cleanUsername);
    
    if (!snapshot) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        code: 'E_NO_SNAPSHOT',
        message: `No monitoring snapshot found for @${cleanUsername}`,
        hint: 'Create a snapshot first using POST /api/ai/monitor/account',
      });
    }
    
    res.json({
      success: true,
      data: {
        username: cleanUsername,
        snapshot: {
          id: snapshot.id,
          createdAt: snapshot.createdAt,
          stats: snapshot.stats || null,
          followerCount: snapshot.followerCount,
          followingCount: snapshot.followingCount,
          followers: snapshot.includesFollowersList ? snapshot.followers : null,
          following: snapshot.includesFollowingList ? snapshot.following : null,
        },
      },
      meta: {
        queriedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'SNAPSHOT_FAILED', error.message);
  }
});

/**
 * POST /api/ai/monitor/compare
 * Compare two snapshots to see differences
 */
router.post('/compare', async (req, res) => {
  const { username, snapshotId1, snapshotId2 } = req.body;
  
  if (!username && (!snapshotId1 || !snapshotId2)) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Either username (to compare latest with previous) or both snapshotId1 and snapshotId2 are required',
      schema: {
        username: { type: 'string', description: 'Compare latest with previous for this user' },
        snapshotId1: { type: 'string', description: 'First snapshot ID (older)' },
        snapshotId2: { type: 'string', description: 'Second snapshot ID (newer)' },
      },
    });
  }
  
  try {
    const { compareSnapshots } = await import('../../services/monitoring.js');
    const comparison = await compareSnapshots({
      username: username?.replace(/^@/, '').toLowerCase(),
      snapshotId1,
      snapshotId2,
    });
    
    if (!comparison) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Could not find snapshots to compare',
      });
    }
    
    res.json({
      success: true,
      data: {
        username: comparison.username,
        comparison: {
          from: {
            snapshotId: comparison.snapshot1.id,
            createdAt: comparison.snapshot1.createdAt,
            followerCount: comparison.snapshot1.followerCount,
            followingCount: comparison.snapshot1.followingCount,
          },
          to: {
            snapshotId: comparison.snapshot2.id,
            createdAt: comparison.snapshot2.createdAt,
            followerCount: comparison.snapshot2.followerCount,
            followingCount: comparison.snapshot2.followingCount,
          },
          changes: {
            followers: {
              gained: comparison.followersGained || [],
              lost: comparison.followersLost || [],
              netChange: (comparison.followersGained?.length || 0) - (comparison.followersLost?.length || 0),
            },
            following: {
              added: comparison.followingAdded || [],
              removed: comparison.followingRemoved || [],
              netChange: (comparison.followingAdded?.length || 0) - (comparison.followingRemoved?.length || 0),
            },
          },
          timeBetween: {
            ms: Date.parse(comparison.snapshot2.createdAt) - Date.parse(comparison.snapshot1.createdAt),
            human: comparison.timeBetweenHuman,
          },
        },
      },
      meta: {
        comparedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'COMPARE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/alert/new-followers
 * Get new followers since last check
 */
router.post('/alert/new-followers', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  
  try {
    const startTime = Date.now();
    
    // Get current followers and compare with stored snapshot
    const { scrapeFollowers } = await import('../../services/browserAutomation.js');
    const { getLatestSnapshot, saveSnapshot } = await import('../../services/monitoring.js');
    
    // Get current followers (limited for speed)
    const current = await scrapeFollowers(req.sessionCookie, cleanUsername, { limit: 200 });
    const currentUsernames = new Set((current.users || []).map(u => u.username.toLowerCase()));
    
    // Get previous snapshot
    const previous = await getLatestSnapshot(cleanUsername);
    
    let newFollowers = [];
    let lostFollowers = [];
    
    if (previous && previous.followers) {
      const previousUsernames = new Set(previous.followers.map(u => u.toLowerCase()));
      
      // Find new followers
      newFollowers = (current.users || [])
        .filter(u => !previousUsernames.has(u.username.toLowerCase()))
        .map(u => ({
          username: u.username,
          displayName: u.name || u.displayName,
          bio: u.bio || null,
          verified: u.verified || false,
        }));
      
      // Find lost followers (from recent followers)
      lostFollowers = previous.followers
        .filter(username => !currentUsernames.has(username.toLowerCase()))
        .slice(0, 50); // Limit to recent
    }
    
    // Save new snapshot
    await saveSnapshot(cleanUsername, {
      followers: (current.users || []).map(u => u.username.toLowerCase()),
      followerCount: current.users?.length || 0,
    });
    
    res.json({
      success: true,
      data: {
        username: cleanUsername,
        newFollowers: {
          count: newFollowers.length,
          users: newFollowers.slice(0, 100), // Limit response size
        },
        lostFollowers: {
          count: lostFollowers.length,
          usernames: lostFollowers,
        },
        currentFollowerCount: currentUsernames.size,
        previousCheck: previous ? {
          at: previous.createdAt,
          followerCount: previous.followerCount,
        } : null,
        isFirstCheck: !previous,
      },
      meta: {
        scrapedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        note: !previous ? 'First check - baseline saved for future comparisons' : null,
      },
    });
  } catch (error) {
    console.error('❌ New followers alert error:', error);
    return errorResponse(res, 500, 'ALERT_FAILED', error.message);
  }
});

/**
 * DELETE /api/ai/monitor/snapshot/:username
 * Delete monitoring data for a username
 */
router.delete('/snapshot/:username', async (req, res) => {
  const { username } = req.params;
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  
  try {
    const { deleteSnapshots } = await import('../../services/monitoring.js');
    const deleted = await deleteSnapshots(cleanUsername);
    
    res.json({
      success: true,
      data: {
        username: cleanUsername,
        deletedCount: deleted,
      },
      meta: {
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'DELETE_FAILED', error.message);
  }
});

/**
 * GET /api/ai/monitor/list
 * List all monitored accounts
 */
router.get('/list', async (req, res) => {
  const { limit = 50 } = req.query;
  
  try {
    const { listMonitoredAccounts } = await import('../../services/monitoring.js');
    const accounts = await listMonitoredAccounts({
      limit: Math.min(parseInt(limit) || 50, 200),
    });
    
    res.json({
      success: true,
      data: {
        accounts: accounts.map(a => ({
          username: a.username,
          lastSnapshot: a.lastSnapshotAt,
          snapshotCount: a.snapshotCount,
          latestFollowerCount: a.latestFollowerCount,
          latestFollowingCount: a.latestFollowingCount,
        })),
        count: accounts.length,
      },
      meta: {
        queriedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'LIST_FAILED', error.message);
  }
});

/**
 * POST /api/ai/monitor/keyword
 * Start monitoring a keyword for new mentions
 */
router.post('/keyword', async (req, res) => {
  const { keyword, interval = '15m', action = 'start', monitorId } = req.body;

  if (action === 'start' && !keyword) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'keyword is required' });
  }

  try {
    const { queueJob, cancelJob, getRecentJobs } = await import('../../services/jobQueue.js');

    if (action === 'stop' && monitorId) {
      await cancelJob(monitorId);
      return res.json({ success: true, data: { monitorId, status: 'stopped' } });
    }

    if (action === 'list') {
      const jobs = await getRecentJobs({ type: 'monitorKeyword', limit: 20 });
      return res.json({ success: true, data: { monitors: jobs.map(j => ({ monitorId: j.id, keyword: j.config?.keyword, status: j.status })) } });
    }

    const operationId = generateOperationId();
    await queueJob({
      id: operationId,
      type: 'monitorKeyword',
      config: { keyword, interval, sessionCookie: req.sessionCookie },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      data: {
        monitorId: operationId, status: 'started', keyword, interval,
        polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 60000 },
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'MONITOR_FAILED', error.message);
  }
});

/**
 * POST /api/ai/monitor/follower-alerts
 * Get notifications when specific accounts follow/unfollow
 */
router.post('/follower-alerts', async (req, res) => {
  const { username, webhookUrl, action = 'start', alertId } = req.body;

  try {
    const { queueJob, cancelJob } = await import('../../services/jobQueue.js');

    if (action === 'stop' && alertId) {
      await cancelJob(alertId);
      return res.json({ success: true, data: { alertId, status: 'stopped' } });
    }

    if (!username) return res.status(400).json({ error: 'INVALID_INPUT', message: 'username is required' });

    const operationId = generateOperationId();
    await queueJob({
      id: operationId,
      type: 'followerAlerts',
      config: {
        username: username.replace(/^@/, '').toLowerCase(),
        webhookUrl: webhookUrl || null,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      data: {
        alertId: operationId, status: 'started',
        username: username.replace(/^@/, '').toLowerCase(),
        polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 300000 },
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'MONITOR_FAILED', error.message);
  }
});

/**
 * POST /api/ai/monitor/track-engagement
 * Track engagement on specific tweets over time
 */
router.post('/track-engagement', async (req, res) => {
  const { tweetIds, tweetUrls, interval = '1h', duration = '24h' } = req.body;

  const urls = tweetUrls || [];
  const ids = tweetIds || [];
  const allIds = [
    ...ids,
    ...urls.map(u => { const m = u.match(/status\/(\d+)/); return m ? m[1] : null; }).filter(Boolean),
  ];

  if (allIds.length === 0) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'tweetIds or tweetUrls are required' });
  }

  try {
    const operationId = generateOperationId();
    const { queueJob } = await import('../../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'trackEngagement',
      config: {
        tweetIds: allIds.slice(0, 20),
        interval, duration,
        sessionCookie: req.sessionCookie,
      },
      source: 'ai-api',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      data: {
        operationId, status: 'queued', type: 'track-engagement',
        config: { tweetCount: allIds.length, interval, duration },
        polling: { endpoint: `/api/ai/action/status/${operationId}`, recommendedIntervalMs: 60000 },
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'MONITOR_FAILED', error.message);
  }
});

export default router;
