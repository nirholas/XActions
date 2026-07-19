# X/Twitter Scraper Toolbox

An interactive, on-page control panel for scraping any X (Twitter) timeline: profiles, search results, lists, Likes, Bookmarks, or Home. Paste once, then control everything from the panel. No config editing, no re-pasting.

Script: [`scraper-toolbox.js`](./scraper-toolbox.js)

## Why this one

Most console scrapers (including our own `scrape-profile-posts.js`) read the rendered DOM, which means rounded numbers ("1.2K"), truncated long posts, and English-only detection of reposts/replies. The Toolbox instead listens to the GraphQL responses the X web app itself downloads while scrolling. You get:

- **Exact engagement counts**: likes, reposts, replies, quotes, bookmarks, views as real integers
- **Full text of long posts**: no "Show more" truncation (note tweets included)
- **Structure**: repost/quote/reply relationships with the original author attached
- **Media URLs**: images and the highest-bitrate MP4 for videos
- **Language codes** per post, locale-independent classification
- **No extra requests**: it only reads what the page already fetched. Ads (promoted posts) are skipped automatically.

Posts that were already on screen before you pasted the script are captured by a DOM sweep fallback (marked `source: "dom"` with approximate counts).

## Quick start

1. Open x.com and go to the timeline you want (e.g. `https://x.com/nichxbt`, a search, a list, or your Bookmarks)
2. Open DevTools (`F12`, or `Cmd+Opt+I` on Mac) and select the **Console** tab
3. If warned about pasting, type `allow pasting` and press Enter
4. Paste the entire contents of `scraper-toolbox.js` and press Enter
5. The Toolbox panel appears top-right. Press **▶ Start**

## The panel

- **▶ Start / ⏸ Pause / ⏹ Stop**: full run control. Pause halts scrolling but keeps capture live; you can scroll manually while paused and everything is still collected.
- **🗑 Clear**: wipe captured data and start fresh.
- **Live counters**: captured posts, posts matching your filters, scroll count, elapsed time, progress bar toward your target.
- **Scraping settings**: target post count, scroll delay, max scrolls, stall detection (stops automatically at the end of the timeline), optional auto-download of JSON when a run finishes.
- **Filters** (all optional, all applied live):
  - Must-contain keywords / exclude keywords (comma separated, case-insensitive)
  - Only these users / **skip these users** (handles, useful on Home, lists, and search)
  - Minimum likes, reposts, views
  - Last N days
  - No reposts / no replies / no quotes / no pinned
  - With media only / text only
  - Language code (e.g. `en`, `ja`)
- **Export**: JSON, CSV, Markdown, TXT, HTML file downloads, plus **Copy JSON** and **Copy clear text** to the clipboard.
- Drag the header to move the panel; position and every setting persist across sessions (localStorage).

### Filters are non-destructive

Capture keeps everything. Filters are applied at export time, so you can scrape once, then change filters and re-export as many different slices as you want without scraping again.

## Console API

After pasting, `window.XActionsToolbox` is available:

```js
XActionsToolbox.tweets()        // all captured posts
XActionsToolbox.matched()       // posts passing current filters
XActionsToolbox.export('csv')   // 'json' | 'csv' | 'markdown' | 'text' | 'html'
XActionsToolbox.copy('text')    // 'json' | 'text'
XActionsToolbox.start()
XActionsToolbox.pause()         // toggles pause/resume
XActionsToolbox.stop()
XActionsToolbox.clear()
XActionsToolbox.destroy()       // close panel, restore fetch/XHR
```

## Data shape

```json
{
  "id": "1946001122334455",
  "url": "https://x.com/nichxbt/status/1946001122334455",
  "author": { "handle": "nichxbt", "name": "nich", "verified": true, "followers": 12345 },
  "text": "Full untruncated text...",
  "lang": "en",
  "createdAt": "2026-07-17T12:00:00.000Z",
  "metrics": { "likes": 1237, "retweets": 89, "replies": 12, "quotes": 3, "bookmarks": 7, "views": 45210 },
  "media": [{ "type": "video", "url": "https://pbs.twimg.com/...", "videoUrl": "https://video.twimg.com/....mp4" }],
  "type": { "isRetweet": false, "isReply": false, "isQuote": false, "isPinned": false },
  "entities": { "hashtags": ["#ai"], "mentions": ["@someone"], "urls": ["https://example.com"] },
  "retweetOf": null,
  "quoted": null,
  "source": "graphql",
  "approx": false,
  "scrapedAt": "2026-07-19T09:00:00.000Z"
}
```

Exports are wrapped in a bundle with the page URL, active filters, and aggregate statistics (totals, averages, top hashtags/mentions).

## Notes and limits

- Works on `x.com` (and `twitter.com`) in Chrome, Edge, Brave, and Firefox. You must be logged in to see the timelines X requires login for.
- Scrape responsibly: keep the scroll delay humane (the default 1.8s + jitter is fine) and respect X's terms and applicable law for whatever you do with the data.
- Reloading the page removes the panel and its captured data (settings survive). Paste again to reopen.
- If X ships a breaking change to its GraphQL payloads, the DOM sweep still works as a degraded fallback; file an issue and we will update the parser.

## Related scripts

- [`scrape-profile-posts.js`](./scrape-profile-posts.js): the classic single-run DOM scraper (edit CONFIG, paste, get files)
- [`scrape-profile-with-replies.js`](./scrape-profile-with-replies.js): two-phase scraper that also collects the replies under each post
- [`viral-tweets-scraper.js`](./viral-tweets-scraper.js): find high-engagement posts for a topic
