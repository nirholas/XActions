// Send Direct Messages on X - by nichxbt
// https://github.com/nirholas/xactions
// Send personalized DMs to a list of users
// 1. Go to https://x.com/messages
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below
// 4. Paste this into the Developer Console and run it
//
// ⚠️ Mass DMing can get your account restricted. Use responsibly!
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    targetUsers: [
      // 'username1',
      // 'username2',
    ],
    // Use {username} as placeholder for recipient's name
    messageTemplate: `Hey {username}! 👋 Just wanted to connect.`,
    limits: {
      messagesPerSession: 10,
      delayBetweenMessages: 30000, // 30 seconds
    },
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

  const getSentHistory = () => {
    try { return JSON.parse(localStorage.getItem('xactions_dm_sent') || '[]'); }
    catch { return []; }
  };
  const markAsSent = (username) => {
    const history = getSentHistory();
    if (!history.includes(username)) {
      history.push(username);
      localStorage.setItem('xactions_dm_sent', JSON.stringify(history));
    }
  };

  const results = { sent: [], failed: [], skipped: [] };

  const sendDM = async (username) => {
    const message = CONFIG.messageTemplate.replace(/{username}/g, username);

    if (CONFIG.skipIfAlreadyMessaged && getSentHistory().includes(username)) {
      console.log(`⏭️ Already messaged @${username}, skipping`);
      results.skipped.push(username);
      return;
    }

    if (CONFIG.dryRun) {
      console.log(`📝 Would send to @${username}: "${message.substring(0, 50)}..."`);
      results.sent.push(username);
      return;
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
        return;
      }

      searchInput.focus();
      document.execCommand('insertText', false, username);
      await sleep(2000);

      // Click on matching user
      const cells = document.querySelectorAll($userCell);
      let found = false;
      for (const cell of cells) {
        if (cell.textContent.toLowerCase().includes(username.toLowerCase())) {
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
        return;
      }

      // Click Next/Start conversation button
      const nextBtn = document.querySelector('[data-testid="nextButton"]');
      if (nextBtn) {
        nextBtn.click();
        await sleep(1500);
      }

      // Type message
      const msgInput = document.querySelector($messageInput);
      if (msgInput) {
        msgInput.focus();
        document.execCommand('insertText', false, message);
        await sleep(500);

        // Send
        const sendBtn = document.querySelector($sendButton);
        if (sendBtn) {
          sendBtn.click();
          markAsSent(username);
          results.sent.push(username);
          console.log(`✅ Sent DM to @${username}`);
        }
      }

      await sleep(1000);

      // Navigate back
      const backBtn = document.querySelector($backButton);
      if (backBtn) backBtn.click();
      await sleep(1000);

    } catch (e) {
      console.error(`❌ Error messaging @${username}:`, e.message);
      results.failed.push(username);
    }
  };

  const run = async () => {
    console.log('💬 SEND DIRECT MESSAGES - XActions by nichxbt');
    console.log('⚠️ Use responsibly! Mass DMing can get you restricted.\n');

    if (CONFIG.targetUsers.length === 0) {
      console.error('❌ No users specified! Edit CONFIG.targetUsers.');
      return;
    }

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually send');
    }

    if (!window.location.href.includes('/messages')) {
      console.error('❌ Navigate to x.com/messages first!');
      return;
    }

    const usersToMessage = CONFIG.targetUsers.slice(0, CONFIG.limits.messagesPerSession);
    console.log(`📋 Messages to send: ${usersToMessage.length}`);

    for (const username of usersToMessage) {
      console.log(`\n⏳ Processing @${username}...`);
      await sendDM(username);
      await sleep(CONFIG.limits.delayBetweenMessages);
    }

    console.log('\n📊 RESULTS:');
    console.log(`   ✅ Sent: ${results.sent.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   ⏭️ Skipped: ${results.skipped.length}`);
  };

  run();
})();
