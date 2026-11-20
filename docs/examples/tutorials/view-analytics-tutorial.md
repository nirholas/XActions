---
title: "View Analytics (Premium) — Tutorial"
description: "Navigate to your analytics dashboard, scrape impressions and engagement metrics, analyze post performance, and export data using XActions."
keywords: ["x analytics dashboard", "twitter analytics script", "view impressions x", "export twitter analytics", "xactions analytics"]
canonical: "https://xactions.app/examples/view-analytics"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# View Analytics (Premium) — Tutorial

> Step-by-step guide to viewing your analytics dashboard, scraping engagement metrics, analyzing post performance, and exporting data.

**Works on:** Browser Console | Node.js (Puppeteer)
**Difficulty:** Intermediate
**Time:** 5-15 minutes
**Requirements:** Logged into x.com, X Premium subscription

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- X Premium subscription (required for full analytics access)

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to navigate to analytics and scrape metrics
4. Review overview metrics and per-post analytics in the console
5. Data auto-exports as a JSON file

---

## Configuration

```javascript
const CONFIG = {
  autoNavigate: true,           // Navigate to analytics page
  scrapeOverview: true,         // Scrape overview metrics
  scrapePostAnalytics: true,    // Scrape individual post performance
  maxPostsToScan: 30,           // Max posts to analyze
  exportData: true,             // Auto-download JSON when done
  scrollDelay: 2000,            // ms between scroll actions
  delayBetweenActions: 1500,    // ms between UI actions
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoNavigate` | boolean | `true` | Auto-navigate to analytics page |
| `scrapeOverview` | boolean | `true` | Collect overview metrics |
| `scrapePostAnalytics` | boolean | `true` | Collect per-post metrics |
| `maxPostsToScan` | number | `30` | Maximum posts to analyze |
| `exportData` | boolean | `true` | Auto-download data as JSON |

---

## Step-by-Step Guide

### Step 1: Navigate to Analytics Dashboard

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('📊 VIEW ANALYTICS - XActions by nichxbt\n');
  console.log('💡 Note: Full analytics require X Premium subscription.\n');

  const analyticsLink = document.querySelector('a[href="/i/account_analytics"]')
    || document.querySelector('a[href*="account_analytics"]');

  if (analyticsLink) {
    analyticsLink.click();
    console.log('✅ Clicked analytics link.');
  } else {
    console.log('⚠️ Analytics link not found. Navigating directly...');
    window.location.href = 'https://x.com/i/account_analytics';
  }

  await sleep(3000);
  console.log('✅ Analytics dashboard loaded.');
  console.log('💡 Run the overview and post analytics scripts below.');
})();
```

### Step 2: Scrape Overview Metrics

Run this after the analytics page has loaded:

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('📊 SCRAPING OVERVIEW METRICS...\n');

  const metrics = {};

  // Try data-testid selectors
  const impressionsEl = document.querySelector('[data-testid="impressions"]');
  const engagementsEl = document.querySelector('[data-testid="engagements"]');

  if (impressionsEl) {
    metrics.impressions = impressionsEl.textContent.trim();
    console.log(`   👁️ Impressions: ${metrics.impressions}`);
  }
  if (engagementsEl) {
    metrics.engagements = engagementsEl.textContent.trim();
    console.log(`   💬 Engagements: ${metrics.engagements}`);
  }

  // Scan for metrics in headings
  const headings = document.querySelectorAll('h2, h3, [role="heading"]');
  headings.forEach(heading => {
    const text = heading.textContent.toLowerCase();
    const parent = heading.parentElement;
    const value = parent?.querySelector('span, [dir="ltr"]')?.textContent?.trim();

    if (value) {
      if (text.includes('impression') || text.includes('view')) {
        metrics.impressions = metrics.impressions || value;
        console.log(`   👁️ Impressions: ${value}`);
      }
      if (text.includes('engagement')) {
        metrics.engagements = metrics.engagements || value;
        console.log(`   💬 Engagements: ${value}`);
      }
      if (text.includes('follower')) {
        metrics.followers = value;
        console.log(`   👥 Followers: ${value}`);
      }
    }
  });

  // Scan metric cards
  const metricCards = document.querySelectorAll(
    '[data-testid*="metric"], [class*="metric"], [class*="stat"]'
  );
  if (metricCards.length > 0) {
    console.log('\n📋 Additional metrics:');
    metricCards.forEach((card, i) => {
      const text = card.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 0 && text.length < 200) {
        console.log(`   ${i + 1}. ${text}`);
      }
    });
  }

  if (Object.keys(metrics).length === 0) {
    console.log('⚠️ No overview metrics found. This may require X Premium.');
    console.log('💡 Dashboard: x.com/i/account_analytics');
  }

  console.log('\n✅ Overview scrape complete.');
})();
```

