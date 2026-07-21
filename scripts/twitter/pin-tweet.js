// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 📌 Pin Tweet - XActions
 * ============================================
 *
 * @name         pin-tweet
 * @description  Pin or unpin one of your own tweets to the top of your profile.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to your profile page (x.com/YOUR_USERNAME)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   To pin a specific tweet, set CONFIG.action = "pin" and CONFIG.tweetUrl to its
 *   URL, then dryRun = false. To unpin the current pinned tweet, set action =
 *   "unpin" and leave tweetUrl empty. The script opens the tweet menu and confirms.
 *
 * ============================================
 */

(async function pinTweet() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // 'pin' or 'unpin'.
    action: 'pin',

    // Optional: the URL (or status id) of the tweet to act on. Must be your own
    // tweet. Leave '' to use the first tweet shown on the current page.
    // Example: 'https://x.com/nichxbt/status/1234567890123456789'
    tweetUrl: '',

    // Preview only: log what would happen without opening the menu.
    dryRun: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    article: 'article[data-testid="tweet"]',
    caret: '[data-testid="caret"]',
    tweetText: '[data-testid="tweetText"]',
    socialContext: '[data-testid="socialContext"]',
    confirm: '[data-testid="confirmationSheetConfirm"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  const waitForSelector = async (selector, timeoutMs = 4000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const extractStatusId = (urlOrId) => {
    if (!urlOrId) return '';
    const m = String(urlOrId).match(/status\/(\d+)/);
    if (m) return m[1];
    const digits = String(urlOrId).match(/^\d{5,}$/);
    return digits ? digits[0] : '';
  };

  // Locate the article for a given status id, scrolling to find it if needed.
  const findArticleById = async (statusId) => {
    for (let i = 0; i < 12; i++) {
      for (const a of document.querySelectorAll(SELECTORS.article)) {
        const link = a.querySelector('a[href*="/status/"]');
        const href = link ? link.getAttribute('href') : '';
        if (href && href.includes(`/status/${statusId}`)) return a;
      }
      window.scrollBy(0, window.innerHeight * 0.8);
      await sleep(700);
    }
    return null;
  };

  // Pick the Pin or Unpin item from the open tweet menu.
  const findMenuItem = (wantPin) => {
    const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
    if (wantPin) {
      return items.find((el) => /(^|\s)pin/i.test(el.textContent || '') && !/unpin/i.test(el.textContent || '')) || null;
    }
    return items.find((el) => /unpin/i.test(el.textContent || '')) || null;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const action = (CONFIG.action || '').toLowerCase();
  const stats = { action, targetFound: false, menuOpened: false, done: false, errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📌 PIN TWEET - XActions                                 ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  try {
    const host = window.location.hostname;
    if (!/(^|\.)x\.com$/.test(host) && !/(^|\.)twitter\.com$/.test(host)) {
      log.warning('Not on x.com. Open your profile page, then re-run.');
      return stats;
    }
    if (action !== 'pin' && action !== 'unpin') {
      log.error(`CONFIG.action must be "pin" or "unpin". Got "${CONFIG.action}".`);
      return stats;
    }

    // Resolve the target article.
    let article = null;
    const statusId = extractStatusId(CONFIG.tweetUrl);

    if (statusId) {
      log.info(`Target status id: ${statusId}`);
      article = await findArticleById(statusId);
      if (!article) {
        log.error(`Tweet ${statusId} not found on this page. Open its status page or your profile and re-run.`);
        stats.errors++;
        return stats;
      }
    } else {
      article = document.querySelector(SELECTORS.article);
      if (!article) {
        log.error('No tweet found on this page. Open your profile (x.com/YOUR_USERNAME) and re-run.');
        stats.errors++;
        return stats;
      }
      log.info('No tweetUrl set. Using the first tweet on the page.');
    }
    stats.targetFound = true;

    const preview = (article.querySelector(SELECTORS.tweetText)?.textContent || '').slice(0, 60);
    const ctx = article.querySelector(SELECTORS.socialContext)?.textContent || '';
    const isPinned = /pinned/i.test(ctx);
    log.info(`Target: "${preview}${preview.length >= 60 ? '...' : ''}"`);

    // Guard against no-op actions.
    if (action === 'unpin' && !isPinned && !statusId) {
      log.warning('The first tweet is not marked pinned. Nothing to unpin.');
      return stats;
    }
    if (action === 'pin' && isPinned) {
      log.success('This tweet is already pinned. Nothing to do.');
      stats.done = true;
      return stats;
    }

    if (CONFIG.dryRun) {
      log.warning(`DRY RUN. Would ${action} this tweet. Set CONFIG.dryRun = false to do it.`);
      return stats;
    }

    const caret = article.querySelector(SELECTORS.caret);
    if (!caret) {
      log.error('Tweet menu (caret) button not found on the target tweet.');
      stats.errors++;
      return stats;
    }
    caret.scrollIntoView({ block: 'center' });
    await sleep(300);
    caret.click();
    await sleep(800);
    stats.menuOpened = true;

    const item = findMenuItem(action === 'pin');
    if (!item) {
      log.error(`"${action === 'pin' ? 'Pin' : 'Unpin'}" option not found in the menu. Is this your own tweet?`);
      document.body.click();
      stats.errors++;
      return stats;
    }
    item.click();
    await sleep(800);

    // Pinning shows a confirmation sheet; unpin sometimes does too.
    const confirm = await waitForSelector(SELECTORS.confirm, 2500);
    if (confirm) {
      confirm.click();
      await sleep(800);
    }

    stats.done = true;
    log.success(`Tweet ${action === 'pin' ? 'pinned' : 'unpinned'}.`);
  } catch (error) {
    log.error(`Error: ${error.message}`);
    stats.errors++;
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 PIN TWEET - COMPLETE                                 ║
╠══════════════════════════════════════════════════════════╣
║  🎯 Action:            ${String(stats.action).padEnd(32)}║
║  🔎 Target found:      ${String(stats.targetFound).padEnd(32)}║
║  ✅ Done:              ${String(stats.done).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
