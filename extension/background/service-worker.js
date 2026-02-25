// XActions Extension — Background Service Worker
// Manages automation state, badge updates, alarm scheduling
// by nichxbt

// ============================================
// STATE
// ============================================
const state = {
  activeAutomations: {},  // { automationId: { running, actionCount, startedAt, settings } }
  totalActions: 0,
  globalPaused: false,
};

// ============================================
// INITIALIZATION
// ============================================
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('✅ XActions extension installed');
  await chrome.storage.local.set({
    automations: {},
    activityLog: [],
    globalPaused: false,
    totalActions: 0,
  });
  chrome.action.setBadgeBackgroundColor({ color: '#1d9bf0' });
  chrome.action.setBadgeText({ text: '' });

  // First-run flag
  if (details.reason === 'install') {
    await chrome.storage.local.set({ firstRun: true });
  }

  // Context menus
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'xactions-download-video',
      title: 'Download video (XActions)',
      contexts: ['link', 'video', 'page'],
      documentUrlPatterns: ['https://x.com/*', 'https://twitter.com/*'],
    });
    chrome.contextMenus.create({
      id: 'xactions-unroll-thread',
      title: 'Unroll thread (XActions)',
      contexts: ['link', 'page'],
      documentUrlPatterns: ['https://x.com/*', 'https://twitter.com/*'],
    });
    chrome.contextMenus.create({
      id: 'xactions-analyze-account',
      title: 'Analyze account (XActions)',
      contexts: ['link', 'page'],
      documentUrlPatterns: ['https://x.com/*', 'https://twitter.com/*'],
    });
  });
});

// ============================================
// MESSAGE HANDLER
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('Message handler error:', err);
    sendResponse({ error: err.message });
  });
  return true; // Keep the message channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'START_AUTOMATION':
      return startAutomation(message.automationId, message.settings);

    case 'STOP_AUTOMATION':
      return stopAutomation(message.automationId);

    case 'STOP_ALL':
      return stopAll();

    case 'GET_STATE':
      return getState();

    case 'ACTION_PERFORMED':
      return recordAction(message.automationId, message.action);

    case 'ACTIVITY_LOG':
      return logActivity(message.entry);

    case 'GET_ACCOUNT_INFO':
      return { success: true }; // Handled by content script

    case 'GLOBAL_PAUSE':
      return globalPause();

    case 'GLOBAL_RESUME':
      return globalResume();

    default:
      return { error: 'Unknown message type' };
  }
}

// ============================================
// AUTOMATION LIFECYCLE
// ============================================
async function startAutomation(automationId, settings) {
  state.activeAutomations[automationId] = {
    running: true,
    actionCount: 0,
    startedAt: Date.now(),
    settings: settings || {},
  };

  await syncState();
  updateBadge();

  // Notify content scripts
  const tabs = await getXTabs();
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'RUN_AUTOMATION',
        automationId,
        settings,
      });
    } catch (e) {
      // Tab might not have content script yet
    }
  }

  await logActivity({
    time: Date.now(),
    type: 'start',
    automation: automationId,
    message: `Started ${automationId}`,
  });

  return { success: true, automationId };
}

async function stopAutomation(automationId) {
  if (state.activeAutomations[automationId]) {
    state.activeAutomations[automationId].running = false;
  }
  delete state.activeAutomations[automationId];

  await syncState();
  updateBadge();

  // Notify content scripts
  const tabs = await getXTabs();
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'STOP_AUTOMATION',
        automationId,
      });
    } catch (e) { /* noop */ }
  }

  await logActivity({
    time: Date.now(),
    type: 'stop',
    automation: automationId,
    message: `Stopped ${automationId}`,
  });

  return { success: true };
}

async function stopAll() {
  const ids = Object.keys(state.activeAutomations);
  state.activeAutomations = {};
  state.globalPaused = false;

  await syncState();
  updateBadge();

  const tabs = await getXTabs();
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'STOP_ALL' });
    } catch (e) { /* noop */ }
  }

  await logActivity({
    time: Date.now(),
    type: 'stop',
    automation: 'all',
    message: `Emergency stop — all automations halted (${ids.length} stopped)`,
  });

  return { success: true, stopped: ids };
}

