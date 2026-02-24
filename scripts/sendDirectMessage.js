// scripts/sendDirectMessage.js
// Browser console script for sending personalized DMs to multiple users on X/Twitter
// Paste in DevTools console on x.com/messages
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    targetUsers: [
      // 'user1',
      // 'user2',
    ],
    messageTemplate: 'Hey {user}, check this out! 👋',  // {user} = recipient username
    maxMessages: 5,
    dryRun: true,               // SET FALSE TO EXECUTE
    delay: 5000,                // ms between messages (keep high to avoid limits)
  };
  // =============================================

  const results = { sent: [], failed: [], skipped: [] };

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

  const sendDM = async (username) => {
    const message = CONFIG.messageTemplate.replace(/{user}/g, username);

    if (getSentHistory().includes(username)) {
      console.log(`   ⏭️ Already messaged @${username}, skipping`);
      results.skipped.push(username);
      return;
    }

    if (CONFIG.dryRun) {
      console.log(`   📝 Would send to @${username}: "${message.substring(0, 60)}..."`);
      results.sent.push(username);
      return;
    }

    try {
      // Click new DM
      const newBtn = document.querySelector('[data-testid="NewDM_Button"]');
      if (newBtn) { newBtn.click(); await sleep(1500); }

      // Search user
      const searchInput = document.querySelector('[data-testid="searchPeople"]');
      if (!searchInput) { console.error('❌ Search input not found'); results.failed.push(username); return; }
      searchInput.focus();
      document.execCommand('insertText', false, username);
      await sleep(2000);

      // Select user
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
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
        console.warn(`   ⚠️ @${username} not found`);
        results.failed.push(username);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        return;
      }

      // Click next
      const nextBtn = document.querySelector('[data-testid="nextButton"]');
      if (nextBtn) { nextBtn.click(); await sleep(1500); }

      // Type and send
      const msgInput = document.querySelector('[data-testid="dmComposerTextInput"]');
      if (msgInput) {
        msgInput.focus();
        document.execCommand('insertText', false, message);
        await sleep(500);

        const sendBtn = document.querySelector('[data-testid="dmComposerSendButton"]');
        if (sendBtn) {
          sendBtn.click();
          markAsSent(username);
          results.sent.push(username);
          console.log(`   ✅ Sent to @${username}`);
        }
      }

      await sleep(1000);
      const backBtn = document.querySelector('[data-testid="app-bar-back"]');
      if (backBtn) backBtn.click();
      await sleep(1000);
    } catch (e) {
      console.error(`   ❌ Error with @${username}:`, e.message);
      results.failed.push(username);
    }
  };

  const run = async () => {
    console.log('💬 SEND DIRECT MESSAGES — XActions by nichxbt');
    console.log('⚠️ Mass DMing can get your account restricted. Use responsibly.\n');

    if (!window.location.href.includes('/messages')) {
      console.error('❌ Navigate to x.com/messages first!');
      return;
    }

    if (CONFIG.targetUsers.length === 0) {
      console.error('❌ No users specified! Edit CONFIG.targetUsers.');
      return;
    }

    if (CONFIG.dryRun) console.log('⚠️ DRY RUN — Set CONFIG.dryRun = false to actually send\n');

    const queue = CONFIG.targetUsers.slice(0, CONFIG.maxMessages);
    console.log(`📋 Processing ${queue.length} users...\n`);

    for (const username of queue) {
      console.log(`⏳ @${username}...`);
      await sendDM(username);
      await sleep(CONFIG.delay);
    }

    console.log('\n📊 RESULTS:');
    console.log(`   ✅ Sent: ${results.sent.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   ⏭️ Skipped: ${results.skipped.length}`);
    console.log('\n🏁 Done!');
  };

  run();
})();
