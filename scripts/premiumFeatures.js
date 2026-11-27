// GENERATED FILE: a copy of browser/premiumManager.js, written by scripts/build-script-manifest.mjs. Edit browser/premiumManager.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        premiumManager.js
 * @title       Premium Manager
 * @description Detect your X Premium tier from on-page signals, list its features and what the next tier adds, and export the result.
 * @category    premium
 * @page        x.com/*
 * @writes      false
 * @aliases     scripts/premiumFeatures.js, scripts/premiumManager.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 *
 * Usage:
 *   1. Open x.com (your own profile or a timeline with your posts gives the most signals)
 *   2. Open DevTools Console (F12)
 *   3. (Optional) edit CONFIG in browser/premiumManager.js
 *   4. Paste this script and press Enter
 */

(() => {
  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    exportResults: true,
    showTierComparison: false, // Print a side-by-side table of every tier and the pricing list
    logJson: false,            // Print the result object as JSON in the console
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const TIER_FEATURES = {
    free: {
      tier: 'Free', price: '$0/mo',
      features: { postLength: 280, videoLength: '140s', adReduction: 'None', verification: false, editPost: false, scheduling: false, bookmarkFolders: false, revenueShare: false, grokLevel: 'Basic (~10 queries/day)', replyBoost: 'None', articles: false },
    },
    basic: {
      tier: 'Basic', price: '$3/mo',
      features: { postLength: 280, videoLength: '140s', adReduction: '50% fewer', verification: false, editPost: false, scheduling: false, bookmarkFolders: false, revenueShare: false, grokLevel: 'More queries', replyBoost: 'Small', articles: false },
    },
    premium: {
      tier: 'Premium', price: '$8/mo',
      features: { postLength: 25000, videoLength: '60min', adReduction: '50% fewer', verification: true, editPost: true, scheduling: true, bookmarkFolders: true, revenueShare: true, grokLevel: 'Higher (~100 queries/day)', replyBoost: 'Medium', articles: false },
    },
    'premium+': {
      tier: 'Premium+', price: '$16/mo',
      features: { postLength: 25000, videoLength: '3hr', adReduction: 'No ads', verification: true, editPost: true, scheduling: true, bookmarkFolders: true, revenueShare: true, grokLevel: 'Highest (unlimited)', replyBoost: 'Largest', articles: true },
    },
  };

  const detectTier = () => {
    const signals = {
      hasVerificationBadge: false,
      hasPremiumNav: false,
      hasPremiumBanner: false,
      canEditPosts: false,
      hasBookmarkFolders: false,
      hasLongPostOption: false,
      hasScheduleOption: false,
      hasPremiumBadge: false,
    };

    // Check for verification badge on own profile
    const badge = document.querySelector('[data-testid="icon-verified"]');
    signals.hasVerificationBadge = !!badge;

    // Check for Premium navigation link
    const premiumLink = document.querySelector('a[href="/i/premium_sign_up"]');
    signals.hasPremiumNav = !!premiumLink;

    // Check for premium banner
    const premiumBanner = document.querySelector('[data-testid="premiumBanner"]');
    signals.hasPremiumBanner = !!premiumBanner;

    // Check tweet composer for long-form option
    const composer = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (composer) {
      const charLimit = document.querySelector('[data-testid="characterCount"]');
      signals.hasLongPostOption = !!charLimit;
    }

    // Check for edit button on own tweets
    const editBtn = document.querySelector('[data-testid="editTweet"]');
    signals.canEditPosts = !!editBtn;

    // Check for the post scheduling option and a Premium badge
    signals.hasScheduleOption = !!document.querySelector('[data-testid="scheduleOption"]');
    signals.hasPremiumBadge = !!document.querySelector('[data-testid="premiumBadge"]');

    // Infer tier
    let tier = 'free';
    if (signals.hasVerificationBadge && signals.canEditPosts) {
      tier = 'premium';
    } else if (signals.hasVerificationBadge) {
      tier = 'premium';
    } else if (signals.canEditPosts || signals.hasScheduleOption) {
      // Editing and scheduling posts are Premium features
      tier = 'premium';
    } else if (!signals.hasPremiumNav) {
      // If premium nav is absent, user might be subscribed
      tier = 'basic';
    }

    // If no ads visible, might be premium+
    const ads = document.querySelectorAll('[data-testid="placementTracking"]');
    if (signals.hasVerificationBadge && ads.length === 0) {
      tier = 'premium+';
    }

    return { tier, signals };
  };

  const run = async () => {
    console.log('⭐ PREMIUM MANAGER — XActions by nichxbt\n');
    console.log('🔍 Detecting Premium tier...\n');

    const { tier, signals } = detectTier();
    const tierInfo = TIER_FEATURES[tier] || TIER_FEATURES.free;

    console.log(`🏷️ Detected tier: ${tierInfo.tier} (${tierInfo.price})`);
    console.log(`   ℹ️ Detection is approximate — exact tier requires account settings\n`);

    console.log('📋 DETECTION SIGNALS:');
    Object.entries(signals).forEach(([key, val]) => {
      console.log(`   ${val ? '✅' : '❌'} ${key}`);
    });

    console.log(`\n🎁 FEATURES FOR ${tierInfo.tier.toUpperCase()}:`);
    Object.entries(tierInfo.features).forEach(([key, val]) => {
      const icon = val === true ? '✅' : val === false ? '❌' : '📊';
      console.log(`   ${icon} ${key}: ${val}`);
    });

    // Compare with upgrade
    const tiers = ['free', 'basic', 'premium', 'premium+'];
    const currentIdx = tiers.indexOf(tier);
    if (currentIdx < tiers.length - 1) {
      const nextTier = tiers[currentIdx + 1];
      const nextInfo = TIER_FEATURES[nextTier];
      console.log(`\n💡 UPGRADE TO ${nextInfo.tier.toUpperCase()} (${nextInfo.price}):`);
      Object.entries(nextInfo.features).forEach(([key, val]) => {
        const currentVal = tierInfo.features[key];
        if (val !== currentVal) {
          console.log(`   🆕 ${key}: ${currentVal ?? 'N/A'} → ${val}`);
        }
      });
    }

    if (CONFIG.showTierComparison) {
      console.log('\n📋 Tier comparison:');
      console.log('┌────────────────┬──────┬───────┬─────────┬──────────┐');
      console.log('│ Feature        │ Free │ Basic │ Premium │ Premium+ │');
      console.log('├────────────────┼──────┼───────┼─────────┼──────────┤');
      console.log('│ Post length    │  280 │   280 │  25,000 │   25,000 │');
      console.log('│ Video          │ 140s │  140s │   60min │      3hr │');
      console.log('│ Verification   │   ❌ │    ❌ │      ✅ │       ✅ │');
      console.log('│ Edit posts     │   ❌ │    ❌ │      ✅ │       ✅ │');
      console.log('│ Scheduling     │   ❌ │    ❌ │      ✅ │       ✅ │');
      console.log('│ BM folders     │   ❌ │    ❌ │      ✅ │       ✅ │');
      console.log('│ Articles       │   ❌ │    ❌ │      ❌ │       ✅ │');
      console.log('│ Ad reduction   │ None │  50%  │    50%  │   No ads │');
      console.log('└────────────────┴──────┴───────┴─────────┴──────────┘');

      console.log('\n💰 Pricing:');
      console.log('  Basic:    $3/mo');
      console.log('  Premium:  $8/mo');
      console.log('  Premium+: $16/mo');
      console.log('  SuperGrok: $60/mo (separate xAI subscription)');
    }

    if (CONFIG.logJson) {
      console.log('\n📦 JSON:');
      console.log(JSON.stringify({ detectedTier: tier, tierInfo, signals, allTiers: TIER_FEATURES, checkedAt: new Date().toISOString() }, null, 2));
    }

    if (CONFIG.exportResults) {
      const date = new Date().toISOString().slice(0, 10);
      download(
        { exportedAt: new Date().toISOString(), detectedTier: tier, tierInfo, signals, allTiers: TIER_FEATURES },
        `xactions-premium-status-${date}.json`
      );
    }

    console.log('\n🏁 Done!');
  };

  run();
})();
