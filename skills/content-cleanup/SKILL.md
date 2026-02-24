---
name: content-cleanup
description: Mass-cleanup your X/Twitter account. Unlike all posts, clear all reposts/retweets, clear all bookmarks, and remove unwanted followers. Use when users want to clean their account history, remove old likes, or start fresh.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Content Cleanup with XActions

Browser console scripts for mass-cleaning your X/Twitter account history.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Unlike All Posts | `src/unlikeAllPosts.js` | Remove all likes from your likes page |
| Clear All Reposts | `src/clearAllReposts.js` | Remove all retweets/reposts |
| Clear All Bookmarks | `src/clearAllBookmarks.js` | Remove all saved bookmarks |
| Remove Followers | `src/removeFollowers.js` | Soft-block to remove specific followers |

## Unlike All Posts

**File:** `src/unlikeAllPosts.js`

Mass-unlike all posts from your likes page.

### How to use

1. Navigate to `x.com/YOUR_USERNAME/likes`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Configuration

```javascript
const CONFIG = {
  maxUnlikes: Infinity,     // Set a number to limit
  minDelay: 800,            // Minimum delay between unlikes (ms)
  maxDelay: 2000,           // Maximum delay
};
```

### Key selector

| Element | Selector |
|---------|----------|
| Unlike button | `[data-testid="unlike"]` |

## Clear All Reposts

**File:** `src/clearAllReposts.js`

Remove all retweets/reposts from your profile.

### How to use

1. Navigate to `x.com/YOUR_USERNAME`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Unretweet button | `[data-testid="unretweet"]` |
| Confirm unretweet | `[data-testid="unretweetConfirm"]` |

## Clear All Bookmarks

**File:** `src/clearAllBookmarks.js`

Remove all saved bookmarks. Tries the built-in "Clear All" button first, falls back to individual removal.

### How to use

1. Navigate to `x.com/i/bookmarks`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Remove Followers

**File:** `src/removeFollowers.js`

Remove specific followers without fully blocking them (soft-block technique).

### Configuration

```javascript
const CONFIG = {
  usersToRemove: ['username1', 'username2'],
  removeAll: false,     // Set to true to remove ALL visible followers
  maxRemovals: 50,
  dryRun: true,         // Set to false to actually remove
};
```

### How to use

1. Navigate to `x.com/YOUR_USERNAME/followers`
2. Edit the usernames to remove (or set `removeAll: true`)
3. Set `dryRun: false`
4. Open DevTools (F12) → Console
5. Paste the script → Enter

## Notes

- Unlike/unretweet operations cannot be undone — the original post remains, but your interaction is removed
- Clearing bookmarks is permanent
- Remove followers uses the "Remove this follower" option from the three-dot menu on the followers page
- All scripts include configurable delays to respect rate limits
- Progress is logged every 10 items
