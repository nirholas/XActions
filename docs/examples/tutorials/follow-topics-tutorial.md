---
title: "Follow & Unfollow Topics on X (Twitter) — Tutorial"
description: "Browse, follow, and unfollow X Topics to customize your timeline using XActions browser scripts."
keywords: ["twitter topics", "follow topics x", "unfollow topics twitter", "xactions topic manager", "manage twitter topics"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Follow/Unfollow Topics — Tutorial

> Step-by-step guide to browsing, following, and unfollowing X Topics using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 2-10 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to `https://x.com/i/topics` or `https://x.com/settings/your_topics`

---

## Quick Start

1. Open x.com and navigate to **Topics** (`https://x.com/i/topics` or `https://x.com/settings/your_topics`)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/topicManager.js`
4. Set `CONFIG.action` and optional `CONFIG.keywords`
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  action: 'list',
  //   'list'        -- list all currently followed topics
  //   'follow'      -- follow topics matching keywords
  //   'unfollow'    -- unfollow topics matching keywords
  //   'unfollowAll' -- unfollow all topics
  //   'discover'    -- browse suggested topics

  keywords: [],                    // Filter by these keywords
  // e.g. ['crypto', 'AI', 'javascript']

  maxActions: 50,                  // Max follow/unfollow actions per run
  maxScrollAttempts: 25,

  // Timing
  scrollDelay: 2000,
  actionDelay: 2500,
  navigationDelay: 3000,

  // Safety
  dryRun: true,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `action` | `string` | `'list'` | Action to perform (see table below) |
| `keywords` | `string[]` | `[]` | Keywords to match topic names. Empty means all topics |
| `maxActions` | `number` | `50` | Maximum follow/unfollow actions per run |
| `maxScrollAttempts` | `number` | `25` | Maximum scrolls to find more topics |
| `scrollDelay` | `number` | `2000` | Milliseconds between scrolls |
| `actionDelay` | `number` | `2500` | Milliseconds between follow/unfollow clicks |
| `dryRun` | `boolean` | `true` | Preview mode -- no actions are performed |

### Available Actions

| Action | Description |
|--------|-------------|
| `list` | Show all topics you currently follow |
| `follow` | Follow topics that match your keywords |
| `unfollow` | Unfollow topics that match your keywords |
| `unfollowAll` | Unfollow every topic you follow |
| `discover` | Browse suggested/available topics |

---

## Step-by-Step Guide

### Listing Your Followed Topics

**Step 1 -- Navigate to your topics**

Go to `https://x.com/settings/your_topics`.

**Step 2 -- Configure**

```js
const CONFIG = {
  action: 'list',
  dryRun: false,   // Safe -- only reads data
};
```

**Step 3 -- Run**

```
Listing followed topics...
  Cryptocurrency
  Artificial Intelligence
  JavaScript
  Web Development
  Machine Learning
Found 5 topics
```

### Following Topics by Keyword

**Step 1 -- Navigate to topic discovery**

Go to `https://x.com/i/topics/picker/home` or `https://x.com/i/topics`.

**Step 2 -- Configure**

```js
const CONFIG = {
  action: 'follow',
  keywords: ['blockchain', 'defi', 'ethereum', 'solana'],
  maxActions: 20,
  dryRun: true,
};
```

**Step 3 -- Preview and run**

The script scrolls through available topics and follows any whose name matches your keywords.

```
Following topics matching: [blockchain, defi, ethereum, solana]...
Following: "Blockchain"...
  Followed "Blockchain" (1/20)
Following: "DeFi"...
  Followed "DeFi" (2/20)
Following: "Ethereum"...
  Followed "Ethereum" (3/20)
Followed 3 topics
```

### Unfollowing Topics by Keyword

```js
const CONFIG = {
  action: 'unfollow',
  keywords: ['sports', 'football', 'basketball'],
  maxActions: 50,
  dryRun: true,
};
```

Navigate to `https://x.com/settings/your_topics` and run. The script finds topics matching your keywords and unfollows them.

### Unfollowing All Topics

For a clean slate:

```js
const CONFIG = {
  action: 'unfollowAll',
  maxActions: 200,       // Increase for many topics
  dryRun: true,
};
```

Navigate to `https://x.com/settings/your_topics` and run. The script unfollows every topic it finds.

### Discovering New Topics

```js
const CONFIG = {
  action: 'discover',
  maxActions: 50,
  dryRun: false,    // Safe -- only reads data
};
```

Navigate to `https://x.com/i/topics/picker/home` and run:

```
Discovering suggested topics...
  Technology
  Artificial Intelligence (following)
  Web3
  Cryptocurrency (following)
  Space Exploration
Discovered 5 topics
```

### Runtime Controls

```js
// Check progress
window.XActions.status();
// Output: Followed: 5 | Unfollowed: 0 | Listed: 0 | 23s

// Stop the script
window.XActions.abort();
```

---

## Tips & Tricks

- **Topics shape your For You feed.** Following the right topics tells X's algorithm what you want to see.
- **`list` and `discover` are read-only.** They are safe to run with `dryRun: false`.
- **Keywords are case-insensitive.** `'ai'` matches "AI", "Artificial Intelligence", etc.
- **Empty keywords means all.** For `follow`, empty keywords matches all available topics. For `unfollow`, it matches all followed topics.
- **Use `unfollowAll` for a fresh start.** Then selectively re-follow only topics relevant to your niche.
- **Increase `actionDelay` for safety.** X may rate-limit rapid follow/unfollow actions. 2500-3000ms is a safe interval.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unknown action" | Valid actions: `list`, `follow`, `unfollow`, `unfollowAll`, `discover` |
| No topics found | Make sure you are on the correct page. `list`/`unfollow` needs `settings/your_topics`, `follow`/`discover` needs `i/topics` |
| Script navigates away | If you are not on a topics page, the script redirects. Run it again after the page loads |
| Follow buttons not found | X may have updated the UI. Check that topic cards are visible on the page |
| Unfollowed count is 0 | Your keywords may not match any followed topics. Try broader keywords or use `unfollowAll` |

---

## Related Scripts

- `browser/followList.js` -- Follow and manage X Lists
- `src/discoveryExplore.js` -- Search, trends, and explore feed automation
