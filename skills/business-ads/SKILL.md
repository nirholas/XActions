---
name: business-ads
description: X/Twitter Business and advertising tools including X Pro, Ads Manager, campaign management, handle marketplace, social listening, boosts, and analytics for business accounts.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Business & Ads with XActions

Manage X/Twitter business features, advertising, and brand tools.

## Features

- **X Pro**: Multi-timeline dashboards, team management, real-time analytics (Premium Business)
- **Ads Manager**: AI-targeted ad campaigns
- **Campaign Management**: Create, manage, optimize ad campaigns
- **Boosts**: Amplify individual posts for wider reach
- **Handle Marketplace**: Buy/sell usernames
- **Social Listening**: Monitor brand mentions and sentiment
- **Audience Insights**: Demographics and behavior data
- **Conversion Tracking**: Measure ad ROI
- **Business Verification**: Organization verification badges
- **Relevance for Business**: Real-time engagement focus (2026)

## Browser Console Script

**File:** `scripts/businessAnalytics.js`

### How to use

1. Navigate to `business.x.com` or `ads.x.com`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Ads dashboard | `[data-testid="adsDashboard"]` |
| Campaign list | `[data-testid="campaignList"]` |
| Create campaign | `[data-testid="createCampaign"]` |
| Analytics tab | `[data-testid="analyticsTab"]` |
| Boost button | `[data-testid="boostButton"]` |

## MCP Tools

- `x_create_campaign` – Create an ad campaign
- `x_get_campaigns` – List ad campaigns
- `x_boost_post` – Boost a post
- `x_brand_mentions` – Monitor brand mentions
- `x_audience_insights` – Get audience data
- `x_business_analytics` – Business dashboard data

## API Endpoints

- `POST /api/business/campaigns` – Create campaign
- `GET /api/business/campaigns` – List campaigns
- `POST /api/business/boost` – Boost a post
- `GET /api/business/mentions` – Brand mentions
- `GET /api/business/audience` – Audience insights
- `GET /api/business/analytics` – Business analytics

## Related Files

- `src/businessTools.js` – Core business module
- `src/competitorAnalysis.js` – Competitor analysis
- `scripts/businessAnalytics.js` – Browser business script

## Notes

- X Pro requires Premium Business subscription
- Ads Manager is at ads.x.com
- Minimum ad budget varies by market
- Handle marketplace for buying/selling usernames
- Social listening helps track brand sentiment
- Focus on real-time engagement for business relevance (2026)
