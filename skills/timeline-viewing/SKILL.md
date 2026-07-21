---
name: timeline-viewing
description: Switch between For You / Following timelines, auto-scroll and collect posts, scrape timeline data, and export as JSON. Use when users want to browse, collect, or export tweets from their X timeline.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Timeline Viewing & Scraping

Browser console scripts for viewing, switching, and collecting posts from your X timeline.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Switch timeline, auto-scroll, export posts | `src/timelineViewer.js` | `x.com/home` |
| Scrape timeline posts into structured data | `src/timelineScraper.js` | `x.com/home` |

## Quick Start

1. Go to `x.com/home`
2. Open DevTools (F12) → Console
3. Paste `src/timelineViewer.js` → Enter
4. JSON file auto-downloads when complete

## Configuration (`timelineViewer.js`)

```js
const CONFIG = {
  timeline: 'for-you',       // 'for-you' or 'following'
  autoSwitch: true,           // Automatically switch to selected timeline
  collectPosts: true,         // Scroll and collect posts
  maxPosts: 100,              // Max posts to collect
  exportData: true,           // Auto-download JSON when done
  scrollDelay: 2000,          // ms between scroll actions
  delayBetweenActions: 1500, // ms between UI actions
  maxScrollRetries: 8,        // Empty scrolls before stopping
};
```

## Available Functions

```js
// timelineViewer.js
XActions.switchTo('for-you')     // Switch to For You timeline
XActions.switchTo('following')   // Switch to Following timeline
XActions.collect()               // Start collecting posts
XActions.export()                // Export collected posts as JSON
XActions.abort()                 // Stop collection

// timelineScraper.js
XActions.scrape({ maxPosts: 200 }) // Scrape with custom limit
XActions.results()                  // Get collected results
XActions.download()                 // Download as JSON
```

## Output Data Structure

Each collected post includes:
- Tweet ID, author, handle, avatar
- Tweet text, timestamp
- Likes, retweets, replies, views counts
- Media URLs (if any)
- Is retweet / is quote tweet

## Notes

- Timeline data is only what's visible/scrolled in your browser session
- `for-you` content is personalized; `following` shows only accounts you follow
- Increase `maxPosts` for deeper scrapes (slower, more scroll rounds)
- Different from `twitter-scraping` which targets specific profiles, not your feed

## Related Skills

- **twitter-scraping** — Scrape a specific user's profile or tweet history
- **analytics-insights** — Analyze engagement metrics on your timeline
- **discovery-explore** — Find trending content beyond your timeline
