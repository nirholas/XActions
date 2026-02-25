---
name: creator-monetization
description: Accesses X/Twitter creator monetization tools — account analytics, post-level analytics, revenue and earnings data, and subscriber management. Provides a combined creator dashboard view. Use when users want to check earnings, view analytics, manage subscribers, or access monetization settings on X.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Creator Monetization

Browser automation for X/Twitter creator monetization — analytics, revenue tracking, and subscriber management.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Account analytics overview | `src/creatorStudio.js` | `x.com/i/account_analytics` |
| Post-level analytics | `src/creatorStudio.js` | Tweet URL |
| Revenue & earnings | `src/creatorStudio.js` | `x.com/settings/monetization` |
| Subscriber list | `src/creatorStudio.js` | `x.com/settings/monetization/subscribers` |
| Combined dashboard | `src/creatorStudio.js` | `x.com/i/account_analytics` |

## Creator Studio

**File:** `src/creatorStudio.js`

Puppeteer-based module for accessing X's creator analytics and monetization pages.

### Functions

| Function | Purpose |
|----------|---------|
| `getAccountAnalytics(page, { period })` | Scrape account-level analytics metrics |
| `getPostAnalytics(page, postUrl)` | Get likes, reposts, replies, bookmarks, views for a post |
| `getRevenue(page)` | Access monetization settings and revenue data |
| `getSubscribers(page, { limit })` | List subscribers with names and subscription dates |
| `getCreatorDashboard(page)` | Combined analytics + revenue snapshot |

### Account Analytics

Navigates to `x.com/i/account_analytics` and extracts available metrics from stat cards. Supports period configuration (default: 28 days).

### Post Analytics

Visits a specific tweet URL and extracts engagement breakdown: likes, reposts, replies, bookmarks, and view/impression count.

### Revenue

Navigates to `x.com/settings/monetization` and extracts available text from the monetization page. Revenue data requires Premium subscription and eligibility.

### Subscribers

Lists subscribers from the monetization subscribers page with display name, username, and subscription start date.

## DOM Selectors

| Element | Selector |
|---------|----------|
| Analytics nav | `a[href="/i/account_analytics"]` |
| Monetization nav | `a[href="/settings/monetization"]` |
| Impressions | `[data-testid="impressions"]` |
| Analytics button | `[data-testid="analyticsButton"]` |
| Like count | `[data-testid="like"] span` |
| Repost count | `[data-testid="retweet"] span` |
| Reply count | `[data-testid="reply"] span` |
| User cell | `[data-testid="UserCell"]` |

## Eligibility Requirements

- **Ad Revenue Sharing:** X Premium + 500 followers + 5M impressions in last 3 months
- **Subscriptions:** Verified + 500 followers + active 30+ days
- **Tips:** Any account can enable
- **Minimum payout:** $10

## Rate Limiting

- 2–3s delay between page navigations
- Post analytics requires visiting each tweet individually (~4s per post)
- Dashboard function chains analytics + revenue pages sequentially

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Monetization tab not visible | Requires X Premium and eligibility criteria |
| Revenue shows $0 | Revenue updates are delayed 24–48 hours |
| Subscriber count mismatch | Dashboard may show pending vs. confirmed subscribers |
| Analytics empty | Ensure account has public tweets with impressions |
