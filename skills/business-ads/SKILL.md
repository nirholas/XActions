---
name: business-ads
description: Manages X/Twitter business tools including ads dashboard, campaign management, and professional account features. Use when users want to access X business tools, create ad campaigns, or manage professional features.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Business & Ads Tools

Browser console script for accessing X/Twitter business and advertising features.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Business Tools | `src/businessTools.js` | Access business dashboard, campaigns, and analytics |

## Business Tools

**File:** `src/businessTools.js`

Interacts with X's business and advertising interfaces.

### How to use

1. Navigate to `ads.x.com` or `x.com/i/monetization`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Ads dashboard | `[data-testid="adsDashboard"]` |
| Campaign list | `[data-testid="campaignList"]` |
| Create campaign | `[data-testid="createCampaign"]` |
| Boost button | `[data-testid="boostButton"]` |

## Notes

- Requires X business or professional account
- Ad campaigns require payment method on file
- Boost is the simplest promotion option (promote existing tweets)
