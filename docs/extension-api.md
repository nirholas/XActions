# XActions Extension — Internal API Reference

Technical documentation of the extension's message protocol, storage schema, service worker API, and event lifecycle.

---

## Table of Contents

- [Message Protocol](#message-protocol)
- [Storage Schema](#storage-schema)
- [Service Worker API](#service-worker-api)
- [Content Script Bridge](#content-script-bridge)
- [Injected Script API](#injected-script-api)
- [Popup Controller API](#popup-controller-api)
- [Event Lifecycle](#event-lifecycle)

---

## Message Protocol

All communication uses `chrome.runtime.sendMessage` (popup ↔ background ↔ bridge) and `window.postMessage` (bridge ↔ injected).

### Popup → Background Messages

| `type` | Payload | Response | Description |
|---|---|---|---|
| `START_AUTOMATION` | `{ automationId, settings }` | `{ success: true, automationId }` | Start an automation |
| `STOP_AUTOMATION` | `{ automationId }` | `{ success: true }` | Stop a specific automation |
| `STOP_ALL` | — | `{ success: true, stopped: [ids] }` | Emergency stop all |
| `GLOBAL_PAUSE` | — | `{ success: true }` | Pause all automations |
| `GLOBAL_RESUME` | — | `{ success: true }` | Resume all automations |
| `GET_STATE` | — | `{ activeAutomations, totalActions, globalPaused }` | Query full state |

### Background → Content Script Messages

| `type` | Payload | Description |
|---|---|---|
| `RUN_AUTOMATION` | `{ automationId, settings }` | Start an automation in page context |
| `STOP_AUTOMATION` | `{ automationId }` | Stop a specific automation |
| `STOP_ALL` | — | Stop all page-context automations |
| `PAUSE_ALL` | — | Pause all automations |
| `RESUME_ALL` | — | Resume all automations |
| `GET_ACCOUNT_INFO` | — | Request account info from DOM |
| `PING` | — | Health check (responds `{ pong: true }`) |

### Content Script → Background Messages

| `type` | Payload | Description |
|---|---|---|
| `ACTION_PERFORMED` | `{ automationId, action }` | An action was executed (like, follow, etc.) |
| `ACTIVITY_LOG` | `{ entry: { time, type, automation, message } }` | Log entry to persist |
| `ACCOUNT_INFO_RESPONSE` | `{ data: { name, handle, avatar, url } }` | Account info scraped from DOM |

### Bridge ↔ Injected (window.postMessage)

Messages between bridge.js and injected.js use `window.postMessage` with a `source` field for routing:

**Extension → Page** (`source: 'xactions-extension'`):

```js
{ source: 'xactions-extension', type: 'RUN_AUTOMATION', automationId: 'autoLiker', settings: {...} }
{ source: 'xactions-extension', type: 'STOP_AUTOMATION', automationId: 'autoLiker' }
{ source: 'xactions-extension', type: 'STOP_ALL' }
{ source: 'xactions-extension', type: 'PAUSE_ALL' }
{ source: 'xactions-extension', type: 'RESUME_ALL' }
{ source: 'xactions-extension', type: 'GET_ACCOUNT_INFO' }
```

**Page → Extension** (`source: 'xactions-page'`):

```js
{ source: 'xactions-page', type: 'ACTION_PERFORMED', automationId: 'autoLiker', action: 'Liked tweet: ...' }
{ source: 'xactions-page', type: 'AUTOMATION_COMPLETE', automationId: 'autoLiker', summary: '20 likes' }
{ source: 'xactions-page', type: 'AUTOMATION_ERROR', automationId: 'autoLiker', error: 'Rate limited' }
{ source: 'xactions-page', type: 'ACCOUNT_INFO', data: { name, handle, avatar, url } }
```

---

## Storage Schema

All data is stored in `chrome.storage.local` (5MB limit).

### Per-Automation Settings

Key pattern: `settings_{automationId}`

```js
// settings_autoLiker
{
  keywords: ['web3', 'crypto'],  // Array<string>
  maxActions: 20,                // number
  minDelay: 2000,                // number (ms)
  maxDelay: 5000,                // number (ms, computed as minDelay × 2.5)
}

// settings_smartUnfollow
{
  daysToWait: 3,                 // number
  maxActions: 50,                // number
  whitelist: ['user1', 'user2'], // Array<string>
  dryRun: false,                 // boolean
  minDelay: 2000,                // number (ms)
}

// settings_keywordFollow
{
  keywords: ['web3 developer'],  // Array<string>
  maxPerKeyword: 10,             // number
  maxActions: 30,                // number
  minFollowers: 100,             // number
  mustHaveBio: false,            // boolean
  minDelay: 3000,                // number (ms)
}

// settings_growthSuite
{
  keywords: ['web3'],            // Array<string>
  sessionMinutes: 30,            // number
  maxLikes: 30,                  // number
  maxFollows: 20,                // number
  maxUnfollows: 15,              // number
  enableFollow: true,            // boolean
  enableLike: true,              // boolean
  enableUnfollow: true,          // boolean
  minDelay: 3000,                // number (ms)
}

// settings_autoCommenter
{
  comments: ['🔥', 'Great!'],   // Array<string>
  keywords: [],                  // Array<string>
  checkInterval: 60,             // number (seconds)
  maxActions: 5,                 // number
}

// settings_followEngagers
{
  mode: 'likers',                // 'likers' | 'retweeters'
  maxActions: 30,                // number
  minFollowers: 50,              // number
  minDelay: 3000,                // number (ms)
}

// settings_videoDownloader
{
  quality: 'highest',            // 'highest' | '720p' | '480p'
  autoDownload: false,           // boolean
  showButton: true,              // boolean
}

// settings_unfollowerDetector
{
  checkFrequency: 24,            // number (hours)
  notifications: true,           // boolean
  keepHistory: true,             // boolean
}

// settings_bestTimeToPost
{
  tweetCount: 50,                // number
  timezone: 'local',             // 'local' | 'UTC'
}

// settings_threadReader
{
  showUnrollBtn: true,           // boolean
  autoDetect: true,              // boolean
  maxTweets: 50,                 // number
}

// settings_quickStats
{
  showOverlay: true,             // boolean
  trackDaily: true,              // boolean
  sampleSize: 20,                // number
}
```

### Global State

```js
// Global settings
globalSettings: {
  minDelay: 2000,        // number (ms)
  maxDelay: 5000,        // number (ms)
  debug: true,           // boolean
}

// Automation runtime state (managed by service worker)
automations: {
  autoLiker: {
    running: true,       // boolean
    actionCount: 12,     // number
    startedAt: 1708900000000,  // number (timestamp ms)
    settings: { ... },   // object (copy of settings when started)
  },
  // ...one entry per active automation
}

// Flags
globalPaused: false,     // boolean
rateLimited: false,      // boolean
firstRun: true,          // boolean (set on install, cleared after onboarding)
totalActions: 247,       // number (all-time)
```

### Activity Log

```js
activityLog: [
  {
    time: 1708900123456, // number (timestamp ms)
    type: 'action',      // 'action' | 'start' | 'stop' | 'complete' | 'error'
    automation: 'autoLiker', // string (automation ID or 'all' or 'system')
    message: 'Liked tweet: exploring web3...',  // string
  },
  // ...max 500 entries, newest first
]
```

### Page-Context localStorage

Injected.js uses `localStorage` (not chrome.storage) with `xactions_` prefix:

```js
xactions_liked_tweets      // JSON Set of tweet IDs (auto-liker)
xactions_followed_users    // JSON object { username: { followedAt } } (keyword follow)
xactions_commented_tweets  // JSON Set of tweet IDs (auto-commenter)
xactions_follower_snapshot // JSON { users: [...], timestamp } (unfollower detector)
xactions_unfollower_history // JSON array of { unfollower, detectedAt } (max 50)
xactions_best_time_results // JSON analysis results
xactions_quick_stats       // JSON { engagementRate, avgLikes, ... }
xactions_daily_stats       // JSON array of daily snapshots (max 90)
```

---

## Service Worker API

The background service worker (`background/service-worker.js`) manages:

### State Object

```js
const state = {
  activeAutomations: {},   // { [automationId]: { running, actionCount, startedAt, settings } }
  totalActions: 0,         // number
  globalPaused: false,     // boolean
};
```

### Functions

| Function | Signature | Description |
|---|---|---|
| `handleMessage` | `(message, sender) → Promise<response>` | Routes incoming messages by `type` |
| `startAutomation` | `(automationId, settings) → { success, automationId }` | Updates state, syncs, notifies content scripts |
| `stopAutomation` | `(automationId) → { success }` | Removes from active, syncs, notifies |
| `stopAll` | `() → { success, stopped }` | Clears all automations |
| `globalPause` | `() → { success }` | Sets paused flag, notifies content scripts |
| `globalResume` | `() → { success }` | Clears paused flag, notifies content scripts |
| `recordAction` | `(automationId, action) → { success, totalActions }` | Increments counters |
| `logActivity` | `(entry) → { success }` | Persists log entry (max 500) |
| `updateBadge` | `() → void` | Sets badge text to active count, green when running |
| `syncState` | `() → void` | Writes state to `chrome.storage.local` |
| `getXTabs` | `() → Tab[]` | Queries all open x.com/twitter.com tabs |

### Alarms

| Alarm | Interval | Purpose |
|---|---|---|
| `xactions-health-check` | 1 minute | Pings content scripts to verify they're alive |

### Context Menus

| Menu ID | Title | Action |
|---|---|---|
| `xactions-download-video` | Download video (XActions) | Sends `RUN_AUTOMATION` for videoDownloader |
| `xactions-unroll-thread` | Unroll thread (XActions) | Sends `RUN_AUTOMATION` for threadReader |
| `xactions-analyze-account` | Analyze account (XActions) | Sends `RUN_AUTOMATION` for quickStats |

### Rate Limit Detection

Listens on `chrome.webRequest.onCompleted` for HTTP 429 responses from `x.com/*`, `twitter.com/*`, `api.x.com/*`. On detection:
1. Calls `globalPause()`
2. Logs error to activity log
3. Sets `rateLimited: true` in storage
4. Shows browser notification

---

## Content Script Bridge

`content/bridge.js` runs in the content script context (sandboxed from the page).

### Injection

Creates a `<script src="chrome.runtime.getURL('content/injected.js')">` element to inject the automation engine into the page's JS context.

### Guard

`window.__xactions_bridge_loaded` prevents double-injection if the content script runs multiple times.

### Message Routing

```
Page (injected.js)                 Bridge (bridge.js)              Background (service-worker.js)
      │                                  │                                │
      │──window.postMessage──►           │                                │
      │  source: 'xactions-page'         │──chrome.runtime.sendMessage──► │
      │                                  │                                │
      │           ◄──window.postMessage──│                                │
      │  source: 'xactions-extension'    │◄──chrome.tabs.sendMessage──────│
      │                                  │                                │
```

---

## Injected Script API

`content/injected.js` runs in the page's JS context (full DOM access).

### Core Module (`window.XActions.Core`)

```js
window.XActions = {
  Core: {
    CONFIG: { DELAY_SHORT, DELAY_MEDIUM, DELAY_LONG, DELAY_BETWEEN_ACTIONS, MAX_ACTIONS_PER_HOUR, MAX_FOLLOWS_PER_DAY, MAX_LIKES_PER_DAY, DEBUG },
    SELECTORS: { followButton, unfollowButton, likeButton, unlikeButton, retweetButton, replyButton, confirmButton, tweet, tweetText, tweetLink, userCell, userAvatar, userName, userFollowIndicator, tweetInput, searchInput, primaryColumn, timeline },
    sleep: (ms) => Promise<void>,
    randomDelay: (min, max) => Promise<void>,
    log: (automationId, message) => void,            // Also posts ACTION_PERFORMED
    scrollToBottom: () => void,
    scrollToTop: () => void,
    scrollBy: (px) => void,
    storage: { get, set, remove },                    // localStorage with xactions_ prefix
    waitForElement: (selector, timeout) => Promise<Element|null>,
    waitForElements: (selector, timeout) => Promise<NodeList>,
    clickElement: (el) => void,                       // scrollIntoView + click
    typeText: (el, text) => void,                     // char-by-char with InputEvent
    extractUsername: (el) => string|null,
    extractTweetInfo: (tweetEl) => { id, text, href },
    rateLimit: { check, increment, getRemaining },    // Hourly/daily tracking
    notify: (type, data) => void,                     // postMessage to bridge
  }
};
```

### DOM Selectors

| Key | Selector | Used By |
|---|---|---|
| `tweet` | `[data-testid="tweet"]` | All automations |
| `tweetText` | `[data-testid="tweetText"]` | autoLiker, autoCommenter, growthSuite, bestTimeToPost |
| `tweetLink` | `a[href*="/status/"]` | autoLiker, followEngagers, videoDownloader, threadReader, bestTimeToPost, quickStats |
| `likeButton` | `[data-testid="like"]` | autoLiker, growthSuite |
| `unlikeButton` | `[data-testid="unlike"]` | — (reserved) |
| `followButton` | `[data-testid$="-follow"]` | keywordFollow, followEngagers |
| `unfollowButton` | `[data-testid$="-unfollow"]` | smartUnfollow |
| `confirmButton` | `[data-testid="confirmationSheetConfirm"]` | smartUnfollow |
| `replyButton` | `[data-testid="reply"]` | autoCommenter |
| `tweetInput` | `[data-testid="tweetTextarea_0"]` | autoCommenter |
| `userCell` | `[data-testid="UserCell"]` | smartUnfollow, keywordFollow, followEngagers, unfollowerDetector |
| `userFollowIndicator` | `[data-testid="userFollowIndicator"]` | smartUnfollow |
| `timeline` | `section[role="region"]` | — (reserved) |
| `primaryColumn` | `[data-testid="primaryColumn"]` | — (reserved) |
| `searchInput` | `[data-testid="SearchBox_Search_Input"]` | keywordFollow |

### Automation Registry

```js
// Register a new automation
registerAutomation(id, async (settings) => {
  const { sleep, log, SELECTORS, scrollBy, clickElement } = window.XActions.Core;
  // ... automation logic
  // Check stop flag: if (automationStopFlags[id]) return;
  // Log actions: log(id, 'Did something');
  // Notify completion: notify('AUTOMATION_COMPLETE', { automationId: id, summary: '...' });
});
```

### Rate Limiting

```js
const rateLimit = {
  check: (type, period) => boolean,      // type: 'likes'|'follows', period: 'hour'|'day'
  increment: (type) => void,             // Increments the counter
  getRemaining: (type, period) => number // Returns remaining actions
};
```

Default limits: 200 likes/day, 100 follows/day, 50 actions/hour.

---

## Popup Controller API

`popup/popup.js` manages the popup UI.

### Key Functions

| Function | Description |
|---|---|
| `init()` | Bootstrap — sets up all event handlers, loads state, starts polling |
| `showToast(message, type)` | Display toast notification. Types: `success`, `error`, `warning`, `info` |
| `filterCards()` | Apply category + search filters to automation cards |
| `getCardSettings(card)` | Read all `[data-setting]` inputs from a card, return settings object |
| `startAutomation(id, settings)` | Save settings, send START to background, update UI |
| `stopAutomation(id)` | Send STOP to background, update UI |
| `updateCardUI(id, running, actionCount)` | Update card badge, toggle, progress bar, timer |
| `updateDashboard()` | Compute and display running count, today's actions, totals |
| `togglePause()` | Send PAUSE/RESUME to background, update button state |
| `renderActivityLog()` | Render filtered log entries with relative timestamps |
| `formatRelativeTime(timestamp)` | Returns "now", "Xs ago", "Xm ago", "Xh ago", "Xd ago" |
| `formatDuration(ms)` | Returns "Xs", "Xm Xs", "Xh Xm" for session timers |

### Polling

The popup polls `chrome.storage.local` every 1 second for:
- Automation state changes (running/stopped, action counts)
- Activity log updates
- Dashboard stat recalculations

### Toast System

```js
showToast('Automation started', 'success');  // Green border, ✅ icon
showToast('Import failed: bad JSON', 'error'); // Red border, ❌ icon
showToast('All paused', 'warning');          // Yellow border, ⚠️ icon
showToast('Log cleared', 'info');            // Default border, 📘 icon
```

Toasts auto-dismiss after 3.2 seconds with CSS animation.

---

## Event Lifecycle

### Starting an Automation

```
1. User clicks ▶️ on a card
2. popup.js: getCardSettings(card) → { keywords, maxActions, minDelay, maxDelay }
3. popup.js: saveCardSettings(id, settings) → chrome.storage.local
4. popup.js: chrome.runtime.sendMessage({ type: 'START_AUTOMATION', automationId, settings })
5. service-worker.js: startAutomation(id, settings)
   → Updates state.activeAutomations[id]
   → syncState() → chrome.storage.local
   → updateBadge() → green badge with count
   → chrome.tabs.sendMessage(tabId, { type: 'RUN_AUTOMATION', automationId, settings })
   → logActivity({ type: 'start', automation: id })
6. bridge.js: receives chrome.runtime.onMessage
   → window.postMessage({ source: 'xactions-extension', type: 'RUN_AUTOMATION', ... })
7. injected.js: receives window message
   → Calls automationRunners[id](settings)
   → Automation runs, periodically posting ACTION_PERFORMED back
8. popup.js: updateCardUI(id, true, 0), showToast(), updateDashboard()
```

### Action Performed

```
1. injected.js: Core.log(id, 'Liked tweet: ...')
   → window.postMessage({ source: 'xactions-page', type: 'ACTION_PERFORMED', ... })
2. bridge.js: receives window message
   → chrome.runtime.sendMessage({ type: 'ACTION_PERFORMED', automationId, action })
   → chrome.runtime.sendMessage({ type: 'ACTIVITY_LOG', entry: { type: 'action', ... } })
3. service-worker.js: recordAction(id, action)
   → state.activeAutomations[id].actionCount++
   → state.totalActions++
   → syncState(), updateBadge()
4. service-worker.js: logActivity(entry)
   → Prepends to activityLog in chrome.storage.local (max 500)
5. popup.js: (1s polling) reads updated automations + activityLog
   → updateCardUI(id, true, newCount)
   → renderActivityLog()
   → updateDashboard()
```

### Rate Limit Detection

```
1. chrome.webRequest.onCompleted fires with statusCode 429
2. service-worker.js: Matches URL pattern (x.com/*, twitter.com/*, api.x.com/*)
3. globalPause() → sets globalPaused, notifies all content scripts
4. logActivity({ type: 'error', message: 'Rate limit detected (HTTP 429)' })
5. chrome.storage.local.set({ rateLimited: true })
6. chrome.notifications.create('rate-limit', { title: 'XActions — Rate Limited', ... })
7. popup.js: (on next open or polling) reads rateLimited → shows banner
```

### Emergency Stop

```
1. User clicks ⏹ or presses Ctrl+Shift+S
2. popup.js: chrome.runtime.sendMessage({ type: 'STOP_ALL' })
3. service-worker.js: stopAll()
   → Clears state.activeAutomations
   → syncState(), updateBadge() → empty badge
   → chrome.tabs.sendMessage(tabId, { type: 'STOP_ALL' }) to all X tabs
   → logActivity({ type: 'stop', automation: 'all' })
4. bridge.js: window.postMessage({ source: 'xactions-extension', type: 'STOP_ALL' })
5. injected.js: Sets all automationStopFlags to true
6. popup.js: Resets all card UIs, shows toast, updates dashboard
```
