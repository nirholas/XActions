// XActions Extension — Popup Controller
// Manages UI state, settings, communication with background/content scripts
// by nichxbt

(() => {
  'use strict';

  // ============================================
  // DOM REFERENCES
  // ============================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const DOM = {
    connectionStatus: $('#connectionStatus'),
    btnEmergencyStop: $('#btnEmergencyStop'),
    accountAvatar: $('#accountAvatar'),
    accountName: $('#accountName'),
    accountHandle: $('#accountHandle'),
    activityLog: $('#activityLog'),
    btnClearLog: $('#btnClearLog'),
    btnExportSettings: $('#btnExportSettings'),
    btnImportSettings: $('#btnImportSettings'),
    importFileInput: $('#importFileInput'),
    btnResetAll: $('#btnResetAll'),
    globalMinDelay: $('#globalMinDelay'),
    globalMaxDelay: $('#globalMaxDelay'),
    globalDebug: $('#globalDebug'),
    rateLimitWarning: $('#rateLimitWarning'),
    btnDismissRateLimit: $('#btnDismissRateLimit'),
    onboardingModal: $('#onboardingModal'),
    btnOnboardingStart: $('#btnOnboardingStart'),
    onboardingEnablePopular: $('#onboardingEnablePopular'),
    disconnectedBanner: $('#disconnectedBanner'),
    toastContainer: $('#toastContainer'),
    dashRunning: $('#dashRunning'),
    dashTodayActions: $('#dashTodayActions'),
    dashTotalActions: $('#dashTotalActions'),
    dashSessionTime: $('#dashSessionTime'),
    automationSearch: $('#automationSearch'),
    logFilter: $('#logFilter'),
  };

  // ============================================
  // STATE
  // ============================================
  let automationState = {};
  let activityEntries = [];
  let currentCategory = 'all';
  let currentLogFilter = 'all';
  let sessionTimerInterval = null;
  let earliestStartTime = null;

  // ============================================
  // INITIALIZATION
  // ============================================
  async function init() {
    setupTabs();
    setupCategoryFilters();
    setupSearch();
    setupAutomationCards();
    setupSpeedPresets();
    setupDelaySliders();
    setupGlobalControls();
    setupSettings();
    setupLogFilter();
    await loadState();
    await checkConnection();
    await checkFirstRun();
    await checkRateLimit();
    startActivityPolling();
    startSessionTimer();
  }

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: '📘' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${escapeHtml(message)}</span>`;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  // ============================================
  // TABS
  // ============================================
  function setupTabs() {
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(tc => tc.classList.remove('active'));
        tab.classList.add('active');
        $(`#tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
  }

  // ============================================
  // CATEGORY FILTERS
  // ============================================
  function setupCategoryFilters() {
    $$('.cat-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.cat-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        filterCards();
      });
    });
  }

  function filterCards() {
    const searchTerm = DOM.automationSearch.value.toLowerCase().trim();
    $$('.automation-card').forEach(card => {
      const catMatch = currentCategory === 'all' || card.dataset.category === currentCategory;
      const searchMatch = !searchTerm || (card.dataset.searchable || '').toLowerCase().includes(searchTerm)
        || card.querySelector('.card-title')?.textContent.toLowerCase().includes(searchTerm);
      card.classList.toggle('card-hidden', !(catMatch && searchMatch));
    });
  }

  // ============================================
  // SEARCH
  // ============================================
  function setupSearch() {
    DOM.automationSearch.addEventListener('input', filterCards);
  }

  // ============================================
  // AUTOMATION CARDS
  // ============================================
  function setupAutomationCards() {
    $$('.automation-card').forEach(card => {
      const automationId = card.dataset.automation;

      // Settings toggle
      card.querySelector('.btn-settings').addEventListener('click', () => {
        const panel = card.querySelector('.card-settings');
        panel.classList.toggle('hidden');
      });

      // Start/Stop toggle
      card.querySelector('.btn-toggle').addEventListener('click', async () => {
        const isRunning = automationState[automationId]?.running;
        if (isRunning) {
          await stopAutomation(automationId);
        } else {
          const settings = getCardSettings(card);
          await startAutomation(automationId, settings);
        }
      });

      // Load saved settings
      loadCardSettings(card, automationId);
    });
  }

  // ============================================
  // SPEED PRESETS
  // ============================================
  function setupSpeedPresets() {
    $$('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.speed-preset-row');
        row.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update the delay slider if it exists in same card
        const card = btn.closest('.card-settings');
        const slider = card?.querySelector('.delay-slider');
        if (slider) {
          slider.value = btn.dataset.min;
          updateDelayDisplay(slider);
        }
      });
    });
  }

  // ============================================
  // DELAY SLIDERS
  // ============================================
  function setupDelaySliders() {
    $$('.delay-slider').forEach(slider => {
      updateDelayDisplay(slider);
      slider.addEventListener('input', () => updateDelayDisplay(slider));
    });
  }

  function updateDelayDisplay(slider) {
    const label = slider.closest('label');
    const display = label?.querySelector('.delay-display');
    if (!display) return;
    const minMs = parseInt(slider.value);
    const maxMs = Math.round(minMs * 2.5);
    display.textContent = `${(minMs / 1000).toFixed(1)}s — ${(maxMs / 1000).toFixed(1)}s`;
  }

  function getCardSettings(card) {
    const settings = {};
    card.querySelectorAll('[data-setting]').forEach(input => {
      const key = input.dataset.setting;
      if (input.type === 'checkbox') {
        settings[key] = input.checked;
      } else if (input.type === 'number') {
        settings[key] = parseInt(input.value, 10) || 0;
      } else if (input.type === 'range') {
        // Delay slider — also compute maxDelay
        const min = parseInt(input.value, 10) || 2000;
        settings[key] = min;
        settings['maxDelay'] = Math.round(min * 2.5);
      } else if (input.tagName === 'SELECT') {
        settings[key] = input.value;
      } else {
        const val = input.value.trim();
        if (['keywords', 'comments', 'whitelist'].includes(key)) {
          settings[key] = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
        } else {
          settings[key] = val;
        }
      }
    });
    return settings;
  }

  async function loadCardSettings(card, automationId) {
    try {
      const data = await chrome.storage.local.get(`settings_${automationId}`);
      const saved = data[`settings_${automationId}`];
      if (!saved) return;

      card.querySelectorAll('[data-setting]').forEach(input => {
        const key = input.dataset.setting;
        if (saved[key] === undefined) return;
        if (input.type === 'checkbox') {
          input.checked = saved[key];
        } else if (input.type === 'range') {
          input.value = saved[key];
          updateDelayDisplay(input);
        } else if (Array.isArray(saved[key])) {
          input.value = saved[key].join(', ');
        } else {
          input.value = saved[key];
        }
      });
    } catch { /* noop */ }
  }

  async function saveCardSettings(automationId, settings) {
    try {
      await chrome.storage.local.set({ [`settings_${automationId}`]: settings });
    } catch { /* noop */ }
  }

  // ============================================
  // START / STOP AUTOMATIONS
  // ============================================
  async function startAutomation(automationId, settings) {
    await saveCardSettings(automationId, settings);

    const response = await chrome.runtime.sendMessage({
      type: 'START_AUTOMATION',
      automationId,
      settings,
    });

    if (response?.success) {
      automationState[automationId] = { running: true, actionCount: 0, startedAt: Date.now() };
      updateCardUI(automationId, true, 0);
      addLocalLog('start', automationId, `Started ${automationId}`);
      showToast(`${automationId} started`, 'success');
      updateDashboard();
    }
  }

  async function stopAutomation(automationId) {
    const response = await chrome.runtime.sendMessage({
      type: 'STOP_AUTOMATION',
      automationId,
    });

    if (response?.success) {
      const count = automationState[automationId]?.actionCount || 0;
      if (automationState[automationId]) {
        automationState[automationId].running = false;
      }
      updateCardUI(automationId, false);
      addLocalLog('stop', automationId, `Stopped ${automationId} (${count} actions)`);
      showToast(`${automationId} stopped — ${count} actions`, 'info');
      updateDashboard();
    }
  }

  // ============================================
  // CARD UI UPDATES
  // ============================================
  function updateCardUI(automationId, running, actionCount) {
    const card = $(`.automation-card[data-automation="${automationId}"]`);
    if (!card) return;

    const badge = card.querySelector('.status-badge');
    const toggle = card.querySelector('.btn-toggle');
    const countEl = card.querySelector('.action-count');
    const progress = card.querySelector('.card-progress');
    const progressBar = card.querySelector('.progress-bar');
    const progressText = card.querySelector('.progress-text');
    const timer = card.querySelector('.session-timer');

    if (running) {
      card.classList.add('running');
      badge.className = 'status-badge running';
      badge.textContent = 'Running';
      toggle.textContent = '⏹';
      toggle.title = 'Stop';
      if (progress) progress.classList.remove('hidden');
      if (timer) timer.classList.remove('hidden');
    } else {
      card.classList.remove('running');
      badge.className = 'status-badge stopped';
      badge.textContent = 'Stopped';
      toggle.textContent = '▶️';
      toggle.title = 'Start';
      if (progress) progress.classList.add('hidden');
      if (timer) timer.classList.add('hidden');
    }

    if (actionCount !== undefined) {
      countEl.textContent = `${actionCount} action${actionCount !== 1 ? 's' : ''}`;

      // Update progress bar (estimate based on maxActions setting)
      if (running && progressBar && progressText) {
        const maxSetting = card.querySelector('[data-setting="maxActions"]');
        const max = maxSetting ? parseInt(maxSetting.value) || 100 : 100;
        const pct = Math.min((actionCount / max) * 100, 100);
        progressBar.style.width = `${pct}%`;
        progressText.textContent = `${actionCount}/${max}`;
      }
    }
  }

  // ============================================
  // SESSION TIMER
  // ============================================
  function startSessionTimer() {
    sessionTimerInterval = setInterval(() => {
      $$('.automation-card.running').forEach(card => {
        const id = card.dataset.automation;
        const state = automationState[id];
        if (!state?.startedAt) return;
        const elapsed = Date.now() - state.startedAt;
        const timer = card.querySelector('.session-timer');
        if (timer) timer.textContent = formatDuration(elapsed);
      });
      updateDashboardUptime();
    }, 1000);
  }

  function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m < 60) return `${m}m ${sec}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  // ============================================
  // DASHBOARD
  // ============================================
  function updateDashboard() {
    const running = Object.values(automationState).filter(s => s.running).length;
    const total = Object.values(automationState).reduce((sum, s) => sum + (s.actionCount || 0), 0);

    DOM.dashRunning.textContent = running;
    DOM.dashRunning.style.color = running > 0 ? 'var(--success)' : 'var(--accent)';
    DOM.dashTotalActions.textContent = total > 999 ? `${(total / 1000).toFixed(1)}k` : total;

    // Today's actions from activity log
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayActions = activityEntries.filter(e => e.type === 'action' && e.time >= todayStart.getTime()).length;
    DOM.dashTodayActions.textContent = todayActions;
  }

  function updateDashboardUptime() {
    const runningStates = Object.values(automationState).filter(s => s.running && s.startedAt);
    if (runningStates.length === 0) {
      DOM.dashSessionTime.textContent = '—';
      return;
    }
    const earliest = Math.min(...runningStates.map(s => s.startedAt));
    DOM.dashSessionTime.textContent = formatDuration(Date.now() - earliest);
  }

  // ============================================
  // GLOBAL CONTROLS
  // ============================================
  function setupGlobalControls() {
    // Emergency stop — NO confirm dialog (it's an emergency)
    DOM.btnEmergencyStop.addEventListener('click', async () => {
      const response = await chrome.runtime.sendMessage({ type: 'STOP_ALL' });
      if (response?.success) {
        Object.keys(automationState).forEach(id => {
          automationState[id].running = false;
          updateCardUI(id, false);
        });
        addLocalLog('stop', 'all', 'Emergency stop — all automations halted');
        showToast('All automations stopped', 'warning');
        updateDashboard();
      }
    });
  }

  // ============================================
  // LOG FILTER
  // ============================================
  function setupLogFilter() {
    DOM.logFilter.addEventListener('change', () => {
      currentLogFilter = DOM.logFilter.value;
      renderActivityLog();
    });
  }

  // ============================================
  // SETTINGS TAB
  // ============================================
  function setupSettings() {
    chrome.storage.local.get('globalSettings').then(data => {
      const gs = data.globalSettings || {};
      if (gs.minDelay) DOM.globalMinDelay.value = gs.minDelay;
      if (gs.maxDelay) DOM.globalMaxDelay.value = gs.maxDelay;
      if (gs.debug !== undefined) DOM.globalDebug.checked = gs.debug;
    });

    const saveGlobal = () => {
      chrome.storage.local.set({
        globalSettings: {
          minDelay: parseInt(DOM.globalMinDelay.value, 10),
          maxDelay: parseInt(DOM.globalMaxDelay.value, 10),
          debug: DOM.globalDebug.checked,
        }
      });
      showToast('Settings saved', 'success');
    };
    DOM.globalMinDelay.addEventListener('change', saveGlobal);
    DOM.globalMaxDelay.addEventListener('change', saveGlobal);
    DOM.globalDebug.addEventListener('change', saveGlobal);

    // Export
    DOM.btnExportSettings.addEventListener('click', async () => {
      const data = await chrome.storage.local.get(null);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-settings-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Settings exported', 'success');
    });

    // Reset
    DOM.btnResetAll.addEventListener('click', async () => {
      if (!confirm('This will delete ALL XActions data and settings. Continue?')) return;
      await chrome.storage.local.clear();
      showToast('All data reset', 'warning');
      setTimeout(() => location.reload(), 500);
    });

    // Import
    DOM.btnImportSettings.addEventListener('click', () => {
      DOM.importFileInput.click();
    });
    DOM.importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await chrome.storage.local.set(data);
        showToast('Settings imported — reloading...', 'success');
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
    });

    // Clear log
    DOM.btnClearLog.addEventListener('click', async () => {
      await chrome.storage.local.set({ activityLog: [] });
      activityEntries = [];
      renderActivityLog();
      showToast('Activity log cleared', 'info');
    });
  }

  // ============================================
  // CONNECTION CHECK
  // ============================================
  async function checkConnection() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];
      const isXTab = tab?.url && (tab.url.includes('x.com') || tab.url.includes('twitter.com'));

      if (isXTab) {
        DOM.connectionStatus.className = 'status-dot connected';
        DOM.connectionStatus.title = 'Connected to X';
        DOM.disconnectedBanner.classList.add('hidden');

        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'GET_ACCOUNT_INFO' });
        } catch { /* content script not ready */ }
      } else {
        DOM.connectionStatus.className = 'status-dot disconnected';
        DOM.connectionStatus.title = 'Not on X — open x.com';
        DOM.accountName.textContent = 'Not on X';
        DOM.accountHandle.textContent = 'Open x.com to use automations';
        DOM.disconnectedBanner.classList.remove('hidden');
      }
    } catch { /* noop */ }
  }

  // ============================================
  // STATE LOADING
  // ============================================
  async function loadState() {
    try {
      const data = await chrome.storage.local.get(['automations', 'activityLog', 'totalActions']);
      automationState = data.automations || {};

      Object.entries(automationState).forEach(([id, state]) => {
        updateCardUI(id, state.running, state.actionCount);
      });

      activityEntries = data.activityLog || [];
      renderActivityLog();
      updateDashboard();
    } catch { /* noop */ }
  }

  // ============================================
  // ACTIVITY LOG
  // ============================================
  function renderActivityLog() {
    const filtered = currentLogFilter === 'all'
      ? activityEntries
      : activityEntries.filter(e => e.automation === currentLogFilter);

    if (filtered.length === 0) {
      const msg = currentLogFilter === 'all'
        ? 'No activity yet. Start an automation to see logs here.'
        : `No activity for this filter.`;
      DOM.activityLog.innerHTML = `<div class="log-empty">${msg}</div>`;
      return;
    }

    const html = filtered.slice(0, 100).map(entry => {
      const time = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const icon = {
        action: '🔧',
        start: '▶️',
        stop: '⏹',
        complete: '✅',
        error: '❌',
      }[entry.type] || '📘';

      return `
        <div class="log-entry type-${entry.type}">
          <span class="log-time">${time}</span>
          <span class="log-icon">${icon}</span>
          <span class="log-message">${escapeHtml(entry.message)}</span>
        </div>
      `;
    }).join('');

    DOM.activityLog.innerHTML = html;
  }

  function addLocalLog(type, automation, message) {
    const entry = { time: Date.now(), type, automation, message };
    activityEntries.unshift(entry);
    renderActivityLog();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================
  // POLLING FOR UPDATES
  // ============================================
  function startActivityPolling() {
    setInterval(async () => {
      try {
        const data = await chrome.storage.local.get(['automations', 'activityLog']);

        const newState = data.automations || {};
        Object.entries(newState).forEach(([id, s]) => {
          automationState[id] = s;
          updateCardUI(id, s.running, s.actionCount);
        });
        Object.keys(automationState).forEach(id => {
          if (!newState[id]) {
            automationState[id] = { running: false };
            updateCardUI(id, false);
          }
        });

        const newLog = data.activityLog || [];
        if (newLog.length !== activityEntries.length || (newLog[0]?.time !== activityEntries[0]?.time)) {
          activityEntries = newLog;
          renderActivityLog();
        }

        updateDashboard();
      } catch { /* noop */ }
    }, 1000);
  }

  // ============================================
  // FIRST-RUN ONBOARDING
  // ============================================
  async function checkFirstRun() {
    try {
      const data = await chrome.storage.local.get('firstRun');
      if (data.firstRun) {
        DOM.onboardingModal.classList.remove('hidden');

        DOM.btnOnboardingStart.addEventListener('click', async () => {
          DOM.onboardingModal.classList.add('hidden');
          await chrome.storage.local.set({ firstRun: false });

          if (DOM.onboardingEnablePopular.checked) {
            await chrome.storage.local.set({
              settings_videoDownloader: { quality: 'highest', showButton: true, autoDownload: false },
              settings_threadReader: { showUnrollBtn: true, autoDetect: true, maxTweets: 50 },
            });
            showToast('Popular features enabled!', 'success');
            addLocalLog('start', 'system', 'Popular features enabled: Video Downloader, Thread Reader');
          }
        });
      }
    } catch { /* noop */ }
  }

  // ============================================
  // RATE LIMIT CHECK
  // ============================================
  async function checkRateLimit() {
    try {
      const data = await chrome.storage.local.get('rateLimited');
      if (data.rateLimited) {
        DOM.rateLimitWarning.classList.remove('hidden');
      }
      DOM.btnDismissRateLimit.addEventListener('click', async () => {
        DOM.rateLimitWarning.classList.add('hidden');
        await chrome.storage.local.set({ rateLimited: false });
      });
    } catch { /* noop */ }
  }

  // ============================================
  // LISTEN FOR ACCOUNT INFO RESPONSE
  // ============================================
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ACCOUNT_INFO_RESPONSE' && message.data) {
      const info = message.data;
      DOM.accountName.textContent = info.name || 'Unknown';
      DOM.accountHandle.textContent = info.handle ? `@${info.handle}` : info.url || '';

      if (info.avatar) {
        DOM.accountAvatar.innerHTML = `<img src="${info.avatar}" alt="">`;
      }
    }
  });

  // ============================================
  // BOOT
  // ============================================
  init();
})();
