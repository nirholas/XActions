/**
 * ============================================================
 * 💬 Group Direct Messages — Production Grade
 * ============================================================
 *
 * @name        groupDM.js
 * @description Create group DM conversations and send messages
 *              to multiple users at once on X/Twitter.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/messages
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below (recipients & message)
 * 4. Paste and run
 *
 * 🎮 CONTROLS:
 *   window.XActions.abort()   — stop the script
 *   window.XActions.status()  — check progress
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Recipients ───────────────────────────────────────────
    recipients: ['user1', 'user2', 'user3'], // Usernames (without @) to add to group
    message: 'Hey everyone! 👋',              // Message to send after creating the group

    // ── Timing ───────────────────────────────────────────────
    searchDelay: 2000,       // Delay after typing each username
    selectDelay: 1500,       // Delay after selecting each user
    actionDelay: 2000,       // Delay between major actions
    typeCharDelay: 50,       // Delay between keystrokes when typing

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,            // Set to false to actually send
  };

  const SEL = {
    newDM:          '[data-testid="NewDM_Button"]',
    searchPeople:   '[data-testid="searchPeople"]',
    typeaheadUser:  '[data-testid="TypeaheadUser"]',
    nextButton:     '[data-testid="nextButton"]',
    composerInput:  '[data-testid="dmComposerTextInput"]',
    sendButton:     '[data-testid="dmComposerSendButton"]',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  let aborted = false;

  const stats = {
    recipientsAdded: 0,
    recipientsFailed: [],
    messageSent: false,
    startTime: Date.now(),
  };

  window.XActions = {
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      console.log(`📊 Added: ${stats.recipientsAdded}/${CONFIG.recipients.length} | Message sent: ${stats.messageSent} | ${el}s`);
    },
  };

  const typeText = async (element, text) => {
    element.focus();
    for (const char of text) {
      if (aborted) return;
      const inputEvent = new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' });
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      document.execCommand('insertText', false, char);
      element.dispatchEvent(inputEvent);
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await sleep(CONFIG.typeCharDelay);
    }
  };

  const clearInput = (element) => {
    element.focus();
    element.value = '';
    element.textContent = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  💬 GROUP DIRECT MESSAGES' + ' '.repeat(W - 27) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually send');
    }

    if (CONFIG.recipients.length < 2) {
      console.log('❌ Need at least 2 recipients for a group DM');
      return;
    }

    console.log(`📋 Recipients: ${CONFIG.recipients.join(', ')}`);
    console.log(`💬 Message: "${CONFIG.message}"`);

    // Save state to sessionStorage
    const sessionKey = 'xactions_groupDM';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    // Step 1: Click New DM button
    console.log('🔄 Opening new message dialog...');
    const newDMBtn = await waitForSelector(SEL.newDM);
    if (!newDMBtn) {
      console.log('❌ Could not find New DM button. Make sure you are on x.com/messages');
      return;
    }

    if (!CONFIG.dryRun) {
      newDMBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    // Step 2: Search and add each recipient
    for (const username of CONFIG.recipients) {
      if (aborted) break;

      console.log(`🔍 Searching for @${username}...`);

      const searchInput = await waitForSelector(SEL.searchPeople);
      if (!searchInput) {
        console.log(`❌ Could not find search input for @${username}`);
        stats.recipientsFailed.push(username);
        continue;
      }

      if (!CONFIG.dryRun) {
        clearInput(searchInput);
        await sleep(500);
        await typeText(searchInput, username);
        await sleep(CONFIG.searchDelay);

        // Select the first matching user
        const userResult = await waitForSelector(SEL.typeaheadUser);
        if (!userResult) {
          console.log(`⚠️ Could not find @${username} in search results`);
          stats.recipientsFailed.push(username);
          continue;
        }

        userResult.click();
        await sleep(CONFIG.selectDelay);
      }

      stats.recipientsAdded++;
      console.log(`✅ Added @${username} (${stats.recipientsAdded}/${CONFIG.recipients.length})`);
    }

    if (aborted) {
      console.log('🛑 Aborted by user');
      return;
    }

    if (stats.recipientsAdded < 2) {
      console.log('❌ Need at least 2 recipients added to create a group. Only got ' + stats.recipientsAdded);
      return;
    }

    // Step 3: Click Next to create the conversation
    console.log('🔄 Creating group conversation...');
    if (!CONFIG.dryRun) {
      const nextBtn = await waitForSelector(SEL.nextButton);
      if (!nextBtn) {
        console.log('❌ Could not find Next button');
        return;
      }
      nextBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    // Step 4: Type and send the message
    if (CONFIG.message) {
      console.log('✍️ Typing message...');
      if (!CONFIG.dryRun) {
        const composerInput = await waitForSelector(SEL.composerInput);
        if (!composerInput) {
          console.log('❌ Could not find message composer');
          return;
        }

        await typeText(composerInput, CONFIG.message);
        await sleep(1000);

        const sendBtn = await waitForSelector(SEL.sendButton);
        if (!sendBtn) {
          console.log('❌ Could not find send button');
          return;
        }
        sendBtn.click();
        await sleep(CONFIG.actionDelay);
      }

      stats.messageSent = true;
      console.log('✅ Message sent!');
    }

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 GROUP DM SUMMARY' + ' '.repeat(W - 22) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`✅ Recipients added: ${stats.recipientsAdded}`);
    if (stats.recipientsFailed.length > 0) {
      console.log(`⚠️ Failed: ${stats.recipientsFailed.join(', ')}`);
    }
    console.log(`💬 Message sent: ${stats.messageSent}`);
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
