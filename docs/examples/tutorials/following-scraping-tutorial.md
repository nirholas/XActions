---
title: "Export Your Following List on X (Twitter) — Free 2026"
description: "Export your complete following list on X/Twitter to JSON and CSV with bios, mutual status, and handles. Free script, no API key."
keywords: ["export twitter following list", "download following list twitter", "twitter following to CSV", "scrape following list X", "export who I follow twitter 2026", "twitter following list scraper free", "download twitter following data", "xactions following scraping", "export X following to spreadsheet", "who am I following twitter export"]
canonical: "https://xactions.app/examples/following-scraping"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# 👥 Export Your Following List on X (Twitter) — JSON & CSV Download

> **Export your complete following list from X/Twitter — with display names, bios, mutual status, and profile URLs — to JSON and CSV.** Free, no API key, no app install.

**Works on:** 🌐 Browser Console · 💻 CLI
**Difficulty:** 🟢 Beginner
**Time:** ⏱️ 2–10 minutes (depends on following count)
**Requirements:** A web browser logged into x.com

> 📖 For the quick-reference version, see [following-scraping.md](../following-scraping.md)

---

## 🎯 Real-World Scenario

You follow 1,800 accounts on X. You want to audit your following list: Who are the mutuals? Who are the one-way follows that never engage? Are there any accounts you forgot you followed? X doesn't give you a way to export this data — and third-party tools require API access (which costs money or requires developer approval).

XActions' Following Scraper navigates to your (or anyone's public) following list, scrolls through every account, and extracts the handle, display name, bio, and mutual status for each. At the end, it downloads the complete list as JSON and CSV. You can then import it into Google Sheets and answer questions like "How many of my 1,800 following actually follow me back?"

**Before XActions:**

```
┌──────────────────────────────────────────────────────────────┐
│  Auditing Your Following List (Manual)                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Go to x.com/YOUR_USERNAME/following                         │
│  Scroll... scroll... scroll...                               │
│  Count: "1... 2... 3... 4..."                                │
│  Write names in a notebook? Open a spreadsheet?              │
│  Check each one: "Do they follow me back?"                   │
│  Give up after 50 accounts.                                  │
│                                                              │
│  Data: incomplete       Time: forever                        │
│  Mutuals identified: "some?"                                 │
└──────────────────────────────────────────────────────────────┘
```

**After XActions:**

```
┌──────────────────────────────────────────────────────────────┐
│  Auditing Your Following List (XActions)                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Go to x.com/YOUR_USERNAME/following                         │
│  Paste script → press Enter                                  │
│  Script scrolls through all 1,800 accounts automatically     │
│  JSON + CSV download with handle, name, bio, mutual status   │
│                                                              │
│  Data: complete          Time: ~5 minutes                    │
│  Mutuals: 623 of 1,800 (34.6%)                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 📍 **Confirms you're on the right page** — checks URL contains `/following`
2. 📜 **Scans visible user cells** — reads each `[data-testid="UserCell"]` element
3. 📊 **Extracts data** — handle, display name, bio, "Follows you" mutual status
4. 🔄 **Deduplicates** — uses handle as unique key to avoid double-counting
5. 📜 **Scrolls for more** — scrolls down to load additional accounts
6. 📈 **Calculates stats** — counts mutuals vs non-followers
7. 📥 **Exports JSON + CSV** — auto-downloads both formats

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [Navigate to x.com/USERNAME/following]                      │
│          │                                                   │
│          ▼                                                   │
│  [For each UserCell on page]                                 │
│          │                                                   │
│          ▼                                                   │
│  [Extract: handle, name, bio, followsYou]                    │
│          │                                                   │
│          ▼                                                   │
│  [Already seen this handle?] ──Yes──→ [Skip]                 │
│          │ No                                                │
│          ▼                                                   │
│  [Add to collection map]                                     │
│          │                                                   │
│          ▼                                                   │
│  [Scroll down 800px] → [Wait 1.5s]                           │
│          │                                                   │
│          ▼                                                   │
│  [No new users found 5x?] ──Yes──→ [Stop]                   │
│          │ No                                                │
│          ▼                                                   │
│  [Repeat scan...]                                            │
│          │                                                   │
│          ▼                                                   │
│  [Print top 5 + stats] → [Export JSON + CSV]                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Quick one-off exports. No installs needed.

### Prerequisites

- [x] Logged into your X/Twitter account in a web browser
- [x] On a desktop/laptop (not mobile)

### Step 1: Navigate to a following list

> Go to **`x.com/YOUR_USERNAME/following`** — or any public account's following page.

### Step 2: Open Developer Console

| OS | Shortcut |
|----|----------|
| **Windows / Linux** | `F12` then click **Console** tab, or `Ctrl + Shift + J` |
| **Mac** | `Cmd + Option + J` |

### Step 3: Paste and Run

```javascript
// ============================================
// XActions - Following List Scraper
// by nichxbt — https://xactions.app
// Go to: x.com/USERNAME/following
// Open console (F12 → Console), paste, Enter
// ============================================

