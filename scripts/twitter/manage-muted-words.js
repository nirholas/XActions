// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔇 Manage Muted Words - XActions
 * ============================================
 *
 * @name         manage-muted-words
 * @description  Add, remove, or list your muted words and phrases on X in bulk.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/settings/muted_keywords
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Set CONFIG.action to 'add', 'remove', or 'list', and fill CONFIG.words.
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   action: 'add', words: ['giveaway', 'airdrop scam', 'free nft']. Running it
 *   opens the Add flow for each phrase, applies your mute options, saves, and
 *   waits a randomized delay between adds so you are not rate-limited. Use
 *   action: 'list' first to see what is already muted, or action: 'remove' with
 *   the same words to unmute them. Call window.stopManageMutedWords() to abort.
 *
 * ============================================
 */

(async function manageMutedWords() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // 'add'    -> mute every phrase in `words`
    // 'remove' -> unmute every phrase in `words`
    // 'list'   -> scrape the words you already mute (console + JSON download)
    action: 'list',

    // The words/phrases to add or remove. Ignored for 'list'.
    words: [
      'giveaway',
      'airdrop scam'
    ],

    // Options applied to each word when adding (X's mute settings).
    muteOptions: {
      // 'anyone' (from anyone) or 'follow' (from people you don't follow).
      from: 'anyone',
      // Mute in the Home timeline.
      home: true,
      // Mute in Notifications.
      notifications: true,
      // 'forever', '24h', '7d', or '30d'.
      duration: 'forever'
    },

    // Minimum delay between actions (ms).
    minDelay: 1500,

    // Maximum delay between actions (ms).
    maxDelay: 4000
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    // Entry points into the "Add muted word" flow.
    addLink: 'a[href*="add_muted_keyword"], [data-testid="addMutedWord"]',
    keywordInput: 'input[name="keyword"], [data-testid="mutedKeywordTextInput"]',
    saveButton: '[data-testid="settingsDetailSave"], [data-testid="settingsSave"], [data-testid="Profile_Save_Button"]',
    unmuteButton: '[data-testid="unmuteKeyword"], [data-testid="deleteMutedKeyword"]',
    confirm: '[data-testid="confirmationSheetConfirm"]',
    // Each muted word renders in a settings row.
    row: '[data-testid="cellInnerDiv"], [data-testid="MutedKeyword"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => sleep(
    Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay
  );

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  // Poll for an element to appear (returns element or null).
  const waitFor = async (selector, tries = 8, gap = 500) => {
    for (let i = 0; i < tries; i++) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(gap);
    }
    return null;
  };

  // Set an input value through React's native setter so the change registers.
  const setNativeValue = (el, value) => {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // Click a radio/checkbox/switch whose visible label matches any of `needles`.
  const clickOptionByText = (needles) => {
    const wants = needles.map(n => n.toLowerCase());
    const controls = document.querySelectorAll('[role="radio"], [role="checkbox"], [role="switch"], label');
    for (const ctrl of controls) {
      const txt = (ctrl.textContent || '').trim().toLowerCase();
      if (txt && wants.some(w => txt.includes(w))) {
        ctrl.click();
        return true;
      }
    }
    return false;
  };

  const download = (data, filename) => {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      log.success(`Downloaded ${filename}`);
    } catch (e) {
      log.warning(`Could not trigger download: ${e.message}`);
    }
  };

  // Read the muted words currently rendered in the list.
  const scrapeMutedWords = () => {
    const words = new Set();
    // Muted words each link to their own edit page: /settings/muted_keywords/<id>.
    document.querySelectorAll('a[href*="/settings/muted_keywords/"]').forEach(a => {
      const text = (a.textContent || '').trim();
      if (text) words.add(text);
    });
    // Fallback: settings rows on the muted keywords page.
    if (words.size === 0) {
      document.querySelectorAll(SELECTORS.row).forEach(row => {
        const span = row.querySelector('span');
        const text = (span?.textContent || '').trim();
        if (text && text.length <= 100) words.add(text);
      });
    }
    return Array.from(words);
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = { added: 0, removed: 0, listed: 0, skipped: 0, errors: 0 };

  // Stop switch: run window.stopManageMutedWords() to abort after the current word.
  let stopped = false;
  window.stopManageMutedWords = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current word, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔇 MANAGE MUTED WORDS - XActions                        ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn, do not hard-redirect.
  if (!/muted_keywords/.test(window.location.pathname)) {
    log.warning('Go to x.com/settings/muted_keywords, then run this again.');
    return stats;
  }

  const action = String(CONFIG.action || '').toLowerCase();

  // ---- LIST ----
  if (action === 'list') {
    const words = scrapeMutedWords();
    stats.listed = words.length;
    if (words.length === 0) {
      log.info('No muted words found on this page. If you have some, scroll the list once so they render, then re-run.');
    } else {
      log.success(`You currently mute ${words.length} word(s)/phrase(s):`);
      words.forEach((w, i) => console.log(`   ${i + 1}. "${w}"`));
      download(
        { scrapedAt: new Date().toISOString(), count: words.length, mutedWords: words },
        `xactions-muted-words-${new Date().toISOString().slice(0, 10)}.json`
      );
    }
    console.log(`\n✅ Listed ${stats.listed} muted word(s). by nichxbt`);
    return stats;
  }

  // ---- ADD / REMOVE guardrails ----
  if (action !== 'add' && action !== 'remove') {
    log.error(`Unknown action "${CONFIG.action}". Use 'add', 'remove', or 'list'.`);
    return stats;
  }
  const words = Array.isArray(CONFIG.words) ? CONFIG.words.map(w => String(w).trim()).filter(Boolean) : [];
  if (words.length === 0) {
    log.warning('CONFIG.words is empty. Add the phrases you want to ' + action + '.');
    return stats;
  }
  log.info(`Action: ${action} | ${words.length} word(s)`);
  log.info('To stop early: window.stopManageMutedWords()');

  // ---- ADD ----
  const addWord = async (word) => {
    const addLink = await waitFor(SELECTORS.addLink, 6, 400);
    if (!addLink) throw new Error('Add control not found');
    addLink.click();

    const input = await waitFor(SELECTORS.keywordInput, 10, 400);
    if (!input) throw new Error('Keyword input did not appear');
    input.focus();
    setNativeValue(input, word);
    await sleep(400);

    // Apply mute options (best-effort; X wording varies by build).
    const o = CONFIG.muteOptions || {};
    if (o.from === 'follow') clickOptionByText(["people you don't follow", 'you don’t follow', "don't follow"]);
    else clickOptionByText(['from anyone', 'anyone']);
    if (o.duration && o.duration !== 'forever') {
      const map = { '24h': ['24 hours', '24'], '7d': ['7 days', '7'], '30d': ['30 days', '30'] };
      clickOptionByText(map[o.duration] || ['forever']);
    }
    await sleep(300);

    const saveBtn = await waitFor(SELECTORS.saveButton, 6, 400);
    if (!saveBtn) throw new Error('Save button not found');
    saveBtn.click();
    await sleep(1200);
  };

  // ---- REMOVE ----
  const removeWord = async (word) => {
    const target = word.toLowerCase();
    // Find the row/link for this exact word.
    const links = Array.from(document.querySelectorAll('a[href*="/settings/muted_keywords/"]'));
    let entry = links.find(a => (a.textContent || '').trim().toLowerCase() === target);
    if (!entry) {
      // Fallback to a settings row containing the text.
      entry = Array.from(document.querySelectorAll(SELECTORS.row))
        .find(r => (r.textContent || '').trim().toLowerCase().includes(target));
    }
    if (!entry) return false;

    entry.click();
    const unmute = await waitFor(SELECTORS.unmuteButton, 8, 400);
    if (!unmute) {
      // Some builds show unmute as a button labelled "Unmute word".
      const byText = Array.from(document.querySelectorAll('[role="button"], button'))
        .find(b => (b.textContent || '').trim().toLowerCase().includes('unmute'));
      if (!byText) throw new Error('Unmute control not found');
      byText.click();
    } else {
      unmute.click();
    }
    const confirm = await waitFor(SELECTORS.confirm, 4, 400);
    if (confirm) confirm.click();
    await sleep(1000);
    return true;
  };

  for (const word of words) {
    if (stopped) break;
    try {
      if (action === 'add') {
        await addWord(word);
        stats.added++;
        log.success(`Muted: "${word}" (${stats.added}/${words.length})`);
      } else {
        const ok = await removeWord(word);
        if (ok) {
          stats.removed++;
          log.success(`Unmuted: "${word}" (${stats.removed} removed)`);
        } else {
          stats.skipped++;
          log.warning(`Not in your muted list: "${word}". Skipped.`);
        }
      }
    } catch (error) {
      stats.errors++;
      log.error(`Failed to ${action} "${word}": ${error.message}`);
    }
    if (!stopped) await randomDelay();
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 MANAGE MUTED WORDS - COMPLETE                        ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Added:             ${String(stats.added).padEnd(32)}║
║  🗑️  Removed:           ${String(stats.removed).padEnd(32)}║
║  ⏭️  Skipped:           ${String(stats.skipped).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  return stats;
})();
