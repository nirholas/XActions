# Unfollow Accounts -- Tutorial

> Step-by-step guide to unfollowing accounts on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to `https://x.com/YOUR_USERNAME/following`
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of the script you need (see table below)
4. Edit the `CONFIG` section
5. Paste into the console and press Enter

## Scripts Overview

| Script | Requires core.js | Purpose |
|--------|-----------------|---------|
| `browser/unfollowEveryone.js` | No | Unfollow every account you follow |
| `browser/unfollowback.js` | No | Unfollow only non-followers |
| `src/automation/smartUnfollow.js` | Yes | Time-based unfollow (integrates with keywordFollow) |

## Configuration

### browser/unfollowEveryone.js

```js
const CONFIG = {
  maxUnfollows: Infinity,
  minDelay: 1200,
  maxDelay: 3000,
  scrollDelay: 2000,
  whitelist: [
    // 'nichxbt',
    // 'elonmusk',
  ],
  dryRun: false,
  maxRetries: 8,
  maxConsecutiveErrors: 5,
  rateLimitPauseMs: 60000,
  trackUnfollowed: true,
  exportOnComplete: true,
};
```

### browser/unfollowback.js

```js
const CONFIG = {
  maxUnfollows: Infinity,
  whitelist: [],
  dryRun: true,              // SET FALSE TO EXECUTE
  minDelay: 1500,
  maxDelay: 3500,
  scrollDelay: 2000,
  maxConsecutiveErrors: 8,
  maxEmptyScrolls: 6,
  rateLimitCooldown: 60000,
  exportOnComplete: true,
};
```

### src/automation/smartUnfollow.js (requires core.js)

```js
const OPTIONS = {
  DAYS_TO_WAIT: 3,            // Unfollow if not followed back in 3 days
  MAX_UNFOLLOWS: 50,
  WHITELIST: [],
  DRY_RUN: false,
  ONLY_TRACKED: true,         // Only unfollow users tracked by keywordFollow
  DELAY_BETWEEN_UNFOLLOWS: 2000,
};
```

## Step-by-Step Guide

### Unfollow Everyone

**Step 1:** Navigate to `https://x.com/YOUR_USERNAME/following`.

**Step 2:** Set your whitelist (accounts to never unfollow):

```js
const CONFIG = {
  whitelist: ['nichxbt', 'openai', 'bestfriend'],
  dryRun: false,
  maxUnfollows: 100,  // Start with a small batch
};
```

**Step 3:** Paste `browser/unfollowEveryone.js`. It scrolls through your following list and unfollows each account:

```
UNFOLLOW EVERYONE
LIVE

Max: 100 | Delay: 1200-3000ms | Whitelist: 3

#1 Unfollowed @randomuser1
#2 Unfollowed @randomuser2
#3 Unfollowed @randomuser3
...
#25 (25 done | 3 skipped | 0 err | 62s | 24.2/min)
```

**Step 4:** Use controls while running:

```js
XActionsUtils.pause();   // Pause
XActionsUtils.resume();  // Resume
XActionsUtils.abort();   // Stop
```

**Step 5:** A JSON log is auto-downloaded and saved to localStorage.

### Unfollow Non-Followers Only

**Step 1:** Navigate to `https://x.com/YOUR_USERNAME/following`.

**Step 2:** Start with a dry run:

```js
const CONFIG = {
  whitelist: ['nichxbt', 'important_friend'],
  dryRun: true,
  maxUnfollows: 50,
};
```

**Step 3:** Paste `browser/unfollowback.js`. The script checks each user for the "Follows you" badge:

```
UNFOLLOW NON-FOLLOWERS
DRY RUN -- no accounts will be unfollowed.

  Would unfollow: @nonfollower1
  Would unfollow: @nonfollower2
  Whitelisted: @important_friend

RESULTS
  Scanned: 200
  Unfollowed: 45
  Follows back: 152
  Whitelisted: 1
```

**Step 4:** Set `dryRun: false` and re-paste to execute:

```js
dryRun: false,
```

**Step 5:** Use controls while running:

```js
XActions.pause();    // Pause
XActions.resume();   // Resume
XActions.abort();    // Stop
XActions.status();   // Show progress
```

### Smart Unfollow (Time-Based)

This works with `keywordFollow.js` to unfollow users who did not follow back within a grace period.

**Step 1:** First, you need follower data. Navigate to `x.com/YOUR_USERNAME/followers` and paste the smart unfollow script. It scrapes and saves your followers list.

**Step 2:** Then navigate to `x.com/YOUR_USERNAME/following` and paste it again. It compares against tracked users from `keywordFollow.js`:

```js
const OPTIONS = {
  DAYS_TO_WAIT: 3,
  MAX_UNFOLLOWS: 30,
  DRY_RUN: false,
  ONLY_TRACKED: true,
};
```

**Step 3:** The script finds users you followed (via keywordFollow) who did not follow back within 3 days:

```
Starting Smart Unfollow...
Wait period: 3 days
Tracking 45 previously followed users

Loaded 1200 followers from previous scrape
Found 12 non-followers past the 3-day threshold

Unfollowing @user1 (didn't follow back in 3 days)
Unfollowing @user2 (didn't follow back in 3 days)

Done! Unfollowed 12 users.
```

**Step 4:** Stop at any time:

```js
window.stopSmartUnfollow();
```

## Tips & Tricks

- **Always use `dryRun: true` first** with `unfollowback.js` to preview who will be unfollowed.
- **The whitelist is critical.** Add close friends, important contacts, and accounts you want to keep following regardless.
- **`unfollowback.js` detects the "Follows you" badge** on each user cell. This is the most reliable indicator.
- **Rate limits are strict for unfollows.** Keep delays at 1.5-3 seconds. The scripts auto-pause on rate limits.
- **Progress is saved to localStorage.** If you stop and restart, previously processed users are skipped.
- **Reload and re-run** if some users were missed. The following list loads lazily.
- **Smart unfollow is a two-step process**: scrape followers first (on /followers page), then unfollow (on /following page).
- **Export is automatic.** A JSON file downloads with all unfollowed accounts and statistics.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Wrong page! Go to /following" | Navigate to `x.com/YOUR_USERNAME/following` |
| "Core module not loaded!" | Paste `core.js` before `smartUnfollow.js` |
| "No tracked users found" | Run `keywordFollow.js` first, or set `ONLY_TRACKED: false` |
| "No followers data" | Run smartUnfollow on `/followers` page first to scrape |
| Script stops after a few unfollows | Rate-limited. Wait 60 seconds or increase delays. |
| "Consecutive errors -- aborting" | X may have changed the unfollow confirmation UI |
| Whitelisted user still unfollowed | Check whitelist spelling (case-insensitive, no @ prefix) |

## Related Scripts

- `browser/followAccount.js` -- Follow specific accounts
- `src/automation/keywordFollow.js` -- Keyword-based follow
- `src/automation/followTargetUsers.js` -- Follow followers of target accounts
- `browser/detectUnfollowers.js` -- Detect who unfollowed you
