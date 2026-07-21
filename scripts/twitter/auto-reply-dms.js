// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🤖 Auto Reply DMs - XActions
 * ============================================
 *
 * @name         auto-reply-dms
 * @description  Auto-reply to unread DM conversations with a single message template.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/messages
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Edit CONFIG.message and CONFIG.maxReplies at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   message: 'Thanks for the message! I will get back to you shortly. 🙏'
 *   onlyUnread: true. The script walks your conversation list, opens each unread
 *   thread, types the template, sends it, then moves to the next unread one,
 *   stopping at maxReplies. Set onlyUnread:false to reply to every open thread.
 *
 * ⚠️ Sending the same auto-reply to many threads can look spammy. Keep it short,
 *    human, and low-volume.
 *
 * ============================================
 */

(async function autoReplyDMs() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // The reply to send. {name} is filled from the conversation title.
    message: `Thanks for reaching out! I'll get back to you soon. 🙏`,

    // Safety limits
    maxReplies: 15,        // hard cap on replies sent this run
    onlyUnread: true,      // only reply to conversations marked unread

    // Timing (randomized between min and max, per reply)
    minDelay: 4000,
    maxDelay: 9000,

    // Scrolling the conversation list to load more threads
    maxScrollRounds: 12,
    scrollDelay: 1500
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    conversation: '[data-testid="conversation"]',
    unreadBadge: '[data-testid="unread"]',
    messageInput: '[data-testid="dmComposerTextInput"]',
    sendButton: '[data-testid="dmComposerSendButton"]',
    backButton: '[data-testid="app-bar-back"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const fillTemplate = (tpl, name) => tpl.split('{name}').join(name || 'there');

  // A stable-ish id for a conversation row: its data-testid href or its text.
  const convoKey = (conv) => {
    const link = conv.querySelector('a[href*="/messages/"]');
    if (link) return link.getAttribute('href');
    return (conv.textContent || '').slice(0, 80);
  };

  const isUnread = (conv) => {
    if (conv.querySelector(SELECTORS.unreadBadge)) return true;
    // Fallback: X flags unread rows on the aria attributes of the row.
    return conv.getAttribute('aria-live') === 'polite' && /unread/i.test(conv.getAttribute('aria-label') || '');
  };

  const convoName = (conv) => {
    const span = conv.querySelector('[dir="ltr"] span, span');
    return span ? span.textContent.trim() : '';
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} replies sent`)
  };

  // ============================================
  // 🎯 STATE
  // ============================================
  const stats = { replied: 0, skippedRead: 0, noInput: 0, errors: 0 };
  const handled = new Set();

  // Stop switch: run window.stopAutoReplyDMs() to abort after the current thread.
  let stopped = false;
  window.stopAutoReplyDMs = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current reply, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🤖 AUTO REPLY DMs - XActions                            ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);
  log.info('To stop early: window.stopAutoReplyDMs()');

  // Page guard
  if (!/\/messages/.test(window.location.pathname)) {
    log.error('Not on the Messages page. Go to https://x.com/messages and re-run.');
    return stats;
  }

  log.info(`Only unread: ${CONFIG.onlyUnread}`);
  log.info(`Max replies this run: ${CONFIG.maxReplies}`);

  // ============================================
  // 📬 REPLY IN THE OPEN THREAD
  // ============================================
  const replyInOpenThread = async (name) => {
    // Poll briefly for the composer to render after opening a thread.
    let input = document.querySelector(SELECTORS.messageInput);
    let waited = 0;
    while (!input && waited < 4000) {
      await sleep(400);
      waited += 400;
      input = document.querySelector(SELECTORS.messageInput);
    }
    if (!input) {
      stats.noInput++;
      log.warning(`No composer for "${name}" (they may not allow replies).`);
      return false;
    }

    const message = fillTemplate(CONFIG.message, name);
    input.focus();
    document.execCommand('insertText', false, message);
    await sleep(900);

    const sendBtn = document.querySelector(SELECTORS.sendButton);
    if (!sendBtn || sendBtn.getAttribute('aria-disabled') === 'true' || sendBtn.disabled) {
      stats.noInput++;
      log.warning(`Send button unavailable for "${name}".`);
      return false;
    }
    sendBtn.click();
    await sleep(1200);
    return true;
  };

  // ============================================
  // 🔁 MAIN LOOP
  // ============================================
  let scrollRounds = 0;
  let emptyRounds = 0;

  while (!stopped && stats.replied < CONFIG.maxReplies && scrollRounds < CONFIG.maxScrollRounds) {
    const convos = Array.from(document.querySelectorAll(SELECTORS.conversation));
    if (convos.length === 0) {
      log.warning('No conversations visible. Is the Messages inbox open?');
      break;
    }

    let foundNew = false;

    for (const conv of convos) {
      if (stopped || stats.replied >= CONFIG.maxReplies) break;

      const key = convoKey(conv);
      if (handled.has(key)) continue;
      handled.add(key);
      foundNew = true;

      const name = convoName(conv);

      try {
        if (CONFIG.onlyUnread && !isUnread(conv)) {
          stats.skippedRead++;
          continue;
        }

        conv.click();
        await sleep(1600);

        const ok = await replyInOpenThread(name);
        if (ok) {
          stats.replied++;
          log.success(`Replied to "${name || 'conversation'}"`);
          log.progress(stats.replied, CONFIG.maxReplies);
          await randomDelay();
        }

        // Return to the inbox list so the next row is clickable on narrow layouts.
        const back = document.querySelector(SELECTORS.backButton);
        if (back) {
          back.click();
          await sleep(1000);
        }
      } catch (error) {
        log.error(`Error on "${name}": ${error.message}`);
        stats.errors++;
        const back = document.querySelector(SELECTORS.backButton);
        if (back) { back.click(); await sleep(800); }
      }
    }

    if (!foundNew) {
      emptyRounds++;
      if (emptyRounds >= 3) {
        log.info('No new conversations after several scrolls. Stopping.');
        break;
      }
    } else {
      emptyRounds = 0;
    }

    // Scroll the conversation list column to load more threads.
    const firstConvo = document.querySelector(SELECTORS.conversation);
    const scroller = firstConvo ? firstConvo.closest('[data-testid="primaryColumn"]') : null;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    else window.scrollTo(0, document.body.scrollHeight);
    scrollRounds++;
    await sleep(CONFIG.scrollDelay);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 AUTO REPLY DMs - COMPLETE                            ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Replied:           ${String(stats.replied).padEnd(32)}║
║  ⏭️  Skipped (read):    ${String(stats.skippedRead).padEnd(32)}║
║  🚫 No composer:       ${String(stats.noInput).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
