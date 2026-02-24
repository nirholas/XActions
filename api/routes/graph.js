/**
 * XActions Social Graph API Routes
 *
 * Routes:
 *   POST   /api/graph/build          — Start graph crawl (background job)
 *   GET    /api/graph                 — List saved graphs
 *   GET    /api/graph/:id             — Get graph data
 *   GET    /api/graph/:id/analysis    — Get computed metrics
 *   GET    /api/graph/:id/recommendations — Get follow/engage recommendations
 *   GET    /api/graph/:id/visualization — Get D3.js-ready JSON (or ?format=gexf|html)
 *   DELETE /api/graph/:id             — Delete a saved graph
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import express from 'express';

const router = express.Router();

// Lazy-load graph module to avoid circular deps
let _graph = null;
async function getGraph() {
  if (!_graph) {
    const mod = await import('../../src/graph/index.js');
    _graph = mod.default;
  }
  return _graph;
}

// ============================================================================
// Build
// ============================================================================

/**
 * POST /api/graph/build — Start a graph crawl
 * Body: { username, depth?, maxFollowers?, maxFollowing?, maxNodes?, authToken? }
 */
router.post('/build', async (req, res) => {
  try {
    const graph = await getGraph();
    const {
      username,
      depth = 2,
      maxFollowers = 200,
      maxFollowing = 200,
      maxNodes = 500,
      authToken,
    } = req.body;

    if (!username) {
      return res.status(400).json({ error: '"username" is required' });
    }

    // For small graphs, run inline. For large crawls, return immediately.
    const isLarge = depth > 1 || maxNodes > 200;

    if (isLarge) {
      // Run in background, return immediately
      const buildPromise = graph.build(username, {
        depth,
        maxFollowers,
        maxFollowing,
        maxNodes,
        authToken: authToken || req.user?.sessionCookie,
      });

      buildPromise.then((result) => {
        console.log(`✅ Graph build complete: @${username} — ${result.nodes?.length || 0} nodes`);
        // Emit Socket.IO event if available
        const io = req.app.get('io');
        if (io) {
          io.emit('graph:complete', { graphId: result.id, seed: username, nodesCount: result.nodes?.length || 0 });
        }
      }).catch((err) => {
        console.error(`❌ Graph build failed for @${username}: ${err.message}`);
      });

      return res.status(202).json({
        message: 'Graph build started — this may take several minutes for large networks',
        username,
        depth,
        maxNodes,
        status: 'crawling',
      });
    }

    // Small graph — run inline
    const result = await graph.build(username, {
      depth,
      maxFollowers,
      maxFollowing,
      maxNodes,
      authToken: authToken || req.user?.sessionCookie,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Graph build error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// List / Get / Delete
// ============================================================================

/**
 * GET /api/graph — List all saved graphs
 */
router.get('/', async (req, res) => {
  try {
    const graph = await getGraph();
    const graphs = await graph.list();
    res.json({ graphs, count: graphs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/graph/:id — Get a specific graph
 */
router.get('/:id', async (req, res) => {
  try {
    const graph = await getGraph();
    const data = await graph.get(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Graph not found' });
    }
    res.json(graph.serializeGraph(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/graph/:id — Delete a saved graph
 */
router.delete('/:id', async (req, res) => {
  try {
    const graph = await getGraph();
    const deleted = await graph.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Graph not found' });
    }
    res.json({ success: true, message: 'Graph deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Analysis & Recommendations
// ============================================================================

/**
 * GET /api/graph/:id/analysis — Get computed graph metrics
 */
router.get('/:id/analysis', async (req, res) => {
  try {
    const graphMod = await getGraph();
    const data = await graphMod.get(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Graph not found' });
    }
    const analysis = graphMod.analyze(data);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/graph/:id/recommendations — Get follow/engage recommendations
 */
router.get('/:id/recommendations', async (req, res) => {
  try {
    const graphMod = await getGraph();
    const data = await graphMod.get(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Graph not found' });
    }
    const recs = graphMod.recommend(data, data.seed);
    res.json(recs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/graph/:id/visualization — Get visualization data
 * Query: ?format=d3|gexf|html (default: d3)
 */
router.get('/:id/visualization', async (req, res) => {
  try {
    const graphMod = await getGraph();
    const data = await graphMod.get(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const format = req.query.format || 'd3';
    const result = graphMod.visualize(data, format);

    if (format === 'html') {
      res.type('text/html').send(result);
    } else if (format === 'gexf' || format === 'gephi') {
      res.type('application/xml').send(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
