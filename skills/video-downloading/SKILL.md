---
name: video-downloading
description: Download videos and GIFs from X/Twitter posts in the browser or via API. Single video, batch download, and quality selection. Use when users want to save or download Twitter/X videos.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Video Downloading

Download videos and GIFs from X/Twitter posts — no API key needed.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Download video from current tweet | `src/videoDownloaderBrowser.js` | Tweet page (`x.com/user/status/ID`) |
| Batch download multiple videos | `src/videoDownloaderBrowser.js` | Any page |
| Download video info only (no save) | `src/videoDownloaderBrowser.js` | Tweet page |
| Download via script (non-browser) | `scripts/videoDownloader.js` | N/A (run in console) |
| Download via API | `api/routes/video.js` | `POST /api/video/download` |

## Quick Start

1. Navigate to a tweet with a video: `x.com/user/status/123456`
2. Open DevTools (F12) → Console
3. Paste `src/videoDownloaderBrowser.js` → Enter

## Available Functions

After pasting `src/videoDownloaderBrowser.js`:

```js
downloadCurrent()                   // Download video from current tweet page
downloadFromUrl('https://x.com/..') // Navigate to tweet URL and download
downloadGif()                       // Download GIF (GIFs are MP4 on X)
batchDownload(['url1', 'url2', ..]) // Download videos from multiple tweet URLs
getVideoInfo()                      // Show video metadata without downloading
```

## Configuration

```js
const CONFIG = {
  QUALITY: 'highest',       // 'highest', 'lowest', 'all'
  AUTO_DOWNLOAD: true,      // Auto-trigger browser download
  SHOW_ALL_QUALITIES: true  // Show all available quality options
};
```

## Quality Options

| Setting | Behavior |
|---------|----------|
| `'highest'` | Downloads best resolution (default) |
| `'lowest'` | Downloads smallest file size |
| `'all'` | Shows all available bitrates to choose from |

## Notes

- Videos on X are served as MP4; GIFs are also stored as MP4
- Quality options depend on what X uploaded — not all tweets have multiple qualities
- Batch download respects delays between requests to avoid rate limits
- `getVideoInfo()` shows tweet ID, author, and all available video URLs before committing to a download

## Related Skills

- **content-posting** — Upload and post your own videos
- **media-studio** — Manage your uploaded media library
- **twitter-scraping** — Scrape tweet metadata alongside video URLs
