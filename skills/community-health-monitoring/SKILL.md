---
name: community-health-monitoring
description: Audits follower quality, engagement authenticity, unfollower patterns, and network efficiency to produce a community health score. Use when monitoring account health or detecting bot/spam followers.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Community Health Monitoring

MCP-powered workflow for auditing follower quality, engagement health, and network efficiency. Produces a scored health report.

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `x_get_profile` | Account-level stats |
| `x_get_followers` | Follower list for quality audit |
| `x_get_following` | Following list for reciprocity check |
| `x_get_non_followers` | Identify non-reciprocal follows |
| `x_get_tweets` | Engagement data for authenticity check |
| `x_detect_unfollowers` | Track recent unfollower patterns |

## Browser Scripts

Complement MCP analysis with browser-side tools:

| Goal | Script |
|------|--------|
| Audit follower quality | `src/auditFollowers.js` |
| Detect unfollowers | `src/detectUnfollowers.js` |
| Audience demographics | `src/audienceDemographics.js` |
| Follow ratio analysis | `src/followRatioManager.js` |
| Account health dashboard | `src/accountHealthMonitor.js` |
| Shadowban check | `src/shadowbanChecker.js` |

## Workflow

1. **Profile baseline** -- Call `x_get_profile` to get follower count, following count, and calculate follower-to-following ratio.
2. **Audit follower quality** -- Call `x_get_followers` with `limit: 200`. Classify each follower:
   - **Active**: Has bio, 50+ followers, posted in last 30 days
   - **Low quality**: No bio, <10 followers, or no recent activity
   - **Suspect bot**: Default avatar, username with many numbers, 0 tweets, follows 1000+
3. **Check engagement authenticity** -- Call `x_get_tweets` with `limit: 30`. For each tweet, compare engagement volume to follower count. Flag anomalies: likes/follower ratio > 10% (potential engagement pods) or < 0.1% (ghost followers).
4. **Analyze unfollower patterns** -- Call `x_detect_unfollowers`. Note churn rate and whether unfollowers correlate with specific content types or posting gaps.
5. **Assess reciprocity** -- Call `x_get_non_followers`. Calculate reciprocity rate: `mutual_follows / total_following * 100`. Identify high-value accounts not following back.
6. **Calculate health score** -- Weighted composite (0-100):
   - Follower quality: 30% (% active followers)
   - Engagement authenticity: 25% (normal engagement patterns)
   - Churn rate: 20% (low unfollower rate)
   - Reciprocity: 15% (healthy follower/following balance)
   - Growth trend: 10% (net positive follower change)
7. **Generate report** -- Compile into the template below with actionable recommendations.

## Output Template

```
## Community Health Report: @{username}
Date: {date} | Health Score: {score}/100

### Score Breakdown
| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Follower Quality | {n}/100 | 30% | {n} |
| Engagement Authenticity | {n}/100 | 25% | {n} |
| Churn Rate | {n}/100 | 20% | {n} |
| Reciprocity | {n}/100 | 15% | {n} |
| Growth Trend | {n}/100 | 10% | {n} |

### Follower Audit
- Total: {count} | Active: {n}% | Low quality: {n}% | Suspect bots: {n}%

### Engagement Health
- Avg engagement rate: {rate}%
- Anomalous posts: {count} flagged

### Reciprocity
- Following: {count} | Follow back: {n}% | Non-followers: {count}

### Recommendations
1. {actionable recommendation}
2. {actionable recommendation}
3. {actionable recommendation}
```

## Strategy Guide

### Monthly health audit routine
1. Run full MCP workflow above for baseline report
2. Compare against previous month's scores
3. Action items: block flagged bots, unfollow non-reciprocals above threshold
4. Use `src/accountHealthMonitor.js` for quick between-audit checks

### Score interpretation
| Score | Grade | Action |
|-------|-------|--------|
| 80-100 | Excellent | Maintain current strategy |
| 60-79 | Good | Minor adjustments needed |
| 40-59 | Fair | Review engagement strategy, clean follower list |
| 20-39 | Poor | Major cleanup needed, block bots, reassess content |
| 0-19 | Critical | Possible shadowban, mass bot followers, or inactive account |

### Improving a low health score
1. Block suspect bot followers with `src/blockBots.js`
2. Unfollow non-reciprocals with `src/unfollowback.js`
3. Increase posting consistency to reduce churn
4. Engage authentically to improve engagement rate

## Notes
- Health score is a heuristic -- use as directional guidance, not exact measurement
- Bot detection uses profile signals, not ML -- some false positives expected
- Run quarterly for trend tracking, monthly for active management
