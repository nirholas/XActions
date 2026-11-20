---
title: "Follow & Manage Lists on X (Twitter) — Tutorial"
description: "Follow, unfollow, pin, and browse X Lists using XActions browser scripts."
keywords: ["follow twitter list", "x list management", "xactions follow list", "pin list twitter", "browse list feed x"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Follow & Manage Lists — Tutorial

> Step-by-step guide to following, unfollowing, pinning, browsing, and discovering X Lists using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 2-5 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to `https://x.com/i/lists` or a specific list page

---

## Quick Start

1. Open x.com and navigate to **Lists** (`https://x.com/i/lists`) or a specific list page
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/followList.js`
4. Set `CONFIG.action` and `CONFIG.listUrl` as needed
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  action: 'follow',
  //   'follow'      -- follow a list by URL
  //   'unfollow'    -- unfollow a list by URL
  //   'pin'         -- pin a list to your timeline
  //   'browse'      -- export tweets from a list feed
  //   'discover'    -- find and list suggested lists

  listUrl: '',                     // URL of the list
  // e.g. 'https://x.com/i/lists/123456789'

  // Browse Settings
  maxTweets: 50,
  exportFormat: 'json',            // 'json' or 'csv'

  // Discover Settings
  maxLists: 20,

  // Timing
  navigationDelay: 3000,
  scrollDelay: 2000,
  actionDelay: 2000,
  maxScrollAttempts: 20,

  // Safety
  dryRun: true,
};
```

### Available Actions

| Action | Required Config | Description |
|--------|----------------|-------------|
| `follow` | `listUrl` | Follow a list to see its content in your timeline |
| `unfollow` | `listUrl` | Unfollow a list you are currently following |
| `pin` | `listUrl` | Pin a list as a tab on your home timeline |
| `browse` | `listUrl`, `maxTweets` | Export recent tweets from a list feed |
| `discover` | `maxLists` | Find and display suggested lists |

---

## Step-by-Step Guide

### Following a List

**Step 1 -- Get the list URL**

Find a list you want to follow. The URL looks like `https://x.com/i/lists/1234567890`.

**Step 2 -- Configure**

```js
const CONFIG = {
  action: 'follow',
  listUrl: 'https://x.com/i/lists/1234567890',
  dryRun: false,
};
```

**Step 3 -- Run**

The script navigates to the list page and clicks the "Follow" button.

### Unfollowing a List

```js
const CONFIG = {
  action: 'unfollow',
  listUrl: 'https://x.com/i/lists/1234567890',
  dryRun: false,
};
```

### Pinning a List to Your Timeline

Pinned lists appear as tabs on your home page for quick access.

```js
const CONFIG = {
  action: 'pin',
  listUrl: 'https://x.com/i/lists/1234567890',
  dryRun: false,
};
```

The script will try to find a pin button directly, or look for it in the list's more menu.

### Browsing and Exporting a List Feed

Export tweets from a list feed as JSON or CSV.

**Step 1 -- Configure**

```js
const CONFIG = {
  action: 'browse',
  listUrl: 'https://x.com/i/lists/1234567890',
  maxTweets: 100,
  exportFormat: 'json',    // or 'csv'
  dryRun: false,           // Safe -- only reads data
};
```

**Step 2 -- Run**

The script scrolls through the list feed and collects tweet data:

```json
[
  {
    "url": "https://x.com/user/status/123",
    "text": "This is a great thread about AI...",
    "author": "@airesearcher",
    "time": "2026-03-30T14:00:00.000Z",
    "likes": "42",
    "reposts": "12"
  }
]
```

**CSV output:**

```
url,author,text,time,likes,reposts
"https://x.com/user/status/123","@airesearcher","This is a great thread about AI...","2026-03-30T14:00:00.000Z","42","12"
```

### Discovering Suggested Lists

Find lists X suggests for you.

```js
const CONFIG = {
  action: 'discover',
  maxLists: 30,
  dryRun: false,
};
```

Navigate to `https://x.com/i/lists` and run. The script scrolls through suggested lists and outputs their details:

```json
[
  {
    "name": "AI Researchers",
    "link": "https://x.com/i/lists/123",
    "description": "Top AI researchers and their latest work",
    "memberCount": "248 Members"
  }
]
```

---

## Runtime Controls

```js
// Check progress
window.XActions.status();

// Stop the script
window.XActions.abort();
```

---

## Tips & Tricks

- **Pin your most important lists.** Pinned lists appear as timeline tabs, giving you one-click access to curated feeds.
- **Browse is read-only.** The `browse` and `discover` actions only read data, so they are safe to run with `dryRun: false`.
- **Export format matters.** Use JSON for programmatic processing, CSV for spreadsheets.
- **Discover new lists regularly.** X updates suggestions based on your activity. Run `discover` periodically to find new relevant lists.
- **State is saved.** Progress is stored in `sessionStorage` under `xactions_followList`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not find Follow button" | You may already be following the list. Check the list page |
| "Could not find Unfollow button" | You may not be following the list |
| "Could not find Pin button" | The pin option may be in the more/overflow menu. The script checks both locations |
| No tweets exported | The list may be empty, or the page may not have loaded. Increase `navigationDelay` |
| Discover returns few results | Navigate to `x.com/i/lists` first and make sure suggested lists are visible |
| "Unknown action" | Check that `CONFIG.action` is one of: `follow`, `unfollow`, `pin`, `browse`, `discover` |

---

## Related Scripts

- `browser/listManager.js` -- Create lists, add members, and export member data
- `browser/topicManager.js` -- Follow and manage X Topics
