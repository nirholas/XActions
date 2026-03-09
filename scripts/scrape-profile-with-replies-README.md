# X/Twitter Profile + Replies Scraper

Scrapes a user's X (Twitter) posts **and** all reply comments on each post. Designed for case studies, sentiment analysis, and community research.

## What it does

1. **Phase 1 — Feed scraping**: Scrolls through a user's profile (including `/with_replies`) and collects all their posts and reply-tweets.
2. **Phase 2 — Reply scraping**: Navigates into each post's thread and collects the reply comments from other users.
3. **Export**: Downloads results as JSON, CSV (separate files for posts and replies), Markdown, plain text, and/or HTML.

## Features

- **Floating control panel** — pause, resume, stop, export, and download at any point during scraping
- **Start/end post filtering** — specify a post ID or URL to limit the scrape range
- **Content filters** — whitelist/blacklist keywords, date range, minimum engagement, skip retweets
- **Multiple export formats** — JSON, CSV (posts + replies), Markdown, plain text, HTML
- **Real-time progress** — live counters for posts collected, replies collected, elapsed time
- **Clipboard copy** — JSON is auto-copied to clipboard on completion
- **Partial export on error** — if something goes wrong, you still get whatever was scraped

## How to use

### Quick start

1. Open **Chrome**, **Edge**, or **Firefox**
2. Navigate to the target profile's **with_replies** page:
   ```
   https://x.com/nichxbt/with_replies
   ```
3. Open DevTools: `F12` (or `Cmd+Opt+I` on Mac)
4. Go to the **Console** tab
5. If you see a warning about pasting, type `allow pasting` and press Enter
6. Copy the entire contents of `scrape-profile-with-replies.js` and paste it into the console
7. Press **Enter**
8. The floating control panel appears — monitor progress and control the scraper

### Customizing the scrape

Edit the `CONFIG` object at the top of the script before pasting:

```js
const CONFIG = {
  // How many of the user's posts to collect
  targetPostCount: 50,

  // Max replies to scrape per post thread
  maxRepliesPerPost: 50,

  // Limit to a range of posts by ID or URL
  range: {
    startPostId: null,         // e.g. '1234567890' or 'https://x.com/user/status/1234567890'
    endPostId: null,           // e.g. '9876543210'
  },

  // Content filters
  filters: {
    whitelist: [],             // Only keep posts with these words
    blacklist: [],             // Skip posts with these words
    daysBack: 0,               // Only last N days (0 = all)
    minLikes: 0,
    minRetweets: 0,
    excludeRetweets: false,
  },

  // Export formats
  export: {
    json: true,
    csv: true,
    markdown: false,
    text: false,
    html: false,
  },
};
```

### Specifying a post range

To scrape only posts between two specific posts:

```js
range: {
  // Start AFTER this post (exclusive — this post is not included)
  startPostId: '1867234567890123456',

  // Stop AT this post (inclusive — this post IS included)
  endPostId: '1867234567890199999',
},
```

You can use either a **post ID** or a **full URL**:

```js
startPostId: 'https://x.com/nichxbt/status/1867234567890123456',
endPostId: '1867234567890199999',   // just the numeric ID works too
```

### Control panel buttons

| Button | Action |
|--------|--------|
| **⏸ Pause** | Pause scraping. Click again to resume. |
| **⏹ Stop** | Stop scraping immediately and export what's been collected. |
| **📦 Export Now** | Build export data and copy JSON to clipboard. |
| **💾 Download** | Download files in all enabled formats. |
| **⏸ Pause & Export** | Pause scraping and trigger export. Resume when ready. |

The panel is **draggable** (grab the blue header) and **minimizable** (click `−`).

### Accessing data after scraping

```js
// Full result object
window.__xScraperResult

// Just the posts
window.__xScraperResult.posts

// Replies for the first post
window.__xScraperResult.posts[0].replies_scraped

// Re-trigger downloads
// Click the 💾 button on the panel
```

## Output format

### JSON structure

```json
{
  "profile": "nichxbt",
  "profileUrl": "https://x.com/nichxbt",
  "scrapedAt": "2026-03-09T12:00:00.000Z",
  "duration": "120.5s",
  "totalPosts": 50,
  "totalRepliesScraped": 342,
  "posts": [
    {
      "id": "1867234567890123456",
      "url": "https://x.com/nichxbt/status/1867234567890123456",
      "text": "Post content here...",
      "author": { "handle": "nichxbt", "name": "nich" },
      "timestamp": "2026-03-01T10:00:00.000Z",
      "displayTime": "Mar 1",
      "metrics": {
        "replies": "12",
        "retweets": "5",
        "likes": "45",
        "views": "1.2K"
      },
      "media": { "hasImage": false, "hasVideo": false, "hasCard": false },
      "type": { "isRetweet": false, "isReply": false },
      "extracted": {
        "hashtags": ["#crypto"],
        "mentions": ["@someone"],
        "urls": []
      },
      "replies_scraped": [
        {
          "id": "1867234567890999999",
          "url": "https://x.com/replier/status/1867234567890999999",
          "text": "Reply content...",
          "author": { "handle": "replier", "name": "Reply User" },
          "timestamp": "2026-03-01T10:30:00.000Z",
          "displayTime": "Mar 1",
          "metrics": { "replies": "0", "retweets": "0", "likes": "3", "views": "100" }
        }
      ]
    }
  ]
}
```

### CSV files

Two CSV files are generated:

- **`{profile}-posts-{date}.csv`** — One row per post with columns: PostID, URL, Author, Date, Text, Likes, Retweets, Replies, Views, IsRetweet, IsReply, Hashtags, RepliesScraped
- **`{profile}-replies-{date}.csv`** — One row per reply with columns: ParentPostID, ReplyID, URL, Author, AuthorHandle, Date, Text, Likes, Retweets, Replies, Views

## Tips

- **Increase `scrollDelay`** to 3000–5000 if the page loads slowly
- **Increase `maxRepliesPerPost`** for high-engagement posts with many reply pages
- **Set `targetPostCount: Infinity`** to scrape the entire profile history
- **Use `/with_replies`** to also capture the user's own reply-tweets (useful for sentiment context)
- **Use range filters** when resuming a partially completed scrape
- **Export frequently** during long scrapes using the panel buttons
- The scraper respects X's SPA routing — navigating into and out of posts doesn't reload the page

## Limitations

- Runs in-browser via the console — requires being logged in to X
- X may rate-limit or temporarily block scrolling if scraping too aggressively (increase delays if this happens)
- Very old tweets may fail to load in X's virtual scroll
- Some reply threads may have "Show more replies" that requires additional clicks (currently not handled — uses scroll-based loading)
- Pinned posts may appear first regardless of date range filters
