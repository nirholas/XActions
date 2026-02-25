---
name: creator-monetization
description: Manages X/Twitter creator monetization features including ad revenue analytics, subscription management, tipping, and creator dashboard insights. Tracks earnings, analyzes monetization performance, and optimizes for revenue. Use when users want to check earnings, manage subscriptions, optimize monetization, or analyze ad revenue on X.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Creator Monetization

Browser console scripts for managing and analyzing X/Twitter creator monetization features.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Creator dashboard analytics | `src/creatorStudio.js` | `x.com/i/monetization` |
| Subscription management | `src/subscriptionManager.js` | `x.com/i/monetization` |
| Content performance for monetization | `src/tweetPerformance.js` | `x.com/USERNAME` |
| Audience demographics | `src/audienceDemographics.js` | `x.com/USERNAME/followers` |

## Creator Studio

**File:** `src/creatorStudio.js`

Scrapes and analyzes creator monetization data from X's dashboard.

### Features
- Ad revenue tracking (daily/weekly/monthly)
- Impression and engagement rate for monetized content
- Subscriber count and revenue
- Tipping analytics
- Monetization eligibility check

### Eligibility Requirements

| Feature | Requirements |
|---------|-------------|
| Ad Revenue Sharing | Premium + 500 followers + 5M organic impressions (90 days) |
| Subscriptions | Premium + 500 followers |
| Tipping | Any account |
| Media Studio | Premium |

## DOM Selectors

| Element | Selector |
|---------|----------|
| Monetization nav | `a[href="/i/monetization"]` |
| Revenue display | `[data-testid="revenueAmount"]` |
| Analytics tabs | `[role="tab"]` |
| Subscription info | `[data-testid="subscriptionInfo"]` |
| Earnings chart | `[data-testid="earningsChart"]` |

## Monetization Strategy

### Maximizing ad revenue
1. `src/tweetPerformance.js` -- identify high-impression content types
2. `src/tweetScheduleOptimizer.js` -- post at peak times for maximum reach
3. `src/contentRepurposer.js` -- multiply high-performing content
4. Focus on original tweets, not replies (replies don't earn ad revenue)
5. Threads generate more impressions than single tweets

### Growing subscriptions
1. `src/audienceDemographics.js` -- understand who your audience is
2. Post subscriber-only previews with `src/postThread.js`
3. Use `src/autoPlugReplies.js` to promote subscription on viral tweets
4. Track subscriber growth with `src/followerGrowthTracker.js`

### Content that earns
| Content Type | Revenue Potential | Why |
|-------------|------------------|-----|
| Threads (5+ tweets) | High | Multiple impressions per reader |
| Hot takes/opinions | High | Engagement-driven reach |
| Tutorials/how-tos | Medium | Bookmarks + shares |
| Reply threads | None | Replies excluded from ad sharing |

## Notes
- Ad revenue is paid monthly with a minimum threshold
- Revenue data may lag 24-48 hours behind real-time
- Only organic impressions count (not promoted/ad views)
- Creator dashboard is only accessible to eligible accounts
