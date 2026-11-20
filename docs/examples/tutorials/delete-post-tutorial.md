# Delete Post -- Tutorial

> Step-by-step guide to deleting tweets individually and in bulk on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- **Backup first** -- deletion is permanent. Consider using `browser/backupAccount.js` before deleting.

## Quick Start
1. Navigate to your own profile: `https://x.com/YOUR_USERNAME`. Its tabs work too,
   so `https://x.com/YOUR_USERNAME/with_replies` is the right place to clear replies.
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `browser/bulkDeleteTweets.js`
4. Edit the `CONFIG` section (filters, dryRun)
5. Paste into the console and press Enter

## Configuration

### Filter Options

All filter conditions must match for a tweet to be deleted. Set a filter to `null` or empty to disable it.

```js
filters: {
  olderThanDays: null,       // Delete tweets older than N days
  beforeDate: null,          // Delete before 'YYYY-MM-DD'
  afterDate: null,           // Delete after 'YYYY-MM-DD'
  maxLikes: null,            // Only delete if likes <= this
  maxRetweets: null,         // Only delete if retweets <= this
  containsKeywords: [],      // Delete if text contains ANY of these
  excludeKeywords: [],       // NEVER delete if text contains ANY of these
  excludePinned: true,       // Skip your pinned tweet
  excludeThreads: false,     // Skip thread tweets
  onlyRetweets: false,       // Only delete retweets
  onlyReplies: false,        // Only delete replies
},
```

### Limits and Safety

| Option | Default | Description |
|--------|---------|-------------|
| `maxDeletes` | `Infinity` | Stop after this many deletions |
| `scrollCycles` | `100` | Maximum scroll attempts |
| `dryRun` | `false` | Deletes for real. Set it to `true` for a preview run that removes nothing. |
| `confirmEvery` | `50` | Pause for confirmation every N deletes (0 = never) |
| `exportDeleted` | `true` | Save deleted tweet data before removal |
| `exportOnComplete` | `true` | Auto-download JSON when done |

### Timing

| Option | Default | Description |
|--------|---------|-------------|
| `minDelay` | `3000` | Minimum ms between deletions |
| `maxDelay` | `7000` | Maximum ms between deletions |
| `scrollDelay` | `4000` | Delay after scrolling, so the next page of posts renders |
| `menuDelay` | `1200` | Wait after clicking menu |

X throttles bursts of deletions and starts failing them silently, so the
defaults are unhurried. Lower them and you trade completed deletions for
speed you will not get.

## Step-by-Step Guide

### Delete a Single Post

For a single tweet, the manual approach is simplest:

1. Navigate to the tweet
2. Click the three-dot menu (caret)
3. Click "Delete"
4. Confirm

Or use the script with a narrow filter:

```js
const CONFIG = {
  filters: {
    containsKeywords: ['exact text of the tweet to delete'],
  },
  maxDeletes: 1,
  dryRun: true,   // preview; set false to delete
};
```

### Bulk Delete with Filters

#### Delete Old Low-Engagement Tweets

```js
const CONFIG = {
  filters: {
    olderThanDays: 365,   // Older than 1 year
    maxLikes: 5,          // With 5 or fewer likes
    excludePinned: true,
  },
  dryRun: true,           // Preview first! false deletes for real.
};
```

#### Delete All Retweets

```js
const CONFIG = {
  filters: {
    onlyRetweets: true,
  },
  dryRun: true,
};
```

#### Delete Tweets Before a Date

```js
const CONFIG = {
  filters: {
    beforeDate: '2025-01-01',  // Delete everything before 2025
    excludeKeywords: ['thread', 'announcement'],  // Protect these
  },
  dryRun: true,
};
```

#### Delete Only Replies

```js
const CONFIG = {
  filters: {
    onlyReplies: true,
    maxLikes: 2,  // Only low-engagement replies
  },
  dryRun: true,
};
```

#### Delete Tweets Containing Specific Words

```js
const CONFIG = {
  filters: {
    containsKeywords: ['cringe', 'bad take', 'delete this'],
  },
  dryRun: true,
};
```

### Step-by-Step Workflow

**Step 1: Dry Run First**

Set `dryRun: true` (it ships as `false`, which deletes for real). Paste the script:

```
BULK DELETE TWEETS
DRY RUN -- preview only

Profile: @yourusername

Active Filters:
  - Older than 365 days
  - Max likes: 5
  - Skipping pinned tweet

[DRY] Would delete: "Old tweet nobody cared about..." (likes: 1, retweets: 0)
[DRY] Would delete: "Another forgettable take..." (likes: 3, retweets: 0)
```

**Step 2: Review the Output**

Check that only tweets you want deleted are listed. Adjust filters if needed.

**Step 3: Go Live**

```js
dryRun: false,
```

Re-paste the script. It will click the three-dot menu on each tweet, select "Delete", and confirm:

```
#1: Deleted "Old tweet nobody cared about..." (likes: 1)
#5: Deleted "Another forgettable take..." (likes: 3)

Scroll 5: 10 deleted | 3 skipped | 42s elapsed
```

**Step 4: Monitor and Control**

```js
XActionsUtils.pause();   // Pause
XActionsUtils.resume();  // Resume
XActionsUtils.abort();   // Stop
```

The script pauses for confirmation every 50 deletes (configurable with `confirmEvery`).

**Step 5: Review Export**

A JSON file is auto-downloaded with all deleted tweets:

```json
{
  "deleted": [
    {
      "text": "Old tweet...",
      "timestamp": "2024-03-15T10:00:00Z",
      "likes": 1,
      "retweets": 0
    }
  ],
  "stats": {
    "count": 10,
    "skipped": 3,
    "errors": 0,
    "elapsed": "42s"
  }
}
```

## Tips & Tricks

- **Set `dryRun: true` for the first pass on a new filter.** Deletion is permanent, and the default is a real run.
- **Export first** using `browser/backupAccount.js` to save your tweets before deleting.
- **Use `excludeKeywords`** to protect important tweets (e.g., `['thread', 'announcement', 'milestone']`).
- **`excludePinned: true`** (default) prevents accidentally deleting your pinned tweet.
- **`confirmEvery: 50`** adds a checkpoint. The script pauses and waits for you to call `resume()`.
- **For retweets**, the script finds "Undo repost" in the menu instead of "Delete".
- **Rate limit detection** is built in. If X throttles you, the script pauses for 90 seconds.
- **Reload and re-run** if some tweets were missed. The DOM may not have loaded all tweets in one pass.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Run this on your profile timeline" | You are on a feed, a single post, or a section like `/home`. Open `x.com/YOUR_USERNAME` (or one of its tabs). |
| "This is @someone's profile" | You are viewing another account. The script only deletes posts on the account you are signed in as. |
| "No confirm dialog" | X may have changed the delete confirmation UI |
| Script stops with consecutive errors | The three-dot menu or delete option selectors may need updating |
| Not all tweets deleted | Reload the page and re-run. Some tweets load lazily. |
| "No filters set -- ALL tweets will be deleted!" | Add at least one filter to avoid deleting everything |

## Related Scripts

- `browser/pinTweetManager.js` -- Pin/unpin posts
- `browser/clearAllReposts.js` -- Remove all reposts
- `browser/clearAllBookmarks.js` -- Remove all bookmarks
