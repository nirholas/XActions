---
title: "Blue Checkmark & Fewer Ads — Tutorial"
description: "Get verified with a blue checkmark, reduce ads, and unlock prioritized replies on X/Twitter using XActions."
keywords: ["twitter blue checkmark", "x verification", "fewer ads twitter", "prioritized replies x", "xactions premium manager"]
canonical: "https://xactions.app/examples/blue-checkmark"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Blue Checkmark & Fewer Ads — Tutorial

> Step-by-step guide to getting verified, reducing ads, and understanding prioritized replies on X/Twitter using XActions.

**Works on:** Browser Console | Node.js (Puppeteer)
**Difficulty:** Beginner
**Time:** 5-10 minutes
**Requirements:** Logged into x.com, X Premium subscription

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- X Premium subscription (any tier for checkmark; Premium+ for no ads)

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to check your verification status and tier features
4. Review which features are available at your tier
5. Navigate to subscription management if you need to upgrade

---

## Configuration

The `src/premiumManager.js` module provides programmatic tier management:

```javascript
import { checkPremiumStatus, getTierFeatures, compareTiers } from './src/premiumManager.js';
```

| Function | Description |
|----------|-------------|
| `checkPremiumStatus(page, username)` | Check verification status and badge type |
| `getTierFeatures(tier)` | Get features for a specific tier |
| `compareTiers(tier1, tier2)` | Side-by-side tier comparison |
| `checkRevenueEligibility(page, username)` | Check revenue sharing eligibility |

---

## Step-by-Step Guide

### Step 1: Check Your Verification Status

```javascript
(() => {
  console.log('💎 BLUE CHECKMARK & ADS - XActions by nichxbt\n');

  // Check for verified badge
  const verifiedIcon = document.querySelector('[data-testid="icon-verified"]');
  const badges = document.querySelectorAll('svg[data-testid]');
  let badgeType = 'none';

  badges.forEach(badge => {
    const testId = badge.getAttribute('data-testid');
    if (testId?.includes('verifiedOrg')) badgeType = 'gold';
    else if (testId?.includes('verified')) badgeType = 'blue';
  });

  if (badgeType === 'blue') {
    console.log('✅ Blue checkmark detected — you have Premium!');
  } else if (badgeType === 'gold') {
    console.log('✅ Gold checkmark detected — Verified Organization!');
  } else {
    console.log('⚠️ No checkmark detected.');
    console.log('💡 Subscribe at: x.com/i/premium_sign_up');
  }

  // Feature comparison by tier
  console.log('\n══════════════════════════════════════════════════');
  console.log('📊 FEATURE COMPARISON: CHECKMARK, ADS & REPLIES');
  console.log('══════════════════════════════════════════════════\n');

  const features = [
    { name: 'Blue Checkmark',     free: '❌', basic: '❌', premium: '✅', premPlus: '✅' },
    { name: 'Ad Reduction',       free: 'None', basic: '50% fewer', premium: '50% fewer', premPlus: 'No ads' },
    { name: 'Reply Boost',        free: 'None', basic: 'Small', premium: 'Medium', premPlus: 'Largest' },
    { name: 'Post Length',        free: '280', basic: '280', premium: '25,000', premPlus: '25,000' },
    { name: 'Edit Posts',         free: '❌', basic: '❌', premium: '✅', premPlus: '✅' },
    { name: 'Grok AI',            free: 'Basic', basic: 'More', premium: 'Higher', premPlus: 'Highest' },
    { name: 'Revenue Sharing',    free: '❌', basic: '❌', premium: '✅', premPlus: '✅' },
    { name: 'X Pro (TweetDeck)',  free: '❌', basic: '❌', premium: '❌', premPlus: '✅' },
    { name: 'Articles',           free: '❌', basic: '❌', premium: '❌', premPlus: '✅' },
  ];

  console.log('Feature              | Free    | Basic   | Premium | Premium+');
  console.log('─'.repeat(65));
  features.forEach(f => {
    const name = f.name.padEnd(20);
    const free = f.free.toString().padEnd(7);
    const basic = f.basic.toString().padEnd(7);
    const prem = f.premium.toString().padEnd(7);
    console.log(`${name} | ${free} | ${basic} | ${prem} | ${f.premPlus}`);
  });

  console.log('\n💡 For the full blue checkmark, you need Premium ($8/mo) or higher.');
  console.log('💡 For zero ads, you need Premium+ ($16/mo).');
})();
```

### Step 2: Check Another User's Verification

Using the Node.js module:

