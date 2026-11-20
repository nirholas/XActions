---
title: "Search (Basic and Advanced) on X (Twitter) — Tutorial"
description: "Search X/Twitter with operators, advanced filters, and save searches using XActions scripts."
keywords: ["twitter search", "x advanced search", "twitter search operators", "xactions search", "save search twitter", "twitter search automation"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Search (Basic and Advanced) — Tutorial

> Step-by-step guide to searching X/Twitter with operators, advanced filters, and saved searches using XActions scripts.

**Works on:** Browser Console | Node.js (Puppeteer)
**Difficulty:** Beginner to Intermediate
**Time:** 2-10 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to `https://x.com/search` or `https://x.com/explore`

---

## Quick Start

1. Open x.com and navigate to **Search** or **Explore**
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/saveSearch.js` (browser) or use `src/discoveryExplore.js` (Node.js)
4. Edit the `CONFIG` section
5. Paste into the console and press Enter

---

## Configuration

### Browser Script (`browser/saveSearch.js`)

```js
const CONFIG = {
  action: 'save',
  //   'save'    -- save a search query
  //   'list'    -- list all saved searches
  //   'delete'  -- delete a saved search
  //   'search'  -- run a search and save it

  query: '',                       // The search query
  deleteQuery: '',                 // Query text of saved search to delete

  // Timing
  navigationDelay: 3000,
  actionDelay: 2000,

  // Safety
  dryRun: true,
};
```

### Node.js Library (`src/discoveryExplore.js`)

```js
import { searchTweets, advancedSearch } from './src/discoveryExplore.js';
```

---

## X Search Operators Reference

Before diving into the scripts, here is a reference of X search operators you can use in any search query:

| Operator | Example | Description |
|----------|---------|-------------|
| `from:` | `from:nichxbt` | Tweets from a specific user |
| `to:` | `to:nichxbt` | Tweets replying to a specific user |
| `@` | `@nichxbt` | Tweets mentioning a user |
| `"exact phrase"` | `"machine learning"` | Exact phrase match |
| `OR` | `bitcoin OR ethereum` | Match either term |
| `-` | `crypto -scam` | Exclude a term |
| `#` | `#web3` | Hashtag search |
| `since:` | `since:2026-01-01` | Tweets after a date |
| `until:` | `until:2026-03-30` | Tweets before a date |
| `min_faves:` | `min_faves:100` | Minimum likes |
| `min_retweets:` | `min_retweets:50` | Minimum reposts |
| `filter:media` | `filter:media` | Only tweets with images/video |
| `filter:links` | `filter:links` | Only tweets with links |
| `lang:` | `lang:en` | Tweets in a specific language |
| `-is:retweet` | `-is:retweet` | Exclude reposts |
| `filter:replies` | `filter:replies` | Only replies |

### Combining Operators

You can combine multiple operators in a single query:

```
from:nichxbt since:2026-01-01 min_faves:10 -is:retweet lang:en
```

This finds original tweets (no reposts) by @nichxbt since January 2026 with at least 10 likes, in English.

---

## Step-by-Step Guide

### Saving a Search (Browser Script)

**Step 1 -- Run a search**

```js
const CONFIG = {
  action: 'search',
  query: 'xactions OR "twitter automation" -is:retweet',
  dryRun: false,
};
```

The script types the query into the search bar, submits it, then saves the search.

**Step 2 -- Save the current search**

If you have already performed a search manually:

```js
const CONFIG = {
  action: 'save',
  dryRun: false,
};
```

### Listing Saved Searches

```js
const CONFIG = {
  action: 'list',
  dryRun: false,   // Safe -- only reads data
};
```

Output:

```
Listing saved searches...
  xactions OR "twitter automation"
  from:nichxbt min_faves:10
  #web3 #defi since:2026-01-01
Found 3 saved searches
```

### Deleting a Saved Search

```js
const CONFIG = {
  action: 'delete',
  deleteQuery: 'xactions OR "twitter automation"',
  dryRun: true,
};
```

### Node.js: Basic Search

Using the `discoveryExplore.js` module with Puppeteer:

```js
import { searchTweets } from './src/discoveryExplore.js';

const tweets = await searchTweets(page, 'AI agents', {
  limit: 50,
  tab: 'latest',      // 'latest', 'people', or 'media'
  since: '2026-03-01',
  until: '2026-03-30',
});

console.log(`Found ${tweets.length} tweets`);
tweets.forEach(t => {
  console.log(`@${t.author}: ${t.text.substring(0, 80)}... (${t.likes} likes)`);
});
```

### Node.js: Advanced Search with Filters

```js
import { advancedSearch } from './src/discoveryExplore.js';

const results = await advancedSearch(page, {
  allWords: 'AI automation',
  exactPhrase: 'browser script',
  anyWords: 'XActions unfollowx',
  noneOfWords: 'spam scam',
  hashtags: '#buildinpublic',
  from: 'nichxbt',
  since: '2026-01-01',
  until: '2026-03-30',
  minLikes: 10,
  minRetweets: 5,
  hasMedia: false,
  lang: 'en',
  limit: 100,
});

console.log(`Found ${results.length} matching tweets`);
```

The `advancedSearch` function builds a query string from the filter object:

| Filter | Maps to |
|--------|---------|
| `allWords` | Plain text in query |
| `exactPhrase` | `"exact phrase"` |
| `anyWords` | `(word1 OR word2)` |
| `noneOfWords` | `-word1 -word2` |
| `hashtags` | `#tag1 #tag2` |
| `from` | `from:username` |
| `to` | `to:username` |
| `mentioning` | `@username` |
| `since` / `until` | `since:date` / `until:date` |
| `minLikes` | `min_faves:N` |
| `minRetweets` | `min_retweets:N` |
| `hasMedia` | `filter:media` |
| `hasLinks` | `filter:links` |
| `lang` | `lang:code` |

---

## Tips & Tricks

- **Saved searches are quick access.** Click the search bar on X and your saved searches appear in the dropdown.
- **Use `since:` and `until:` for time ranges.** Format: `YYYY-MM-DD`.
- **Combine `-is:retweet` with `from:`** to see only original tweets from an account.
- **`min_faves:` finds quality content.** Use this to filter for popular tweets.
- **The `latest` tab shows chronological results.** The default "Top" tab shows algorithmic ranking.
- **State is saved.** Browser script progress is stored in `sessionStorage` under `xactions_saveSearch`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not find search input" | Navigate to `x.com/search` or `x.com/explore` first |
| "Could not find Save Search button" | Perform a search first, then look for the save option in the more menu (three dots) |
| Saved search not appearing in list | Focus the search input bar to trigger the dropdown showing saved searches |
| "No deleteQuery provided" | For the `delete` action, set `CONFIG.deleteQuery` to the text of the saved search |
| Advanced search returns 0 results | Your filters may be too restrictive. Remove some filters and try again |
| Search results are different from manual | The script uses URL-based navigation. Some advanced operators may behave differently via URL |

---

## Related Scripts

- `src/discoveryExplore.js` -- Node.js search, trends, and explore automation
- `browser/saveSearch.js` -- Browser script for saving and managing searches
- `browser/topicManager.js` -- Follow topics related to your searches
