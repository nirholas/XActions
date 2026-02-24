/**
 * XActions Unfollower Tracking API Routes
 * 
 * POST /api/unfollowers/scan       — trigger a follower scan (Bull job)
 * GET  /api/unfollowers/history     — get scan history (last 30 scans)
 * GET  /api/unfollowers/stats       — aggregated follower stats
 * GET  /api/unfollowers/changes     — recent follower changes (gained/lost)
 * GET  /api/unfollowers/chart       — follower count history for charting
 * POST /api/unfollowers/schedule    — set auto-scan interval
 * DELETE /api/unfollowers/schedule  — stop auto-scanning
 * GET  /api/unfollowers/schedule    — get current schedule
 * 
 * @author nichxbt
 * @license MIT
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';
import {
  runFollowerScan,
  getScanHistory,
  getFollowerStats,
  getRecentChanges,
  getFollowerCountHistory,
} from '../services/followerScanner.js';
import {
  checkAndAlert,
  setSchedule,
  stopSchedule,
  getSchedule,
} from '../services/unfollowerAlerts.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// Scan
// ============================================================================

/**
 * POST /api/unfollowers/scan
 * Trigger a follower scan. Runs the scan inline (not queued) for immediate results.
 * For heavy usage, consider queueing via Bull.
 * 
 * Body: { limit?: number }
 */
router.post('/scan', async (req, res) => {
  try {
    const user = req.user;

    if (!user.sessionCookie) {
      return res.status(400).json({
        error: 'Session cookie required. Connect your X/Twitter account via session cookie first.',
      });
    }

    if (!user.twitterUsername) {
      return res.status(400).json({
        error: 'Twitter username not set. Update your profile with your Twitter username.',
      });
    }

    const { limit = 5000 } = req.body;
    const io = req.app.get('io');

    // Emit scan-started event
    io.emit('unfollower:scan-started', { userId: user.id });

    // Create operation record for tracking
    const operation = await prisma.operation.create({
      data: {
        userId: user.id,
        type: 'followerScan',
        status: 'processing',
        config: JSON.stringify({ limit }),
      },
    });

    try {
      // Run the scan
      const result = await runFollowerScan(
        user.id,
        user.sessionCookie,
        user.twitterUsername,
        { limit }
      );

      // Check for alerts and notify
      await checkAndAlert(io, user.id, result);

      // Update operation as completed
      await prisma.operation.update({
        where: { id: operation.id },
        data: {
          status: 'completed',
          result: JSON.stringify({
            totalFollowers: result.totalFollowers,
            gained: result.gained.length,
            lost: result.lost.length,
          }),
          completedAt: new Date(),
        },
      });

      res.json({
        success: true,
        operationId: operation.id,
        ...result,
      });
    } catch (scanError) {
      // Update operation as failed
      await prisma.operation.update({
        where: { id: operation.id },
        data: {
          status: 'failed',
          error: scanError.message,
          completedAt: new Date(),
        },
      });

      throw scanError;
    }
  } catch (error) {
    console.error('❌ Follower scan error:', error);
    res.status(500).json({ error: 'Failed to run follower scan', details: error.message });
  }
});

// ============================================================================
// History & Stats
// ============================================================================

/**
 * GET /api/unfollowers/history
 * Get scan history (last N scans)
 * 
 * Query: ?limit=30
 */
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const history = await getScanHistory(req.user.id, limit);
    res.json({ history });
  } catch (error) {
    console.error('❌ History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch scan history' });
  }
});

/**
 * GET /api/unfollowers/stats
 * Get aggregated follower stats (today, 7d, 30d)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getFollowerStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('❌ Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch follower stats' });
  }
});

/**
 * GET /api/unfollowers/changes
 * Get recent follower changes
 * 
 * Query: ?type=all|gained|lost&limit=50
 */
router.get('/changes', async (req, res) => {
  try {
    const type = req.query.type || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const changes = await getRecentChanges(req.user.id, type, limit);
    res.json({ changes });
  } catch (error) {
    console.error('❌ Changes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch follower changes' });
  }
});

/**
 * GET /api/unfollowers/chart
 * Get follower count history for charting
 * 
 * Query: ?days=30
 */
router.get('/chart', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const data = await getFollowerCountHistory(req.user.id, days);
    res.json({ data });
  } catch (error) {
    console.error('❌ Chart data error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// ============================================================================
// Schedule
// ============================================================================

/**
 * GET /api/unfollowers/schedule
 * Get current auto-scan schedule
 */
router.get('/schedule', async (req, res) => {
  try {
    const schedule = await getSchedule(req.user.id);
    res.json({ schedule: schedule || null });
  } catch (error) {
    console.error('❌ Schedule fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

/**
 * POST /api/unfollowers/schedule
 * Set auto-scan interval
 * 
 * Body: { interval: 'hourly'|'every6h'|'daily', webhookUrl?: string }
 */
router.post('/schedule', async (req, res) => {
  try {
    const { interval, webhookUrl } = req.body;

    if (!interval) {
      return res.status(400).json({ error: 'interval is required (hourly, every6h, daily)' });
    }

    const schedule = await setSchedule(req.user.id, interval, webhookUrl || null);

    res.json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error('❌ Schedule set error:', error);
    res.status(500).json({ error: error.message || 'Failed to set schedule' });
  }
});

/**
 * DELETE /api/unfollowers/schedule
 * Stop auto-scanning
 */
router.delete('/schedule', async (req, res) => {
  try {
    const schedule = await stopSchedule(req.user.id);

    res.json({
      success: true,
      message: schedule ? 'Auto-scan stopped' : 'No active schedule to stop',
    });
  } catch (error) {
    console.error('❌ Schedule stop error:', error);
    res.status(500).json({ error: 'Failed to stop schedule' });
  }
});

export default router;
