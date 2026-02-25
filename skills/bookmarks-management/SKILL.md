---
name: bookmarks-management
description: Manages X/Twitter bookmarks — organize by category with auto-tagging, clear all bookmarks in bulk, and export/scrape bookmarks with full metadata. Supports keyword-based categorization, CSV and JSON export, keep-filters, and folder creation (Premium). Use when users want to export, organize, or clear their X bookmarks.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Bookmarks Management

Browser console scripts for managing, organizing, exporting, and clearing X/Twitter bookmarks.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Export bookmarks (full metadata) | `scripts/scrapeBookmarks.js` | `x.com/i/bookmarks` |
| Organize bookmarks by category | `src/bookmarkOrganizer.js` | `x.com/i/bookmarks` |
| Clear all bookmarks | `src/clearAllBookmarks.js` | `x.com/i/bookmarks` |
| Manage bookmarks (Puppeteer) | `src/bookmarkManager.js` | `x.com/i/bookmarks` |

## Scrape Bookmarks

**File:** `scripts/scrapeBookmarks.js`

Scrolls through your bookmarks and exports all posts with full metadata: text, author, engagement metrics, media URLs, external links, hashtags, and mentions. Exports as JSON, CSV, or both.

### How to Use

1. Navigate to `x.com/i/bookmarks`
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Auto-downloads when complete

### Configuration

- `MAX_BOOKMARKS: 2000` — maximum to collect
- `FORMAT: 'both'` — `'json'`, `'csv'`, or `'both'`
- `INCLUDE_MEDIA_URLS: true` — include image/video URLs
- `INCLUDE_LINKS: true` — include external links

### Output

Each bookmark includes: `tweetId`, `handle`, `displayName`, `verified`, `text`, `url`, `time`, `likes`, `retweets`, `replies`, `views`, `images`, `videos`, `links`, `hashtags`, `mentions`.

## Bookmark Organizer

**File:** `src/bookmarkOrganizer.js`

Auto-categorizes bookmarks by keyword matching and exports organized data. Configure categories in `CONFIG.categories` (default: Tech, News, Crypto, Funny, Business). Unmatched bookmarks go to "Uncategorized." Supports JSON and CSV export.

1. Navigate to `x.com/i/bookmarks` → paste in DevTools → Enter
2. Prints category breakdown in console → auto-downloads organized export

## Clear All Bookmarks

**File:** `src/clearAllBookmarks.js`

Removes all bookmarks. Tries the built-in "Clear All" button first, then falls back to removing bookmarks individually by scrolling and clicking.

### How to Use

1. Navigate to `x.com/i/bookmarks` → paste in DevTools → Enter

### Features

- `keepKeywords: []` — protect bookmarks containing specific words
- `dryRun: false` — preview removals without deleting
- `exportOnComplete: true` — auto-download log of removed bookmarks
- Pause/resume/abort via `window.XActions.pause()` / `.resume()` / `.abort()`
- Rate limit detection with automatic cooldown

## Bookmark Manager (Puppeteer)

**File:** `src/bookmarkManager.js`

Node.js/Puppeteer module for programmatic bookmark operations.

### Functions

| Function | Purpose |
|----------|---------|
| `getBookmarks(page, { limit, format })` | Export bookmarks as JSON or CSV |
| `createFolder(page, folderName)` | Create bookmark folder (Premium) |
| `clearAllBookmarks(page)` | Remove all bookmarks |

## DOM Selectors

| Element | Selector |
|---------|----------|
| Bookmark button | `[data-testid="bookmark"]` |
| Remove bookmark | `[data-testid="removeBookmark"]` |
| Tweet in bookmarks | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| Create folder | `[data-testid="createBookmarkFolder"]` |
| Clear all | `[data-testid="clearBookmarks"]` |
| Confirm dialog | `[data-testid="confirmationSheetConfirm"]` |

## Rate Limiting & Safety

- 1.5s scroll delay between pagination cycles
- 0.8–2.2s delay between individual removals (gaussian randomized)
- Rate limit detection via `[data-testid="toast"]` with 60s cooldown
- **Clearing is irreversible** — export first with `scripts/scrapeBookmarks.js`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No bookmarks found | Ensure you're on `x.com/i/bookmarks`, not `/i/lists` |
| Export missing tweets | Increase `MAX_BOOKMARKS` or `maxBookmarks` config |
| Folder creation fails | Bookmark folders require Premium subscription |
| Clear stops midway | Rate limit triggered — script auto-retries after cooldown |
