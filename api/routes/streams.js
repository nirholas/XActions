/**
 * XActions Stream API Routes
 * REST endpoints for creating, listing, stopping, and querying real-time streams.
 *
 * POST   /api/streams              — create a stream
 * GET    /api/streams              — list active streams
 * GET    /api/streams/:id          — get stream status
 * DELETE /api/streams/:id          — stop a stream
 * GET    /api/streams/:id/history  — recent events for a stream
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import express from 'express';
import {
  createStream,
  stopStream,
  listStreams,
  getStreamHistory,
  getStreamStatus,
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

    // interval comes in as seconds from the client, convert to ms
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
    console.error('POST /api/streams error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/streams — List active streams
// ============================================================================

router.get('/', async (_req, res) => {
  try {
    const streams = await listStreams();
    res.json({ streams, pool: getPoolStatus() });
  } catch (error) {
    console.error('GET /api/streams error:', error);
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
// GET /api/streams/:id/history — Recent events
// ============================================================================

router.get('/:id/history', async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    const events = await getStreamHistory(req.params.id, limit);
    res.json({ streamId: req.params.id, events, count: events.length });
  } catch (error) {
    console.error('GET /api/streams/:id/history error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
