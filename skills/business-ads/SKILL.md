---
name: business-ads
description: Manages X/Twitter business tools including ads dashboard, campaign management, professional account features, and tweet boosting. Use when users want to access X business tools, create ad campaigns, boost tweets, or manage professional features.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Business & Ads Tools

Browser console scripts for interacting with X/Twitter's business and advertising features.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Business dashboard & campaigns | `src/businessTools.js` | `ads.x.com` or `x.com/i/monetization` |
| Auto-plug replies on viral tweets | `src/autoPlugReplies.js` | `x.com/USERNAME` |
| A/B test tweet performance | `src/tweetABTester.js` | `x.com/USERNAME` |
| Audience demographics for targeting | `src/audienceDemographics.js` | `x.com/USERNAME/followers` |
| Competitor analysis | `src/competitorAnalysis.js` | Any profile page |

## Business Tools

**File:** `src/businessTools.js`

Interacts with X's business and advertising interfaces for campaign management and analytics.

### How to Use

1. Navigate to `ads.x.com` or `x.com/i/monetization`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Features

- View campaign performance metrics
- Access ad creation workflows
- Monitor spend and ROI data
- Boost existing tweets with one click

## Auto-Plug Replies for Promotion

**File:** `src/autoPlugReplies.js`

Automatically replies to your own viral tweets with a promotional message (link, product, thread, etc).

### How It Works

1. Scans your timeline for tweets exceeding a viral threshold (configurable likes)
2. Checks localStorage to avoid double-plugging
3. Posts your custom plug reply under qualifying tweets
4. Supports dry-run mode for preview without posting

### Controls

- `XActions.setPlug(text)` — Set your promotional reply text
- `XActions.setThreshold(n)` — Set minimum likes for "viral" (default: 50)
- `XActions.scan()` — Run one scan cycle
- `XActions.autoScan(ms)` — Auto-scan at interval
- `XActions.stop()` — Stop auto-scanning
- `XActions.history()` — View all plugged tweets

### Best Practices

- Set threshold high enough to only catch genuinely viral tweets (50+ likes)
- Keep plug text short and valuable — no spam
- Limit to 3 plugs per session (`maxPlugsPerSession` config)
- Include a clear CTA: link, thread pointer, or newsletter signup

## Tweet A/B Testing

**File:** `src/tweetABTester.js`

Compare performance of different tweet variations to optimize your content strategy.

### How It Works

1. Create a test with two text variations
2. Post both tweets manually
3. Set their URLs in the tester
4. Measure performance at intervals
5. Get statistical comparison with winner determination

### Controls

- `XActions.createTest(name, textA, textB)` — Create new A/B test
- `XActions.setUrl(name, variant, url)` — Link posted tweet URL
- `XActions.measure(name)` — Collect current metrics
- `XActions.results(name)` — Show comparison table
- `XActions.listTests()` — View all tests
- `XActions.exportTests()` — Download all test data

## DOM Selectors

| Element | Selector | Notes |
|---------|----------|-------|
| Ads dashboard | `[data-testid="adsDashboard"]` | Main ads interface |
| Campaign list | `[data-testid="campaignList"]` | Active campaigns |
| Create campaign | `[data-testid="createCampaign"]` | New campaign button |
| Boost button | `[data-testid="boostButton"]` | Promote a tweet |
| Reply button | `[data-testid="reply"]` | Reply to tweet |
| Tweet text box | `[data-testid="tweetTextarea_0"]` | Reply compose area |
| Tweet button | `[data-testid="tweetButtonInline"]` | Submit reply |

## Strategy Guide

### Low-budget promotion strategy (no ads spend)

1. Use `src/tweetABTester.js` to find your best-performing content style
2. Set up `src/autoPlugReplies.js` to reply to viral tweets with your offer
3. Use `src/trendingTopicMonitor.js` to find trending topics for timely content
4. Analyze audience with `src/audienceDemographics.js` to refine targeting
5. Track results with `src/tweetPerformance.js`

### Optimizing ad campaigns

1. Use `src/tweetABTester.js` to test ad copy before spending
2. Identify top-performing organic content with `src/engagementLeaderboard.js`
3. Boost your highest-engagement tweets using `src/businessTools.js`
4. Monitor campaign performance and adjust targeting

### Content-led growth for businesses

1. Run `src/competitorAnalysis.js` on competitors to see what works
2. Use `src/contentRepurposer.js` to maximize content output
3. Schedule optimized content with `src/tweetScheduleOptimizer.js`
4. Track ROI with `src/tweetPerformance.js`

## Prerequisites

- X business or professional account (for ads features)
- Payment method on file (for paid campaigns)
- No special account needed for A/B testing and auto-plug features

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Ads dashboard not loading | Ensure you have a business/professional account |
| Boost button not visible | Not all tweets are eligible — check tweet age and type |
| A/B test shows no data | Both tweets must be posted and URLs set before measuring |
| Auto-plug posts duplicate replies | Check localStorage — clear with `XActions.history()` and verify |
| Campaign metrics delayed | X analytics typically update within 24-48 hours |

## Related Skills

- **analytics-insights** — Deep performance analytics
- **content-posting** — Creating high-quality content
- **growth-automation** — Organic growth to complement ads
- **creator-monetization** — Revenue tracking
