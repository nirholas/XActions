# X/Twitter Scraper Toolbox

An interactive, on-page control panel for scraping any X (Twitter) timeline: profiles, search results, lists, Likes, Bookmarks, or Home. Paste once, then control everything from the panel. No config editing, no re-pasting.

Script: [`scraper-toolbox.js`](./scraper-toolbox.js)

## Why this one

Most console scrapers (including our own `scrape-profile-posts.js`) read the rendered DOM, which means rounded numbers ("1.2K"), truncated long posts, and English-only detection of reposts/replies. The Toolbox instead listens to the GraphQL responses the X web app itself downloads while scrolling. You get:

- **Exact engagement counts**: likes, reposts, replies, quotes, bookmarks, views as real integers
- **Full text of long posts**: no "Show more" truncation (note tweets included)
- **Structure**: repost/quote/reply relationships with the original author attached
- **Reply context**: every reply records the post it answers (`inReplyTo`) and its thread (`conversationId`); when that parent post was captured too, it is attached to the export
- **Audience size**: follower and following counts for the author, the parent's author, and the quoted author, from either user shape X sends
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
- **Parents**: a line under the counters shows how many matching replies have their parent captured, missing, or unavailable. **⤴ Fetch missing parents** opens each missing parent in this tab, one at a time, and reads it from X's own response, then returns to your page. Press it again (**⏹ Stop fetching**) to stop after the current post.
- **Export**: JSON, CSV, Markdown, TXT, HTML file downloads, plus **Copy JSON** and **Copy clear text** to the clipboard. Text exports put a "Replying to" or "Quoting" line above each post that has one.
- Drag the header to move the panel; position and every setting persist across sessions (localStorage).

### Replies and their parents

Where the parent comes from depends on the page:

- **A profile's Replies tab** (`x.com/<handle>/with_replies`): X sends each reply inside a conversation block with the post it answers, so parents are captured as you scroll. Nothing else to do.
- **Search results** (`x.com/search?q=...`): X sends only the reply, with its parent's id. Scrape first, press **Stop**, then press **⤴ Fetch missing parents**. Each parent takes one page view, so the default pace is one post every 2.5 seconds or your scroll delay, whichever is longer.
- **A post's quote list** (`x.com/<handle>/status/<id>/quotes`): every result quotes that post, and the quoted post is attached to each one.

A parent X will not show (deleted, withheld, or from a protected account) is marked `unavailable` instead of being retried. If X starts rate limiting, fetching stops and tells you; wait a few minutes and press it again. Posts that the parent pages display along the way (other replies, suggestions) are kept as context only and never join your export.

### When X rate limits a run

A rate-limited timeline stops loading and shows a **Retry** button, which looks exactly like the end of the timeline. When a run stalls, the Toolbox presses that button (up to 5 times in a row) and waits before giving up. If it still gets nothing, it finishes with a message that says it was rate limited, so you know the results are not complete. On a search, continue later with `until:` set to the date of the oldest post you have.

### Filters are non-destructive

Capture keeps everything. Filters are applied at export time, so you can scrape once, then change filters and re-export as many different slices as you want without scraping again.

## Console API

After pasting, `window.XActionsToolbox` is available:

```js
XActionsToolbox.tweets()        // all captured posts
XActionsToolbox.matched()       // posts passing current filters, with parent context
XActionsToolbox.export('csv')   // 'json' | 'csv' | 'markdown' | 'text' | 'html'
XActionsToolbox.build('csv')    // the same export as a string, no download
XActionsToolbox.copy('text')    // 'json' | 'text'
XActionsToolbox.missingParents()          // [{ parentId, parentHandle, parentUrl, replyIds }]
await XActionsToolbox.resolveParents({ delay: 3000, timeout: 15000, limit: 50 })
                                // -> { resolved, unavailable, failed, remaining }
XActionsToolbox.cancelResolve()
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
  "author": { "id": "44196397", "handle": "nichxbt", "name": "nich", "verified": true, "followers": 12345, "following": 678 },
  "text": "Full untruncated text...",
  "lang": "en",
  "createdAt": "2026-07-17T12:00:00.000Z",
  "conversationId": "1946000000000000",
  "inReplyTo": { "id": "1946000000000000", "handle": "someone", "userId": "12" },
  "parentStatus": "captured",
  "parent": {
    "id": "1946000000000000",
    "url": "https://x.com/someone/status/1946000000000000",
    "author": { "id": "12", "handle": "someone", "name": "Someone", "verified": false, "followers": 2400000, "following": 310 },
    "text": "The post this one replies to",
    "createdAt": "2026-07-17T11:40:00.000Z",
    "metrics": { "likes": 51000, "retweets": 4200, "replies": 9800, "quotes": 600, "bookmarks": 900, "views": 8100000 },
    "media": [],
    "inReplyTo": null,
    "quoted": null
  },
  "metrics": { "likes": 1237, "retweets": 89, "replies": 12, "quotes": 3, "bookmarks": 7, "views": 45210 },
  "media": [{ "type": "video", "url": "https://pbs.twimg.com/...", "videoUrl": "https://video.twimg.com/....mp4", "durationMs": 31000 }],
  "type": { "isRetweet": false, "isReply": true, "isQuote": false, "isPinned": false },
  "entities": { "hashtags": ["#ai"], "mentions": ["@someone"], "urls": ["https://example.com"] },
  "retweetOf": null,
  "quoted": null,
  "source": "graphql",
  "operation": "SearchTimeline",
  "approx": false,
  "scrapedAt": "2026-07-19T09:00:00.000Z"
}
```

- `parentStatus` is `captured`, `missing` (not fetched yet), `unavailable` (X will not show it), or `null` for posts that are not replies.
- `quoted` and `retweetOf` use the same compact form as `parent`, so a quote carries its author's follower count and engagement.
- `followers` and `following` are `null` when X did not send them (never a guessed 0).
- `operation` is the GraphQL request the post arrived in (`SearchTimeline`, `UserTweetsAndReplies`, `TweetDetail`, ...).

Exports are wrapped in a bundle with the page URL, active filters, parent counts (`parents: { replies, captured, missing, unavailable }`), and aggregate statistics (totals, averages, top hashtags/mentions).

The CSV keeps the 1.0 columns first and in the same order, so existing sheets keep working. The context columns follow: author id, name, followers and verified flag, conversation id, operation, media types, video length, links, then `replyToId`, `replyToHandle`, `parentStatus`, `parentText`, `parentAuthorFollowers`, `parentLikes`, `parentDate`, `parentUrl`, the same set for the quoted post, and the reposted post's id, author and follower count.

## Notes and limits

- Works on `x.com` (and `twitter.com`) in Chrome, Edge, Brave, and Firefox. You must be logged in to see the timelines X requires login for.
- Scrape responsibly: keep the scroll delay humane (the default 1.8s + jitter is fine) and respect X's terms and applicable law for whatever you do with the data.
- Reloading the page removes the panel and its captured data (settings survive). Paste again to reopen. Fetching parents navigates inside X's app rather than reloading, so the capture survives it.
- If X ships a breaking change to its GraphQL payloads, the DOM sweep still works as a degraded fallback; file an issue and we will update the parser.

## Related scripts

- [`scrape-profile-posts.js`](./scrape-profile-posts.js): the classic single-run DOM scraper (edit CONFIG, paste, get files)
- [`scrape-profile-with-replies.js`](./scrape-profile-with-replies.js): two-phase scraper that also collects the replies under each post
- [`viral-tweets-scraper.js`](./viral-tweets-scraper.js): find high-engagement posts for a topic
