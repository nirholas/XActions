// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🧵 Post Thread - XActions
 * ============================================
 *
 * @name         post-thread
 * @description  Compose and post a multi-tweet thread in one pass.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/compose/post
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Set CONFIG.tweets = ["Part 1 🧵", "Part 2", "Part 3, wrap up"] and
 *   dryRun = true to validate lengths. Flip dryRun = false and re-paste: the
 *   script types the first tweet, adds a box per remaining tweet, then Posts all.
 *
 * ============================================
 */

(async function postThread() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Each string is one tweet in the thread, top to bottom.
    tweets: [
      'Thread part 1 🧵',
      'Thread part 2: the details.',
      'Thread part 3: wrap up. Follow for more.'
    ],

    // Prepend "1/N" numbering to each tweet automatically.
    autoNumber: false,

    // Max characters per tweet before the script refuses to post.
    maxChars: 280,

    // Milliseconds to wait after adding each new tweet box.
    delayBetween: 2000,

    // Preview only: validate and log without clicking Post.
    dryRun: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    composer: '[data-testid="tweetTextarea_0"]',
    anyComposer: '[data-testid^="tweetTextarea_"]',
    newTweetButton: 'a[data-testid="SideNav_NewTweet_Button"]',
    addButton: '[data-testid="addButton"]',
    postButton: '[data-testid="tweetButton"]',
    postButtonInline: '[data-testid="tweetButtonInline"]'
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

  // Real input dispatch into X's contenteditable composer.
  const typeIntoComposer = async (el, text) => {
    el.focus();
    await sleep(150);
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) {
      el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true, cancelable: true }));
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
    }
    await sleep(300);
  };

  const waitForSelector = async (selector, timeoutMs = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = { total: 0, typed: 0, posted: false, errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🧵 POST THREAD - XActions                               ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  try {
    const host = window.location.hostname;
    if (!/(^|\.)x\.com$/.test(host) && !/(^|\.)twitter\.com$/.test(host)) {
      log.warning('Not on x.com. Open x.com/compose/post, then re-run.');
      return stats;
    }

    const raw = (CONFIG.tweets || []).map((t) => (t || '').trim()).filter(Boolean);
    if (raw.length === 0) {
      log.error('CONFIG.tweets is empty. Add at least one tweet string.');
      return stats;
    }

    // Apply numbering, then validate lengths.
    const tweets = raw.map((t, i) => (CONFIG.autoNumber ? `${i + 1}/${raw.length} ${t}` : t));
    stats.total = tweets.length;

    let overLimit = false;
    tweets.forEach((t, i) => {
      const status = t.length > CONFIG.maxChars ? '🔴 OVER' : '🟢 OK';
      log.info(`Tweet ${i + 1}/${tweets.length} [${t.length}/${CONFIG.maxChars}] ${status}`);
      if (t.length > CONFIG.maxChars) overLimit = true;
    });

    if (overLimit) {
      log.error(`One or more tweets exceed ${CONFIG.maxChars} characters. Fix them and re-run.`);
      return stats;
    }

    if (CONFIG.dryRun) {
      log.warning('DRY RUN. Nothing posted. Set CONFIG.dryRun = false to post for real.');
      return stats;
    }

    // Open the composer if needed.
    let firstBox = document.querySelector(SELECTORS.composer);
    if (!firstBox) {
      const newBtn = document.querySelector(SELECTORS.newTweetButton);
      if (newBtn) {
        newBtn.click();
        firstBox = await waitForSelector(SELECTORS.composer, 6000);
      }
    }
    if (!firstBox) {
      log.error('Composer not found. Open x.com/compose/post and re-run.');
      stats.errors++;
      return stats;
    }

    await typeIntoComposer(firstBox, tweets[0]);
    stats.typed = 1;
    log.success(`Tweet 1/${tweets.length} typed.`);

    // Add each subsequent tweet via the "+" add button, then type into the newest box.
    for (let i = 1; i < tweets.length; i++) {
      const addBtn = document.querySelector(SELECTORS.addButton);
      if (!addBtn) {
        log.error(`Add-tweet button not found before tweet ${i + 1}. Stopping.`);
        stats.errors++;
        break;
      }
      addBtn.click();
      await sleep(CONFIG.delayBetween);

      const boxes = document.querySelectorAll(SELECTORS.anyComposer);
      const newBox = boxes[boxes.length - 1];
      if (!newBox) {
        log.error(`New composer box not found for tweet ${i + 1}. Stopping.`);
        stats.errors++;
        break;
      }
      await typeIntoComposer(newBox, tweets[i]);
      stats.typed++;
      log.success(`Tweet ${i + 1}/${tweets.length} typed.`);
    }

    await sleep(800);
    const postBtn =
      document.querySelector(SELECTORS.postButton) ||
      document.querySelector(SELECTORS.postButtonInline);
    if (!postBtn) {
      log.error('Post button not found. Thread is typed. Click "Post all" manually.');
      stats.errors++;
      return stats;
    }
    if (postBtn.getAttribute('aria-disabled') === 'true' || postBtn.disabled) {
      log.error('Post button is disabled. Check the composer for an empty or over-limit tweet.');
      stats.errors++;
      return stats;
    }

    postBtn.click();
    await sleep(3000);

    const stillOpen = document.querySelector(SELECTORS.composer);
    const openText = stillOpen ? (stillOpen.textContent || '').trim() : '';
    if (!stillOpen || openText.length === 0) {
      stats.posted = true;
      log.success(`Thread posted: ${stats.typed} tweet(s).`);
    } else {
      log.warning('Composer still open. The thread may not have posted. Check the page.');
      stats.errors++;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    stats.errors++;
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 POST THREAD - COMPLETE                               ║
╠══════════════════════════════════════════════════════════╣
║  🧵 Tweets in thread:  ${String(stats.total).padEnd(32)}║
║  ⌨️  Typed:             ${String(stats.typed).padEnd(32)}║
║  ✅ Posted:            ${String(stats.posted).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