(() => {
  const CONFIG = {
    MAX_FOLLOWING: 5000,     // Max accounts to scrape
    SCROLL_DELAY: 1500,      // Delay between scrolls (ms)
    FORMAT: 'both',          // 'json', 'csv', 'both'
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const extractBio = (cell) => {
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    const text = autoDir?.textContent?.trim();
    if (text && text.length >= 10 && !text.startsWith('@')) return text;
    return '';
  };

  const extractUser = (cell) => {
    try {
      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const handleEl = cell.querySelector('a[href^="/"]');
      const followsYou = !!cell.querySelector('[data-testid="userFollowIndicator"]');
      const href = handleEl?.getAttribute('href') || '';
      const handle = href.replace('/', '').split('/')[0];

      return {
        handle,
        displayName: nameEl?.textContent || '',
        bio: extractBio(cell),
        followsYou,
        profileUrl: `https://x.com/${handle}`,
      };
    } catch (e) { return null; }
  };

  const run = async () => {
    if (!window.location.pathname.includes('/following')) {
      console.error('❌ Please go to x.com/USERNAME/following first!');
      return;
    }

    const username = window.location.pathname.split('/')[1];
    console.log(`👥 Scraping following list of @${username}...`);

    const following = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (following.size < CONFIG.MAX_FOLLOWING && noNewCount < 5) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      const beforeCount = following.size;

      cells.forEach(cell => {
        const user = extractUser(cell);
        if (user && user.handle && !following.has(user.handle)) {
          following.set(user.handle, user);
        }
      });

      const added = following.size - beforeCount;
      if (added > 0) { console.log(`👥 Collected ${following.size} following...`); noNewCount = 0; }
      else { noNewCount++; }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;
      if (scrolls > 200) break;
    }

    const followingList = Array.from(following.values());

    console.log('\n' + '='.repeat(60));
    console.log(`👥 SCRAPED ${followingList.length} FOLLOWING`);
    console.log('='.repeat(60) + '\n');

    followingList.slice(0, 5).forEach((f, i) => {
      console.log(`${i + 1}. @${f.handle} — ${f.displayName}${f.followsYou ? ' (follows you)' : ''}`);
    });
    if (followingList.length > 5) console.log(`   ... and ${followingList.length - 5} more\n`);

    const mutuals = followingList.filter(f => f.followsYou).length;
    console.log(`📊 Stats: ${mutuals} mutuals, ${followingList.length - mutuals} non-followers`);

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      download(JSON.stringify(followingList, null, 2), `${username}_following_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded following.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Bio,FollowsYou,ProfileURL',
        ...followingList.map(f =>
          `"@${f.handle}","${f.displayName.replace(/"/g, '""')}","${f.bio.replace(/"/g, '""').replace(/\n/g, ' ')}",${f.followsYou},"${f.profileUrl}"`
        )
      ].join('\n');
      download(csv, `${username}_following_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded following.csv');
    }

    window.scrapedFollowing = followingList;
    console.log('\n✅ Done! Access data: window.scrapedFollowing');
  };

  run();
})();
```

### Step 4: Review the output

```
👥 Scraping following list of @nichxbt...
👥 Collected 48 following...
👥 Collected 127 following...
👥 Collected 256 following...
👥 Collected 489 following...
👥 Collected 723 following...
👥 Collected 891 following...

============================================================
👥 SCRAPED 891 FOLLOWING
============================================================

1. @elonmusk — Elon Musk
2. @naval — Naval (follows you)
3. @vitalikbuterin — vitalik.eth
4. @karpathy — Andrej Karpathy (follows you)
5. @nichxbt — nich (follows you)
   ... and 886 more

