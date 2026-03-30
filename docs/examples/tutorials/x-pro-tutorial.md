---
title: "Access X Pro (TweetDeck) — Tutorial"
description: "Navigate to X Pro, set up multi-column monitoring, and manage columns for real-time Twitter monitoring using XActions."
keywords: ["x pro tweetdeck", "twitter multi column view", "tweetdeck setup", "x pro columns", "xactions x pro"]
canonical: "https://xactions.app/examples/x-pro"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Access X Pro (TweetDeck) — Tutorial

> Step-by-step guide to accessing X Pro, setting up multi-column monitoring, and managing columns for real-time X/Twitter monitoring.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 5-10 minutes
**Requirements:** Logged into x.com, X Premium+ subscription ($16/mo)

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- X Premium+ subscription ($16/mo) -- X Pro is exclusive to Premium+

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to check access and navigate to X Pro
4. X Pro opens at `pro.x.com` in a new tab
5. Re-run the column management script on `pro.x.com`

---

## Configuration

```javascript
const CONFIG = {
  autoNavigate: true,        // Navigate to X Pro automatically
  setupColumns: false,       // Attempt to add default monitoring columns
  columnPresets: [           // Column types to add when setupColumns = true
    'home',
    'notifications',
    'mentions',
    'search',
  ],
  searchTerms: [             // Search columns to add
    // 'from:nichxbt',
    // '#xactions',
  ],
  showColumnInfo: true,      // Display info about existing columns
  delayBetweenActions: 2000, // ms between UI actions
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoNavigate` | boolean | `true` | Auto-navigate to X Pro |
| `setupColumns` | boolean | `false` | Add preset columns automatically |
| `columnPresets` | array | `[...]` | Column types to set up |
| `searchTerms` | array | `[]` | Search queries for search columns |
| `showColumnInfo` | boolean | `true` | List existing columns |

---

## Step-by-Step Guide

### Step 1: Check Access and Navigate to X Pro

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('📊 X PRO (TWEETDECK) - XActions by nichxbt\n');

  // Check access
  const isPro = window.location.hostname.includes('pro.x.com');
  const proLink = document.querySelector('a[href*="pro.x.com"]');

  if (isPro) {
    console.log('✅ You are on X Pro.');
  } else if (proLink) {
    console.log('✅ X Pro link found — you have access.');
  } else {
    console.log('⚠️ X Pro access not detected.');
    console.log('💡 X Pro requires Premium+ subscription ($16/mo).');
    console.log('   Subscribe at: x.com/i/premium_sign_up');
  }

  // Show column guide
  console.log('\n══════════════════════════════════════════════════');
  console.log('📚 X PRO COLUMN TYPES');
  console.log('══════════════════════════════════════════════════\n');

  const columnTypes = {
    '🏠 Home Timeline': 'Your main timeline',
    '🔔 Notifications': 'All notifications',
    '💬 Mentions': 'Posts that mention you',
    '✉️ Messages': 'Direct messages',
    '🔍 Search': 'Search results for a query',
    '📋 List': 'Posts from a specific list',
    '❤️ Likes': 'Posts you have liked',
    '📈 Trending': 'Trending topics',
    '👥 Followers': 'New follower activity',
  };

  for (const [name, desc] of Object.entries(columnTypes)) {
    console.log(`   ${name} — ${desc}`);
  }

  console.log('\n💡 Tips for effective monitoring:');
  console.log('   • Keep 4-6 columns for best readability');
  console.log('   • Use Search columns for tracking keywords or competitors');
  console.log('   • Pin important columns to the left');
  console.log('   • Use List columns to group accounts by topic');

  // Navigate
  if (!isPro) {
    console.log('\n🚀 Opening X Pro...');
    if (proLink) {
      proLink.click();
      console.log('✅ Clicked X Pro link.');
    } else {
      window.open('https://pro.x.com', '_blank');
      console.log('✅ Opened pro.x.com');
    }
    console.log('💡 Run this script again on pro.x.com to manage columns.');
  }
})();
```

### Step 2: Scan Existing Columns (Run on pro.x.com)

```javascript
(() => {
  console.log('📊 SCAN X PRO COLUMNS - XActions by nichxbt\n');

  const columns = document.querySelectorAll(
    '[data-testid="column"], [class*="column"], section[aria-label]'
  );

  if (columns.length === 0) {
    console.log('ℹ️ No columns detected. This may not be the X Pro interface.');
    console.log('💡 Make sure you are on pro.x.com');
    return;
  }

  console.log(`📋 Found ${columns.length} column(s):`);
  console.log('─'.repeat(50));

  const columnData = [];
  columns.forEach((col, i) => {
    const header = col.querySelector('[data-testid="columnHeader"], h2, [role="heading"]');
    const name = header?.textContent?.trim()
      || col.getAttribute('aria-label')
      || `Column ${i + 1}`;

    const tweets = col.querySelectorAll('article[data-testid="tweet"]');

    console.log(`   ${i + 1}. 📌 ${name} (${tweets.length} posts visible)`);
    columnData.push({ index: i, name, tweetCount: tweets.length });
  });

  sessionStorage.setItem('xactions_xpro', JSON.stringify({
    scannedAt: new Date().toISOString(),
    columns: columnData,
  }));

  console.log('\n💾 Column data saved to sessionStorage.');
})();
```

### Step 3: Add a Search Column (Run on pro.x.com)

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const searchQuery = 'from:nichxbt';  // Change to your desired search

  console.log(`🔍 Adding search column for: "${searchQuery}"...`);

  const addBtn = document.querySelector('[data-testid="addColumn"]')
    || document.querySelector('button[aria-label*="Add column"]')
    || document.querySelector('button[aria-label*="add"]');

  if (!addBtn) {
    console.log('⚠️ "Add column" button not found. Add columns manually in X Pro.');
    return;
  }

  addBtn.click();
  await sleep(2000);

  const searchOption = [...document.querySelectorAll('[role="menuitem"], [role="option"], button')]
    .find(el => el.textContent.toLowerCase().includes('search'));

  if (searchOption) {
    searchOption.click();
    await sleep(2000);

    const searchInput = document.querySelector('[data-testid="SearchBox_Search_Input"]')
      || document.querySelector('input[type="text"]');

    if (searchInput) {
      searchInput.focus();
      searchInput.value = searchQuery;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(1000);

      const submitBtn = searchInput.closest('form')?.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
      } else {
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      console.log(`✅ Search column added for: "${searchQuery}"`);
    }
  } else {
    console.log('⚠️ Could not find search option. Add the column manually.');
  }
})();
```

