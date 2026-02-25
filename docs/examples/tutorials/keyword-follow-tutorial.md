---
title: "Auto-Follow by Keyword on X (Twitter) — Free 2026"
description: "Auto-follow users who tweet about specific keywords on X/Twitter. Free browser script with smart filters. No API key needed."
keywords: ["twitter auto follow by keyword", "follow users by interest twitter", "keyword follow twitter bot", "auto follow niche twitter 2026", "twitter search and follow script", "grow twitter followers by keyword", "xactions keyword follow", "twitter follow from search results", "targeted follow twitter free", "auto follow twitter users by topic"]
canonical: "https://xactions.app/examples/keyword-follow"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# 🔍 Auto-Follow by Keyword on X (Twitter) — Targeted Audience Growth

> **Automatically search for keywords on X/Twitter and follow users who match your niche — with follower filters, bio matching, and rate limiting.** Free, no API key, no app install.

**Works on:** 🌐 Browser Console (requires `core.js`)
**Difficulty:** 🟡 Intermediate
**Time:** ⏱️ 5–15 minutes per keyword set
**Requirements:** A web browser logged into x.com

> 📖 For the quick-reference version, see [keyword-follow.md](../keyword-follow.md)

---

## 🎯 Real-World Scenario

You're building a SaaS tool for Solidity developers and you want to connect with people who actually tweet about your niche. You could manually search "web3 developer" on X, scroll through results, and click Follow on each relevant profile — but that takes forever and you'll inevitably follow spam accounts with no bio and 3 followers.

XActions' Keyword Follow searches X for your niche keywords (like "web3 developer," "solidity engineer," "DeFi builder"), navigates to the People tab, and follows users who match your filters. It skips users without bios, accounts you already follow, and profiles outside your follower range. You configure 3–5 keywords, set your limits, and let it run.

**Before XActions:**

```
┌──────────────────────────────────────────────────────────────┐
│  Finding Your Niche on Twitter (Manual)                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  9:00 AM  Search "web3 developer" on X                       │
│  9:01 AM  Click the People tab                               │
│  9:02 AM  See hundreds of profiles. Start clicking Follow.   │
│  9:05 AM  Wait — that one has 3 followers. Undo.             │
│  9:06 AM  That one has no bio. Skip.                         │
│  9:08 AM  Decent profile. Follow. Next...                    │
│  9:25 AM  Done with first keyword. Now search "solidity"...  │
│  9:45 AM  Getting tired. Followed 15 people total.           │
│                                                              │
│  Time: 45 minutes       Follows: 15                          │
│  Quality: hit or miss (no filtering)                         │
└──────────────────────────────────────────────────────────────┘
```

**After XActions Keyword Follow:**

