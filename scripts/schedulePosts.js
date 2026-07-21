// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/schedulePosts.js
// Browser console script for scheduling posts using X/Twitter's native scheduler
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    posts: [
      { text: 'Scheduled post!', date: '2026-03-01', time: '09:00' },
      // { text: 'Another scheduled post', date: '2026-03-02', time: '14:30' },
    ],
    dryRun: true,  // SET FALSE TO ACTUALLY SCHEDULE
    delay: 3000,   // ms between scheduling each post
  };
  // =============================================

  const results = { scheduled: [], failed: [] };

  const typeIntoInput = async (input, text) => {
    input.focus();
    await sleep(100);
    document.execCommand('insertText', false, text);
    await sleep(200);
  };

  const scheduleOnePost = async (post, index, total) => {
    const { text, date, time } = post;
    console.log(`\n📝 [${index + 1}/${total}] Scheduling: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`   📅 ${date} at ${time}`);

    if (text.length > 280) {
      console.error(`   ❌ Text exceeds 280 chars (${text.length})`);
      results.failed.push(post);
      return;
    }

    try {
      // Open compose dialog
      const composeBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
      if (composeBtn) {
        composeBtn.click();
        await sleep(1500);
      }

      // Type the post text
      const textInput = document.querySelector('[data-testid="tweetTextarea_0"]');
      if (!textInput) {
        console.error('   ❌ Compose box not found');
        results.failed.push(post);
        return;
      }

      await typeIntoInput(textInput, text);
      await sleep(500);

      // Click the schedule option
      const schedBtn = document.querySelector('[data-testid="scheduleOption"]');
      if (!schedBtn) {
        console.error('   ❌ Schedule button not found (may require X Premium)');
        results.failed.push(post);
        return;
      }

      schedBtn.click();
      await sleep(1000);

      // Set date
      const dateInput = document.querySelector('[data-testid="scheduledDateField"]');
      if (dateInput) {
        dateInput.click();
        await sleep(300);
        // Clear and type new date
        dateInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, date);
        await sleep(500);
      } else {
        console.warn('   ⚠️ Date picker not found — set date manually');
      }

      // Set time
      const timeInput = document.querySelector('[data-testid="scheduledTimeField"]');
      if (timeInput) {
        timeInput.click();
        await sleep(300);
        timeInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, time);
        await sleep(500);
      } else {
        console.warn('   ⚠️ Time picker not found — set time manually');
      }

      // Confirm the schedule
      const confirmBtn = document.querySelector('[data-testid="scheduledConfirmationPrimaryAction"]');
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(1000);
        results.scheduled.push(post);
        console.log(`   ✅ Scheduled for ${date} at ${time}`);
      } else {
        console.warn('   ⚠️ Confirm button not found — confirm manually');
        results.failed.push(post);
      }

      // Wait before closing / next post
      await sleep(1000);
    } catch (e) {
      console.error(`   ❌ Error: ${e.message}`);
      results.failed.push(post);
    }
  };

  const run = async () => {
    console.log('📅 SCHEDULE POSTS — XActions by nichxbt');

    if (CONFIG.posts.length === 0) {
      console.log('❌ No posts to schedule! Edit CONFIG.posts array.');
      console.log('\nExample:');
      console.log('  posts: [');
      console.log('    { text: "Hello world!", date: "2026-03-01", time: "09:00" },');
      console.log('    { text: "Another post!", date: "2026-03-02", time: "14:30" },');
      console.log('  ]');
      return;
    }

    // Sort by date+time
    const sorted = [...CONFIG.posts].sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );

    console.log(`📋 Posts to schedule: ${sorted.length}`);
    sorted.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.date} ${p.time} — "${p.text.substring(0, 50)}${p.text.length > 50 ? '...' : ''}"`);
    });

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE — Set CONFIG.dryRun = false to actually schedule');
      return;
    }

    for (let i = 0; i < sorted.length; i++) {
      await scheduleOnePost(sorted[i], i, sorted.length);
      if (i < sorted.length - 1) await sleep(CONFIG.delay);
    }

    console.log('\n📊 RESULTS:');
    console.log(`   ✅ Scheduled: ${results.scheduled.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
  };

  run();
})();
