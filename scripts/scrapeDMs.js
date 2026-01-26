/**
 * DM Scraper
 * Export DM conversations (if accessible)
 * 
 * HOW TO USE:
 * 1. Go to x.com/messages
 * 2. Click on a conversation you want to export
 * 3. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 4. Paste this script and press Enter
 * 
 * NOTE: Due to Twitter's privacy protections, this can only scrape
 * visible messages on screen. Scroll through the conversation first.
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_MESSAGES: 1000,
    SCROLL_DELAY: 1000,
    FORMAT: 'json', // 'json', 'txt'
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const extractMessages = () => {
    const messages = [];
    
    // Try to find message containers
    const messageContainers = document.querySelectorAll('[data-testid="messageEntry"], [data-testid="tweetText"]');
    
    messageContainers.forEach((container, index) => {
      const text = container.textContent || '';
      if (!text.trim()) return;

      // Try to determine if sent or received based on styling/position
      const parent = container.closest('[class*="message"]') || container.parentElement;
      const isSent = parent?.style?.marginLeft === 'auto' || 
                     parent?.classList?.toString()?.includes('right') ||
                     container.closest('[data-testid="messageSent"]') !== null;

      // Try to get timestamp
      const timeEl = container.closest('[role="listitem"]')?.querySelector('time') ||
                     container.parentElement?.querySelector('time');
      const time = timeEl?.getAttribute('datetime') || timeEl?.textContent || '';

      messages.push({
        id: index,
        text: text.trim(),
        type: isSent ? 'sent' : 'received',
        time,
      });
    });

    return messages;
  };

  const getConversationInfo = () => {
    // Try to get the conversation header/name
    const header = document.querySelector('[data-testid="DM_Conversation_Avatar"]')?.closest('div')?.textContent ||
                   document.querySelector('h2[role="heading"]')?.textContent ||
                   'unknown_conversation';
    return header.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
  };

  const run = async () => {
    if (!window.location.pathname.includes('/messages')) {
      console.error('❌ Please go to x.com/messages and open a conversation first!');
      return;
    }

    console.log('💬 Scraping DM conversation...');
    console.log('⚠️ Note: Only visible messages can be scraped.');
    console.log('💡 Tip: Scroll through the entire conversation first for best results.\n');

    const conversationName = getConversationInfo();
    const allMessages = new Map();
    let scrolls = 0;
    let lastCount = 0;
    let noNewCount = 0;

    // Try to scroll up to get older messages
    const messageContainer = document.querySelector('[data-testid="DM_Conversation"]') || 
                             document.querySelector('[role="main"]');

    while (allMessages.size < CONFIG.MAX_MESSAGES && noNewCount < 5) {
      const messages = extractMessages();
      const beforeCount = allMessages.size;

      messages.forEach(msg => {
        const key = `${msg.text.slice(0, 50)}_${msg.time}`;
        if (!allMessages.has(key)) {
          allMessages.set(key, msg);
        }
      });

      const added = allMessages.size - beforeCount;
      if (added > 0) {
        console.log(`💬 Collected ${allMessages.size} messages...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      // Scroll up within the message container
      if (messageContainer) {
        messageContainer.scrollTop -= 500;
      }
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 50) break;
    }

    const messageList = Array.from(allMessages.values());
    // Sort by order they appeared (approximate chronological)
    messageList.sort((a, b) => a.id - b.id);

    console.log('\n' + '='.repeat(60));
    console.log(`💬 SCRAPED ${messageList.length} MESSAGES`);
    console.log('='.repeat(60) + '\n');

    const sent = messageList.filter(m => m.type === 'sent').length;
    const received = messageList.filter(m => m.type === 'received').length;
    console.log(`📊 Stats: ${sent} sent, ${received} received`);

    // Preview
    messageList.slice(0, 5).forEach((m, i) => {
      const prefix = m.type === 'sent' ? '→' : '←';
      console.log(`${prefix} "${m.text.slice(0, 60)}..."`);
    });

    if (CONFIG.FORMAT === 'json') {
      const data = {
        conversation: conversationName,
        exportedAt: new Date().toISOString(),
        messageCount: messageList.length,
        messages: messageList,
      };
      download(JSON.stringify(data, null, 2), `dm_${conversationName}_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded dm_conversation.json');
    }

    if (CONFIG.FORMAT === 'txt') {
      const txt = messageList.map(m => {
        const prefix = m.type === 'sent' ? '[You]' : '[Them]';
        return `${prefix} ${m.text}`;
      }).join('\n\n');
      download(txt, `dm_${conversationName}_${Date.now()}.txt`, 'text/plain');
      console.log('💾 Downloaded dm_conversation.txt');
    }

    window.scrapedDMs = { conversation: conversationName, messages: messageList };
    console.log('\n✅ Done! Access data: window.scrapedDMs');
    console.log('\n⚠️ Privacy note: Be mindful of sharing DM content.');
  };

  run();
})();
