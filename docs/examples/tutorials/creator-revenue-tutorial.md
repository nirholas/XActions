---
title: "Creator Revenue Sharing & Subscriptions — Tutorial"
description: "Set up creator subscriptions, configure tiers, manage subscribers, and enroll in ad revenue sharing on X/Twitter using XActions."
keywords: ["x creator subscriptions", "twitter revenue sharing", "creator monetization x", "twitter ads revenue", "xactions creator revenue"]
canonical: "https://xactions.app/examples/creator-revenue"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Creator Revenue Sharing & Subscriptions — Tutorial

> Step-by-step guide to setting up creator subscriptions, configuring tiers, managing subscribers, and enrolling in ad revenue sharing on X/Twitter.

**Works on:** Browser Console | Node.js (Puppeteer)
**Difficulty:** Intermediate
**Time:** 10-20 minutes
**Requirements:** Logged into x.com, X Premium, 500+ followers

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- X Premium subscription (Premium or Premium+)
- At least 500 followers
- Active account for 30+ days
- No recent X Rules violations

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to check eligibility and view tier info
4. Navigate to monetization settings
5. Follow the on-screen prompts to enroll

---

## Configuration

```javascript
const CONFIG = {
  autoNavigate: true,           // Navigate to monetization settings
  checkEligibility: true,       // Check revenue sharing requirements
  showTierInfo: true,           // Display subscription tier details
  scanSubscribers: false,       // Scan subscriber list
  maxSubscribersToScan: 100,    // Max subscribers to scan
  delayBetweenActions: 2000,    // ms between UI actions
};
```

---

## Step-by-Step Guide

### Step 1: Check Eligibility

```javascript
(() => {
  console.log('💰 CREATOR REVENUE - XActions by nichxbt\n');

  // Check Premium status
  const isVerified = !!document.querySelector('[data-testid="icon-verified"]');
  console.log(isVerified
    ? '✅ Verified badge detected — Premium requirement likely met.'
    : '⚠️ No verified badge — you need X Premium for monetization.');

  // Display requirements
  console.log('\n📋 Creator Subscriptions Requirements:');
  console.log('─'.repeat(45));
  [
    'X Premium subscription (Premium or Premium+)',
    'At least 500 followers',
    'Active account for 30+ days',
    'No recent X Rules violations',
    'Completed Stripe onboarding for payouts',
  ].forEach(r => console.log(`   ☐ ${r}`));

  console.log('\n📋 Revenue Sharing (Ads) Requirements:');
  console.log('─'.repeat(45));
  [
    'X Premium subscription',
    'At least 500 followers',
    'At least 5 million organic impressions in the last 3 months',
    'Active account for 3+ months',
    'Completed Stripe onboarding',
    'Content complies with Creator Monetization Standards',
  ].forEach(r => console.log(`   ☐ ${r}`));
})();
```

### Step 2: View Subscription Tier Options

```javascript
(() => {
  console.log('\n══════════════════════════════════════════════════');
  console.log('💰 CREATOR SUBSCRIPTION TIERS');
  console.log('══════════════════════════════════════════════════\n');

  const tiers = {
    'Basic Tier (suggested: $2.99/mo)': [
      'Subscriber badge on profile',
      'Subscriber-only posts',
      'Priority replies',
    ],
    'Standard Tier (suggested: $4.99/mo)': [
      'Everything in Basic',
      'Early access to content',
      'Subscriber-only Spaces',
      'Exclusive media content',
    ],
    'Premium Tier (suggested: $9.99/mo)': [
      'Everything in Standard',
      'Direct message access',
      'Behind-the-scenes content',
      'Special recognition in community',
    ],
  };

  for (const [tier, benefits] of Object.entries(tiers)) {
    console.log(`\n🏷️  ${tier}`);
    console.log('─'.repeat(40));
    benefits.forEach(b => console.log(`   ✓ ${b}`));
  }

  console.log('\n💡 Tips:');
  console.log('   • You set your own price (minimum $2.99/mo)');
  console.log('   • X takes a commission on subscriptions');
  console.log('   • Offer exclusive content to increase retention');
  console.log('   • Promote your subscription link in your bio');
  console.log('══════════════════════════════════════════════════\n');
})();
```

### Step 3: Navigate to Monetization Settings

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🚀 Navigating to monetization settings...');

  const monetizationLink = document.querySelector('a[href="/settings/monetization"]');

  if (monetizationLink) {
    monetizationLink.click();
    console.log('✅ Clicked monetization settings link.');
  } else {
    console.log('⚠️ Monetization link not found. Navigating directly...');
    window.location.href = 'https://x.com/settings/monetization';
  }

  await sleep(4000);

  // Check for available tabs
  const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
  if (primaryColumn) {
    const tabs = primaryColumn.querySelectorAll('[role="tab"], button[role="tab"]');
    if (tabs.length > 0) {
      console.log('\n📋 Available tabs:');
      tabs.forEach((tab, i) => {
        console.log(`   ${i + 1}. ${tab.textContent.trim()}`);
      });
    }

    const links = primaryColumn.querySelectorAll('a[href*="monetization"], a[href*="subscription"]');
    links.forEach(link => {
      console.log(`   🔗 ${link.textContent.trim()}: ${link.href}`);
    });
  }

  console.log('\n💡 Follow the on-screen prompts to set up monetization.');
  console.log('💡 Manage subscriptions: x.com/settings/monetization');
  console.log('💡 View analytics: x.com/i/account_analytics');
})();
```

### Step 4: Scan Subscribers (Node.js)

**Script:** `src/creatorStudio.js`

```javascript
import { getSubscribers, getRevenue, getAccountAnalytics } from './src/creatorStudio.js';
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