### Step 3: Scrape Per-Post Analytics

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const maxPosts = 30;

  console.log('📝 SCRAPING POST ANALYTICS...\n');

  const parseMetric = (text) => {
    if (!text) return 0;
    const match = text.replace(/,/g, '').match(/([\d.]+)\s*([KMB]?)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const mult = { K: 1000, M: 1000000, B: 1000000000 };
    return Math.round(num * (mult[match[2].toUpperCase()] || 1));
  };

  const posts = [];
  let previousCount = 0;
  let retries = 0;

  while (retries < 5 && posts.length < maxPosts) {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');

    tweets.forEach(tweet => {
      const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent?.trim()?.substring(0, 100) || 'No text';
      if (posts.find(p => p.text === text)) return;

      const views = tweet.querySelector('[data-testid="app-text-transition-container"]')?.textContent?.trim() || '0';
      const likes = tweet.querySelector('[data-testid="like"]')?.getAttribute('aria-label')
        || tweet.querySelector('[data-testid="like"]')?.textContent?.trim() || '0';
      const retweets = tweet.querySelector('[data-testid="retweet"]')?.getAttribute('aria-label')
        || tweet.querySelector('[data-testid="retweet"]')?.textContent?.trim() || '0';
      const replies = tweet.querySelector('[data-testid="reply"]')?.getAttribute('aria-label')
        || tweet.querySelector('[data-testid="reply"]')?.textContent?.trim() || '0';
      const timestamp = tweet.querySelector('time')?.getAttribute('datetime') || '';

      const engagement = parseMetric(likes) + parseMetric(retweets) + parseMetric(replies);

      posts.push({
        text,
        views: parseMetric(views),
        likes: parseMetric(likes),
        retweets: parseMetric(retweets),
        replies: parseMetric(replies),
        timestamp,
        engagement,
      });
    });

    if (posts.length === previousCount) retries++;
    else { retries = 0; previousCount = posts.length; }

    console.log(`   🔄 Collected ${posts.length} posts...`);
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2000);
  }

  if (posts.length > 0) {
    posts.sort((a, b) => b.engagement - a.engagement);

    console.log(`\n📊 Post Analytics (${posts.length} posts, sorted by engagement):`);
    console.log('─'.repeat(70));

    posts.slice(0, 15).forEach((post, i) => {
      console.log(`\n   ${i + 1}. "${post.text.substring(0, 60)}${post.text.length > 60 ? '...' : ''}"`);
      console.log(`      👁️ ${post.views.toLocaleString()} views | ❤️ ${post.likes.toLocaleString()} likes | 🔄 ${post.retweets.toLocaleString()} RTs | 💬 ${post.replies.toLocaleString()} replies`);
      if (post.timestamp) console.log(`      📅 ${new Date(post.timestamp).toLocaleDateString()}`);
    });

    // Summary
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const totalRetweets = posts.reduce((s, p) => s + p.retweets, 0);
    const totalReplies = posts.reduce((s, p) => s + p.replies, 0);
    const avgEngagement = posts.reduce((s, p) => s + p.engagement, 0) / posts.length;

    console.log('\n📈 Summary:');
    console.log('─'.repeat(40));
    console.log(`   Total Views:     ${totalViews.toLocaleString()}`);
    console.log(`   Total Likes:     ${totalLikes.toLocaleString()}`);
    console.log(`   Total Retweets:  ${totalRetweets.toLocaleString()}`);
    console.log(`   Total Replies:   ${totalReplies.toLocaleString()}`);
    console.log(`   Avg Engagement:  ${Math.round(avgEngagement).toLocaleString()} per post`);

    if (totalViews > 0) {
      const rate = ((totalLikes + totalRetweets + totalReplies) / totalViews * 100).toFixed(2);
      console.log(`   Engagement Rate: ${rate}%`);
    }

    // Export
    const data = {
      exportedAt: new Date().toISOString(),
      postCount: posts.length,
      posts,
    };

    sessionStorage.setItem('xactions_analytics', JSON.stringify(data));
    console.log('\n💾 Analytics saved to sessionStorage.');

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions_analytics_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('📥 Analytics exported as JSON file.');
  } else {
    console.log('ℹ️ No posts found to analyze.');
  }
})();
```

### Method 2: Node.js (Puppeteer)

**Scripts:** `browser/viewAnalytics.js`, `src/creatorStudio.js`

```javascript
import { getAccountAnalytics, getPostAnalytics } from './src/creatorStudio.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.setCookie({
  name: 'auth_token',
  value: 'YOUR_AUTH_TOKEN',
  domain: '.x.com',
});

