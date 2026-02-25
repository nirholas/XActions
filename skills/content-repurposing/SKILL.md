---
name: content-repurposing
description: Identifies top-performing tweets and generates repurposed content variations including threads, angle variations, and content series. Use when maximizing content ROI or planning a content calendar.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Content Repurposing

MCP-powered workflow for identifying top-performing content and generating repurposed variations for a content calendar.

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `x_get_tweets` | Pull recent posts with engagement data |
| `x_get_profile` | Context on account size for engagement rates |
| `x_search_tweets` | Research trending angles in your niche |

## Workflow

1. **Pull performance data** — Call `x_get_tweets` with `limit: 100` for the target account. Call `x_get_profile` to get follower count for rate calculation.
2. **Rank by engagement** — Calculate engagement rate per tweet: `(likes + retweets + replies) / followers * 100`. Sort descending. Select top 10.
3. **Analyze winning patterns** — For each top tweet, identify:
   - Format: standalone, thread opener, question, list, hot take, story
   - Hook type: curiosity gap, bold claim, number-led, personal story
   - Topic/theme
   - Length (short <100 chars, medium 100-200, long 200+)
4. **Research trending angles** — Call `x_search_tweets` with 2-3 queries related to top-performing topics. Note fresh angles and current discussions.
5. **Generate variations** — For each top 5 tweet, create 3 repurposed versions:
   - **Angle shift**: Same core idea, different perspective or audience
   - **Format change**: Convert standalone → thread, or thread → standalone
   - **Update/expand**: Add new data, examples, or context
6. **Build content calendar** — Organize variations into a 2-week posting schedule, spacing similar topics at least 3 days apart.

## Output Template

```
## Content Repurposing Report: @{username}

### Top Performers
| Rank | Tweet | Eng Rate | Format | Hook Type |
|------|-------|----------|--------|-----------|
| 1    | {text excerpt} | {rate}% | {format} | {hook} |

### Winning Patterns
- Best format: {format} ({avg_rate}% avg)
- Best hook type: {hook} ({avg_rate}% avg)
- Best topic: {topic}
- Optimal length: {range}

### Repurposed Content

**Original:** "{tweet text}" — {eng_rate}%

1. **Angle shift:** {new tweet text}
2. **Format change:** {new tweet text}
3. **Update/expand:** {new tweet text}

### 2-Week Calendar
| Day | Content | Type | Based On |
|-----|---------|------|----------|
| Mon | {text}  | Angle shift | Top tweet #1 |
| Wed | {text}  | Thread | Top tweet #3 |
```
