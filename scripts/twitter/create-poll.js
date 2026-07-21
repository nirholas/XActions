// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 📊 Create Poll - XActions
 * ============================================
 *
 * @name         create-poll
 * @description  Compose and post a poll tweet with 2-4 choices and a custom duration.
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
 *   Set CONFIG.text = "Best chain?", CONFIG.choices = ["Solana","Base","Other"],
 *   and durationDays = 1. With dryRun = true it validates; flip to false and the
 *   script types the question, opens the poll, fills the choices, sets 1 day, Posts.
 *
 * ============================================
 */

(async function createPoll() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // The poll question / tweet text.
    text: 'What should we build next?',

    // 2 to 4 choices, max 25 characters each.
    choices: ['Solana tools', 'Base tools', 'More avatars'],

    // Poll duration. X caps a poll at 7 days total. Minimum is 5 minutes.
    durationDays: 1,
    durationHours: 0,
    durationMinutes: 0,

    // Preview only: validate and log without clicking Post.
    dryRun: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    composer: '[data-testid="tweetTextarea_0"]',
    newTweetButton: 'a[data-testid="SideNav_NewTweet_Button"]',
    addPoll: '[aria-label="Add poll"]',
    addPollFallback: '[data-testid="pollButton"], [data-testid="createPoll"]',
    choiceInput: '[data-testid="choiceInput"]',
    // Older poll option inputs, kept as a fallback.
    legacyChoice: (i) => `[data-testid="pollOption_${i}"], [data-testid="pollOptionTextInput_${i}"]`,
    addChoice: '[data-testid="addPollOptionButton"], [aria-label="Add a choice"], [data-testid="addPollOption"]',
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

  const waitForSelector = async (selector, timeoutMs = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  // Type into a contenteditable composer via a real input dispatch.
  const typeIntoComposer = async (el, text) => {
    el.focus();
    await sleep(150);
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) {
      el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true, cancelable: true }));
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
    }
    await sleep(250);
  };

  // Poll choice fields are native <input>. Use the native value setter so React
  // picks up the change, then dispatch input. Falls back to execCommand for a
  // contenteditable choice field.
  const typeIntoField = async (el, text) => {
    el.focus();
    await sleep(120);
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      const proto = tag === 'input' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const inserted = document.execCommand('insertText', false, text);
      if (!inserted) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
      }
    }
    await sleep(250);
  };

  const setSelectByText = (select, wanted) => {
    if (!select) return false;
    const target = String(wanted).trim().toLowerCase();
    const opts = Array.from(select.options);
    const match =
      opts.find((o) => o.textContent.trim().toLowerCase() === target) ||
      opts.find((o) => o.value.trim().toLowerCase() === target) ||
      opts.find((o) => o.textContent.trim().toLowerCase().startsWith(target));
    if (!match) return false;
    select.value = match.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const findSelectByLabel = (root, label) => {
    const selects = Array.from(root.querySelectorAll('select'));
    const l = label.toLowerCase();
    return selects.find((s) => (s.getAttribute('aria-label') || '').toLowerCase().includes(l)) || null;
  };

  const getChoiceInputs = () => {
    let inputs = Array.from(document.querySelectorAll(SELECTORS.choiceInput));
    if (inputs.length === 0) {
      for (let i = 0; i < 4; i++) {
        const el = document.querySelector(SELECTORS.legacyChoice(i));
        if (el) inputs.push(el);
      }
    }
    return inputs;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = { typed: false, choicesFilled: 0, durationSet: false, posted: false, errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 CREATE POLL - XActions                               ║
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

    const choices = (CONFIG.choices || []).map((c) => (c || '').trim()).filter(Boolean);
    if (choices.length < 2 || choices.length > 4) {
      log.error(`Polls need 2 to 4 choices. You provided ${choices.length}.`);
      return stats;
    }
    const tooLong = choices.filter((c) => c.length > 25);
    if (tooLong.length > 0) {
      log.error(`Each choice must be <= 25 characters. Too long: ${tooLong.join(', ')}`);
      return stats;
    }
    if (!CONFIG.text || !CONFIG.text.trim()) {
      log.error('CONFIG.text is empty. Set the poll question.');
      return stats;
    }

    const totalMinutes = (CONFIG.durationDays * 24 * 60) + (CONFIG.durationHours * 60) + CONFIG.durationMinutes;
    if (totalMinutes < 5) {
      log.error('Poll duration must be at least 5 minutes.');
      return stats;
    }
    if (totalMinutes > 7 * 24 * 60) {
      log.error('Poll duration cannot exceed 7 days.');
      return stats;
    }

    log.info(`Question: "${CONFIG.text}"`);
    choices.forEach((c, i) => log.info(`Choice ${i + 1}: "${c}" (${c.length}/25)`));
    log.info(`Duration: ${CONFIG.durationDays}d ${CONFIG.durationHours}h ${CONFIG.durationMinutes}m`);

    if (CONFIG.dryRun) {
      log.warning('DRY RUN. Nothing posted. Set CONFIG.dryRun = false to post for real.');
      return stats;
    }

    // Open the composer.
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
    stats.typed = true;
    log.success('Question typed.');

    // Open the poll UI.
    const pollBtn =
      document.querySelector(SELECTORS.addPoll) ||
      document.querySelector(SELECTORS.addPollFallback);
    if (!pollBtn) {
      log.error('Poll button not found in the composer toolbar.');
      stats.errors++;
      return stats;
    }
    pollBtn.click();
    await sleep(1200);

    // Fill choices, adding extra slots for choice 3 and 4.
    for (let i = 0; i < choices.length; i++) {
      if (i >= 2) {
        const addBtn = document.querySelector(SELECTORS.addChoice);
        if (addBtn) {
          addBtn.click();
          await sleep(600);
        }
      }
      const inputs = getChoiceInputs();
      const field = inputs[i];
      if (!field) {
        log.warning(`Choice ${i + 1} input not found. Fill it by hand.`);
        continue;
      }
      await typeIntoField(field, choices[i]);
      stats.choicesFilled++;
      log.success(`Choice ${i + 1}: "${choices[i]}"`);
    }

    // Set duration via the Days / Hours / Minutes selects if present.
    const daysSel = findSelectByLabel(document, 'days');
    const hoursSel = findSelectByLabel(document, 'hours');
    const minsSel = findSelectByLabel(document, 'minutes');
    if (daysSel || hoursSel || minsSel) {
      const dOk = daysSel ? setSelectByText(daysSel, String(CONFIG.durationDays)) : true;
      const hOk = hoursSel ? setSelectByText(hoursSel, String(CONFIG.durationHours)) : true;
      const mOk = minsSel ? setSelectByText(minsSel, String(CONFIG.durationMinutes)) : true;
      stats.durationSet = dOk && hOk && mOk;
      if (stats.durationSet) log.success('Poll duration set.');
      else log.warning('Some duration fields could not be set. Verify them by hand.');
      await sleep(400);
    } else {
      log.warning('Duration selects not found. Default (1 day) will be used unless you change it.');
    }

    await sleep(500);
    const postBtn =
      document.querySelector(SELECTORS.postButton) ||
      document.querySelector(SELECTORS.postButtonInline);
    if (!postBtn) {
      log.error('Post button not found. Poll is filled. Click Post manually.');
      stats.errors++;
      return stats;
    }
    if (postBtn.getAttribute('aria-disabled') === 'true' || postBtn.disabled) {
      log.error('Post button is disabled. Check that every choice is filled.');
      stats.errors++;
      return stats;
    }

    postBtn.click();
    await sleep(2500);

    const stillOpen = document.querySelector(SELECTORS.composer);
    const openText = stillOpen ? (stillOpen.textContent || '').trim() : '';
    if (!stillOpen || openText.length === 0) {
      stats.posted = true;
      log.success('Poll posted.');
    } else {
      log.warning('Composer still open. The poll may not have posted. Check the page.');
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
║  📊 CREATE POLL - COMPLETE                               ║
╠══════════════════════════════════════════════════════════╣
║  ⌨️  Question typed:    ${String(stats.typed).padEnd(32)}║
║  📋 Choices filled:    ${String(stats.choicesFilled).padEnd(32)}║
║  ⏱️  Duration set:      ${String(stats.durationSet).padEnd(32)}║
║  ✅ Posted:            ${String(stats.posted).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