```
┌──────────────────────────────────────────────────────────────┐
│  Finding Your Niche on Twitter (XActions)                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  9:00 AM  Set keywords: web3 developer, solidity, defi       │
│  9:01 AM  Paste core.js + script. Press Enter.               │
│  9:01 AM  Script searches "web3 developer" → People tab      │
│           ✅ Followed @soliditydev (2.1K followers, web3 bio)│
│           ⏭️ Skipped: no bio                                  │
│           ✅ Followed @defibuilder (800 followers, DeFi bio) │
│  9:05 AM  Script moves to "solidity engineer"...             │
│  9:10 AM  Script moves to "defi builder"...                  │
│  9:12 AM  ✅ Done! Followed 30 filtered users.               │
│                                                              │
│  Time: 12 minutes       Follows: 30                          │
│  Quality: pre-filtered by bio + followers                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 🔍 **Searches each keyword** — navigates to `x.com/search?q=KEYWORD&f=user` (People tab)
2. 📜 **Scans user cells** — extracts username, bio, follower count, follow status
3. 🧹 **Applies filters** — checks bio presence, bio keywords, follower range, already following
4. ➕ **Follows matching users** — clicks Follow with 3s+ delays
5. 💾 **Tracks followed users** — persistent storage prevents double-follows across sessions
6. 📜 **Scrolls for more** — loads additional results by scrolling
7. ➡️ **Moves to next keyword** — 10s cooldown between searches
8. 📊 **Reports results** — prints how many followed per keyword and total

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [For each KEYWORD in list]                                  │
│          │                                                   │
│          ▼                                                   │
│  [Navigate to x.com/search?q=KEYWORD&f=user]                │
│          │                                                   │
│          ▼                                                   │
│  [Wait for user cells to load]                               │
│          │                                                   │
│          ▼                                                   │
│  ┌── [For each UserCell] ──────────────────────────────┐     │
│  │                                                     │     │
│  │  [Already following?] ──Yes──→ [Skip]               │     │
│  │          │ No                                       │     │
│  │          ▼                                          │     │
│  │  [Already in tracked list?] ──Yes──→ [Skip]         │     │
│  │          │ No                                       │     │
│  │          ▼                                          │     │
│  │  [Has bio?] ──No──→ [Skip]                          │     │
│  │          │ Yes                                      │     │
│  │          ▼                                          │     │
│  │  [Followers in range?] ──No──→ [Skip]               │     │
│  │          │ Yes                                      │     │
│  │          ▼                                          │     │
│  │  [Click Follow] → [Wait 3-4.5s]                     │     │
│  │  [Save to tracked list]                             │     │
│  │                                                     │     │
│  └─────────────────────────────────────────────────────┘     │
│          │                                                   │
│          ▼                                                   │
│  [Max follows for keyword?] ──No──→ [Scroll + repeat]        │
│          │ Yes                                               │
│          ▼                                                   │
│  [Wait 10s cooldown] → [Next keyword]                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Everyone — requires pasting `core.js` first, then this script.

### Prerequisites

- [x] Logged into your X/Twitter account in a web browser
- [x] On a desktop/laptop (not mobile)
- [x] On `x.com` (any page — the script navigates automatically)

### Step 1: Paste `core.js` first

> Navigate to `x.com/home`. Open DevTools Console (`F12` → Console). Paste the contents of [`src/automation/core.js`](https://github.com/nichxbt/xactions/blob/main/src/automation/core.js) and press Enter. You'll see `✅ XActions Core loaded`.

### Step 2: Configure keywords and paste

Edit `KEYWORDS` and filters below, then paste:

```javascript
// ============================================
// XActions - Keyword Search & Follow
// by nichxbt — https://xactions.app
// REQUIRES: Paste core.js first!
// ============================================

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement,
          waitForElement, storage, rateLimit, SELECTORS,
          extractUserFromCell, parseCount } = window.XActions.Core;

  // ============================================
  // CONFIGURATION — edit these!
  // ============================================
  const OPTIONS = {
    // Search terms (will search each one)
    KEYWORDS: [
      'web3 developer',
      'solidity engineer',
      'crypto founder',
    ],

    // Follow limits
    MAX_FOLLOWS_PER_KEYWORD: 10,
    MAX_FOLLOWS_TOTAL: 30,

    // Filters
    MIN_FOLLOWERS: 100,
    MAX_FOLLOWERS: 100000,
    MUST_HAVE_BIO: true,
    BIO_KEYWORDS: [],            // e.g. ['web3', 'defi'] — empty = any bio
    SKIP_IF_FOLLOWING: true,

    // Timing
    DELAY_BETWEEN_FOLLOWS: 3000,
    DELAY_BETWEEN_SEARCHES: 10000,
  };

  // ── State ──
  let followCount = 0;
  const followedUsers = new Map(Object.entries(storage.get('followed_users') || {}));

  const saveFollowedUser = (username) => {
    followedUsers.set(username.toLowerCase(), {
      followedAt: Date.now(),
      followedBack: false,
      checkedAt: null,
    });
    storage.set('followed_users', Object.fromEntries(followedUsers));
  };

  // ── Navigation ──
  const searchFor = async (keyword) => {
    log(`Searching for: "${keyword}"`, 'action');
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=user`;
    window.location.href = searchUrl;
    await sleep(3000);
    await waitForElement(SELECTORS.userCell, 10000);
    await sleep(1000);
  };

  // ── Filters ──
  const passesFilters = (userInfo) => {
    if (!userInfo || !userInfo.username) return false;
    if (OPTIONS.SKIP_IF_FOLLOWING && userInfo.isFollowing) return false;
    if (followedUsers.has(userInfo.username.toLowerCase())) return false;
    if (OPTIONS.MUST_HAVE_BIO && !userInfo.bio) return false;
    if (OPTIONS.BIO_KEYWORDS.length > 0) {
      const bioLower = userInfo.bio.toLowerCase();
      if (!OPTIONS.BIO_KEYWORDS.some(kw => bioLower.includes(kw.toLowerCase()))) return false;
    }
    if (userInfo.followers > 0) {
      if (userInfo.followers < OPTIONS.MIN_FOLLOWERS) return false;
      if (userInfo.followers > OPTIONS.MAX_FOLLOWERS) return false;
    }
    return true;
  };

  // ── Follow ──
  const followUser = async (userCell, userInfo) => {
    const followBtn = userCell.querySelector(SELECTORS.followButton);
    if (!followBtn) return false;
    const clicked = await clickElement(followBtn);
    if (clicked) {
      followCount++;
      saveFollowedUser(userInfo.username);
      rateLimit.increment('follow', 'day');
      log(`✅ Followed @${userInfo.username} (${userInfo.displayName}) — #${followCount}`, 'success');
      return true;
    }
    return false;
  };

  // ── Process ──
  const processSearchResults = async (keyword) => {
    let keywordFollows = 0;
    let scrolls = 0;

    while (keywordFollows < OPTIONS.MAX_FOLLOWS_PER_KEYWORD &&
           followCount < OPTIONS.MAX_FOLLOWS_TOTAL &&
           scrolls < 20) {

      if (!rateLimit.check('follow', 100, 'day')) {
        log('Daily follow limit reached', 'warning');
        return;
      }

      const userCells = document.querySelectorAll(SELECTORS.userCell);

      for (const cell of userCells) {
        if (keywordFollows >= OPTIONS.MAX_FOLLOWS_PER_KEYWORD) break;
        if (followCount >= OPTIONS.MAX_FOLLOWS_TOTAL) break;

        const userInfo = extractUserFromCell(cell);
        if (!passesFilters(userInfo)) continue;

        await followUser(cell, userInfo);
        keywordFollows++;
        await randomDelay(OPTIONS.DELAY_BETWEEN_FOLLOWS, OPTIONS.DELAY_BETWEEN_FOLLOWS * 1.5);
      }

      scrollBy(600);
      scrolls++;
      await sleep(2000);
    }

    log(`Followed ${keywordFollows} users from "${keyword}"`, 'info');
  };

  // ── Run ──
  const run = async () => {
    log('🚀 Starting Keyword Follow...', 'info');
    log(`Keywords: ${OPTIONS.KEYWORDS.join(', ')}`, 'info');
    log(`Max follows: ${OPTIONS.MAX_FOLLOWS_TOTAL}`, 'info');
    log(`Tracking ${followedUsers.size} previously followed users`, 'info');

    for (const keyword of OPTIONS.KEYWORDS) {
      if (followCount >= OPTIONS.MAX_FOLLOWS_TOTAL) break;
      await searchFor(keyword);
      await processSearchResults(keyword);

      if (OPTIONS.KEYWORDS.indexOf(keyword) < OPTIONS.KEYWORDS.length - 1) {
        log('Waiting before next search...', 'info');
        await sleep(OPTIONS.DELAY_BETWEEN_SEARCHES);
      }
    }

    log(`\n✅ Done! Followed ${followCount} new users.`, 'success');
    log(`Total tracked: ${followedUsers.size} users`, 'info');
    log(`Run smartUnfollow.js later to remove non-followers!`, 'info');
  };

  if (window.location.pathname.includes('/search')) {
    processSearchResults(OPTIONS.KEYWORDS[0]);
  } else {
    run();
  }

  window.stopKeywordFollow = () => {
    OPTIONS.MAX_FOLLOWS_TOTAL = 0;
    log('Stopping...', 'warning');
  };
})();
```

### Step 3: Watch it work

```
🚀 Starting Keyword Follow...
   Keywords: web3 developer, solidity engineer, crypto founder
   Max follows: 30
   Tracking 0 previously followed users

   Searching for: "web3 developer"
   ✅ Followed @soliditydev (Solidity Dev) — #1
   ✅ Followed @web3alice (Alice | Web3) — #2
   ⏭️ Skipped: no bio
   ⏭️ Skipped: 12 followers (min: 100)
   ✅ Followed @defiresearcher (DeFi Labs) — #3
   Followed 10 users from "web3 developer"

   Waiting before next search...
   Searching for: "solidity engineer"
   ...

   ✅ Done! Followed 30 new users.
   Total tracked: 30 users
   Run smartUnfollow.js later to remove non-followers!
