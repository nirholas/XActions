// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        schedulePosts.js
 * @title       Schedule Posts
 * @description Queue one or more posts in X's native scheduler, setting each date and time in the Schedule dialog, dry run by default.
 * @category    post
 * @page        x.com/home or x.com/compose/post
 * @writes      true
 * @aliases     scripts/schedulePosts.js, scripts/twitter/schedule-post.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Schedule Posts on X - by nichxbt
// https://github.com/nirholas/xactions
// Queue multiple posts to be published at specified times
// 1. Go to x.com
// 2. Open the Developer Console (F12)
// 3. Edit the posts array below. Each post takes { text, scheduledFor: 'YYYY-MM-DDTHH:MM' }
//    (local time) or { text, date: 'YYYY-MM-DD', time: 'HH:MM' }.
//    dryRun is ON by default and only lists the queue: set dryRun = false to schedule.
// 4. Paste browser/schedulePosts.js into the Developer Console and run it
//
// X native scheduling may need X Premium. After the Schedule dialog is confirmed,
// scheduled posts appear under the composer's "Unsent posts" tab.
//
// Last Updated: 27 November 2026
(() => {
  const CONFIG = {
    posts: [
      // Add your scheduled posts here
      // { text: 'Hello world!', scheduledFor: '2026-02-25T10:00:00' },
      // { text: 'Another post!', date: '2026-02-25', time: '14:00' },
    ],
    // Use X's native scheduling via compose dialog
    useNativeScheduler: true,
    retryOnFailure: true,
    dryRun: true,          // Preview only: list the queue without opening the composer. Set false to schedule.
    delay: 3000,           // ms between scheduling each post
    maxLength: 0,          // Fail posts longer than this many characters (0 = no check; 280 for non-Premium)
  };

  const $composeButton = '[data-testid="SideNav_NewTweet_Button"]';
  const $tweetInput = '[data-testid="tweetTextarea_0"]';
  const $scheduleButton = '[data-testid="scheduleOption"]';
  const $scheduleAria = '[aria-label="Schedule post"], [aria-label="Schedule"]';
  const $scheduleDateInput = '[data-testid="scheduledDateField"]';
  const $scheduleTimeInput = '[data-testid="scheduledTimeField"]';
  const $scheduleConfirm = '[data-testid="scheduledConfirmationPrimaryAction"]';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const results = { scheduled: [], failed: [] };

  const typeText = async (element, text) => {
    element.focus();

    // Simulate keyboard input
    for (const char of text) {
      const event = new InputEvent('beforeinput', {
        data: char,
        inputType: 'insertText',
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      await sleep(30);
    }

    // Also try document.execCommand as fallback
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) {
      element.textContent = text;
      element.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
    }
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

  // Find a select inside the dialog by its aria-label or id (case-insensitive contains).
  const findSelectByLabel = (root, label) => {
    const selects = Array.from(root.querySelectorAll('select'));
    const l = label.toLowerCase();
    return selects.find((s) => {
      const aria = (s.getAttribute('aria-label') || '').toLowerCase();
      const id = (s.getAttribute('id') || '').toLowerCase();
      return aria.includes(l) || id.includes(l);
    }) || null;
  };

  // Accept { scheduledFor } or { date, time }
  const whenOf = (post) => post.scheduledFor || (post.date ? `${post.date}T${post.time || '00:00'}` : '');

  const pad2 = (n) => String(n).padStart(2, '0');

  // Set the date and time in the Schedule dialog: month/day/year/hour/minute/AM-PM
  // selects, or the scheduledDateField/scheduledTimeField text fields.
  const setDateTime = async (schedDate) => {
    const monthName = MONTHS[schedDate.getMonth()];
    const day = String(schedDate.getDate());
    const year = String(schedDate.getFullYear());
    let hour12 = schedDate.getHours() % 12;
    if (hour12 === 0) hour12 = 12;
    const minute = pad2(schedDate.getMinutes());
    const ampm = schedDate.getHours() < 12 ? 'AM' : 'PM';

    const dialog = document.querySelector('[role="dialog"]') || document;
    const selects = Array.from(dialog.querySelectorAll('select'));
    if (selects.length > 0) {
      // Prefer aria-label matching; fall back to positional order.
      const monthSel = findSelectByLabel(dialog, 'month') || selects[0];
      const daySel = findSelectByLabel(dialog, 'day') || selects[1];
      const yearSel = findSelectByLabel(dialog, 'year') || selects[2];
      const hourSel = findSelectByLabel(dialog, 'hour') || selects[3];
      const minSel = findSelectByLabel(dialog, 'minute') || selects[4];
      const ampmSel = findSelectByLabel(dialog, 'am') || findSelectByLabel(dialog, 'pm') || selects[5];

      const setOk = [
        ['Month', setSelectByText(monthSel, monthName)],
        ['Day', setSelectByText(daySel, day)],
        ['Year', setSelectByText(yearSel, year)],
        ['Hour', setSelectByText(hourSel, String(hour12))],
        ['Minute', setSelectByText(minSel, minute)],
        ['AM/PM', setSelectByText(ampmSel, ampm)],
      ];
      await sleep(500);
      const failed = setOk.filter(([, ok]) => !ok).map(([name]) => name);
      if (failed.length > 0) {
        console.warn(`   ⚠️ Could not set: ${failed.join(', ')}. Adjust those fields by hand before confirming.`);
      }
      return failed.length === 0;
    }

    // Text-field variant of the dialog
    const date = `${year}-${pad2(schedDate.getMonth() + 1)}-${pad2(schedDate.getDate())}`;
    const time = `${pad2(schedDate.getHours())}:${minute}`;
    let ok = true;

    const dateInput = document.querySelector($scheduleDateInput);
    if (dateInput) {
      dateInput.click();
      await sleep(300);
      dateInput.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, date);
      await sleep(500);
    } else {
      console.warn('   ⚠️ Date picker not found - set date manually');
      ok = false;
    }

    const timeInput = document.querySelector($scheduleTimeInput);
    if (timeInput) {
      timeInput.click();
      await sleep(300);
      timeInput.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, time);
      await sleep(500);
    } else {
      console.warn('   ⚠️ Time picker not found - set time manually');
      ok = false;
    }
    return ok;
  };

  // Returns a reason string when the post cannot be scheduled
  const validate = (post) => {
    if (!post.text || !post.text.trim()) return 'text is empty';
    if (CONFIG.maxLength && post.text.length > CONFIG.maxLength) return `text exceeds ${CONFIG.maxLength} chars (${post.text.length})`;
    const schedDate = new Date(whenOf(post));
    if (Number.isNaN(schedDate.getTime())) return `not a valid date/time: "${whenOf(post)}". Use "YYYY-MM-DDTHH:MM"`;
    if (schedDate.getTime() <= Date.now()) return 'scheduled time is in the past';
    return null;
  };

  const schedulePost = async (post) => {
    const { text } = post;
    const schedDate = new Date(whenOf(post));

    console.log(`📝 Scheduling: "${text.substring(0, 40)}..." for ${schedDate.toLocaleString()}`);

    const invalid = validate(post);
    if (invalid) {
      console.error(`❌ Skipped: ${invalid}`);
      results.failed.push(post);
      return;
    }

    try {
      // Open compose
      let textInput = document.querySelector($tweetInput);
      if (!textInput) {
        const composeBtn = document.querySelector($composeButton);
        if (composeBtn) {
          composeBtn.click();
          await sleep(1500);
        }
        textInput = await waitForSelector($tweetInput, 6000);
      }

      // Type the post text
      if (!textInput) {
        console.error('❌ Tweet input not found');
        results.failed.push(post);
        return;
      }

      await typeText(textInput, text);
      await sleep(500);

      if (CONFIG.useNativeScheduler) {
        // Click the schedule icon
        const schedBtn = document.querySelector($scheduleButton) || document.querySelector($scheduleAria);
        if (schedBtn) {
          schedBtn.click();
          await sleep(1500);

          // Set date and time
          const dateTimeSet = await setDateTime(schedDate);

          // Confirm schedule
          const confirmBtn = await waitForSelector($scheduleConfirm, 3000);
          if (confirmBtn) {
            confirmBtn.click();
            results.scheduled.push(post);
            console.log(`✅ Scheduled for ${schedDate.toLocaleString()}${dateTimeSet ? '' : ' (check the date/time fields that could not be set)'}`);
          } else {
            console.warn('⚠️ Confirm button not found - review the dialog and confirm manually');
            results.failed.push(post);
          }
        } else {
          console.warn('⚠️ Native scheduler not available (Premium feature)');
          results.failed.push(post);
        }
      }

      await sleep(1000);
    } catch (e) {
      console.error(`❌ Failed to schedule: ${e.message}`);
      results.failed.push(post);
    }
  };

  const run = async () => {
    console.log('📅 SCHEDULE POSTS - XActions by nichxbt');

    const host = window.location.hostname;
    if (!/(^|\.)x\.com$/.test(host) && !/(^|\.)twitter\.com$/.test(host)) {
      console.warn('⚠️ Not on x.com. Open x.com/home, then re-run.');
      return;
    }

    if (CONFIG.posts.length === 0) {
      console.log('❌ No posts to schedule! Edit CONFIG.posts array.');
      console.log('\nExample:');
      console.log('  posts: [');
      console.log('    { text: "Hello world!", scheduledFor: "2026-02-25T10:00:00" },');
      console.log('    { text: "Another post!", date: "2026-02-25", time: "14:00" },');
      console.log('  ]');
      return;
    }

    // Sort posts by scheduled time
    const sorted = [...CONFIG.posts].sort(
      (a, b) => new Date(whenOf(a)) - new Date(whenOf(b))
    );

    console.log(`📋 Posts to schedule: ${sorted.length}`);
    sorted.forEach((p, i) => {
      const invalid = validate(p);
      console.log(`   ${i + 1}. ${new Date(whenOf(p)).toLocaleString()} - "${(p.text || '').substring(0, 40)}..."${invalid ? ` ⚠️ ${invalid}` : ''}`);
    });
    console.log('');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually schedule');
      return;
    }

    for (let i = 0; i < sorted.length; i++) {
      await schedulePost(sorted[i]);
      if (i < sorted.length - 1) await sleep(CONFIG.delay);
    }

    console.log('\n📊 RESULTS:');
    console.log(`   ✅ Scheduled: ${results.scheduled.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    if (results.scheduled.length > 0) {
      console.log('💡 Scheduled posts appear under the composer\'s "Unsent posts" tab.');
    }
  };

  run();
})();
