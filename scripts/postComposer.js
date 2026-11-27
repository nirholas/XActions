// GENERATED FILE: a copy of browser/postComposer.js, written by scripts/build-script-manifest.mjs. Edit browser/postComposer.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 📝 Post Composer - XActions
 * ============================================
 *
 * @name        postComposer.js
 * @title       Post Composer
 * @description Compose and post a tweet, a reply, a thread or a poll from your logged-in session, with a dry run by default.
 * @category    post
 * @page        x.com/home or x.com/compose/post
 * @writes      true
 * @aliases     scripts/postComposer.js, scripts/twitter/post-tweet.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @website     https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/home (or x.com/compose/post)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of browser/postComposer.js
 *   4. Paste this entire script and press Enter
 *
 * Modes (CONFIG.mode):
 *   'tweet'  - post CONFIG.text (or reply with it when CONFIG.replyToUrl is set)
 *   'thread' - post every entry of CONFIG.threadTweets as one thread
 *   'poll'   - post CONFIG.pollQuestion with CONFIG.pollOptions (2 to 4 choices)
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
    // What to post: 'tweet', 'thread' or 'poll'.
    mode: 'tweet',

    // The text to post (max 280 for non-Premium, longer allowed on Premium).
    text: 'gm from XActions 🚀',

    // mode 'thread': one entry per tweet, posted together as one thread.
    threadTweets: [
      '🧵 Thread: Why automation matters (1/3)',
      'Automation saves hours of manual work and lets you focus on what matters: creating great content. (2/3)',
      'Try XActions for free at github.com/nirholas/XActions ⚡ (3/3)'
    ],

    // mode 'poll': the question (the tweet text) and 2 to 4 options.
    pollQuestion: 'What is your favorite programming language?',
    pollOptions: ['JavaScript', 'Python', 'TypeScript', 'Rust'],

    // Optional (mode 'tweet' only): URL of a tweet to reply to. Leave '' to post a standalone tweet.
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
    replyButton: '[data-testid="reply"]',
    addThread: '[data-testid="addButton"]',
    threadTextarea: (i) => `[data-testid="tweetTextarea_${i}"]`,
    addPoll: ['[aria-label="Add poll"]', '[data-testid="pollButton"]'],
    pollOption: (i) => [`[data-testid="pollOption_${i}"]`, `[data-testid="pollOptionTextInput_${i}"]`],
    addPollOption: ['[data-testid="addPollOption"]', '[data-testid="addPollOptionButton"]']
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

  // Return the first element matching any selector in the list.
  const queryFirst = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  // Poll option fields are plain inputs: insertText first, then the native
  // value setter plus an input event so React picks the value up.
  const typeIntoInput = async (el, text) => {
    el.focus();
    await sleep(200);
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted || el.value !== text) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter && el instanceof window.HTMLInputElement) setter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
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
  const mode = ['thread', 'poll'].includes(CONFIG.mode) ? CONFIG.mode : 'tweet';
  const stats = { posted: 0, mode: mode === 'tweet' && CONFIG.replyToUrl ? 'reply' : mode, errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📝 POST COMPOSER - XActions                             ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  try {
    const threadTweets = (CONFIG.threadTweets || []).filter((t) => t && String(t).trim());
    const pollOptions = (CONFIG.pollOptions || []).filter((o) => o && String(o).trim());
    // The text typed into the first composer box for this mode.
    const firstText = mode === 'thread' ? threadTweets[0] : mode === 'poll' ? CONFIG.pollQuestion : CONFIG.text;

    if (mode === 'thread' && threadTweets.length === 0) {
      log.error('CONFIG.threadTweets is empty. Add the tweets of your thread.');
      return stats;
    }
    if (mode === 'poll' && (!CONFIG.pollQuestion || !CONFIG.pollQuestion.trim())) {
      log.error('CONFIG.pollQuestion is empty. Set the poll question.');
      return stats;
    }
    if (mode === 'poll' && (pollOptions.length < 2 || pollOptions.length > 4)) {
      log.error('CONFIG.pollOptions needs 2 to 4 options.');
      return stats;
    }
    if (mode === 'tweet' && (!CONFIG.text || !CONFIG.text.trim())) {
      log.error('CONFIG.text is empty. Set the text you want to post.');
      return stats;
    }

    const host = window.location.hostname;
    if (!/(^|\.)x\.com$/.test(host) && !/(^|\.)twitter\.com$/.test(host)) {
      log.warning('Not on x.com. Open x.com/home or x.com/compose/post, then re-run.');
      return stats;
    }

    log.info(`Mode: ${stats.mode}`);
    if (mode === 'thread') log.info(`Tweets in thread: ${threadTweets.length}`);
    if (mode === 'poll') log.info(`Poll options: ${pollOptions.join(' | ')}`);
    log.info(`Length: ${firstText.length} characters`);

    if (mode !== 'tweet' && CONFIG.replyToUrl) {
      log.warning(`CONFIG.replyToUrl is used in mode 'tweet' only. Ignoring it for mode '${mode}'.`);
    }

    // If replying, navigate to the target tweet and open its reply composer.
    if (mode === 'tweet' && CONFIG.replyToUrl) {
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

    await typeIntoComposer(composer, firstText);
    log.success('Text typed into composer.');

    if (mode === 'thread') {
      for (let i = 1; i < threadTweets.length; i++) {
        const addBtn = document.querySelector(SELECTORS.addThread);
        if (!addBtn) {
          log.error(`Add-tweet button not found at tweet ${i + 1}. Nothing posted.`);
          stats.errors++;
          return stats;
        }
        addBtn.click();
        await sleep(1000);
        const box = await waitForSelector(SELECTORS.threadTextarea(i), 4000);
        if (!box) {
          log.error(`Composer box for tweet ${i + 1} not found. Nothing posted.`);
          stats.errors++;
          return stats;
        }
        await typeIntoComposer(box, threadTweets[i]);
        await sleep(500);
        log.success(`Tweet ${i + 1}/${threadTweets.length} composed.`);
      }
    }

    if (mode === 'poll') {
      const pollBtn = queryFirst(SELECTORS.addPoll);
      if (!pollBtn) {
        log.error('Poll button not found. Nothing posted.');
        stats.errors++;
        return stats;
      }
      pollBtn.click();
      await sleep(1500);
      for (let i = 0; i < pollOptions.length; i++) {
        if (i >= 2) {
          queryFirst(SELECTORS.addPollOption)?.click();
          await sleep(500);
        }
        const optEl = queryFirst(SELECTORS.pollOption(i));
        if (!optEl) {
          log.error(`Poll option ${i + 1} field not found. Nothing posted.`);
          stats.errors++;
          return stats;
        }
        await typeIntoInput(optEl, pollOptions[i]);
      }
      log.success(`Poll with ${pollOptions.length} options filled in.`);
    }

    if (CONFIG.mediaNote) {
      log.warning(`Media note set ("${CONFIG.mediaNote}"). Attach it now.`);
      log.info(`Waiting ${CONFIG.mediaWaitSeconds}s for you to attach media...`);
      await sleep(CONFIG.mediaWaitSeconds * 1000);
    }

    if (CONFIG.dryRun) {
      log.warning('DRY RUN. Nothing posted. Set CONFIG.dryRun = false to post for real.');
      log.info(`Would post ${stats.mode}: "${firstText.slice(0, 80)}${firstText.length > 80 ? '...' : ''}"`);
      return stats;
    }

    await sleep(400);
    // A thread or poll may move into the modal composer, whose button is tweetButton.
    const postBtn = mode === 'tweet'
      ? document.querySelector(SELECTORS.postButtonInline) || document.querySelector(SELECTORS.postButton)
      : document.querySelector(SELECTORS.postButton) || document.querySelector(SELECTORS.postButtonInline);

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
      log.success(`Posted ${stats.mode}: "${firstText.slice(0, 60)}${firstText.length > 60 ? '...' : ''}"`);
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
║  📊 POST COMPOSER - COMPLETE                             ║
╠══════════════════════════════════════════════════════════╣
║  📝 Mode:              ${String(stats.mode).padEnd(32)}║
║  ✅ Posted:            ${String(stats.posted).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
