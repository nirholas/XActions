---
title: "Host Spaces on X (Twitter) — Tutorial"
description: "Create, configure, and schedule X Spaces using XActions browser scripts. Set titles, topics, recording, and more."
keywords: ["twitter spaces host", "create x space", "xactions spaces", "host twitter space script", "schedule x space", "twitter spaces automation"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Host Spaces — Tutorial

> Step-by-step guide to creating, configuring, and scheduling X Spaces using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Intermediate
**Time:** 2-5 minutes
**Requirements:** Logged into x.com, account eligible to host Spaces (minimum follower count)

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Your account must meet X's minimum follower requirements to host Spaces
- Navigate to `https://x.com/home` before running

---

## Quick Start

1. Open x.com on your **Home** timeline (`https://x.com/home`)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/hostSpace.js`
4. Edit the `CONFIG` section with your Space title and settings
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  title: 'My XActions Space',
  topic: '',                       // Optional topic/category
  enableRecording: false,          // Record the Space
  scheduled: false,                // Schedule instead of starting now
  scheduleDate: '',                // ISO string, e.g. '2026-04-01T18:00:00Z'

  // Timing
  navigationDelay: 3000,
  actionDelay: 2000,
  typeCharDelay: 50,

  // Safety
  dryRun: true,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | `'My XActions Space'` | Title displayed to listeners |
| `topic` | `string` | `''` | Optional topic or category for discoverability |
| `enableRecording` | `boolean` | `false` | Whether to record the Space for later playback |
| `scheduled` | `boolean` | `false` | Schedule the Space instead of starting it immediately |
| `scheduleDate` | `string` | `''` | ISO 8601 date string for scheduled Spaces (e.g., `'2026-04-01T18:00:00Z'`) |
| `navigationDelay` | `number` | `3000` | Milliseconds to wait for page loads |
| `actionDelay` | `number` | `2000` | Milliseconds between actions |
| `dryRun` | `boolean` | `true` | Preview mode -- no Space is actually created |

---

## Step-by-Step Guide

### Creating a Space (Start Now)

**Step 1 -- Configure your Space**

```js
const CONFIG = {
  title: 'Building with AI Agents - Live Q&A',
  topic: 'Technology',
  enableRecording: true,
  scheduled: false,
  dryRun: true,
};
```

**Step 2 -- Preview with dry run**

Paste the script and review:

```
HOST / START A SPACE
DRY RUN MODE -- set CONFIG.dryRun = false to actually create
Title: "Building with AI Agents - Live Q&A"
Topic: "Technology"
Recording: true
Opening compose menu...
Looking for Spaces option...
Opened Space creation dialog
Setting Space title...
Title set: "Building with AI Agents - Live Q&A"
Setting Space topic...
Topic set: "Technology"
Enabling recording...
Recording enabled
Starting Space...
Space started!
```

**Step 3 -- Go live**

Set `dryRun: false` and paste again. The script will:

1. Open the compose menu (tweet button)
2. Find and click the Spaces option
3. Enter your title and topic
4. Enable recording if requested
5. Click "Start Space" to go live

### Scheduling a Space for Later

**Step 1 -- Configure with scheduling**

```js
const CONFIG = {
  title: 'Weekly Community Call',
  topic: 'Community',
  enableRecording: true,
  scheduled: true,
  scheduleDate: '2026-04-05T18:00:00Z',  // April 5, 2026 at 6:00 PM UTC
  dryRun: false,
};
```

**Step 2 -- Run the script**

The script will:

1. Open the Space creation dialog
2. Set the title and topic
3. Click the "Schedule" option instead of "Start"
4. Set the date and time
5. Confirm the scheduled Space

After scheduling, X will notify your followers about the upcoming Space.

---

## Tips & Tricks

- **Follower requirement.** X requires a minimum number of followers (typically 600+) to host Spaces. If you do not meet this requirement, the Spaces option will not appear.
- **Recording is recommended.** Enable recording so listeners who miss the live Space can listen to the replay.
- **Set a descriptive title.** A clear title helps people discover your Space in search and browse.
- **Use topics for discoverability.** Adding a topic helps X categorize and recommend your Space.
- **Schedule in advance.** Scheduling gives your audience time to plan. X sends a notification to your followers when a scheduled Space is created.
- **State is saved.** Progress is stored in `sessionStorage` under `xactions_hostSpace`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not find Spaces button" | Your account may not be eligible to host Spaces. Check that you have enough followers |
| "Could not find title input" | The Space creation UI may have changed. Try creating a Space manually first to see the current flow |
| Space creation dialog does not open | The compose menu may not have loaded. Increase `navigationDelay` to 4000-5000ms |
| Schedule date not being set | The date picker format varies. Try setting the date manually after the dialog opens |
| Recording toggle not found | Recording may not be available for all account types. Check your X Premium status |

---

## Related Scripts

- `browser/joinSpace.js` -- Find and join live Spaces
- `src/discoveryExplore.js` -- Search for Spaces and trending topics
