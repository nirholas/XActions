---
name: premium-subscriptions
description: Manages X/Twitter Premium subscription features including plan details, feature access, and subscription settings. Use when users want to check Premium status, manage subscriptions, or access Premium-only features.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Premium Subscriptions

Browser console script for managing X/Twitter Premium subscription features.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Premium Manager | `src/premiumManager.js` | Check status, manage features, subscription info |

## Premium Manager

**File:** `src/premiumManager.js`

Interacts with X Premium subscription pages to check status and manage features.

### How to use

1. Navigate to `x.com/i/premium_sign_up` or `x.com/settings/account`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Subscription info | `[data-testid="subscriptionInfo"]` |
| Verification badge | `[data-testid="icon-verified"]` |

## Premium Tiers

| Tier | Key Features |
|------|-------------|
| Basic | Edit posts, longer posts, bookmark folders |
| Premium | Blue checkmark, scheduling, analytics, Grok |
| Premium+ | Articles, no ads, creator monetization |

## Notes

- Premium features gate many XActions capabilities (scheduling, articles, analytics)
- Subscription status affects which scripts are usable
