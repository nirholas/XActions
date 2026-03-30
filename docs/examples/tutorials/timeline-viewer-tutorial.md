---
title: "View For You & Following Timelines on X (Twitter) — Tutorial"
description: "Switch between For You and Following timelines, auto-collect posts, and export timeline data using XActions."
keywords: ["twitter timeline", "for you timeline x", "following timeline twitter", "xactions timeline viewer", "export twitter timeline", "twitter feed scraper"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# View For You & Following Timelines — Tutorial

> Step-by-step guide to switching between For You and Following timelines, auto-collecting posts, and exporting timeline data using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 2-10 minutes (depends on `maxPosts`)
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to `https://x.com/home` before running

---

## Quick Start

1. Open x.com on your **Home** timeline (`https://x.com/home`)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `src/timelineViewer.js`
4. Edit the `CONFIG` section as needed
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  timeline: 'for-you',             // 'for-you' or 'following'
  autoSwitch: true,                // Automatically switch to selected timeline
  collectPosts: true,              // Scroll and collect posts
  maxPosts: 100,                   // Max posts to collect
  exportData: true,                // Auto-download JSON when done
  scrollDelay: 2000,               // ms between scroll actions
  delayBetweenActions: 1500,       // ms between UI actions
  maxScrollRetries: 8,             // Empty scrolls before stopping
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeline` | `string` | `'for-you'` | Which timeline to view: `'for-you'` or `'following'` |
| `autoSwitch` | `boolean` | `true` | Automatically switch to the selected timeline tab |
| `collectPosts` | `boolean` | `true` | Scroll and collect posts from the timeline |
| `maxPosts` | `number` | `100` | Maximum number of posts to collect |
| `exportData` | `boolean` | `true` | Auto-download collected data as a JSON file |
| `scrollDelay` | `number` | `2000` | Milliseconds between scroll actions |
| `delayBetweenActions` | `number` | `1500` | Milliseconds between UI actions |
| `maxScrollRetries` | `number` | `8` | Number of empty scrolls before stopping collection |

---

## Step-by-Step Guide

### Viewing the For You Timeline

**Step 1 -- Configure**

```js
const CONFIG = {
  timeline: 'for-you',
  autoSwitch: true,
  collectPosts: true,
  maxPosts: 50,
  exportData: true,
};
```

**Step 2 -- Run the script**

The script will:

1. Detect which timeline is currently active
2. Switch to "For You" if not already selected
3. Scroll and collect posts
4. Display a summary with analytics
5. Auto-download the data as JSON

**Output:**

```
XActions -- Timeline Viewer

Current timeline: following
Target timeline: for-you

Switching to "for-you" timeline...
Clicked "For You" tab.

Collecting posts from "for-you" timeline...
   Target: 50 posts

   Collected 12/50 posts (12 new)...
   Collected 28/50 posts (16 new)...
   Collected 44/50 posts (16 new)...
   Collected 50/50 posts (6 new)...

TIMELINE SUMMARY (50 posts)

Top 5 by views:
   1. @elonmusk: "Just deployed the new feature..." (2,450,000 views)
   2. @nichxbt: "XActions v2.0 is here..." (125,000 views)
   ...

Most frequent accounts in timeline:
   1. @techcrunch (4 posts)
   2. @nichxbt (3 posts)
   ...

Content breakdown:
   Text only:  22
   With image: 18
   With video: 7
   Reposts:    3

Aggregate metrics:
   Total views:     4,250,000
   Total likes:     12,500
   Avg views/post:  85,000
   Liked by you:    8

Timeline data saved to sessionStorage.
Timeline data exported as JSON file.
Timeline Viewer script complete.
```

### Viewing the Following Timeline

Switch to see only posts from accounts you follow:

```js
const CONFIG = {
  timeline: 'following',
  autoSwitch: true,
  collectPosts: true,
  maxPosts: 100,
  exportData: true,
};
```

### Collecting Without Switching

If you are already on the timeline you want and do not want to switch:

```js
const CONFIG = {
  timeline: 'for-you',
  autoSwitch: false,      // Do not switch -- collect from current tab
  collectPosts: true,
  maxPosts: 200,
  exportData: true,
};
```

### Just Switching (No Collection)

If you only want to switch the tab without collecting posts:

```js
const CONFIG = {
  timeline: 'following',
  autoSwitch: true,
  collectPosts: false,    // Do not scroll or collect
  exportData: false,
};
```

### Exported Data Format

The JSON export contains:

```json
{
  "exportedAt": "2026-03-30T14:00:00.000Z",
  "timeline": "for-you",
  "postCount": 50,
  "posts": [
    {
      "username": "nichxbt",
      "displayName": "nich",
      "text": "XActions v2.0 is here...",
      "views": 125000,
      "likes": 450,
      "retweets": 89,
      "replies": 23,
      "timestamp": "2026-03-30T12:00:00.000Z",
      "postUrl": "https://x.com/nichxbt/status/123456789",
      "hasImage": true,
      "hasVideo": false,
      "isRepost": false,
      "isLiked": true
    }
  ]
}
```

Each post includes:

| Field | Type | Description |
|-------|------|-------------|
| `username` | `string` | Author's handle |
| `displayName` | `string` | Author's display name |
| `text` | `string` | Tweet text (truncated to 280 chars) |
| `views` | `number` | View count |
| `likes` | `number` | Like count |
| `retweets` | `number` | Repost count |
| `replies` | `number` | Reply count |
| `timestamp` | `string` | ISO timestamp |
| `postUrl` | `string` | Direct link to the post |
| `hasImage` | `boolean` | Whether the post contains an image |
| `hasVideo` | `boolean` | Whether the post contains a video |
| `isRepost` | `boolean` | Whether this is a repost |
| `isLiked` | `boolean` | Whether you have liked this post |

---

## Tips & Tricks

- **For You vs Following.** "For You" shows algorithmic recommendations. "Following" shows chronological posts from accounts you follow.
- **Increase `maxPosts` for larger samples.** For meaningful analytics, collect 200+ posts.
- **Data is also saved to `sessionStorage`.** Access it programmatically with `JSON.parse(sessionStorage.getItem('xactions_timeline'))`.
- **The JSON file downloads automatically.** File name format: `xactions_timeline_{timeline}_{date}.json`.
- **`maxScrollRetries` prevents infinite scrolling.** After 8 scrolls with no new posts, the script stops. Increase this if you have a fast connection.
- **Metric parsing handles abbreviations.** "125K" becomes `125000`, "1.2M" becomes `1200000`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not on the home timeline" | Navigate to `x.com/home` first. The script will auto-redirect if needed |
| "Could not find timeline tab" | X may have changed the tab layout. The script lists available tabs in the console |
| Collecting 0 posts | The timeline may not have loaded. Wait a few seconds and try again |
| Duplicate posts in export | Posts are deduplicated by URL. Duplicates should not occur unless the URL extraction fails |
| JSON file not downloading | Check your browser's download permissions and popup blocker settings |
| Low post count despite high `maxPosts` | You may have reached the end of loaded content, or `maxScrollRetries` was reached. Increase the retry count |

---

## Related Scripts

- `src/discoveryExplore.js` -- Browse explore feed and trends
- `src/saveSearch.js` -- Save and manage search queries
