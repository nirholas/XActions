# Like Posts -- Tutorial

> Step-by-step guide to liking posts on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to `https://x.com/home`, a search page, or any profile
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `browser/likePost.js`
4. Edit the `CONFIG` section (mode, keywords, URLs)
5. Paste into the console and press Enter

## Scripts Overview

| Script | Requires core.js | Use Case |
|--------|-----------------|----------|
| `browser/likePost.js` | No | Like by URL or keyword -- standalone |
| `src/automation/autoLiker.js` | Yes | Continuous auto-liker with rate limiting |

## Configuration

### browser/likePost.js

#### Mode Selection

```js
const CONFIG = {
  mode: 'keywords',  // 'urls' or 'keywords'
};
```

- **`urls` mode**: Likes specific posts by navigating to each URL.
- **`keywords` mode**: Scrolls the current page and likes posts matching keywords.

#### URL Mode Settings

```js
postUrls: [
  'https://x.com/nichxbt/status/123456789',
  'https://x.com/openai/status/987654321',
],
```

#### Keyword Mode Settings

```js
keywords: ['AI agents', 'open source'],
matchAll: false,  // false = any keyword matches; true = ALL must match
```

#### Limits and Filters

| Option | Default | Description |
|--------|---------|-------------|
| `maxLikes` | `20` | Max posts to like per run |
| `maxScrollAttempts` | `15` | Max scrolls to find more posts |
| `skipAlreadyLiked` | `true` | Skip posts you already liked |
| `minLikes` | `0` | Only like posts with at least N existing likes |
| `skipReplies` | `false` | Skip reply tweets |
| `trackLiked` | `true` | Save liked posts to sessionStorage |

#### Timing

| Option | Default | Description |
|--------|---------|-------------|
| `minDelay` | `1500` | Minimum ms between likes |
| `maxDelay` | `3000` | Maximum ms between likes |
| `scrollDelay` | `2000` | Delay after scrolling |
| `navigationDelay` | `3000` | Wait for page load (URL mode) |

### src/automation/autoLiker.js

This script requires pasting `src/automation/core.js` first.

```js
const OPTIONS = {
  LIKE_ALL: false,
  KEYWORDS: ['web3', 'crypto', 'AI'],
  FROM_USERS: [],
  MAX_LIKES: 20,
  MAX_SCROLL_DEPTH: 50,
  ALSO_RETWEET: false,
  MIN_DELAY: 2000,
  MAX_DELAY: 5000,
  SKIP_REPLIES: true,
  SKIP_ADS: true,
  MIN_LIKES_ON_POST: 0,
};
```

## Step-by-Step Guide

### Like Specific Posts by URL

**Step 1:** Set mode to `urls` and add your post URLs:

```js
const CONFIG = {
  mode: 'urls',
  postUrls: [
    'https://x.com/nichxbt/status/123456789',
    'https://x.com/openai/status/987654321',
  ],
  maxLikes: 20,
};
```

**Step 2:** Paste the script. It will navigate to each URL and click the like button.

**Step 3:** Watch the console output:

```
Navigating to: https://x.com/nichxbt/status/123456789
Liked! (1/20)
Navigating to: https://x.com/openai/status/987654321
Liked! (2/20)
```

### Like Posts by Keyword on Timeline

**Step 1:** Navigate to your home timeline or a search page (e.g., `x.com/search?q=AI+agents`).

**Step 2:** Set mode to `keywords`:

```js
const CONFIG = {
  mode: 'keywords',
  keywords: ['AI agents', 'machine learning'],
  matchAll: false,
  maxLikes: 15,
};
```

**Step 3:** Paste the script. It scrolls the page and likes matching posts:

```
Liked (1/15): "Just launched our new AI agent framework..."
Liked (2/15): "Machine learning is transforming healthcare..."
```

### Continuous Auto-Liking with core.js

**Step 1:** Navigate to your home feed or a profile page.

**Step 2:** Paste the contents of `src/automation/core.js` into the console first.

**Step 3:** Then paste `src/automation/autoLiker.js`:

```js
const OPTIONS = {
  KEYWORDS: ['startup', 'founder', 'building'],
  MAX_LIKES: 20,
  SKIP_REPLIES: true,
  SKIP_ADS: true,
};
```

**Step 4:** To stop the auto-liker at any time:

```js
window.stopAutoLiker();
```

## Tips & Tricks

- **Use `keywords` mode on search pages** for the most targeted results. Navigate to `x.com/search?q=your+topic` first.
- **Set `minLikes: 5`** to avoid liking low-quality posts with no engagement.
- **Enable `skipReplies: true`** to focus on original tweets only.
- **Liked history** is stored in sessionStorage under `xactions_liked`. This is cleared when you close the tab.
- **The auto-liker** (with core.js) has built-in rate limiting that tracks likes per day. It stops automatically before hitting X's daily limit.
- **`ALSO_RETWEET: true`** in the auto-liker will repost tweets as well as liking them.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No matching tweets found" | Broaden keywords or increase `maxScrollAttempts` |
| Likes not registering | X may be rate-limiting. Increase `minDelay` to 3000+ |
| "Core module not loaded" | Paste `src/automation/core.js` before `autoLiker.js` |
| Script stops early | Increase `maxScrollAttempts` and `maxLikes` |
| Already-liked posts not skipped | Ensure `skipAlreadyLiked: true` |

## Related Scripts

- `browser/autoReply.js` -- Auto-reply to matching tweets
- `browser/repostPost.js` -- Repost posts by URL or keyword
- `src/automation/autoLiker.js` -- Continuous auto-liker (requires core.js)
- `browser/quoteTweetAutomation.js` -- Quote tweet with commentary
