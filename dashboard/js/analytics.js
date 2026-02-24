/**
 * XActions Analytics Dashboard — Client-side JavaScript
 * 
 * Enhanced with: sentiment gauge, comparison mode, donut charts,
 * toast notifications, export, auto-refresh, search/filter, keyboard shortcuts.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

const API_BASE = window.location.origin + '/api/analytics';
let sentimentChart = null;
let batchDonutChart = null;
let socket = null;
let autoRefreshTimer = null;
let lastBatchResults = null;
let lastTimelineData = null;
let lastMentionsData = null;
let compareMode = false;

// ============================================================================
// Toast Notification System
// ============================================================================

function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
    <span style="font-size: 16px; margin-top: 1px;">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================================
// Tabs
// ============================================================================

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    // Load data when switching tabs
    if (tab.dataset.tab === 'monitors') loadMonitors();
    if (tab.dataset.tab === 'alerts') loadAlerts();
    if (tab.dataset.tab === 'timeline') refreshMonitorSelect();
  });
});

// ============================================================================
// Sentiment Gauge
// ============================================================================

function updateGauge(score) {
  const needle = document.getElementById('gaugeNeedle');
  const value = document.getElementById('gaugeValue');
  if (!needle || !value) return;

  // score -1 to 1 → angle -90 to 90
  const angle = score * 90;
  needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
  value.textContent = score > 0 ? `+${score.toFixed(3)}` : score.toFixed(3);

  const color = score > 0.05 ? 'var(--positive)' : score < -0.05 ? 'var(--negative)' : 'var(--neutral)';
  value.style.color = color;
}

// ============================================================================
// Compare Mode
// ============================================================================

function toggleCompareMode() {
  const toggle = document.getElementById('compareModeToggle');
  compareMode = !compareMode;
  toggle.classList.toggle('active', compareMode);

  document.getElementById('singleMode').style.display = compareMode ? 'none' : 'block';
  document.getElementById('compareMode').style.display = compareMode ? 'block' : 'none';
  document.getElementById('comparisonResult').style.display = 'none';
  document.getElementById('sentimentResult').classList.remove('show');
}

function renderComparisonPanel(panelEl, result, label) {
  const icons = { positive: '🟢', neutral: '⚪', negative: '🔴' };
  const classes = { positive: 'score-positive', neutral: 'score-neutral', negative: 'score-negative' };

  panelEl.innerHTML = `
    <div class="panel-label">${label}</div>
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
      <span class="score-badge ${classes[result.label] || 'score-neutral'}">${icons[result.label] || '⚪'} ${result.label.toUpperCase()}</span>
      <span style="font-size: 20px; font-weight: 800;">${result.score > 0 ? '+' : ''}${result.score.toFixed(3)}</span>
    </div>
    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">
      Confidence: ${(result.confidence * 100).toFixed(0)}%
    </div>
    <div class="confidence-bar">
      <div class="confidence-fill" style="width: ${result.confidence * 100}%; background: var(--accent);"></div>
    </div>
    ${result.keywords?.length ? `<div style="margin-top: 8px;">${result.keywords.map(kw => `<span class="keyword-tag">${escapeHtml(kw)}</span>`).join(' ')}</div>` : ''}
  `;
}

// ============================================================================
// Sentiment Analysis
// ============================================================================

async function analyzeSentiment() {
  const mode = document.getElementById('sentimentMode').value;
  const btn = document.getElementById('analyzeBtn');
  const btnText = document.getElementById('analyzeBtnText');
  const loadingSkeleton = document.getElementById('analyzeLoading');

  // Compare mode
  if (compareMode) {
    const textA = document.getElementById('compareInputA').value.trim();
    const textB = document.getElementById('compareInputB').value.trim();
    if (!textA || !textB) {
      showToast('Missing text', 'Enter text in both panels to compare', 'warning');
      return;
    }

    btn.disabled = true;
    btnText.textContent = 'Comparing...';
    loadingSkeleton.style.display = 'block';

    try {
      const res = await fetch(API_BASE + '/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [textA, textB], mode }),
      });
      const data = await res.json();

      if (data.results && data.results.length >= 2) {
        lastBatchResults = data.results;
        document.getElementById('comparisonResult').style.display = 'block';
        document.getElementById('sentimentResult').classList.remove('show');
        renderComparisonPanel(document.getElementById('compareResultA'), data.results[0], 'Text A');
        renderComparisonPanel(document.getElementById('compareResultB'), data.results[1], 'Text B');
        document.getElementById('resultExportMenu').style.display = 'inline-block';
        showToast('Comparison complete', `A: ${data.results[0].label} (${data.results[0].score}) vs B: ${data.results[1].label} (${data.results[1].score})`, 'success');
      }
    } catch (err) {
      showToast('Analysis failed', err.message, 'error');
    } finally {
      btn.disabled = false;
      btnText.textContent = 'Analyze';
      loadingSkeleton.style.display = 'none';
    }
    return;
  }

  // Normal mode
  const input = document.getElementById('sentimentInput').value.trim();
  if (!input) {
    showToast('Empty input', 'Enter some text to analyze', 'warning');
    return;
  }

  btn.disabled = true;
  btnText.textContent = 'Analyzing...';
  loadingSkeleton.style.display = 'block';

  try {
    const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length > 1) {
      const res = await fetch(API_BASE + '/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: lines, mode }),
      });
      const data = await res.json();

      if (data.results) {
        lastBatchResults = data.results;
        showBatchResults(data.results);
        showSingleResult(data.results[0]);
        showToast('Batch analysis complete', `${data.results.length} texts analyzed`, 'success');
      }
    } else {
      const res = await fetch(API_BASE + '/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, mode }),
      });
      const data = await res.json();
      lastBatchResults = [data];
      showSingleResult(data);
      document.getElementById('batchResultsCard').style.display = 'none';
      showToast('Analysis complete', `${data.label} (${data.score})`, 'success');
    }

    document.getElementById('resultExportMenu').style.display = 'inline-block';
  } catch (err) {
    showToast('Analysis failed', err.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Analyze';
    loadingSkeleton.style.display = 'none';
  }
}

function showSingleResult(result) {
  const container = document.getElementById('sentimentResult');
  const badge = document.getElementById('resultBadge');
  const score = document.getElementById('resultScore');
  const confidence = document.getElementById('resultConfidence');
  const keywords = document.getElementById('resultKeywords');
  const confidenceFill = document.getElementById('confidenceFill');

  container.classList.add('show');
  document.getElementById('comparisonResult').style.display = 'none';

  const icons = { positive: '🟢', neutral: '⚪', negative: '🔴' };
  const classes = { positive: 'score-positive', neutral: 'score-neutral', negative: 'score-negative' };

  badge.className = 'score-badge ' + (classes[result.label] || 'score-neutral');
  badge.textContent = `${icons[result.label] || '⚪'} ${result.label.toUpperCase()}`;
  score.textContent = result.score > 0 ? `+${result.score}` : result.score;
  confidence.textContent = (result.confidence * 100).toFixed(0) + '%';

  // Update confidence bar
  confidenceFill.style.width = (result.confidence * 100) + '%';
  const confColor = result.confidence > 0.6 ? 'var(--positive)' : result.confidence > 0.3 ? 'var(--warning)' : 'var(--neutral)';
  confidenceFill.style.background = confColor;

  // Update gauge
  updateGauge(result.score);

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

  card.style.display = 'block';
  document.getElementById('batchFilter').style.display = 'flex';

  const pos = results.filter(r => r.label === 'positive').length;
  const neu = results.filter(r => r.label === 'neutral').length;
  const neg = results.filter(r => r.label === 'negative').length;

  stats.innerHTML = `
    <div class="stat-card"><div class="stat-value stat-positive">${pos}</div><div class="stat-label">Positive</div></div>
    <div class="stat-card"><div class="stat-value stat-neutral">${neu}</div><div class="stat-label">Neutral</div></div>
    <div class="stat-card"><div class="stat-value stat-negative">${neg}</div><div class="stat-label">Negative</div></div>
  `;

  // Render donut chart
  renderBatchDonut(pos, neu, neg);
  renderBatchList(results);
}

function renderBatchList(results) {
  const list = document.getElementById('batchList');
  list.innerHTML = results.map((r) => {
    const icon = r.label === 'positive' ? '🟢' : r.label === 'negative' ? '🔴' : '⚪';
    return `<div class="mention-item" data-label="${r.label}" data-text="${escapeHtml(r.text || '')}">
      <div class="mention-dot ${r.label}"></div>
      <div class="mention-text">
        ${escapeHtml(r.text || '')}
        <div class="mention-meta">${r.keywords?.join(', ') || ''}</div>
      </div>
      <div class="mention-score">${icon} ${r.score}</div>
    </div>`;
  }).join('');
}

function filterBatchResults() {
  if (!lastBatchResults) return;
  const search = document.getElementById('batchSearchInput').value.toLowerCase();
  const label = document.getElementById('batchFilterLabel').value;

  let filtered = lastBatchResults;
  if (label !== 'all') filtered = filtered.filter(r => r.label === label);
  if (search) filtered = filtered.filter(r => (r.text || '').toLowerCase().includes(search));

  renderBatchList(filtered);
}

function renderBatchDonut(pos, neu, neg) {
  const container = document.getElementById('batchDonutContainer');
  const legend = document.getElementById('batchDonutLegend');
  const canvas = document.getElementById('batchDonutChart');
  container.style.display = 'flex';

  const total = pos + neu + neg;
  legend.innerHTML = `
    <div class="legend-item"><span class="legend-dot" style="background: var(--positive);"></span> Positive: ${pos} (${total ? Math.round(pos/total*100) : 0}%)</div>
    <div class="legend-item"><span class="legend-dot" style="background: var(--neutral);"></span> Neutral: ${neu} (${total ? Math.round(neu/total*100) : 0}%)</div>
    <div class="legend-item"><span class="legend-dot" style="background: var(--negative);"></span> Negative: ${neg} (${total ? Math.round(neg/total*100) : 0}%)</div>
  `;

  if (batchDonutChart) batchDonutChart.destroy();

  batchDonutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: [pos, neu, neg],
        backgroundColor: ['#00ba7c', '#8b8f94', '#f4212e'],
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      }],
    },
    options: {
      responsive: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#16181c',
          borderColor: '#2f3336',
          borderWidth: 1,
          titleColor: '#e7e9ea',
          bodyColor: '#8b8f94',
        },
      },
    },
  });
}

// ============================================================================
// Export Functionality
// ============================================================================

function toggleExportMenu(menuId) {
  const dropdown = document.getElementById(menuId + 'Dropdown');
  document.querySelectorAll('.export-dropdown').forEach(d => {
    if (d.id !== menuId + 'Dropdown') d.classList.remove('show');
  });
  dropdown.classList.toggle('show');
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.export-menu')) {
    document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('show'));
  }
});

function exportResults(format) {
  if (!lastBatchResults || lastBatchResults.length === 0) {
    showToast('Nothing to export', 'Run an analysis first', 'warning');
    return;
  }

  document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('show'));

  if (format === 'json') {
    const json = JSON.stringify(lastBatchResults, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showToast('Copied', 'JSON copied to clipboard', 'success');
    }).catch(() => {
      downloadFile('sentiment-results.json', json, 'application/json');
    });
  } else if (format === 'csv') {
    const header = 'text,score,label,confidence,keywords\n';
    const rows = lastBatchResults.map(r =>
      `"${(r.text || '').replace(/"/g, '""')}",${r.score},${r.label},${r.confidence},"${(r.keywords || []).join(';')}"`
    ).join('\n');
    downloadFile('sentiment-results.csv', header + rows, 'text/csv');
    showToast('Downloaded', 'CSV file downloaded', 'success');
  } else if (format === 'text') {
    const text = lastBatchResults.map(r =>
      `[${r.label.toUpperCase()}] (${r.score}) ${r.text || ''}`
    ).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied', 'Text copied to clipboard', 'success');
    });
  }
}

function exportTimeline(format) {
  if (!lastTimelineData || lastTimelineData.length === 0) {
    showToast('Nothing to export', 'Load a timeline first', 'warning');
    return;
  }

  document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('show'));

  if (format === 'csv') {
    const header = 'timestamp,score,label,author,text,keywords\n';
    const rows = lastTimelineData.map(dp =>
      `"${dp.timestamp}",${dp.score},${dp.label},"${escapeHtml(dp.author || '')}","${(dp.text || '').replace(/"/g, '""')}","${(dp.keywords || []).join(';')}"`
    ).join('\n');
    downloadFile('timeline-export.csv', header + rows, 'text/csv');
    showToast('Downloaded', 'Timeline CSV exported', 'success');
  } else if (format === 'json') {
    const json = JSON.stringify(lastTimelineData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showToast('Copied', 'Timeline JSON copied to clipboard', 'success');
    });
  } else if (format === 'markdown') {
    const target = document.getElementById('timelineMonitor').selectedOptions[0]?.textContent?.split(' (')[0] || '';
    const period = document.getElementById('timelinePeriod').value;
    fetch(`${API_BASE}/reports/${encodeURIComponent(target.replace('@', ''))}?period=${period}&format=markdown`)
      .then(res => res.text())
      .then(md => {
        downloadFile('reputation-report.md', md, 'text/markdown');
        showToast('Downloaded', 'Markdown report exported', 'success');
      })
      .catch(err => showToast('Export failed', err.message, 'error'));
  }
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

  if (!target) {
    showToast('Missing target', 'Enter a @username or keyword to monitor', 'warning');
    return;
  }

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
      showToast('Monitor started', `Tracking ${type} for ${target}`, 'success');
    } else {
      showToast('Error', data.error || 'Failed to start monitor', 'error');
    }
  } catch (err) {
    showToast('Connection error', err.message, 'error');
  }
}

async function loadMonitors() {
  try {
    const res = await fetch(API_BASE + '/monitor');
    const data = await res.json();
    const container = document.getElementById('monitorsContainer');

    if (!data.monitors || data.monitors.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📡</div>
        <div class="empty-state-text">No active monitors yet</div>
        <p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">Enter a @username or keyword above and click Start Monitor.</p>
      </div>`;
      return;
    }

    container.innerHTML = `<table class="monitors-table">
      <thead><tr><th>Target</th><th>Type</th><th>Status</th><th>Data Points</th><th>Avg Sentiment</th><th>Trend</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.monitors.map(m => {
          const avgColor = (m.stats?.rollingAverage || 0) > 0.05 ? 'var(--positive)' : (m.stats?.rollingAverage || 0) < -0.05 ? 'var(--negative)' : 'var(--neutral)';
          return `<tr>
            <td><strong>${escapeHtml(m.target)}</strong></td>
            <td>${m.type}</td>
            <td><span class="status-badge status-${m.status}">${m.status}</span></td>
            <td>${m.historyCount || 0}</td>
            <td style="color: ${avgColor}; font-weight: 700;">${m.stats?.rollingAverage ?? '—'}</td>
            <td>${trendIcon(m.stats?.trend)} ${m.stats?.trend || '—'}</td>
            <td style="display: flex; gap: 4px;">
              <button class="btn btn-danger btn-sm" onclick="deleteMonitor('${m.id}')" title="Stop & remove">🗑️</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  } catch (err) {
    showToast('Failed to load monitors', err.message, 'error');
  }
}

async function deleteMonitor(id) {
  try {
    await fetch(API_BASE + '/monitor/' + id, { method: 'DELETE' });
    loadMonitors();
    refreshMonitorSelect();
    showToast('Monitor removed', '', 'success');
  } catch (err) {
    showToast('Failed to remove monitor', err.message, 'error');
  }
}

// Keep old name for backwards compat
const stopMonitor = deleteMonitor;

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
      document.getElementById('mentionsFeed').innerHTML = '<div class="empty-state"><div class="empty-state-text">No data yet — waiting for monitor to collect data.</div></div>';
      document.getElementById('wordCloud').innerHTML = '<div class="empty-state"><div class="empty-state-text">No keywords yet.</div></div>';
      document.getElementById('timelineStats').style.display = 'none';
      return;
    }

    // Filter by period
    const now = Date.now();
    const msMap = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
    const ms = msMap[period] || 604800000;
    const history = data.history.filter(dp => new Date(dp.timestamp).getTime() >= now - ms);

    lastTimelineData = history;
    lastMentionsData = history;

    renderTimeline(history, period);
    renderMentionsFeed(history);
    renderWordCloud(history);
    renderTimelineStats(history);
  } catch (err) {
    showToast('Failed to load timeline', err.message, 'error');
  }
}

function renderTimeline(history, period) {
  const canvas = document.getElementById('sentimentChart');

  const buckets = new Map();
  history.forEach(dp => {
    const d = new Date(dp.timestamp);
    let key;
    if (period === '24h') {
      key = `${String(d.getHours()).padStart(2, '0')}:00`;
    } else {
      key = `${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(dp.score);
  });

  const labels = Array.from(buckets.keys());
  const avgScores = labels.map(k => {
    const scores = buckets.get(k);
    return Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 1000) / 1000;
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
          pointRadius: 3,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'Mentions',
          data: counts,
          borderColor: 'rgba(113, 118, 123, 0.5)',
          backgroundColor: 'rgba(113, 118, 123, 0.15)',
          type: 'bar',
          yAxisID: 'y1',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#e7e9ea', usePointStyle: true } },
        tooltip: {
          backgroundColor: '#16181c',
          borderColor: '#2f3336',
          borderWidth: 1,
          titleColor: '#e7e9ea',
          bodyColor: '#8b8f94',
          padding: 12,
          cornerRadius: 8,
        },
      },
      scales: {
        x: { ticks: { color: '#71767b', maxRotation: 45 }, grid: { color: 'rgba(47, 51, 54, 0.5)' } },
        y: {
          type: 'linear',
          position: 'left',
          min: -1,
          max: 1,
          ticks: { color: '#1d9bf0' },
          grid: { color: 'rgba(47, 51, 54, 0.5)' },
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
  const recent = history.slice(-30).reverse();

  if (recent.length === 0) {
    feed.innerHTML = '<div class="empty-state"><div class="empty-state-text">No mentions yet</div></div>';
    return;
  }

  feed.innerHTML = recent.map(dp => {
    const icon = dp.label === 'positive' ? '🟢' : dp.label === 'negative' ? '🔴' : '⚪';
    return `<div class="mention-item" data-text="${escapeHtml(dp.text || '')}" data-label="${dp.label}">
      <div class="mention-dot ${dp.label}"></div>
      <div class="mention-text">
        ${escapeHtml(dp.text || '(no text)')}
        <div class="mention-meta">@${escapeHtml(dp.author || 'unknown')} · ${formatTime(dp.timestamp)}</div>
      </div>
      <div class="mention-score">${icon} ${dp.score}</div>
    </div>`;
  }).join('');
}

function filterMentions() {
  if (!lastMentionsData) return;
  const search = document.getElementById('mentionsSearch').value.toLowerCase();
  const filtered = search
    ? lastMentionsData.filter(dp => (dp.text || '').toLowerCase().includes(search) || (dp.author || '').toLowerCase().includes(search))
    : lastMentionsData;
  renderMentionsFeed(filtered);
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
    const colors = ['#1d9bf0', '#00ba7c', '#ffad1f', '#f4212e', '#794bc4'];
    const color = colors[hashCode(word) % colors.length];
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
// Auto-Refresh
// ============================================================================

function toggleAutoRefresh() {
  const toggle = document.getElementById('autoRefreshToggle');
  const isActive = toggle.classList.toggle('active');

  if (isActive) {
    autoRefreshTimer = setInterval(() => {
      const monitorId = document.getElementById('timelineMonitor').value;
      if (monitorId) loadTimeline();
    }, 30000);
    showToast('Auto-refresh on', 'Timeline refreshes every 30 seconds', 'info', 2000);
  } else {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
    showToast('Auto-refresh off', '', 'info', 2000);
  }
}

// ============================================================================
// Alerts
// ============================================================================

async function loadAlerts() {
  try {
    const severity = document.getElementById('alertSeverityFilter')?.value || '';
    const url = severity
      ? `${API_BASE}/alerts?severity=${severity}&limit=50`
      : `${API_BASE}/alerts?limit=50`;

    const res = await fetch(url);
    const data = await res.json();
    const container = document.getElementById('alertsContainer');

    if (!data.alerts || data.alerts.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-text">No alerts${severity ? ` with severity "${severity}"` : ''}</div>
        <p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">Alerts trigger when sentiment drops below threshold, mention volume spikes, or anomalies are detected.</p>
      </div>`;
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
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Monitor: ${escapeHtml(a.target || '')}</div>
      </div>`;
    }).join('');
  } catch (err) {
    showToast('Failed to load alerts', err.message, 'error');
  }
}

// ============================================================================
// Socket.IO (real-time updates)
// ============================================================================

function initSocket() {
  try {
    if (typeof io === 'undefined') {
      console.log('Socket.IO not loaded — real-time updates disabled');
      return;
    }

    socket = io(window.location.origin, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('📊 Analytics socket connected');
    });

    socket.on('analytics:alert', (alert) => {
      console.log('🚨 Alert received:', alert);
      const alertsTab = document.querySelector('.tab[data-tab="alerts"]');
      if (alertsTab && alertsTab.classList.contains('active')) {
        loadAlerts();
      }
      const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
      showToast(`${icon} ${alert.type}`, alert.message, alert.severity === 'critical' ? 'error' : 'warning', 6000);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`XActions Alert: ${alert.type}`, { body: alert.message });
      }
    });
  } catch (err) {
    console.log('Socket.IO not available — real-time updates disabled');
  }
}

function requestNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
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

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter → Analyze
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    analyzeSentiment();
  }

  // Escape → close export menus
  if (e.key === 'Escape') {
    document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('show'));
  }

  // Alt+1..4 → switch tabs
  if (e.altKey && e.key >= '1' && e.key <= '4') {
    e.preventDefault();
    const tabs = document.querySelectorAll('.tab');
    const idx = parseInt(e.key) - 1;
    if (tabs[idx]) tabs[idx].click();
  }
});

// ============================================================================
// Init
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  requestNotifications();
});
