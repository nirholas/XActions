---
name: creator-monetization
description: Manages X/Twitter creator monetization tools including revenue dashboards, subscription management, and creator analytics. Use when users want to check creator earnings, manage subscriptions, or access monetization features.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Creator Monetization

Browser console script for accessing X/Twitter creator monetization features.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Creator Studio | `src/creatorStudio.js` | Revenue dashboard, subscriptions, creator analytics |

## Creator Studio

**File:** `src/creatorStudio.js`

Interacts with X's creator monetization dashboard for revenue tracking and subscription management.

### How to use

1. Navigate to `x.com/i/monetization`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Revenue tab | `[data-testid="revenueTab"]` |
| Analytics tab | `[data-testid="analyticsTab"]` |
| Followers chart | `[data-testid="followersChart"]` |
| Subscription info | `[data-testid="subscriptionInfo"]` |

## Notes

- Requires X Premium or creator monetization eligibility
- Revenue data may have a 24-48 hour delay
- Subscription management requires verified account with 500+ followers
