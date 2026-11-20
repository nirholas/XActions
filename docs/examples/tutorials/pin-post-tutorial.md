# Pin Post to Profile -- Tutorial

> Step-by-step guide to pinning, unpinning, and auto-pinning your best post on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to your profile page: `https://x.com/YOUR_USERNAME`
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `browser/pinTweetManager.js`
4. Edit the `CONFIG` section (action, metric, tweetUrl)
5. Paste into the console and press Enter

## Configuration

### Action Selection

```js
const CONFIG = {
  action: 'pinBest',  // 'pinBest', 'pinUrl', or 'unpin'
};
```

- **`pinBest`**: Scans your recent posts, finds the best by a metric, and pins it
- **`pinUrl`**: Pins a specific post by URL
- **`unpin`**: Unpins your currently pinned post

### Full CONFIG Reference

| Option | Default | Description |
|--------|---------|-------------|
| `action` | `'pinBest'` | `'pinBest'`, `'pinUrl'`, or `'unpin'` |
| `tweetUrl` | `''` | Full URL of tweet to pin (for `pinUrl` action) |
| `metric` | `'likes'` | Sort metric: `'likes'`, `'retweets'`, `'engagement'`, `'views'` |
| `postsToScan` | `30` | How many recent posts to evaluate |
| `scrollDelay` | `1500` | Delay between scrolls |
| `maxScrolls` | `20` | Max scroll attempts |
| `dryRun` | `false` | Preview mode -- shows what would be pinned |

## Step-by-Step Guide

### Auto-Pin Your Best Post

**Step 1:** Navigate to your profile: `https://x.com/YOUR_USERNAME`

**Step 2:** Configure the script for dry run first:

```js
const CONFIG = {
  action: 'pinBest',
  metric: 'likes',      // Find your most-liked post
  postsToScan: 30,
  dryRun: true,
};
```

**Step 3:** Paste the script. It scans your recent posts and shows the top candidates:

```
Scanning 30 recent posts to find best by likes...

Best post by likes:
  "Just shipped the new dashboard feature..."
  likes: 342 | retweets: 45 | replies: 28 | views: 12.5K
  https://x.com/you/status/123456789

[DRY RUN] Would pin this tweet.

Top 5 candidates:
  1. likes: 342 -- "Just shipped the new dashboard feature..."
  2. likes: 201 -- "Here's my take on AI agents..."
  3. likes: 156 -- "Thread: 10 lessons from building..."
  4. likes: 98  -- "Excited to announce..."
  5. likes: 87  -- "This changed how I think about..."
```

**Step 4:** Remove `dryRun` (or set to `false`) and re-paste to actually pin:

```js
dryRun: false,
```

The script scrolls back to the best post and clicks the pin option:

```
Pinning best tweet...
Tweet pinned successfully!
```

### Pin by Different Metrics

Choose what "best" means:

```js
metric: 'likes',        // Most liked
metric: 'retweets',     // Most reposted
metric: 'engagement',   // Most likes + retweets + replies combined
metric: 'views',        // Most viewed
```

### Pin a Specific Post by URL

```js
const CONFIG = {
  action: 'pinUrl',
  tweetUrl: 'https://x.com/YOUR_USERNAME/status/123456789',
};
```

The script navigates to the tweet. After loading, use the three-dot menu and select "Pin to your profile".

### Unpin Your Current Post

```js
const CONFIG = {
  action: 'unpin',
};
```

The script finds your pinned tweet (the first tweet on your profile with the "Pinned" label) and unpins it:

```
Looking for pinned tweet to unpin...
Tweet unpinned!
```

If no tweet is pinned:

```
No pinned tweet found.
```

## Tips & Tricks

- **Use `dryRun: true` first** to see which post would be pinned before committing.
- **Pin your best `engagement` post** (likes + retweets + replies) rather than just likes -- it shows broader appeal.
- **Increase `postsToScan`** to evaluate more of your history. The default 30 covers roughly your last month.
- **Run weekly** to keep your pinned post fresh with your latest best-performing content.
- **The script detects if the best post is already pinned** and skips the action.
- **Must be on your own profile page.** The script checks the URL path and will error if you are on the home feed or another page.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Go to your profile page first!" | Navigate to `x.com/YOUR_USERNAME` |
| "No posts found" | Increase `maxScrolls` or check that you are on the correct profile |
| "Could not re-find tweet in DOM" | The page may have changed. Navigate to the URL manually. |
| "Pin option not found in menu" | X may have updated the menu. Try pinning manually. |
| "Could not find menu button" | The caret (three-dot) button selector may need updating |

## Related Scripts

- `browser/bulkDeleteTweets.js` -- Delete tweets with filters
- `browser/shareEmbed.js` -- Copy links and embed codes
- `browser/postInteractions.js` -- View likes, reposts, quotes on a post
