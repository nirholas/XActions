---
name: growth-automation
description: Automates X/Twitter growth via browser console scripts. Auto-likes tweets by keyword/user filters, auto-comments on target users' posts, follows users by keyword search or by engagement on specific posts, follows audiences of target accounts with rich filtering, and runs a combined growth suite. Use when automating Twitter growth, engagement, following, or audience building.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Growth Automation

Browser console scripts for X/Twitter. **Always paste `src/automation/core.js` first** — it provides shared config, selectors, utilities, and rate limiting.

## Script selection

| Goal | File |
|------|------|
| Auto-like timeline tweets matching filters | `src/automation/autoLiker.js` |
| Auto-comment on a target user's new posts | `src/automation/autoCommenter.js` |
| Search keywords → follow matching users | `src/automation/keywordFollow.js` |
| Follow users who engaged with specific posts | `src/automation/followEngagers.js` |
| Follow followers/following of target accounts | `src/automation/followTargetUsers.js` |
| All-in-one: keyword follow + auto-like + smart unfollow | `src/automation/growthSuite.js` |
| Train algorithm for niche(s) — 24/7 autonomous browsing | `src/automation/algorithmTrainer.js` |

## Key script details

**autoLiker.js** — Scrolls timeline, checks tweets against configurable filters (keywords, users, skip replies/ads, min likes threshold, max per session), clicks `[data-testid="like"]`.

**autoCommenter.js** — Monitors a target user's profile for new posts, replies with randomly rotated comment templates. Configurable check interval and max comments per session.

**keywordFollow.js** — Searches X by keywords, follows users from results. Records follow timestamps (used by `smartUnfollow.js` for grace-period logic). Configurable daily limits, de-duplicates.

**followEngagers.js** — Takes post URL(s), scans likers/retweeters/quote-tweeters, follows them. Configure engagement types and follow limit per post.

**followTargetUsers.js** — Takes target account(s), follows their followers or following list. Rich filters: min/max follower count, follower-to-following ratio, bio keywords (include/exclude), account age.

**growthSuite.js** — Combines keyword follow + auto-like + smart unfollow + engagement tracking into a single long-running session.

**algorithmTrainer.js** — Autonomous 24/7 algorithm training engine. Configurable niches with search terms and comment templates. Cycles through 8 phases: search top results, search latest, search people & follow, home feed engagement, influencer profile visits, own profile visits, explore page browsing, and idle dwell periods. Human-like timing with randomized delays, probabilistic engagement (like/comment/bookmark/retweet/follow), intensity presets (chill/normal/active), per-cycle and daily rate limits, persistent state across sessions. Controls: `stopTrainer()`, `trainerStatus()`, `trainerReset()`.

## Supporting scripts

See [references/supporting-scripts.md](references/supporting-scripts.md) for details on:
- **quotaSupervisor.js** — Rate limiting with hourly/daily quotas (recommended to load first)
- **sessionLogger.js** — Action logging, reports, JSON/CSV export
- **multiAccount.js** — Multi-account rotation and status tracking
- **customerService.js** — Auto-respond to mentions/DMs with templates
- **protectActiveUsers.js** — Protects engaged followers from smart unfollow

## DOM selectors (automation suite)

Defined in `src/automation/core.js`. Key selectors:

| Element | Selector |
|---------|----------|
| Like button | `[data-testid="like"]` |
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| User cell | `[data-testid="UserCell"]` |
| Follow indicator | `[data-testid="userFollowIndicator"]` |
