---
name: growth-automation
description: Automates X/Twitter growth via browser console scripts. Auto-likes tweets by keyword/user filters, auto-comments on target users, follows by keyword search or engagement, follows audiences of target accounts with rich filtering, trains the algorithm for niches, and runs combined growth suites. All require pasting core.js first. Use when automating Twitter growth, engagement, following, or audience building.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Growth Automation

Browser console scripts for X/Twitter. **Always paste `src/automation/core.js` first** -- it provides shared config, selectors, utilities, and rate limiting.

## Script Selection

| Goal | File |
|------|------|
| Auto-like timeline tweets | `src/automation/autoLiker.js` |
| Auto-comment on target's posts | `src/automation/autoCommenter.js` |
| Follow users by keyword search | `src/automation/keywordFollow.js` |
| Follow users who engaged with posts | `src/automation/followEngagers.js` |
| Follow target account's audience | `src/automation/followTargetUsers.js` |
| All-in-one growth suite | `src/automation/growthSuite.js` |
| Train algorithm for your niche | `src/automation/algorithmTrainer.js` |
| Boost engagement systematically | `src/engagementBooster.js` |
| Welcome new followers | `src/welcomeNewFollowers.js` |
| Auto-plug viral tweets | `src/autoPlugReplies.js` |

## Key Scripts

### autoLiker.js
Scrolls timeline, checks tweets against configurable filters (keywords, users, skip replies/ads, min likes threshold, max per session), clicks Like. Gaussian-randomized delays.

### autoCommenter.js
Monitors a target user's profile for new posts. Replies with randomly rotated comment templates. Configurable check interval and max comments per session.

### keywordFollow.js
Searches X by keywords, follows users from results. Records follow timestamps (used by `smartUnfollow.js` for grace-period logic). Configurable daily limits, de-duplicates.

### followEngagers.js
Takes post URL(s), scans likers/retweeters/quote-tweeters, follows them. Configure engagement types and follow limit per post.

### followTargetUsers.js
Takes target account(s), follows their followers or following. Rich filters: min/max follower count, ratio, bio keywords (include/exclude), account age.

### growthSuite.js
Combines keyword follow + auto-like + smart unfollow + engagement tracking into a single long-running session with unified rate limiting.

### algorithmTrainer.js
Autonomous 24/7 algorithm training engine. Configurable niches with search terms and comment templates. Cycles through 8 phases: search top/latest, follow people, home feed engagement, influencer visits, profile visits, explore browsing, idle dwell. Human-like timing, probabilistic engagement, intensity presets (chill/normal/active), per-cycle and daily rate limits.

**Controls:** `stopTrainer()`, `trainerStatus()`, `trainerReset()`

### engagementBooster.js
Systematically likes and replies to tweets from target accounts. Tracks engagement history to avoid duplicates. Builds reciprocal relationships.

## Supporting Scripts

| File | Purpose |
|------|---------|
| `src/automation/quotaSupervisor.js` | Rate limiting with hourly/daily quotas |
| `src/automation/sessionLogger.js` | Action logging, reports, JSON/CSV export |
| `src/automation/multiAccount.js` | Multi-account rotation and tracking |
| `src/automation/customerService.js` | Auto-respond to mentions/DMs |
| `src/automation/protectActiveUsers.js` | Protect engaged followers from unfollow |
| `src/automation/smartUnfollow.js` | Time-based unfollow with whitelist |
| `src/automation/rssMonitor.js` | Monitor RSS feeds for content triggers |

## DOM Selectors

Defined in `src/automation/core.js`:

| Element | Selector |
|---------|----------|
| Like button | `[data-testid="like"]` |
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| User cell | `[data-testid="UserCell"]` |
| Follow button | `[data-testid$="-follow"]` |

## Rate Limits & Safety

- Auto-liker: 1-3s between likes, max 100/hour
- Keyword follow: 2-5s between follows, max 50/day recommended
- Auto-commenter: 30-60s between comments, max 20/day
- Algorithm trainer: built-in intensity presets with daily caps
- All scripts include rate-limit detection and automatic backoff

## Strategy Guide

### New account growth (0-1000 followers)
1. Set up `src/automation/algorithmTrainer.js` with your niche keywords
2. Run `src/automation/keywordFollow.js` targeting niche keywords daily
3. Use `src/automation/autoLiker.js` to engage with niche content
4. Enable `src/welcomeNewFollowers.js` to greet new followers
5. After 7 days, run `src/automation/smartUnfollow.js` to remove non-reciprocals

### Accelerating an established account
1. Use `src/automation/followEngagers.js` on competitor's viral tweets
2. Run `src/engagementBooster.js` targeting accounts in your space
3. Set up `src/autoPlugReplies.js` on your viral tweets
4. Use `src/automation/followTargetUsers.js` on competitor audiences with ratio filter

## Notes
- Always paste `src/automation/core.js` first for automation scripts
- Browser scripts in `src/` (non-automation) are standalone -- no core.js needed
- All growth scripts include pause/resume/abort controls
- Growth automation works best combined with quality content
