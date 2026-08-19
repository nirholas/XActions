/**
 * XActions — Automation Control Panel JS
 * Handles API calls for start/stop, Socket.IO status updates, settings modals
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────
  let automations = {};
  let socket = null;

  // ── DOM refs ───────────────────────────────────────────
  const grid = document.getElementById('automation-grid');
  const emergencyBtn = document.getElementById('emergency-stop');
  const modal = document.getElementById('settings-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalSave = document.getElementById('modal-save');
  const modalClose = document.getElementById('modal-close');
  const runningCount = document.getElementById('running-count');
  const totalActions = document.getElementById('total-actions');

  let currentEditId = null;

  // ── Icons per automation ───────────────────────────────
  const ICONS = {
    'auto-liker': '❤️',
    'smart-unfollow': '🔄',
    'keyword-follow': '🔑',
    'growth-suite': '📈',
    'auto-commenter': '💬',
    'follow-engagers': '🤝'
  };

  // ── Init ───────────────────────────────────────────────
  async function init() {
    await fetchStatus();
    connectSocket();
    bindGlobalEvents();
  }

  // ── Fetch current status from API ──────────────────────
  async function fetchStatus() {
    try {
      const data = await apiRequest('/automations/status');
      automations = data.automations || {};
      renderGrid();
      updateCounters();
    } catch (err) {
      console.error('Failed to fetch automation status:', err);
      automations = {};
      renderGrid();
      updateCounters();
      showToast('Failed to load automations: ' + err.message, 'error');
    }
  }

  // ── Render the automation card grid ────────────────────
  function renderGrid() {
    grid.innerHTML = '';
    const entries = Object.entries(automations);
    if (entries.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary);">
          <div style="font-size:48px;margin-bottom:16px;">⚙️</div>
          <p style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">No automations found</p>
          <p style="font-size:14px;">Could not load automations. Check your connection and try refreshing.</p>
          <button class="btn btn--start" style="margin-top:20px;" onclick="location.reload()">Reload</button>
        </div>`;
      return;
    }
    for (const [id, auto] of entries) {
      grid.appendChild(createCard(id, auto));
    }
  }

  function createCard(id, auto) {
    const card = document.createElement('div');
    card.className = `auto-card ${auto.status === 'running' ? 'auto-card--running' : ''}`;
    card.dataset.id = id;

    const isRunning = auto.status === 'running';
    const uptime = isRunning && auto.startedAt ? timeSince(auto.startedAt) : '--';

    card.innerHTML = `
      <div class="auto-card__header">
        <span class="auto-card__icon">${ICONS[id] || '⚙️'}</span>
        <span class="auto-card__badge auto-card__badge--${auto.status}">${auto.status}</span>
      </div>
      <h3 class="auto-card__name">${auto.name}</h3>
      <p class="auto-card__desc">${auto.description}</p>
      <div class="auto-card__stats">
        <div class="auto-card__stat">
          <span class="auto-card__stat-val">${formatNumber(auto.actionCount || 0)}</span>
          <span class="auto-card__stat-label">Actions</span>
        </div>
        <div class="auto-card__stat">
          <span class="auto-card__stat-val">${auto.errors || 0}</span>
          <span class="auto-card__stat-label">Errors</span>
        </div>
        <div class="auto-card__stat">
          <span class="auto-card__stat-val">${uptime}</span>
          <span class="auto-card__stat-label">Uptime</span>
        </div>
      </div>
      <div class="auto-card__actions">
        <button class="btn btn--toggle ${isRunning ? 'btn--stop' : 'btn--start'}" data-action="toggle" data-id="${id}">
          ${isRunning ? '⏹ Stop' : '▶ Start'}
        </button>
        <button class="btn btn--settings" data-action="settings" data-id="${id}">⚙️</button>
      </div>
    `;

    card.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleAutomation(id));
    card.querySelector('[data-action="settings"]').addEventListener('click', () => openSettings(id));

    return card;
  }

  // ── Toggle (start / stop) ─────────────────────────────
  async function toggleAutomation(id) {
    const auto = automations[id];
    if (!auto) return;

    const action = auto.status === 'running' ? 'stop' : 'start';
    try {
      const data = await apiRequest(`/automations/${id}/${action}`, { method: 'POST' });
      automations[id] = data.automation;
      renderGrid();
      updateCounters();
      showToast(`${auto.name} ${action === 'start' ? 'started' : 'stopped'}`, 'success');
    } catch (err) {
      showToast(`Failed to ${action} ${auto.name}: ${err.message}`, 'error');
    }
  }

  // ── Emergency stop ────────────────────────────────────
  async function emergencyStop() {
    try {
      await apiRequest('/automations/stop-all', { method: 'POST' });
      await fetchStatus();
      showToast('All automations stopped', 'success');
    } catch (err) {
      showToast('Emergency stop failed: ' + err.message, 'error');
    }
  }

  // ── Settings modal ────────────────────────────────────
  function openSettings(id) {
    const auto = automations[id];
    if (!auto) return;
    currentEditId = id;
    modalTitle.textContent = `${ICONS[id] || '⚙️'} ${auto.name} Settings`;

    const s = auto.settings || {};
    let html = '';

    // Common fields
    html += formField('Delay (ms)', 'delay', s.delay, 'number', 'Milliseconds between actions');
    html += formField('Max Actions', 'maxActions', s.maxActions, 'number', 'Max actions per run');

    // Per-automation fields
    if (id === 'auto-liker' || id === 'keyword-follow' || id === 'auto-commenter') {
      html += formField('Keywords', 'keywords', (s.keywords || []).join(', '), 'text', 'Comma-separated keywords');
    }
    if (id === 'keyword-follow') {
      html += formField('Bio Filter', 'bioFilter', s.bioFilter || '', 'text', 'Only follow if bio contains');
    }
    if (id === 'smart-unfollow') {
      html += checkboxField('Skip Verified', 'skipVerified', s.skipVerified);
      html += formField('Skip Older Than (days)', 'skipOlderThan', s.skipOlderThan, 'number', 'Skip follows older than N days');
    }
    if (id === 'growth-suite') {
      html += selectField('Strategy', 'strategy', s.strategy, ['balanced', 'aggressive', 'conservative']);
    }
    if (id === 'auto-commenter') {
      html += textareaField('Reply Templates', 'templates', (s.templates || []).join('\n'), 'One template per line');
    }
    if (id === 'follow-engagers') {
      html += formField('Target Accounts', 'targetAccounts', (s.targetAccounts || []).join(', '), 'text', 'Comma-separated @usernames');
    }

    modalBody.innerHTML = html;
    modal.classList.add('visible');
    modalOverlay.classList.add('visible');
  }

  function closeSettings() {
    modal.classList.remove('visible');
    modalOverlay.classList.remove('visible');
    currentEditId = null;
  }

  async function saveSettings() {
    if (!currentEditId) return;
    const form = modalBody;
    const settings = {};

    form.querySelectorAll('[data-key]').forEach(el => {
      const key = el.dataset.key;
      if (el.type === 'checkbox') {
        settings[key] = el.checked;
      } else if (el.type === 'number') {
        settings[key] = Number(el.value);
      } else if (key === 'keywords' || key === 'targetAccounts') {
        settings[key] = el.value.split(',').map(s => s.trim()).filter(Boolean);
      } else if (key === 'templates') {
        settings[key] = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      } else {
        settings[key] = el.value;
      }
    });

    try {
      const data = await apiRequest(`/automations/${currentEditId}/settings`, {
        method: 'POST',
        body: JSON.stringify({ settings })
      });
      automations[currentEditId] = data.automation;
      renderGrid();
      closeSettings();
      showToast('Settings saved', 'success');
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    }
  }

  // ── Form helpers ──────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formField(label, key, value, type, placeholder) {
    return `
      <div class="form-group">
        <label class="form-label">${escapeHtml(label)}</label>
        <input class="form-input" type="${type}" data-key="${key}" value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(placeholder || '')}">
      </div>`;
  }

  function checkboxField(label, key, checked) {
    return `
      <div class="form-group form-group--inline">
        <label class="form-label">${escapeHtml(label)}</label>
        <input class="form-checkbox" type="checkbox" data-key="${key}" ${checked ? 'checked' : ''}>
      </div>`;
  }

  function selectField(label, key, current, options) {
    const opts = options.map(o => `<option value="${escapeHtml(o)}" ${o === current ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
    return `
      <div class="form-group">
        <label class="form-label">${escapeHtml(label)}</label>
        <select class="form-input" data-key="${key}">${opts}</select>
      </div>`;
  }

  function textareaField(label, key, value, placeholder) {
    return `
      <div class="form-group">
        <label class="form-label">${escapeHtml(label)}</label>
        <textarea class="form-input form-textarea" data-key="${key}" placeholder="${escapeHtml(placeholder || '')}" rows="4">${escapeHtml(value ?? '')}</textarea>
      </div>`;
  }

  // ── Socket.IO ─────────────────────────────────────────
  function connectSocket() {
    try {
      const token = localStorage.getItem('authToken');
      socket = io(CONFIG.WS_URL, {
        auth: { token, role: 'dashboard' },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        document.getElementById('conn-status').textContent = 'Connected';
        document.getElementById('conn-status').className = 'conn-badge conn-badge--on';
      });

      socket.on('disconnect', () => {
        document.getElementById('conn-status').textContent = 'Disconnected';
        document.getElementById('conn-status').className = 'conn-badge conn-badge--off';
      });

      socket.on('automation:started', (data) => {
        if (data && data.id && automations[data.id]) {
          automations[data.id] = { ...automations[data.id], ...data };
          renderGrid();
          updateCounters();
        }
      });

      socket.on('automation:stopped', (data) => {
        if (data && data.id && automations[data.id]) {
          automations[data.id] = { ...automations[data.id], ...data };
          renderGrid();
          updateCounters();
        }
      });

      socket.on('automation:allStopped', () => {
        fetchStatus();
      });

      socket.on('automation:action', (data) => {
        if (data && data.id && automations[data.id]) {
          automations[data.id].actionCount = (automations[data.id].actionCount || 0) + 1;
          automations[data.id].lastAction = data.detail || new Date().toISOString();
          renderGrid();
          updateCounters();
        }
      });
    } catch (err) {
      console.error('Socket connection failed:', err);
    }
  }

  // ── Counters ──────────────────────────────────────────
  function updateCounters() {
    let running = 0;
    let actions = 0;
    for (const auto of Object.values(automations)) {
      if (auto.status === 'running') running++;
      actions += auto.actionCount || 0;
    }
    if (runningCount) runningCount.textContent = running;
    if (totalActions) totalActions.textContent = formatNumber(actions);
  }

  // ── Helpers ───────────────────────────────────────────
  function timeSince(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    return Math.floor(seconds / 86400) + 'd';
  }

  // ── Global events ─────────────────────────────────────
  function bindGlobalEvents() {
    emergencyBtn.addEventListener('click', emergencyStop);
    modalSave.addEventListener('click', saveSettings);
    modalClose.addEventListener('click', closeSettings);
    modalOverlay.addEventListener('click', closeSettings);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettings();
    });
  }

  // ── Boot ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
