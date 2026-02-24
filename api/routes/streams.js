/**
 * XActions Stream API Routes
 * REST endpoints for creating, listing, stopping, and querying real-time streams.
 *
 * POST   /api/streams              — create a stream
 * GET    /api/streams              — list active streams
 * GET    /api/streams/stats        — aggregate stats + health
 * GET    /api/streams/:id          — get stream status
 * PATCH  /api/streams/:id          — update stream settings
 * DELETE /api/streams/:id          — stop a stream
 * POST   /api/streams/:id/pause    — pause a stream
 * POST   /api/streams/:id/resume   — resume a paused stream
 * GET    /api/streams/:id/history  — recent events (with optional type filter)
 * DELETE /api/streams              — stop all streams
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import express from 'express';
import {
  createStream,
  stopStream,
  stopAllStreams,
  pauseStream,
  resumeStream,
  updateStream,
  listStreams,
  getStreamHistory,
  getStreamStatus,
  getStreamStats,
  isHealthy,
  STREAM_TYPES,
  getPoolStatus,
} from '../../src/streaming/index.js';

const router = express.Router();

// ============================================================================
// POST /api/streams — Create a new stream
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const { type, username, interval } = req.body;

    if (!type || !STREAM_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid or missing "type". Must be one of: ${STREAM_TYPES.join(', ')}`,
      });
    }

    if (!username) {
      return res.status(400).json({ error: '"username" is required' });
    }

    // interval from client in seconds → convert to ms
    const intervalMs = interval ? Math.max(15, Number(interval)) * 1000 : undefined;

    const stream = await createStream({
      type,
      username,
      interval: intervalMs,
      authToken: req.body.authToken || req.user?.sessionCookie || undefined,
      userId: req.user?.id,
    });

    res.status(201).json(stream);
  } catch (error) {
    const status = error.message?.includes('already exists') ? 409 : 500;
    console.error('POST /api/streams error:', error.message);
    res.status(status).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/streams/stats — Aggregate stats + health
// ============================================================================

router.get('/stats', async (_req, res) => {
  try {
    const stats = getStreamStats();
    const healthy = await isHealthy();
    res.json({ ...stats, healthy });
  } catch (error) {
    console.error('GET /api/streams/stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/streams — List active streams
// ============================================================================

router.get('/', async (_req, res) => {
  try {
    const streams = await listStreams();
    res.json({ streams, count: streams.length, pool: getPoolStatus() });
  } catch (error) {
    console.error('GET /api/streams error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DELETE /api/streams — Stop ALL streams (emergency)
// ============================================================================

router.delete('/', async (_req, res) => {
  try {
    const result = await stopAllStreams();
    res.json(result);
  } catch (error) {
    console.error('DELETE /api/streams error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/streams/:id — Stream status
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const status = await getStreamStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    res.json(status);
  } catch (error) {
    console.error('GET /api/streams/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PATCH /api/streams/:id — Update stream settings (interval)
// ============================================================================

router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.interval !== undefined) {
      updates.interval = Math.max(15, Number(req.body.interval)) * 1000;
    }
    const stream = await updateStream(req.params.id, updates);
    res.json(stream);
  } catch (error) {
    const status = error.message?.includes('not found') ? 404 : 500;
    console.error('PATCH /api/streams/:id error:', error.message);
    res.status(status).json({ error: error.message });
  }
});

// ============================================================================
// DELETE /api/streams/:id — Stop a stream
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const result = await stopStream(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('DELETE /api/streams/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST /api/streams/:id/pause — Pause a stream
// ============================================================================

router.post('/:id/pause', async (req, res) => {
  try {
    const stream = await pauseStream(req.params.id);
    res.json(stream);
  } catch (error) {
    const status = error.message?.includes('not found') ? 404 : 400;
    console.error('POST /api/streams/:id/pause error:', error.message);
    res.status(status).json({ error: error.message });
  }
});

// ============================================================================
// POST /api/streams/:id/resume — Resume a paused stream
// ============================================================================

router.post('/:id/resume', async (req, res) => {
  try {
    const stream = await resumeStream(req.params.id);
    res.json(stream);
  } catch (error) {
    const status = error.message?.includes('not found') ? 404 : 400;
    console.error('POST /api/streams/:id/resume error:', error.message);
    res.status(status).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/streams/:id/history — Recent events (with optional type filter)
// ============================================================================

router.get('/:id/history', async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    const eventType = req.query.type || undefined; // e.g., 'stream:tweet'
    const events = await getStreamHistory(req.params.id, limit, eventType);
    res.json({ streamId: req.params.id, events, count: events.length });
  } catch (error) {
    console.error('GET /api/streams/:id/history error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
