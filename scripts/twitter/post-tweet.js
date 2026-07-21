// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 📝 Post Tweet - XActions
 * ============================================
 *
 * @name         post-tweet
 * @description  Compose and post a single tweet from your logged-in session.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/home (or x.com/compose/post)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Set CONFIG.text = "gm from XActions 🚀" and leave dryRun = true to preview.
 *   Flip dryRun = false and re-paste to actually post it. The script opens the
 *   composer, types your text with a real input event, clicks Post, and confirms.
 *
 * ============================================
 */

(async function postTweet() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // The text to post (max 280 for non-Premium, longer allowed on Premium).
    text: 'gm from XActions 🚀',

    // Optional: URL of a tweet to reply to. Leave '' to post a standalone tweet.
    // Example: 'https://x.com/nichxbt/status/1234567890123456789'
    replyToUrl: '',

    // Optional note about media. This script types text only; attach any image
    // or video by hand in the composer before it clicks Post. Set a value here
    // (e.g. '1 image') and the script will PAUSE for you to attach it.
    mediaNote: '',

    // Seconds to wait for you to attach media when mediaNote is set.
    mediaWaitSeconds: 15,

    // Preview only: log what would happen without clicking Post.
    dryRun: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    composer: '[data-testid="tweetTextarea_0"]',
    newTweetButton: 'a[data-testid="SideNav_NewTweet_Button"]',
    inlineReply: '[data-testid="tweetTextarea_0"]',
    postButtonInline: '[data-testid="tweetButtonInline"]',
    postButton: '[data-testid="tweetButton"]',
    replyButton: '[data-testid="reply"]'
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

  // Type into X's contenteditable composer with a real input dispatch so React
  // registers the value. focus + execCommand('insertText') is what X's own
  // editor listens for; a plain .textContent assignment does not update state.
  const typeIntoComposer = async (el, text) => {
    el.focus();
    await sleep(150);
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) {
      // Fallback for environments where execCommand is a no-op: dispatch a
      // beforeinput/input pair after setting text on the editable node.
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
  const stats = { posted: 0, mode: CONFIG.replyToUrl ? 'reply' : 'tweet', errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📝 POST TWEET - XActions                                ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  try {
    if (!CONFIG.text || !CONFIG.text.trim()) {
      log.error('CONFIG.text is empty. Set the text you want to post.');
      return stats;
    }

    const host = window.location.hostname;
    if (!/(^|\.)x\.com$/.test(host) && !/(^|\.)twitter\.com$/.test(host)) {
      log.warning('Not on x.com. Open x.com/home or x.com/compose/post, then re-run.');
      return stats;
    }

    log.info(`Mode: ${stats.mode}`);
    log.info(`Length: ${CONFIG.text.length} characters`);

    // If replying, navigate to the target tweet and open its reply composer.
    if (CONFIG.replyToUrl) {
      const onTarget = window.location.href.split('?')[0] === CONFIG.replyToUrl.split('?')[0];
      if (!onTarget) {
        log.warning(`Open the tweet you want to reply to first: ${CONFIG.replyToUrl}`);
        log.warning('Then re-run this script on that page.');
        return stats;
      }
      const replyBtn = document.querySelector(SELECTORS.replyButton);
      if (replyBtn) {
        replyBtn.click();
        await sleep(1200);
      }
    }

    // Open the composer if it is not already present.
    let composer = document.querySelector(SELECTORS.composer);
    if (!composer) {
      const newBtn = document.querySelector(SELECTORS.newTweetButton);
      if (newBtn) {
        newBtn.click();
        composer = await waitForSelector(SELECTORS.composer, 6000);
      }
    }

    if (!composer) {
      log.error('Composer not found. Open x.com/compose/post and re-run.');
      stats.errors++;
      return stats;
    }

    await typeIntoComposer(composer, CONFIG.text);
    log.success('Text typed into composer.');

    if (CONFIG.mediaNote) {
      log.warning(`Media note set ("${CONFIG.mediaNote}"). Attach it now.`);
      log.info(`Waiting ${CONFIG.mediaWaitSeconds}s for you to attach media...`);
      await sleep(CONFIG.mediaWaitSeconds * 1000);
    }

    if (CONFIG.dryRun) {
      log.warning('DRY RUN. Nothing posted. Set CONFIG.dryRun = false to post for real.');
      log.info(`Would post: "${CONFIG.text.slice(0, 80)}${CONFIG.text.length > 80 ? '...' : ''}"`);
      return stats;
    }

    await sleep(400);
    const postBtn =
      document.querySelector(SELECTORS.postButtonInline) ||
      document.querySelector(SELECTORS.postButton);

    if (!postBtn) {
      log.error('Post button not found. Text is typed. Click Post manually.');
      stats.errors++;
      return stats;
    }

    if (postBtn.getAttribute('aria-disabled') === 'true' || postBtn.disabled) {
      log.error('Post button is disabled (empty or over the character limit). Check your text.');
      stats.errors++;
      return stats;
    }

    postBtn.click();
    await sleep(2500);

    // Verify: a successful post clears the composer.
    const stillThere = document.querySelector(SELECTORS.composer);
    const composerText = stillThere ? (stillThere.textContent || '').trim() : '';
    if (!stillThere || composerText.length === 0) {
      stats.posted = 1;
      log.success(`Posted ${stats.mode}: "${CONFIG.text.slice(0, 60)}${CONFIG.text.length > 60 ? '...' : ''}"`);
    } else {
      log.warning('Composer still has text. The post may not have gone through. Check the page.');
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
║  📊 POST TWEET - COMPLETE                                ║
╠══════════════════════════════════════════════════════════╣
║  📝 Mode:              ${String(stats.mode).padEnd(32)}║
║  ✅ Posted:            ${String(stats.posted).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