```javascript
import { checkPremiumStatus } from './src/premiumManager.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.setCookie({
  name: 'auth_token',
  value: 'YOUR_AUTH_TOKEN',
  domain: '.x.com',
});

const status = await checkPremiumStatus(page, 'nichxbt');
console.log(status);
// {
//   username: 'nichxbt',
//   isVerified: true,
//   badgeType: 'blue',
//   inferredTier: 'premium_or_higher',
//   note: 'Exact tier detection requires account owner access',
//   scrapedAt: '2026-03-30T...'
// }

await browser.close();
```

### Step 3: Compare Tiers Programmatically

```javascript
import { compareTiers, getTierFeatures } from './src/premiumManager.js';

// Get features for a specific tier
const premiumFeatures = getTierFeatures('premium');
console.log(premiumFeatures);
// {
//   tier: 'Premium',
//   price: '$8/mo',
//   features: {
//     postLength: 25000,
//     videoLength: '60min',
//     adReduction: '50% fewer',
//     verification: true,
//     editPost: true,
//     replyBoost: 'Medium',
//     ...
//   }
// }

// Compare two tiers side by side
const comparison = compareTiers('premium', 'premium+');
console.log(comparison);
```

### Step 4: Navigate to Subscription Management

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🚀 Opening subscription management...');

  // Check if already subscribed
  const verifiedIcon = document.querySelector('[data-testid="icon-verified"]');

  if (verifiedIcon) {
    // Already subscribed — go to manage
    window.location.href = 'https://x.com/settings/manage_subscription';
    console.log('✅ Navigated to subscription management.');
    console.log('💡 Here you can upgrade, downgrade, or cancel your subscription.');
  } else {
    // Not subscribed — go to signup
    window.location.href = 'https://x.com/i/premium_sign_up';
    console.log('✅ Navigated to Premium signup.');
  }
})();
```

### Expected Console Output

```
💎 BLUE CHECKMARK & ADS - XActions by nichxbt

✅ Blue checkmark detected — you have Premium!

══════════════════════════════════════════════════
📊 FEATURE COMPARISON: CHECKMARK, ADS & REPLIES
══════════════════════════════════════════════════

Feature              | Free    | Basic   | Premium | Premium+
─────────────────────────────────────────────────────────────────
Blue Checkmark       | ❌      | ❌      | ✅      | ✅
Ad Reduction         | None    | 50% fewer | 50% fewer | No ads
Reply Boost          | None    | Small   | Medium  | Largest
Post Length          | 280     | 280     | 25,000  | 25,000
Edit Posts           | ❌      | ❌      | ✅      | ✅
Grok AI              | Basic   | More    | Higher  | Highest
Revenue Sharing      | ❌      | ❌      | ✅      | ✅
X Pro (TweetDeck)    | ❌      | ❌      | ❌      | ✅
Articles             | ❌      | ❌      | ❌      | ✅

💡 For the full blue checkmark, you need Premium ($8/mo) or higher.
💡 For zero ads, you need Premium+ ($16/mo).
```

---

## Tips & Tricks

1. **Badge types** -- Blue checkmarks indicate individual Premium subscribers. Gold checkmarks are for Verified Organizations ($200/mo+). Gray checkmarks are for government/multilateral accounts.

2. **Prioritized replies** -- With Premium, your replies appear higher in conversation threads. Premium+ gives the largest boost.

3. **Ad reduction is per-tier** -- Basic and Premium get 50% fewer ads. Only Premium+ removes ads entirely.

4. **Verification delay** -- After subscribing, your blue checkmark may take up to 24 hours to appear. Account review is automatic.

5. **Reply boost visibility** -- You can see your reply boost working by posting replies to popular accounts. Your replies should appear closer to the top.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No checkmark after subscribing | Wait up to 24 hours. If it still does not appear, visit `x.com/settings/verification`. |
| Still seeing ads with Premium+ | Clear your browser cache and reload. Some cached ad placements may persist briefly. |
| Badge type shows "none" | You may not be on a page that displays badges. Navigate to your profile page. |
| Cannot detect exact tier | Exact tier detection requires account owner access. The script infers from badge type. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Subscribe to Premium | `browser/subscribePremium.js` | Navigate through subscription flow |
| ID Verification | `browser/idVerification.js` | Complete identity verification |
| Premium Gifting | `browser/premiumGifting.js` | Gift Premium to someone |
| Verified-Only Replies | `browser/verifiedOnly.js` | Restrict replies to verified users |
| View Analytics | `browser/viewAnalytics.js` | Access Premium analytics dashboard |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
