// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 👋 Remove Follower - XActions
 * ============================================
 *
 * @name         remove-follower
 * @description  Remove followers without blocking them: X's native "Remove this follower", or a soft-block fallback.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/<your-username>/followers
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Set CONFIG.dryRun = false when you are ready to actually remove
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   usernames: ['spambot1', 'spambot2'], dryRun: false. The script finds those two
 *   rows and, per row, opens the "..." menu and clicks "Remove this follower"
 *   (native, no block). If that option is missing it soft-blocks: block, confirm,
 *   then immediately unblock, which drops them without a lasting block. Leave
 *   usernames empty and set maxRemove to remove the first N followers in the list.
 *
 * ⚠️ This changes who follows you and cannot be auto-undone. It DEFAULTS TO A DRY
 *    RUN (previews only). Nothing is removed until you set CONFIG.dryRun = false.
 *
 * ============================================
 */

(async function removeFollower() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Specific followers to remove (with or without @). Empty = remove from the
    // top of your followers list up to maxRemove.
    usernames: [
      // 'username1',
      // 'username2',
    ],

    // Never remove these, even if they appear in usernames or the top-N sweep.
    whitelist: [],

    // Cap on removals this run (also the top-N count when usernames is empty).
    maxRemove: 25,

    // SAFETY: preview only. Set to false to actually remove followers.
    dryRun: true,

    // Extra confirm() prompt before the first live removal.
    confirm: true,

    // Timing (randomized between min and max, per removal)
    minDelay: 2500,
    maxDelay: 5000,

    // Scrolling to load more followers (top-N mode)
    maxScrollRounds: 40,
    scrollDelay: 2000,
    maxEmptyScrolls: 6
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    userCell: '[data-testid="UserCell"]',
    userActions: '[data-testid="userActions"]',
    menuItem: '[role="menuitem"]',
    confirm: '[data-testid="confirmationSheetConfirm"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const cleanHandle = (u) => String(u || '').trim().replace(/^@/, '').toLowerCase();

  const getUsername = (cell) => {
    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (!link) return null;
    const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
    if (!m) return null;
    if (['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(m[1])) return null;
    return m[1];
  };

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} removed`)
  };

  // ============================================
  // 🎯 STATE
  // ============================================
  const stats = { removed: 0, scanned: 0, skipped: 0, notFound: 0, errors: 0 };
  const removedList = [];
  const processed = new Set();

  // Stop switch: run window.stopRemoveFollower() to abort after the current row.
  let stopped = false;
  window.stopRemoveFollower = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current follower, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  👋 REMOVE FOLLOWER - XActions                               ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN - No followers will be removed                 ║' : '║  🔴 LIVE MODE - Followers WILL be removed                   ║'}
╚══════════════════════════════════════════════════════════════╝
  `);
  log.info('To stop early: window.stopRemoveFollower()');

  // Page guard
  if (!/\/followers/.test(window.location.pathname)) {
    log.error('Not on a followers page. Go to https://x.com/<your-username>/followers and re-run.');
    return stats;
  }

  const targetSet = new Set(CONFIG.usernames.map(cleanHandle).filter(Boolean));
  const whiteSet = new Set(CONFIG.whitelist.map(cleanHandle).filter(Boolean));
  const targetMode = targetSet.size > 0;

  log.info(`Mode: ${targetMode ? `list (${targetSet.size} targets)` : `top ${CONFIG.maxRemove} followers`}`);
  log.info(`Max removals: ${CONFIG.maxRemove} | Dry run: ${CONFIG.dryRun}`);

  if (!CONFIG.dryRun && CONFIG.confirm) {
    const proceed = window.confirm(
      `Remove up to ${CONFIG.maxRemove} follower(s) for real? This cannot be auto-undone.`
    );
    if (!proceed) {
      log.warning('Cancelled at confirmation prompt. Nothing removed.');
      return stats;
    }
  }

  // ============================================
  // 🧹 REMOVE ONE (native remove, else soft-block)
  // ============================================
  const removeOne = async (cell, username) => {
    const moreBtn = cell.querySelector(SELECTORS.userActions) || cell.querySelector('button[aria-label="More"]');
    if (!moreBtn) {
      log.warning(`No actions (...) button for @${username}.`);
      stats.notFound++;
      return false;
    }
    moreBtn.click();
    await sleep(700);

    const items = Array.from(document.querySelectorAll(SELECTORS.menuItem));

    // 1) Preferred: native "Remove this follower" (no block).
    const removeItem = items.find(i => /remove\s+this\s+follower|remove\s+follower/i.test(i.textContent));
    if (removeItem) {
      removeItem.click();
      await sleep(600);
      const confirm = document.querySelector(SELECTORS.confirm);
      if (confirm) { confirm.click(); await sleep(700); }
      log.success(`Removed @${username} (native remove).`);
      return true;
    }

    // 2) Fallback: soft-block = block, confirm, then immediately unblock.
    const blockItem = items.find(i => /\bblock\b/i.test(i.textContent) && !/unblock/i.test(i.textContent));
    if (!blockItem) {
      document.body.click();
      await sleep(300);
      log.warning(`No remove or block option for @${username}.`);
      stats.notFound++;
      return false;
    }

    blockItem.click();
    await sleep(600);
    const blockConfirm = document.querySelector(SELECTORS.confirm);
    if (blockConfirm) { blockConfirm.click(); await sleep(800); }

    // Re-open the menu on the same row and unblock to complete the soft-block.
    const moreBtn2 = cell.querySelector(SELECTORS.userActions) || cell.querySelector('button[aria-label="More"]');
    if (moreBtn2) {
      moreBtn2.click();
      await sleep(700);
      const items2 = Array.from(document.querySelectorAll(SELECTORS.menuItem));
      const unblock = items2.find(i => /unblock/i.test(i.textContent));
      if (unblock) {
        unblock.click();
        await sleep(500);
        const unblockConfirm = document.querySelector(SELECTORS.confirm);
        if (unblockConfirm) { unblockConfirm.click(); await sleep(500); }
      } else {
        document.body.click();
        await sleep(300);
      }
    }
    log.success(`Removed @${username} (soft-block).`);
    return true;
  };

  // ============================================
  // 🔁 MAIN LOOP
  // ============================================
  let scrollRounds = 0;
  let emptyScrolls = 0;

  while (!stopped && stats.removed < CONFIG.maxRemove && scrollRounds < CONFIG.maxScrollRounds && emptyScrolls < CONFIG.maxEmptyScrolls) {
    const cells = document.querySelectorAll(SELECTORS.userCell);
    let foundNew = false;

    for (const cell of cells) {
      if (stopped || stats.removed >= CONFIG.maxRemove) break;

      const username = getUsername(cell);
      if (!username) continue;
      const key = username.toLowerCase();
      if (processed.has(key)) continue;
      processed.add(key);
      foundNew = true;
      stats.scanned++;

      try {
        if (whiteSet.has(key)) { stats.skipped++; continue; }
        if (targetMode && !targetSet.has(key)) { stats.skipped++; continue; }

        if (CONFIG.dryRun) {
          log.info(`Would remove: @${username}`);
          removedList.push({ username, dryRun: true, timestamp: new Date().toISOString() });
          stats.removed++;
          continue;
        }

        const ok = await removeOne(cell, username);
        if (ok) {
          stats.removed++;
          removedList.push({ username, timestamp: new Date().toISOString() });
          log.progress(stats.removed, CONFIG.maxRemove);
          await randomDelay();
        } else {
          stats.errors++;
        }
      } catch (error) {
        log.error(`Error on @${username}: ${error.message}`);
        stats.errors++;
        document.body.click();
        await sleep(300);
      }
    }

    if (!foundNew) emptyScrolls++;
    else emptyScrolls = 0;

    window.scrollTo(0, document.body.scrollHeight);
    scrollRounds++;
    await sleep(CONFIG.scrollDelay);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 REMOVE FOLLOWER - COMPLETE                           ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Removed:           ${String(stats.removed).padEnd(32)}║
║  🔍 Scanned:           ${String(stats.scanned).padEnd(32)}║
║  ⏭️  Skipped:           ${String(stats.skipped).padEnd(32)}║
║  ❓ Not found:         ${String(stats.notFound).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
║  🧪 Dry run:           ${String(CONFIG.dryRun).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  if (removedList.length > 0) {
    download(
      { stats, dryRun: CONFIG.dryRun, removed: removedList, exportedAt: new Date().toISOString() },
      `xactions-removed-followers-${CONFIG.dryRun ? 'preview' : 'results'}-${new Date().toISOString().slice(0, 10)}.json`
    );
  }

  if (CONFIG.dryRun) log.warning('This was a DRY RUN. Set CONFIG.dryRun = false to actually remove.');
  log.success('Script completed! by nichxbt');
  return stats;
})();
