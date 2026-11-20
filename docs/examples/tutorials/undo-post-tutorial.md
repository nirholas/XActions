# Undo Post -- Tutorial

> Step-by-step guide to undoing a recently posted tweet using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- **X Premium subscription** (undo is a Premium-only feature)
- Must run within 30 seconds of posting

## Quick Start
1. Post a tweet on x.com
2. Immediately open DevTools (F12) -- or have it open already
3. Copy the script from `browser/editPost.js`
4. Set `CONFIG.mode = 'undo'`
5. Paste into Console and press Enter within 30 seconds of posting

## How Undo Works

When you have X Premium, a brief "Undo" banner appears at the bottom of the screen after you post a tweet. This banner lasts approximately 30 seconds. Clicking "Undo" retracts the tweet before it becomes visible to your followers.

| Property | Value |
|----------|-------|
| Subscription | X Premium required |
| Time window | ~30 seconds after posting |
| What happens | The tweet is retracted/deleted before delivery |
| Reversible | No -- once undone, the tweet is gone |

## Configuration

```js
const CONFIG = {
  mode: 'undo',

  // Edit mode settings (not used in undo mode)
  postUrl: '',
  newText: '',

  // Timing
  minDelay: 1000,
  maxDelay: 2000,
  navigationDelay: 3000,
};
```

The only setting that matters for undo mode is `mode: 'undo'`. All other options are ignored.

## Step-by-Step Guide

### Recommended Workflow

The best approach is to have the script ready **before** you post:

1. Open DevTools (F12) on x.com
2. Paste `browser/editPost.js` into the console with `CONFIG.mode = 'undo'`
3. **Do not press Enter yet**
4. Post your tweet normally through the X interface
5. Immediately switch to the DevTools console and press Enter
6. The script will find and click the undo button

### How It Works Internally

The undo function is straightforward:

```js
// From browser/editPost.js -- undo mode:

const undoPost = async () => {
  console.log('Looking for undo button...');

  const undoBtn = await waitForElement('[data-testid="undoTweet"]', 5000);
  if (!undoBtn) {
    console.error('Undo button not found. The undo window may have expired (30s limit).');
    return;
  }

  undoBtn.click();
  console.log('Post undone successfully! The tweet has been retracted.');
};
```

The script:
1. Searches for the undo button (`[data-testid="undoTweet"]`) for up to 5 seconds
2. If found, clicks it immediately
3. The tweet is retracted before delivery

### Undo vs Delete

| Action | Undo | Delete |
|--------|------|--------|
| Time limit | 30 seconds | Any time |
| Visibility | Tweet may never be seen | Tweet was already visible |
| Notifications | No notifications sent | Notifications already sent |
| Subscription | Premium required | Free |
| Engagement | No engagement possible | Existing engagement lost |

Undo is preferable when you catch a mistake immediately because:
- The tweet may not have been delivered to followers yet
- No notifications were sent
- No engagement was recorded
- It is as if the tweet never existed

### Pre-loading the Script

For a faster workflow, you can pre-load the undo function and call it when needed:

```js
// Paste this into the console before posting
window.undoLastPost = async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const waitForElement = async (sel, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(sel);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const btn = await waitForElement('[data-testid="undoTweet"]');
  if (btn) {
    btn.click();
    console.log('Post undone!');
  } else {
    console.log('Undo button not found -- window expired.');
  }
};

// Then after posting, just type:
// undoLastPost()
```

## Tips & Tricks

- **Have it ready**: The 30-second window is very short. Have the script or function pre-loaded in your console.
- **Quick access**: Pre-load `window.undoLastPost()` so you can call it with minimal typing.
- **Premium only**: Without X Premium, the undo banner does not appear at all.
- **Mobile too**: The undo feature also works on the X mobile app, though this script is for the web.
- **Not reversible**: Once you undo a tweet, it is gone. You would need to compose and post it again.
- **Thread tweets**: Undoing the last tweet in a thread only undoes that specific tweet, not the entire thread.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Undo button not found" | The 30-second window has expired. Use delete instead (`src/postComposer.js` `deletePost`). |
| No undo banner appears | You need X Premium. Free accounts do not have the undo feature. |
| Script runs too slowly | Pre-load the undo function before posting so it is ready immediately. |
| Undo did not work | The tweet may have already been delivered. Check your profile to confirm. |

## Related Scripts

- `browser/editPost.js` (edit mode) -- Edit posts within 1 hour
- `src/postComposer.js` (`deletePost`) -- Delete posts at any time
- `docs/examples/tutorials/edit-post-tutorial.md` -- Edit post guide
