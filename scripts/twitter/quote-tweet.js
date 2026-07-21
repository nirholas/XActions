// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔁 Quote Tweet - XActions
 * ============================================
 *
 * @name         quote-tweet
 * @description  Quote-tweet the post you are currently viewing with your own text.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Open the tweet you want to quote (its status page, e.g.
 *      x.com/someone/status/1234567890123456789)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   While viewing a tweet, set CONFIG.text = "This is the take of the day 💯" and
 *   dryRun = true to preview. Flip dryRun = false: the script clicks Repost,
 *   chooses Quote, types your text, and posts the quote.
 *
 * ============================================
 */

(async function quoteTweet() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // The text of your quote tweet.
    text: 'This is the take of the day 💯',

    // Preview only: log what would happen without posting.
    dryRun: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    article: 'article[data-testid="tweet"]',
    retweet: '[data-testid="retweet"]',
    unretweet: '[data-testid="unretweet"]',
    composer: '[data-testid="tweetTextarea_0"]',
    postButton: '[data-testid="tweetButton"]',
    postButtonInline: '[data-testid="tweetButtonInline"]',
    close: '[data-testid="app-bar-close"]',
    confirmDiscard: '[data-testid="confirmationSheetConfirm"]'
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

  // Find the "Quote" item in the repost dropdown menu (locale note: matches the
  // English label; on other locales pick the second menu item).
  const findQuoteMenuItem = () => {
    const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
    const byText = items.find((el) => /quote/i.test(el.textContent || ''));
    if (byText) return byText;
    // Fallback: the repost menu is [Repost, Quote]; take the last item.
    return items.length >= 2 ? items[items.length - 1] : null;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = { typed: false, posted: false, errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔁 QUOTE TWEET - XActions                               ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  try {
    const host = window.location.hostname;
    if (!/(^|\.)x\.com$/.test(host) && !/(^|\.)twitter\.com$/.test(host)) {
      log.warning('Not on x.com. Open the tweet you want to quote, then re-run.');
      return stats;
    }
    if (!/\/status\/\d+/.test(window.location.pathname)) {
      log.warning('Open the target tweet\'s status page first (x.com/<user>/status/<id>), then re-run.');
      return stats;
    }
    if (!CONFIG.text || !CONFIG.text.trim()) {
      log.error('CONFIG.text is empty. Set your quote text.');
      return stats;
    }

    // Use the primary (top) article on the status page.
    const article = document.querySelector(SELECTORS.article);
    if (!article) {
      log.error('Tweet article not found on this page.');
      stats.errors++;
      return stats;
    }

    if (article.querySelector(SELECTORS.unretweet)) {
      log.info('You have already reposted this tweet. A quote will still be posted as a new tweet.');
    }

    const rtBtn = article.querySelector(SELECTORS.retweet) || article.querySelector(SELECTORS.unretweet);
    if (!rtBtn) {
      log.error('Repost button not found on the target tweet.');
      stats.errors++;
      return stats;
    }

    if (CONFIG.dryRun) {
      log.warning('DRY RUN. Nothing posted. Set CONFIG.dryRun = false to post for real.');
      log.info(`Would quote with: "${CONFIG.text.slice(0, 80)}${CONFIG.text.length > 80 ? '...' : ''}"`);
      return stats;
    }

    rtBtn.click();
    await sleep(900);

    const quoteItem = findQuoteMenuItem();
    if (!quoteItem) {
      log.error('Quote option not found in the repost menu.');
      document.body.click();
      stats.errors++;
      return stats;
    }
    quoteItem.click();
    await sleep(1500);

    const composer = await waitForSelector(SELECTORS.composer, 6000);
    if (!composer) {
      log.error('Quote composer did not open.');
      stats.errors++;
      return stats;
    }

    await typeIntoComposer(composer, CONFIG.text);
    stats.typed = true;
    log.success('Quote text typed.');

    await sleep(400);
    const postBtn =
      document.querySelector(SELECTORS.postButton) ||
      document.querySelector(SELECTORS.postButtonInline);
    if (!postBtn) {
      log.error('Post button not found. Text is typed. Click Post manually.');
      stats.errors++;
      return stats;
    }
    if (postBtn.getAttribute('aria-disabled') === 'true' || postBtn.disabled) {
      log.error('Post button is disabled (empty or over the character limit).');
      stats.errors++;
      return stats;
    }

    postBtn.click();
    await sleep(2500);

    const stillOpen = document.querySelector(SELECTORS.composer);
    const openText = stillOpen ? (stillOpen.textContent || '').trim() : '';
    if (!stillOpen || openText.length === 0) {
      stats.posted = true;
      log.success(`Quote posted: "${CONFIG.text.slice(0, 60)}${CONFIG.text.length > 60 ? '...' : ''}"`);
    } else {
      log.warning('Composer still open. The quote may not have posted. Check the page.');
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
║  📊 QUOTE TWEET - COMPLETE                               ║
╠══════════════════════════════════════════════════════════╣
║  ⌨️  Text typed:        ${String(stats.typed).padEnd(32)}║
║  ✅ Posted:            ${String(stats.posted).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
