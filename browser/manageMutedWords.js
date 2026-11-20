// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Manage Muted Words on X - by nichxbt
// https://github.com/nirholas/xactions
// Bulk-add or manage muted words for filtering your timeline
// 1. Go to https://x.com/settings/muted_keywords
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Words/phrases to mute
    wordsToMute: [
      // 'crypto scam',
      // 'follow for follow',
      // 'giveaway',
      // 'dm me',
    ],
    // Duration: 'forever', '24h', '7d', '30d'
    duration: 'forever',
    // Mute from: 'everyone' or 'people_you_dont_follow'
    muteFrom: 'everyone',
    actionDelay: 2000,
    dryRun: true,
  };

  const $addMutedWord = '[data-testid="addMutedWord"]';
  const $mutedWordInput = 'input[name="keyword"]';
  const $saveButton = '[data-testid="settingsSave"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const results = { muted: [], failed: [] };

  const run = async () => {
    console.log('🔇 MANAGE MUTED WORDS - XActions by nichxbt');

    if (CONFIG.wordsToMute.length === 0) {
      console.error('❌ No words to mute! Edit CONFIG.wordsToMute array.');
      return;
    }

    console.log(`📋 Words to mute: ${CONFIG.wordsToMute.length}`);
    CONFIG.wordsToMute.forEach((w, i) => console.log(`   ${i + 1}. "${w}"`));
    console.log(`   ⏱️ Duration: ${CONFIG.duration}`);
    console.log(`   👤 From: ${CONFIG.muteFrom}`);

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually mute');
      return;
    }

    if (!window.location.href.includes('/muted_keywords') && !window.location.href.includes('/muted')) {
      console.error('❌ Navigate to x.com/settings/muted_keywords first!');
      return;
    }

    for (const word of CONFIG.wordsToMute) {
      try {
        // Click "+" or "Add" button
        const addBtn = document.querySelector($addMutedWord);
        if (addBtn) {
          addBtn.click();
          await sleep(1000);
        }

        // Type the word
        const input = document.querySelector($mutedWordInput);
        if (!input) {
          console.error('❌ Muted word input not found');
          results.failed.push(word);
          continue;
        }

        input.focus();
        input.value = '';
        document.execCommand('insertText', false, word);
        await sleep(500);

        // Set duration (click appropriate radio/option)
        const durationOptions = document.querySelectorAll('[role="radio"], [role="option"]');
        for (const opt of durationOptions) {
          const text = opt.textContent.toLowerCase();
          if (
            (CONFIG.duration === 'forever' && text.includes('forever')) ||
            (CONFIG.duration === '24h' && text.includes('24')) ||
            (CONFIG.duration === '7d' && text.includes('7')) ||
            (CONFIG.duration === '30d' && text.includes('30'))
          ) {
            opt.click();
            break;
          }
        }
        await sleep(300);

        // Save
        const saveBtn = document.querySelector($saveButton);
        if (saveBtn) {
          saveBtn.click();
          results.muted.push(word);
          console.log(`🔇 Muted: "${word}"`);
        } else {
          results.failed.push(word);
        }

        await sleep(CONFIG.actionDelay);
      } catch (e) {
        results.failed.push(word);
        console.warn(`⚠️ Failed to mute: "${word}"`);
      }
    }

    console.log('\n📊 RESULTS:');
    console.log(`   🔇 Muted: ${results.muted.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
  };

  run();
})();
