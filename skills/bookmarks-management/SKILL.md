---
name: bookmarks-management
description: Manages X/Twitter bookmarks including organizing by category, clearing all bookmarks, exporting bookmarks, and scraping saved posts. Use when users want to manage, export, or clean up their X bookmarks.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Bookmarks Management

Browser console scripts for managing, organizing, exporting, and clearing X/Twitter bookmarks.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Bookmark Manager | `src/bookmarkManager.js` | Core bookmark management operations |
| Bookmark Organizer | `src/bookmarkOrganizer.js` | Auto-categorize bookmarks by keywords |
| Clear All Bookmarks | `src/clearAllBookmarks.js` | Remove all bookmarks in bulk |
| Scrape Bookmarks | `scripts/scrapeBookmarks.js` | Export all bookmarks as JSON |

## Bookmark Organizer

**File:** `src/bookmarkOrganizer.js`

Auto-categorizes bookmarks by keyword matching and exports organized data.

### Configuration

```javascript
const CONFIG = {
  categories: {
    'Tech': ['javascript', 'python', 'coding', 'ai'],
    'Crypto': ['bitcoin', 'eth', 'web3'],
  },
  exportFormat: 'json',  // or 'csv'
};
```

### How to use

1. Navigate to `x.com/i/bookmarks`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Clear All Bookmarks

**File:** `src/clearAllBookmarks.js`

Removes all bookmarks by scrolling through and clicking remove on each.

1. Navigate to `x.com/i/bookmarks`
2. Paste in DevTools console → Enter

## Scrape Bookmarks

**File:** `scripts/scrapeBookmarks.js`

Exports all bookmarks as JSON with tweet text, author, date, and engagement metrics.

1. Navigate to `x.com/i/bookmarks`
2. Paste in DevTools console → Enter
3. Auto-downloads JSON when complete

## Key Selectors

| Element | Selector |
|---------|----------|
| Bookmark button | `[data-testid="bookmark"]` |
| Remove bookmark | `[data-testid="removeBookmark"]` |
| Bookmark folder | `[data-testid="bookmarkFolder"]` |
| Create folder | `[data-testid="createBookmarkFolder"]` |
| Tweet in bookmarks | `article[data-testid="tweet"]` |

## Notes

- Clearing bookmarks is irreversible — export first with scrapeBookmarks.js
- Organizer supports both JSON and CSV export formats
- All scripts use scroll-and-process pattern with retry logic
