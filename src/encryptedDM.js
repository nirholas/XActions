/**
 * ============================================================
 * 🔒 Encrypted Direct Messages — Production Grade
 * ============================================================
 *
 * @name        encryptedDM.js
 * @description Enable encrypted DM mode, send encrypted messages,
 *              and check encryption status on X/Twitter.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/messages (or an existing DM conversation)
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 *
 * ⚠️ Encrypted DMs require both users to be verified (Premium).
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Action ───────────────────────────────────────────────
    action: 'send',              // 'send', 'check', or 'enable'
    //   send   — send an encrypted message to a user
    //   check  — check if current conversation is encrypted
    //   enable — enable encrypted mode for current conversation

    // ── Message (for 'send' action) ─────────────────────────
    username: 'target_user',     // Username to message (without @)
    message: 'This is a secret encrypted message 🔐',

    // ── Timing ───────────────────────────────────────────────
    navigationDelay: 3000,
    actionDelay: 2000,
    typeCharDelay: 50,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,                // Set to false to actually send
  };

  const SEL = {
    encryptedDM:      '[data-testid="encryptedDM"]',
    composerInput:    '[data-testid="dmComposerTextInput"]',
    sendButton:       '[data-testid="dmComposerSendButton"]',
    lockIcon:         '[data-testid="lockIcon"]',
    newDM:            '[data-testid="NewDM_Button"]',
    searchPeople:     '[data-testid="searchPeople"]',
    typeaheadUser:    '[data-testid="TypeaheadUser"]',
    nextButton:       '[data-testid="nextButton"]',
    conversation:     '[data-testid="conversation"]',
    dmHeader:         '[data-testid="DmActivityContainer"]',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

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
    action: CONFIG.action,
    encryptionEnabled: false,
    isEncrypted: null,
    messageSent: false,
    startTime: Date.now(),
  };

  const checkEncryption = async () => {
    console.log('🔍 Checking encryption status of current conversation...');

    const lockIcon = $(SEL.lockIcon);
    const encryptedIndicator = $(SEL.encryptedDM);

    // Look for encryption indicators in the conversation header
    const header = $(SEL.dmHeader) || document.querySelector('[data-testid="DMConversationHeader"]');
    const hasEncryptionBadge = header ? header.querySelector('svg[aria-label*="ncrypt"], [data-testid="lockIcon"]') : null;

    if (lockIcon || encryptedIndicator || hasEncryptionBadge) {
      stats.isEncrypted = true;
      console.log('🔒 This conversation IS encrypted');
      console.log('✅ End-to-end encryption is active');
    } else {
      stats.isEncrypted = false;
      console.log('🔓 This conversation is NOT encrypted');
      console.log('💡 Both users must be verified (Premium) to use encrypted DMs');
    }

    return stats.isEncrypted;
  };

  const enableEncryption = async () => {
    console.log('🔄 Enabling encrypted mode for this conversation...');

    const encryptBtn = await waitForSelector(SEL.encryptedDM);
    if (!encryptBtn) {
      console.log('❌ Could not find encrypted DM toggle');
      console.log('💡 Make sure you are in a DM conversation');
      console.log('💡 Both users must have Premium for encrypted DMs');
      return false;
    }

    if (!CONFIG.dryRun) {
      encryptBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    stats.encryptionEnabled = true;
    console.log('✅ Encrypted mode enabled');
    return true;
  };

  const sendEncryptedMessage = async () => {
    console.log(`🔄 Sending encrypted message to @${CONFIG.username}...`);

    // If not already in messages, navigate there
    if (!window.location.pathname.startsWith('/messages')) {
      console.log('🔄 Navigating to messages...');
      if (!CONFIG.dryRun) {
        window.location.href = 'https://x.com/messages';
        return;
      }
    }

    // Start a new DM or find existing conversation
    console.log('🔄 Opening new encrypted conversation...');
    const newDMBtn = await waitForSelector(SEL.newDM);
    if (!newDMBtn) {
      console.log('❌ Could not find New DM button');
      return;
    }

    if (!CONFIG.dryRun) {
      newDMBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    // Enable encrypted mode before selecting recipient
    const encryptBtn = await waitForSelector(SEL.encryptedDM, 5000);
    if (encryptBtn) {
      console.log('🔒 Enabling encryption for this conversation...');
      if (!CONFIG.dryRun) {
        encryptBtn.click();
        await sleep(CONFIG.actionDelay);
      }
      stats.encryptionEnabled = true;
    } else {
      console.log('⚠️ Encrypted DM toggle not found — may not be available');
    }

    // Search for the user
    console.log(`🔍 Searching for @${CONFIG.username}...`);
    const searchInput = await waitForSelector(SEL.searchPeople);
    if (!searchInput) {
      console.log('❌ Could not find people search input');
      return;
    }

    if (!CONFIG.dryRun) {
      searchInput.focus();
      await typeText(searchInput, CONFIG.username);
      await sleep(2000);

      const userResult = await waitForSelector(SEL.typeaheadUser);
      if (!userResult) {
        console.log(`❌ Could not find @${CONFIG.username} in results`);
        return;
      }

      userResult.click();
      await sleep(CONFIG.actionDelay);

      // Click Next
      const nextBtn = await waitForSelector(SEL.nextButton);
      if (!nextBtn) {
        console.log('❌ Could not find Next button');
        return;
      }
      nextBtn.click();
      await sleep(CONFIG.navigationDelay);
    }

    // Type and send the message
    console.log('✍️ Typing encrypted message...');
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
    console.log('✅ Encrypted message sent!');
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔒 ENCRYPTED DIRECT MESSAGES' + ' '.repeat(W - 32) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually act');
    }

    const validActions = ['send', 'check', 'enable'];
    if (!validActions.includes(CONFIG.action)) {
      console.log(`❌ Invalid action: "${CONFIG.action}". Use: ${validActions.join(', ')}`);
      return;
    }

    console.log(`📋 Action: ${CONFIG.action}`);
    const sessionKey = 'xactions_encryptedDM';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    switch (CONFIG.action) {
      case 'check':
        await checkEncryption();
        break;
      case 'enable':
        await enableEncryption();
        break;
      case 'send':
        await sendEncryptedMessage();
        break;
    }

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 ENCRYPTED DM SUMMARY' + ' '.repeat(W - 27) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🔧 Action: ${CONFIG.action}`);
    if (stats.isEncrypted !== null) {
      console.log(`🔒 Encrypted: ${stats.isEncrypted}`);
    }
    if (stats.encryptionEnabled) {
      console.log('✅ Encryption enabled');
    }
    if (stats.messageSent) {
      console.log('✅ Message sent');
    }
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
