---
name: content-repurposing
description: Identifies top-performing tweets and generates repurposed content variations including threads, tweet storms, blog outlines, summary tweets, and quote-tweet templates. Maximizes content ROI through systematic repurposing. Use when maximizing content output, planning a content calendar, or converting between content formats.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Content Repurposing

Browser scripts and MCP workflows for identifying top content and generating repurposed variations.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Repurpose tweets (5 formats) | `src/contentRepurposer.js` | `x.com/USERNAME` |
| Compose threads from ideas | `src/threadComposer.js` | `x.com/USERNAME` |
| Content calendar analysis | `src/contentCalendar.js` | `x.com/USERNAME` |
| Find top-performing content | `src/tweetPerformance.js` | `x.com/USERNAME` |
| Optimize posting schedule | `src/tweetScheduleOptimizer.js` | `x.com/USERNAME` |

## Content Repurposer

**File:** `src/contentRepurposer.js`

The main repurposing engine. Scans your timeline, then converts any tweet into 5 content formats.

### Controls

- `XActions.scan()` -- Scrape tweets from current page
- `XActions.list()` -- Show all scraped tweets with indices
- `XActions.toThread(i)` -- Convert tweet to thread outline
- `XActions.toSummary(i)` -- Condense to punchy summary variations
- `XActions.toStorm(i)` -- Break into numbered tweet storm
- `XActions.toBlog(i)` -- Generate blog/article outline with SEO keywords
- `XActions.toQuoteTemplates(i)` -- Create 3 quote-retweet variations
- `XActions.all(i)` -- Run ALL 5 repurposing strategies
- `XActions.export()` -- Download all repurposed content as JSON

### Repurposing Formats

| Format | Best For | Output |
|--------|----------|--------|
| Thread | Deep dives, tutorials | Hook + body parts + CTA |
| Summary | Time-sensitive repost | 3 punchy variations |
| Storm | Long content splitting | Numbered 1/N tweets |
| Blog | SEO content, articles | Title + sections + keywords |
| Quote Templates | Engagement farming | Agreement/personal/contrarian takes |

## MCP Workflow

1. Call `x_get_tweets` with `limit: 100` for the target account
2. Call `x_get_profile` to get follower count for rate calculation
3. Rank by engagement rate: `(likes + RTs + replies) / followers * 100`
4. For top 5, generate variations using the content repurposer patterns

## Repurposing Pipeline

```
High-engagement tweet
  -> toThread()    = 5-10 tweet thread
  -> toSummary()   = 3 punchy rewrites
  -> toStorm()     = numbered tweet storm
  -> toBlog()      = article outline + SEO keywords
  -> toQuoteTemplates() = 3 QT engagement variations
```

## Strategy Guide

### Weekly content repurposing routine
1. Run `src/tweetPerformance.js` to identify top 5 tweets this week
2. Run `src/contentRepurposer.js` -> `XActions.scan()`
3. For each top tweet: `XActions.all(i)` to generate all formats
4. Export with `XActions.export()` for scheduling
5. Space repurposed content 3+ days from original

### Maximizing a viral tweet
1. When a tweet goes viral, immediately run `XActions.toThread(i)` for a follow-up thread
2. Use `XActions.toQuoteTemplates(i)` for engagement in replies
3. Later, use `XActions.toBlog(i)` for a long-form article
4. Use `src/autoPlugReplies.js` to plug your offer on the viral tweet

## Notes
- Content repurposer generates outlines and templates, not final polished content
- Blog outlines include SEO keyword suggestions
- All output exportable as JSON for external tools
- Works best on tweets with 50+ words (more content to repurpose)
