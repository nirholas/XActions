---
name: follower-monitoring
description: Monitors X/Twitter follower changes using browser console scripts. Detects who unfollowed, tracks new followers with welcome messages, monitors any public account, runs continuous monitoring with alerts, tracks follower growth over time, and analyzes follower demographics. Use when tracking follower changes, detecting unfollowers, or monitoring Twitter accounts.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Follower Monitoring

Browser console scripts for tracking follower changes on X/Twitter. All scripts use localStorage for persistent snapshot comparison.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Detect who unfollowed you | `src/detectUnfollowers.js` | `x.com/USERNAME/followers` |
| Monitor any public account | `src/monitorAccount.js` | `x.com/TARGET/followers` |
| Continuous monitoring + alerts | `src/continuousMonitor.js` | `x.com/USERNAME/followers` |
| New follower tracking + welcome | `src/newFollowersAlert.js` | `x.com/USERNAME/followers` |
| Follower growth over time | `src/followerGrowthTracker.js` | `x.com/USERNAME/followers` |
| Follower demographics | `src/audienceDemographics.js` | `x.com/USERNAME/followers` |
| Audit follower quality | `src/auditFollowers.js` | `x.com/USERNAME/followers` |
| Follow ratio management | `src/followRatioManager.js` | `x.com/USERNAME` |

## How They Work

All scripts use the same **snapshot-compare pattern**:
1. First run: Scrapes visible users by scrolling, saves snapshot to localStorage
2. Subsequent runs: Scrapes current list, compares against saved snapshot, reports additions/removals

### detectUnfollowers.js
Compares follower snapshots. Auto-downloads unfollowers as `.txt` file. Simple two-run workflow: paste once to baseline, paste again later to detect changes.

### monitorAccount.js
Works on ANY public account (not just yours). Tracks both followers and following list changes. Downloads removed accounts list.

### continuousMonitor.js
Long-running script with auto-refresh on interval (default: 5 minutes). Sends browser Notification API alerts and plays Web Audio API sounds on changes. Tab must stay open.

### newFollowersAlert.js
Tracks new followers with display names. Generates welcome message templates. Also reports unfollowers as secondary output.

### followerGrowthTracker.js
Records follower count snapshots over time with timestamps. Calculates daily/weekly/monthly growth rates. Projects future milestones. Visual growth chart in console.

**Controls:** `XActions.track()`, `XActions.history()`, `XActions.project(target)`

### audienceDemographics.js
Scrapes follower profiles and classifies by niche, account size, bot likelihood, and verified status. Visual distribution charts.

### followRatioManager.js
Navigate to profile page. Monitors follower/following ratio with letter grades. Generates improvement plans.

**Controls:** `XActions.track()`, `XActions.plan()`, `XActions.history()`

## Storage Keys

| Script | localStorage Key |
|--------|-----------------|
| detectUnfollowers | `xactions_my_followers` |
| monitorAccount | `xactions_monitor_{username}_{type}` |
| newFollowersAlert | `xactions_new_followers` |
| followerGrowthTracker | `xactions_follower_growth` |
| followRatioManager | `xactions_ratio_history` |

## Strategy Guide

### Daily monitoring setup
1. Open `x.com/USERNAME/followers` in a pinned tab
2. Paste `src/continuousMonitor.js` — it auto-refreshes every 5 minutes
3. Enable browser notifications when prompted
4. Check back periodically for alerts

### Weekly follower health check
1. `src/followerGrowthTracker.js` -> `XActions.track()` to log this week
2. `src/followRatioManager.js` -> `XActions.track()` for ratio snapshot
3. `src/auditFollowers.js` to check for new bot followers
4. `src/audienceDemographics.js` to verify audience quality

### Resetting data
```javascript
localStorage.removeItem('xactions_my_followers')
localStorage.removeItem('xactions_follower_growth')
localStorage.removeItem('xactions_ratio_history')
```

## Notes
- All scripts auto-export results as downloadable JSON
- `continuousMonitor.js` requires the tab to stay open (Chrome throttles background timers)
- Monitoring accuracy improves with more scroll rounds (increase in CONFIG)
- localStorage persists across browser sessions but NOT across browser profiles
