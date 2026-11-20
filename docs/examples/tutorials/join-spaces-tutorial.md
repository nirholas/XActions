---
title: "Join Spaces on X (Twitter) — Tutorial"
description: "Find and join live X Spaces by topic, keyword, or specific host using XActions browser scripts."
keywords: ["join twitter space", "find x spaces", "xactions join space", "twitter spaces search", "live spaces twitter"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Join Spaces — Tutorial

> Step-by-step guide to finding and joining live X Spaces by keyword, topic, or specific host using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 1-3 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to `https://x.com/search` or `https://x.com/home` before running

---

## Quick Start

1. Open x.com on the **Search** or **Home** page
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/joinSpace.js`
4. Edit `CONFIG.keywords` or `CONFIG.targetHost`
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  keywords: ['crypto', 'web3'],    // Keywords to match in Space titles
  targetHost: '',                   // Specific host to join (without @)
  autoJoin: true,                   // Automatically join the first match
  minListeners: 0,                  // Minimum listener count

  // Timing
  searchDelay: 3000,
  scrollDelay: 2000,
  actionDelay: 2000,
  maxScrollAttempts: 15,

  // Safety
  dryRun: true,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keywords` | `string[]` | `['crypto', 'web3']` | Keywords to match in Space titles (any match triggers) |
| `targetHost` | `string` | `''` | Join a Space hosted by this specific user (without @). Overrides keywords |
| `autoJoin` | `boolean` | `true` | Automatically join the first matching Space |
| `minListeners` | `number` | `0` | Only join Spaces with at least this many listeners |
| `searchDelay` | `number` | `3000` | Milliseconds to wait after searching |
| `scrollDelay` | `number` | `2000` | Milliseconds between scroll attempts |
| `maxScrollAttempts` | `number` | `15` | Maximum scrolls to find Spaces |
| `dryRun` | `boolean` | `true` | Preview mode -- does not actually join |

---

## Step-by-Step Guide

### Finding Spaces by Keywords

**Step 1 -- Set your keywords**

```js
const CONFIG = {
  keywords: ['AI', 'machine learning', 'agents'],
  autoJoin: true,
  minListeners: 10,    // Only join if at least 10 people are listening
  dryRun: true,
};
```

**Step 2 -- Run the script**

The script will:

1. Build a search query from your keywords (`AI OR machine learning OR agents`)
2. Search X for matching content
3. Look for the Spaces tab/filter
4. Scan Space cards for title matches
5. Join the first Space that matches your filters

**Step 3 -- Review dry run output**

```
JOIN A SPACE
DRY RUN MODE -- set CONFIG.dryRun = false to actually join
Keywords: AI, machine learning, agents
Min listeners: 10
Searching: "AI OR machine learning OR agents"...
Found: "The Future of AI Agents" (243 listeners) by @aibuilder
Matches filters!
Joining: "The Future of AI Agents"...
Joined Space: "The Future of AI Agents"
```

### Joining a Specific Host's Space

To join a Space by a specific person:

```js
const CONFIG = {
  keywords: [],              // Leave empty
  targetHost: 'nichxbt',     // Specific host
  autoJoin: true,
  dryRun: false,
};
```

The script will search for `from:nichxbt` and look for an active Space.

### Browsing Available Spaces (No Auto-Join)

Set `autoJoin: false` to just scan and list available Spaces without joining:

```js
const CONFIG = {
  keywords: ['tech', 'startups'],
  autoJoin: false,
  dryRun: true,
};
```

The script will log all matching Spaces it finds:

```
Found: "Tech Startup Pitch Night" (89 listeners) by @startuphost
Matches filters!
Found: "Building in Public" (156 listeners) by @indiedev
Matches filters!
```

### Runtime Controls

While the script is running:

```js
// Check progress
window.XActions.status();
// Output: Found: 5 | Matched: 2 | Joined: false | 15s

// Stop scanning
window.XActions.abort();
```

---

## Tips & Tricks

- **Use broad keywords.** Spaces are less common than tweets, so broader keywords yield more results.
- **Set `minListeners` for quality.** A minimum of 5-10 listeners helps filter out empty or test Spaces.
- **Combine keywords with OR logic.** The script searches for `keyword1 OR keyword2`, so any single keyword matching is enough.
- **Target a specific host.** If you know who is hosting, use `targetHost` instead of keywords for precise results.
- **Increase scroll attempts for rare topics.** If your keywords are niche, increase `maxScrollAttempts` to 25-30.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No Spaces found | There may not be any live Spaces matching your keywords right now. Try broader keywords or check back later |
| "Matches filters!" but does not join | Make sure `dryRun` is `false` and `autoJoin` is `true` |
| Script scrolls but finds nothing | The Spaces tab may not be loading. Try navigating directly to `x.com/search?q=keyword&f=spaces` |
| Join button not found on Space card | X may have updated their UI. Try clicking the Space card manually to see the current join flow |
| Script stops early | It may have hit `maxScrollAttempts`. Increase this value to continue searching |

---

## Related Scripts

- `browser/hostSpace.js` -- Create and host your own Space
- `src/discoveryExplore.js` -- Search for content and trends on X
