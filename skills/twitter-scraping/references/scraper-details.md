# Scraper Details

## Contents

- [Node.js Setup](#nodejs-setup)
- [Return Shapes](#return-shapes)
- [Video Downloader](#video-downloader)
- [Bookmark Exporter](#bookmark-exporter)
- [Thread Unroller](#thread-unroller)
- [Viral Tweets Finder](#viral-tweets-finder)

## Node.js Setup

Full setup for programmatic scraping:

```javascript
import { createBrowser, createPage, loginWithCookie, scrapeProfile,
  scrapeFollowers, scrapeFollowing, scrapeTweets, searchTweets,
  scrapeHashtag, scrapeThread, scrapeMedia, exportToJSON, exportToCSV
} from 'xactions';

const browser = await createBrowser();
const page = await createPage(browser);
await loginWithCookie(page, AUTH_TOKEN);
```

Always call `browser.close()` when done.

## Return Shapes

| Function | Returns |
|----------|---------|
| `scrapeProfile(page, username)` | `{ username, displayName, bio, followers, following, tweets, joined, location, website, verified }` |
| `scrapeFollowers(page, username, {limit})` | `[{ username, displayName, bio, followsYou }]` |
| `scrapeFollowing(page, username, {limit})` | `[{ username, displayName, bio, followsYou }]` |
| `scrapeTweets(page, username, {limit})` | `[{ text, likes, retweets, replies, timestamp, url }]` |
| `searchTweets(page, query, {limit})` | Same as tweets |
| `scrapeHashtag(page, tag, {limit})` | Same as tweets |
| `scrapeThread(page, tweetUrl)` | Array of tweet objects from thread author only |
| `scrapeMedia(page, username, {limit})` | Media objects with URLs |
| `exportToJSON(data, path)` / `exportToCSV(data, path)` | Writes file |

## Video Downloader

**File:** `src/scrapers/videoDownloader.js`

Navigate to a tweet containing a video and paste this script. Extracts MP4 URLs for all available qualities and auto-downloads the best quality version.

### How to use

1. Open the tweet with the video you want to download
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Best quality MP4 auto-downloads; all quality URLs logged to console

## Bookmark Exporter

**File:** `src/scrapers/bookmarkExporter.js`

Exports all your bookmarks including text, engagement metrics, media URLs, and links. Supports both JSON and CSV export formats.

### How to use

1. Navigate to `x.com/i/bookmarks`
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Scrolls through all bookmarks and exports when done

## Thread Unroller

**File:** `src/scrapers/threadUnroller.js`

Saves a thread as text, markdown, or JSON. Only captures tweets from the original thread author (filters out replies from others).

### How to use

1. Navigate to any thread on x.com
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Choose export format: text, markdown, or JSON

## Viral Tweets Finder

**File:** `src/scrapers/viralTweets.js`

Finds a user's top-performing tweets sorted by engagement. Configurable engagement thresholds to filter for truly viral content.

### How to use

1. Navigate to the user's profile
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Results sorted by engagement (likes + retweets + replies)
