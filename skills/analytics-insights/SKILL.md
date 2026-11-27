---
name: analytics-insights
description: Analyze X/Twitter engagement, hashtags, competitors, best posting times, follower demographics, tweet performance, viral detection, content calendar gaps, A/B testing, and engagement leaderboards. Browser console scripts for data-driven X optimization. Use when users want insights about their X performance.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "4.0"
  arguments: account
---

# Analytics & Insights

Browser console scripts for analyzing X/Twitter performance — no API key needed. All analysis runs in DevTools console.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Engagement metrics | `browser/engagementAnalytics.js` | `x.com/USERNAME` |
| Best posting times | `browser/bestTimeToPost.js` | `x.com/USERNAME` |
| Hashtag analysis | `browser/hashtagAnalytics.js` | `x.com/search?q=%23tag` |
| Competitor comparison | `browser/competitorAnalysis.js` | Any page |
| Follower audit (fake/bot) | `browser/auditFollowers.js` | `x.com/USERNAME/followers` |
| Sentiment analysis | `browser/sentimentAnalyzer.js` | Any timeline |
| Tweet performance ranking | `browser/tweetPerformance.js` | `x.com/USERNAME` |
| Viral tweet detection | `browser/viralTweetDetector.js` | `x.com/USERNAME` |
| Posting schedule optimizer | `browser/tweetScheduleOptimizer.js` | `x.com/USERNAME` |
| Follower demographics | `browser/audienceDemographics.js` | `x.com/USERNAME/followers` |
| Follower growth tracking | `browser/followerGrowthTracker.js` | `x.com/USERNAME/followers` |
| Content calendar analysis | `browser/contentCalendar.js` | `x.com/USERNAME` |
| Engagement leaderboard | `browser/engagementLeaderboard.js` | `x.com/USERNAME` |
| Tweet A/B testing | `browser/tweetABTester.js` | `x.com/USERNAME` |
| Follow ratio management | `browser/followRatioManager.js` | `x.com/USERNAME` |
| Audience overlap analysis | `browser/audienceOverlap.js` | `x.com/ACCOUNT/followers` |
| Account health scoring | `browser/accountHealthMonitor.js` | `x.com/USERNAME` |
| Shadowban detection | `browser/shadowbanChecker.js` | `x.com/USERNAME` |

## Quick Start

1. Navigate to the required page on x.com
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Results display in console + auto-export as JSON

## Script Details

### engagementAnalytics.js
Scrapes your timeline and calculates per-tweet engagement rates (likes + RTs + replies / views). Shows average, median, best/worst performers, and engagement trend over time.

### sentimentAnalyzer.js
Lexicon-based sentiment analysis on any timeline. Classifies tweets as positive/negative/neutral. Shows sentiment distribution chart, most positive/negative tweets, and keyword frequency.

### tweetPerformance.js
Side-by-side tweet comparison with multi-metric ranking. Sorts by likes, RTs, replies, views, or composite engagement rate. Identifies content patterns that drive performance.

### viralTweetDetector.js
Multi-factor viral scoring: engagement velocity, like-to-RT ratio, reply depth, view multiplier. Flags tweets significantly exceeding your baseline. Useful for identifying what resonates.

### tweetScheduleOptimizer.js
Analyzes your posting history to build a personalized optimal schedule. Generates heatmaps of engagement by day/hour. Recommends best slots based on YOUR audience's behavior.

### audienceDemographics.js
Scrapes follower profiles and classifies by niche (tech, marketing, crypto, etc.), account size, bot likelihood, and verified status. Visual distribution charts.

### engagementLeaderboard.js
Ranks users who engage most with your content. Identifies superfans (5+ interactions), regulars, and casual engagers. Exports VIP list for relationship building.

**Controls:** Auto-run on paste. `XActions.pause()` / `XActions.abort()` available.

### tweetABTester.js
Create controlled tests between two tweet variations. Post both, track metrics over time, get statistical winner determination with percentage difference.

**Controls:** `XActions.createTest()`, `XActions.measure()`, `XActions.results()`

### followRatioManager.js
Monitors follower/following ratio with letter grades (S→F). Generates 3 improvement paths (unfollow more, gain followers, combination). Tracks ratio history over time.

**Controls:** `XActions.track()`, `XActions.plan()`, `XActions.history()`

### audienceOverlap.js
Compare follower lists between two accounts to find shared followers, unique audiences, and Jaccard similarity. Useful for collaboration decisions and competitor analysis.

**Controls:** `XActions.analyze('accountA', 'accountB')`

## Strategy Guide

### Weekly analytics routine

1. Run `browser/tweetPerformance.js` — identify this week's top content
2. Run `browser/tweetScheduleOptimizer.js` — verify you're posting at optimal times
3. Run `browser/followRatioManager.js` → `XActions.track()` — log weekly ratio
4. Run `browser/engagementLeaderboard.js` — identify top engagers to nurture

### Diagnosing a growth stall

1. `browser/accountHealthMonitor.js` — check overall account health score
2. `browser/shadowbanChecker.js` — rule out shadowban
3. `browser/audienceDemographics.js` — verify you're attracting the right audience
4. `browser/viralTweetDetector.js` — check if you've had any breakout content recently
5. `browser/competitorAnalysis.js` — compare your metrics to peers

### Preparing for a content pivot

1. `browser/sentimentAnalyzer.js` — understand current audience sentiment
2. `browser/tweetPerformance.js` — identify what content types work
3. `browser/audienceOverlap.js` — compare your audience with target niche leaders
4. `browser/contentCalendar.js` — find posting gaps to fill

## Notes

- All scripts auto-export results as downloadable JSON
- Accuracy improves with more data — increase `maxPosts` in CONFIG for deeper analysis
- Engagement rates: (likes + retweets + replies) / views
- Scripts only analyze visible browser data — increase scroll rounds for more data
- localStorage used for historical tracking (growth, A/B tests, ratio history)