📊 Stats: 312 mutuals, 579 non-followers

💾 Downloaded following.json
💾 Downloaded following.csv

✅ Done! Access data: window.scrapedFollowing
```

---

## 💻 Method 2: CLI

```bash
# Install XActions
npm install -g xactions

# Export your following list
npx xactions following YOUR_USERNAME

# Export to CSV
npx xactions following YOUR_USERNAME --format csv --output my-following.csv

# With login for full access
npx xactions login
npx xactions following YOUR_USERNAME --max 5000
```

---

## ⚙️ Configuration Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_FOLLOWING` | `5000` | Maximum accounts to scrape |
| `SCROLL_DELAY` | `1500` | Milliseconds between scroll-downs |
| `FORMAT` | `'both'` | Export format: `'json'`, `'csv'`, or `'both'` |

### Data Fields Collected

| Field | Description | Example |
|-------|-------------|---------|
| `handle` | Username (without @) | `"naval"` |
| `displayName` | Display name | `"Naval"` |
| `bio` | Profile bio text | `"Angel investor, philosopher"` |
| `followsYou` | Mutual follow status | `true` or `false` |
| `profileUrl` | Full profile URL | `"https://x.com/naval"` |

---

## 💡 Pro Tips

1. **Sort by `followsYou` in the CSV.** Import into Google Sheets → filter by `FollowsYou = false` → see every account that doesn't follow you back. Then decide who to keep or unfollow.
2. **Export before a mass unfollow.** Always scrape your following list before running an unfollow script. This gives you a backup to re-follow anyone you accidentally removed.
3. **Compare exports over time.** Export weekly and diff the lists to see who you've added/removed and how your following habits change.
4. **Use window.scrapedFollowing for live analysis:**
   ```javascript
   // Mutual ratio
   const mutuals = window.scrapedFollowing.filter(f => f.followsYou).length;
   console.log(`Mutual rate: ${(mutuals / window.scrapedFollowing.length * 100).toFixed(1)}%`);
   
   // Users without bios (likely low-quality)
   const noBio = window.scrapedFollowing.filter(f => !f.bio).length;
   console.log(`No bio: ${noBio} (${(noBio / window.scrapedFollowing.length * 100).toFixed(1)}%)`);
   ```
5. **Scrape any public account's following.** This isn't limited to your own account — you can audit any public user's following list for competitor research.

---

## ⚠️ Important Warnings

> **Scroll limits:** For accounts following 5,000+ people, X may limit how far down the list loads. The script stops after 200 scrolls or 5 consecutive empty results.

> **Public accounts only.** You cannot scrape the following list of private/protected accounts (unless they've approved your follow request).

> **Bio extraction:** The script tries multiple selectors to find bios. Some cell layouts may not include the bio, resulting in an empty string.

---

## 🔗 Related Features

- [Followers Scraping Tutorial](followers-scraping-tutorial.md) — Export your follower list instead of following
- [Smart Unfollow Tutorial](smart-unfollow-tutorial.md) — Unfollow non-followers after reviewing the export
- [Detect Unfollowers Tutorial](detect-unfollowers-tutorial.md) — Track who unfollows you over time
- [Profile Scraping Tutorial](profile-scraping-tutorial.md) — Get detailed data on individual accounts

---

## ❓ FAQ

### Can I export someone else's following list?
Yes! Navigate to `x.com/THEIR_USERNAME/following` and run the script. It works for any public account.

### How long does it take for large accounts?
For ~2,000 accounts, expect 3–5 minutes. The bottleneck is scroll speed (1.5s between scrolls) and page loading time.

### What does "Follows you" detection look like?
The script checks for `[data-testid="userFollowIndicator"]` badge in each user cell. This is the small "Follows you" text that X shows next to mutual followers.

### Can I merge this with the Followers Scraping export?
Yes — export both lists, import into the same spreadsheet, and cross-reference by handle to build a complete picture: who follows you, who you follow, who's mutual.

### Why are some bios empty?
X doesn't always render bios in the compact user cell view. The script tries multiple selectors, but some accounts may show up without bio data.

---

<p align="center">
  <b>Built with ❤️ by <a href="https://x.com/nichxbt">@nichxbt</a></b><br>
  <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</p>
