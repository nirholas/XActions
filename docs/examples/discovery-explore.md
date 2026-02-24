# 🔍 Discovery & Explore

Scrape trends, explore feed, topics, and advanced search on X/Twitter.

## 📋 What It Does

1. Scrapes trending topics with post counts
2. Exports explore feed content
3. Follows/unfollows topics
4. Performs advanced search with filters

## 🌐 Browser Console Script

```javascript
// Go to: x.com/explore
// Paste scripts/scrapeExplore.js
```

### Quick Trends Scrape

```javascript
(() => {
  const trends = [];
  document.querySelectorAll('[data-testid="trend"]').forEach((el, i) => {
    const spans = el.querySelectorAll('[dir="ltr"] span');
    trends.push({
      rank: i + 1,
      name: spans[0]?.textContent || '',
    });
  });
  console.table(trends);
})();
```

## 📦 Node.js Module

```javascript
import { getTrends, searchTweets, advancedSearch, getExploreFeed } from 'xactions';

// Get current trends
const trends = await getTrends(page);

// Basic search
const results = await searchTweets(page, 'AI agents');

// Advanced search with filters
const filtered = await advancedSearch(page, {
  query: 'typescript',
  from: 'nichxbt',
  minLikes: 10,
  since: '2026-01-01',
  filter: 'links',
});

// Get explore feed
const feed = await getExploreFeed(page, { category: 'technology' });
```

## 🔧 MCP Server

```
Tool: x_search_tweets
Input: { "query": "AI agents", "limit": 50 }

Tool: x_get_trends
Input: { "category": "technology" }
```

## 🔎 Advanced Search Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `from:` | `from:nichxbt` | Posts from user |
| `to:` | `to:nichxbt` | Replies to user |
| `since:` | `since:2026-01-01` | Posts after date |
| `until:` | `until:2026-02-01` | Posts before date |
| `min_faves:` | `min_faves:100` | Minimum likes |
| `min_retweets:` | `min_retweets:50` | Minimum reposts |
| `filter:links` | | Only posts with links |
| `filter:media` | | Only posts with media |
| `-filter:replies` | | Exclude replies |
| `lang:` | `lang:en` | Posts in language |

## ⚠️ Notes

- Trends refresh every ~15 minutes
- Explore categories: For You, Trending, News, Sports, Entertainment
- Grok summaries appear in Explore (2025+) for trending topics
- Advanced search operators can be combined
