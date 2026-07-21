// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 📅 Schedule Post - XActions
 * ============================================
 *
 * @name         schedule-post
 * @description  Schedule a tweet for a future date/time using X's native scheduler.
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
 *   Set CONFIG.text = "Launch day 🚀" and CONFIG.scheduleISO = "2026-08-01T09:00"
 *   with dryRun = true to preview. Flip dryRun = false: the script types the text,
 *   opens X's Schedule dialog, sets Aug 1 2026 9:00 AM, and confirms the schedule.
 *
 * ============================================
 */

(async function schedulePost() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // The text to schedule.
    text: 'Scheduled with XActions 📅',

    // When to post, as a local date/time. Format: "YYYY-MM-DDTHH:MM" (24-hour).
    // Must be in the future. Example: "2026-08-01T09:00".
    scheduleISO: '2026-08-01T09:00',

    // Preview only: log what would happen without confirming the schedule.
    dryRun: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    composer: '[data-testid="tweetTextarea_0"]',
    newTweetButton: 'a[data-testid="SideNav_NewTweet_Button"]',
    // The clock icon in the composer toolbar that opens the schedule dialog.
    scheduleButton: '[data-testid="scheduleOption"]',
    // Legacy fallbacks for the schedule toolbar affordance.
    createScheduleAria: '[aria-label="Schedule post"], [aria-label="Schedule"]',
    confirmSchedule: '[data-testid="scheduledConfirmationPrimaryAction"]'
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

  // Set a native <select> by matching an option's visible text or value, then
  // dispatch the change event React listens for.
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

  // Find a select inside the dialog by its aria-label (case-insensitive contains).
  const findSelectByLabel = (root, label) => {
    const selects = Array.from(root.querySelectorAll('select'));
    const l = label.toLowerCase();
    return selects.find((s) => {
      const aria = (s.getAttribute('aria-label') || '').toLowerCase();
      const id = (s.getAttribute('id') || '').toLowerCase();
      return aria.includes(l) || id.includes(l);
    }) || null;
  };

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = { typed: false, dialogOpened: false, scheduled: false, errors: 0, when: CONFIG.scheduleISO };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📅 SCHEDULE POST - XActions                             ║
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

    if (!CONFIG.text || !CONFIG.text.trim()) {
      log.error('CONFIG.text is empty. Set the text you want to schedule.');
      return stats;
    }

    const when = new Date(CONFIG.scheduleISO);
    if (Number.isNaN(when.getTime())) {
      log.error(`CONFIG.scheduleISO is not a valid date/time: "${CONFIG.scheduleISO}". Use "YYYY-MM-DDTHH:MM".`);
      return stats;
    }
    if (when.getTime() <= Date.now()) {
      log.error('CONFIG.scheduleISO is in the past. Pick a future date/time.');
      return stats;
    }

    const monthName = MONTHS[when.getMonth()];
    const day = String(when.getDate());
    const year = String(when.getFullYear());
    let hour12 = when.getHours() % 12;
    if (hour12 === 0) hour12 = 12;
    const minute = String(when.getMinutes()).padStart(2, '0');
    const ampm = when.getHours() < 12 ? 'AM' : 'PM';
    log.info(`Scheduling for ${monthName} ${day}, ${year} at ${hour12}:${minute} ${ampm} (local time).`);

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
    log.success('Text typed into composer.');

    if (CONFIG.dryRun) {
      log.warning('DRY RUN. The schedule dialog will not be opened or confirmed.');
      log.info(`Would schedule: "${CONFIG.text.slice(0, 60)}${CONFIG.text.length > 60 ? '...' : ''}" for ${monthName} ${day} ${year}, ${hour12}:${minute} ${ampm}.`);
      return stats;
    }

    // Open the native Schedule dialog.
    const scheduleBtn =
      document.querySelector(SELECTORS.scheduleButton) ||
      document.querySelector(SELECTORS.createScheduleAria);
    if (!scheduleBtn) {
      log.error('Schedule button not found in the composer toolbar.');
      log.error('X native scheduling may be unavailable on this account. Post it now or schedule manually.');
      stats.errors++;
      return stats;
    }
    scheduleBtn.click();
    await sleep(1500);

    // The dialog is a modal with month/day/year and hour/minute/AM-PM selects.
    const dialog = document.querySelector('[role="dialog"]') || document;
    const selects = Array.from(dialog.querySelectorAll('select'));
    if (selects.length === 0) {
      log.error('Schedule dialog selects not found. The scheduler UI did not open as expected.');
      log.error('Set the date/time by hand in the dialog, then confirm.');
      stats.errors++;
      return stats;
    }
    stats.dialogOpened = true;

    // Prefer aria-label matching; fall back to positional order.
    const monthSel = findSelectByLabel(dialog, 'month') || selects[0];
    const daySel = findSelectByLabel(dialog, 'day') || selects[1];
    const yearSel = findSelectByLabel(dialog, 'year') || selects[2];
    const hourSel = findSelectByLabel(dialog, 'hour') || selects[3];
    const minSel = findSelectByLabel(dialog, 'minute') || selects[4];
    const ampmSel = findSelectByLabel(dialog, 'am') || findSelectByLabel(dialog, 'pm') || selects[5];

    const setOk = [];
    setOk.push(['Month', setSelectByText(monthSel, monthName)]);
    setOk.push(['Day', setSelectByText(daySel, day)]);
    setOk.push(['Year', setSelectByText(yearSel, year)]);
    setOk.push(['Hour', setSelectByText(hourSel, String(hour12))]);
    setOk.push(['Minute', setSelectByText(minSel, minute)]);
    setOk.push(['AM/PM', setSelectByText(ampmSel, ampm)]);
    await sleep(500);

    const failed = setOk.filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length > 0) {
      log.warning(`Could not set: ${failed.join(', ')}. Adjust those fields by hand before confirming.`);
    } else {
      log.success('Date and time set in the schedule dialog.');
    }

    // Confirm the schedule.
    const confirm = await waitForSelector(SELECTORS.confirmSchedule, 3000);
    if (!confirm) {
      log.error('Confirm button not found. Review the dialog and click Confirm manually.');
      stats.errors++;
      return stats;
    }
    confirm.click();
    await sleep(1500);
    stats.scheduled = true;
    log.success('Schedule confirmed. Click Post/Schedule in the composer to queue it.');
    log.info('Tip: scheduled posts appear under the composer\'s "Unsent posts" tab.');
  } catch (error) {
    log.error(`Error: ${error.message}`);
    stats.errors++;
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCHEDULE POST - COMPLETE                             ║
╠══════════════════════════════════════════════════════════╣
║  ⌨️  Text typed:        ${String(stats.typed).padEnd(32)}║
║  🗂️  Dialog opened:     ${String(stats.dialogOpened).padEnd(32)}║
║  ✅ Scheduled:         ${String(stats.scheduled).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);
  log.success('Script completed! by nichxbt');
  return stats;
})();
