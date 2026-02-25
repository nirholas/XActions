---
name: unfollow-management
description: Mass unfollow on X/Twitter via browser console scripts. Unfollows everyone, only non-followers, non-followers with username logging, smart time-based unfollow with whitelists, and follow/following ratio management. Use when cleaning up a following list, removing non-followers, bulk unfollowing accounts, or optimizing your follow ratio.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Unfollow Management

Browser console scripts for managing who you follow on X/Twitter. All scripts run in DevTools console.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Unfollow ALL accounts | `src/unfollowEveryone.js` | `x.com/USERNAME/following` |
| Unfollow only non-followers | `src/unfollowback.js` | `x.com/USERNAME/following` |
| Unfollow non-followers + download log | `src/unfollowWDFBLog.js` | `x.com/USERNAME/following` |
| Time-based smart unfollow with whitelist | `src/automation/smartUnfollow.js` | `x.com/USERNAME/following` |
| Detect who unfollowed you | `src/detectUnfollowers.js` | `x.com/USERNAME/followers` |
| Monitor follow/following ratio + plan | `src/followRatioManager.js` | `x.com/USERNAME` |
| Remove specific followers from YOUR list | `src/removeFollowers.js` | `x.com/USERNAME/followers` |

## Script Details

For detailed algorithms, controls, configurations, and DOM selectors for each script, see [references/script-details.md](references/script-details.md).

## Rate Limiting & Safety

- **Default delay:** 1–2 seconds between unfollows (gaussian randomized)
- **Batch delay:** 2–3 seconds between scroll batches
- **Rate limit detection:** Scripts check for `[data-testid="toast"]` warning banners
- **Backoff:** If rate limited, scripts wait 30–60 seconds before retrying
- **Daily limit guidance:** X may restrict after ~400 unfollows/day; spread over multiple sessions
- **Recovery:** If action-restricted, wait 12–24 hours

## Strategy Guide

### Cleaning a bloated following list

1. Run `src/followRatioManager.js` on your profile to assess current ratio
2. Use `XActions.plan()` to see how many unfollows are needed
3. Run `src/unfollowback.js` to remove non-followers first (safest)
4. If more cleanup needed, use `src/unfollowEveryone.js` with abort when satisfied
5. Re-check ratio with `XActions.track()`

### Maintaining a healthy ratio over time

1. Set up periodic runs of `src/detectUnfollowers.js` to track losses
2. Use `src/followRatioManager.js` weekly to monitor trends
3. Run `src/unfollowback.js` monthly to remove non-reciprocal follows
4. Keep a whitelist in `smartUnfollow.js` for accounts you always want to follow

### Before a big unfollow session

1. Export your following list first: `scripts/scrapeFollowing.js`
2. Run `src/unfollowWDFBLog.js` (saves log of who was unfollowed)
3. Review the downloaded log for any mistakes
4. Use `src/followRatioManager.js` to verify improvements

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No unfollow buttons found" | Make sure you're on the Following page, not Followers |
| Script stops after ~20 unfollows | X rate limit triggered — wait 1 hour and re-run |
| Confirmation dialog doesn't appear | DOM may have changed — check `confirmationSheetConfirm` selector |
| Script unfollows mutuals | Use `unfollowback.js` instead of `unfollowEveryone.js` |
| "Action restricted" warning | Account is temporarily limited — wait 12-24 hours |
| Script misses accounts | Re-run the script — some load below the scroll area |

## Related Skills

- **follower-monitoring** — Track follower growth and detect unfollowers
- **blocking-muting-management** — Block/unblock for removing followers
- **growth-automation** — Grow followers to improve ratio organically
- **analytics-insights** — Understand engagement before unfollowing
