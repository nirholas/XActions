// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🚫 Block List Transfer - XActions
 * ============================================
 *
 * @name         block-list-transfer
 * @description  Export your block list to JSON, import and block a list of users, or block-chain an account's followers.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Pick a mode and the page it needs:
 *      - 'export'          -> go to x.com/settings/blocked_all
 *      - 'importBlock'     -> go to x.com (any page); set CONFIG.usernames
 *      - 'blockFollowersOf'-> go to x.com/<targetAccount>/followers
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Set CONFIG.mode and CONFIG.dryRun = false to actually block
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   mode: 'export' -> scrapes every account on your blocked list and downloads
 *   xactions-block-list-YYYY-MM-DD.json. Later, mode: 'importBlock' with those
 *   usernames re-applies the whole list on another account. mode: 'blockFollowersOf'
 *   with targetAccount: 'spamring' blocks that account's followers one by one.
 *
 * ⚠️ DESTRUCTIVE. Blocking is a real, visible action against real accounts. This
 *    DEFAULTS TO A DRY RUN. Nothing is blocked until you set CONFIG.dryRun = false.
 *    Export mode is always read-only.
 *
 * ============================================
 */

(async function blockListTransfer() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // 'export' | 'importBlock' | 'blockFollowersOf'
    mode: 'export',

    // For 'importBlock': the accounts to block (with or without @).
    usernames: [
      // 'username1',
      // 'username2',
    ],

    // For 'blockFollowersOf': whose followers to block (without @).
    targetAccount: '',

    // Never block these (with or without @).
    whitelist: [],

    // Cap on blocks this run (blocking modes only).
    maxBlocks: 25,

    // SAFETY: preview only. Set to false to actually block. Ignored by 'export'.
    dryRun: true,

    // Timing (randomized between min and max, per block)
    minDelay: 3000,
    maxDelay: 6000,

    // Scrolling for scraping / follower sweeps
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
    blockMenuItem: '[data-testid="block"]',
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

  // SPA navigation keeps this script alive; a full window.location load kills it.
  const spaNavigate = (path) => {
    try {
      const target = new URL(path, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) { /* fall through */ }
    window.location.href = path;
  };

  const getUsername = (cell) => {
    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (!link) return null;
    const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
    if (!m) return null;
    if (['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(m[1])) return null;
    return m[1];
  };

  const getDisplayName = (cell) => {
    const span = cell.querySelector('a[href^="/"] span');
    return span ? span.textContent.trim() : '';
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
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} blocked`)
  };

  const whiteSet = new Set(CONFIG.whitelist.map(cleanHandle).filter(Boolean));

  // ============================================
  // 🎯 STATE
  // ============================================
  const stats = { blocked: 0, scraped: 0, skipped: 0, notFound: 0, errors: 0 };
  const blockedList = [];

  // Stop switch: run window.stopBlockListTransfer() to abort after the current item.
  let stopped = false;
  window.stopBlockListTransfer = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current account, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚫 BLOCK LIST TRANSFER - XActions                          ║
║  👤 Author: nichxbt   🌐 https://xactions.app               ║
${CONFIG.mode === 'export' ? '║  📤 EXPORT MODE - read-only                                 ║' : (CONFIG.dryRun ? '║  ⚠️  DRY RUN - No accounts will be blocked                 ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║')}
╚══════════════════════════════════════════════════════════════╝
  `);
  log.warning('DESTRUCTIVE tool. Blocking affects real accounts. To stop: window.stopBlockListTransfer()');

  // ============================================
  // 📤 EXPORT: scrape the blocked list
  // ============================================
  const exportBlocked = async () => {
    if (!/\/settings\/blocked/.test(window.location.pathname)) {
      log.error('Export needs the blocked-accounts page. Go to https://x.com/settings/blocked_all and re-run.');
      return;
    }

    log.info('Scraping your blocked accounts...');
    const found = new Map();
    let rounds = 0;
    let empty = 0;

    while (rounds < CONFIG.maxScrollRounds && empty < CONFIG.maxEmptyScrolls) {
      const before = found.size;
      for (const cell of document.querySelectorAll(SELECTORS.userCell)) {
        const username = getUsername(cell);
        if (!username) continue;
        const key = username.toLowerCase();
        if (found.has(key)) continue;
        found.set(key, { username, displayName: getDisplayName(cell) });
      }
      stats.scraped = found.size;

      if (found.size === before) empty++;
      else empty = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      rounds++;
    }

    const list = [...found.values()];
    if (list.length === 0) {
      log.warning('No blocked accounts found. Your block list may be empty.');
      return;
    }

    log.success(`Scraped ${list.length} blocked accounts.`);
    download(
      { exportedAt: new Date().toISOString(), count: list.length, usernames: list.map(u => u.username), accounts: list },
      `xactions-block-list-${new Date().toISOString().slice(0, 10)}.json`
    );
  };

  // ============================================
  // 🚫 Block one account by profile navigation (importBlock)
  // ============================================
  const blockByProfile = async (username) => {
    spaNavigate(`/${username}`);
    await sleep(3000);

    let moreBtn = document.querySelector(SELECTORS.userActions);
    let waited = 0;
    while (!moreBtn && waited < 5000) {
      await sleep(500);
      waited += 500;
      moreBtn = document.querySelector(SELECTORS.userActions);
    }
    if (!moreBtn) {
      log.warning(`Could not open the menu for @${username} (profile may not exist).`);
      stats.notFound++;
      return false;
    }

    moreBtn.click();
    await sleep(600);

    const blockItem = document.querySelector(SELECTORS.blockMenuItem)
      || Array.from(document.querySelectorAll(SELECTORS.menuItem))
        .find(i => /\bblock\b/i.test(i.textContent) && !/unblock/i.test(i.textContent));
    if (!blockItem) {
      document.body.click();
      await sleep(300);
      log.warning(`No block option for @${username} (already blocked?).`);
      stats.notFound++;
      return false;
    }

    blockItem.click();
    await sleep(600);
    const confirm = document.querySelector(SELECTORS.confirm);
    if (confirm) { confirm.click(); await sleep(700); }
    return true;
  };

  // ============================================
  // 🚫 Block one account from its follower row (blockFollowersOf)
  // ============================================
  const blockFromCell = async (cell, username) => {
    const moreBtn = cell.querySelector(SELECTORS.userActions) || cell.querySelector('button[aria-label="More"]');
    if (!moreBtn) {
      log.warning(`No actions (...) button for @${username}.`);
      stats.notFound++;
      return false;
    }
    moreBtn.click();
    await sleep(600);

    const blockItem = document.querySelector(SELECTORS.blockMenuItem)
      || Array.from(document.querySelectorAll(SELECTORS.menuItem))
        .find(i => /\bblock\b/i.test(i.textContent) && !/unblock/i.test(i.textContent));
    if (!blockItem) {
      document.body.click();
      await sleep(300);
      log.warning(`No block option for @${username}.`);
      stats.notFound++;
      return false;
    }

    blockItem.click();
    await sleep(600);
    const confirm = document.querySelector(SELECTORS.confirm);
    if (confirm) { confirm.click(); await sleep(700); }
    return true;
  };

  // ============================================
  // 🔁 importBlock
  // ============================================
  const importBlock = async () => {
    const targets = CONFIG.usernames.map(cleanHandle).filter(Boolean);
    if (targets.length === 0) {
      log.error('CONFIG.usernames is empty. Add handles to block and re-run.');
      return;
    }
    log.info(`Importing ${targets.length} account(s) to block. Max this run: ${CONFIG.maxBlocks}.`);

    for (let i = 0; i < targets.length; i++) {
      if (stopped) { log.warning('Stopped by user.'); break; }
      if (stats.blocked >= CONFIG.maxBlocks) { log.warning(`Reached maxBlocks (${CONFIG.maxBlocks}).`); break; }

      const username = targets[i];
      if (whiteSet.has(username)) { stats.skipped++; continue; }

      try {
        if (CONFIG.dryRun) {
          log.info(`Would block: @${username}`);
          blockedList.push({ username, dryRun: true, timestamp: new Date().toISOString() });
          stats.blocked++;
          continue;
        }
        const ok = await blockByProfile(username);
        if (ok) {
          stats.blocked++;
          blockedList.push({ username, timestamp: new Date().toISOString() });
          log.success(`Blocked @${username}`);
          log.progress(stats.blocked, Math.min(CONFIG.maxBlocks, targets.length));
        } else {
          stats.errors++;
        }
      } catch (error) {
        log.error(`Error blocking @${username}: ${error.message}`);
        stats.errors++;
      }

      const more = !stopped && stats.blocked < CONFIG.maxBlocks && i < targets.length - 1;
      if (more && !CONFIG.dryRun) await randomDelay();
    }
  };

  // ============================================
  // 🔁 blockFollowersOf
  // ============================================
  const blockFollowersOf = async () => {
    const target = cleanHandle(CONFIG.targetAccount);
    if (!target) {
      log.error('CONFIG.targetAccount is empty. Set it to the account whose followers you want to block.');
      return;
    }
    if (!/\/followers/.test(window.location.pathname) || !window.location.pathname.toLowerCase().includes(`/${target}/`)) {
      log.error(`Go to https://x.com/${target}/followers and re-run (must be on that account's followers page).`);
      return;
    }

    log.info(`Block-chaining @${target}'s followers. Max this run: ${CONFIG.maxBlocks}.`);
    const processed = new Set();
    let rounds = 0;
    let empty = 0;

    while (!stopped && stats.blocked < CONFIG.maxBlocks && rounds < CONFIG.maxScrollRounds && empty < CONFIG.maxEmptyScrolls) {
      const cells = document.querySelectorAll(SELECTORS.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (stopped || stats.blocked >= CONFIG.maxBlocks) break;

        const username = getUsername(cell);
        if (!username) continue;
        const key = username.toLowerCase();
        if (processed.has(key)) continue;
        processed.add(key);
        foundNew = true;
        stats.scraped++;

        try {
          if (whiteSet.has(key) || key === target) { stats.skipped++; continue; }

          if (CONFIG.dryRun) {
            log.info(`Would block: @${username}`);
            blockedList.push({ username, dryRun: true, timestamp: new Date().toISOString() });
            stats.blocked++;
            continue;
          }

          const ok = await blockFromCell(cell, username);
          if (ok) {
            stats.blocked++;
            blockedList.push({ username, timestamp: new Date().toISOString() });
            log.success(`Blocked @${username}`);
            log.progress(stats.blocked, CONFIG.maxBlocks);
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

      if (!foundNew) empty++;
      else empty = 0;

      window.scrollTo(0, document.body.scrollHeight);
      rounds++;
      await sleep(CONFIG.scrollDelay);
    }
  };

  // ============================================
  // 🎯 DISPATCH
  // ============================================
  try {
    if (CONFIG.mode === 'export') {
      await exportBlocked();
    } else if (CONFIG.mode === 'importBlock') {
      await importBlock();
    } else if (CONFIG.mode === 'blockFollowersOf') {
      await blockFollowersOf();
    } else {
      log.error(`Unknown mode "${CONFIG.mode}". Use 'export', 'importBlock', or 'blockFollowersOf'.`);
    }
  } catch (error) {
    log.error(`Fatal: ${error.message}`);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 BLOCK LIST TRANSFER - COMPLETE                       ║
╠══════════════════════════════════════════════════════════╣
║  🚫 Blocked:           ${String(stats.blocked).padEnd(32)}║
║  📤 Scraped:           ${String(stats.scraped).padEnd(32)}║
║  ⏭️  Skipped:           ${String(stats.skipped).padEnd(32)}║
║  ❓ Not found:         ${String(stats.notFound).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
║  🧪 Dry run:           ${String(CONFIG.dryRun).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  if ((CONFIG.mode === 'importBlock' || CONFIG.mode === 'blockFollowersOf') && blockedList.length > 0) {
    download(
      { mode: CONFIG.mode, dryRun: CONFIG.dryRun, stats, blocked: blockedList, exportedAt: new Date().toISOString() },
      `xactions-block-transfer-${CONFIG.dryRun ? 'preview' : 'results'}-${new Date().toISOString().slice(0, 10)}.json`
    );
  }

  if (CONFIG.dryRun && CONFIG.mode !== 'export') {
    log.warning('This was a DRY RUN. Set CONFIG.dryRun = false to actually block.');
  }
  log.success('Script completed! by nichxbt');
  return stats;
})();
