/**
 * XActions Reputation Monitoring
 * 
 * Tracks sentiment over time for a username or keyword.
 * Scrapes mentions/search periodically, computes rolling averages,
 * detects anomalies, and triggers alerts.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { analyzeSentiment, analyzeBatch, aggregateResults } from './sentiment.js';
import { checkAlerts } from './alerts.js';

// ============================================================================
// In-memory store for active monitors
// ============================================================================

/** @type {Map<string, Monitor>} */
const activeMonitors = new Map();

let monitorIdCounter = 1;

/**
 * @typedef {Object} MonitorConfig
 * @property {string} target - Username (with @) or keyword to monitor
 * @property {string} [type='mentions'] - 'mentions' | 'keyword' | 'replies'
 * @property {number} [intervalMs=900000] - Polling interval (default 15 min)
 * @property {string} [sentimentMode='rules'] - 'rules' or 'llm'
 * @property {object} [alertConfig] - Alert configuration
 * @property {number} [alertConfig.sentimentThreshold=-0.3] - Alert when below
 * @property {number} [alertConfig.volumeMultiplier=3] - Alert when mentions > avg * this
 * @property {string} [alertConfig.webhookUrl] - Webhook URL for alerts
 */

/**
 * @typedef {Object} SentimentDataPoint
 * @property {string} timestamp - ISO timestamp
 * @property {number} score - Sentiment score -1..1
 * @property {string} label - positive/neutral/negative
 * @property {string} text - Original tweet text (truncated)
 * @property {string} [author] - Tweet author
 * @property {string} [tweetUrl] - URL to the tweet
 */

/**
 * @typedef {Object} Monitor
 * @property {string} id
 * @property {string} target
 * @property {string} type
 * @property {string} status - 'active' | 'paused' | 'stopped'
 * @property {number} intervalMs
 * @property {string} sentimentMode
 * @property {object} alertConfig
 * @property {SentimentDataPoint[]} history
 * @property {NodeJS.Timeout|null} timer
 * @property {string} createdAt
 * @property {string} lastPolledAt
 * @property {object} stats
 */

// ============================================================================
// Monitor management
// ============================================================================

/**
 * Create and start a new reputation monitor
 * @param {MonitorConfig} config
 * @param {object} [deps] - Optional dependencies for scraping
 * @param {Function} [deps.searchFn] - Custom search function (for testing)
 * @param {Function} [deps.onAlert] - Custom alert callback
 * @returns {Monitor}
 */
export function createMonitor(config, deps = {}) {
  const id = `monitor_${monitorIdCounter++}_${Date.now()}`;
  const target = config.target;

  if (!target) throw new Error('Monitor target (username or keyword) is required');

  const monitor = {
    id,
    target,
    type: config.type || 'mentions',
    status: 'active',
    intervalMs: config.intervalMs || 15 * 60 * 1000, // 15 min
    sentimentMode: config.sentimentMode || 'rules',
    alertConfig: {
      sentimentThreshold: config.alertConfig?.sentimentThreshold ?? -0.3,
      volumeMultiplier: config.alertConfig?.volumeMultiplier ?? 3,
      webhookUrl: config.alertConfig?.webhookUrl || null,
      socketRoom: config.alertConfig?.socketRoom || null,
    },
    history: [],
    timer: null,
    createdAt: new Date().toISOString(),
    lastPolledAt: null,
    stats: {
      totalPolls: 0,
      totalTweets: 0,
      rollingAverage: 0,
      trend: 'stable',
      volatility: 0,
    },
    _deps: deps,
  };

  activeMonitors.set(id, monitor);

  // Start polling
  _startPolling(monitor);

  console.log(`📊 Monitor started: ${id} → ${target} (every ${monitor.intervalMs / 1000}s)`);
  return _serializeMonitor(monitor);
}

/**
 * Stop a monitor
 * @param {string} monitorId
 * @returns {{ success: boolean, message: string }}
 */
export function stopMonitor(monitorId) {
  const monitor = activeMonitors.get(monitorId);
  if (!monitor) {
    return { success: false, message: `Monitor ${monitorId} not found` };
  }

  if (monitor.timer) {
    clearInterval(monitor.timer);
    monitor.timer = null;
  }
  monitor.status = 'stopped';

  console.log(`🛑 Monitor stopped: ${monitorId}`);
  return { success: true, message: `Monitor ${monitorId} stopped` };
}

/**
 * Get monitor results
 * @param {string} monitorId
 * @returns {Monitor|null}
 */
export function getMonitor(monitorId) {
  const monitor = activeMonitors.get(monitorId);
  if (!monitor) return null;
  return _serializeMonitor(monitor);
}

/**
 * Get monitor history (sentiment data points)
 * @param {string} monitorId
 * @param {object} [options]
 * @param {number} [options.limit=100]
 * @param {string} [options.since] - ISO timestamp
 * @returns {SentimentDataPoint[]}
 */
export function getMonitorHistory(monitorId, options = {}) {
  const monitor = activeMonitors.get(monitorId);
  if (!monitor) return [];

  let history = monitor.history;
  if (options.since) {
    const since = new Date(options.since).getTime();
    history = history.filter(dp => new Date(dp.timestamp).getTime() >= since);
  }

  const limit = options.limit || 100;
  return history.slice(-limit);
}

