---
name: discovery-explore
description: Navigates X/Twitter Explore page, trending topics, and search features. Scrapes trends, follows topics, and discovers content. Use when users want to explore trending topics, search X, or discover new content.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Discovery & Explore

Browser console script for interacting with X/Twitter's Explore page and discovery features.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Discovery Explore | `src/discoveryExplore.js` | Scrape trends, follow topics, search discovery |

## Discovery Explore

**File:** `src/discoveryExplore.js`

Interacts with X's Explore page to scrape trending topics, follow/unfollow topics, and collect search results.

### How to use

1. Navigate to `x.com/explore`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Trend items | `[data-testid="trend"]` |
| Topic follow | `[data-testid="TopicFollow"]` |
| Search input | `[data-testid="SearchBox_Search_Input"]` |
| Search results | `[data-testid="TypeaheadListItem"]` |
| Timeline tweets | `article[data-testid="tweet"]` |

## Notes

- Trends are location-specific (based on account settings)
- Explore page content updates frequently
- Search supports operators: `from:user`, `since:date`, `min_faves:N`
