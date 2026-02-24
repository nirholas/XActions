```skill
---
name: creator-monetization
description: X/Twitter Creator Studio and monetization tools including Media Studio, subscriptions, tips, affiliates, email sharing, partnerships, analytics, and the 2026 X Money in-app transaction system.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Creator Studio & Monetization with XActions

Manage creator tools and monetization features on X/Twitter.

## Features

- **Media Studio**: Upload, manage, and schedule media content
- **Subscriptions**: Charge followers monthly ($1+)
- **Tips**: Accept payments and crypto tips
- **Affiliates**: Earn commissions on product recommendations
- **Email Sharing**: Access subscriber email lists (Premium+)
- **Partnerships**: Sponsored content disclosure tools
- **Analytics**: Detailed creator dashboards (Premium)
- **X Money**: In-app transactions system (2026, full rollout)
- **Revenue Sharing**: Earn from ad revenue on posts (Premium)

## Browser Console Script

**File:** `scripts/scrapeAnalytics.js`

### How to use

1. Navigate to `studio.x.com` or `analytics.x.com`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Analytics nav | `a[href="/i/account_analytics"]` |
| Impressions | `[data-testid="impressions"]` |
| Engagements | `[data-testid="engagements"]` |
| Followers chart | `[data-testid="followersChart"]` |
| Revenue tab | `[data-testid="revenueTab"]` |
| Monetization | `a[href="/settings/monetization"]` |

## MCP Tools

- `x_get_analytics` – Get post/account analytics
- `x_get_revenue` – Get revenue/earnings data
- `x_manage_subscription` – Manage subscriber pricing
- `x_get_subscribers` – List subscribers
- `x_setup_tips` – Configure tip settings
- `x_creator_dashboard` – Full creator dashboard data

## API Endpoints

- `GET /api/creator/analytics` – Account analytics
- `GET /api/creator/revenue` – Revenue data
- `GET /api/creator/subscribers` – Subscriber list
- `PUT /api/creator/subscription` – Update subscription pricing
- `POST /api/creator/tips/setup` – Configure tips
- `GET /api/creator/dashboard` – Creator dashboard

## Related Files

- `src/creatorStudio.js` – Core creator/monetization module
- `src/engagementAnalytics.js` – Engagement analytics
- `scripts/scrapeAnalytics.js` – Browser analytics scraper

## Notes

- Revenue sharing requires Premium + 500 followers + 5M impressions/3mo
- Subscriptions available to verified creators
- Tips support multiple payment methods including crypto
- X Money launching full rollout in 2026
- Affiliate commissions vary by partner program
- Email sharing of subscriber lists requires Premium+
```
