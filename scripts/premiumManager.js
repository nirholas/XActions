// scripts/premiumManager.js
// Browser console script for detecting Premium tier and features on X/Twitter
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    exportResults: true,
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
      features: { postLength: 280, videoLength: '140s', adReduction: 'None', verification: false, editPost: false, scheduling: false, bookmarkFolders: false, revenueShare: false, grokLevel: 'Basic (~10 queries/day)', replyBoost: 'None' },
    },
    basic: {
      tier: 'Basic', price: '$3/mo',
      features: { postLength: 280, videoLength: '140s', adReduction: '50% fewer', verification: false, editPost: false, scheduling: false, bookmarkFolders: false, revenueShare: false, grokLevel: 'More queries', replyBoost: 'Small' },
    },
    premium: {
      tier: 'Premium', price: '$8/mo',
      features: { postLength: 25000, videoLength: '60min', adReduction: '50% fewer', verification: true, editPost: true, scheduling: true, bookmarkFolders: true, revenueShare: true, grokLevel: 'Higher (~100 queries/day)', replyBoost: 'Medium' },
    },
    'premium+': {
      tier: 'Premium+', price: '$16/mo',
      features: { postLength: 25000, videoLength: '3hr', adReduction: 'No ads', verification: true, editPost: true, scheduling: true, bookmarkFolders: true, revenueShare: true, grokLevel: 'Highest (unlimited)', replyBoost: 'Largest' },
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

    // Infer tier
    let tier = 'free';
    if (signals.hasVerificationBadge && signals.canEditPosts) {
      tier = 'premium';
    } else if (signals.hasVerificationBadge) {
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
