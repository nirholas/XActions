---
name: twitter-scraping
description: Scrapes X/Twitter data without API access using Puppeteer stealth and browser console scripts. Extracts profiles, followers, following lists, tweets, search results, hashtags, threads, media, bookmarks, and viral tweets. Exports to JSON/CSV. Use when collecting, exporting, or analyzing Twitter data.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Twitter Scraping

## Auth setup

All scrapers require an `auth_token` cookie from x.com (DevTools → Application → Cookies → copy `auth_token` value).

## Node.js Scraper API

`npm install xactions` — all functions from `src/scrapers/index.js`.

```javascript
import { createBrowser, createPage, loginWithCookie, scrapeProfile,
  scrapeFollowers, scrapeFollowing, scrapeTweets, searchTweets,
  scrapeHashtag, scrapeThread, scrapeMedia, exportToJSON, exportToCSV
} from 'xactions';

const browser = await createBrowser();
const page = await createPage(browser);
await loginWithCookie(page, AUTH_TOKEN);
```

### Return shapes

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

Always call `browser.close()` when done.

## Browser console scripts

Standalone IIFEs — paste into DevTools console on x.com. No dependencies.

| Script | Navigate to | What it does |
|--------|------------|-------------|
| `src/scrapers/videoDownloader.js` | Tweet with video | Extracts MP4 URLs (all qualities), auto-downloads best |
| `src/scrapers/bookmarkExporter.js` | `x.com/i/bookmarks` | Exports bookmarks to JSON/CSV (text, engagement, media, links) |
| `src/scrapers/threadUnroller.js` | Any thread | Saves thread as text/markdown/JSON (author tweets only) |
| `src/scrapers/viralTweets.js` | User profile | Finds top tweets by engagement, configurable thresholds |

Browser scripts stop on page navigation — stay on the page while running.
