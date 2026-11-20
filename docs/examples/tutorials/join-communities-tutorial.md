---
title: "Join Communities on X (Twitter) — Tutorial"
description: "Discover and join X Communities by keyword using XActions browser scripts."
keywords: ["join twitter community", "find x communities", "xactions join community", "twitter community automation", "bulk join communities x"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Join Communities — Tutorial

> Step-by-step guide to discovering and joining X Communities by keyword using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 2-10 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to `https://x.com/i/communities/suggested` before running

---

## Quick Start

1. Open x.com and navigate to **Suggested Communities** (`https://x.com/i/communities/suggested`)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/joinCommunities.js`
4. Edit `CONFIG.keywords` with topics you are interested in
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  keywords: [
    'crypto',
    'AI',
    'javascript',
  ],
  maxJoins: 20,              // Maximum communities to join per run
  actionDelay: 3000,         // Delay between join actions (ms)
  scrollDelay: 2000,         // Delay between scrolls (ms)
  maxScrollAttempts: 15,     // Max scrolls to find communities
  dryRun: true,              // Set to false to actually join
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keywords` | `string[]` | `[]` | Keywords to filter communities. Leave empty to join all visible |
| `maxJoins` | `number` | `20` | Maximum number of communities to join in one run |
| `actionDelay` | `number` | `3000` | Milliseconds between join actions |
| `scrollDelay` | `number` | `2000` | Milliseconds between page scrolls |
| `maxScrollAttempts` | `number` | `15` | Maximum scroll attempts to discover more communities |
| `dryRun` | `boolean` | `true` | Preview mode -- no communities are actually joined |

---

## Step-by-Step Guide

### Joining Communities by Keyword

**Step 1 -- Navigate to suggested communities**

Go to `https://x.com/i/communities/suggested` in your browser. This page shows communities X recommends for you.

**Step 2 -- Configure your keywords**

```js
const CONFIG = {
  keywords: ['web3', 'defi', 'ethereum'],
  maxJoins: 10,
  dryRun: true,
};
```

**Step 3 -- Preview with dry run**

Paste the script:

```
JOIN COMMUNITIES - XActions by nichxbt
DRY RUN MODE - Set CONFIG.dryRun = false to actually join
Keywords: web3, defi, ethereum
   Would join: Web3 Builders Community
   Would join: DeFi Traders Hub
   Would join: Ethereum Developers

Done! Joined 3 communities.
```

**Step 4 -- Join for real**

Set `dryRun: false` and paste again. The script will click the "Join" button on each matching community.

### Joining All Visible Communities (No Filter)

Leave `keywords` empty to join every community on the page:

```js
const CONFIG = {
  keywords: [],        // Empty = join all visible
  maxJoins: 15,
  dryRun: false,
};
```

### Discovering More Communities

The script auto-scrolls to load more communities. Increase `maxScrollAttempts` to discover more:

```js
const CONFIG = {
  keywords: ['tech'],
  maxJoins: 50,
  maxScrollAttempts: 30,   // Scroll more to find more communities
  dryRun: false,
};
```

---

## Tips & Tricks

- **Start with the suggested page.** `x.com/i/communities/suggested` shows the most relevant communities for your account.
- **Use broad keywords.** Community names may not use the exact terms you expect. For example, search for "AI" to find communities about "artificial intelligence," "machine learning," etc.
- **Keep `maxJoins` reasonable.** Joining too many communities at once may trigger rate limits. Start with 10-20 per session.
- **Keywords are case-insensitive.** `'crypto'` matches "Crypto Trading," "CRYPTO NEWS," and "crypto builders."
- **Each community is processed once.** The script tracks community IDs to avoid processing the same community twice.
- **The script navigates if needed.** If a join button is not directly visible on the card, the script will navigate to the community page to find it, then navigate back.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No communities found | Make sure you are on `x.com/i/communities/suggested`. If no communities appear, X may not have suggestions for your account |
| Script joins 0 despite keywords matching | The keyword matching checks the visible card text. If community names are truncated, the keyword may not match. Try shorter keywords |
| "Failed to join" errors | The community may require approval (private), or you may already be a member |
| Script stops scrolling early | Increase `maxScrollAttempts` or check if the page has loaded all available communities |
| Join buttons not found | X may have updated their UI. Try joining one community manually to see the current button layout |

---

## Related Scripts

- `browser/createCommunity.js` -- Create your own community with name, description, and rules
- `browser/manageCommunity.js` -- Manage members, roles, rules, and posting in existing communities
