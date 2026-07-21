// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/premiumFeatures.js
// Browser console script to check X/Twitter Premium status and features
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const TIERS = {
    free: {
      postLength: 280, videoLength: '140s', adReduction: 'None', verification: false,
      editPost: false, scheduling: false, bookmarkFolders: false, articles: false,
    },
    basic: {
      postLength: 280, videoLength: '140s', adReduction: '50% fewer', verification: false,
      editPost: false, scheduling: false, bookmarkFolders: false, articles: false,
    },
    premium: {
      postLength: 25000, videoLength: '60min', adReduction: '50% fewer', verification: true,
      editPost: true, scheduling: true, bookmarkFolders: true, articles: false,
    },
    'premium+': {
      postLength: 25000, videoLength: '3hr', adReduction: 'No ads', verification: true,
      editPost: true, scheduling: true, bookmarkFolders: true, articles: true,
    },
  };

  const run = async () => {
    console.log('💎 XActions Premium Checker');
    console.log('===========================');

    // Check current user's verification status
    const isVerified = !!document.querySelector('[data-testid="icon-verified"]');
    const hasEditButton = !!document.querySelector('[data-testid="editTweet"]');
    const hasSchedule = !!document.querySelector('[data-testid="scheduleOption"]');

    // Check for Premium indicators
    const premiumLink = document.querySelector('a[href*="premium"]');
    const hasPremiumBadge = !!document.querySelector('[data-testid="premiumBadge"]');

    let inferredTier = 'free';
    if (hasEditButton || hasSchedule) inferredTier = 'premium';
    if (hasPremiumBadge && isVerified) inferredTier = 'premium';

    console.log(`\n👤 Your account:`);
    console.log(`  ${isVerified ? '✅' : '❌'} Verified`);
    console.log(`  ${hasEditButton ? '✅' : '❌'} Edit post available`);
    console.log(`  ${hasSchedule ? '✅' : '❌'} Post scheduling available`);
    console.log(`  💎 Inferred tier: ${inferredTier}`);

    console.log('\n📋 Tier comparison:');
    console.log('┌────────────────┬──────┬───────┬─────────┬──────────┐');
    console.log('│ Feature        │ Free │ Basic │ Premium │ Premium+ │');
    console.log('├────────────────┼──────┼───────┼─────────┼──────────┤');
    console.log(`│ Post length    │  280 │   280 │  25,000 │   25,000 │`);
    console.log(`│ Video          │ 140s │  140s │   60min │      3hr │`);
    console.log(`│ Verification   │   ❌ │    ❌ │      ✅ │       ✅ │`);
    console.log(`│ Edit posts     │   ❌ │    ❌ │      ✅ │       ✅ │`);
    console.log(`│ Scheduling     │   ❌ │    ❌ │      ✅ │       ✅ │`);
    console.log(`│ BM folders     │   ❌ │    ❌ │      ✅ │       ✅ │`);
    console.log(`│ Articles       │   ❌ │    ❌ │      ❌ │       ✅ │`);
    console.log(`│ Ad reduction   │ None │  50%  │    50%  │   No ads │`);
    console.log('└────────────────┴──────┴───────┴─────────┴──────────┘');

    console.log('\n💰 Pricing:');
    console.log('  Basic:    $3/mo');
    console.log('  Premium:  $8/mo');
    console.log('  Premium+: $16/mo');
    console.log('  SuperGrok: $60/mo (separate xAI subscription)');

    const result = {
      currentUser: {
        isVerified,
        hasEditButton,
        hasSchedule,
        inferredTier,
      },
      tiers: TIERS,
      checkedAt: new Date().toISOString(),
    };

    console.log('\n📦 JSON:');
    console.log(JSON.stringify(result, null, 2));
  };

  run();
})();
