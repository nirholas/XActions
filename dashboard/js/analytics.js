/**
 * XActions Analytics Dashboard — Client-side JavaScript
 * 
 * Handles sentiment analysis UI, monitor management,
 * timeline charts, mentions feed, word cloud, and alerts.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

const API_BASE = window.location.origin + '/api/analytics';
let sentimentChart = null;
let socket = null;

// ============================================================================
// Tabs
// ============================================================================

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    // Load data when switching tabs
    if (tab.dataset.tab === 'monitors') loadMonitors();
    if (tab.dataset.tab === 'alerts') loadAlerts();
    if (tab.dataset.tab === 'timeline') refreshMonitorSelect();
  });
});

// ============================================================================
// Sentiment Analysis
// ============================================================================

async function analyzeSentiment() {
  const input = document.getElementById('sentimentInput').value.trim();
  const mode = document.getElementById('sentimentMode').value;
  const btn = document.getElementById('analyzeBtn');

  if (!input) return;

  btn.disabled = true;
  btn.textContent = 'Analyzing...';

  try {
    // Check if multi-line (batch mode)
    const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length > 1) {
      const res = await fetch(API_BASE + '/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: lines, mode }),
      });
      const data = await res.json();

      if (data.results) {
        showBatchResults(data.results);
        // Also show first result in the single panel
        showSingleResult(data.results[0]);
      }
    } else {
      const res = await fetch(API_BASE + '/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, mode }),
      });
      const data = await res.json();
      showSingleResult(data);
      document.getElementById('batchResultsCard').style.display = 'none';
    }
  } catch (err) {
    console.error('Sentiment analysis failed:', err);
    alert('Analysis failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze Sentiment';
  }
}

function showSingleResult(result) {
  const container = document.getElementById('sentimentResult');
  const badge = document.getElementById('resultBadge');
  const score = document.getElementById('resultScore');
  const confidence = document.getElementById('resultConfidence');
  const keywords = document.getElementById('resultKeywords');

  container.classList.add('show');

  const icons = { positive: '🟢', neutral: '⚪', negative: '🔴' };
  const classes = { positive: 'score-positive', neutral: 'score-neutral', negative: 'score-negative' };

  badge.className = 'score-badge ' + (classes[result.label] || 'score-neutral');
  badge.textContent = `${icons[result.label] || '⚪'} ${result.label.toUpperCase()}`;
  score.textContent = result.score;
  confidence.textContent = (result.confidence * 100).toFixed(0) + '%';

  if (result.keywords && result.keywords.length > 0) {
    keywords.innerHTML = result.keywords.map(kw =>
      `<span class="keyword-tag">${escapeHtml(kw)}</span>`
    ).join(' ');
  } else {
    keywords.innerHTML = '<span style="color: var(--text-secondary); font-size: 13px;">No keywords detected</span>';
  }
}

function showBatchResults(results) {
  const card = document.getElementById('batchResultsCard');
  const stats = document.getElementById('batchStats');
  const list = document.getElementById('batchList');

  card.style.display = 'block';

  const pos = results.filter(r => r.label === 'positive').length;
  const neu = results.filter(r => r.label === 'neutral').length;
  const neg = results.filter(r => r.label === 'negative').length;

  stats.innerHTML = `
    <div class="stat-card"><div class="stat-value stat-positive">${pos}</div><div class="stat-label">Positive</div></div>
    <div class="stat-card"><div class="stat-value stat-neutral">${neu}</div><div class="stat-label">Neutral</div></div>
    <div class="stat-card"><div class="stat-value stat-negative">${neg}</div><div class="stat-label">Negative</div></div>
  `;

  list.innerHTML = results.map(r => {
    const icon = r.label === 'positive' ? '🟢' : r.label === 'negative' ? '🔴' : '⚪';
    return `<div class="mention-item">
      <div class="mention-dot ${r.label}"></div>
      <div class="mention-text">${escapeHtml(r.text || '')}<div class="mention-meta">${r.keywords?.join(', ') || ''}</div></div>
      <div class="mention-score">${icon} ${r.score}</div>
    </div>`;
  }).join('');
}

// ============================================================================
// Monitors
// ============================================================================

async function startMonitor() {
  const target = document.getElementById('monitorTarget').value.trim();
  const type = document.getElementById('monitorType').value;
  const interval = parseInt(document.getElementById('monitorInterval').value) || 900;
  const threshold = parseFloat(document.getElementById('alertThreshold').value) || -0.3;
  const webhookUrl = document.getElementById('webhookUrl').value.trim();

  if (!target) { alert('Enter a username or keyword'); return; }

  try {
    const res = await fetch(API_BASE + '/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target,
        type,
        interval,
        sentimentMode: 'rules',
        alertConfig: { sentimentThreshold: threshold, webhookUrl: webhookUrl || undefined },
      }),
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById('monitorTarget').value = '';
      loadMonitors();
      refreshMonitorSelect();
    } else {
      alert('Error: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Failed to start monitor: ' + err.message);
  }
}

async function loadMonitors() {
  try {
    const res = await fetch(API_BASE + '/monitor');
    const data = await res.json();
    const container = document.getElementById('monitorsContainer');

    if (!data.monitors || data.monitors.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📡</div><div class="empty-state-text">No active monitors. Start one above.</div></div>';
      return;
    }

    container.innerHTML = `<table class="monitors-table">
      <thead><tr><th>Target</th><th>Type</th><th>Status</th><th>Data Points</th><th>Avg Sentiment</th><th>Trend</th><th></th></tr></thead>
      <tbody>
        ${data.monitors.map(m => `<tr>
          <td><strong>${escapeHtml(m.target)}</strong></td>
          <td>${m.type}</td>
          <td><span class="status-badge status-${m.status}">${m.status}</span></td>
          <td>${m.historyCount || 0}</td>
          <td>${m.stats?.rollingAverage ?? '—'}</td>
          <td>${trendIcon(m.stats?.trend)} ${m.stats?.trend || '—'}</td>
          <td><button class="btn btn-danger btn-sm" onclick="stopMonitor('${m.id}')">Stop</button></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch (err) {
    console.error('Failed to load monitors:', err);
  }
}

async function stopMonitor(id) {
  if (!confirm('Stop this monitor?')) return;
  try {
    await fetch(API_BASE + '/monitor/' + id, { method: 'DELETE' });
    loadMonitors();
    refreshMonitorSelect();
  } catch (err) {
    alert('Failed to stop monitor: ' + err.message);
  }
}

// ============================================================================
// Timeline
// ============================================================================

async function refreshMonitorSelect() {
  try {
    const res = await fetch(API_BASE + '/monitor');
    const data = await res.json();
    const select = document.getElementById('timelineMonitor');
    const current = select.value;

    select.innerHTML = '<option value="">Select a monitor...</option>';
    if (data.monitors) {
      data.monitors.forEach(m => {
        select.innerHTML += `<option value="${m.id}" ${m.id === current ? 'selected' : ''}>${escapeHtml(m.target)} (${m.type})</option>`;
      });
    }
  } catch (err) {
    console.error('Failed to refresh monitor select:', err);
  }
}

async function loadTimeline() {
  const monitorId = document.getElementById('timelineMonitor').value;
  const period = document.getElementById('timelinePeriod').value;

  if (!monitorId) return;

  try {
    const res = await fetch(`${API_BASE}/monitor/${monitorId}?limit=500`);
    const data = await res.json();

    if (!data.history || data.history.length === 0) {
      document.getElementById('mentionsFeed').innerHTML = '<div class="empty-state"><div class="empty-state-text">No data yet. Wait for the monitor to collect data.</div></div>';
      document.getElementById('wordCloud').innerHTML = '<div class="empty-state"><div class="empty-state-text">No keywords yet.</div></div>';
      document.getElementById('timelineStats').style.display = 'none';
      return;
    }

    // Filter by period
    const now = Date.now();
    const msMap = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
    const ms = msMap[period] || 604800000;
    const history = data.history.filter(dp => new Date(dp.timestamp).getTime() >= now - ms);

    renderTimeline(history, period);
    renderMentionsFeed(history);
    renderWordCloud(history);
    renderTimelineStats(history);
  } catch (err) {
    console.error('Failed to load timeline:', err);
  }
}

function renderTimeline(history, period) {
  const canvas = document.getElementById('sentimentChart');

  // Group by time bucket
  const buckets = new Map();
  history.forEach(dp => {
    const d = new Date(dp.timestamp);
    let key;
    if (period === '24h') {
      key = `${d.getHours()}:00`;
    } else {
      key = `${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(dp.score);
  });

  const labels = Array.from(buckets.keys());
  const avgScores = labels.map(k => {
    const scores = buckets.get(k);
    return scores.reduce((s, v) => s + v, 0) / scores.length;
  });
  const counts = labels.map(k => buckets.get(k).length);

  if (sentimentChart) sentimentChart.destroy();

  sentimentChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Avg Sentiment',
          data: avgScores,
          borderColor: '#1d9bf0',
          backgroundColor: 'rgba(29, 155, 240, 0.1)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Mentions',
          data: counts,
          borderColor: '#71767b',
          backgroundColor: 'rgba(113, 118, 123, 0.1)',
          type: 'bar',
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#e7e9ea' } },
      },
      scales: {
        x: { ticks: { color: '#71767b' }, grid: { color: '#2f3336' } },
        y: {
          type: 'linear',
          position: 'left',
          min: -1,
          max: 1,
          ticks: { color: '#1d9bf0' },
          grid: { color: '#2f3336' },
          title: { display: true, text: 'Sentiment', color: '#1d9bf0' },
        },
        y1: {
          type: 'linear',
          position: 'right',
          min: 0,
          ticks: { color: '#71767b' },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Mentions', color: '#71767b' },
        },
      },
    },
  });
}

function renderMentionsFeed(history) {
  const feed = document.getElementById('mentionsFeed');
  const recent = history.slice(-20).reverse();

  if (recent.length === 0) {
    feed.innerHTML = '<div class="empty-state"><div class="empty-state-text">No mentions yet</div></div>';
    return;
  }

  feed.innerHTML = recent.map(dp => {
    const icon = dp.label === 'positive' ? '🟢' : dp.label === 'negative' ? '🔴' : '⚪';
    return `<div class="mention-item">
      <div class="mention-dot ${dp.label}"></div>
      <div class="mention-text">
        ${escapeHtml(dp.text || '(no text)')}
        <div class="mention-meta">@${escapeHtml(dp.author || 'unknown')} · ${formatTime(dp.timestamp)}</div>
      </div>
      <div class="mention-score">${icon} ${dp.score}</div>
    </div>`;
  }).join('');
}

function renderWordCloud(history) {
  const cloud = document.getElementById('wordCloud');
  const freq = new Map();

  history.forEach(dp => {
    if (dp.keywords) {
      dp.keywords.forEach(kw => freq.set(kw, (freq.get(kw) || 0) + 1));
    }
  });

  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 30);

  if (sorted.length === 0) {
    cloud.innerHTML = '<div class="empty-state"><div class="empty-state-text">No keywords yet</div></div>';
    return;
  }

  const maxCount = sorted[0][1];
  cloud.innerHTML = sorted.map(([word, count]) => {
    const size = 12 + Math.round((count / maxCount) * 20);
    const opacity = 0.5 + (count / maxCount) * 0.5;
    const colors = ['#1d9bf0', '#00ba7c', '#ffad1f', '#f4212e', '#e7e9ea'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return `<span class="word-cloud-item" style="font-size: ${size}px; opacity: ${opacity}; color: ${color};" title="${count} occurrences">${escapeHtml(word)}</span>`;
  }).join('');
}

function renderTimelineStats(history) {
  const statsEl = document.getElementById('timelineStats');
  statsEl.style.display = 'grid';

  const pos = history.filter(dp => dp.label === 'positive').length;
  const neu = history.filter(dp => dp.label === 'neutral').length;
  const neg = history.filter(dp => dp.label === 'negative').length;

  document.getElementById('statPositive').textContent = pos;
  document.getElementById('statNeutral').textContent = neu;
  document.getElementById('statNegative').textContent = neg;
}

// ============================================================================
// Alerts
// ============================================================================

async function loadAlerts() {
  try {
    const res = await fetch(API_BASE + '/alerts?limit=50');
    const data = await res.json();
    const container = document.getElementById('alertsContainer');

    if (!data.alerts || data.alerts.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-text">No alerts yet. Alerts trigger when sentiment drops below threshold or mention volume spikes.</div></div>';
      return;
    }

    container.innerHTML = data.alerts.reverse().map(a => {
      const icon = a.severity === 'critical' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️';
      const bgColor = a.severity === 'critical' ? 'rgba(244, 33, 46, 0.08)' : a.severity === 'warning' ? 'rgba(255, 173, 31, 0.08)' : 'rgba(29, 155, 240, 0.08)';
      return `<div style="padding: 12px 16px; border-radius: 12px; background: ${bgColor}; margin-bottom: 8px; border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span>${icon}</span>
          <strong style="font-size: 14px;">${escapeHtml(a.type)}</strong>
          <span class="status-badge status-${a.severity === 'critical' ? 'stopped' : 'active'}">${a.severity}</span>
          <span style="margin-left: auto; font-size: 12px; color: var(--text-secondary);">${formatTime(a.timestamp)}</span>
        </div>
        <div style="font-size: 14px; color: var(--text-primary);">${escapeHtml(a.message)}</div>
      </div>`;
    }).join('');
  } catch (err) {
    console.error('Failed to load alerts:', err);
  }
}

// ============================================================================
// Socket.IO (real-time updates)
// ============================================================================

function initSocket() {
  try {
    socket = io(window.location.origin, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('📊 Analytics socket connected');
    });

    socket.on('analytics:alert', (alert) => {
      console.log('🚨 Alert received:', alert);
      // Refresh alerts tab if active
      const alertsTab = document.querySelector('.tab[data-tab="alerts"]');
      if (alertsTab && alertsTab.classList.contains('active')) {
        loadAlerts();
      }
      // Show notification
      showNotification(alert);
    });
  } catch (err) {
    console.log('Socket.IO not available — real-time updates disabled');
  }
}

function showNotification(alert) {
  const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;background:#16181c;border:1px solid #2f3336;border-radius:12px;padding:16px;max-width:350px;box-shadow:0 4px 12px rgba(0,0,0,0.5);animation:slideIn 0.3s;';
  div.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">${icon} ${escapeHtml(alert.type)}</div><div style="font-size:13px;color:#71767b;">${escapeHtml(alert.message)}</div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return d.toLocaleDateString();
}

function trendIcon(trend) {
  if (trend === 'improving') return '📈';
  if (trend === 'declining') return '📉';
  return '➡️';
}

// ============================================================================
// Init
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  // Allow Enter key to trigger analysis
  document.getElementById('sentimentInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) analyzeSentiment();
  });
});
