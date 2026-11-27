// GENERATED FILE: a copy of browser/sendDirectMessage.js, written by scripts/build-script-manifest.mjs. Edit browser/sendDirectMessage.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        sendDirectMessage.js
 * @title       Send Direct Messages
 * @description Send a personalized DM to each user in a list, with a per-session cap, long delays, sent-history skipping and a dry run by default.
 * @category    messages
 * @page        x.com/messages
 * @writes      true
 * @aliases     scripts/sendDirectMessage.js, scripts/twitter/send-direct-message.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Send Direct Messages on X - by nichxbt
// https://github.com/nirholas/xactions
// Send personalized DMs to a list of users
// 1. Go to https://x.com/messages
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below. dryRun: true only logs what would be sent; set
//    dryRun = false to send. {username} (or {user}) is replaced by the recipient.
// 4. Paste browser/sendDirectMessage.js into the Developer Console and run it
//
// Console helpers (also honor dryRun): XActions.DM.help(), .addUser("name"),
// .setMessage("text {username}"), .sendTo("name"), .sendToAll(), .stop(),
// .stats(), .log(), .clearHistory()
//
// ⚠️ Mass DMing can get your account restricted. Use responsibly!
// Only message users who have open DMs or follow you. Don't spam.
// Last Updated: 27 November 2026
(() => {
  const CONFIG = {
    targetUsers: [
      // 'username1',
      // 'username2',
    ],
    // Use {username} (or {user}) as placeholder for recipient's name
    messageTemplate: `Hey {username}! 👋 Just wanted to connect.`,
    limits: {
      messagesPerSession: 5,
      delayBetweenMessages: 30000, // 30 seconds
    },
    randomizeDelay: true,          // Add 0-50% extra random wait to each delay
    skipIfAlreadyMessaged: true,
    dryRun: true,
  };

  const $newMessageBtn = '[data-testid="NewDM_Button"]';
  const $searchInput = '[data-testid="searchPeople"]';
  const $userCell = '[data-testid="UserCell"]';
  const $messageInput = '[data-testid="dmComposerTextInput"]';
  const $sendButton = '[data-testid="dmComposerSendButton"]';
  const $backButton = '[data-testid="app-bar-back"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const waitBetween = (base) => sleep(CONFIG.randomizeDelay ? base + Math.random() * base * 0.5 : base);

  // Set an input's value through the native setter so React's value tracker
  // registers the change (direct .value assignment gets ignored by React).
  const setNativeValue = (el, value) => {
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  };

  const cleanName = (username) => String(username).trim().replace(/^@/, '');
  const fillMessage = (username) => CONFIG.messageTemplate.split('{username}').join(username).split('{user}').join(username);

  const getSentHistory = () => {
    try { return JSON.parse(localStorage.getItem('xactions_dm_sent') || '[]'); }
    catch { return []; }
  };
  const wasSent = (username) => getSentHistory().some(u => String(u).toLowerCase() === username.toLowerCase());
  const markAsSent = (username) => {
    const history = getSentHistory();
    if (!wasSent(username)) {
      history.push(username.toLowerCase());
      localStorage.setItem('xactions_dm_sent', JSON.stringify(history));
    }
  };

  const results = { sent: [], failed: [], skipped: [] };
  const messageLog = [];
  let isRunning = false;

  const sendDM = async (rawUsername, customMessage = null) => {
    const username = cleanName(rawUsername);
    const message = customMessage || fillMessage(username);

    if (CONFIG.skipIfAlreadyMessaged && wasSent(username)) {
      console.log(`⏭️ Already messaged @${username}, skipping`);
      results.skipped.push(username);
      return false;
    }

    if (CONFIG.dryRun) {
      console.log(`📝 Would send to @${username}: "${message.substring(0, 50)}..."`);
      results.sent.push(username);
      return true;
    }

    try {
      // Click new message
      const newBtn = document.querySelector($newMessageBtn);
      if (newBtn) {
        newBtn.click();
        await sleep(1500);
      }

      // Search for user
      const searchInput = document.querySelector($searchInput);
      if (!searchInput) {
        console.error('❌ Search input not found. Are you on the Messages page?');
        results.failed.push(username);
        return false;
      }

      searchInput.focus();
      document.execCommand('insertText', false, username);
      if (!searchInput.value) {
        // Fallback: React ignores plain .value writes, use the native setter
        setNativeValue(searchInput, username);
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await sleep(2000);

      // Click on matching user: match the exact @handle so a prefix like
      // "john" can't select "johnny" (wrong DM recipient)
      const handleRe = new RegExp('@' + username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-zA-Z0-9_])', 'i');
      const cells = document.querySelectorAll($userCell);
      let found = false;
      for (const cell of cells) {
        if (handleRe.test(cell.textContent)) {
          cell.click();
          found = true;
          await sleep(1000);
          break;
        }
      }

      if (!found) {
        console.warn(`⚠️ @${username} not found in search`);
        results.failed.push(username);
        // Press Escape to close
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        return false;
      }

      // Click Next/Start conversation button
      const nextBtn = document.querySelector('[data-testid="nextButton"]');
      if (nextBtn) {
        nextBtn.click();
        await sleep(1500);
      }

      // Type message
      let ok = false;
      const msgInput = document.querySelector($messageInput);
      if (msgInput) {
        msgInput.focus();
        document.execCommand('insertText', false, message);
        await sleep(500);

        // Send
        const sendBtn = document.querySelector($sendButton);
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          markAsSent(username);
          results.sent.push(username);
          messageLog.push({ to: username, message, timestamp: new Date().toISOString() });
          console.log(`✅ Sent DM to @${username}`);
          ok = true;
        } else {
          console.error('❌ Send button not available.');
          results.failed.push(username);
        }
      } else {
        console.error('❌ Message input not found.');
        results.failed.push(username);
      }

      await sleep(1000);

      // Navigate back
      const backBtn = document.querySelector($backButton);
      if (backBtn) backBtn.click();
      await sleep(1000);
      return ok;

    } catch (e) {
      console.error(`❌ Error messaging @${username}:`, e.message);
      results.failed.push(username);
      return false;
    }
  };

  const printStats = () => {
    console.log('\n📊 RESULTS:');
    console.log(`   ✅ Sent: ${results.sent.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   ⏭️ Skipped: ${results.skipped.length}`);
    console.log(`   📜 Total messaged (all time): ${getSentHistory().length}`);
  };

  const sendToAll = async () => {
    if (CONFIG.targetUsers.length === 0) {
      console.error('❌ No users specified! Edit CONFIG.targetUsers or use XActions.DM.addUser("username").');
      return;
    }

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually send');
    }

    const usersToMessage = CONFIG.targetUsers.slice(0, CONFIG.limits.messagesPerSession);
    console.log(`📋 Messages to send: ${usersToMessage.length}`);
    console.log(`⏱️ Delay between messages: ${CONFIG.limits.delayBetweenMessages / 1000}s${CONFIG.randomizeDelay ? ' (+0-50% random)' : ''}`);

    isRunning = true;
    for (const username of usersToMessage) {
      if (!isRunning) { console.log('🛑 Stopped.'); break; }
      console.log(`\n⏳ Processing @${cleanName(username)}...`);
      await sendDM(username);
      if (!isRunning) { console.log('🛑 Stopped.'); break; }
      await waitBetween(CONFIG.limits.delayBetweenMessages);
    }
    isRunning = false;

    printStats();
  };

  // Console helpers, kept from scripts/twitter/send-direct-message.js
  window.XActions = window.XActions || {};
  window.XActions.DM = {
    config: CONFIG,
    results,
    sendTo: (username, customMessage = null) => sendDM(username, customMessage),
    sendToAll,
    addUser: (username) => {
      const clean = cleanName(username).toLowerCase();
      if (!CONFIG.targetUsers.some(u => cleanName(u).toLowerCase() === clean)) {
        CONFIG.targetUsers.push(clean);
        console.log(`✅ Added @${clean} to DM list`);
      }
    },
    setMessage: (template) => {
      CONFIG.messageTemplate = template;
      console.log('✅ Message template updated.');
      console.log('Preview:', fillMessage('example'));
    },
    stop: () => {
      isRunning = false;
      console.log('🛑 Stop requested.');
    },
    stats: printStats,
    log: () => {
      console.log('\n📜 MESSAGE LOG:');
      messageLog.forEach(m => console.log(`   → @${m.to} at ${m.timestamp}`));
    },
    clearHistory: () => {
      if (confirm('⚠️ Clear all sent message history?')) {
        localStorage.setItem('xactions_dm_sent', JSON.stringify([]));
        console.log('✅ History cleared.');
      }
    },
    help: () => {
      console.log('\n📋 DM COMMANDS:\n');
      console.log('   XActions.DM.addUser("username")');
      console.log('   XActions.DM.setMessage("Your message {username}")');
      console.log('   XActions.DM.sendTo("username")');
      console.log('   XActions.DM.sendToAll()');
      console.log('   XActions.DM.stop()');
      console.log('   XActions.DM.stats()');
      console.log('   XActions.DM.log()');
      console.log('   XActions.DM.clearHistory()');
      console.log(`\n💡 Use {username} in message template as placeholder. dryRun is ${CONFIG.dryRun}.`);
      console.log('⚠️ Always be respectful and don\'t spam!');
    },
  };

  const run = async () => {
    console.log('💬 SEND DIRECT MESSAGES - XActions by nichxbt');
    console.log('⚠️ Use responsibly! Mass DMing can get you restricted.\n');

    if (!window.location.href.includes('/messages')) {
      console.error('❌ Navigate to x.com/messages first!');
      return;
    }

    if (CONFIG.targetUsers.length === 0) {
      console.error('❌ No users specified! Edit CONFIG.targetUsers.');
      console.log('💡 Or add them from the console: XActions.DM.addUser("username"), then XActions.DM.sendToAll(). XActions.DM.help() lists every command.');
      return;
    }

    await sendToAll();
  };

  run();
})();