/**
 * List all active monitors
 * @returns {Monitor[]}
 */
export function listMonitors() {
  return Array.from(activeMonitors.values()).map(_serializeMonitor);
}

/**
 * Remove a monitor and its data
 * @param {string} monitorId
 */
export function removeMonitor(monitorId) {
  stopMonitor(monitorId);
  activeMonitors.delete(monitorId);
}

// ============================================================================
// Polling logic
// ============================================================================

function _startPolling(monitor) {
  // Do first poll immediately
  _poll(monitor).catch(err => {
    console.error(`❌ Poll error for ${monitor.id}:`, err.message);
  });

  // Then poll on interval
  monitor.timer = setInterval(() => {
    if (monitor.status !== 'active') return;

    _poll(monitor).catch(err => {
      console.error(`❌ Poll error for ${monitor.id}:`, err.message);
    });
  }, monitor.intervalMs);
}

async function _poll(monitor) {
  monitor.stats.totalPolls++;
  monitor.lastPolledAt = new Date().toISOString();

  try {
    // Get search results
    const tweets = await _searchTweets(monitor);

    if (!tweets || tweets.length === 0) {
      return;
    }

    // Analyze sentiment for each tweet
    const texts = tweets.map(t => t.text || t.content || '');
    const sentimentResults = await analyzeBatch(texts, { mode: monitor.sentimentMode });

    // Create data points
    const newPoints = sentimentResults.map((result, i) => ({
      timestamp: tweets[i].timestamp || new Date().toISOString(),
      score: result.score,
      label: result.label,
      text: result.text,
      author: tweets[i].author || tweets[i].username || 'unknown',
      tweetUrl: tweets[i].url || null,
      keywords: result.keywords,
    }));

    // Add to history (cap at 10000 entries)
    monitor.history.push(...newPoints);
    if (monitor.history.length > 10000) {
      monitor.history = monitor.history.slice(-10000);
    }

    monitor.stats.totalTweets += newPoints.length;

    // Recompute stats
    _updateStats(monitor);

    // Check alerts
    const alertResults = checkAlerts(monitor, newPoints);
    if (alertResults.length > 0 && monitor._deps?.onAlert) {
      for (const alert of alertResults) {
        monitor._deps.onAlert(alert);
      }
    }
  } catch (error) {
    console.error(`❌ Polling failed for ${monitor.id}:`, error.message);
    // Implement backoff: double the interval on failure, up to 1hr
    if (monitor.intervalMs < 3600000) {
      monitor._backoffMs = (monitor._backoffMs || monitor.intervalMs) * 2;
    }
  }
}

async function _searchTweets(monitor) {
  // Use custom search function if provided (for testing)
  if (monitor._deps?.searchFn) {
    return await monitor._deps.searchFn(monitor.target, monitor.type);
  }

  // Try to use scrapers
  try {
    const scrapers = await import('../scrapers/index.js');
    const browser = await scrapers.createBrowser({ headless: true });
    const page = await scrapers.createPage(browser);

    let results;
    const target = monitor.target.replace(/^@/, '');

    if (monitor.type === 'mentions') {
      results = await scrapers.searchTweets(page, `@${target}`, { limit: 20 });
    } else if (monitor.type === 'keyword') {
      results = await scrapers.searchTweets(page, monitor.target, { limit: 20 });
    } else if (monitor.type === 'replies') {
      results = await scrapers.scrapeTweets(page, target, { limit: 20, includeReplies: true });
    } else {
      results = await scrapers.searchTweets(page, monitor.target, { limit: 20 });
    }

    await browser.close();
    return results || [];
  } catch (error) {
    console.error(`⚠️ Scraper unavailable for ${monitor.id}: ${error.message}`);
    return [];
  }
}

// ============================================================================
// Stats computation
// ============================================================================

function _updateStats(monitor) {
  const history = monitor.history;
  if (history.length === 0) return;

  // Rolling average of last 50 entries
  const recent = history.slice(-50);
  const scores = recent.map(dp => dp.score);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;

  // Trend: compare older half vs newer half
  const aggregate = aggregateResults(recent);

  // Volatility: standard deviation of scores
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  const volatility = Math.sqrt(variance);

  monitor.stats.rollingAverage = Math.round(avg * 1000) / 1000;
  monitor.stats.trend = aggregate.trend;
  monitor.stats.volatility = Math.round(volatility * 1000) / 1000;
  monitor.stats.distribution = aggregate.distribution;
}

// ============================================================================
// Serialization
// ============================================================================

function _serializeMonitor(monitor) {
  return {
    id: monitor.id,
    target: monitor.target,
    type: monitor.type,
    status: monitor.status,
    intervalMs: monitor.intervalMs,
    sentimentMode: monitor.sentimentMode,
    alertConfig: monitor.alertConfig,
    createdAt: monitor.createdAt,
    lastPolledAt: monitor.lastPolledAt,
    stats: monitor.stats,
    historyCount: monitor.history.length,
  };
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Stop all monitors (for graceful shutdown)
 */
export function stopAll() {
  for (const [id] of activeMonitors) {
    stopMonitor(id);
  }
  activeMonitors.clear();
}

export default {
  createMonitor,
  stopMonitor,
  getMonitor,
  getMonitorHistory,
  listMonitors,
  removeMonitor,
  stopAll,
};
