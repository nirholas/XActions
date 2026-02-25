---
name: premium-subscriptions
description: Manages X/Twitter Premium subscription features including plan detection, feature access verification, and subscription-dependent script guidance. Use when checking Premium status, understanding which features require Premium, or managing subscription-gated functionality.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Premium & Subscriptions

Browser console script for checking and managing X/Twitter Premium subscription information.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Check Premium status | `src/premiumManager.js` | `x.com/settings/account` |
| Manage articles (Premium+) | `src/articlePublisher.js` | `x.com/compose/article` |
| Schedule posts (Premium) | `src/schedulePosts.js` | `x.com` |
| Creator monetization | `src/creatorStudio.js` | `x.com/i/monetization` |

## Premium Manager

**File:** `src/premiumManager.js`

Checks current Premium tier, feature access, and subscription status.

### How to Use
1. Navigate to `x.com/settings/account` or `x.com/i/premium_sign_up`
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter

## Premium Tiers

| Tier | Price | Key Features |
|------|-------|-------------|
| Basic | $3/mo | Edit posts, longer posts (25K chars), bookmark folders |
| Premium | $8/mo | Blue checkmark, scheduling, analytics, Grok, reduced ads |
| Premium+ | $16/mo | Articles, no ads, creator monetization, highest reply boost |

## XActions Feature Gating

Several scripts depend on Premium:

| Feature | Required Tier | Script |
|---------|---------------|--------|
| Scheduling | Premium+ | `src/schedulePosts.js` |
| Articles | Premium+ | `src/articlePublisher.js` |
| Advanced analytics | Premium | `src/creatorStudio.js` |
| Edit posts | Basic+ | N/A (manual edit) |
| Longer posts (25K) | Basic+ | `src/postComposer.js` |
| Grok AI | Premium+ | `src/grokIntegration.js` |
| Ad revenue sharing | Premium (500+ followers + 5M impressions) | `src/creatorStudio.js` |
| Subscriptions | Premium (500+ followers) | `src/creatorStudio.js` |

Scripts that work on ALL tiers (including free):
- All scraping scripts
- All unfollow/follow scripts
- All analytics scripts (browser-based)
- Engagement automation
- Blocking/muting management
- All monitoring scripts

## DOM Selectors

| Element | Selector |
|---------|----------|
| Subscription info | `[data-testid="subscriptionInfo"]` |
| Verification badge | `[data-testid="icon-verified"]` |
| Premium nav | `a[href="/i/premium_sign_up"]` |

## Notes
- Premium features gate some XActions capabilities but most scripts work on free tier
- The script reads subscription info -- it does not modify subscriptions
- Badge verification can be checked on any profile page
- Premium status affects reply ranking in threads
