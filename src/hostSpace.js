/**
 * ============================================================
 * 🎙️ Host / Start a Space — Production Grade
 * ============================================================
 *
 * @name        hostSpace.js
 * @description Start a new X Space with title, topic, and
 *              optional recording and scheduling configuration.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/home
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 *
 * ⚠️ Hosting Spaces requires a minimum follower count.
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Space Details ────────────────────────────────────────
    title: 'My XActions Space 🎙️',
    topic: '',                       // Optional topic/category
    enableRecording: false,          // Record the Space
    scheduled: false,                // Schedule instead of starting now
    scheduleDate: '',                // ISO string, e.g. '2026-04-01T18:00:00Z'

    // ── Timing ───────────────────────────────────────────────
    navigationDelay: 3000,
    actionDelay: 2000,
    typeCharDelay: 50,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,                    // Set to false to actually create Space
  };

  const SEL = {
    composeButton:  'a[data-testid="SideNav_NewTweet_Button"]',
    spaceButton:    '[data-testid="SpaceButton"]',
    spaceTitle:     '[data-testid="spaceTitle"]',
    spaceTopic:     '[data-testid="spaceTopic"]',
    spaceRecording: '[data-testid="spaceRecording"]',
    scheduleSpace:  '[data-testid="scheduleSpace"]',
    startSpace:     '[data-testid="startSpace"]',
    createSpace:    '[data-testid="createSpace"]',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const typeText = async (element, text) => {
    element.focus();
    for (const char of text) {
      document.execCommand('insertText', false, char);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
      await sleep(CONFIG.typeCharDelay);
    }
  };

  const stats = {
    spaceCreated: false,
    spaceScheduled: false,
    recordingEnabled: false,
    startTime: Date.now(),
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🎙️ HOST / START A SPACE' + ' '.repeat(W - 27) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually create');
    }

    console.log(`📋 Title: "${CONFIG.title}"`);
    if (CONFIG.topic) console.log(`📋 Topic: "${CONFIG.topic}"`);
    if (CONFIG.scheduled) console.log(`📅 Scheduled: ${CONFIG.scheduleDate || 'not set'}`);
    console.log(`🎙️ Recording: ${CONFIG.enableRecording}`);

    const sessionKey = 'xactions_hostSpace';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    // Step 1: Open the compose menu to find Spaces option
    console.log('🔄 Opening compose menu...');
    const composeBtn = await waitForSelector(SEL.composeButton);
    if (composeBtn) {
      if (!CONFIG.dryRun) {
        composeBtn.click();
        await sleep(CONFIG.actionDelay);
      }
    }

    // Step 2: Look for Space creation button
    console.log('🔄 Looking for Spaces option...');
    let spaceBtn = await waitForSelector(SEL.spaceButton, 5000);

    if (!spaceBtn) {
      // Try alternative: look for Spaces in the compose modal or sidebar
      console.log('🔍 Trying alternative Spaces entry points...');
      const altSelectors = [
        '[aria-label="Spaces"]',
        'a[href*="/spaces"]',
        '[data-testid="Spaces_Pill"]',
      ];
      for (const sel of altSelectors) {
        spaceBtn = $(sel);
        if (spaceBtn) break;
      }
    }

    if (!spaceBtn) {
      console.log('❌ Could not find Spaces button');
      console.log('💡 Make sure your account has access to host Spaces');
      console.log('💡 You may need a minimum number of followers');
      return;
    }

    if (!CONFIG.dryRun) {
      spaceBtn.click();
      await sleep(CONFIG.navigationDelay);
    }
    console.log('✅ Opened Space creation dialog');

    // Step 3: Set the Space title
    if (CONFIG.title) {
      console.log('✍️ Setting Space title...');
      const titleInput = await waitForSelector(SEL.spaceTitle, 5000);
      if (titleInput) {
        if (!CONFIG.dryRun) {
          titleInput.focus();
          titleInput.value = '';
          await typeText(titleInput, CONFIG.title);
          await sleep(1000);
        }
        console.log(`✅ Title set: "${CONFIG.title}"`);
      } else {
        // Try generic input fallback
        const inputs = document.querySelectorAll('input[type="text"], textarea');
        if (inputs.length > 0 && !CONFIG.dryRun) {
          await typeText(inputs[0], CONFIG.title);
          await sleep(1000);
        } else {
          console.log('⚠️ Could not find title input');
        }
      }
    }

    // Step 4: Set the topic (if provided)
    if (CONFIG.topic) {
      console.log('✍️ Setting Space topic...');
      const topicInput = await waitForSelector(SEL.spaceTopic, 5000);
      if (topicInput) {
        if (!CONFIG.dryRun) {
          await typeText(topicInput, CONFIG.topic);
          await sleep(1000);
        }
        console.log(`✅ Topic set: "${CONFIG.topic}"`);
      } else {
        console.log('⚠️ Could not find topic input');
      }
    }

    // Step 5: Enable recording if requested
    if (CONFIG.enableRecording) {
      console.log('🔄 Enabling recording...');
      const recordingToggle = await waitForSelector(SEL.spaceRecording, 5000);
      if (recordingToggle) {
        if (!CONFIG.dryRun) {
          recordingToggle.click();
          await sleep(CONFIG.actionDelay);
        }
        stats.recordingEnabled = true;
        console.log('✅ Recording enabled');
      } else {
        console.log('⚠️ Could not find recording toggle');
      }
    }

    // Step 6: Schedule or Start
    if (CONFIG.scheduled) {
      console.log('📅 Scheduling Space...');
      const scheduleBtn = await waitForSelector(SEL.scheduleSpace, 5000);
      if (scheduleBtn) {
        if (!CONFIG.dryRun) {
          scheduleBtn.click();
          await sleep(CONFIG.actionDelay);

          // Set schedule date if there is a date picker
          if (CONFIG.scheduleDate) {
            const dateInput = document.querySelector('input[type="datetime-local"], input[type="date"]');
            if (dateInput) {
              dateInput.value = CONFIG.scheduleDate;
              dateInput.dispatchEvent(new Event('change', { bubbles: true }));
              await sleep(1000);
            }
          }
        }
        stats.spaceScheduled = true;
        console.log('✅ Space scheduled');
      } else {
        console.log('⚠️ Could not find schedule button');
      }
    } else {
      // Start the Space now
      console.log('🚀 Starting Space...');
      const startBtn = await waitForSelector(SEL.startSpace, 5000) ||
                       await waitForSelector(SEL.createSpace, 5000);
      if (startBtn) {
        if (!CONFIG.dryRun) {
          startBtn.click();
          await sleep(CONFIG.navigationDelay);
        }
        stats.spaceCreated = true;
        console.log('✅ Space started!');
      } else {
        console.log('⚠️ Could not find start/create button');
      }
    }

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 HOST SPACE SUMMARY' + ' '.repeat(W - 24) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🎙️ Title: "${CONFIG.title}"`);
    console.log(`✅ Created: ${stats.spaceCreated}`);
    console.log(`📅 Scheduled: ${stats.spaceScheduled}`);
    console.log(`🎙️ Recording: ${stats.recordingEnabled}`);
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
