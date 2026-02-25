---
name: competitor-intelligence
description: Analyzes competitor X/Twitter accounts including profile, content strategy, audience, engagement patterns, and network. Combines MCP tools and browser scripts for comprehensive competitive analysis. Use when comparing accounts, researching competitors, or benchmarking social performance.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Competitor Intelligence

MCP-powered workflow plus browser scripts for analyzing competitor X/Twitter accounts.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `x_get_profile` | Bio, follower/following counts, verified status |
| `x_get_tweets` | Recent posts with engagement metrics |
| `x_get_followers` | Follower list with bios |
| `x_get_following` | Following list for network analysis |
| `x_search_tweets` | Find mentions and replies |
| `x_competitor_analysis` | Automated comparison |

## Browser Scripts

| Goal | Script |
|------|--------|
| Side-by-side competitor comparison | `src/competitorAnalysis.js` |
| Compare audience overlap | `src/audienceOverlap.js` |
| Analyze their audience demographics | `src/audienceDemographics.js` |
| Find their viral tweets | `src/viralTweetDetector.js` |
| Benchmark your engagement | `src/tweetPerformance.js` |
| Track their trending topics | `src/trendingTopicMonitor.js` |

## Analysis Workflow

1. **Collect profile** -- `x_get_profile` for target username
2. **Pull tweets** -- `x_get_tweets` with `limit: 50`, note frequency and themes
3. **Calculate engagement** -- Per-tweet rate: `(likes + RTs + replies) / followers`
4. **Categorize content** -- Original vs reply vs retweet vs thread
5. **Audit audience** -- `x_get_followers` with `limit: 100`, scan bios
6. **Map network** -- `x_get_following` for mutual connections and influencer relationships
7. **Find overlap** -- `src/audienceOverlap.js` to compare your followers with theirs

## Output Template

```
## Competitor Report: @{username}

### Profile
- Followers: {n} | Following: {n} | Ratio: {r}
- Verified: {yes/no} | Joined: {date}

### Content Strategy
- Posts/week: {n} | Top topics: {t1}, {t2}, {t3}
- Peak posting: {day} at {hour}
- Avg engagement rate: {rate}%

### Audience
- Common industries: {list}
- Follower size distribution: {breakdown}

### Network
- Notable follows: {list}
- Audience overlap with you: {percentage}%
```

## Tips
- Run competitor analysis quarterly for trends
- Use `src/audienceOverlap.js` to find collaboration opportunities
- Track competitors' viral content for content inspiration
- Mirror successful content formats, not exact content
