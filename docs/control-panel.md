# Control Panel — Browser Automation UI

> A floating, draggable control panel for running XActions automations directly on x.com — no terminal needed.

## Overview

The Control Panel injects a dark-themed floating UI onto x.com that lets you:

- **Start / Pause / Resume / Stop** any automation
- **Configure** inputs (keywords, targets, limits, delays) via form fields
- **Queue** multiple tasks to run sequentially (e.g., like 200 on @user1, then follow engagers of @user2)
- **Export** results as JSON or CSV
- **Share** configurations as copy-paste JSON
- **Monitor** live progress with activity log and progress bar

No terminal, no setup — just paste two scripts into DevTools and go.

---

## Quick Start

1. Go to [x.com](https://x.com) (logged in)
2. Open **DevTools** (F12 or Cmd+Option+I) → **Console** tab
3. Paste `core.js` first, then paste `controlPanel.js`
4. The panel appears in the top-right corner

```
Paste order:
1. src/automation/core.js
2. src/automation/controlPanel.js
```

---

## Built-in Automations

| Automation | Description |
|------------|-------------|
| ❤️ **Like Timeline** | Like posts on a user's timeline or your home feed |
| 👥 **Follow Engagers** | Follow people who engage with a target account's posts |
| 🚫 **Smart Unfollow** | Unfollow accounts that don't follow you back |
| 📋 **Scrape Followers** | Collect follower usernames, bios, and stats |
| 🧠 **Algorithm Builder** | 24/7 niche algorithm builder with LLM-powered comments |

---

## Panel Features

### Configure Tab

Select an automation from the dropdown, fill in the fields, then click **▶ Start**.

Each automation exposes different inputs:

**Like Timeline:**
- Target @username (blank = home feed)
- Max likes, keyword filter, skip replies, also retweet
- Min/max delay between actions

**Follow Engagers:**
- Target @username (required)
- Max follows, bio keyword filter
- Min/max delay

**Smart Unfollow:**
- Max unfollows, keep verified, keep by bio keywords
- Min/max delay

**Scrape Followers:**
- Target @username, max to collect

**Algorithm Builder:**
- Niche keywords (comma-separated)
- Persona description (for LLM comments)
- Bio filter keywords, target @accounts
- OpenRouter API key (optional — enables LLM comments)
- Session length in minutes

### Queue Tab

Build a multi-step task queue:

1. Configure an automation
2. Click **+ Add to Queue** (instead of Start)
3. Repeat for more tasks
4. Click **▶ Run Queue** — tasks execute sequentially

Example queue:
```
1. ❤️ Like 200 posts on @nichxbt's timeline
2. 👥 Follow 50 engagers of @VitalikButerin
3. 📋 Scrape 500 followers of @jack
```

Tasks show status indicators: ⬤ pending, 🔵 active, ✅ done.

### Log Tab

Live activity feed showing every action taken:

```
✅ [14:32:01] Liked tweet
✅ [14:32:04] Liked tweet
➕ [14:32:08] Followed @user123
⚠️ [14:32:12] Rate limit approaching
```

Color-coded by type: green (success), blue (action), yellow (warning), red (error).

---

## Controls

| Button | Action |
|--------|--------|
| **▶ Start** | Begin the selected automation |
| **⏸ Pause** | Pause mid-run (resumes from the same position) |
| **▶ Resume** | Continue after pause |
| **⏹ Stop** | Abort the current run |
| **🔄 Restart** | Stop and re-run from scratch |
| **📥 Export** | Download results as JSON or CSV |
| **📋 Share** | Copy current config to clipboard as JSON |
| **─ Minimize** | Collapse the panel to just the header |
| **✕ Close** | Remove the panel from the page |

---

## Time Limits

Every automation supports an optional time limit (in minutes). When the time limit is reached, the automation stops gracefully — finishing the current action before halting.

---

## Export Results

After (or during) a run, click **📥 Export** to download:

- **JSON** — Full structured data (tweet IDs, usernames, timestamps, action types)
- **CSV** — Spreadsheet-friendly format

All collected data is stored in the panel and available for export even after the automation completes.

---

## Sharing Configurations

Click **📋 Share** to copy the current automation configuration (selected automation, all input values) to your clipboard as JSON. This lets you share setups with teammates or save them for later.

---

## Programmatic API

The panel exposes a JavaScript API on `window.XActions.Panel`:

```javascript
// Add a task to the queue
window.XActions.Panel.addTask('like-timeline', { target: 'nichxbt', limit: 100 });

// Run the queue
window.XActions.Panel.runQueue();

// Export results
window.XActions.Panel.exportResults('json');

// Share current config
window.XActions.Panel.shareConfig();
```

---

## Technical Details

- **Drag:** The panel header is draggable — click and drag to reposition
- **Abort:** Uses `AbortController` for clean cancellation (no zombie loops)
- **Pause:** Implemented via a `Promise` that resolves when the user clicks Resume
- **Z-index:** `999999` — stays above all X/Twitter UI elements
- **Double-inject protection:** Pasting the script again won't create a second panel
- **Dependencies:** Requires `core.js` (SELECTORS, sleep, randomDelay, clickElement, etc.)
