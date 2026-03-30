// Verified-Only Replies — by nichxbt
// https://github.com/nirholas/XActions
// Toggle "only verified users can reply" on your posts and check verification status.
//
// HOW TO USE:
// 1. Go to https://x.com (home or compose a new post)
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    mode: 'set',                    // 'set' = set reply restriction, 'check' = check verification only
    restriction: 'verified',        // 'everyone', 'verified', 'following', 'mentioned'
    autoCompose: false,             // Open compose dialog if not already open
    delayBetweenActions: 1500,      // ms between UI interactions
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const SELECTORS = {
    replyRestriction: '[data-testid="replyRestriction"]',
    verifiedIcon: '[data-testid="icon-verified"]',
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    composeButton: 'a[href="/compose/post"]',
    replyOption: '[data-testid="replyOption"]',
    toolBar: '[data-testid="toolBar"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    userCell: '[data-testid="UserCell"]',
  };

  const RESTRICTION_LABELS = {
    everyone: 'Everyone',
    verified: 'Verified accounts',
    following: 'Accounts you follow',
    mentioned: 'Only people you mention',
  };

  const checkVerificationStatus = () => {
    console.log('🔍 Checking your verification status...');

    const verifiedIcons = document.querySelectorAll(SELECTORS.verifiedIcon);
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');

    if (verifiedIcons.length > 0) {
      console.log('✅ Verified badge(s) detected on page.');
    } else {
      console.log('⚠️ No verified badge detected. You may need X Premium to use verified-only replies.');
      console.log('💡 Subscribe at: https://x.com/i/premium_sign_up');
    }

    if (profileLink) {
      const href = profileLink.getAttribute('href');
      console.log(`👤 Your profile: https://x.com${href}`);
    }

    return verifiedIcons.length > 0;
  };

  const openComposeDialog = async () => {
    console.log('📝 Opening compose dialog...');

    const composeBtn = document.querySelector(SELECTORS.composeButton)
      || document.querySelector('a[aria-label="Post"]');

    if (composeBtn) {
      composeBtn.click();
      await sleep(CONFIG.delayBetweenActions);
      console.log('✅ Compose dialog opened.');
      return true;
    }

    console.log('⚠️ Could not find compose button. Please open the compose dialog manually.');
    return false;
  };

  const setReplyRestriction = async () => {
    console.log(`🔒 Setting reply restriction to: "${RESTRICTION_LABELS[CONFIG.restriction]}"...`);

    const textarea = document.querySelector(SELECTORS.tweetTextarea);
    if (!textarea) {
      console.log('⚠️ No compose textarea found.');
      if (CONFIG.autoCompose) {
        const opened = await openComposeDialog();
        if (!opened) return false;
      } else {
        console.log('💡 Open the compose dialog first, or set CONFIG.autoCompose = true.');
        return false;
      }
    }

    await sleep(1000);

    const replyRestrictionBtn = document.querySelector(SELECTORS.replyRestriction)
      || document.querySelector('[aria-label="Reply restrictions"]')
      || document.querySelector('button[aria-haspopup="menu"]');

    if (replyRestrictionBtn) {
      replyRestrictionBtn.click();
      console.log('✅ Opened reply restriction menu.');
      await sleep(CONFIG.delayBetweenActions);

      const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"]');
      let found = false;

      for (const item of menuItems) {
        const text = item.textContent.toLowerCase();
        if (text.includes(CONFIG.restriction.toLowerCase()) ||
            text.includes(RESTRICTION_LABELS[CONFIG.restriction].toLowerCase())) {
          item.click();
          found = true;
          console.log(`✅ Selected: "${RESTRICTION_LABELS[CONFIG.restriction]}"`);
          break;
        }
      }

      if (!found) {
        console.log('⚠️ Could not find the desired restriction option in menu.');
        console.log('📋 Available options:');
        menuItems.forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.textContent.trim()}`);
        });
      }
    } else {
      console.log('⚠️ Reply restriction button not found.');
      console.log('💡 Make sure you are in the compose dialog. The reply restriction button is near the toolbar.');
      console.log('💡 Note: This feature requires X Premium.');
    }

    return true;
  };

  const showCurrentRestriction = () => {
    const restrictionEl = document.querySelector(SELECTORS.replyRestriction);
    if (restrictionEl) {
      const text = restrictionEl.textContent.trim() || restrictionEl.getAttribute('aria-label') || 'Unknown';
      console.log(`📋 Current reply restriction: ${text}`);
    } else {
      console.log('ℹ️ No active reply restriction element found on page.');
    }
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('🔒 XActions — Verified-Only Replies');
    console.log('═══════════════════════════════════════════\n');

    const isVerified = checkVerificationStatus();
    await sleep(1000);

    showCurrentRestriction();
    await sleep(500);

    if (CONFIG.mode === 'check') {
      console.log('\nℹ️ Mode: check only. Set CONFIG.mode = "set" to change reply restrictions.');
      return;
    }

    if (!isVerified) {
      console.log('\n⚠️ You may not have Premium. Reply restrictions require X Premium.');
      console.log('💡 Continuing anyway — the UI will block you if ineligible.');
    }

    await setReplyRestriction();

    console.log('\n✅ Done! Your reply restriction has been updated.');
    console.log('💡 This setting applies per-post. Set it before posting each time.');
    console.log('💡 Available options:', Object.values(RESTRICTION_LABELS).join(', '));
  };

  run();
})();
