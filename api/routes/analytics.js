/**
 * XActions Analytics API Routes
 * 
 * POST /api/analytics/sentiment — analyze text or tweet URL
 * POST /api/analytics/monitor — start monitoring a username/keyword
 * GET  /api/analytics/monitor — list active monitors
 * GET  /api/analytics/monitor/:id — get monitoring results
 * DELETE /api/analytics/monitor/:id — stop monitoring
 * GET  /api/analytics/reports/:username — get reputation report
 * GET  /api/analytics/alerts — get recent alerts
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import express from 'express';
import {
  analyzeSentiment,
  analyzeBatch,
  createMonitor,
  stopMonitor,
  getMonitor,
  getMonitorHistory,
  listMonitors,
  removeMonitor,
  getAlerts,
  generateReport,
} from '../../src/analytics/index.js';

const router = express.Router();

// ============================================================================
// Sentiment Analysis
// ============================================================================

/**
 * POST /api/analytics/sentiment
 * Analyze sentiment of text or tweet URL
 * 
 * Body: { text: string, mode?: 'rules'|'llm', texts?: string[] }
 */
router.post('/sentiment', async (req, res) => {
  try {
    const { text, texts, mode } = req.body;

    if (!text && (!texts || !Array.isArray(texts) || texts.length === 0)) {
      return res.status(400).json({
        error: 'Either "text" (string) or "texts" (array of strings) is required',
      });
    }

    const options = { mode: mode || 'rules' };

    // Batch mode
    if (texts && Array.isArray(texts)) {
      if (texts.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 texts per batch request' });
      }
      const results = await analyzeBatch(texts, options);
      return res.json({ results, count: results.length });
    }

    // Single text mode
    // If text looks like a tweet URL, we could scrape it — for now, analyze as-is
    const result = await analyzeSentiment(text, options);
    return res.json(result);
  } catch (error) {
    console.error('❌ Sentiment analysis error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Monitor Management
// ============================================================================

/**
 * POST /api/analytics/monitor
 * Start monitoring a username or keyword
 * 
 * Body: { target: string, type?: 'mentions'|'keyword'|'replies', interval?: number, sentimentMode?: string, alertConfig?: object }
 */
router.post('/monitor', async (req, res) => {
  try {
    const { target, type, interval, sentimentMode, alertConfig } = req.body;

    if (!target) {
      return res.status(400).json({ error: '"target" (username or keyword) is required' });
    }

    // Get Socket.IO instance from app if available
    const io = req.app.get('io');

    const monitor = createMonitor({
      target,
      type: type || 'mentions',
      intervalMs: interval ? Math.max(60, Number(interval)) * 1000 : undefined, // min 60s
      sentimentMode: sentimentMode || 'rules',
      alertConfig: {
        ...alertConfig,
        socketRoom: `monitor_${target}`,
      },
    }, {
      onAlert: (alert) => {
        // Emit alert via Socket.IO if available
        if (io) {
          io.to(`monitor_${target}`).emit('analytics:alert', alert);
        }
        console.log(`🚨 Alert: ${alert.message}`);
      },
    });

    return res.status(201).json(monitor);
  } catch (error) {
    console.error('❌ Monitor creation error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/monitor
 * List all active monitors
 */
router.get('/monitor', (req, res) => {
  const monitors = listMonitors();
  return res.json({ monitors, count: monitors.length });
});

/**
 * GET /api/analytics/monitor/:id
 * Get monitor details and recent history
 */
router.get('/monitor/:id', (req, res) => {
  const monitor = getMonitor(req.params.id);
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  const history = getMonitorHistory(req.params.id, {
    limit: parseInt(req.query.limit) || 100,
    since: req.query.since,
  });

  return res.json({ ...monitor, history });
});

/**
 * DELETE /api/analytics/monitor/:id
 * Stop and remove a monitor
 */
router.delete('/monitor/:id', (req, res) => {
  const monitor = getMonitor(req.params.id);
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  removeMonitor(req.params.id);
  return res.json({ success: true, message: `Monitor ${req.params.id} stopped and removed` });
});

// ============================================================================
// Reports
// ============================================================================

/**
 * GET /api/analytics/reports/:username
 * Generate a reputation report for a monitored username
 * 
 * Query: ?period=7d&format=json|markdown
 */
router.get('/reports/:username', (req, res) => {
  const username = req.params.username.replace(/^@/, '');
  const period = req.query.period || '7d';
  const format = req.query.format || 'json';

  // Find monitor for this username
  const monitors = listMonitors();
  const monitor = monitors.find(m =>
    m.target.replace(/^@/, '').toLowerCase() === username.toLowerCase()
  );

  if (!monitor) {
    return res.status(404).json({
      error: `No active monitor found for @${username}. Start one with POST /api/analytics/monitor`,
    });
  }

  const history = getMonitorHistory(monitor.id, { limit: 10000 });

  const { report, markdown } = generateReport(monitor, history, { period, format });

  if (format === 'markdown') {
    res.type('text/markdown').send(markdown);
  } else {
    res.json(report);
  }
});

// ============================================================================
// Alerts
// ============================================================================

/**
 * GET /api/analytics/alerts
 * Get recent alerts
 * 
 * Query: ?monitorId=xxx&severity=warning&limit=50
 */
router.get('/alerts', (req, res) => {
  const alerts = getAlerts({
    monitorId: req.query.monitorId,
    severity: req.query.severity,
    limit: parseInt(req.query.limit) || 50,
  });

  return res.json({ alerts, count: alerts.length });
});

export default router;
