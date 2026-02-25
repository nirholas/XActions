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
import { createBrowser, createPage, loginWithCookie, scrapeProfile } from 'xactions';

const browser = await createBrowser();
const page = await createPage(browser);
await loginWithCookie(page, AUTH_TOKEN);

const profile = await scrapeProfile(page, 'nichxbt');
await browser.close();
```

| Function | Purpose |
|----------|---------|
| `scrapeProfile(page, username)` | Profile data (bio, followers, following) |
| `scrapeFollowers(page, username, {limit})` | Follower list |
| `scrapeFollowing(page, username, {limit})` | Following list |
| `scrapeTweets(page, username, {limit})` | User's tweets |
| `searchTweets(page, query, {limit})` | Search results |
| `scrapeHashtag(page, tag, {limit})` | Hashtag tweets |
| `scrapeThread(page, tweetUrl)` | Thread tweets |
| `scrapeMedia(page, username, {limit})` | Media URLs |
| `exportToJSON(data, path)` / `exportToCSV(data, path)` | File export |

## Browser console scripts

Standalone IIFEs — paste into DevTools console on x.com. No dependencies.

| Script | Navigate to | Purpose |
|--------|------------|---------|
| `src/scrapers/videoDownloader.js` | Tweet with video | Extract MP4 URLs, auto-download best quality |
| `src/scrapers/bookmarkExporter.js` | `x.com/i/bookmarks` | Export bookmarks to JSON/CSV |
| `src/scrapers/threadUnroller.js` | Any thread | Save thread as text/markdown/JSON |
| `src/scrapers/viralTweets.js` | User profile | Find top tweets by engagement |

## Scraper details

**Full return shapes, configs, and per-scraper usage**: See [references/scraper-details.md](references/scraper-details.md)

## Notes

- Always call `browser.close()` when done with Node.js scrapers
- Browser scripts stop on page navigation — stay on the page while running
- All scripts support JSON and CSV export
