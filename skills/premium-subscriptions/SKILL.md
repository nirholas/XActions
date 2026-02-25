---
name: premium-subscriptions
description: Manages X/Twitter Premium subscription features including plan details, feature access, and subscription settings. The agent uses this skill when a user wants to check Premium status, manage subscriptions, or understand which features require Premium.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Premium Subscriptions

Browser console script for checking and managing X/Twitter Premium subscription information.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Premium Manager | `src/premiumManager.js` | Check status, manage features, subscription info |

## Premium Manager

**File:** `src/premiumManager.js`

Interacts with X Premium subscription pages to check current tier, feature access, and subscription status.

### How to use

1. Navigate to `x.com/i/premium_sign_up` or `x.com/settings/account`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Subscription info | `[data-testid="subscriptionInfo"]` |
| Verification badge | `[data-testid="icon-verified"]` |
| Premium nav | `a[href="/i/premium_sign_up"]` |

## Premium Tiers

| Tier | Key Features |
|------|-------------|
| Basic | Edit posts, longer posts, bookmark folders |
| Premium | Blue checkmark, scheduling, analytics, Grok |
| Premium+ | Articles, no ads, creator monetization |

## Feature Gating

Several XActions scripts depend on Premium features:

- **Scheduling** — `src/schedulePosts.js` requires Premium or Premium+
- **Articles** — `src/articlePublisher.js` requires Premium+
- **Analytics** — advanced analytics require Premium
- **Edit posts** — requires Basic or higher
- **Longer posts** — 25,000+ characters requires Basic or higher

## Notes

- Premium features gate many XActions capabilities
- Subscription status affects which scripts are fully usable
- The script reads subscription info — it does not modify subscriptions
- Badge verification status can be checked on any profile page
