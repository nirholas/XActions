---
name: unfollow-management
description: Mass unfollow on X/Twitter via browser console scripts. Unfollows everyone, only non-followers, non-followers with username logging, or smart time-based unfollow with whitelists. Use when cleaning up a following list, removing non-followers, or bulk unfollowing accounts on Twitter.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Unfollow Management

Browser console scripts. Paste into DevTools on `x.com/USERNAME/following`.

## Script selection

| Goal | File |
|------|------|
| Unfollow ALL accounts | `src/unfollowEveryone.js` |
| Unfollow only non-followers | `src/unfollowback.js` |
| Unfollow non-followers + download log of usernames | `src/unfollowWDFBLog.js` |
| Time-based unfollow with whitelist (requires `core.js` first) | `src/automation/smartUnfollow.js` |

## How the scripts work

All scripts use the same pattern: find unfollow buttons → click → confirm → scroll for more → repeat with retries (3 attempts when no buttons found).

**unfollowback.js** filters buttons by checking for absence of `[data-testid="userFollowIndicator"]` ("Follows you" badge) on adjacent user cells — only unfollows non-mutual accounts.

**unfollowWDFBLog.js** does the same filtering but processes sequentially and collects usernames. Auto-downloads a `.txt` log when complete.

**smartUnfollow.js** requires pasting `src/automation/core.js` first. Uses follow-timestamp data from `keywordFollow.js` to unfollow users who didn't follow back within a configurable grace period. Supports a whitelist to protect specific accounts.

## DOM selectors

| Element | Selector |
|---------|----------|
| Unfollow button | `[data-testid$="-unfollow"]` |
| Confirmation dialog | `[data-testid="confirmationSheetConfirm"]` |
| Follows you indicator | `[data-testid="userFollowIndicator"]` |

## Timing

- 1s delay between unfollows, 2s between batches
- Re-run the script if it finishes but accounts remain (batching limitation)
- X may temporarily restrict actions under heavy unfollowing
