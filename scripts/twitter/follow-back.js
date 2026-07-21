// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔁 Follow Back - XActions
 * ============================================
 *
 * @name         follow-back
 * @description  Follow every account that follows you but that you don't follow back yet.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/<your-username>/followers
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit CONFIG.maxFollows / CONFIG.skipVerified
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   maxFollows: 50, skipVerified: false. The script scans your followers list,
 *   finds every row marked "Follows you" that still shows a Follow button (not
 *   Following), and clicks Follow on up to 50 of them, scrolling to load more.
 *   Rows you already follow are skipped automatically.
 *
 * ⚠️ Following many accounts quickly can trip X's rate limits. Keep delays high.
 *
 * ============================================
 */

(async function followBack() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Hard cap on follow-backs this run
    maxFollows: 50,

    // Skip verified (blue check) accounts
    skipVerified: false,

    // Skip protected/locked accounts
    skipProtected: false,

    // Timing (randomized between min and max, per follow)
    minDelay: 2000,
    maxDelay: 5000,

    // Scrolling to load more followers
    maxScrollRounds: 40,
    scrollDelay: 2000,
    maxEmptyScrolls: 6
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    userCell: '[data-testid="UserCell"]',
    followButton: '[data-testid$="-follow"]',     // ends with -follow (not -unfollow)
    unfollowButton: '[data-testid$="-unfollow"]',
    followsYou: '[data-testid="userFollowIndicator"]',
    verified: '[data-testid="icon-verified"]',
    protectedIcon: '[data-testid="icon-lock"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const getUsername = (cell) => {
    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (!link) return null;
    const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
    if (!m) return null;
    if (['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(m[1])) return null;
    return m[1];
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} followed back`)
  };

  // ============================================
  // 🎯 STATE
  // ============================================
  const stats = { followed: 0, alreadyFollowing: 0, notMutual: 0, skippedVerified: 0, skippedProtected: 0, errors: 0 };
  const processed = new Set();

  // Stop switch: run window.stopFollowBack() to abort after the current account.
  let stopped = false;
  window.stopFollowBack = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current account, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔁 FOLLOW BACK - XActions                               ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);
  log.info('To stop early: window.stopFollowBack()');

  // Page guard
  if (!/\/followers/.test(window.location.pathname)) {
    log.error('Not on a followers page. Go to https://x.com/<your-username>/followers and re-run.');
    return stats;
  }

  log.info(`Max follow-backs: ${CONFIG.maxFollows}`);
  log.info(`Skip verified: ${CONFIG.skipVerified} | Skip protected: ${CONFIG.skipProtected}`);

  // ============================================
  // 🔁 MAIN LOOP
  // ============================================
  let scrollRounds = 0;
  let emptyScrolls = 0;

  while (!stopped && stats.followed < CONFIG.maxFollows && scrollRounds < CONFIG.maxScrollRounds && emptyScrolls < CONFIG.maxEmptyScrolls) {
    const cells = document.querySelectorAll(SELECTORS.userCell);
    if (cells.length === 0) {
      log.warning('No follower rows visible yet. Scrolling...');
    }

    let foundNew = false;

    for (const cell of cells) {
      if (stopped || stats.followed >= CONFIG.maxFollows) break;

      const username = getUsername(cell);
      if (!username) continue;
      const key = username.toLowerCase();
      if (processed.has(key)) continue;
      processed.add(key);
      foundNew = true;

      try {
        // Must follow you.
        if (!cell.querySelector(SELECTORS.followsYou)) {
          stats.notMutual++;
          continue;
        }

        // Already following? A -unfollow button means you follow them.
        if (cell.querySelector(SELECTORS.unfollowButton)) {
          stats.alreadyFollowing++;
          continue;
        }

        if (CONFIG.skipVerified && cell.querySelector(SELECTORS.verified)) {
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
        log.success(`Followed back #${stats.followed}: @${username}`);
        log.progress(stats.followed, CONFIG.maxFollows);
        await randomDelay();
      } catch (error) {
        log.error(`Error on @${username}: ${error.message}`);
        stats.errors++;
      }
    }

    if (!foundNew) emptyScrolls++;
    else emptyScrolls = 0;

    window.scrollTo(0, document.body.scrollHeight);
    scrollRounds++;
    await sleep(CONFIG.scrollDelay);
  }

  if (emptyScrolls >= CONFIG.maxEmptyScrolls) {
    log.info('Reached the end of the followers list.');
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 FOLLOW BACK - COMPLETE                               ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Followed back:     ${String(stats.followed).padEnd(32)}║
║  🤝 Already following: ${String(stats.alreadyFollowing).padEnd(32)}║
║  🚫 Not mutual:        ${String(stats.notMutual).padEnd(32)}║
║  ✔️  Skipped verified:  ${String(stats.skippedVerified).padEnd(32)}║
║  🔒 Skipped protected: ${String(stats.skippedProtected).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
