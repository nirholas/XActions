# Bookmark Posts & Create Bookmark Folders -- Tutorial

> Step-by-step guide to managing bookmarks on X using XActions browser scripts and the Node.js library.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to `https://x.com/i/bookmarks`
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of the script you need (see table below)
4. Edit the `CONFIG` section
5. Paste into the console and press Enter

## Scripts Overview

| Script | Context | Purpose |
|--------|---------|---------|
| `src/bookmarkOrganizer.js` | Browser | Scan, categorize, and export bookmarks |
| `src/clearAllBookmarks.js` | Browser | Remove all bookmarks with keep-filters |
| `src/bookmarkManager.js` | Node.js (Puppeteer) | Get bookmarks, create folders, clear all |

## Configuration

### src/bookmarkOrganizer.js (Browser Script)

```js
const CONFIG = {
  maxBookmarks: 200,
  scrollDelay: 1500,
  exportFormat: 'json',  // 'json' or 'csv'
  categories: {
    'Tech': ['javascript', 'python', 'coding', 'programming', 'ai', 'ml'],
    'News': ['breaking', 'report', 'update', 'announced'],
    'Crypto': ['bitcoin', 'btc', 'eth', 'crypto', 'defi', 'web3'],
    'Funny': ['lmao', 'lol', 'hilarious', 'meme'],
    'Business': ['startup', 'revenue', 'funding', 'investor'],
  },
};
```

### src/clearAllBookmarks.js (Browser Script)

| Option | Default | Description |
|--------|---------|-------------|
| `maxRemovals` | `Infinity` | Max bookmarks to remove |
| `keepKeywords` | `[]` | Keep bookmarks containing these words |
| `dryRun` | `false` | Preview mode |
| `useBulkClear` | `true` | Try built-in "Clear All" button first |
| `exportOnComplete` | `true` | Auto-download removed bookmarks log |

### src/bookmarkManager.js (Node.js)

This module is used with Puppeteer, not in the browser console:

```js
import { getBookmarks, createFolder, clearAllBookmarks } from './src/bookmarkManager.js';

// Get bookmarks
const result = await getBookmarks(page, { limit: 100, format: 'json' });

// Create a folder (Premium required)
await createFolder(page, 'AI Resources');

// Clear all bookmarks
await clearAllBookmarks(page);
```

## Step-by-Step Guide

### Export and Categorize Bookmarks

**Step 1:** Navigate to `https://x.com/i/bookmarks`.

**Step 2:** Customize categories in `src/bookmarkOrganizer.js` to match your interests:

```js
categories: {
  'AI': ['ai', 'machine learning', 'llm', 'gpt', 'neural'],
  'Dev Tools': ['github', 'vscode', 'docker', 'api'],
  'Career': ['hiring', 'remote', 'salary', 'interview'],
},
```

**Step 3:** Paste the script. It scrolls through your bookmarks and categorizes each one:

```
Scanning bookmarks...

BOOKMARK REPORT

Total bookmarks: 147

BY CATEGORY:

  AI (42)
    @researcher: "New breakthrough in LLM reasoning..."
    @aidev: "GPT-5 benchmarks are incredible..."
    ... and 40 more

  Dev Tools (28)
    @github: "Announcing GitHub Copilot X..."
    ... and 27 more
```

**Step 4:** A file is automatically downloaded (JSON or CSV depending on `exportFormat`).

### Export as CSV

Change the export format for spreadsheet compatibility:

```js
exportFormat: 'csv',
```

The CSV includes columns: URL, Username, Text, Categories, Likes, Timestamp.

### Create Bookmark Folders (Premium)

Bookmark folders require X Premium. Use the Node.js `bookmarkManager.js`:

```js
import { createFolder } from './src/bookmarkManager.js';

// page is a Puppeteer page instance
await createFolder(page, 'Must Read');
await createFolder(page, 'AI Research');
await createFolder(page, 'Funny');
```

### Clear All Bookmarks

**Step 1:** Navigate to `https://x.com/i/history`.

**Step 2:** Paste `src/clearAllBookmarks.js`.

If no `keepKeywords` are set and `useBulkClear` is true, it tries the built-in "Clear All" button first (instant).

Otherwise, it removes bookmarks one by one, scrolling through the list.

**Step 3:** Use controls while running:

```js
window.XActions.pause();   // Pause
window.XActions.resume();  // Resume
window.XActions.abort();   // Stop
window.XActions.status();  // Show progress
```

### Selectively Clear Bookmarks

To keep certain bookmarks while clearing the rest:

```js
const CONFIG = {
  keepKeywords: ['important', 'save', 'reference'],
  dryRun: true,  // Preview first
};
```

This keeps any bookmark whose text contains "important", "save", or "reference".

## Tips & Tricks

- **Export before clearing.** Always run `bookmarkOrganizer.js` first to save a backup.
- **Custom categories** auto-tag bookmarks. Add keywords matching your niche.
- **The bulk clear button** (`useBulkClear: true`) is fastest but clears everything with no filter. Set it to `false` if you want to use `keepKeywords`.
- **Bookmark folders** are a Premium feature. The browser scripts cannot create folders, but the Node.js library can via Puppeteer.
- **Rate limit detection** is built in. The script auto-pauses if X throttles actions.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Navigate to x.com/i/history first!" | Navigate to `https://x.com/i/history`. |
| No bookmarks found | Scroll delay may be too short. Increase `scrollDelay`. |
| Bulk clear button not found | X may have changed the UI. Set `useBulkClear: false` to use individual removal. |
| "Could not create folder -- Premium required" | Bookmark folders need X Premium subscription |
| Export file is empty | Ensure `maxBookmarks` is high enough and the page loaded fully |

## Related Scripts

- `src/bookmarkManager.js` -- Node.js Puppeteer-based bookmark management
- `src/bookmarkOrganizer.js` -- Browser-based bookmark export and categorization
- `src/clearAllBookmarks.js` -- Browser-based bookmark clearing
- `src/shareEmbed.js` -- Copy links and embed codes for posts
