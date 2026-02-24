// scripts/dmExporter.js
// Browser console script to export X/Twitter DM conversations
// Paste in DevTools console on x.com/messages
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const CONFIG = {
    maxConversations: 20,   // Max conversations to list
    exportMessages: false,  // Set true to export messages from first conversation
    maxMessages: 100,       // Max messages per conversation
  };

  const run = async () => {
    console.log('✉️ XActions DM Exporter');
    console.log('======================');

    // Scrape conversation list
    const conversations = [];
    document.querySelectorAll('[data-testid="conversation"]').forEach((conv, i) => {
      if (i >= CONFIG.maxConversations) return;
      
      const name = conv.querySelector('[dir="ltr"]')?.textContent || '';
      const lastMsg = conv.querySelector('[data-testid="lastMessage"]')?.textContent || 
                      conv.querySelectorAll('span')[conv.querySelectorAll('span').length - 1]?.textContent || '';
      const time = conv.querySelector('time')?.getAttribute('datetime') || '';
      const unread = !!conv.querySelector('[data-testid="unread"]');

      conversations.push({
        index: i + 1,
        name: name.trim(),
        lastMessage: lastMsg.trim().substring(0, 100),
        time,
        unread,
      });
    });

    console.log(`\n📬 Found ${conversations.length} conversations:`);
    conversations.forEach(c => {
      const badge = c.unread ? '🔴' : '⚪';
      console.log(`  ${badge} ${c.index}. ${c.name} — ${c.lastMessage.substring(0, 40)}...`);
    });

    // Export messages from current conversation if enabled
    let messages = [];
    if (CONFIG.exportMessages) {
      console.log('\n📜 Exporting messages from current conversation...');

      // Click the first conversation if not already in one
      const firstConv = document.querySelector('[data-testid="conversation"]');
      if (firstConv) {
        firstConv.click();
        await sleep(2000);
      }

      let scrollAttempts = 0;
      while (messages.length < CONFIG.maxMessages && scrollAttempts < 30) {
        document.querySelectorAll('[data-testid="messageEntry"], [data-testid="tweetText"]').forEach(msg => {
          const text = msg.textContent?.trim() || '';
          const time = msg.closest('[data-testid]')?.querySelector('time')?.getAttribute('datetime') || '';
          const id = text.substring(0, 50) + time;

          if (text && !messages.find(m => m.id === id)) {
            messages.push({ id, text, time });
          }
        });

        // Scroll up for older messages
        const container = document.querySelector('[data-testid="DmScrollerContainer"]') ||
                          document.querySelector('[data-testid="DMConversation"]') ||
                          document.querySelector('[role="main"]');
        if (container) {
          container.scrollTop = Math.max(0, container.scrollTop - 500);
        }
        await sleep(1500);
        scrollAttempts++;
      }

      // Clean IDs from output
      messages = messages.map(({ id, ...rest }) => rest);
      console.log(`  Found ${messages.length} messages`);
    }

    const result = {
      conversations,
      messages: CONFIG.exportMessages ? messages : 'Set CONFIG.exportMessages = true to export',
      scrapedAt: new Date().toISOString(),
    };

    console.log('\n📦 Full JSON:');
    console.log(JSON.stringify(result, null, 2));

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('\n✅ Copied to clipboard!');
    } catch (e) {
      console.log('\n⚠️ Could not copy to clipboard.');
    }
  };

  run();
})();
