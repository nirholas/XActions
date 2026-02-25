---
name: twitter-scraping
description: Scrapes X/Twitter data without API access using Puppeteer stealth and browser console scripts. Extracts profiles, followers, following lists, tweets, search results, hashtags, threads, media, bookmarks, notifications, DMs, likes, and viral tweets. Exports to JSON/CSV. Use when collecting, exporting, or analyzing Twitter data.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Twitter Scraping

## Auth Setup

All scrapers require an `auth_token` cookie from x.com (DevTools -> Application -> Cookies -> copy `auth_token` value).

## Node.js Scraper API

`npm install xactions` -- all functions from `src/scrapers/index.js`.

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

## Browser Console Scripts

Standalone IIFEs -- paste into DevTools console on x.com. No dependencies.

| Script | File | Navigate to |
|--------|------|-------------|
| Download video | `src/scrapers/videoDownloader.js` | Tweet with video |
| Export bookmarks | `src/scrapers/bookmarkExporter.js` | `x.com/i/bookmarks` |
| Unroll thread | `src/scrapers/threadUnroller.js` | Any thread |
| Find viral tweets | `src/scrapers/viralTweets.js` | User profile |
| Scrape followers | `scripts/scrapeFollowers.js` | `x.com/USER/followers` |
| Scrape following | `scripts/scrapeFollowing.js` | `x.com/USER/following` |
| Scrape profile | `scripts/scrapeProfile.js` | User profile |
| Scrape search | `scripts/scrapeSearch.js` | Search results |
| Scrape hashtag | `scripts/scrapeHashtag.js` | `x.com/hashtag/TAG` |
| Scrape likes | `scripts/scrapeLikes.js` | `x.com/USER/likes` |
| Scrape likers | `scripts/scrapeLikers.js` | Any tweet |
| Scrape replies | `scripts/scrapeReplies.js` | Any tweet |
| Scrape media | `scripts/scrapeMedia.js` | User media tab |
| Scrape DMs | `scripts/scrapeDMs.js` | `x.com/messages` |
| Scrape notifications | `scripts/scrapeNotifications.js` | `x.com/notifications` |
| Scrape list | `scripts/scrapeList.js` | Any X List |
| Scrape bookmarks | `scripts/scrapeBookmarks.js` | `x.com/i/bookmarks` |
| Export to CSV | `scripts/exportToCSV.js` | After any scrape |
| Link scraper | `scripts/linkScraper.js` | Any timeline |
| Quote retweets | `scripts/scrapeQuoteRetweets.js` | Any tweet |

## MCP Scraping Tools

All scrapers available via the MCP server for AI agents:

| Tool | Description |
|------|-------------|
| `x_get_profile` | Scrape user profile |
| `x_get_followers` | Get follower list |
| `x_get_following` | Get following list |
| `x_get_tweets` | Get user tweets |
| `x_search_tweets` | Search tweets |
| `x_get_thread` | Unroll thread |
| `x_download_video` | Extract video URL |

## Notes
- Always call `browser.close()` when done with Node.js scrapers
- Browser scripts stop on page navigation -- stay on the page while running
- All scripts support JSON and CSV export
- Increase `limit` parameter for deeper scraping (default varies by function)
- Rate limiting is built in -- avoid reducing delays below defaults