// Account analytics
const analytics = await getAccountAnalytics(page, { period: '28d' });
console.log('Account Analytics:', analytics);

// Single post analytics
const postStats = await getPostAnalytics(page, 'https://x.com/nichxbt/status/1234567890');
console.log('Post Analytics:', postStats);

await browser.close();
```

### Expected Console Output

```
📊 VIEW ANALYTICS - XActions by nichxbt

💡 Note: Full analytics require X Premium subscription.

✅ Clicked analytics link.
✅ Analytics dashboard loaded.

📊 SCRAPING OVERVIEW METRICS...

   👁️ Impressions: 2.4M
   💬 Engagements: 45.2K
   👥 Followers: 12.5K

📝 SCRAPING POST ANALYTICS...

   🔄 Collected 15 posts...
   🔄 Collected 28 posts...
   🔄 Collected 30 posts...

📊 Post Analytics (30 posts, sorted by engagement):
──────────────────────────────────────────────────────────────────────

   1. "Just shipped a new feature that lets you automate your en..."
      👁️ 125,000 views | ❤️ 2,340 likes | 🔄 890 RTs | 💬 156 replies
      📅 3/28/2026

   2. "Thread: How I grew from 0 to 10K followers in 3 months..."
      👁️ 98,000 views | ❤️ 1,890 likes | 🔄 567 RTs | 💬 89 replies
      📅 3/25/2026

   3. "Hot take: The best marketing is a great product..."
      👁️ 67,000 views | ❤️ 1,200 likes | 🔄 234 RTs | 💬 78 replies
      📅 3/22/2026

📈 Summary:
────────────────────────────────────────
   Total Views:     1,245,000
   Total Likes:     18,900
   Total Retweets:  5,670
   Total Replies:   2,340
   Avg Engagement:  898 per post
   Engagement Rate: 2.16%

💾 Analytics saved to sessionStorage.
📥 Analytics exported as JSON file.
```

---

## Tips & Tricks

1. **Engagement rate benchmarks** -- An engagement rate above 1% is good, above 3% is excellent for accounts with 10K+ followers.

2. **Sort by engagement** -- The script automatically sorts posts by total engagement (likes + retweets + replies) to show your best-performing content first.

3. **Export for analysis** -- The auto-exported JSON file can be imported into spreadsheets or analysis tools for deeper insights.

4. **Track over time** -- Run the analytics script weekly and compare exports to track growth trends.

5. **Navigate directly** -- Access your analytics dashboard at `x.com/i/account_analytics` or the detailed analytics at `analytics.x.com`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No overview metrics found" | Full analytics require X Premium. Subscribe at `x.com/i/premium_sign_up`. |
| Low post count | Increase `maxPostsToScan` in CONFIG. The script scrolls to load more posts. |
| Export not downloading | Check your browser's download settings. The file is named `xactions_analytics_YYYY-MM-DD.json`. |
| Metrics showing as 0 | X may not display metrics for very recent posts. Wait 24 hours for accurate data. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Creator Revenue | `browser/creatorSubscriptions.js` | Revenue sharing and subscriber management |
| Creator Studio | `src/creatorStudio.js` | Combined analytics, revenue, and subscribers |
| Premium Manager | `src/premiumManager.js` | Check tier and available features |
| Grok AI | `src/grokIntegration.js` | Use Grok to analyze post potential |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
