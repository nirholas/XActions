---
name: discovery-explore
description: Navigates X/Twitter Explore page, trending topics, search features, and content discovery. Scrapes trends, monitors keywords, analyzes trending topics by niche, and discovers content opportunities. Use when users want to explore trending topics, search X, monitor keywords, or discover new content.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Discovery & Explore

Browser console scripts for X/Twitter's Explore page, trending topics, search, and content discovery.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Scrape & explore trending topics | `src/discoveryExplore.js` | `x.com/explore` |
| Monitor trends with niche classification | `src/trendingTopicMonitor.js` | `x.com/explore/tabs/trending` |
| Monitor keywords in search | `src/keywordMonitor.js` | `x.com/search?q=KEYWORD` |
| Scrape search results | `scripts/scrapeSearch.js` | `x.com/search?q=KEYWORD` |
| Scrape hashtag content | `scripts/scrapeHashtag.js` | `x.com/hashtag/TAG` |
| Find viral tweets | `src/viralTweetDetector.js` | `x.com/USERNAME` |
| Analyze audience overlap | `src/audienceOverlap.js` | `x.com/ACCOUNT/followers` |

## Discovery Explore

**File:** `src/discoveryExplore.js`

Interacts with X's Explore page to scrape trending topics, follow/unfollow topics, and collect search results.

### How to Use

1. Navigate to `x.com/explore`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Features

- Scrape all visible trending topics
- Follow/unfollow suggested topics
- Collect search result tweets
- Export all data as JSON

## Trending Topic Monitor

**File:** `src/trendingTopicMonitor.js`

Real-time trending topic monitoring with niche classification and history tracking.

### Features

- **Niche classification:** Auto-categorizes trends into 8 categories (Tech, Politics, Sports, Entertainment, Business, Gaming, Science, Culture)
- **History tracking:** localStorage snapshots with delta comparison (new/rising/falling/dropped)
- **Keyword alerts:** Watch for specific keywords in trending topics
- **Auto-refresh:** Monitor continuously at configurable intervals
- **Content opportunities:** Identifies trending topics in your niche for timely content

### Controls

- `XActions.watch('keyword1', 'keyword2')` — Set keyword alerts
- `XActions.history()` — View trend history snapshots
- `XActions.compare()` — Compare current vs previous snapshot
- `XActions.autoRefresh(ms)` — Start auto-monitoring
- `XActions.stop()` — Stop monitoring

## Keyword Monitor

**File:** `src/keywordMonitor.js`

Monitor specific keyword mentions across X search in real-time.

### Features

- Auto-detects keyword from search URL
- Scrapes search results with author, metrics, verified status
- Tracks new vs existing mentions via localStorage
- Top mentioners leaderboard
- Quick sentiment analysis (positive/negative/neutral)
- Verified account mention highlights
- Auto-refresh monitoring

### Controls

- `XActions.monitor()` — Run one scan cycle
- `XActions.autoRefresh(ms)` — Continuous monitoring
- `XActions.stop()` — Stop monitoring
- `XActions.stats()` — View keyword statistics
- `XActions.history()` — View mention history
- `XActions.reset()` — Clear all stored data

## DOM Selectors

| Element | Selector | Notes |
|---------|----------|-------|
| Trend items | `[data-testid="trend"]` | Individual trending topics |
| Topic follow button | `[data-testid="TopicFollow"]` | Follow a topic |
| Search input | `[data-testid="SearchBox_Search_Input"]` | Search box |
| Search results | `[data-testid="TypeaheadListItem"]` | Autocomplete results |
| Timeline tweets | `article[data-testid="tweet"]` | Tweet articles in search |
| Trend name | `[data-testid="trend"] span` | Trend text content |
| Trend category | `[data-testid="trend"] > div:first-child` | Category label |
| Tab buttons | `[role="tab"]` | For You / Trending / News tabs |

## Search Operators

X supports advanced search operators that work in both the search bar and scraping scripts:

| Operator | Example | Description |
|----------|---------|-------------|
| `from:` | `from:elonmusk` | Tweets from specific user |
| `to:` | `to:elonmusk` | Replies to specific user |
| `since:` | `since:2024-01-01` | Tweets after date |
| `until:` | `until:2024-12-31` | Tweets before date |
| `min_faves:` | `min_faves:100` | Minimum likes |
| `min_retweets:` | `min_retweets:50` | Minimum retweets |
| `min_replies:` | `min_replies:10` | Minimum replies |
| `-filter:` | `-filter:retweets` | Exclude retweets |
| `filter:` | `filter:media` | Only tweets with media |
| `lang:` | `lang:en` | Language filter |

## Strategy Guide

### Finding content opportunities

1. Run `src/trendingTopicMonitor.js` on the Explore page
2. Set alerts for your niche keywords with `XActions.watch('ai', 'tech')`
3. When a relevant trend appears, create timely content
4. Use `src/keywordMonitor.js` to track your keyword's performance
5. Analyze what viral tweets look like with `src/viralTweetDetector.js`

### Competitive research via search

1. Navigate to `x.com/search?q=from:competitor`
2. Paste `scripts/scrapeSearch.js` to collect their tweets
3. Analyze engagement patterns with `src/tweetPerformance.js`
4. Use `src/audienceOverlap.js` to see shared followers
5. Create content that fills gaps in their coverage

### Monitoring brand mentions

1. Navigate to `x.com/search?q=yourbrand`
2. Paste `src/keywordMonitor.js`
3. Run `XActions.autoRefresh(60000)` for real-time monitoring
4. Check `XActions.stats()` for mention volume trends
5. Export data for reporting with auto JSON download

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No trends visible | Trends are location-specific — check account settings |
| Search returns no results | Try broader keywords or remove filters |
| Keyword monitor shows 0 new mentions | Keyword may have low volume — try broader terms |
| Auto-refresh stops working | Tab may have been backgrounded — Chrome throttles timers |
| Trends not updating | X caches trends — try refreshing the page |
| Search operators not working | Ensure proper syntax with no spaces around colons |

## Related Skills

- **twitter-scraping** — Deep scraping of search results and timelines
- **growth-automation** — Use trends to grow your audience
- **content-posting** — Create content around trending topics
- **analytics-insights** — Analyze engagement on trend-related posts
