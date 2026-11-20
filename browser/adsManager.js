// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Business Ads & Campaigns — by nichxbt
// https://github.com/nirholas/XActions
// Navigate to ads dashboard, create campaigns, boost posts, and view campaign analytics.
//
// HOW TO USE:
// 1. Go to https://x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    autoNavigate: true,              // Navigate to ads dashboard automatically
    scanCampaigns: true,             // Scan and list existing campaigns
    showBoostablePost: true,         // Highlight posts eligible for boosting
    maxCampaignsToScan: 50,          // Max campaigns to scan
    showCampaignGuide: true,         // Display campaign creation guide
    delayBetweenActions: 2000,       // ms between UI actions
    scrollDelay: 2000,               // ms between scroll actions
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_ads';

  const SELECTORS = {
    adsDashboard: '[data-testid="adsDashboard"]',
    createCampaign: '[data-testid="createCampaign"]',
    campaignList: '[data-testid="campaignList"]',
    boostButton: '[data-testid="boostButton"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    viewCount: '[data-testid="app-text-transition-container"]',
    promoteTweet: '[data-testid="promoteTweet"]',
  };

  const CAMPAIGN_OBJECTIVES = {
    reach: { name: 'Reach', icon: '📢', description: 'Get your post seen by more people' },
    engagement: { name: 'Engagements', icon: '💬', description: 'Drive likes, replies, and reposts' },
    followers: { name: 'Followers', icon: '👥', description: 'Grow your audience' },
    traffic: { name: 'Website Traffic', icon: '🔗', description: 'Drive clicks to your website' },
    conversions: { name: 'Conversions', icon: '🎯', description: 'Drive actions on your website' },
    appInstalls: { name: 'App Installs', icon: '📱', description: 'Drive app downloads' },
    videoViews: { name: 'Video Views', icon: '🎥', description: 'Get more video views' },
    awareness: { name: 'Awareness', icon: '🌍', description: 'Build brand awareness' },
  };

  const navigateToAds = async () => {
    console.log('🚀 Navigating to Ads dashboard...');

    const adsLink = document.querySelector(SELECTORS.adsDashboard)
      || document.querySelector('a[href*="ads.x.com"]')
      || document.querySelector('a[href*="business.x.com"]');

    if (adsLink) {
      adsLink.click();
      console.log('✅ Clicked Ads dashboard link.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Ads link not found. Opening Ads dashboard...');
      window.open('https://ads.x.com', '_blank');
      await sleep(CONFIG.delayBetweenActions);
    }

    const isAds = window.location.hostname.includes('ads.x.com')
      || window.location.hostname.includes('business.x.com');

    if (isAds) {
      console.log('✅ Ads dashboard loaded.');
    } else {
      console.log('ℹ️ Ads dashboard opens at ads.x.com in a new tab.');
      console.log('💡 Run this script again on ads.x.com to scan campaigns.');
    }
  };

  const scanCampaigns = async () => {
    console.log('\n📊 Scanning existing campaigns...');

    const campaigns = [];
    let previousCount = 0;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries && campaigns.length < CONFIG.maxCampaignsToScan) {
      const campaignRows = document.querySelectorAll(
        `${SELECTORS.campaignList} tr, [data-testid*="campaign"], [class*="campaign-row"], table tbody tr`
      );

      campaignRows.forEach(row => {
        const cells = row.querySelectorAll('td, [role="cell"]');
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

      if (campaigns.length === previousCount) {
        retries++;
      } else {
        retries = 0;
        previousCount = campaigns.length;
      }

      console.log(`   🔄 Found ${campaigns.length} campaigns...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (campaigns.length > 0) {
      console.log(`\n📋 Campaigns (${campaigns.length}):`);
      console.log('─'.repeat(70));

      campaigns.forEach((c, i) => {
        const statusIcon = c.status.toLowerCase().includes('active') ? '🟢'
          : c.status.toLowerCase().includes('paused') ? '🟡'
          : c.status.toLowerCase().includes('completed') ? '⚪'
          : '🔵';

        console.log(`   ${i + 1}. ${statusIcon} ${c.name}`);
        console.log(`      Status: ${c.status} | Budget: ${c.budget} | Spent: ${c.spent} | Impressions: ${c.impressions}`);
      });

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          scannedAt: new Date().toISOString(),
          campaigns,
        }));
        console.log('\n💾 Campaign data saved to sessionStorage.');
      } catch (e) {
        // Silent fail
      }
    } else {
      console.log('ℹ️ No campaigns found. You may not have any campaigns or the page layout differs.');
    }

    return campaigns;
  };

  const findBoostablePosts = async () => {
    console.log('\n🚀 Finding posts eligible for boosting...');

    const tweets = document.querySelectorAll(SELECTORS.tweet);
    const boostable = [];

    tweets.forEach(tweet => {
      const textEl = tweet.querySelector(SELECTORS.tweetText);
      const text = textEl?.textContent?.trim()?.substring(0, 80) || 'No text';

      const viewEl = tweet.querySelector(SELECTORS.viewCount);
      const views = viewEl?.textContent?.trim() || '0';

      const boostBtn = tweet.querySelector(SELECTORS.boostButton)
        || tweet.querySelector(SELECTORS.promoteTweet)
        || tweet.querySelector('[aria-label*="Promote"]');

      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime') || '';

      boostable.push({
        text,
        views,
        hasBoostButton: !!boostBtn,
        timestamp,
      });
    });

    if (boostable.length > 0) {
      console.log(`\n📋 Posts available for boosting (${boostable.length}):`);
      console.log('─'.repeat(60));

      boostable.slice(0, 10).forEach((post, i) => {
        const boostIcon = post.hasBoostButton ? '🚀' : '📝';
        console.log(`   ${i + 1}. ${boostIcon} "${post.text.substring(0, 50)}${post.text.length > 50 ? '...' : ''}"`);
        console.log(`      👁️ ${post.views} views ${post.hasBoostButton ? '| ✅ Boost available' : '| ⚠️ No boost button found'}`);
      });
    } else {
      console.log('ℹ️ No posts found on current page.');
      console.log('💡 Navigate to your profile to find posts to boost.');
    }

    return boostable;
  };

  const showCampaignGuide = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('📚 CAMPAIGN CREATION GUIDE');
    console.log('══════════════════════════════════════════════════\n');

    console.log('Campaign Objectives:');
    for (const [key, obj] of Object.entries(CAMPAIGN_OBJECTIVES)) {
      console.log(`   ${obj.icon} ${obj.name} — ${obj.description}`);
    }

    console.log('\n📝 Steps to create a campaign:');
    console.log('   1. Go to ads.x.com and click "Create campaign"');
    console.log('   2. Choose your objective (reach, engagement, etc.)');
    console.log('   3. Set your budget (daily or total)');
    console.log('   4. Define your audience (location, interests, demographics)');
    console.log('   5. Select posts to promote or create new ad content');
    console.log('   6. Review and launch');
    console.log('');
    console.log('💡 Quick Boost (from your timeline):');
    console.log('   • Click the bar chart icon (📊) on any of your posts');
    console.log('   • Select "Boost this post"');
    console.log('   • Set budget and audience');
    console.log('   • Confirm payment');
    console.log('');
    console.log('💰 Budget recommendations:');
    console.log('   • Start small: $5-10/day to test');
    console.log('   • Scale what works: increase budget on high-performing ads');
    console.log('   • A/B test: run 2-3 variations simultaneously');
    console.log('══════════════════════════════════════════════════\n');
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('📢 XActions — Ads Manager');
    console.log('═══════════════════════════════════════════\n');

    if (CONFIG.showCampaignGuide) {
      showCampaignGuide();
      await sleep(1000);
    }

    const isAds = window.location.hostname.includes('ads.x.com')
      || window.location.hostname.includes('business.x.com');

    if (isAds) {
      console.log('✅ Running on Ads dashboard.\n');

      if (CONFIG.scanCampaigns) {
        await scanCampaigns();
        await sleep(1000);
      }

      const createBtn = document.querySelector(SELECTORS.createCampaign)
        || document.querySelector('button[aria-label*="Create"]')
        || document.querySelector('a[href*="create"]');

      if (createBtn) {
        console.log('✅ "Create campaign" button found on page.');
      }
    } else {
      console.log('ℹ️ You are on x.com — scanning for boostable posts.\n');

      if (CONFIG.showBoostablePost) {
        await findBoostablePosts();
        await sleep(1000);
      }

      if (CONFIG.autoNavigate) {
        console.log('\n🚀 Opening Ads dashboard...');
        await navigateToAds();
      }
    }

    console.log('\n✅ Ads Manager script complete.');
    console.log('💡 Ads dashboard: https://ads.x.com');
    console.log('💡 Business center: https://business.x.com');
  };

  run();
})();
