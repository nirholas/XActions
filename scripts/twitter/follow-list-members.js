// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 👥 Follow List Members - XActions
 * ============================================
 *
 * @name         follow-list-members
 * @description  Follow every member of a Twitter List, skipping accounts you already follow, rate-limited.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Open a List's members page: https://x.com/i/lists/<list-id>/members
 *      (from a list, tap the member count, or add /members to the list URL)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   With maxFollows: 50 and skipVerified: false, paste on a members page and the
 *   script scrolls the member cells, clicks Follow on each account you are not
 *   already following, and pauses 2-5s between follows, stopping at 50.
 *   To stop early, run window.stopFollowListMembers() in the console.
 *
 * ============================================
 */

(async function followListMembers() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of members to follow this run
    maxFollows: 50,

    // Maximum scroll attempts before giving up
    maxScrollAttempts: 100,

    // Stop after this many scrolls with no new members (end of list)
    noNewThreshold: 5,

    // Skip verified accounts
    skipVerified: false,

    // Skip protected (private) accounts
    skipProtected: false,

    // Rate limiting between follows (randomized between min and max, ms)
    minDelay: 2000,
    maxDelay: 5000,

    // Delay between scrolls (ms)
    scrollDelay: 2000
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    userCell: '[data-testid="UserCell"]',
    // Follow button ends with -follow (id contains the user id); unfollow ends with -unfollow
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    protectedIcon: '[data-testid="icon-lock"]',
    profileLink: 'a[href^="/"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  const handleFromCell = (cell) => {
    const link = cell.querySelector(SELECTORS.profileLink);
    if (!link) return '';
    const href = link.getAttribute('href') || '';
    const m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
    return m ? m[1] : '';
  };

  // ============================================
  // 🎯 MAIN
  // ============================================
  let stopped = false;
  window.stopFollowListMembers = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current member, then exiting.');
  };

  const stats = {
    followed: 0,
    alreadyFollowing: 0,
    skippedVerified: 0,
    skippedProtected: 0,
    errors: 0
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  👥 FOLLOW LIST MEMBERS - XActions                       ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: must be on a list members page
  if (!/\/lists\/[^/]+\/members/.test(window.location.pathname)) {
    log.warning('You are not on a List members page.');
    log.info('Open https://x.com/i/lists/<list-id>/members (or add /members to a list URL), then rerun.');
    return;
  }

  log.info(`Max follows: ${CONFIG.maxFollows}`);
  log.info(`Skip verified: ${CONFIG.skipVerified}, skip protected: ${CONFIG.skipProtected}`);
  log.info('To stop early: window.stopFollowListMembers()');
  console.log('');

  const processed = new Set();
  let scrollAttempts = 0;
  let noNewCount = 0;

  while (!stopped && stats.followed < CONFIG.maxFollows && scrollAttempts < CONFIG.maxScrollAttempts) {
    const cells = document.querySelectorAll(SELECTORS.userCell);
    let foundNew = false;

    for (const cell of cells) {
      if (stopped || stats.followed >= CONFIG.maxFollows) break;

      const handle = handleFromCell(cell);
      const key = handle || (cell.textContent || '').slice(0, 40);
      if (processed.has(key)) continue;
      processed.add(key);
      foundNew = true;

      try {
        // Already following? The cell shows an unfollow-style button.
        if (cell.querySelector(SELECTORS.unfollowButton)) {
          stats.alreadyFollowing++;
          continue;
        }

        if (CONFIG.skipVerified && cell.querySelector(SELECTORS.verifiedBadge)) {
          stats.skippedVerified++;
          continue;
        }

        if (CONFIG.skipProtected && cell.querySelector(SELECTORS.protectedIcon)) {
          stats.skippedProtected++;
          continue;
        }

        const followBtn = cell.querySelector(SELECTORS.followButton);
        if (!followBtn) continue;

        cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(400);
        followBtn.click();
        stats.followed++;
        log.success(`Followed #${stats.followed}: @${handle || 'unknown'}`);

        await sleep(randomDelay());
      } catch (e) {
        stats.errors++;
        log.error(`Error following @${handle || 'unknown'}: ${e.message}`);
      }
    }

    if (!foundNew) {
      noNewCount++;
      if (noNewCount >= CONFIG.noNewThreshold) {
        log.warning('No new members after several scrolls. Reached the end of the list.');
        break;
      }
    } else {
      noNewCount = 0;
    }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollAttempts++;
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  📊 FOLLOW LIST MEMBERS - COMPLETE                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`   ✅ Followed:          ${stats.followed}`);
  console.log(`   💚 Already following: ${stats.alreadyFollowing}`);
  console.log(`   ⏭️  Skipped verified:  ${stats.skippedVerified}`);
  console.log(`   🔒 Skipped protected: ${stats.skippedProtected}`);
  console.log(`   ❌ Errors:            ${stats.errors}`);
  console.log(`   📜 Scroll attempts:   ${scrollAttempts}`);

  if (stats.followed === 0 && stats.alreadyFollowing === 0) {
    log.warning('No member cells were processed. The list may be empty or still loading.');
  }

  console.log('✅ Script completed! by nichxbt');
  return stats;
})();
