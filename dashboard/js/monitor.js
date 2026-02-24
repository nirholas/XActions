/**
 * XActions — Real-Time Monitor JS
 * Live activity feed, Chart.js charts, account health, active automations sidebar
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────
  let socket = null;
  let actionsChart = null;
  let followerChart = null;
  let engagementChart = null;
  const activityLog = [];
  const MAX_LOG = 200;

  // Simulated data buckets (in production, fetched from API)
  const actionsPerHour = new Array(24).fill(0);
  const followerGrowth = new Array(7).fill(0);
  const engagementTrend = new Array(7).fill(0);

  // Health
  const health = {
    rateLimitUsed: 0,
    rateLimitMax: 300,
    dailyQuota: 0,
    dailyQuotaMax: 500,
    quotaResetAt: null
  };

  // ── DOM ────────────────────────────────────────────────
  const feed = document.getElementById('activity-feed');
  const feedCount = document.getElementById('feed-count');
  const clearFeedBtn = document.getElementById('clear-feed');
  const rateLimitBar = document.getElementById('rate-limit-bar');
  const rateLimitText = document.getElementById('rate-limit-text');
  const quotaBar = document.getElementById('quota-bar');
  const quotaText = document.getElementById('quota-text');
  const resetTimer = document.getElementById('reset-timer');
  const automationsList = document.getElementById('active-automations');
  const connStatus = document.getElementById('conn-status');

  // ── Init ───────────────────────────────────────────────
  function init() {
    initCharts();
    connectSocket();
    fetchAutomationStatus();
    bindEvents();
    startResetCountdown();
    // Seed initial simulated data
    seedDemoData();
  }

  // ── Charts (Chart.js) ─────────────────────────────────
  function initCharts() {
    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#2f3336' }, ticks: { color: '#71767b', font: { size: 10 } } },
        y: { grid: { color: '#2f3336' }, ticks: { color: '#71767b', font: { size: 10 } }, beginAtZero: true }
      }
    };

    // Actions / hour (last 24h)
    const actionsCtx = document.getElementById('actions-chart').getContext('2d');
    actionsChart = new Chart(actionsCtx, {
      type: 'bar',
      data: {
        labels: last24Labels(),
        datasets: [{
          data: actionsPerHour,
          backgroundColor: 'rgba(29, 155, 240, 0.6)',
          borderColor: '#1d9bf0',
          borderWidth: 1,
          borderRadius: 3
        }]
      },
      options: { ...chartDefaults }
    });

    // Follower growth (last 7d)
    const followerCtx = document.getElementById('follower-chart').getContext('2d');
    followerChart = new Chart(followerCtx, {
      type: 'line',
      data: {
        labels: last7DayLabels(),
        datasets: [{
          data: followerGrowth,
          borderColor: '#00ba7c',
          backgroundColor: 'rgba(0, 186, 124, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#00ba7c'
        }]
      },
      options: { ...chartDefaults }
    });

    // Engagement trend (last 7d)
    const engCtx = document.getElementById('engagement-chart').getContext('2d');
    engagementChart = new Chart(engCtx, {
      type: 'line',
      data: {
        labels: last7DayLabels(),
        datasets: [{
          data: engagementTrend,
          borderColor: '#ffad1f',
          backgroundColor: 'rgba(255, 173, 31, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#ffad1f'
        }]
      },
      options: { ...chartDefaults }
    });
  }

  function last24Labels() {
    const labels = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now - i * 3600000);
      labels.push(h.getHours() + ':00');
    }
    return labels;
  }

  function last7DayLabels() {
    const labels = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      labels.push(days[d.getDay()] + ' ' + (d.getMonth() + 1) + '/' + d.getDate());
    }
    return labels;
  }

  // ── Seed demo data ────────────────────────────────────
  function seedDemoData() {
    for (let i = 0; i < 24; i++) actionsPerHour[i] = Math.floor(Math.random() * 20);
    for (let i = 0; i < 7; i++) {
      followerGrowth[i] = Math.floor(Math.random() * 50) - 10;
      engagementTrend[i] = +(Math.random() * 5).toFixed(1);
    }
    health.rateLimitUsed = Math.floor(Math.random() * 200);
    health.dailyQuota = Math.floor(Math.random() * 300);
    health.quotaResetAt = new Date(Date.now() + 3600000 * (Math.random() * 12 + 1)).toISOString();
    updateCharts();
    updateHealth();
  }

  function updateCharts() {
    actionsChart.data.datasets[0].data = actionsPerHour;
    actionsChart.update();
    followerChart.data.datasets[0].data = followerGrowth;
    followerChart.update();
    engagementChart.data.datasets[0].data = engagementTrend;
    engagementChart.update();
  }

  // ── Activity feed ─────────────────────────────────────
  function addActivity(event) {
    activityLog.unshift(event);
    if (activityLog.length > MAX_LOG) activityLog.pop();
    renderFeed();
  }

  function renderFeed() {
    if (!feed) return;
    const html = activityLog.map(e => {
      const color = e.type === 'follow' ? '#00ba7c' : e.type === 'unfollow' ? '#f4212e' : e.type === 'like' ? '#f91880' : '#1d9bf0';
      const icon = e.type === 'follow' ? '👤' : e.type === 'unfollow' ? '🚫' : e.type === 'like' ? '❤️' : e.type === 'comment' ? '💬' : '⚡';
      return `<div class="feed-item">
        <span class="feed-icon">${icon}</span>
        <span class="feed-text">${escapeHtml(e.message || e.type)}</span>
        <span class="feed-time" style="color:${color}">${e.time || 'now'}</span>
      </div>`;
    }).join('');
    feed.innerHTML = html || '<div class="feed-empty">No activity yet. Start an automation to see events here.</div>';
    if (feedCount) feedCount.textContent = activityLog.length;
  }

  function clearFeed() {
    activityLog.length = 0;
    renderFeed();
  }

  // ── Health panel ──────────────────────────────────────
  function updateHealth() {
    const rlPct = Math.min(100, (health.rateLimitUsed / health.rateLimitMax) * 100);
    rateLimitBar.style.width = rlPct + '%';
    rateLimitBar.className = 'health-bar__fill' + (rlPct > 80 ? ' health-bar__fill--danger' : rlPct > 50 ? ' health-bar__fill--warn' : '');
    rateLimitText.textContent = `${health.rateLimitUsed} / ${health.rateLimitMax}`;

    const qPct = Math.min(100, (health.dailyQuota / health.dailyQuotaMax) * 100);
    quotaBar.style.width = qPct + '%';
    quotaBar.className = 'health-bar__fill' + (qPct > 80 ? ' health-bar__fill--danger' : qPct > 50 ? ' health-bar__fill--warn' : '');
    quotaText.textContent = `${health.dailyQuota} / ${health.dailyQuotaMax}`;
  }

  function startResetCountdown() {
    setInterval(() => {
      if (!health.quotaResetAt) { resetTimer.textContent = '--:--:--'; return; }
      const diff = new Date(health.quotaResetAt) - Date.now();
      if (diff <= 0) { resetTimer.textContent = 'Now'; return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      resetTimer.textContent = `${h}h ${m}m ${s}s`;
    }, 1000);
  }

  // ── Active automations sidebar ────────────────────────
  async function fetchAutomationStatus() {
    try {
      const data = await apiRequest('/automations/status');
      renderAutomations(data.automations || {});
    } catch (err) {
      console.error('Failed to fetch automations:', err);
    }
  }

  function renderAutomations(autos) {
    if (!automationsList) return;
    let html = '';
    for (const [id, auto] of Object.entries(autos)) {
      const isRunning = auto.status === 'running';
      html += `
        <div class="sidebar-auto ${isRunning ? 'sidebar-auto--running' : ''}">
          <div class="sidebar-auto__info">
            <span class="sidebar-auto__dot" style="background:${isRunning ? '#00ba7c' : '#71767b'}"></span>
            <span class="sidebar-auto__name">${auto.name}</span>
          </div>
          ${isRunning ? `<button class="btn btn--sm btn--stop" onclick="quickStop('${id}')">Stop</button>` : ''}
        </div>`;
    }
    automationsList.innerHTML = html || '<div class="feed-empty">No automations configured</div>';
  }

  // Expose for inline onclick
  window.quickStop = async function (id) {
    try {
      await apiRequest(`/automations/${id}/stop`, { method: 'POST' });
      fetchAutomationStatus();
      showToast('Automation stopped', 'success');
    } catch (err) {
      showToast('Failed to stop: ' + err.message, 'error');
    }
  };

  // ── Socket.IO ─────────────────────────────────────────
  function connectSocket() {
    try {
      const token = localStorage.getItem('authToken');
      socket = io(CONFIG.WS_URL, {
        auth: { token, role: 'dashboard' },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        connStatus.textContent = 'Connected';
        connStatus.className = 'conn-badge conn-badge--on';
      });

      socket.on('disconnect', () => {
        connStatus.textContent = 'Disconnected';
        connStatus.className = 'conn-badge conn-badge--off';
      });

      // Real-time activity events
      socket.on('action', (data) => {
        const now = new Date();
        addActivity({
          type: data.type || 'action',
          message: data.message || `${data.type}: ${data.target || ''}`,
          time: now.toLocaleTimeString()
        });
        // Increment current hour bucket
        actionsPerHour[23]++;
        actionsChart.update();
      });

      socket.on('automation:started', () => fetchAutomationStatus());
      socket.on('automation:stopped', () => fetchAutomationStatus());
      socket.on('automation:allStopped', () => fetchAutomationStatus());

      socket.on('progress', (data) => {
        addActivity({
          type: 'progress',
          message: data.message || `Progress: ${data.completed}/${data.total}`,
          time: new Date().toLocaleTimeString()
        });
      });

      // Health updates
      socket.on('health:update', (data) => {
        Object.assign(health, data);
        updateHealth();
      });

    } catch (err) {
      console.error('Socket connection failed:', err);
    }
  }

  // ── Events ────────────────────────────────────────────
  function bindEvents() {
    if (clearFeedBtn) clearFeedBtn.addEventListener('click', clearFeed);
  }

  // ── Util ──────────────────────────────────────────────
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Boot ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
