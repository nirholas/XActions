/**
 * XActions Alert System
 * 
 * Threshold alerts (sentiment drops below configurable value)
 * Volume alerts (unusual spike in mentions)
 * Delivery: console log, webhook POST, Socket.IO event
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Alert types
// ============================================================================

/**
 * @typedef {Object} Alert
 * @property {string} id
 * @property {string} type - 'sentiment_threshold' | 'volume_spike' | 'anomaly'
 * @property {string} severity - 'info' | 'warning' | 'critical'
 * @property {string} message - Human-readable description
 * @property {string} monitorId
 * @property {string} target
 * @property {object} data - Alert-specific data
 * @property {string} timestamp
 */

let alertIdCounter = 1;

/** @type {Alert[]} */
const alertHistory = [];

// ============================================================================
// Alert checking
// ============================================================================

/**
 * Check for alert conditions given a monitor and new data points
 * @param {object} monitor - The monitor object
 * @param {Array<{ score: number, label: string, text: string }>} newPoints - New data points
 * @returns {Alert[]} - Generated alerts
 */
export function checkAlerts(monitor, newPoints) {
  const alerts = [];

  if (!newPoints || newPoints.length === 0) return alerts;

  const config = monitor.alertConfig || {};

  // 1. Sentiment threshold alert
  const thresholdAlert = _checkSentimentThreshold(monitor, newPoints, config);
  if (thresholdAlert) alerts.push(thresholdAlert);

  // 2. Volume spike alert
  const volumeAlert = _checkVolumeSpike(monitor, newPoints, config);
  if (volumeAlert) alerts.push(volumeAlert);

  // 3. Anomaly detection (sudden negative shift)
  const anomalyAlert = _checkAnomaly(monitor, newPoints);
  if (anomalyAlert) alerts.push(anomalyAlert);

  // Deliver alerts
  for (const alert of alerts) {
    _deliverAlert(alert, config);
    alertHistory.push(alert);
  }

  // Cap alert history
  if (alertHistory.length > 1000) {
    alertHistory.splice(0, alertHistory.length - 1000);
  }

  return alerts;
}

// ============================================================================
// Alert condition checks
// ============================================================================

function _checkSentimentThreshold(monitor, newPoints, config) {
  const threshold = config.sentimentThreshold ?? -0.3;

  // Compute average of new points
  const avgScore = newPoints.reduce((sum, p) => sum + p.score, 0) / newPoints.length;

  if (avgScore < threshold) {
    const negativeCount = newPoints.filter(p => p.label === 'negative').length;

    return _createAlert({
      type: 'sentiment_threshold',
      severity: avgScore < -0.6 ? 'critical' : 'warning',
      message: `Sentiment for "${monitor.target}" dropped to ${avgScore.toFixed(3)} (threshold: ${threshold}). ${negativeCount}/${newPoints.length} negative mentions.`,
      monitorId: monitor.id,
      target: monitor.target,
      data: {
        averageScore: Math.round(avgScore * 1000) / 1000,
        threshold,
        negativeCount,
        totalCount: newPoints.length,
        worstTweet: newPoints.reduce((w, p) => p.score < w.score ? p : w, newPoints[0]),
      },
    });
  }

  return null;
}

function _checkVolumeSpike(monitor, newPoints, config) {
  const multiplier = config.volumeMultiplier ?? 3;
  const history = monitor.history || [];

  if (history.length < 20) return null; // Not enough data for baseline

  // Calculate average volume per poll (using history length / total polls)
  const totalPolls = monitor.stats?.totalPolls || 1;
  const avgPerPoll = (history.length - newPoints.length) / Math.max(totalPolls - 1, 1);

  if (newPoints.length > avgPerPoll * multiplier && avgPerPoll > 0) {
    return _createAlert({
      type: 'volume_spike',
      severity: newPoints.length > avgPerPoll * multiplier * 2 ? 'critical' : 'warning',
      message: `Mention volume spike for "${monitor.target}": ${newPoints.length} mentions (avg: ${Math.round(avgPerPoll)}). ${(newPoints.length / avgPerPoll).toFixed(1)}x normal.`,
      monitorId: monitor.id,
      target: monitor.target,
      data: {
        currentVolume: newPoints.length,
        averageVolume: Math.round(avgPerPoll),
        multiplier: Math.round((newPoints.length / avgPerPoll) * 10) / 10,
        threshold: multiplier,
      },
    });
  }

  return null;
}

function _checkAnomaly(monitor, newPoints) {
  const history = monitor.history || [];
  if (history.length < 30) return null; // Need baseline

  // Recent baseline: average of last 30 entries before these new ones
  const baseline = history.slice(-30 - newPoints.length, -newPoints.length || undefined);
  if (baseline.length < 10) return null;

  const baselineAvg = baseline.reduce((s, p) => s + p.score, 0) / baseline.length;
  const newAvg = newPoints.reduce((s, p) => s + p.score, 0) / newPoints.length;

  // Standard deviation of baseline
  const baselineStd = Math.sqrt(
    baseline.reduce((s, p) => s + Math.pow(p.score - baselineAvg, 2), 0) / baseline.length
  );

  // Anomaly: new average is more than 2 standard deviations below baseline
  const zScore = baselineStd > 0 ? (newAvg - baselineAvg) / baselineStd : 0;

  if (zScore < -2) {
    return _createAlert({
      type: 'anomaly',
      severity: zScore < -3 ? 'critical' : 'warning',
      message: `Anomaly detected for "${monitor.target}": sentiment shifted from ${baselineAvg.toFixed(3)} to ${newAvg.toFixed(3)} (${zScore.toFixed(1)} standard deviations).`,
      monitorId: monitor.id,
      target: monitor.target,
      data: {
        baselineAverage: Math.round(baselineAvg * 1000) / 1000,
        currentAverage: Math.round(newAvg * 1000) / 1000,
        zScore: Math.round(zScore * 100) / 100,
        baselineStd: Math.round(baselineStd * 1000) / 1000,
      },
    });
  }

  return null;
}

// ============================================================================
// Alert creation and delivery
// ============================================================================

function _createAlert({ type, severity, message, monitorId, target, data }) {
  return {
    id: `alert_${alertIdCounter++}_${Date.now()}`,
    type,
    severity,
    message,
    monitorId,
    target,
    data,
    timestamp: new Date().toISOString(),
  };
}

async function _deliverAlert(alert, config) {
  // Console delivery (always)
  const icon = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [${alert.type}] ${alert.message}`);

  // Webhook delivery
  if (config.webhookUrl) {
    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'xactions.alert',
          alert,
        }),
      });
    } catch (err) {
      console.error(`❌ Webhook delivery failed: ${err.message}`);
    }
  }

  // Socket.IO delivery is handled by the API layer (emits to room)
}

// ============================================================================
// Alert history access
// ============================================================================

/**
 * Get recent alerts
 * @param {object} [options]
 * @param {string} [options.monitorId] - Filter by monitor
 * @param {string} [options.severity] - Filter by severity
 * @param {number} [options.limit=50]
 * @returns {Alert[]}
 */
export function getAlerts(options = {}) {
  let alerts = [...alertHistory];

  if (options.monitorId) {
    alerts = alerts.filter(a => a.monitorId === options.monitorId);
  }
  if (options.severity) {
    alerts = alerts.filter(a => a.severity === options.severity);
  }

  const limit = options.limit || 50;
  return alerts.slice(-limit);
}

/**
 * Clear alert history
 */
export function clearAlerts() {
  alertHistory.length = 0;
}

export default {
  checkAlerts,
  getAlerts,
  clearAlerts,
};
