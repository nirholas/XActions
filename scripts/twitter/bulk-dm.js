// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 💬 Bulk DM - XActions
 * ============================================
 *
 * @name         bulk-dm
 * @description  Send a personalized DM to a list of users from one message template.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/messages
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Edit CONFIG.usernames and CONFIG.message at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   usernames: ['jack', 'nichxbt'], message: 'Hey {name}! Loved your recent posts.'
 *   The script opens a new DM to @jack, types the message with {name} filled in
 *   from their display name, sends it, waits, then does @nichxbt. It skips anyone
 *   you already have a conversation with (skipExisting) and stops at maxDMs.
 *
 * ⚠️ Mass DMing can get your account rate-limited or restricted. Keep the list
 *    small, keep delays high, and only message people who want to hear from you.
 *
 * ============================================
 */

(async function bulkDM() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Recipients (with or without the leading @)
    usernames: [
      // 'username1',
      // 'username2',
    ],

    // Message template. Placeholders:
    //   {username} -> the @handle (lowercased, no @)
    //   {name}     -> the recipient's display name (falls back to handle)
    message: `Hey {name}! 👋 Thanks for connecting.`,

    // Safety limits
    maxDMs: 10,            // hard cap on DMs sent this run
    skipExisting: true,    // skip anyone you already have a conversation with

    // Timing (randomized between min and max, per DM)
    minDelay: 25000,       // 25s
    maxDelay: 45000        // 45s
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    newMessageBtn: '[data-testid="NewDM_Button"]',
    searchInput: '[data-testid="searchPeople"]',
    userCell: '[data-testid="UserCell"]',
    typeaheadUser: '[data-testid="TypeaheadUser"]',
    nextButton: '[data-testid="nextButton"]',
    messageInput: '[data-testid="dmComposerTextInput"]',
    sendButton: '[data-testid="dmComposerSendButton"]',
    conversation: '[data-testid="conversation"]'
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

  const fillTemplate = (tpl, username, name) =>
    tpl.split('{username}').join(username).split('{name}').join(name || username);

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} DMs sent`)
  };

  // ============================================
  // 🎯 STATE
  // ============================================
  const stats = { sent: 0, skipped: 0, notFound: 0, errors: 0 };

  // Stop switch: run window.stopBulkDM() from the console to abort after the
  // recipient currently being processed.
  let stopped = false;
  window.stopBulkDM = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current DM, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  💬 BULK DM - XActions                                   ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);
  log.warning('Use responsibly. Mass DMing can get your account restricted.');
  log.info('To stop early: window.stopBulkDM()');

  // Page guard
  if (!/\/messages/.test(window.location.pathname)) {
    log.error('Not on the Messages page. Go to https://x.com/messages and re-run.');
    return stats;
  }

  const recipients = CONFIG.usernames.map(cleanHandle).filter(Boolean);
  if (recipients.length === 0) {
    log.error('CONFIG.usernames is empty. Add at least one handle and re-run.');
    return stats;
  }

  log.info(`Recipients: ${recipients.length}`);
  log.info(`Max DMs this run: ${CONFIG.maxDMs}`);

  // ============================================
  // 📬 SEND ONE DM
  // ============================================
  const sendOne = async (handle) => {
    // Open the new-message composer
    const newBtn = document.querySelector(SELECTORS.newMessageBtn);
    if (!newBtn) {
      log.error('New Message button not found. Make sure the Messages inbox is open.');
      stats.errors++;
      return false;
    }
    newBtn.click();
    await sleep(1500);

    const searchInput = document.querySelector(SELECTORS.searchInput);
    if (!searchInput) {
      log.error('People search box not found.');
      stats.errors++;
      return false;
    }

    // Type the handle (contenteditable-safe via execCommand)
    searchInput.focus();
    document.execCommand('insertText', false, handle);
    await sleep(2200);

    // Match the exact @handle so a prefix like "john" can't select "johnny".
    const cells = document.querySelectorAll(`${SELECTORS.typeaheadUser}, ${SELECTORS.userCell}`);
    const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const handleRe = new RegExp('@' + escaped + '(?![a-zA-Z0-9_])', 'i');
    let matchCell = null;
    for (const cell of cells) {
      if (handleRe.test(cell.textContent)) { matchCell = cell; break; }
    }
    if (!matchCell) {
      log.error(`@${handle} not found in search results.`);
      stats.notFound++;
      return false;
    }

    // Pull the display name for the {name} placeholder before we navigate away.
    let displayName = handle;
    const nameSpan = matchCell.querySelector('span');
    if (nameSpan && nameSpan.textContent.trim()) displayName = nameSpan.textContent.trim();

    matchCell.click();
    await sleep(1200);

    // Some flows require a "Next" click to open the conversation.
    const nextBtn = document.querySelector(SELECTORS.nextButton);
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.click();
      await sleep(1500);
    }

    const msgInput = document.querySelector(SELECTORS.messageInput);
    if (!msgInput) {
      log.error('DM text input not found.');
      stats.errors++;
      return false;
    }

    const message = fillTemplate(CONFIG.message, handle, displayName);
    msgInput.focus();
    document.execCommand('insertText', false, message);
    await sleep(1000);

    const sendBtn = document.querySelector(SELECTORS.sendButton);
    if (!sendBtn || sendBtn.getAttribute('aria-disabled') === 'true' || sendBtn.disabled) {
      log.error(`Send button unavailable for @${handle}. DMs may be closed for this account.`);
      stats.errors++;
      return false;
    }
    sendBtn.click();
    await sleep(1500);

    log.success(`Sent to @${handle} (${displayName})`);
    return true;
  };

  // ============================================
  // 🔁 MAIN LOOP
  // ============================================
  for (let i = 0; i < recipients.length; i++) {
    if (stopped) { log.warning('Stopped by user.'); break; }
    if (stats.sent >= CONFIG.maxDMs) {
      log.warning(`Reached maxDMs (${CONFIG.maxDMs}). Stopping.`);
      break;
    }

    const handle = recipients[i];

    try {
      if (CONFIG.skipExisting) {
        const openConvos = document.querySelectorAll(SELECTORS.conversation);
        const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existsRe = new RegExp('@' + escaped + '(?![a-zA-Z0-9_])', 'i');
        const already = Array.from(openConvos).some(c => existsRe.test(c.textContent));
        if (already) {
          log.info(`Skipping @${handle} (existing conversation).`);
          stats.skipped++;
          continue;
        }
      }

      const ok = await sendOne(handle);
      if (ok) {
        stats.sent++;
        log.progress(stats.sent, Math.min(CONFIG.maxDMs, recipients.length));
      }
    } catch (error) {
      log.error(`Error DMing @${handle}: ${error.message}`);
      stats.errors++;
    }

    // Delay before the next recipient (skip the wait after the final one).
    const more = !stopped && stats.sent < CONFIG.maxDMs && i < recipients.length - 1;
    if (more) {
      log.info(`Waiting before the next DM...`);
      await randomDelay();
    }
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 BULK DM - COMPLETE                                   ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Sent:              ${String(stats.sent).padEnd(32)}║
║  ⏭️  Skipped (exists):  ${String(stats.skipped).padEnd(32)}║
║  ❓ Not found:         ${String(stats.notFound).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
