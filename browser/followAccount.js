// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Follow Accounts on X - by nichxbt
// https://github.com/nirholas/xactions
// Follow a list of specific usernames, navigating to each profile
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below
// 4. Paste and run
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── Usernames to Follow ──
    usernames: [
      // 'nichxbt',
      // 'elonmusk',
      // 'openai',
    ],

    // ── Limits ──
    maxFollows: 50,             // Max follows per run (X rate limits aggressively)

    // ── Safety ──
    skipAlreadyFollowing: true, // Skip accounts you already follow
    skipProtected: false,       // Skip protected/private accounts
    skipSuspended: true,        // Skip suspended accounts

    // ── Timing ──
    minDelay: 2000,
    maxDelay: 4000,
    navigationDelay: 3000,      // Wait for profile page to load
    rateLimitPauseMs: 60000,    // Cooldown when rate-limited (60s)

    // ── Tracking ──
    trackFollowed: true,        // Save followed accounts to sessionStorage
  };

  // ── Selectors ──
  const SEL = {
    followBtn:    ['[data-testid$="-follow"]'],
    unfollowBtn:  ['[data-testid$="-unfollow"]'],
    userCell:     '[data-testid="UserCell"]',
    userName:     '[data-testid="UserName"]',
    toast:        '[data-testid="toast"]',
    emptyState:   '[data-testid="emptyState"]',
    primaryCol:   '[data-testid="primaryColumn"]',
  };

  // ── Utilities ──
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const waitForElement = async (selector, timeout = 10000) => {
    const selectors = Array.isArray(selector) ? selector : [selector];
    const start = Date.now();
    while (Date.now() - start < timeout) {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      await sleep(200);
    }
    return null;
  };

  const isRateLimited = () => {
    const toast = document.querySelector(SEL.toast);
    if (!toast) return false;
    const text = toast.textContent.toLowerCase();
    return /rate limit|try again|too many|slow down|limit/.test(text);
  };

  const isSuspended = () => {
    const primaryCol = document.querySelector(SEL.primaryCol);
    if (!primaryCol) return false;
    const text = primaryCol.textContent.toLowerCase();
    return text.includes('account is suspended') || text.includes('account suspended');
  };

  const isProtected = () => {
    const primaryCol = document.querySelector(SEL.primaryCol);
    if (!primaryCol) return false;
    return !!primaryCol.querySelector('svg[data-testid="icon-lock"]');
  };

  const doesNotExist = () => {
    const emptyState = document.querySelector(SEL.emptyState);
    if (emptyState) return true;
    const primaryCol = document.querySelector(SEL.primaryCol);
    if (!primaryCol) return false;
    const text = primaryCol.textContent.toLowerCase();
    return text.includes("this account doesn't exist") || text.includes('page doesn\'t exist');
  };

  // ── Validate Usernames ──
  const validateUsernames = (usernames) => {
    const valid = [];
    const invalid = [];

    for (const u of usernames) {
      const cleaned = u.replace(/^@/, '').trim();
      if (!cleaned) continue;
      if (/^[a-zA-Z0-9_]{1,15}$/.test(cleaned)) {
        valid.push(cleaned);
      } else {
        invalid.push(u);
      }
    }

    return { valid, invalid };
  };

  // ── Follow a Single User ──
  const followUser = async (username) => {
    // Navigate to profile
    const profileUrl = `https://x.com/${username}`;
    window.location.href = profileUrl;
    await sleep(CONFIG.navigationDelay);

    // Check for account issues
    if (doesNotExist()) {
      return { status: 'not_found', message: 'Account does not exist' };
    }

    if (CONFIG.skipSuspended && isSuspended()) {
      return { status: 'suspended', message: 'Account is suspended' };
    }

    if (CONFIG.skipProtected && isProtected()) {
      return { status: 'protected', message: 'Account is protected' };
    }

    // Check if already following
    const unfollowBtn = await waitForElement(SEL.unfollowBtn, 3000);
    if (unfollowBtn && CONFIG.skipAlreadyFollowing) {
      return { status: 'already_following', message: 'Already following' };
    }

    // Find and click the follow button
    const followBtn = await waitForElement(SEL.followBtn, 5000);
    if (!followBtn) {
      if (unfollowBtn) {
        return { status: 'already_following', message: 'Already following' };
      }
      return { status: 'no_button', message: 'Follow button not found' };
    }

    // Make sure it's actually a follow button (not the one on someone else's profile in recommendations)
    const btnText = followBtn.textContent.toLowerCase();
    if (btnText.includes('following') || btnText.includes('pending')) {
      return { status: 'already_following', message: 'Already following or pending' };
    }

    followBtn.click();
    await sleep(randomDelay());

    // Check for rate limit
    if (isRateLimited()) {
      return { status: 'rate_limited', message: 'Rate limited by X' };
    }

    // Verify follow was successful
    const verifyUnfollow = await waitForElement(SEL.unfollowBtn, 3000);
    if (verifyUnfollow) {
      return { status: 'success', message: 'Followed successfully' };
    }

    // Might be a protected account (pending request)
    return { status: 'pending', message: 'Follow request sent (possibly protected account)' };
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('➕ XActions — Follow Accounts');
    console.log('═══════════════════════════════════════');

    if (CONFIG.usernames.length === 0) {
      console.error('❌ Please add usernames to CONFIG.usernames.');
      console.log('💡 Example: usernames: ["nichxbt", "elonmusk"]');
      return;
    }

    // Validate
    const { valid, invalid } = validateUsernames(CONFIG.usernames);

    if (invalid.length > 0) {
      console.warn(`⚠️  Invalid usernames (skipped): ${invalid.join(', ')}`);
    }

    if (valid.length === 0) {
      console.error('❌ No valid usernames found.');
      return;
    }

    console.log(`👥 Following ${valid.length} accounts (max: ${CONFIG.maxFollows})...`);
    console.log('');

    // Load existing tracking data
    const trackingData = JSON.parse(sessionStorage.getItem('xactions_followed') || '[]');
    const previouslyFollowed = new Set(trackingData.flatMap(entry => entry.usernames || []));

    const results = {
      success: [],
      already_following: [],
      not_found: [],
      suspended: [],
      protected: [],
      rate_limited: [],
      failed: [],
    };

    let followed = 0;
    let consecutiveErrors = 0;

    for (const username of valid) {
      if (followed >= CONFIG.maxFollows) {
        console.log(`\n🛑 Reached max follows limit (${CONFIG.maxFollows}).`);
        break;
      }

      // Check if previously followed in this session
      if (previouslyFollowed.has(username)) {
        console.log(`⏭️  @${username} — already followed this session`);
        results.already_following.push(username);
        continue;
      }

      console.log(`🔄 @${username}...`);
      const result = await followUser(username);

      switch (result.status) {
        case 'success':
          followed++;
          consecutiveErrors = 0;
          results.success.push(username);
          console.log(`   ✅ Followed! (${followed}/${CONFIG.maxFollows})`);
          break;

        case 'already_following':
          consecutiveErrors = 0;
          results.already_following.push(username);
          console.log(`   ⏭️  ${result.message}`);
          break;

        case 'not_found':
          consecutiveErrors = 0;
          results.not_found.push(username);
          console.log(`   ❌ ${result.message}`);
          break;

        case 'suspended':
          consecutiveErrors = 0;
          results.suspended.push(username);
          console.log(`   🚫 ${result.message}`);
          break;

        case 'protected':
          consecutiveErrors = 0;
          results.protected.push(username);
          console.log(`   🔒 ${result.message}`);
          break;

        case 'pending':
          followed++;
          consecutiveErrors = 0;
          results.success.push(username);
          console.log(`   📨 ${result.message}`);
          break;

        case 'rate_limited':
          results.rate_limited.push(username);
          console.warn(`   ⚠️  Rate limited! Pausing for ${CONFIG.rateLimitPauseMs / 1000}s...`);
          await sleep(CONFIG.rateLimitPauseMs);
          consecutiveErrors++;
          break;

        default:
          consecutiveErrors++;
          results.failed.push(username);
          console.warn(`   ⚠️  ${result.message}`);
      }

      // Abort on too many consecutive errors
      if (consecutiveErrors >= 5) {
        console.error('❌ Too many consecutive errors. Aborting to prevent account issues.');
        break;
      }

      // Delay between follows
      if (followed < CONFIG.maxFollows) {
        await sleep(randomDelay());
      }
    }

    // ── Save Tracking Data ──
    if (CONFIG.trackFollowed && results.success.length > 0) {
      trackingData.push({
        timestamp: new Date().toISOString(),
        usernames: results.success,
        count: results.success.length,
      });
      sessionStorage.setItem('xactions_followed', JSON.stringify(trackingData));
      console.log('\n💾 Saved to sessionStorage (key: "xactions_followed")');
    }

    // ── Summary ──
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`   ✅ Followed:          ${results.success.length}`);
    console.log(`   ⏭️  Already following: ${results.already_following.length}`);
    console.log(`   ❌ Not found:         ${results.not_found.length}`);
    console.log(`   🚫 Suspended:         ${results.suspended.length}`);
    console.log(`   🔒 Protected:         ${results.protected.length}`);
    console.log(`   ⚠️  Rate limited:     ${results.rate_limited.length}`);
    console.log(`   ❓ Failed:            ${results.failed.length}`);

    if (results.success.length > 0) {
      console.log(`\n✅ Newly followed: ${results.success.map(u => '@' + u).join(', ')}`);
    }

    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');
  };

  run();
})();
