---
title: "Business Ads & Campaigns — Tutorial"
description: "Navigate to the ads dashboard, create campaigns, boost posts, and view campaign analytics on X/Twitter using XActions."
keywords: ["x ads manager", "twitter ad campaigns", "boost post twitter", "x business ads", "xactions ads manager"]
canonical: "https://xactions.app/examples/ads-campaigns"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Business Ads & Campaigns — Tutorial

> Step-by-step guide to navigating the ads dashboard, creating campaigns, boosting posts, and viewing campaign analytics on X/Twitter.

**Works on:** Browser Console
**Difficulty:** Intermediate
**Time:** 10-20 minutes
**Requirements:** Logged into x.com, X ads account (ads.x.com)

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- An X ads account (create one at `ads.x.com` if needed)
- A valid payment method for ad spend

---

## Quick Start

1. Go to your profile page on x.com (for boosting) or `ads.x.com` (for campaigns)
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to view the campaign guide and find boostable posts
4. Navigate to `ads.x.com` for full campaign management
5. Follow the campaign creation guide

---

## Configuration

```javascript
const CONFIG = {
  autoNavigate: true,          // Navigate to ads dashboard
  scanCampaigns: true,         // Scan and list existing campaigns
  showBoostablePost: true,     // Find posts eligible for boosting
  maxCampaignsToScan: 50,      // Max campaigns to scan
  showCampaignGuide: true,     // Display campaign creation guide
  delayBetweenActions: 2000,   // ms between UI actions
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoNavigate` | boolean | `true` | Auto-navigate to ads dashboard |
| `scanCampaigns` | boolean | `true` | List existing campaigns |
| `showBoostablePost` | boolean | `true` | Find posts to boost |
| `maxCampaignsToScan` | number | `50` | Max campaigns to collect |
| `showCampaignGuide` | boolean | `true` | Show creation guide |

---

## Step-by-Step Guide

### Step 1: View Campaign Objectives and Guide

```javascript
(() => {
  console.log('📢 ADS MANAGER - XActions by nichxbt\n');

  console.log('══════════════════════════════════════════════════');
  console.log('📚 CAMPAIGN CREATION GUIDE');
  console.log('══════════════════════════════════════════════════\n');

  const objectives = {
    '📢 Reach': 'Get your post seen by more people',
    '💬 Engagements': 'Drive likes, replies, and reposts',
    '👥 Followers': 'Grow your audience',
    '🔗 Website Traffic': 'Drive clicks to your website',
    '🎯 Conversions': 'Drive actions on your website',
    '📱 App Installs': 'Drive app downloads',
    '🎥 Video Views': 'Get more video views',
    '🌍 Awareness': 'Build brand awareness',
  };

  console.log('Campaign Objectives:');
  for (const [name, desc] of Object.entries(objectives)) {
    console.log(`   ${name} — ${desc}`);
  }

  console.log('\n📝 Steps to create a campaign:');
  console.log('   1. Go to ads.x.com and click "Create campaign"');
  console.log('   2. Choose your objective (reach, engagement, etc.)');
  console.log('   3. Set your budget (daily or total)');
  console.log('   4. Define your audience (location, interests, demographics)');
  console.log('   5. Select posts to promote or create new ad content');
  console.log('   6. Review and launch');

  console.log('\n💡 Quick Boost (from your timeline):');
  console.log('   • Click the bar chart icon on any of your posts');
  console.log('   • Select "Boost this post"');
  console.log('   • Set budget and audience');
  console.log('   • Confirm payment');

  console.log('\n💰 Budget recommendations:');
  console.log('   • Start small: $5-10/day to test');
  console.log('   • Scale what works: increase budget on high-performing ads');
  console.log('   • A/B test: run 2-3 variations simultaneously');
  console.log('══════════════════════════════════════════════════\n');
})();
```

### Step 2: Find Boostable Posts on Your Profile

Navigate to your profile page first, then paste:

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🚀 FIND BOOSTABLE POSTS - XActions by nichxbt\n');

  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  const boostable = [];

  tweets.forEach(tweet => {
    const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent?.trim()?.substring(0, 80) || 'No text';
    const views = tweet.querySelector('[data-testid="app-text-transition-container"]')?.textContent?.trim() || '0';
    const boostBtn = tweet.querySelector('[data-testid="boostButton"]')
      || tweet.querySelector('[data-testid="promoteTweet"]')
      || tweet.querySelector('[aria-label*="Promote"]');
    const timestamp = tweet.querySelector('time')?.getAttribute('datetime') || '';

    boostable.push({
      text,
      views,
      hasBoostButton: !!boostBtn,
      timestamp,
    });
  });

  if (boostable.length > 0) {
    console.log(`📋 Posts available for boosting (${boostable.length}):`);
    console.log('─'.repeat(60));

    boostable.slice(0, 10).forEach((post, i) => {
      const icon = post.hasBoostButton ? '🚀' : '📝';
      console.log(`   ${i + 1}. ${icon} "${post.text.substring(0, 50)}${post.text.length > 50 ? '...' : ''}"`);
      console.log(`      👁️ ${post.views} views ${post.hasBoostButton ? '| ✅ Boost available' : '| ⚠️ No boost button'}`);
    });
  } else {
    console.log('ℹ️ No posts found on current page.');
    console.log('💡 Navigate to your profile to find posts to boost.');
  }
})();
```

### Step 3: Navigate to Ads Dashboard

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🚀 Opening Ads dashboard...');

  const adsLink = document.querySelector('a[href*="ads.x.com"]')
    || document.querySelector('a[href*="business.x.com"]');

  if (adsLink) {
    adsLink.click();
    console.log('✅ Clicked Ads dashboard link.');
  } else {
    window.open('https://ads.x.com', '_blank');
    console.log('✅ Opened ads.x.com in a new tab.');
    console.log('💡 Run campaign scan scripts on ads.x.com.');
  }
})();
```

