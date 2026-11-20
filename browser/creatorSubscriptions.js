// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Creator Subscriptions & Revenue Sharing — by nichxbt
// https://github.com/nirholas/XActions
// Setup creator subscriptions, configure tiers, view subscriber analytics, and enroll in revenue sharing.
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
    autoNavigate: true,              // Navigate to monetization settings
    checkEligibility: true,          // Check if you meet revenue sharing requirements
    showTierInfo: true,              // Display subscription tier details
    scanSubscribers: false,          // Scan subscriber list (if on subscribers page)
    maxSubscribersToScan: 100,       // Max subscribers to scan
    delayBetweenActions: 2000,       // ms between UI actions
    scrollDelay: 2000,               // ms between scroll actions
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_creator_subs';

  const SELECTORS = {
    monetizationSettings: 'a[href="/settings/monetization"]',
    subscriptionSettings: '[data-testid="subscriptionSettings"]',
    revenueTab: '[data-testid="revenueTab"]',
    analyticsTab: '[data-testid="analyticsTab"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    verifiedIcon: '[data-testid="icon-verified"]',
    userCell: '[data-testid="UserCell"]',
  };

  const ELIGIBILITY_REQUIREMENTS = {
    'Creator Subscriptions': [
      'X Premium subscription (Premium or Premium+)',
      'At least 500 followers',
      'Active account for 30+ days',
      'No recent X Rules violations',
      'Completed Stripe onboarding for payouts',
    ],
    'Revenue Sharing (Ads)': [
      'X Premium subscription',
      'At least 500 followers',
      'At least 5 million organic impressions in the last 3 months',
      'Active account for 3+ months',
      'Completed Stripe onboarding',
      'Content complies with Creator Monetization Standards',
    ],
  };

  const SUBSCRIPTION_TIERS = {
    tier1: {
      name: 'Basic Tier',
      suggested: '$2.99/mo',
      benefits: [
        'Subscriber badge on profile',
        'Subscriber-only posts',
        'Priority replies',
      ],
    },
    tier2: {
      name: 'Standard Tier',
      suggested: '$4.99/mo',
      benefits: [
        'Everything in Basic',
        'Early access to content',
        'Subscriber-only Spaces',
        'Exclusive media content',
      ],
    },
    tier3: {
      name: 'Premium Tier',
      suggested: '$9.99/mo',
      benefits: [
        'Everything in Standard',
        'Direct message access',
        'Behind-the-scenes content',
        'Special recognition in community',
      ],
    },
  };

  const checkEligibility = () => {
    console.log('🔍 Checking monetization eligibility...\n');

    const isVerified = !!document.querySelector(SELECTORS.verifiedIcon);
    console.log(isVerified
      ? '✅ Verified badge detected — Premium requirement likely met.'
      : '⚠️ No verified badge — you need X Premium for monetization.');

    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink) {
      const href = profileLink.getAttribute('href');
      console.log(`👤 Profile: https://x.com${href}`);
    }

    console.log('\n📋 Eligibility Requirements:');
    for (const [program, reqs] of Object.entries(ELIGIBILITY_REQUIREMENTS)) {
      console.log(`\n🏷️  ${program}`);
      console.log('─'.repeat(45));
      reqs.forEach(r => console.log(`   ☐ ${r}`));
    }

    return isVerified;
  };

  const showTierInfo = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('💰 CREATOR SUBSCRIPTION TIERS');
    console.log('══════════════════════════════════════════════════\n');

    for (const [key, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
      console.log(`\n🏷️  ${tier.name} (suggested: ${tier.suggested})`);
      console.log('─'.repeat(40));
      tier.benefits.forEach(b => console.log(`   ✓ ${b}`));
    }

    console.log('\n💡 Tips:');
    console.log('   • You set your own price (minimum $2.99/mo)');
    console.log('   • X takes a commission on subscriptions');
    console.log('   • Offer exclusive content to increase subscriber retention');
    console.log('   • Promote your subscription link in your bio');
    console.log('══════════════════════════════════════════════════\n');
  };

  const navigateToMonetization = async () => {
    console.log('🚀 Navigating to monetization settings...');

    const monetizationLink = document.querySelector(SELECTORS.monetizationSettings);

    if (monetizationLink) {
      monetizationLink.click();
      console.log('✅ Clicked monetization settings link.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Monetization link not found. Navigating directly...');
      window.location.href = 'https://x.com/settings/monetization';
      await sleep(CONFIG.delayBetweenActions * 2);
    }

    await sleep(CONFIG.delayBetweenActions);

    const primaryColumn = document.querySelector(SELECTORS.primaryColumn);
    if (primaryColumn) {
      const text = primaryColumn.textContent;

      if (text.includes('Monetization') || text.includes('Revenue') || text.includes('Subscription')) {
        console.log('✅ Monetization settings page loaded.');
      }

      const tabs = primaryColumn.querySelectorAll('[role="tab"], button[role="tab"]');
      if (tabs.length > 0) {
        console.log('\n📋 Available tabs:');
        tabs.forEach((tab, i) => {
          const name = tab.textContent.trim() || tab.getAttribute('aria-label') || `Tab ${i + 1}`;
          console.log(`   ${i + 1}. ${name}`);
        });
      }

      const links = primaryColumn.querySelectorAll('a[href*="monetization"], a[href*="subscription"]');
      links.forEach(link => {
        console.log(`   🔗 ${link.textContent.trim()}: ${link.href}`);
      });
    }
  };

  const viewRevenueSharing = async () => {
    console.log('\n💵 Checking revenue sharing status...');

    const revenueTab = document.querySelector(SELECTORS.revenueTab)
      || [...document.querySelectorAll('[role="tab"], button, a')]
        .find(el => el.textContent.toLowerCase().includes('revenue'));

    if (revenueTab) {
      revenueTab.click();
      await sleep(CONFIG.delayBetweenActions);
      console.log('✅ Opened revenue tab.');

      const statsElements = document.querySelectorAll('[data-testid*="revenue"], [data-testid*="earning"]');
      if (statsElements.length > 0) {
        console.log('\n📊 Revenue Stats:');
        statsElements.forEach(el => {
          console.log(`   ${el.textContent.trim()}`);
        });
      }
    } else {
      console.log('ℹ️ Revenue tab not found. You may need to enroll first.');
      console.log('💡 Visit: https://x.com/settings/monetization');
    }
  };

  const scanSubscribers = async () => {
    console.log('\n👥 Scanning subscriber list...');

    const subscribers = [];
    let previousCount = 0;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries && subscribers.length < CONFIG.maxSubscribersToScan) {
      const userCells = document.querySelectorAll(SELECTORS.userCell);

      userCells.forEach(cell => {
        const usernameEl = cell.querySelector('a[href^="/"]');
        const displayNameEl = cell.querySelector('[dir="ltr"] span');

        if (usernameEl) {
          const href = usernameEl.getAttribute('href');
          const username = href.replace('/', '').split('/')[0];
          const displayName = displayNameEl?.textContent?.trim() || username;

          if (username && !username.includes('/') && !subscribers.find(s => s.username === username)) {
            subscribers.push({ username, displayName });
          }
        }
      });

      if (subscribers.length === previousCount) {
        retries++;
      } else {
        retries = 0;
        previousCount = subscribers.length;
      }

      console.log(`   🔄 Found ${subscribers.length} subscribers...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (subscribers.length > 0) {
      console.log(`\n📋 Subscribers (${subscribers.length} found):`);
      subscribers.slice(0, 20).forEach((sub, i) => {
        console.log(`   ${i + 1}. @${sub.username} (${sub.displayName})`);
      });

      if (subscribers.length > 20) {
        console.log(`   ... and ${subscribers.length - 20} more`);
      }

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          scannedAt: new Date().toISOString(),
          subscriberCount: subscribers.length,
          subscribers,
        }));
        console.log('💾 Subscriber list saved to sessionStorage.');
      } catch (e) {
        // Silent fail
      }
    } else {
      console.log('ℹ️ No subscribers found on this page.');
    }

    return subscribers;
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('💰 XActions — Creator Subscriptions & Revenue');
    console.log('═══════════════════════════════════════════\n');

    if (CONFIG.checkEligibility) {
      checkEligibility();
      await sleep(1000);
    }

    if (CONFIG.showTierInfo) {
      showTierInfo();
      await sleep(1000);
    }

    if (CONFIG.autoNavigate) {
      await navigateToMonetization();
      await sleep(1000);
    }

    await viewRevenueSharing();

    if (CONFIG.scanSubscribers) {
      await scanSubscribers();
    }

    console.log('\n✅ Creator Subscriptions script complete.');
    console.log('💡 Manage subscriptions: https://x.com/settings/monetization');
    console.log('💡 View analytics: https://x.com/i/account_analytics');
  };

  run();
})();
