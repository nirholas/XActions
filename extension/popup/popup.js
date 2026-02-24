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
  };

  // ============================================
  // STATE
  // ============================================
  let automationState = {};  // { autoLiker: { running, actionCount, ... } }
  let activityEntries = [];

  // ============================================
  // INITIALIZATION
  // ============================================
  async function init() {
    setupTabs();
    setupAutomationCards();
    setupGlobalControls();
    setupSettings();
    await loadState();
    await checkConnection();
    await checkFirstRun();
    await checkRateLimit();
    startActivityPolling();
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

  function getCardSettings(card) {
    const settings = {};
    card.querySelectorAll('[data-setting]').forEach(input => {
      const key = input.dataset.setting;
      if (input.type === 'checkbox') {
        settings[key] = input.checked;
      } else if (input.type === 'number') {
        settings[key] = parseInt(input.value, 10) || 0;
      } else if (input.tagName === 'SELECT') {
        settings[key] = input.value;
      } else {
        // Text fields — parse as comma-separated array for keywords/comments/whitelist
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
    // Save settings
    await saveCardSettings(automationId, settings);

    // Send to background
    const response = await chrome.runtime.sendMessage({
      type: 'START_AUTOMATION',
      automationId,
      settings,
    });

    if (response?.success) {
      automationState[automationId] = { running: true, actionCount: 0 };
      updateCardUI(automationId, true, 0);
      addLocalLog('start', automationId, `Started ${automationId}`);
    }
  }

  async function stopAutomation(automationId) {
    const response = await chrome.runtime.sendMessage({
      type: 'STOP_AUTOMATION',
      automationId,
    });

    if (response?.success) {
      if (automationState[automationId]) {
        automationState[automationId].running = false;
      }
      updateCardUI(automationId, false);
      addLocalLog('stop', automationId, `Stopped ${automationId}`);
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

    if (running) {
      card.classList.add('running');
      badge.className = 'status-badge running';
      badge.textContent = 'Running';
      toggle.textContent = '⏹';
      toggle.title = 'Stop';
    } else {
      card.classList.remove('running');
      badge.className = 'status-badge stopped';
      badge.textContent = 'Stopped';
      toggle.textContent = '▶️';
      toggle.title = 'Start';
    }

    if (actionCount !== undefined) {
      countEl.textContent = `${actionCount} action${actionCount !== 1 ? 's' : ''}`;
    }
  }

  // ============================================
  // GLOBAL CONTROLS
  // ============================================
  function setupGlobalControls() {
    DOM.btnEmergencyStop.addEventListener('click', async () => {
      if (!confirm('Stop ALL running automations?')) return;
      const response = await chrome.runtime.sendMessage({ type: 'STOP_ALL' });
      if (response?.success) {
        Object.keys(automationState).forEach(id => {
          automationState[id].running = false;
          updateCardUI(id, false);
        });
        addLocalLog('stop', 'all', 'Emergency stop — all automations halted');
      }
    });
  }

  // ============================================
  // SETTINGS TAB
  // ============================================
  function setupSettings() {
    // Load global settings
    chrome.storage.local.get('globalSettings').then(data => {
      const gs = data.globalSettings || {};
      if (gs.minDelay) DOM.globalMinDelay.value = gs.minDelay;
      if (gs.maxDelay) DOM.globalMaxDelay.value = gs.maxDelay;
      if (gs.debug !== undefined) DOM.globalDebug.checked = gs.debug;
    });

    // Save on change
    const saveGlobal = () => {
      chrome.storage.local.set({
        globalSettings: {
          minDelay: parseInt(DOM.globalMinDelay.value, 10),
          maxDelay: parseInt(DOM.globalMaxDelay.value, 10),
          debug: DOM.globalDebug.checked,
        }
      });
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
    });

    // Reset
    DOM.btnResetAll.addEventListener('click', async () => {
      if (!confirm('This will delete ALL XActions data and settings. Continue?')) return;
      await chrome.storage.local.clear();
      addLocalLog('stop', 'system', 'All data reset');
      location.reload();
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
        addLocalLog('start', 'system', 'Settings imported successfully');
        location.reload();
      } catch (err) {
        alert('Failed to import settings: ' + err.message);
      }
    });

    // Clear log
    DOM.btnClearLog.addEventListener('click', async () => {
      await chrome.storage.local.set({ activityLog: [] });
      activityEntries = [];
      renderActivityLog();
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

        // Request account info
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'GET_ACCOUNT_INFO' });
          // Response comes async via message listener below
        } catch { /* content script not ready */ }
      } else {
        DOM.connectionStatus.className = 'status-dot disconnected';
        DOM.connectionStatus.title = 'Not on X — open x.com';
        DOM.accountName.textContent = 'Not on X';
        DOM.accountHandle.textContent = 'Open x.com to use automations';
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

      // Update card UIs
      Object.entries(automationState).forEach(([id, state]) => {
        updateCardUI(id, state.running, state.actionCount);
      });

      // Load activity log
      activityEntries = data.activityLog || [];
      renderActivityLog();
    } catch { /* noop */ }
  }

  // ============================================
  // ACTIVITY LOG
  // ============================================
  function renderActivityLog() {
    if (activityEntries.length === 0) {
      DOM.activityLog.innerHTML = '<div class="log-empty">No activity yet. Start an automation to see logs here.</div>';
      return;
    }

    const html = activityEntries.slice(0, 100).map(entry => {
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

        // Update automation states
        const newState = data.automations || {};
        Object.entries(newState).forEach(([id, s]) => {
          const wasRunning = automationState[id]?.running;
          automationState[id] = s;
          updateCardUI(id, s.running, s.actionCount);
        });
        // Check for automations that were removed (stopped from elsewhere)
        Object.keys(automationState).forEach(id => {
          if (!newState[id]) {
            automationState[id] = { running: false };
            updateCardUI(id, false);
          }
        });

        // Update activity log
        const newLog = data.activityLog || [];
        if (newLog.length !== activityEntries.length || (newLog[0]?.time !== activityEntries[0]?.time)) {
          activityEntries = newLog;
          renderActivityLog();
        }
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

          // Enable popular features if checked
          if (DOM.onboardingEnablePopular.checked) {
            await chrome.storage.local.set({
              settings_videoDownloader: { quality: 'highest', showButton: true, autoDownload: false },
              settings_threadReader: { showUnrollBtn: true, autoDetect: true, maxTweets: 50 },
            });
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
