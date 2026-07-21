// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/createPoll.js
// Browser console script for creating a poll tweet on X/Twitter
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    question: 'What do you think?',
    options: [
      'Option A',
      'Option B',
      'Option C',
    ],
    dryRun: true,  // SET FALSE TO ACTUALLY POST
  };
  // =============================================

  const run = async () => {
    console.log('📊 CREATE POLL — XActions by nichxbt');

    // Validate options count (2-4)
    if (CONFIG.options.length < 2 || CONFIG.options.length > 4) {
      console.error('❌ Polls require 2-4 options!');
      return;
    }

    // Validate question length
    if (CONFIG.question.length > 280) {
      console.error(`❌ Question too long: ${CONFIG.question.length}/280 chars`);
      return;
    }

    // Validate option lengths (max 25 chars each)
    for (const opt of CONFIG.options) {
      if (opt.length > 25) {
        console.error(`❌ Option "${opt}" exceeds 25 chars (${opt.length})`);
        return;
      }
    }

    console.log(`📋 Question: "${CONFIG.question}"`);
    CONFIG.options.forEach((o, i) => console.log(`   ${i + 1}. ${o} (${o.length}/25)`));

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE — Set CONFIG.dryRun = false to actually post');
      return;
    }

    // Open compose dialog
    const composeBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
    if (composeBtn) {
      composeBtn.click();
      await sleep(1500);
    }

    // Type the question
    const textInput = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!textInput) {
      console.error('❌ Compose box not found!');
      return;
    }
    textInput.focus();
    await sleep(100);
    document.execCommand('insertText', false, CONFIG.question);
    await sleep(500);

    // Click poll icon
    const pollBtn = document.querySelector('[aria-label="Add poll"]') ||
                    document.querySelector('[data-testid="pollButton"]');
    if (!pollBtn) {
      console.error('❌ Poll button not found! This may require X Premium.');
      return;
    }
    pollBtn.click();
    await sleep(1000);

    // Fill in poll options
    const optionSelectors = [
      '[data-testid="pollOption_0"]',
      '[data-testid="pollOption_1"]',
      '[data-testid="pollOption_2"]',
      '[data-testid="pollOption_3"]',
    ];

    for (let i = 0; i < CONFIG.options.length; i++) {
      // Options 3 & 4 need the "Add option" button clicked first
      if (i >= 2) {
        const addBtn = document.querySelector('[data-testid="addPollOptionButton"]');
        if (addBtn) {
          addBtn.click();
          await sleep(500);
        }
      }

      const input = document.querySelector(optionSelectors[i]) ||
                    document.querySelector(`[data-testid="pollOptionTextInput_${i}"]`);
      if (input) {
        input.focus();
        await sleep(100);
        document.execCommand('insertText', false, CONFIG.options[i]);
        await sleep(300);
        console.log(`  ✅ Option ${i + 1}: "${CONFIG.options[i]}"`);
      } else {
        console.error(`  ❌ Input for option ${i + 1} not found`);
      }
    }

    // Post the poll
    await sleep(500);
    const tweetBtn = document.querySelector('[data-testid="tweetButton"]');
    if (tweetBtn) {
      tweetBtn.click();
      console.log('\n✅ Poll posted!');
    } else {
      console.log('\n⚠️ Post button not found. Poll is ready — click Post manually.');
    }
  };

  run();
})();
