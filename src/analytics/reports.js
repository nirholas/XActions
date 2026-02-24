/**
 * XActions Report Generation
 * 
 * Daily/weekly summaries: sentiment distribution, top tweets, trend data.
 * Export: JSON, formatted Markdown.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { aggregateResults } from './sentiment.js';
import { getAlerts } from './alerts.js';

// ============================================================================
// Report generation
// ============================================================================

/**
 * Generate a reputation report for a monitor
 * 
 * @param {object} monitor - Serialized monitor object (from getMonitor)
 * @param {Array<{ timestamp: string, score: number, label: string, text: string, author: string }>} history - Data points
 * @param {object} [options]
 * @param {string} [options.period='7d'] - '24h', '7d', '30d', 'all'
 * @param {string} [options.format='json'] - 'json' or 'markdown'
 * @returns {{ report: object, markdown?: string }}
 */
export function generateReport(monitor, history, options = {}) {
  const period = options.period || '7d';
  const format = options.format || 'json';

  // Filter history by period
  const filteredHistory = _filterByPeriod(history, period);

  if (filteredHistory.length === 0) {
    const emptyReport = {
      target: monitor.target,
      period,
      generatedAt: new Date().toISOString(),
      totalMentions: 0,
      message: 'No data available for the requested period.',
    };
    return {
      report: emptyReport,
      markdown: format === 'markdown' ? _emptyMarkdown(monitor.target, period) : undefined,
    };
  }

  // Aggregate stats
  const aggregate = aggregateResults(filteredHistory);

  // Top positive tweets
  const topPositive = [...filteredHistory]
    .filter(dp => dp.label === 'positive')
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Top negative tweets
  const topNegative = [...filteredHistory]
    .filter(dp => dp.label === 'negative')
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  // Timeline data (grouped by hour for 24h, by day for 7d/30d)
  const timeline = _buildTimeline(filteredHistory, period);

  // Keyword frequency
  const keywordFreq = _keywordFrequency(filteredHistory);

  // Alerts during period
  const alerts = getAlerts({ monitorId: monitor.id, limit: 20 });
  const periodAlerts = _filterByPeriod(alerts, period);

  const report = {
    target: monitor.target,
    period,
    periodLabel: _periodLabel(period),
    generatedAt: new Date().toISOString(),
    summary: {
      totalMentions: filteredHistory.length,
      averageSentiment: aggregate.average,
      medianSentiment: aggregate.median,
      trend: aggregate.trend,
      volatility: monitor.stats?.volatility || 0,
      distribution: aggregate.distribution,
      distributionPercent: {
        positive: Math.round((aggregate.distribution.positive / filteredHistory.length) * 100),
        neutral: Math.round((aggregate.distribution.neutral / filteredHistory.length) * 100),
        negative: Math.round((aggregate.distribution.negative / filteredHistory.length) * 100),
      },
    },
    topPositive: topPositive.map(_formatTweet),
    topNegative: topNegative.map(_formatTweet),
    timeline,
    topKeywords: keywordFreq.slice(0, 15),
    alerts: periodAlerts.length,
    alertDetails: periodAlerts.slice(0, 10),
  };

  return {
    report,
    markdown: format === 'markdown' ? _toMarkdown(report) : undefined,
  };
}

// ============================================================================
// Timeline building
// ============================================================================

