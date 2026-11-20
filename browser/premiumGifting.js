// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Premium Gifting — by nichxbt
// https://github.com/nirholas/XActions
// Gift an X Premium subscription to another user from their profile.
//
// HOW TO USE:
// 1. Go to the profile of the user you want to gift Premium to (https://x.com/username)
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    targetUsername: '',               // Leave empty to gift to the profile you're currently viewing
    autoOpenGiftFlow: true,          // Automatically open the gift Premium flow
    delayBetweenActions: 2000,       // ms between UI actions
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_premium_gifts';

  const SELECTORS = {
    giftPremium: '[data-testid="giftPremium"]',
    userActions: '[data-testid="userActions"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    verifiedIcon: '[data-testid="icon-verified"]',
    userProfileHeader: '[data-testid="UserProfileHeader_Items"]',
    moreButton: '[data-testid="userActions"]',
    menuItem: '[role="menuitem"]',
  };

  const getCurrentProfileUsername = () => {
    const match = window.location.pathname.match(/^\/([^/]+)\/?$/);
    return match ? match[1] : null;
  };

  const checkProfilePage = () => {
    const username = CONFIG.targetUsername || getCurrentProfileUsername();

    if (!username) {
      console.log('❌ Not on a user profile page.');
      console.log('💡 Navigate to a user profile first: https://x.com/username');
      console.log('💡 Or set CONFIG.targetUsername to the username you want to gift to.');
      return null;
    }

    console.log(`👤 Target user: @${username}`);

    const isOnProfile = window.location.pathname.replace(/\/$/, '') === `/${username}`;
    if (!isOnProfile && !CONFIG.targetUsername) {
      console.log('⚠️ You may not be on the correct profile page.');
    }

    const verifiedIcon = document.querySelector(SELECTORS.verifiedIcon);
    if (verifiedIcon) {
      console.log('ℹ️ This user already has a verified badge (may already have Premium).');
      console.log('💡 You can still gift them a subscription extension.');
    } else {
      console.log('✅ This user does not appear to have Premium — great gift candidate!');
    }

    return username;
  };

  const openGiftFlow = async (username) => {
    console.log('🎁 Opening gift Premium flow...');

    // Try direct gift button first
    const giftBtn = document.querySelector(SELECTORS.giftPremium);
    if (giftBtn) {
      giftBtn.click();
      console.log('✅ Clicked Gift Premium button.');
      await sleep(CONFIG.delayBetweenActions);
      return true;
    }

    // Try the three-dot menu (userActions)
    console.log('🔄 Gift button not found directly. Checking profile menu...');
    const moreBtn = document.querySelector(SELECTORS.moreButton);

    if (moreBtn) {
      moreBtn.click();
      await sleep(CONFIG.delayBetweenActions);

      const menuItems = document.querySelectorAll(SELECTORS.menuItem);
      let giftOption = null;

      for (const item of menuItems) {
        const text = item.textContent.toLowerCase();
        if (text.includes('gift') && text.includes('premium')) {
          giftOption = item;
          break;
        }
      }

      if (giftOption) {
        giftOption.click();
        console.log('✅ Clicked "Gift Premium" from menu.');
        await sleep(CONFIG.delayBetweenActions);
        return true;
      }

      console.log('⚠️ "Gift Premium" option not found in menu.');
      console.log('📋 Available menu options:');
      menuItems.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.textContent.trim()}`);
      });

      // Close menu by pressing Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(500);
    } else {
      console.log('⚠️ Profile actions menu button not found.');
    }

    // Fallback: navigate directly
    console.log('🔄 Attempting direct navigation to gift flow...');
    window.location.href = `https://x.com/i/premium_sign_up?gift=${username}`;
    await sleep(CONFIG.delayBetweenActions * 2);

    return false;
  };

  const showGiftInfo = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('🎁 PREMIUM GIFTING INFO');
    console.log('══════════════════════════════════════════════════\n');
    console.log('   Gift tiers available:');
    console.log('   🥉 Basic     — $3/mo (small checkmark, edit posts, longer posts)');
    console.log('   🥈 Premium   — $8/mo (blue checkmark, half ads, Grok, creator tools)');
    console.log('   🥇 Premium+  — $16/mo (no ads, largest boost, X Pro, articles)');
    console.log('');
    console.log('   Duration options:');
    console.log('   📅 1 month');
    console.log('   📅 12 months (annual — saves ~12%)');
    console.log('');
    console.log('   💡 The recipient will be notified of the gift.');
    console.log('   💡 You can gift anonymously if the option is available.');
    console.log('══════════════════════════════════════════════════\n');
  };

  const logGift = (username) => {
    try {
      const gifts = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      gifts.push({
        username,
        initiatedAt: new Date().toISOString(),
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(gifts));
      console.log('💾 Gift attempt logged to sessionStorage.');
    } catch (e) {
      // Silent fail
    }
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('🎁 XActions — Gift X Premium');
    console.log('═══════════════════════════════════════════\n');

    showGiftInfo();

    const username = checkProfilePage();
    if (!username) return;

    await sleep(1000);

    if (CONFIG.targetUsername && getCurrentProfileUsername() !== CONFIG.targetUsername) {
      console.log(`🚀 Navigating to @${CONFIG.targetUsername}'s profile...`);
      window.location.href = `https://x.com/${CONFIG.targetUsername}`;
      await sleep(CONFIG.delayBetweenActions * 2);
    }

    if (CONFIG.autoOpenGiftFlow) {
      const opened = await openGiftFlow(username);

      if (opened) {
        logGift(username);
        console.log(`\n🎉 Gift flow opened for @${username}!`);
        console.log('💡 Follow the on-screen prompts to complete the gift.');
      } else {
        console.log(`\n⚠️ Could not open gift flow automatically.`);
        console.log(`💡 Try manually: go to @${username}'s profile → click ⋯ → "Gift Premium"`);
      }
    } else {
      console.log(`\n💡 Set CONFIG.autoOpenGiftFlow = true to auto-open the gift flow.`);
      console.log(`💡 Or manually: go to @${username}'s profile → click ⋯ → "Gift Premium"`);
    }

    console.log('\n✅ Premium gifting script complete.');
  };

  run();
})();
