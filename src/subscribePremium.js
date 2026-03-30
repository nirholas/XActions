// Subscribe to X Premium — by nichxbt
// https://github.com/nirholas/XActions
// Navigate to Premium subscription page, compare tiers, check status, and guide through signup.
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
    autoNavigate: true,          // Automatically navigate to Premium signup page
    showTierComparison: true,    // Display tier comparison table in console
    checkCurrentStatus: true,    // Check if you already have Premium
    delayBetweenActions: 2000,   // ms between navigation steps
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const SELECTORS = {
    subscriptionInfo: '[data-testid="subscriptionInfo"]',
    premiumSignup: 'a[href="/i/premium_sign_up"]',
    premiumTier: '[data-testid="premiumTier"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    sidebarPremium: 'a[href="/i/premium_sign_up"]',
    navPremium: 'nav a[href="/i/premium_sign_up"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    userAvatar: '[data-testid="UserAvatar-Container-unknown"]',
  };

  const TIERS = {
    Basic: {
      price: '$3/mo',
      features: [
        'Small blue checkmark',
        'Edit posts (5 per post, within 30 min)',
        'Longer posts (up to 10,000 characters)',
        'Longer video uploads (up to 2 hours)',
        'Bookmark folders',
        'Fewer ads in For You and Following',
      ],
    },
    Premium: {
      price: '$8/mo',
      features: [
        'Everything in Basic',
        'Blue checkmark',
        'Prioritized rankings in replies & search',
        'Half the ads',
        'Creator Subscriptions',
        'Grok AI assistant',
        'Media Studio access',
        'Analytics dashboard',
      ],
    },
    'Premium+': {
      price: '$16/mo',
      features: [
        'Everything in Premium',
        'Largest blue checkmark boost',
        'No ads',
        'Largest reply boost',
        'Write Articles',
        'Revenue sharing eligible',
        'X Pro (TweetDeck) access',
        'Highest priority support',
      ],
    },
  };

  const checkCurrentStatus = () => {
    console.log('🔍 Checking current Premium status...');

    const verifiedBadge = document.querySelector(SELECTORS.verifiedBadge);
    const subscriptionInfo = document.querySelector(SELECTORS.subscriptionInfo);

    if (verifiedBadge) {
      console.log('✅ You appear to have a verified badge (Premium active).');
    } else {
      console.log('⚠️ No verified badge detected — you may not have Premium.');
    }

    if (subscriptionInfo) {
      console.log('📋 Subscription info found:', subscriptionInfo.textContent.trim());
    }

    const premiumLinks = document.querySelectorAll(SELECTORS.sidebarPremium);
    if (premiumLinks.length > 0) {
      console.log('💡 Premium signup link found in sidebar — subscription may not be active.');
    }

    return !!verifiedBadge;
  };

  const showTierComparison = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('💎 X PREMIUM TIER COMPARISON');
    console.log('══════════════════════════════════════════════════\n');

    for (const [tier, info] of Object.entries(TIERS)) {
      console.log(`\n🏷️  ${tier} — ${info.price}`);
      console.log('─'.repeat(40));
      info.features.forEach(f => console.log(`   ✓ ${f}`));
    }

    console.log('\n══════════════════════════════════════════════════\n');
    console.log('💡 Tip: Annual billing saves ~12% on all tiers.');
  };

  const navigateToPremium = async () => {
    console.log('🚀 Navigating to Premium signup page...');

    const premiumLink = document.querySelector(SELECTORS.premiumSignup)
      || document.querySelector(SELECTORS.navPremium)
      || document.querySelector(SELECTORS.sidebarPremium);

    if (premiumLink) {
      premiumLink.click();
      console.log('✅ Clicked Premium signup link.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ No Premium link found in sidebar. Navigating directly...');
      window.location.href = 'https://x.com/i/premium_sign_up';
      await sleep(CONFIG.delayBetweenActions * 2);
    }

    await sleep(CONFIG.delayBetweenActions);

    const tierElements = document.querySelectorAll(SELECTORS.premiumTier);
    if (tierElements.length > 0) {
      console.log(`✅ Found ${tierElements.length} tier option(s) on the page.`);
      tierElements.forEach((el, i) => {
        console.log(`   📦 Tier ${i + 1}: ${el.textContent.trim()}`);
      });
    } else {
      console.log('ℹ️ Tier selector elements not found — page may still be loading.');
      console.log('💡 You should now see the Premium signup page. Choose your tier and follow the prompts.');
    }
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('💎 XActions — Subscribe to X Premium');
    console.log('═══════════════════════════════════════════\n');

    if (CONFIG.checkCurrentStatus) {
      const hasPremium = checkCurrentStatus();
      if (hasPremium) {
        console.log('\n🎉 You already have Premium! No action needed.');
        console.log('💡 To manage your subscription, go to: https://x.com/settings/manage_subscription');
      }
      await sleep(1000);
    }

    if (CONFIG.showTierComparison) {
      showTierComparison();
      await sleep(1000);
    }

    if (CONFIG.autoNavigate) {
      await navigateToPremium();
    } else {
      console.log('\n💡 Set CONFIG.autoNavigate = true to auto-navigate, or visit:');
      console.log('   👉 https://x.com/i/premium_sign_up');
    }

    console.log('\n✅ Done! Follow the on-screen prompts to complete your subscription.');
  };

  run();
})();
