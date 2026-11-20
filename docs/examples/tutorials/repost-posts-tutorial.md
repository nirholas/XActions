# Repost Posts -- Tutorial

> Step-by-step guide to reposting (retweeting), auto-reposting, and clearing reposts on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to `https://x.com/home`, a search page, or a profile
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of the script you need (see table below)
4. Edit the `CONFIG` section
5. Paste into the console and press Enter

## Scripts Overview

| Script | Purpose |
|--------|---------|
| `browser/repostPost.js` | Repost by URL, keyword, or unrepost by URL |
| `browser/autoRepost.js` | Auto-repost matching tweets from timeline/search |
| `browser/clearAllReposts.js` | Remove all reposts from your profile |

## Configuration

### browser/repostPost.js

#### Mode Selection

```js
const CONFIG = {
  mode: 'keywords',  // 'urls', 'keywords', or 'unrepost'
};
```

- **`urls`**: Repost specific posts by URL
- **`keywords`**: Scroll page and repost matching posts
- **`unrepost`**: Remove reposts by URL

#### URL Mode

```js
postUrls: [
  'https://x.com/nichxbt/status/123456789',
],
```

#### Keyword Mode

```js
keywords: ['AI agents', 'open source'],
matchAll: false,  // false = any keyword; true = ALL must match
```

#### Limits and Filters

| Option | Default | Description |
|--------|---------|-------------|
| `maxReposts` | `10` | Max reposts per run |
| `skipAlreadyReposted` | `true` | Skip posts you already reposted |
| `skipReplies` | `true` | Skip reply tweets |
| `minLikes` | `5` | Only repost tweets with at least N likes |

### browser/autoRepost.js

```js
const CONFIG = {
  keywords: ['AI agents'],
  fromUsers: ['nichxbt'],
  maxReposts: 20,
  minDelay: 2000,
  maxDelay: 4000,
  skipReplies: true,
  minLikes: 5,
};
```

At least one of `keywords` or `fromUsers` must have entries.

### browser/clearAllReposts.js

```js
const CONFIG = {
  maxRemovals: Infinity,    // Or set a number to limit
  dryRun: false,
  skipKeywords: [],         // Keep reposts containing these words
  minDelay: 1200,
  maxDelay: 3000,
  exportOnComplete: true,   // Auto-download removed reposts log
};
```

## Step-by-Step Guide

### Repost a Single Post by URL

**Step 1:** Set mode to `urls` in `browser/repostPost.js`:

```js
const CONFIG = {
  mode: 'urls',
  postUrls: [
    'https://x.com/nichxbt/status/123456789',
  ],
};
```

**Step 2:** Paste the script. It navigates to the URL, clicks the repost button, and confirms.

```
Navigating to: https://x.com/nichxbt/status/123456789
Reposted! (1/10)
```

### Auto-Repost by Keywords

**Step 1:** Navigate to your timeline or a search page.

**Step 2:** Configure `browser/autoRepost.js`:

```js
const CONFIG = {
  keywords: ['machine learning', 'AI tools'],
  fromUsers: [],
  maxReposts: 10,
  minLikes: 5,
};
```

**Step 3:** Paste the script. It scrolls, finds matching tweets, and reposts them:

```
Reposted (1/10): "New machine learning framework for..."
Reposted (2/10): "AI tools are revolutionizing the way..."
```

### Unrepost Specific Posts

Use `unrepost` mode in `browser/repostPost.js` to remove reposts:

```js
const CONFIG = {
  mode: 'unrepost',
  postUrls: [
    'https://x.com/nichxbt/status/123456789',
  ],
};
```

### Clear All Reposts

**Step 1:** Navigate to your profile page: `https://x.com/YOUR_USERNAME`

**Step 2:** Paste `browser/clearAllReposts.js`. It scrolls through your profile and removes all reposts.

**Step 3:** Use controls while running:

```js
window.XActions.pause();   // Pause
window.XActions.resume();  // Resume
window.XActions.abort();   // Stop
window.XActions.status();  // Show progress
```

**Step 4:** A JSON log of removed reposts is auto-downloaded when complete.

### Keep Certain Reposts

To protect specific reposts from being cleared:

```js
skipKeywords: ['important announcement', 'pinned'],
```

Reposts whose text contains any of these keywords will be skipped.

## Tips & Tricks

- **Set `minLikes: 5`** to avoid reposting low-quality content.
- **Use `skipReplies: true`** to only repost original tweets.
- **`clearAllReposts.js` has pause/resume** -- use `XActions.pause()` if you need to review progress.
- **Repost tracking** is saved to sessionStorage under `xactions_reposts`.
- **The auto-repost script requires at least one filter** (keywords or fromUsers). It will not repost everything blindly.
- **Rate limit detection** is built in. If X throttles you, the script pauses automatically.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Repost confirmation menu not found" | X may have changed the UI. Check selectors. |
| Already-reposted posts not skipped | Ensure `skipAlreadyReposted: true` |
| "No filters" error | Add at least one keyword or username to `autoRepost.js` |
| clearAllReposts stops early | Increase `maxEmptyScrolls` or reload and re-run |
| Rate-limited | Wait for the cooldown. The script auto-pauses for 60s. |

## Related Scripts

- `browser/likePost.js` -- Like posts by URL or keyword
- `browser/quoteTweetAutomation.js` -- Quote tweet with commentary
- `browser/autoReply.js` -- Auto-reply to matching tweets
