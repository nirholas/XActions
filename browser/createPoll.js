// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Create Poll on X - by nichxbt
 * https://github.com/nirholas/xactions
 *
 * @name        createPoll.js
 * @title       Create Poll
 * @description Compose and post a poll tweet with 2 to 4 options and a custom duration, dry run by default.
 * @category    post
 * @page        x.com/compose/post or x.com/home
 * @writes      true
 * @aliases     scripts/createPoll.js, scripts/pollCreator.js, scripts/twitter/create-poll.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 *
 * Create a poll tweet programmatically
 * 1. Go to x.com (or x.com/compose/post)
 * 2. Open the Developer Console (F12)
 * 3. Edit the CONFIG below
 * 4. Paste browser/createPoll.js into the Developer Console and run it
 *
 * With dryRun = true it only validates and previews. With dryRun = false it types
 * the question, opens the poll, fills the options, sets the duration and posts.
 * Set autoPost = false to fill the poll and leave the Post click to you.
 *
 * Last Updated: 26 November 2026
 */
(() => {
  const CONFIG = {
    // Poll question (the tweet text). `text` is accepted as an alias.
    question: 'What is your preferred programming language?',
    // Poll options (2-4 choices, max 25 chars each). `choices` is accepted as an alias.
    options: [
      'JavaScript',
      'Python',
      'Rust',
      'Go',
    ],
    // Poll duration: minimum 5 minutes, maximum 7 days in total
    durationDays: 1,
    durationHours: 0,
    durationMinutes: 0,
    // Click Post at the end. false: fill the poll and leave it for you to post.
    autoPost: true,
    dryRun: true,
  };

  const $composeButton = '[data-testid="SideNav_NewTweet_Button"]';
  const $tweetInput = '[data-testid="tweetTextarea_0"]';
  const $pollButton = '[data-testid="pollButton"]';
  const $pollButtonFallback = '[aria-label="Add poll"], [data-testid="createPoll"]';
  const $choiceInput = '[data-testid="choiceInput"]';
  const $pollOption1 = '[data-testid="pollOptionTextInput_0"], [data-testid="pollOption_0"]';
  const $pollOption2 = '[data-testid="pollOptionTextInput_1"], [data-testid="pollOption_1"]';
  const $pollOption3 = '[data-testid="pollOptionTextInput_2"], [data-testid="pollOption_2"]';
  const $pollOption4 = '[data-testid="pollOptionTextInput_3"], [data-testid="pollOption_3"]';
  const $addPollOption = '[data-testid="addPollOptionButton"], [aria-label="Add a choice"], [data-testid="addPollOption"]';
  const $tweetButton = '[data-testid="tweetButton"]';
  const $tweetButtonInline = '[data-testid="tweetButtonInline"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const waitForSelector = async (selector, timeoutMs = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  // Poll option fields are native <input>. Use the native value setter so React
  // picks up the change, then dispatch input. Falls back to execCommand for a
  // contenteditable field.
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

  const findSelectByLabel = (label) => {
    const l = label.toLowerCase();
    return Array.from(document.querySelectorAll('select'))
      .find((s) => (s.getAttribute('aria-label') || '').toLowerCase().includes(l)) || null;
  };

  const optionInputs = [$pollOption1, $pollOption2, $pollOption3, $pollOption4];

  const getOptionInput = (i) => {
    const inputs = document.querySelectorAll($choiceInput);
    if (inputs.length > 0) return inputs[i] || null;
    return document.querySelector(optionInputs[i]);
  };

  const run = async () => {
    console.log('📊 CREATE POLL - XActions by nichxbt');

    const stats = { typed: false, optionsFilled: 0, durationSet: false, posted: false, errors: 0 };

    const host = window.location.hostname;
    if (!/(^|\.)x\.com$/.test(host) && !/(^|\.)twitter\.com$/.test(host)) {
      console.error('❌ Not on x.com. Open x.com/compose/post, then re-run.');
      return stats;
    }

    const question = String(CONFIG.question ?? CONFIG.text ?? '');
    const options = (CONFIG.options ?? CONFIG.choices ?? []).map((o) => String(o || '').trim()).filter(Boolean);

    // Validate
    if (options.length < 2 || options.length > 4) {
      console.error(`❌ Polls need 2-4 options! You provided ${options.length}.`);
      return stats;
    }

    if (!question.trim()) {
      console.error('❌ CONFIG.question is empty. Set the poll question.');
      return stats;
    }

    if (question.length > 280) {
      console.error(`❌ Question too long: ${question.length}/280 chars`);
      return stats;
    }

    for (const opt of options) {
      if (opt.length > 25) {
        console.error(`❌ Option "${opt}" exceeds 25 chars (${opt.length})`);
        return stats;
      }
    }

    const totalMinutes = (CONFIG.durationDays * 24 * 60) + (CONFIG.durationHours * 60) + CONFIG.durationMinutes;
    if (totalMinutes < 5) {
      console.error('❌ Poll duration must be at least 5 minutes.');
      return stats;
    }
    if (totalMinutes > 7 * 24 * 60) {
      console.error('❌ Poll duration cannot exceed 7 days.');
      return stats;
    }

    console.log(`📋 Question: "${question}"`);
    options.forEach((o, i) => console.log(`   ${i + 1}. ${o} (${o.length}/25)`));
    console.log(`   ⏱️ Duration: ${CONFIG.durationDays}d ${CONFIG.durationHours}h ${CONFIG.durationMinutes}m`);

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually post');
      return stats;
    }

    // Open compose (skipped when a composer is already open, e.g. on x.com/compose/post)
    let textInput = document.querySelector($tweetInput);
    if (!textInput) {
      const composeBtn = document.querySelector($composeButton);
      if (composeBtn) {
        composeBtn.click();
        await sleep(1500);
        textInput = await waitForSelector($tweetInput, 6000);
      }
    }

    // Type question
    if (!textInput) {
      console.error('❌ Compose box not found!');
      stats.errors++;
      return stats;
    }
    textInput.focus();
    await sleep(100);
    const inserted = document.execCommand('insertText', false, question);
    if (!inserted) {
      textInput.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: question, bubbles: true, cancelable: true }));
      textInput.textContent = question;
      textInput.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: question, bubbles: true }));
    }
    stats.typed = true;
    await sleep(500);

    // Click poll icon
    const pollBtn = document.querySelector($pollButton) || document.querySelector($pollButtonFallback);
    if (!pollBtn) {
      console.error('❌ Poll button not found! This may require Premium.');
      stats.errors++;
      return stats;
    }
    pollBtn.click();
    await sleep(1000);

    // Fill in options
    for (let i = 0; i < options.length; i++) {
      if (i >= 2) {
        // Need to click "Add option" for options 3 and 4
        const addBtn = document.querySelector($addPollOption);
        if (addBtn) {
          addBtn.click();
          await sleep(500);
        }
      }

      const input = getOptionInput(i);
      if (input) {
        await typeIntoField(input, options[i]);
        stats.optionsFilled++;
        console.log(`  ✅ Option ${i + 1}: "${options[i]}"`);
        await sleep(300);
      } else {
        console.error(`  ❌ Input for option ${i + 1} not found. Fill it by hand.`);
        stats.errors++;
      }
    }

    // Set duration via the Days / Hours / Minutes selects if present
    const daysSel = findSelectByLabel('days');
    const hoursSel = findSelectByLabel('hours');
    const minsSel = findSelectByLabel('minutes');
    if (daysSel || hoursSel || minsSel) {
      const dOk = daysSel ? setSelectByText(daysSel, String(CONFIG.durationDays)) : true;
      const hOk = hoursSel ? setSelectByText(hoursSel, String(CONFIG.durationHours)) : true;
      const mOk = minsSel ? setSelectByText(minsSel, String(CONFIG.durationMinutes)) : true;
      stats.durationSet = dOk && hOk && mOk;
      if (stats.durationSet) console.log('  ✅ Poll duration set.');
      else console.warn('  ⚠️ Some duration fields could not be set. Verify them by hand.');
      await sleep(400);
    } else {
      console.warn('  ⚠️ Duration selects not found. Default (1 day) will be used unless you change it.');
    }

    await sleep(500);

    // Post
    const tweetBtn = document.querySelector($tweetButton) || document.querySelector($tweetButtonInline);
    if (!CONFIG.autoPost) {
      console.log('\n📊 Poll ready to post! Click "Post" or run:');
      console.log('   document.querySelector(\'[data-testid="tweetButton"]\')?.click()');
    } else if (!tweetBtn) {
      console.log('\n⚠️ Tweet button not found. Poll is ready — click Post manually.');
      stats.errors++;
    } else if (tweetBtn.getAttribute('aria-disabled') === 'true' || tweetBtn.disabled) {
      console.error('\n❌ Post button is disabled. Check that every option is filled.');
      stats.errors++;
    } else {
      tweetBtn.click();
      await sleep(2500);
      const stillOpen = document.querySelector($tweetInput);
      const openText = stillOpen ? (stillOpen.textContent || '').trim() : '';
      if (!stillOpen || openText.length === 0) {
        stats.posted = true;
        console.log('\n✅ Poll posted!');
      } else {
        console.warn('\n⚠️ Composer still open. The poll may not have posted. Check the page.');
        stats.errors++;
      }
    }

    console.log(`\n📊 Summary: question typed ${stats.typed}, options filled ${stats.optionsFilled}, duration set ${stats.durationSet}, posted ${stats.posted}, errors ${stats.errors}`);
    return stats;
  };

  run().catch((error) => console.error(`❌ Error: ${error.message}`));
})();
