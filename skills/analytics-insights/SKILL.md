---
name: analytics-insights
description: Analyze X/Twitter engagement, hashtags, competitors, and find the best times to post. Browser console scripts for engagement analytics, hashtag analytics, competitor analysis, best time to post analysis, and follower auditing. Use when users want data-driven insights about their X performance.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Analytics & Insights with XActions

Browser console scripts for analyzing X/Twitter performance—no API key needed. All analysis runs directly in your browser.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Engagement Analytics | `src/engagementAnalytics.js` | Analyze likes, retweets, replies across your posts |
| Best Time to Post | `src/bestTimeToPost.js` | Find optimal posting times based on engagement data |
| Hashtag Analytics | `src/hashtagAnalytics.js` | Analyze performance and trends for specific hashtags |
| Competitor Analysis | `src/competitorAnalysis.js` | Compare engagement metrics across multiple accounts |
| Audit Followers | `src/auditFollowers.js` | Find fake, bot, and suspicious followers |

## Quick start

1. Navigate to the required page on x.com (see table below)
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Results auto-export as downloadable JSON

| Script | Navigate to |
|--------|-------------|
| Engagement Analytics | `x.com/YOUR_USERNAME` |
| Best Time to Post | `x.com/YOUR_USERNAME` |
| Hashtag Analytics | `x.com/search?q=%23yourhashtag` |
| Competitor Analysis | Any page (navigates automatically) |
| Audit Followers | `x.com/YOUR_USERNAME/followers` |

## Script details

**Per-script configs, output formats, and usage guides**: See [references/script-configs.md](references/script-configs.md)

## Notes

- All analytics scripts auto-export results as downloadable JSON
- Analysis accuracy improves with more posts analyzed (increase `maxPosts` in CONFIG)
- Engagement rates are calculated as (likes + retweets + replies) / views
- Scripts only analyze what's visible in the browser — increase scroll attempts for more data
