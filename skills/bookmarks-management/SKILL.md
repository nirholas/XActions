```skill
---
name: bookmarks-management
description: Advanced bookmark management on X/Twitter including saving posts, organizing into folders (Premium), bulk operations, export, and search within bookmarks.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Bookmarks Management with XActions

Manage, organize, and export X/Twitter bookmarks.

## Features

- **Save Posts**: Privately bookmark any post
- **Folders**: Organize bookmarks by category (Premium)
- **Bulk Operations**: Mass bookmark/unbookmark
- **Export**: Export all bookmarks to JSON/CSV
- **Search**: Find specific bookmarks (in-app)
- **Clear All**: Remove all bookmarks at once

## Browser Console Script

**File:** `scripts/manageBookmarks.js`

### How to use

1. Navigate to `x.com/i/bookmarks`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Bookmarks nav | `a[href="/i/bookmarks"]` |
| Bookmark button | `[data-testid="bookmark"]` |
| Remove bookmark | `[data-testid="removeBookmark"]` |
| Bookmark folder | `[data-testid="bookmarkFolder"]` |
| Create folder | `[data-testid="createBookmarkFolder"]` |
| Tweet in bookmarks | `article[data-testid="tweet"]` |

## MCP Tools

- `x_bookmark` – Bookmark a post
- `x_unbookmark` – Remove a bookmark
- `x_get_bookmarks` – Get all bookmarks
- `x_create_bookmark_folder` – Create a folder (Premium)
- `x_export_bookmarks` – Export bookmarks to JSON/CSV
- `x_clear_bookmarks` – Clear all bookmarks

## API Endpoints

- `GET /api/bookmarks` – List all bookmarks
- `POST /api/bookmarks` – Bookmark a post
- `DELETE /api/bookmarks/:id` – Remove bookmark
- `POST /api/bookmarks/folders` – Create folder
- `GET /api/bookmarks/export` – Export bookmarks
- `DELETE /api/bookmarks/all` – Clear all bookmarks

## Related Files

- `src/bookmarkManager.js` – Core bookmark module
- `src/clearAllBookmarks.js` – Clear all bookmarks
- `scripts/manageBookmarks.js` – Browser bookmark script
- `scripts/scrapeBookmarks.js` – Bookmark scraping
- `scripts/bookmarkExporter.js` – Export bookmarks

## Notes

- Bookmarks are private — only you can see them
- Folders require Premium subscription
- No known limit on number of bookmarks
- Export supports JSON and CSV formats
```
