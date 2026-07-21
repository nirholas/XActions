// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 💬 Auto Reply Mentions - XActions
 * ============================================
 *
 * @name         auto-reply-mentions
 * @description  Reply to your recent mentions with rotating templates so no @ goes unanswered.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/notifications/mentions
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top: fill in replyTemplates
 *      with your own lines, set maxReplies, adjust the delays.
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   replyTemplates: ['Thanks for the tag!', 'Appreciate you 🙏', 'On it, thanks!']
 *   maxReplies: 8. The script walks your mentions oldest-visible first, opens
 *   each reply composer, types the next template in rotation, posts it, and
 *   waits 3-6s. It skips any mention you have already replied to.
 *   Run window.stopAutoReplyMentions() to halt after the current reply.
 *
 * ============================================
 */

(async function autoReplyMentions() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Reply templates, used in rotation (one per mention). REQUIRED.
    // Keep them generic and friendly, or personalise per your voice.
    replyTemplates: [
      'Thanks for the mention! 🙏',
      'Appreciate you tagging me 🚀',
      'Thanks for reaching out!',
      'Glad you brought this up 💡'
    ],

    // Maximum number of mentions to reply to this run
    maxReplies: 8,

    // Skip mentions you have already replied to in a previous run
    // (tracked in this browser's localStorage)
    skipIfAlreadyReplied: true,

    // Append a random emoji to each reply for variety
    addRandomEmoji: false,

    // Minimum delay between replies (ms)
    minDelay: 3000,

    // Maximum delay between replies (ms)
    maxDelay: 6000,

    // Maximum scroll attempts to find more mentions
    maxScrollAttempts: 20,

    // Stop if no new mentions appear after this many consecutive scrolls
    noNewMentionsThreshold: 4
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    replyButton: '[data-testid="reply"]',
    composer: '[data-testid="tweetTextarea_0"]',
    postButton: '[data-testid="tweetButton"]',
    postButtonInline: '[data-testid="tweetButtonInline"]',
    userName: '[data-testid="User-Name"] a[href^="/"]'
  };

  const STORAGE_KEY = 'xactions_replied_mentions';

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const emojis = ['🔥', '💯', '⚡', '🚀', '👏', '💡', '✨', '🙌', '💪', '🎯'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const scrollDown = () => window.scrollBy(0, window.innerHeight * 0.7);

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} replied`)
  };

  const loadReplied = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      return new Set();
    }
  };

  const saveReplied = (set) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch {
      // localStorage may be unavailable in some contexts; tracking is best-effort.
    }
  };

  const getTweetIdentifier = (tweet) => {
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    return null;
  };

  const getAuthor = (tweet) => {
    const el = tweet.querySelector(SELECTORS.userName);
    return el?.getAttribute('href')?.replace(/^\//, '').split('/')[0] || 'user';
  };

  // Type text into the composer. X uses a contenteditable Draft.js editor, so
  // execCommand('insertText') is the reliable way to enter characters and fire
  // the input events X listens for.
  const typeInto = async (box, text) => {
    box.focus();
    await sleep(200);
    document.execCommand('insertText', false, text);
    await sleep(400);
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    replied: 0,
    skippedAlready: 0,
    skippedNoReplyButton: 0,
    errors: 0
  };

  let templateIndex = 0;
  const nextTemplate = () => {
    let text = CONFIG.replyTemplates[templateIndex % CONFIG.replyTemplates.length];
    templateIndex++;
    if (CONFIG.addRandomEmoji) text += ' ' + pick(emojis);
    return text;
  };

  // Stop switch: run window.stopAutoReplyMentions() to abort after the current reply.
  let stopped = false;
  window.stopAutoReplyMentions = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current reply, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  💬 AUTO REPLY MENTIONS - XActions                       ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn (do not redirect) if not on the mentions timeline.
  if (!/\/notifications\/mentions/.test(window.location.pathname)) {
    log.warning('Go to x.com/notifications/mentions, then run this again.');
    return;
  }

  // Config guard: templates are required and must be non-empty strings.
  const templates = (CONFIG.replyTemplates || []).map(t => (t || '').trim()).filter(Boolean);
  if (templates.length === 0) {
    log.error('CONFIG.replyTemplates is empty. Add at least one reply line and re-run.');
    return;
  }
  CONFIG.replyTemplates = templates;

  const replied = CONFIG.skipIfAlreadyReplied ? loadReplied() : new Set();
  const processedThisRun = new Set();

  log.info(`Max replies: ${CONFIG.maxReplies}`);
  log.info(`Templates: ${CONFIG.replyTemplates.length} | Skip already replied: ${CONFIG.skipIfAlreadyReplied}`);
  log.info('To stop early: window.stopAutoReplyMentions()');

  if (document.querySelector(SELECTORS.tweet) === null) {
    log.warning('No mentions visible yet. Wait for the timeline to load, then re-run.');
    return;
  }

  let scrollAttempts = 0;
  let noNewMentionsCount = 0;

  while (!stopped && stats.replied < CONFIG.maxReplies && scrollAttempts < CONFIG.maxScrollAttempts) {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewMention = false;

    for (const tweet of tweets) {
      if (stopped || stats.replied >= CONFIG.maxReplies) break;

      const tweetId = getTweetIdentifier(tweet);
      if (!tweetId || processedThisRun.has(tweetId)) continue;
      processedThisRun.add(tweetId);
      foundNewMention = true;

      if (CONFIG.skipIfAlreadyReplied && replied.has(tweetId)) {
        stats.skippedAlready++;
        continue;
      }

      const author = getAuthor(tweet);
      const preview = (tweet.querySelector(SELECTORS.tweetText)?.textContent || '').substring(0, 50).replace(/\n/g, ' ');

      try {
        const replyButton = tweet.querySelector(SELECTORS.replyButton);
        if (!replyButton) {
          stats.skippedNoReplyButton++;
          continue;
        }

        replyButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(400);
        replyButton.click();
        await sleep(1500);

        const box = document.querySelector(SELECTORS.composer);
        if (!box) {
          log.warning(`Reply composer did not open for @${author}. Skipping.`);
          document.body.click();
          await sleep(600);
          continue;
        }

        const replyText = nextTemplate();
        await typeInto(box, replyText);

        const postButton = document.querySelector(SELECTORS.postButtonInline) ||
                           document.querySelector(SELECTORS.postButton);
        if (postButton && postButton.getAttribute('aria-disabled') !== 'true') {
          postButton.click();
          stats.replied++;
          replied.add(tweetId);
          if (CONFIG.skipIfAlreadyReplied) saveReplied(replied);
          log.success(`Replied #${stats.replied} to @${author} ("${preview}...") -> "${replyText}"`);
          log.progress(stats.replied, CONFIG.maxReplies);
          await sleep(1500);
          await randomDelay();
        } else {
          log.warning(`Post button unavailable for @${author}. Closing composer.`);
          document.body.click();
          await sleep(600);
        }
      } catch (error) {
        log.error(`Error replying to @${author}: ${error.message}`);
        stats.errors++;
        document.body.click();
        await sleep(800);
      }
    }

    if (!foundNewMention) {
      noNewMentionsCount++;
      if (noNewMentionsCount >= CONFIG.noNewMentionsThreshold) {
        log.warning('No new mentions found after multiple scrolls. Stopping.');
        break;
      }
    } else {
      noNewMentionsCount = 0;
    }

    scrollDown();
    scrollAttempts++;
    log.info(`Scrolling for more mentions... (attempt ${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
    await sleep(1500);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 AUTO REPLY MENTIONS - COMPLETE                       ║
╠══════════════════════════════════════════════════════════╣
║  💬 Replied:              ${String(stats.replied).padEnd(29)}║
║  ⏭️  Skipped (already):   ${String(stats.skippedAlready).padEnd(29)}║
║  🚫 No Reply Button:      ${String(stats.skippedNoReplyButton).padEnd(29)}║
║  ❌ Errors:               ${String(stats.errors).padEnd(29)}║
║  📜 Scroll Attempts:      ${String(scrollAttempts).padEnd(29)}║
╚══════════════════════════════════════════════════════════╝
  `);

  if (stats.replied === 0) {
    log.warning('No replies sent. You may have already replied to everything, or no mentions loaded.');
  }
  log.success('Script completed! by nichxbt');

  return stats;
})();
