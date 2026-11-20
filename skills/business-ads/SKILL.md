---
name: business-ads
description: Manages X/Twitter business intelligence including brand monitoring, audience insights, competitor analysis, tweet A/B testing, auto-plug replies for promotion, and content performance optimization. Use when users want brand monitoring, audience analysis, competitor comparison, or promotion optimization on X.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "4.0"
---

# Business & Ads Tools

Browser console scripts and automation for X/Twitter business intelligence and promotion.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Brand monitoring & sentiment | `src/businessTools.js` | Search results page |
| Audience insights | `src/businessTools.js` | `x.com/USERNAME/followers` |
| Competitor comparison | `src/businessTools.js` | Any profile page |
| A/B test tweet performance | `browser/tweetABTester.js` | `x.com/USERNAME` |
| Auto-plug viral tweets | `browser/autoPlugReplies.js` | `x.com/USERNAME` |
| Audience demographics | `browser/audienceDemographics.js` | `x.com/USERNAME/followers` |
| Content performance | `browser/tweetPerformance.js` | `x.com/USERNAME` |

## Business Tools

**File:** `src/businessTools.js`

Puppeteer-based module for business intelligence.

### Functions

| Function | Purpose |
|----------|---------|
| `monitorBrandMentions(page, brand, {limit, since})` | Search mentions with sentiment |
| `getAudienceInsights(page, username, {sampleSize})` | Follower bio analysis |
| `analyzeCompetitors(page, ['user1', 'user2'])` | Side-by-side comparison |

## Tweet A/B Testing

**File:** `browser/tweetABTester.js`

Test tweet variations with statistical comparison.

**Controls:** `XActions.createTest(name, textA, textB)`, `XActions.setUrl(name, variant, url)`, `XActions.measure(name)`, `XActions.results(name)`

## Auto-Plug Replies

**File:** `browser/autoPlugReplies.js`

Automatically reply to your viral tweets with promotional content.

**Controls:** `XActions.setPlug(text)`, `XActions.setThreshold(n)`, `XActions.scan()`, `XActions.autoScan(ms)`

## Strategy Guide

### Low-budget promotion (no ads spend)
1. A/B test content styles with `browser/tweetABTester.js`
2. Set up `browser/autoPlugReplies.js` to promote on viral tweets
3. Find trends with `browser/trendingTopicMonitor.js` for timely content
4. Analyze audience with `browser/audienceDemographics.js` for targeting
5. Track results with `browser/tweetPerformance.js`

### Brand monitoring
1. Use `src/businessTools.js` -> `monitorBrandMentions()` for sentiment
2. Set up `browser/keywordMonitor.js` for real-time brand mention alerts
3. Export data for reporting

## Notes
- Sentiment analysis is keyword-based (not ML) -- quick polarity assessment
- A/B testing requires manually posting both tweet variants
- No X Ads API integration -- this is browser-side intelligence
