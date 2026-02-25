/**
 * XActions Agent API Routes
 * 
 * GET  /api/agent/status          — agent running status & uptime
 * GET  /api/agent/metrics          — daily metrics (followers, engagement, LLM)
 * GET  /api/agent/actions          — recent action log (paginated)
 * GET  /api/agent/llm-usage        — LLM cost & token breakdown
 * GET  /api/agent/config           — current agent config (safe fields only)
 * POST /api/agent/config           — update agent config
 * POST /api/agent/start            — start the agent
 * POST /api/agent/stop             — stop the agent
 * POST /api/agent/feed-score       — score a tweet for relevance
 * GET  /api/agent/report           — growth report (7/30 day)
 * GET  /api/agent/schedule         — today's scheduled activities
 * GET  /api/agent/content          — content created by agent
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// In-memory reference to running agent (set by start/stop endpoints)
let agentInstance = null;
let agentStartedAt = null;

// ============================================================================
// Agent Status
// ============================================================================

/**
 * GET /api/agent/status
 * Returns running status, uptime, and basic stats
 */
router.get('/status', (req, res) => {
  try {
    const running = agentInstance !== null;
    const uptime = running && agentStartedAt ? Date.now() - agentStartedAt : 0;

    const status = {
      running,
      uptime,
      uptimeHuman: running ? formatUptime(uptime) : null,
      startedAt: agentStartedAt ? new Date(agentStartedAt).toISOString() : null,
      pid: process.pid,
    };

    // Get today's summary from database if agent is running
    if (running && agentInstance?.db) {
      try {
        status.today = agentInstance.db.getTodaySummary();
      } catch { /* db may not be ready */ }
    }

    res.json(status);
  } catch (error) {
    console.error('❌ Agent status error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Metrics
// ============================================================================

/**
 * GET /api/agent/metrics?days=7
 * Returns daily metrics over a time period
 */
router.get('/metrics', (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90);

    if (!agentInstance?.db) {
      return res.json({ metrics: [], message: 'Agent not running or no database' });
    }

    const report = agentInstance.db.getGrowthReport(days);
    res.json(report);
  } catch (error) {
    console.error('❌ Agent metrics error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Actions Log
// ============================================================================

/**
 * GET /api/agent/actions?limit=50&offset=0&type=like
 * Returns paginated action log
 */
router.get('/actions', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type || null;

    if (!agentInstance?.db) {
      return res.json({ actions: [], total: 0, message: 'Agent not running or no database' });
    }

    const actions = agentInstance.db.getRecentActions(limit, offset, type);
    const total = agentInstance.db.getActionsToday(type);

    res.json({ actions, total, limit, offset });
  } catch (error) {
    console.error('❌ Agent actions error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LLM Usage
// ============================================================================

/**
 * GET /api/agent/llm-usage?days=7
 * Returns LLM token usage and estimated cost
 */
router.get('/llm-usage', (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90);

    if (!agentInstance?.db) {
      return res.json({ usage: [], cost: 0, message: 'Agent not running or no database' });
    }

    const usage = agentInstance.db.getLLMUsage(days);
    const cost = agentInstance.db.getLLMCost(days);

    res.json({ usage, cost: `$${cost.toFixed(4)}`, costRaw: cost });
  } catch (error) {
    console.error('❌ Agent LLM usage error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Config
// ============================================================================

/**
 * GET /api/agent/config
 * Returns current agent config (redacts API keys)
 */
router.get('/config', (req, res) => {
  try {
    const configPath = path.resolve('data', 'agent-config.json');
    if (!fs.existsSync(configPath)) {
      return res.json({ config: null, message: 'No config found. Run setup first.' });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Redact sensitive fields
    const safe = { ...config };
    if (safe.llm?.apiKey) {
      safe.llm.apiKey = safe.llm.apiKey.slice(0, 8) + '...' + safe.llm.apiKey.slice(-4);
    }
    if (safe.proxy?.url) {
      safe.proxy.url = '***';
    }

    res.json({ config: safe });
  } catch (error) {
    console.error('❌ Agent config error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/config
 * Update agent config (partial update)
 */
router.post('/config', (req, res) => {
  try {
    const configPath = path.resolve('data', 'agent-config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    // Merge updates (shallow second level)
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        config[key] = { ...config[key], ...value };
      } else {
        config[key] = value;
      }
    }

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({ success: true, message: 'Config updated' });
  } catch (error) {
    console.error('❌ Agent config update error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Start / Stop
// ============================================================================

/**
 * POST /api/agent/start
 * Start the thought leader agent
 */
router.post('/start', async (req, res) => {
  try {
    if (agentInstance) {
      return res.status(400).json({ error: 'Agent is already running' });
    }

    const configPath = req.body.configPath || path.resolve('data', 'agent-config.json');

    if (!fs.existsSync(configPath)) {
      return res.status(400).json({
        error: 'No config found. Run setup first: node src/agents/setup.js',
      });
    }

    // Dynamic import to avoid loading heavy deps at server start
    const { ThoughtLeaderAgent } = await import('../../src/agents/thoughtLeaderAgent.js');
    const config = ThoughtLeaderAgent.loadConfig(configPath);

    agentInstance = new ThoughtLeaderAgent(config);
    agentStartedAt = Date.now();

    // Run agent in background (don't await)
    agentInstance.run().catch((err) => {
      console.error('❌ Agent crashed:', err.message);
      agentInstance = null;
      agentStartedAt = null;
    });

    res.json({ success: true, message: 'Agent started', startedAt: new Date(agentStartedAt).toISOString() });
  } catch (error) {
    console.error('❌ Agent start error:', error.message);
    agentInstance = null;
    agentStartedAt = null;
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/stop
 * Stop the running agent
 */
router.post('/stop', async (req, res) => {
  try {
    if (!agentInstance) {
      return res.status(400).json({ error: 'Agent is not running' });
    }

    agentInstance._running = false;
    await agentInstance.shutdown?.();
    const uptime = Date.now() - agentStartedAt;

    agentInstance = null;
    agentStartedAt = null;

    res.json({ success: true, message: 'Agent stopped', uptime: formatUptime(uptime) });
  } catch (error) {
    console.error('❌ Agent stop error:', error.message);
    agentInstance = null;
    agentStartedAt = null;
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Feed Score
// ============================================================================

/**
 * POST /api/agent/feed-score
 * Score a tweet's relevance to the agent's niche
 *
 * Body: { text: string }
 */
router.post('/feed-score', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    if (!agentInstance?.llm) {
      return res.status(400).json({ error: 'Agent not running or LLM not configured' });
    }

    const nicheKeywords = agentInstance.config?.niche?.keywords || [];
    const score = await agentInstance.llm.scoreRelevance(text, nicheKeywords);

    res.json({ score, text: text.slice(0, 140) + (text.length > 140 ? '...' : '') });
  } catch (error) {
    console.error('❌ Feed score error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Growth Report
// ============================================================================

/**
 * GET /api/agent/report?days=30
 * Comprehensive growth report
 */
router.get('/report', (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);

    if (!agentInstance?.db) {
      return res.json({ report: null, message: 'Agent not running or no database' });
    }

    const report = agentInstance.db.getGrowthReport(days);
    res.json({ report, days });
  } catch (error) {
    console.error('❌ Agent report error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Schedule
// ============================================================================

/**
 * GET /api/agent/schedule
 * Today's scheduled activities
 */
router.get('/schedule', (req, res) => {
  try {
    if (!agentInstance?.scheduler) {
      return res.json({ schedule: [], message: 'Agent not running' });
    }

    const plan = agentInstance.scheduler.getDailyPlan();
    const schedule = plan.map((a) => ({
      type: a.type,
      scheduledFor: a.scheduledFor,
      durationMinutes: a.durationMinutes,
      intensity: a.intensity,
      query: a.query || null,
      username: a.username || null,
    }));

    res.json({ schedule, count: schedule.length });
  } catch (error) {
    console.error('❌ Agent schedule error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Content
// ============================================================================

/**
 * GET /api/agent/content?limit=20
 * Content created by the agent
 */
router.get('/content', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    if (!agentInstance?.db) {
      return res.json({ content: [], message: 'Agent not running or no database' });
    }

    const content = agentInstance.db.getRecentPosts(limit);
    res.json({ content, count: content.length });
  } catch (error) {
    console.error('❌ Agent content error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Helpers
// ============================================================================

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
}

// Export for testing
export { agentInstance, agentStartedAt };
export default router;
