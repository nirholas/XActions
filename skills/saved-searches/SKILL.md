---
name: saved-searches
description: Create, manage, and run saved searches on X/Twitter. Save search queries, list saved searches, delete them, and run them to see fresh results. Use when users want to save or manage search queries on X.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Saved Searches

Browser console scripts for managing saved searches on X/Twitter.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Save a search query | `src/saveSearch.js` | `x.com/search?q=...` (search results page) |
| List / delete / run saved searches | `src/savedSearchManager.js` | `x.com` |

## Quick Start

### Save a search

1. Search for something on X: `x.com/search?q=your+query`
2. Open DevTools (F12) → Console
3. Paste `src/saveSearch.js` → Enter

### Manage saved searches

1. Go to `x.com`
2. Open DevTools (F12) → Console
3. Paste `src/savedSearchManager.js` → Enter

## Available Functions (`savedSearchManager.js`)

```js
XActions.list()            // List all saved searches
XActions.run('query')      // Run a saved search (navigates to results)
XActions.delete('query')   // Delete a saved search by name
XActions.export()          // Export all saved searches as JSON
```

## Configuration

```js
const CONFIG = {
  maxTweets: 100,          // Max tweets to collect when running a search
  scrollDelay: 2000,       // ms between scroll actions
  actionDelay: 1500,       // ms between UI actions
  maxScrollAttempts: 25,   // Max scroll rounds before stopping
};
```

## Notes

- X limits saved searches to 25 per account
- Saved searches are stored in your X account (not just browser storage)
- `savedSearchManager.js` can also scrape trending topics for discovery

## Related Skills

- **discovery-explore** — Browse trending topics and explore without saved searches
- **analytics-insights** — Analyze search results for hashtags and keywords
- **twitter-scraping** — Scrape full search result data