// Get subscriber list
const subs = await getSubscribers(page, { limit: 50 });
console.log(`Subscribers: ${subs.count}`);
subs.subscribers.forEach(s => {
  console.log(`  @${s.username} (${s.name}) - since ${s.subscribedSince}`);
});

// Get revenue data
const revenue = await getRevenue(page);
console.log('Revenue:', revenue);

// Get account analytics
const analytics = await getAccountAnalytics(page);
console.log('Analytics:', analytics);

await browser.close();
```

### Step 5: Check Revenue Sharing Eligibility (Node.js)

```javascript
import { checkRevenueEligibility } from './src/premiumManager.js';

// ... browser setup ...

const eligibility = await checkRevenueEligibility(page, 'nichxbt');
console.log(eligibility);
// {
//   username: 'nichxbt',
//   followers: '12.5K',
//   meetsFollowerMin: true,
//   requirements: {
//     minFollowers: '500+',
//     minImpressions: '5M+ in last 3 months',
//     premiumRequired: true,
//     note: 'Must have Premium ($8/mo) or higher',
//   },
//   note: 'Impression data requires account owner access to verify',
// }
```

### Expected Console Output

```
💰 CREATOR REVENUE - XActions by nichxbt

✅ Verified badge detected — Premium requirement likely met.

📋 Creator Subscriptions Requirements:
─────────────────────────────────────────────
   ☐ X Premium subscription (Premium or Premium+)
   ☐ At least 500 followers
   ☐ Active account for 30+ days
   ☐ No recent X Rules violations
   ☐ Completed Stripe onboarding for payouts

📋 Revenue Sharing (Ads) Requirements:
─────────────────────────────────────────────
   ☐ X Premium subscription
   ☐ At least 500 followers
   ☐ At least 5 million organic impressions in the last 3 months
   ☐ Active account for 3+ months
   ☐ Completed Stripe onboarding
   ☐ Content complies with Creator Monetization Standards

══════════════════════════════════════════════════
💰 CREATOR SUBSCRIPTION TIERS
══════════════════════════════════════════════════

🏷️  Basic Tier (suggested: $2.99/mo)
────────────────────────────────────────
   ✓ Subscriber badge on profile
   ✓ Subscriber-only posts
   ✓ Priority replies

🏷️  Standard Tier (suggested: $4.99/mo)
────────────────────────────────────────
   ✓ Everything in Basic
   ✓ Early access to content
   ✓ Subscriber-only Spaces
   ✓ Exclusive media content

🏷️  Premium Tier (suggested: $9.99/mo)
────────────────────────────────────────
   ✓ Everything in Standard
   ✓ Direct message access
   ✓ Behind-the-scenes content
   ✓ Special recognition in community

🚀 Navigating to monetization settings...
✅ Clicked monetization settings link.
```

---

## Tips & Tricks

1. **Stripe onboarding** -- Both creator subscriptions and ad revenue sharing require Stripe for payouts. Complete Stripe onboarding early in the process.

2. **5M impressions threshold** -- The 5 million impressions requirement for ad revenue is calculated over a rolling 3-month period. Focus on consistent posting to maintain eligibility.

3. **Subscriber-only content** -- Create a mix of free and subscriber-only content. Use free posts to showcase value and drive subscription signups.

4. **Promote in bio** -- Add your subscription link to your bio. It is the most visible place for potential subscribers.

5. **Revenue timing** -- Payouts are processed monthly. There may be a delay of 30-60 days from earning to receiving payment.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Monetization settings not visible | Ensure you have X Premium. Navigate directly to `x.com/settings/monetization`. |
| Not eligible for revenue sharing | Check that you have 500+ followers and 5M+ impressions in the last 3 months. |
| Stripe onboarding failing | Ensure your personal information matches your bank account details. |
| No subscribers showing | If you just enabled subscriptions, it takes time for people to subscribe. Promote your subscription link. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| View Analytics | `browser/viewAnalytics.js` | Check impressions and engagement |
| Premium Manager | `src/premiumManager.js` | Check tier features and eligibility |
| Creator Studio | `src/creatorStudio.js` | Combined analytics and revenue dashboard |
| Subscribe to Premium | `browser/subscribePremium.js` | Get Premium for monetization access |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
