---
name: follower-monitoring
description: Monitors X/Twitter follower changes using browser console scripts. Detects who unfollowed, tracks new followers with welcome message templates, monitors any public account's followers or following list, and runs continuous monitoring with browser notifications and audio alerts. Use when tracking follower changes, detecting unfollowers, or monitoring Twitter accounts.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Follower Monitoring

Browser console scripts. Paste into DevTools on the appropriate followers/following page.

## Script selection

| Goal | Navigate to | File |
|------|------------|------|
| Detect who unfollowed you | `x.com/USERNAME/followers` | `src/detectUnfollowers.js` |
| Track any public account's changes | `x.com/TARGET/followers` or `/following` | `src/monitorAccount.js` |
| Auto-refresh monitoring with alerts | `x.com/USERNAME/followers` | `src/continuousMonitor.js` |
| New follower tracking + welcome messages | `x.com/USERNAME/followers` | `src/newFollowersAlert.js` |

## How they work

All scripts use the same snapshot-compare pattern:

1. **First run**: Scrapes all visible users by scrolling, saves snapshot to `localStorage`, reports total count
2. **Subsequent runs**: Scrapes current list, compares against saved snapshot, reports additions and removals, updates snapshot

### Storage keys

| Script | localStorage key | Value format |
|--------|-----------------|-------------|
| detectUnfollowers | `xactions_my_followers` | `[{ username, displayName }]` |
| monitorAccount | `xactions_monitor_{username}_{type}` | `[{ username, displayName }]` |
| newFollowersAlert | `xactions_new_followers` | `Map` with display names |

### Script-specific behavior

**detectUnfollowers.js** — Auto-downloads unfollower list as `.txt` on detection.

**monitorAccount.js** — Works on ANY public account (not just yours). Downloads lists of removed accounts.

**continuousMonitor.js** — Long-running. Auto-checks on interval (default: `CHECK_INTERVAL_MINUTES = 5` at top of script). Sends browser Notification API alerts and plays Web Audio API sounds on changes. Tab must stay open.

**newFollowersAlert.js** — Tracks new followers with display names and generates welcome message templates. Also reports unfollowers as secondary output.

## Resetting data

```javascript
localStorage.removeItem('xactions_my_followers')
// or for monitored accounts:
localStorage.removeItem('xactions_monitor_username_followers')
```
