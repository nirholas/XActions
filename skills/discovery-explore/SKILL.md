---
name: discovery-explore
description: Explores X/Twitter trending topics, searches for content, and discovers new accounts. Includes trending topic monitoring, keyword search, explore page scraping, and topic discovery. Use when users want to explore trends, search for content, or discover new accounts and topics on X.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Discovery & Explore

Browser console scripts and MCP tools for exploring trends, searching content, and discovering accounts on X/Twitter.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Monitor trending topics | `src/trendingTopicMonitor.js` | `x.com/explore/tabs/trending` |
| Search tweets | `scripts/scrapeSearch.js` | Search results page |
| Scrape hashtag | `scripts/scrapeHashtag.js` | `x.com/hashtag/TAG` |
| Find viral tweets | `src/viralTweetDetector.js` | Any profile |
| Keyword monitoring | `src/keywordMonitor.js` | Any page |
| Scrape explore page | `src/exploreScraper.js` | `x.com/explore` |

## MCP Tools

| Tool | Description |
|------|-------------|
| `x_get_trends` | Current trending topics |
| `x_get_explore` | Explore page content |
| `x_search_tweets` | Full-text tweet search |

## Trending Topic Monitor

**File:** `src/trendingTopicMonitor.js`

Real-time trending topic scraper with niche classification.

### Controls
- `XActions.scan()` -- Scrape current trends
- `XActions.track()` -- Log trend snapshot with timestamp
- `XActions.history()` -- Show all tracked snapshots
- `XActions.forNiche(keyword)` -- Filter trends by niche keyword
- `XActions.export()` -- Download trend data as JSON

### Features
- Categorizes trends by niche (tech, politics, entertainment, sports, crypto, etc.)
- Tracks trend velocity (rising/falling)
- Identifies trending hashtags vs organic trends
- Alerts on niche-relevant trends

## Keyword Monitor

**File:** `src/keywordMonitor.js`

Monitors X for mentions of specific keywords with sentiment classification.

### Controls
- `XActions.setKeywords(['keyword1', 'keyword2'])` -- Configure keywords
- `XActions.scan()` -- Run one search cycle
- `XActions.autoScan(intervalMs)` -- Continuous monitoring
- `XActions.stop()` -- Stop auto-scanning
- `XActions.report()` -- Show summary with sentiment breakdown
- `XActions.export()` -- Download results as JSON

## Strategy Guide

### Trend-jacking workflow
1. Run `src/trendingTopicMonitor.js` -> `XActions.forNiche('your_niche')`
2. Identify relevant trends with momentum
3. Craft timely content using `src/threadComposer.js` or `src/contentRepurposer.js`
4. Post within the first 2 hours of trend emergence for maximum visibility
5. Track performance with `src/tweetPerformance.js`

### Content ideation from search
1. Use `scripts/scrapeSearch.js` or `x_search_tweets` for niche keywords
2. Analyze top results for content gaps
3. Use `src/viralTweetDetector.js` on popular accounts in your niche
4. Repurpose successful formats with `src/contentRepurposer.js`

### Building a discovery routine
1. Daily: `src/trendingTopicMonitor.js` -> `XActions.track()` for trend log
2. Weekly: Review `XActions.history()` for recurring themes
3. Set `src/keywordMonitor.js` for brand/topic monitoring

## Notes
- Explore page content varies by region and account history
- Trends refresh every ~15 minutes on X
- Keyword monitor uses X search (subject to standard rate limits)
- Trending data is publicly accessible (no auth needed for viewing)
