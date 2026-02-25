---
name: engagement-interaction
description: Automates X/Twitter engagement actions — like, unlike, reply, bookmark, hide replies, and auto-like by keyword. Also bulk-unlikes all posts. Use when users want to automate likes, send replies, manage bookmarks on tweets, hide replies, or clear their entire likes history.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Engagement & Interaction

Browser automation for X/Twitter engagement — liking, replying, bookmarking, hiding replies, and bulk unlike.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Like/unlike/reply/bookmark tweets | `src/engagementManager.js` | Tweet URL or timeline |
| Auto-like by keyword | `src/engagementManager.js` | `x.com/home` or search page |
| Get engagement analytics for a post | `src/engagementManager.js` | Tweet URL |
| Hide replies on your posts | `src/engagementManager.js` | Reply URL |
| Unlike ALL liked posts | `src/unlikeAllPosts.js` | `x.com/USERNAME/likes` |

## Engagement Manager

**File:** `src/engagementManager.js`

Puppeteer-based module for individual and bulk engagement actions.

### Functions

| Function | Purpose |
|----------|---------|
| `likeTweet(page, tweetUrl)` | Like a specific tweet (skips if already liked) |
| `unlikeTweet(page, tweetUrl)` | Unlike a specific tweet |
| `replyToTweet(page, tweetUrl, text, { media? })` | Reply with text and optional media |
| `bookmarkTweet(page, tweetUrl)` | Bookmark a tweet |
| `unbookmarkTweet(page, tweetUrl)` | Remove a bookmark |
| `hideReply(page, replyUrl)` | Hide a reply on your post |
| `autoLikeByKeyword(page, { keywords, limit, delay, url })` | Auto-like posts matching keywords |
| `getEngagementAnalytics(page, tweetUrl)` | Get likes, reposts, replies, impressions |

### Auto-Like by Keyword

Scrolls a timeline or search page and likes posts containing any of the specified keywords. Empty keywords array likes all posts.

```javascript
await autoLikeByKeyword(page, {
  keywords: ['AI', 'javascript'],
  limit: 20,
  delay: 2000,
  url: 'https://x.com/home',
});
```

### Reply to Tweet

Navigates to a tweet, types a reply, optionally attaches media, and submits.

## Unlike All Posts

**File:** `src/unlikeAllPosts.js`

Browser console script that unlikes every post in your Likes tab. Supports keyword filters, dry run mode, rate limit detection, and exports a log.

### How to Use

1. Navigate to `x.com/YOUR_USERNAME/likes`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Configuration

- `maxUnlikes: Infinity` — cap on unlikes
- `skipKeywords: []` — keep likes containing these words
- `onlyKeywords: []` — only unlike posts matching these words
- `dryRun: false` — preview without unliking

### Controls

- `window.XActions.pause()` / `.resume()` / `.abort()` / `.status()`

## DOM Selectors

| Element | Selector |
|---------|----------|
| Like button | `[data-testid="like"]` |
| Unlike button | `[data-testid="unlike"]` |
| Reply button | `[data-testid="reply"]` |
| Reply input | `[data-testid="tweetTextarea_0"]` |
| Reply submit | `[data-testid="tweetButton"]` |
| Share button | `[data-testid="share"]` |
| Bookmark | `[data-testid="bookmark"]` |
| Remove bookmark | `[data-testid="removeBookmark"]` |
| Hide reply | `[data-testid="hideReply"]` |
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |

## Rate Limiting & Safety

- **Engagement Manager:** 1.5–2s delay between actions, 2s default for auto-like
- **Unlike All:** 1–2.5s between unlikes (gaussian randomized), 1.8s scroll delay
- Rate limit detection via `[data-testid="toast"]` with 60s cooldown
- **Unlike All is irreversible** — use `dryRun: true` to preview first
- X may restrict after ~400 like/unlike actions per day

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Like button not found | Tweet may already be liked — check for unlike button |
| Reply not posting | Verify `tweetTextarea_0` selector; tweet may have reply restrictions |
| Auto-like stops early | Rate limit hit — script waits 60s and retries |
| Unlike All stops after ~20 | Rate limit — wait 1 hour and re-run |
