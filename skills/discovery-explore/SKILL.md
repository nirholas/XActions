---
name: discovery-explore
description: Automate X/Twitter discovery features including For You feed, Following feed, Trends, Topics, Starterpacks, Advanced Search, Saved Searches, and the 2026 Explore redesign with Grok AI summaries and Radar Search.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Discovery & Explore with XActions

Automate content discovery, trend analysis, and search on X/Twitter.

## Features

- **For You Feed**: AI-curated feed (recency, relevance, diversity)
- **Following Feed**: Chronological timeline
- **Trends**: Global and local trending topics/hashtags
- **Topics**: Follow interest categories (Tech, Sports, etc.)
- **Starterpacks**: Curated account groups for new users
- **Advanced Search**: Filters by date, location, media type, user
- **Saved Searches**: Bookmark frequently used queries
- **Explore Redesign**: AI-generated topic summaries via Grok (2026)
- **Radar Search**: Enhanced search for Premium+ (2026)
- **Grok Summaries**: AI summaries for trending topics (2026)

## Browser Console Script

**File:** `scripts/scrapeExplore.js`

### How to use

1. Navigate to `x.com/explore`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Search input | `[data-testid="SearchBox_Search_Input"]` |
| Search results | `[data-testid="TypeaheadListItem"]` |
| Trend items | `[data-testid="trend"]` |
| Topic follow | `[data-testid="TopicFollow"]` |
| Explore tabs | `[role="tab"]` |
| Timeline tweets | `article[data-testid="tweet"]` |
| For You tab | `[role="tab"][aria-selected="true"]` |

## MCP Tools

- `x_search_tweets` – Search for tweets with query operators
- `x_get_trends` – Get current trending topics
- `x_get_topics` – Get followed topics
- `x_follow_topic` – Follow a topic
- `x_advanced_search` – Search with date/location/media filters
- `x_explore_feed` – Get explore/For You feed content

## API Endpoints

- `GET /api/discovery/trends` – Current trends
- `GET /api/discovery/search?q=query` – Search tweets
- `GET /api/discovery/topics` – Browse topics
- `POST /api/discovery/topics/follow` – Follow a topic
- `GET /api/discovery/explore` – Explore feed content
- `GET /api/discovery/advanced-search` – Advanced search with filters

## Related Files

- `src/discoveryExplore.js` – Core discovery module
- `src/hashtagAnalytics.js` – Hashtag trend analysis
- `scripts/scrapeExplore.js` – Browser explore scraper
- `scripts/scrapeSearch.js` – Search scraping script
- `scripts/scrapeHashtag.js` – Hashtag scraping

## Notes

- For You feed is algorithm-driven; Premium accounts get priority
- Trends update every ~5 minutes
- Advanced search operators: from:, to:, since:, until:, filter:media, etc.
- Radar Search is Premium+ only
- Grok AI summaries appear on trending topics (2026)
