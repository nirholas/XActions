---
name: discovery-explore
description: Searches tweets, scrapes trending topics, browses explore feed tabs, follows topics, and performs advanced filtered searches on X/Twitter. Supports date filters, engagement minimums, media filters, and all X search operators. Use when users want to search X, explore trends, or discover content.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Discovery & Explore

Browser automation for X/Twitter search, trending topics, and content discovery.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Search tweets | `src/discoveryExplore.js` | `x.com/search?q=QUERY` |
| Get trending topics | `src/discoveryExplore.js` | `x.com/explore/tabs/trending` |
| Browse explore feed | `src/discoveryExplore.js` | `x.com/explore` |
| Follow a topic | `src/discoveryExplore.js` | Topic search page |
| Advanced filtered search | `src/discoveryExplore.js` | `x.com/search` |

## Discovery Explore

**File:** `src/discoveryExplore.js`

Puppeteer-based module for search, trends, explore feed, and topic management.

### Functions

| Function | Purpose |
|----------|---------|
| `searchTweets(page, query, { limit, tab, since, until })` | Search with optional date range and tab (latest/people/media) |
| `getTrends(page, { location })` | Scrape all visible trending topics with rank, name, category, tweet count |
| `getExploreFeed(page, { limit, tab })` | Get tweets from explore tabs (foryou/trending/news/sports/entertainment) |
| `followTopic(page, topicName)` | Follow a topic via search |
| `advancedSearch(page, filters)` | Multi-filter search with all X operators |

### Search Tweets

Navigates to X search with the given query and scrolls to collect results. Supports `tab` parameter: `'latest'` (default), `'people'`, `'media'`. Returns tweet text, author, time, link, likes, and reposts.

### Get Trends

Visits `x.com/explore/tabs/trending` and extracts all trend items with rank, name, category label, and tweet count.

### Advanced Search

Builds a query from structured filters:

```javascript
await advancedSearch(page, {
  allWords: 'javascript',
  from: 'nichxbt',
  since: '2025-01-01',
  minLikes: 100,
  hasMedia: true,
  lang: 'en',
  limit: 50,
});
```

**Available filters:** `allWords`, `exactPhrase`, `anyWords`, `noneOfWords`, `hashtags`, `from`, `to`, `mentioning`, `since`, `until`, `minLikes`, `minRetweets`, `hasMedia`, `hasLinks`, `lang`.

## X Search Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `from:` | `from:elonmusk` | Tweets from specific user |
| `to:` | `to:elonmusk` | Replies to specific user |
| `since:` / `until:` | `since:2024-01-01` | Date range |
| `min_faves:` | `min_faves:100` | Minimum likes |
| `min_retweets:` | `min_retweets:50` | Minimum retweets |
| `filter:media` | `-filter:retweets` | Include/exclude filters |
| `lang:` | `lang:en` | Language filter |

## DOM Selectors

| Element | Selector |
|---------|----------|
| Search input | `[data-testid="SearchBox_Search_Input"]` |
| Trend item | `[data-testid="trend"]` |
| Topic follow | `[data-testid="TopicFollow"]` |
| Tab buttons | `[role="tab"]` |
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |

## Rate Limiting

- 1.5s delay between scroll cycles
- 3s initial wait after page navigation
- Scrolls cap at `limit * 2` attempts to avoid infinite loops

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No trends visible | Trends are location-specific — check account region settings |
| Search returns no results | Try broader keywords or remove date/engagement filters |
| Topic follow button not found | Topic may not exist as a followable entity |
| Explore feed empty | Ensure you're logged in with an active account |
