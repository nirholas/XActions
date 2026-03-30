/**
 * ============================================================
 * 📞 DM Audio & Video Calls — Production Grade
 * ============================================================
 *
 * @name        dmCalls.js
 * @description Navigate to a DM conversation and initiate
 *              audio or video calls on X/Twitter.
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
 * 3. Edit CONFIG below (username & call type)
 * 4. Paste and run
 *
 * ⚠️ Both parties must have DM calls enabled.
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Target ───────────────────────────────────────────────
    username: 'target_user',     // Username to call (without @)
    callType: 'audio',           // 'audio' or 'video'

    // ── Timing ───────────────────────────────────────────────
    navigationDelay: 3000,       // Wait for page loads
    actionDelay: 2000,           // Wait between actions
    scrollDelay: 1500,           // Wait between scrolls when searching

    // ── Search ───────────────────────────────────────────────
    maxScrollAttempts: 20,       // Max scrolls to find conversation

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,                // Set to false to actually initiate call
  };

  const SEL = {
    messagesLink:   'a[href="/messages"]',
    conversation:   '[data-testid="conversation"]',
    audioCall:      '[data-testid="dmAudioCall"]',
    videoCall:      '[data-testid="dmVideoCall"]',
    searchDM:       '[data-testid="SearchBox_Search_Input"]',
    dmHeader:       '[data-testid="DmActivityContainer"]',
    conversationName: '[data-testid="conversationName"]',
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

  const stats = {
    conversationFound: false,
    callInitiated: false,
    startTime: Date.now(),
  };

  const findConversation = async () => {
    console.log(`🔍 Looking for conversation with @${CONFIG.username}...`);

    // Try searching in DM search if available
    const searchInput = $(SEL.searchDM);
    if (searchInput) {
      searchInput.focus();
      searchInput.value = '';
      document.execCommand('insertText', false, CONFIG.username);
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(CONFIG.navigationDelay);
    }

    let scrollAttempts = 0;
    while (scrollAttempts < CONFIG.maxScrollAttempts) {
      const conversations = $$(SEL.conversation);

      for (const conv of conversations) {
        const text = conv.textContent.toLowerCase();
        if (text.includes(CONFIG.username.toLowerCase())) {
          console.log(`✅ Found conversation with @${CONFIG.username}`);
          return conv;
        }
      }

      // Scroll the conversation list
      const conversationList = document.querySelector('[data-testid="DMDrawer"]') ||
                               document.querySelector('section[role="region"]') ||
                               document.querySelector('[aria-label="Timeline: Messages"]');
      if (conversationList) {
        conversationList.scrollTop += 500;
      } else {
        window.scrollBy(0, 500);
      }

      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    return null;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📞 DM AUDIO & VIDEO CALLS' + ' '.repeat(W - 29) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually call');
    }

    const validTypes = ['audio', 'video'];
    if (!validTypes.includes(CONFIG.callType)) {
      console.log(`❌ Invalid callType: "${CONFIG.callType}". Use 'audio' or 'video'`);
      return;
    }

    console.log(`📋 Target: @${CONFIG.username}`);
    console.log(`📞 Call type: ${CONFIG.callType}`);

    const sessionKey = 'xactions_dmCalls';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    // Navigate to messages if not already there
    if (!window.location.pathname.startsWith('/messages')) {
      console.log('🔄 Navigating to messages...');
      const msgLink = $(SEL.messagesLink);
      if (msgLink) {
        if (!CONFIG.dryRun) {
          msgLink.click();
          await sleep(CONFIG.navigationDelay);
        }
      } else {
        console.log('⚠️ Navigating directly to /messages...');
        if (!CONFIG.dryRun) {
          window.location.href = 'https://x.com/messages';
          return; // Page will reload
        }
      }
    }

    // Find and open the conversation
    const conversation = await findConversation();
    if (!conversation) {
      console.log(`❌ Could not find conversation with @${CONFIG.username}`);
      console.log('💡 Make sure you have an existing DM conversation with this user');
      return;
    }

    stats.conversationFound = true;

    if (!CONFIG.dryRun) {
      conversation.click();
      await sleep(CONFIG.navigationDelay);
    }
    console.log('✅ Opened conversation');

    // Find and click the call button
    const callSelector = CONFIG.callType === 'audio' ? SEL.audioCall : SEL.videoCall;
    const callButton = await waitForSelector(callSelector);

    if (!callButton) {
      console.log(`❌ Could not find ${CONFIG.callType} call button`);
      console.log('💡 DM calls may not be available for this conversation');
      console.log('💡 Both parties must have DM calls enabled in settings');
      return;
    }

    console.log(`🔄 Initiating ${CONFIG.callType} call with @${CONFIG.username}...`);

    if (!CONFIG.dryRun) {
      callButton.click();
      await sleep(CONFIG.actionDelay);
    }

    stats.callInitiated = true;

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 DM CALL SUMMARY' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`✅ Conversation found: ${stats.conversationFound}`);
    console.log(`📞 ${CONFIG.callType.charAt(0).toUpperCase() + CONFIG.callType.slice(1)} call initiated: ${stats.callInitiated}`);
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
