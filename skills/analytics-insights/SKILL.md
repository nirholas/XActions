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

## Engagement Analytics

**File:** `src/engagementAnalytics.js`

Scrolls your profile and analyzes engagement metrics across your recent posts.

### What it reports

- Total likes, retweets, replies, views
- Average engagement rate
- Top 5 posts by likes
- Top 5 posts by total engagement
- Best posting hour and day

### How to use

1. Navigate to `x.com/YOUR_USERNAME`
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Wait for it to scroll and analyze

### Output

Exports a full JSON report with per-post data including engagement rates, best times, and rankings.

## Best Time to Post

**File:** `src/bestTimeToPost.js`

Analyzes your posting history to determine when your audience is most engaged.

### What it reports

- Best days of the week (ranked by average engagement)
- Best hours of the day (ranked by average engagement)
- Best day+hour combinations
- Visual bar charts in console
- Specific recommendation: "Post on [Day] around [Hour]"

### How to use

1. Navigate to `x.com/YOUR_USERNAME`
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Results export as JSON

## Hashtag Analytics

**File:** `src/hashtagAnalytics.js`

Analyze the performance of any hashtag: top posts, top contributors, hourly distribution.

### How to use

1. Search a hashtag: `x.com/search?q=%23yourhashtag`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### What it reports

- Total engagement metrics across all posts
- Unique users posting the hashtag
- Top 5 posts by engagement
- Top 10 contributors
- Peak posting hours

## Competitor Analysis

**File:** `src/competitorAnalysis.js`

Compare engagement metrics between multiple X accounts.

### Configuration

```javascript
const CONFIG = {
  accounts: ['elonmusk', 'nichxbt', 'openai'],
  postsToAnalyze: 20,
};
```

### What it reports

- Follower/following counts and ratios
- Average likes and engagement per post
- Engagement rate percentage
- Rankings sorted by engagement

### Note

This script navigates between profile pages to collect data. Each account takes ~15-30 seconds to analyze.

## Audit Followers

**File:** `src/auditFollowers.js`

Scan your followers list and categorize accounts as legitimate, suspicious, or likely-fake.

### Detection heuristics

- Default/missing avatar → suspicious
- No bio → suspicious
- High digit-to-letter ratio in username → likely bot
- Template-looking display names → suspicious

### Categories

| Category | Score | Meaning |
|----------|-------|---------|
| Legitimate | 0-1 | Normal account |
| Suspicious | 2 | Some red flags |
| Likely Fake | 3+ | Multiple red flags |

### How to use

1. Navigate to `x.com/YOUR_USERNAME/followers`
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Report exports as JSON

## Notes

- All analytics scripts auto-export results as downloadable JSON
- Analysis accuracy improves with more posts analyzed (increase `maxPosts` in CONFIG)
- Engagement rates are calculated as (likes + retweets + replies) / views
- Scripts only analyze what's visible in the browser — increase scroll attempts for more data
