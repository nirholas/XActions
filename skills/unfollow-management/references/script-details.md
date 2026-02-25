# Unfollow Management — Script Details

Detailed algorithms, controls, and configurations for each unfollow script.

## Table of Contents

- [unfollowEveryone.js](#unfolloweveryonejs)
- [unfollowback.js](#unfollowbackjs)
- [unfollowWDFBLog.js](#unfollowwdfblogjs)
- [smartUnfollow.js](#smartunfollowjs)
- [followRatioManager.js](#followratiomanagerjs)
- [detectUnfollowers.js](#detectunfollowersjs)
- [removeFollowers.js](#removefollowersjs)

## unfollowEveryone.js

Bulk unfollows every account you follow. Processes in batches with scroll-and-click cycles.

**Algorithm:** Find all `[data-testid$="-unfollow"]` buttons → click each → confirm in dialog → scroll down for more → repeat. Includes retry logic (3 attempts when no buttons found), progress tracking with ETA, sessionStorage persistence across page refreshes, auto JSON export of unfollowed accounts.

**Controls:**
- `window.XActions.pause()` — Pause execution
- `window.XActions.resume()` — Resume
- `window.XActions.abort()` — Stop and export results

## unfollowback.js

Unfollows accounts that don't follow you back (non-mutual). Identifies non-followers by checking for the **absence** of the "Follows you" badge.

**Algorithm:** For each user cell, check if `[data-testid="userFollowIndicator"]` exists. If NOT present → unfollow. Processes one-by-one with configurable delay.

**Output:** Console log of each unfollowed account, running count, final JSON export.

## unfollowWDFBLog.js

Same non-follower detection as `unfollowback.js` but collects usernames and auto-downloads a `.txt` log file when complete. Useful for record-keeping before mass unfollowing.

**Output:** Downloaded `unfollowed-nonfollowers-TIMESTAMP.txt` file + console summary.

## smartUnfollow.js

**Requires:** Paste `src/automation/core.js` first.

Uses follow timestamps from `keywordFollow.js` to only unfollow users who haven't followed you back within a configurable grace period. Supports a whitelist to protect VIP accounts.

**Config:**
- `gracePeriodDays: 7` — Days to wait before unfollowing
- `whitelist: ['account1', 'account2']` — Protected accounts

## followRatioManager.js

Monitors and manages your follower/following ratio with actionable improvement plans.

**Features:**
- Letter-grade rating (S through F)
- Visual ratio bar
- Three improvement paths: unfollow accounts, gain followers, or combination
- Weekly growth projections
- localStorage history with trend tracking
- Cross-references other XActions scripts in recommendations

**Controls:**
- `XActions.setTarget(ratio)` — Set goal ratio (e.g., 2.0)
- `XActions.track()` — Record current snapshot
- `XActions.history()` — View trend over time
- `XActions.plan()` — Generate actionable plan

## detectUnfollowers.js

Takes snapshots of your follower list and compares to detect who unfollowed you.

**Navigate to:** `x.com/USERNAME/followers`

## removeFollowers.js

Removes followers from YOUR list using the block-then-unblock method.

**Navigate to:** `x.com/USERNAME/followers`

## DOM Selectors

| Element | Selector | Notes |
|---------|----------|-------|
| Unfollow button | `[data-testid$="-unfollow"]` | Appears on Following page |
| Confirmation dialog | `[data-testid="confirmationSheetConfirm"]` | Red "Unfollow" button |
| Follows you indicator | `[data-testid="userFollowIndicator"]` | "Follows you" badge |
| User cell | `[data-testid="UserCell"]` | Container for each user |
| Username link | `a[href^="/"][role="link"]` | First link in cell |
| Follower count | `a[href$="/followers"] span` | On profile page |
| Following count | `a[href$="/following"] span` | On profile page |
