---
name: post-editing
description: Edit existing posts or undo a recently posted tweet on X/Twitter. Post editing and undo are X Premium features. Use when users want to edit a tweet they already posted or undo a tweet within the 30-second window.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Post Editing & Undo

Browser console script for editing existing posts or undoing a recently posted tweet.

> ⚠️ **X Premium required** — Post editing and undo are Premium-only features.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Edit an existing post | `src/editPost.js` | `x.com` |
| Undo a post within 30 seconds of posting | `src/editPost.js` | `x.com` |

## Quick Start

### Edit a post

1. Go to `x.com`
2. Open DevTools (F12) → Console
3. Set `mode: 'edit'`, `postUrl`, and `newText` in CONFIG
4. Paste `src/editPost.js` → Enter

### Undo a post (must run within 30 seconds of posting)

1. Post your tweet
2. Immediately open DevTools (F12) → Console
3. Set `mode: 'undo'` in CONFIG
4. Paste `src/editPost.js` → Enter

## Configuration

```js
const CONFIG = {
  mode: 'edit',         // 'edit' or 'undo'

  // Edit mode:
  postUrl: 'https://x.com/nichxbt/status/123456789',  // Post to edit
  newText: 'Updated tweet content here',               // New text

  // Timing:
  minDelay: 1000,
  maxDelay: 2000,
  navigationDelay: 3000,  // Wait for page/modal to load
};
```

## Selectors Used

| Element | Selector |
|---------|----------|
| Post options (⋯) | `[data-testid="caret"]` |
| Edit tweet option | `[data-testid="editTweet"]` |
| Tweet textarea | `[data-testid="tweetTextarea_0"]` |
| Submit button | `[data-testid="tweetButton"]` |
| Undo banner | `[data-testid="undoTweet"]` |

## Notes

- **Edit window**: X allows unlimited edits on Premium (unlike Bluesky's 5-minute limit)
- **Undo window**: The undo banner only appears for ~30 seconds after posting
- Edit history is publicly visible — a small edit badge appears on edited posts
- Script navigates to the post URL automatically when `postUrl` is set

## Related Skills

- **content-posting** — Post new tweets and threads
- **content-cleanup** — Delete tweets entirely
- **premium-subscriptions** — Manage X Premium features
