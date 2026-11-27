// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        postThread.js
 * @title       Post Thread
 * @description Compose and post a thread of connected tweets in one pass, with length checks and a dry run by default.
 * @category    post
 * @page        x.com/home or x.com/compose/post
 * @writes      true
 * @aliases     scripts/postThread.js, scripts/twitter/post-thread.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Post Thread on X - by nichxbt
// https://github.com/nirholas/xactions
// Compose and post a thread of connected tweets
// 1. Go to x.com (or x.com/compose/post)
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG.thread array below. dryRun: true only validates and lists
//    the tweets; set dryRun = false to post. autoNumber prefixes "1/N".
// 4. Paste browser/postThread.js into the Developer Console and run it
//
// Last Updated: 27 November 2026
(() => {
  const CONFIG = {
    thread: [
      // Add your thread posts here (in order)
      // 'First tweet in the thread 🧵',
      // 'Second tweet continues the thought...',
      // 'Final tweet wraps it up!',
    ],
    autoNumber: false, // Prepend "1/N " numbering to each tweet
    maxChars: 280,     // Refuse to post when a tweet is longer than this
    delayBetweenTweets: 2000,
    dryRun: true, // Set to false to actually post
  };

  const $composeButton = '[data-testid="SideNav_NewTweet_Button"]';
  const $tweetInput = '[data-testid="tweetTextarea_0"]';
  const $addThreadButton = '[data-testid="addButton"]'; // The "+" button to add another tweet
  const $tweetButton = '[data-testid="tweetButtonInline"]';
  const $tweetAllButton = '[data-testid="tweetButton"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const typeIntoInput = async (input, text) => {
    input.focus();
    await sleep(100);
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) {
      // Fallback when execCommand is refused: dispatch real input events
      input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true, cancelable: true }));
      input.textContent = text;
      input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
    }
    await sleep(200);
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

  const stats = { total: 0, typed: 0, posted: false, errors: 0 };

  const printSummary = () => {
    console.log(`\n📊 Thread: ${stats.total} tweets | Typed: ${stats.typed} | Posted: ${stats.posted} | Errors: ${stats.errors}`);
  };

  const run = async () => {
    console.log('🧵 POST THREAD - XActions by nichxbt');

    const host = window.location.hostname;
    if (!/(^|\.)x\.com$/.test(host) && !/(^|\.)twitter\.com$/.test(host)) {
      console.warn('⚠️ Not on x.com. Open x.com/compose/post, then re-run.');
      return;
    }

    const raw = CONFIG.thread.map(t => (t || '').trim()).filter(Boolean);

    if (raw.length === 0) {
      console.log('❌ No thread content! Edit CONFIG.thread array.');
      console.log('\nExample:');
      console.log('  thread: [');
      console.log('    "First tweet in the thread 🧵",');
      console.log('    "Second tweet continues...",');
      console.log('    "Final tweet! 🎉",');
      console.log('  ]');
      return;
    }

    const thread = raw.map((t, i) => (CONFIG.autoNumber ? `${i + 1}/${raw.length} ${t}` : t));
    stats.total = thread.length;

    // Validate character counts
    const invalid = thread.filter((t, i) => {
      if (t.length > CONFIG.maxChars) {
        console.error(`❌ Tweet ${i + 1} exceeds ${CONFIG.maxChars} chars (${t.length})`);
        return true;
      }
      return false;
    });

    if (invalid.length > 0) {
      console.error('Fix the above tweets before posting.');
      return;
    }

    console.log(`📋 Thread: ${thread.length} tweets`);
    thread.forEach((t, i) => {
      console.log(`   ${i + 1}. (${t.length}/${CONFIG.maxChars}) ${t.substring(0, 60)}${t.length > 60 ? '...' : ''}`);
    });

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually post');
      return;
    }

    // Open compose, unless a composer is already open (e.g. on x.com/compose/post)
    let firstInput = document.querySelector($tweetInput);
    if (!firstInput) {
      const composeBtn = document.querySelector($composeButton);
      if (composeBtn) {
        composeBtn.click();
        await sleep(1500);
        firstInput = await waitForSelector($tweetInput, 6000);
      }
    }

    // Type first tweet
    if (!firstInput) {
      console.error('❌ Compose box not found! Try clicking the compose button manually.');
      stats.errors++;
      printSummary();
      return;
    }

    await typeIntoInput(firstInput, thread[0]);
    stats.typed = 1;
    console.log(`✅ Tweet 1/${thread.length} typed`);

    // Add remaining tweets
    for (let i = 1; i < thread.length; i++) {
      await sleep(CONFIG.delayBetweenTweets);

      // Click the "+" button to add next tweet in thread
      const addBtn = document.querySelector($addThreadButton);
      if (!addBtn) {
        console.error(`❌ Could not find add-tweet button for tweet ${i + 1}`);
        stats.errors++;
        break;
      }

      addBtn.click();
      await sleep(1000);

      // Find the new (latest) input field
      const inputs = document.querySelectorAll('[data-testid^="tweetTextarea_"]');
      const newInput = inputs[inputs.length - 1];

      if (!newInput) {
        console.error(`❌ Input field for tweet ${i + 1} not found`);
        stats.errors++;
        break;
      }

      await typeIntoInput(newInput, thread[i]);
      stats.typed++;
      console.log(`✅ Tweet ${i + 1}/${thread.length} typed`);
    }

    // Post the thread
    await sleep(1000);
    const postBtn = document.querySelector($tweetAllButton) || document.querySelector($tweetButton);
    if (!postBtn) {
      console.error('❌ Post button not found. Thread is typed but not posted.');
      console.log('💡 Click "Post all" manually to publish.');
      stats.errors++;
      printSummary();
      return;
    }
    if (postBtn.getAttribute('aria-disabled') === 'true' || postBtn.disabled) {
      console.error('❌ Post button is disabled. Check the composer for an empty or over-limit tweet.');
      stats.errors++;
      printSummary();
      return;
    }

    postBtn.click();
    await sleep(3000);

    // Verify: the composer closes (or empties) once the thread is posted
    const stillOpen = document.querySelector($tweetInput);
    const openText = stillOpen ? (stillOpen.textContent || '').trim() : '';
    if (!stillOpen || openText.length === 0) {
      stats.posted = true;
      console.log(`\n🧵 Thread posted! ${stats.typed} tweets.`);
    } else {
      console.warn('⚠️ Composer still open. The thread may not have posted. Check the page.');
      stats.errors++;
    }
    printSummary();
  };

  run();
})();
