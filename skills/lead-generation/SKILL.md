---
name: lead-generation
description: Finds and qualifies B2B leads from X/Twitter conversations using keyword search, profile analysis, and intent scoring. Use when prospecting, finding potential customers, or mining social conversations for leads.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Lead Generation

MCP-powered workflow for finding and qualifying B2B leads from X/Twitter conversations and profiles.

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `x_search_tweets` | Find conversations by keyword/intent |
| `x_get_profile` | Qualify leads with profile data |
| `x_get_tweets` | Assess activity level and interests |
| `x_get_followers` | Check audience size and quality |
| `x_get_following` | Identify competitor usage / peer network |

## Workflow

1. **Define search queries** — Build 3-5 keyword queries combining pain points, competitor names, or buying signals (e.g., "looking for {tool}", "anyone recommend {category}", "switching from {competitor}").
2. **Search conversations** — Call `x_search_tweets` for each query with `limit: 30`. Collect unique usernames from results.
3. **Qualify profiles** — For each unique username, call `x_get_profile`. Filter by: has bio, follower count > 100, account age > 6 months, posts in English (or target language).
4. **Score intent** — Assign 1-5 score based on:
   - 5: Explicit buying intent ("need a tool for...", "budget approved")
   - 4: Comparing solutions ("X vs Y", "switching from")
   - 3: Pain point discussion ("struggling with...", "frustrated by")
   - 2: Topic interest (engages with industry content)
   - 1: Tangential mention
5. **Gather context** — For top-scored leads (4-5), call `x_get_tweets` with `limit: 20` to identify recent interests, tech stack mentions, and engagement patterns.
6. **Check network** — Call `x_get_following` for high-value leads to see if they follow competitors or relevant accounts.
7. **Export lead list** — Format as CSV-ready output using the template below.

## Output Template

```
## Lead List: {search_topic}
Generated: {date} | Total qualified: {count}

| Username | Score | Followers | Bio Summary | Signal | Tweet URL | Notes |
|----------|-------|-----------|-------------|--------|-----------|-------|
| @{user}  | {1-5} | {count}   | {summary}   | {type} | {url}     | {note}|

### High-Priority Leads (Score 4-5)

**@{username}** — Score: {n}/5
- Signal: "{tweet excerpt}"
- Bio: {bio}
- Followers: {count} | Industry: {industry}
- Suggested approach: {personalized outreach note}
```

## Tips

- Run searches at different times to catch varied audiences
- Refresh weekly — buying signals are time-sensitive
- Cross-reference with `x_get_followers` to find warm intros through mutual connections