async function globalPause() {
  state.globalPaused = true;
  await syncState();

  const tabs = await getXTabs();
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'PAUSE_ALL' });
    } catch (e) { /* noop */ }
  }

  return { success: true };
}

async function globalResume() {
  state.globalPaused = false;
  await syncState();

  const tabs = await getXTabs();
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'RESUME_ALL' });
    } catch (e) { /* noop */ }
  }

  return { success: true };
}

// ============================================
// ACTION TRACKING
// ============================================
async function recordAction(automationId, action) {
  if (state.activeAutomations[automationId]) {
    state.activeAutomations[automationId].actionCount++;
  }
  state.totalActions++;

  await syncState();
  updateBadge();

  return { success: true, totalActions: state.totalActions };
}

async function logActivity(entry) {
  const data = await chrome.storage.local.get('activityLog');
  const log = data.activityLog || [];
  log.unshift(entry);

  // Keep max 500 entries
  if (log.length > 500) log.length = 500;

  await chrome.storage.local.set({ activityLog: log });
  return { success: true };
}

// ============================================
// BADGE & STATE SYNC
// ============================================
function updateBadge() {
  const activeCount = Object.keys(state.activeAutomations).length;

  if (activeCount === 0) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeText({ text: String(activeCount) });
  }

  // Color: green when running, default blue otherwise
  chrome.action.setBadgeBackgroundColor({
    color: activeCount > 0 ? '#00ba7c' : '#1d9bf0',
  });
}

async function syncState() {
  await chrome.storage.local.set({
    automations: state.activeAutomations,
    globalPaused: state.globalPaused,
    totalActions: state.totalActions,
  });
}

// ============================================
// ALARMS (periodic check for pausing/resuming)
// ============================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'xactions-health-check') {
    // Periodically verify content scripts are still active
    const tabs = await getXTabs();
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
      } catch (e) {
        // Content script not responding - tab may have navigated away
        console.log(`Tab ${tab.id} not responding`);
      }
    }
  }
});

// Set up periodic health check
chrome.alarms.create('xactions-health-check', { periodInMinutes: 1 });

// ============================================
// CONTEXT MENUS
// ============================================
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'xactions-download-video':
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'RUN_AUTOMATION',
          automationId: 'videoDownloader',
          settings: { showButton: true, quality: 'highest' },
        });
      } catch (e) { /* content script not ready */ }
      break;

    case 'xactions-unroll-thread':
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'RUN_AUTOMATION',
          automationId: 'threadReader',
          settings: { showUnrollBtn: true, autoDetect: true },
        });
      } catch (e) { /* content script not ready */ }
      break;

    case 'xactions-analyze-account':
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'RUN_AUTOMATION',
          automationId: 'quickStats',
          settings: { showOverlay: true, sampleSize: 20 },
        });
      } catch (e) { /* content script not ready */ }
      break;
  }
});

// ============================================
// RATE LIMIT DETECTION
// ============================================
chrome.webRequest?.onCompleted?.addListener?.(
  async (details) => {
    if (details.statusCode === 429) {
      // Rate limited — pause all automations
      await globalPause();
      await logActivity({
        time: Date.now(),
        type: 'error',
        automation: 'system',
        message: 'Rate limit detected (HTTP 429) — automations paused',
      });
      await chrome.storage.local.set({ rateLimited: true });

      // Show notification if permission granted
      try {
        chrome.notifications.create('rate-limit', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'XActions — Rate Limited',
          message: 'X/Twitter rate limit detected. Automations paused automatically.',
        });
      } catch { /* notifications may not be available */ }
    }
  },
  { urls: ['https://x.com/*', 'https://twitter.com/*', 'https://api.x.com/*'] }
);

// ============================================
// HELPERS
// ============================================
async function getXTabs() {
  const tabs = await chrome.tabs.query({
    url: ['https://x.com/*', 'https://twitter.com/*'],
  });
  return tabs;
}

// Restore state on service worker restart
chrome.storage.local.get(['automations', 'totalActions', 'globalPaused']).then(data => {
  if (data.automations) state.activeAutomations = data.automations;
  if (data.totalActions) state.totalActions = data.totalActions;
  if (data.globalPaused) state.globalPaused = data.globalPaused;
  updateBadge();
});
