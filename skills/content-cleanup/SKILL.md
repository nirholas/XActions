---
name: content-cleanup
description: Mass-cleanup your X/Twitter account. Delete every post matching a search (for example every reply you sent one account), unlike all posts, clear all reposts/retweets, clear all bookmarks, and remove unwanted followers. Use when users want to clean their account history, delete replies to someone, remove old likes, or start fresh.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "3.0"
---

# Content Cleanup with XActions

Browser console scripts for mass-cleaning your X/Twitter account history.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Search Sweep | `scripts/searchSweep.js` | Delete (or like/repost/reply to) every post an X search returns |
| Bulk Delete Tweets | `src/bulkDeleteTweets.js` | Delete your own posts from your profile timeline by age, keyword, or engagement |
| Unlike All Posts | `src/unlikeAllPosts.js` | Remove all likes from your likes page |
| Clear All Reposts | `src/clearAllReposts.js` | Remove all retweets/reposts |
| Clear All Bookmarks | `src/clearAllBookmarks.js` | Remove all saved bookmarks |
| Remove Followers | `src/removeFollowers.js` | Soft-block to remove specific followers |

## Search Sweep: delete everything matching a search

**File:** `scripts/searchSweep.js` (full guide: `docs/search-sweep.md`)

The one to reach for when the user wants "delete every reply I sent @someone",
"remove all my posts mentioning X", or "delete everything I posted before 2024".
X has no bulk tool for that, but its search finds the posts:

```
https://x.com/search?q=from%3AYOUR_HANDLE%20%40someone&src=typed_query&f=live
```

### How to use

1. Open that search on x.com (use the Latest tab, `f=live`; Top ranking hides most results)
2. Open DevTools (F12) then Console
3. Paste `scripts/searchSweep.js`. A panel appears bottom-right, pre-filled with the query already in the address bar
4. Pick the action: Delete, Like, Repost, or Reply. Leave Dry run ON and click Start
5. Read the log, untick Dry run, start again

### What to tell the user

- **Delete only ever touches their own posts.** Anything by another account is refused.
- **It needs more than one run.** X search returns a slice at a time and its index lags
  deletions by minutes. The script re-runs the query for several passes and remembers
  every id it acted on, so running it again a day later only picks up stragglers.
- **Filters protect posts worth keeping**: minimum age, likes/reposts ceiling, keyword
  exclusions, and the pinned post is always skipped.
- **Deletion is permanent.** Back up first with `scripts/backupAccount.js`.

### Query building

| Want | Query |
|------|-------|
| Every reply you sent someone | `from:you @someone` |
| Only direct replies to them | `from:you to:someone` |
| Everything you posted before a date | `from:you until:2024-01-01` |
| Your posts on a topic | `from:you keyword` |
| Only replies, no links | `from:you @someone filter:replies -filter:links` |

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

1. Navigate to `x.com/i/history`
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

- Deleting a post cannot be undone, and X search keeps listing deleted posts for a few minutes
- Unlike/unretweet operations cannot be undone — the original post remains, but your interaction is removed
- Clearing bookmarks is permanent
- Remove followers uses the "Remove this follower" option from the three-dot menu on the followers page
- All scripts include configurable delays to respect rate limits
- Progress is logged every 10 items