```

---

## ⚙️ Configuration Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `KEYWORDS` | `['web3 developer', ...]` | Array of search terms — each is searched separately |
| `MAX_FOLLOWS_PER_KEYWORD` | `10` | Max follows per individual keyword search |
| `MAX_FOLLOWS_TOTAL` | `30` | Hard cap across all keywords |
| `MIN_FOLLOWERS` | `100` | Skip users with fewer followers |
| `MAX_FOLLOWERS` | `100000` | Skip mega-accounts (rarely follow back) |
| `MUST_HAVE_BIO` | `true` | Skip users without a bio |
| `BIO_KEYWORDS` | `[]` | Bio must contain one of these (empty = any) |
| `SKIP_IF_FOLLOWING` | `true` | Skip users you already follow |
| `DELAY_BETWEEN_FOLLOWS` | `3000` | Milliseconds between follow clicks |
| `DELAY_BETWEEN_SEARCHES` | `10000` | Milliseconds between keyword searches |

---

## 💡 Pro Tips

1. **Use specific, long-tail keywords.** "web3 developer" is better than "web3" — you'll get more relevant profiles in People results.
2. **Add BIO_KEYWORDS for double-filtering.** Search "AI startup" + filter bios for `['founder', 'builder', 'engineer']` to get only the people you actually want to connect with.
3. **Keep MAX_FOLLOWS_PER_KEYWORD at 10.** After the first 10 results, quality drops rapidly in X's search results.
4. **Run the Smart Unfollow script 3 days later.** This creates the growth loop: follow → wait → unfollow non-followers → follow new people.
5. **Track your followed users.** The script saves every followed user to `sessionStorage`. Use `storage.get('followed_users')` in the console to see your history.
6. **Don't overlap keywords too much.** "web3 developer" and "web3 dev" will return many of the same people — the script handles duplicates, but you waste search slots.

---

## ⚠️ Important Warnings

> **Core.js required:** This script depends on `core.js` being loaded first. Paste it before running this script.

> **Rate limits:** X limits follow actions aggressively. Keep `MAX_FOLLOWS_TOTAL` under 50 per session. The built-in daily rate limiter will stop at 100 follows/day.

> **Search quality degrades.** X's People search results get less relevant after the first few pages. Don't scroll too deep (maxScrolls is capped at 20).

---

## 🔗 Related Features

- [Follow Target Followers Tutorial](follow-target-followers-tutorial.md) — Follow from competitor follower lists instead of search
- [Smart Unfollow Tutorial](smart-unfollow-tutorial.md) — Clean up non-followers after your growth campaign
- [Growth Suite Tutorial](growth-suite-tutorial.md) — All-in-one: keyword follow + auto-like + smart unfollow
- [Auto-Liker Tutorial](auto-liker-tutorial.md) — Engage with niche content without following

---

## ❓ FAQ

### How is this different from Follow Target Followers?
Keyword Follow searches X by topic and follows users from People results. Follow Target Followers goes directly to a specific account's follower/following list. Use Keyword Follow for broad niche targeting; use Target Followers to "steal" a specific competitor's audience.

### Can I use phrases as keywords?
Yes! "web3 developer" (with quotes in the array) searches for that exact phrase. You can also use X's search operators: `"web3 developer" -promoted`.

### What happens if I run this multiple times?
The script tracks previously followed users in `sessionStorage`. Users you've already followed in previous sessions will be skipped automatically. Note: `sessionStorage` is cleared when you close the tab.

### Will X rate-limit me?
Yes, if you follow too many people too quickly. The script uses 3s+ delays and a daily rate limiter (100/day cap). Stay under 50 follows per session for safety.

### Can I also like their posts?
Not with this script alone, but the [Growth Suite](growth-suite-tutorial.md) combines keyword follow + auto-like in one session. Or run the [Auto-Liker](auto-liker-tutorial.md) separately.

---

<p align="center">
  <b>Built with ❤️ by <a href="https://x.com/nichxbt">@nichxbt</a></b><br>
  <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</p>
