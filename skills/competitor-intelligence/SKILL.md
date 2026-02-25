---
name: competitor-intelligence
description: Analyzes competitor X/Twitter accounts including profile, content strategy, audience, engagement patterns, and network. Use when comparing accounts, researching competitors, or benchmarking social performance.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Competitor Intelligence

MCP-powered workflow for analyzing competitor X/Twitter accounts. Produces a structured report covering profile, content, audience, and network.

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `x_get_profile` | Bio, follower/following counts, verified status |
| `x_get_tweets` | Recent posts with engagement metrics |
| `x_get_followers` | Follower list with bios |
| `x_get_following` | Following list for network analysis |
| `x_search_tweets` | Find mentions and replies |

## Workflow

1. **Collect profile** — Call `x_get_profile` for the target username. Record bio, follower count, following count, verified status, join date.
2. **Pull recent tweets** — Call `x_get_tweets` with `limit: 50`. Note posting frequency, media usage, and content themes.
3. **Calculate engagement metrics** — For each tweet compute engagement rate: `(likes + retweets + replies) / follower_count`. Identify top 5 posts by total engagement.
4. **Analyze content patterns** — Categorize tweets by type (original, reply, retweet, thread). Track posting times and days. Identify recurring topics and hashtags.
5. **Audit audience** — Call `x_get_followers` with `limit: 100`. Scan bios for common keywords, industries, and follower size distribution.
6. **Map network** — Call `x_get_following` with `limit: 100`. Identify mutual connections, industry peers, and influencer relationships.
7. **Compile report** — Assemble findings into the output template below.

## Output Template

```
## Competitor Report: @{username}

### Profile Summary
- Followers: {count} | Following: {count} | Ratio: {ratio}
- Verified: {yes/no} | Joined: {date}
- Bio: {bio}

### Content Strategy
- Posts/week: {count} | Primary type: {original/reply/thread}
- Top topics: {topic1}, {topic2}, {topic3}
- Peak posting: {day} at {hour}
- Media usage: {percentage}% of posts include images/video

### Engagement Metrics
- Avg engagement rate: {rate}%
- Avg likes: {n} | Avg retweets: {n} | Avg replies: {n}
- Top post: {url} ({likes} likes, {retweets} RTs)

### Audience Profile
- Common industries: {list}
- Common bio keywords: {list}
- Follower size distribution: {micro/mid/large breakdown}

### Network
- Notable follows: {list}
- Mutual connections: {list}
- Key communities: {list}
```
