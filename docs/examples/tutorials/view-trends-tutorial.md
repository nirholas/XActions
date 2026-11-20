---
title: "View Trends & Explore on X (Twitter) — Tutorial"
description: "Browse trending topics, explore tabs, and scrape trend data on X/Twitter using XActions scripts."
keywords: ["twitter trends", "x trending topics", "explore tab twitter", "xactions trends", "twitter trend scraper", "what is trending on twitter"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# View Trends & Explore — Tutorial

> Step-by-step guide to viewing trending topics, browsing the Explore tab, and scraping trend data on X/Twitter using XActions scripts.

**Works on:** Node.js (Puppeteer)
**Difficulty:** Beginner
**Time:** 2-5 minutes
**Requirements:** Node.js environment with Puppeteer, or logged into x.com

---

## Prerequisites

- Node.js >= 18 installed with XActions dependencies (`npm install`)
- A Puppeteer page authenticated with your X session cookie
- Or: logged into x.com in your browser for manual exploration

---

## Quick Start

1. Set up a Puppeteer page with your X session cookie (see `XACTIONS_SESSION_COOKIE` in `.env`)
2. Import functions from `src/discoveryExplore.js`
3. Call `getTrends()` or `getExploreFeed()` with your page instance
4. Process the returned data
5. Export or display results

---

## Configuration

The `discoveryExplore.js` module provides several functions with configurable options:

### getTrends

```js
import { getTrends } from './src/discoveryExplore.js';

const result = await getTrends(page, {
  location: 'global',   // Location context (for display purposes)
});
```

### getExploreFeed

```js
import { getExploreFeed } from './src/discoveryExplore.js';

const result = await getExploreFeed(page, {
  limit: 30,             // Max items to collect
  tab: 'trending',       // 'foryou', 'trending', 'news', 'sports', 'entertainment'
});
```

| Tab | URL | Description |
|-----|-----|-------------|
| `foryou` | `/explore` | Personalized explore feed |
| `trending` | `/explore/tabs/trending` | Currently trending topics |
| `news` | `/explore/tabs/news` | News-related trends and stories |
| `sports` | `/explore/tabs/sports` | Sports trends and scores |
| `entertainment` | `/explore/tabs/entertainment` | Entertainment and pop culture |

---

## Step-by-Step Guide

### Getting Trending Topics

**Step 1 -- Import and call**

```js
import { getTrends } from './src/discoveryExplore.js';

const { location, trends, scrapedAt } = await getTrends(page);
```

**Step 2 -- Process results**

```js
console.log(`Trends scraped at ${scrapedAt}`);
console.log(`Location: ${location}`);

trends.forEach(trend => {
  console.log(`#${trend.rank} ${trend.name} (${trend.category}) - ${trend.tweetCount}`);
});
```

**Example output:**

```
Trends scraped at 2026-03-30T14:00:00.000Z
Location: global
#1 #AI (Technology) - 125K posts
#2 Bitcoin (Crypto) - 98K posts
#3 #OpenAI (Technology) - 67K posts
#4 March Madness (Sports) - 45K posts
#5 Taylor Swift (Entertainment) - 38K posts
```

**Step 3 -- Export to JSON**

```js
import fs from 'fs';

const trendData = await getTrends(page);
fs.writeFileSync(
  `trends-${new Date().toISOString().slice(0, 10)}.json`,
  JSON.stringify(trendData, null, 2)
);
```

### Browsing the Explore Feed

**Step 1 -- Get the For You explore feed**

```js
import { getExploreFeed } from './src/discoveryExplore.js';

const { tab, items, scrapedAt } = await getExploreFeed(page, {
  limit: 50,
  tab: 'foryou',
});

console.log(`${items.length} items from ${tab} feed`);
items.forEach(item => {
  console.log(`@${item.author}: ${item.text.substring(0, 80)}...`);
});
```

**Step 2 -- Browse different tabs**

```js
// Get trending content
const trending = await getExploreFeed(page, { tab: 'trending', limit: 20 });

// Get news
const news = await getExploreFeed(page, { tab: 'news', limit: 20 });

// Get sports
const sports = await getExploreFeed(page, { tab: 'sports', limit: 20 });

// Get entertainment
const entertainment = await getExploreFeed(page, { tab: 'entertainment', limit: 20 });
```

### Tracking Trends Over Time

Combine `getTrends` with a scheduled job to track how trends change:

```js
import { getTrends } from './src/discoveryExplore.js';
import fs from 'fs';

const snapshot = async () => {
  const data = await getTrends(page);
  const filename = `trends-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Saved ${data.trends.length} trends to ${filename}`);
};

// Run every hour (if using with a scheduler)
await snapshot();
```

### Combining with Search

Use trends to power targeted searches:

```js
import { getTrends, searchTweets } from './src/discoveryExplore.js';

// Get current trends
const { trends } = await getTrends(page);

// Search for tweets about the top trend
const topTrend = trends[0];
console.log(`Searching for top trend: ${topTrend.name}`);

const tweets = await searchTweets(page, topTrend.name, {
  limit: 20,
  tab: 'latest',
});

console.log(`Found ${tweets.length} recent tweets about "${topTrend.name}"`);
```

---

## Tips & Tricks

- **Trends update frequently.** Scrape multiple times per day for comprehensive tracking.
- **The "For You" tab is personalized.** Results vary based on your account's interests and activity.
- **Tweet counts are approximate.** X rounds tweet counts (e.g., "125K posts").
- **Combine tabs for a full picture.** Scrape all five explore tabs to get a comprehensive view of what is happening on X.
- **Export regularly.** Save trend snapshots to build a historical dataset for analysis.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No trends returned | The explore page may not have loaded fully. Increase the sleep time after navigation |
| Empty explore feed | Your session cookie may have expired. Re-authenticate with a fresh cookie |
| Duplicate trends in output | The scraper deduplicates by default, but if you see duplicates, the selector may be matching container elements |
| Tab URL not working | X may have changed their URL structure. Try navigating manually and checking the current URLs |
| "page.goto is not a function" | Make sure you are passing a Puppeteer page instance, not a URL string |

---

## Related Scripts

- `src/discoveryExplore.js` -- Full Node.js module for search, trends, and explore
- `browser/saveSearch.js` -- Save and manage searches (browser script)
- `browser/topicManager.js` -- Follow topics related to trending subjects
- `browser/timelineViewer.js` -- View and export your For You/Following timelines