function _buildTimeline(history, period) {
  const buckets = new Map();

  for (const dp of history) {
    const date = new Date(dp.timestamp);
    let key;

    if (period === '24h') {
      key = `${date.getFullYear()}-${_pad(date.getMonth() + 1)}-${_pad(date.getDate())} ${_pad(date.getHours())}:00`;
    } else {
      key = `${date.getFullYear()}-${_pad(date.getMonth() + 1)}-${_pad(date.getDate())}`;
    }

    if (!buckets.has(key)) {
      buckets.set(key, { time: key, scores: [], count: 0 });
    }
    const bucket = buckets.get(key);
    bucket.scores.push(dp.score);
    bucket.count++;
  }

  return Array.from(buckets.values())
    .map(b => ({
      time: b.time,
      averageSentiment: Math.round((b.scores.reduce((s, v) => s + v, 0) / b.scores.length) * 1000) / 1000,
      mentions: b.count,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function _pad(n) {
  return String(n).padStart(2, '0');
}

// ============================================================================
// Keyword frequency
// ============================================================================

function _keywordFrequency(history) {
  const freq = new Map();

  for (const dp of history) {
    if (dp.keywords) {
      for (const kw of dp.keywords) {
        freq.set(kw, (freq.get(kw) || 0) + 1);
      }
    }
  }

  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// Helpers
// ============================================================================

function _filterByPeriod(items, period) {
  if (period === 'all') return items;

  const now = Date.now();
  const msMap = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
  const ms = msMap[period] || 604800000;

  return items.filter(item => {
    const ts = new Date(item.timestamp).getTime();
    return ts >= now - ms;
  });
}

function _periodLabel(period) {
  const labels = { '24h': 'Last 24 Hours', '7d': 'Last 7 Days', '30d': 'Last 30 Days', 'all': 'All Time' };
  return labels[period] || period;
}

function _formatTweet(dp) {
  return {
    text: dp.text?.slice(0, 280) || '',
    score: dp.score,
    label: dp.label,
    author: dp.author || 'unknown',
    timestamp: dp.timestamp,
    tweetUrl: dp.tweetUrl || null,
  };
}

// ============================================================================
// Markdown export
// ============================================================================

function _emptyMarkdown(target, period) {
  return `# 📊 Reputation Report: ${target}\n\n**Period:** ${_periodLabel(period)}\n**Generated:** ${new Date().toISOString()}\n\n> No data available for the requested period.\n`;
}

function _toMarkdown(report) {
  const r = report;
  const s = r.summary;

  let md = `# 📊 Reputation Report: ${r.target}\n\n`;
  md += `**Period:** ${r.periodLabel}  \n`;
  md += `**Generated:** ${r.generatedAt}  \n\n`;

  // Summary
  md += `## 📈 Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Mentions | ${s.totalMentions} |\n`;
  md += `| Average Sentiment | ${s.averageSentiment} |\n`;
  md += `| Median Sentiment | ${s.medianSentiment} |\n`;
  md += `| Trend | ${_trendEmoji(s.trend)} ${s.trend} |\n`;
  md += `| Volatility | ${s.volatility} |\n\n`;

  // Distribution
  md += `## 🎯 Sentiment Distribution\n\n`;
  md += `- 🟢 Positive: ${s.distribution.positive} (${s.distributionPercent.positive}%)\n`;
  md += `- ⚪ Neutral: ${s.distribution.neutral} (${s.distributionPercent.neutral}%)\n`;
  md += `- 🔴 Negative: ${s.distribution.negative} (${s.distributionPercent.negative}%)\n\n`;

  // Sentiment bar
  const barLen = 30;
  const posBar = Math.round((s.distributionPercent.positive / 100) * barLen);
  const neuBar = Math.round((s.distributionPercent.neutral / 100) * barLen);
  const negBar = barLen - posBar - neuBar;
  md += `\`${'🟢'.repeat(Math.max(posBar, 0))}${'⚪'.repeat(Math.max(neuBar, 0))}${'🔴'.repeat(Math.max(negBar, 0))}\`\n\n`;

  // Top Positive
  if (r.topPositive.length > 0) {
    md += `## ✅ Top Positive Mentions\n\n`;
    for (const t of r.topPositive) {
      md += `> **@${t.author}** (score: ${t.score})  \n`;
      md += `> ${t.text.slice(0, 200)}  \n`;
      if (t.tweetUrl) md += `> [View tweet](${t.tweetUrl})  \n`;
      md += `\n`;
    }
  }

  // Top Negative
  if (r.topNegative.length > 0) {
    md += `## ❌ Top Negative Mentions\n\n`;
    for (const t of r.topNegative) {
      md += `> **@${t.author}** (score: ${t.score})  \n`;
      md += `> ${t.text.slice(0, 200)}  \n`;
      if (t.tweetUrl) md += `> [View tweet](${t.tweetUrl})  \n`;
      md += `\n`;
    }
  }

  // Top Keywords
  if (r.topKeywords.length > 0) {
    md += `## 🔤 Top Keywords\n\n`;
    md += `| Keyword | Count |\n|---------|-------|\n`;
    for (const kw of r.topKeywords.slice(0, 10)) {
      md += `| ${kw.word} | ${kw.count} |\n`;
    }
    md += `\n`;
  }

  // Timeline
  if (r.timeline.length > 0) {
    md += `## 📅 Timeline\n\n`;
    md += `| Time | Avg Sentiment | Mentions |\n|------|---------------|----------|\n`;
    for (const tp of r.timeline.slice(-14)) {
      const sentIcon = tp.averageSentiment > 0.05 ? '🟢' : tp.averageSentiment < -0.05 ? '🔴' : '⚪';
      md += `| ${tp.time} | ${sentIcon} ${tp.averageSentiment} | ${tp.mentions} |\n`;
    }
    md += `\n`;
  }

  // Alerts
  if (r.alerts > 0) {
    md += `## 🚨 Alerts (${r.alerts})\n\n`;
    for (const a of r.alertDetails) {
      const icon = a.severity === 'critical' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️';
      md += `- ${icon} **${a.type}**: ${a.message} _(${a.timestamp})_\n`;
    }
    md += `\n`;
  }

  md += `---\n*Generated by [XActions](https://github.com/nirholas/XActions) — by [@nichxbt](https://x.com/nichxbt)*\n`;

  return md;
}

function _trendEmoji(trend) {
  if (trend === 'improving') return '📈';
  if (trend === 'declining') return '📉';
  return '➡️';
}

export default {
  generateReport,
};