### Expected Console Output

```
📊 X PRO (TWEETDECK) - XActions by nichxbt

✅ X Pro link found — you have access.

══════════════════════════════════════════════════
📚 X PRO COLUMN TYPES
══════════════════════════════════════════════════

   🏠 Home Timeline — Your main timeline
   🔔 Notifications — All notifications
   💬 Mentions — Posts that mention you
   ✉️ Messages — Direct messages
   🔍 Search — Search results for a query
   📋 List — Posts from a specific list
   ❤️ Likes — Posts you have liked
   📈 Trending — Trending topics
   👥 Followers — New follower activity

💡 Tips for effective monitoring:
   • Keep 4-6 columns for best readability
   • Use Search columns for tracking keywords or competitors
   • Pin important columns to the left
   • Use List columns to group accounts by topic

🚀 Opening X Pro...
✅ Opened pro.x.com
💡 Run this script again on pro.x.com to manage columns.
```

---

## Tips & Tricks

1. **Premium+ required** -- X Pro (formerly TweetDeck) is exclusively available with the Premium+ subscription ($16/mo).

2. **Multi-account support** -- X Pro supports managing multiple accounts from a single interface if you have delegate access.

3. **Keyboard shortcuts** -- X Pro supports keyboard shortcuts for faster navigation. Press `?` to see available shortcuts.

4. **Column width** -- You can resize columns by dragging the edges. Narrow columns show more columns on screen.

5. **Search column power** -- Search columns support advanced search operators like `from:user`, `to:user`, `#hashtag`, and date filters.

6. **Separate domain** -- X Pro runs on `pro.x.com`. Scripts must be run on that domain, not `x.com`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "X Pro access not detected" | X Pro requires Premium+ ($16/mo). Subscribe at `x.com/i/premium_sign_up`. |
| No columns showing | The page may still be loading. Wait for the interface to fully render. |
| Cannot add columns | The "Add column" button may have different styling. Try clicking the `+` icon in the interface. |
| Scripts not working on pro.x.com | DevTools console is domain-specific. Open console on `pro.x.com`, not `x.com`. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Subscribe to Premium | `src/subscribePremium.js` | Get Premium+ for X Pro access |
| Media Studio | `src/mediaStudio.js` | Media library and analytics |
| View Analytics | `src/viewAnalytics.js` | Post and account analytics |
| Tweet Scraping | `src/scrapers/twitter/index.js` | Scrape tweet data |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
