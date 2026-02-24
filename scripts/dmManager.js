// scripts/dmManager.js
// Browser console script for sending DMs and exporting conversations on X/Twitter
// Paste in DevTools console on x.com/messages
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'send',           // 'send' | 'export'
    targetUser: '',           // Username to DM (for 'send')
    message: '',              // Message to send
    maxConversations: 20,     // Max conversations to export
    scrollDelay: 1500,
    dryRun: true,             // SET FALSE TO EXECUTE
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const sendDM = async () => {
    if (!CONFIG.targetUser || !CONFIG.message) {
      console.error('❌ Set CONFIG.targetUser and CONFIG.message first!');
      return;
    }

    console.log(`💬 Sending DM to @${CONFIG.targetUser}...`);

    if (CONFIG.dryRun) {
      console.log(`   📝 Would send to @${CONFIG.targetUser}: "${CONFIG.message.substring(0, 80)}..."`);
      return;
    }

    try {
      // Click new DM
      const newBtn = document.querySelector('[data-testid="NewDM_Button"]');
      if (newBtn) { newBtn.click(); await sleep(1500); }

      // Search user
      const searchInput = document.querySelector('[data-testid="searchPeople"]');
      if (!searchInput) { console.error('❌ Search input not found'); return; }
      searchInput.focus();
      document.execCommand('insertText', false, CONFIG.targetUser);
      await sleep(2000);

      // Select user
      const cells = document.querySelectorAll('[data-testid="TypeaheadUser"], [data-testid="UserCell"]');
      let found = false;
      for (const cell of cells) {
        if (cell.textContent.toLowerCase().includes(CONFIG.targetUser.toLowerCase())) {
          cell.click();
          found = true;
          break;
        }
      }
      if (!found) { console.error(`❌ @${CONFIG.targetUser} not found`); return; }
      await sleep(1000);

      // Click next
      const nextBtn = document.querySelector('[data-testid="nextButton"]');
      if (nextBtn) { nextBtn.click(); await sleep(1500); }

      // Type and send
      const msgInput = document.querySelector('[data-testid="dmComposerTextInput"]');
      if (msgInput) {
        msgInput.focus();
        document.execCommand('insertText', false, CONFIG.message);
        await sleep(500);

        const sendBtn = document.querySelector('[data-testid="dmComposerSendButton"]');
        if (sendBtn) { sendBtn.click(); await sleep(1000); }
      }

      console.log(`✅ DM sent to @${CONFIG.targetUser}`);
    } catch (e) {
      console.error('❌ Failed to send DM:', e.message);
    }
  };

  const exportConversations = async () => {
    console.log(`📥 Exporting up to ${CONFIG.maxConversations} conversations...`);

    const conversations = [];
    let retries = 0;

    while (conversations.length < CONFIG.maxConversations && retries < 5) {
      const prevSize = conversations.length;

      document.querySelectorAll('[data-testid="conversation"]').forEach(conv => {
        const name = conv.querySelector('[dir="ltr"] span')?.textContent || '';
        const lastMsg = conv.querySelector('[data-testid="lastMessage"]')?.textContent || conv.querySelector('[dir="auto"]')?.textContent || '';
        const time = conv.querySelector('time')?.getAttribute('datetime') || '';
        const unread = !!conv.querySelector('[data-testid="unread"]');
        const id = name + time;

        if (!conversations.find(c => c.name === name && c.time === time)) {
          conversations.push({ name, lastMessage: lastMsg.substring(0, 200), time, unread });
        }
      });

      if (conversations.length === prevSize) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const data = { exportedAt: new Date().toISOString(), count: conversations.length, conversations };
    download(data, `xactions-conversations-${new Date().toISOString().slice(0, 10)}.json`);
    console.log(`✅ Exported ${conversations.length} conversations`);
  };

  const run = async () => {
    console.log('💬 DM MANAGER — XActions by nichxbt\n');

    if (!window.location.href.includes('/messages')) {
      console.error('❌ Navigate to x.com/messages first!');
      return;
    }

    if (CONFIG.action === 'send') await sendDM();
    else if (CONFIG.action === 'export') await exportConversations();
    else console.error(`❌ Unknown action: ${CONFIG.action}`);

    console.log('\n🏁 Done!');
  };

  run();
})();