### Step 4: Scan Existing Campaigns (Run on ads.x.com)

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('📊 SCAN CAMPAIGNS - XActions by nichxbt\n');

  const campaigns = [];
  let previousCount = 0;
  let retries = 0;

  while (retries < 5 && campaigns.length < 50) {
    const rows = document.querySelectorAll(
      '[data-testid*="campaign"], [class*="campaign-row"], table tbody tr'
    );

    rows.forEach(row => {
      const nameEl = row.querySelector('a, [class*="campaign-name"], td:first-child');
      const name = nameEl?.textContent?.trim() || '';

      if (name && !campaigns.find(c => c.name === name)) {
        const statusEl = row.querySelector('[class*="status"], td:nth-child(2)');
        const budgetEl = row.querySelector('[class*="budget"], td:nth-child(3)');
        const spentEl = row.querySelector('[class*="spent"], td:nth-child(4)');
        const impressionsEl = row.querySelector('[class*="impressions"], td:nth-child(5)');

        campaigns.push({
          name: name.substring(0, 60),
          status: statusEl?.textContent?.trim() || 'Unknown',
          budget: budgetEl?.textContent?.trim() || '-',
          spent: spentEl?.textContent?.trim() || '-',
          impressions: impressionsEl?.textContent?.trim() || '-',
        });
      }
    });

    if (campaigns.length === previousCount) retries++;
    else { retries = 0; previousCount = campaigns.length; }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2000);
  }

  if (campaigns.length > 0) {
    console.log(`📋 Campaigns (${campaigns.length}):`);
    console.log('─'.repeat(70));

    campaigns.forEach((c, i) => {
      const icon = c.status.toLowerCase().includes('active') ? '🟢'
        : c.status.toLowerCase().includes('paused') ? '🟡'
        : c.status.toLowerCase().includes('completed') ? '⚪' : '🔵';
      console.log(`   ${i + 1}. ${icon} ${c.name}`);
      console.log(`      Status: ${c.status} | Budget: ${c.budget} | Spent: ${c.spent} | Impressions: ${c.impressions}`);
    });

    sessionStorage.setItem('xactions_ads', JSON.stringify({
      scannedAt: new Date().toISOString(),
      campaigns,
    }));
    console.log('\n💾 Campaign data saved to sessionStorage.');
  } else {
    console.log('ℹ️ No campaigns found.');
  }
})();
```

### Expected Console Output (Boostable Posts)

```
🚀 FIND BOOSTABLE POSTS - XActions by nichxbt

📋 Posts available for boosting (8):
────────────────────────────────────────────────────────────────
   1. 🚀 "Just shipped a new feature that lets you automate yo..."
      👁️ 125K views | ✅ Boost available
   2. 📝 "Thread: How I grew from 0 to 10K followers in 3 mon..."
      👁️ 98K views | ⚠️ No boost button
   3. 🚀 "Hot take: The best marketing is a great product..."
      👁️ 67K views | ✅ Boost available
```

---

## Tips & Tricks

1. **Start with boosts** -- Boosting an existing high-performing post is the easiest way to start with ads. No campaign setup needed.

2. **Budget wisely** -- Start with $5-10/day to test. Scale up only after you see what performs well.

3. **Target your audience** -- The more specific your targeting (location, interests, demographics), the better your ad spend efficiency.

4. **A/B test** -- Run multiple variations of your ad to find what resonates. Change one variable at a time (image, text, CTA).

5. **Separate domain** -- The ads dashboard runs on `ads.x.com`. Campaign management scripts must be run on that domain.

6. **Business center** -- For organizational ad accounts, use `business.x.com` for multi-user access and billing management.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No boost button on posts | Not all posts are eligible for boosting. The post must be public and from your account. |
| Cannot access ads.x.com | You need to create an ads account. Sign up at `ads.x.com` with your X credentials. |
| No campaigns found | If you have not created any campaigns, the list will be empty. Click "Create campaign" in the ads dashboard. |
| Payment declined | Verify your payment method at `ads.x.com/settings/billing`. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| View Analytics | `browser/viewAnalytics.js` | Track post and account performance |
| Creator Revenue | `browser/creatorSubscriptions.js` | Monetization and revenue sharing |
| Subscribe to Premium | `browser/subscribePremium.js` | Get Premium for advanced features |
| Grok AI | `src/grokIntegration.js` | Use AI to analyze ad copy effectiveness |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
