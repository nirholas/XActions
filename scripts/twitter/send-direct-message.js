/**
 * ============================================================
 * 💬 Send Direct Messages
 * ============================================================
 * 
 * @name        send-direct-message.js
 * @description Send DMs to users on X/Twitter
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * ⚠️ WARNING: Use responsibly!
 * ============================================================
 * 
 * Mass DMing can get your account restricted.
 * Only message users who have open DMs or follow you.
 * Don't spam - personalize your messages!
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Go to X Messages: https://x.com/messages
 * 2. Open Chrome DevTools (F12)
 * 3. Configure your message below
 * 4. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Target users to message
  targetUsers: [
    // 'username1',
    // 'username2',
  ],
  
  // Message template
  // Use {username} as placeholder for recipient's name
  messageTemplate: `Hey {username}! 👋

Just wanted to reach out and connect.

Best,
[Your Name]`,
  
  // Limits
  limits: {
    messagesPerSession: 10,
    delayBetweenMessages: 30000, // 30 seconds (be careful!)
  },
  
  // Options
  options: {
    skipIfConversationExists: true, // Don't message if already in conversation
    randomizeDelay: true,           // Add randomness to delays
  },
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function sendDirectMessage() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (base) => {
    if (CONFIG.options.randomizeDelay) {
      return sleep(base + Math.random() * base * 0.5);
    }
    return sleep(base);
  };
  
  // DOM Selectors
  const SELECTORS = {
    newMessageBtn: '[data-testid="NewDM_Button"]',
    searchInput: '[data-testid="searchPeople"]',
    userCell: '[data-testid="UserCell"]',
    messageInput: '[data-testid="dmComposerTextInput"]',
    sendButton: '[data-testid="dmComposerSendButton"]',
    conversationList: '[data-testid="conversation"]',
    backButton: '[data-testid="app-bar-back"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💬 SEND DIRECT MESSAGES                                   ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚠️ WARNING: Use responsibly! Mass DMing can get you restricted.');
  console.log('');
  
  // State
  const state = {
    isRunning: false,
    stats: { sent: 0, failed: 0, skipped: 0 },
    messageLog: [],
  };
  
  // Storage for tracking sent messages
  const storage = {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(`xactions_dm_${key}`) || 'null'); }
      catch { return null; }
    },
    set: (key, value) => {
      localStorage.setItem(`xactions_dm_${key}`, JSON.stringify(value));
    }
  };
  
  // Get sent messages history
  const getSentHistory = () => storage.get('sent') || [];
  const markAsSent = (username) => {
    const history = getSentHistory();
    if (!history.includes(username)) {
      history.push(username);
      storage.set('sent', history);
    }
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.DM = {
    config: CONFIG,
    state,
    
    // Send DM to a single user
    sendTo: async (username, customMessage = null) => {
      const cleanUsername = username.replace('@', '').toLowerCase();
      const message = customMessage || CONFIG.messageTemplate.replace('{username}', cleanUsername);
      
      console.log(`💬 Sending DM to @${cleanUsername}...`);
      
      // Check if already messaged
      if (getSentHistory().includes(cleanUsername)) {
        console.log(`⏭️ Already messaged @${cleanUsername}, skipping.`);
        state.stats.skipped++;
        return false;
      }
      
      try {
        // Click new message button
        const newMsgBtn = document.querySelector(SELECTORS.newMessageBtn);
        if (newMsgBtn) {
          newMsgBtn.click();
          await sleep(1500);
        }
        
        // Search for user
        const searchInput = document.querySelector(SELECTORS.searchInput);
        if (!searchInput) {
          console.error('❌ Search input not found. Are you on Messages page?');
          return false;
        }
        
        // Type username
        searchInput.focus();
        searchInput.value = cleanUsername;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(2000);
        
        // Click on user
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        let found = false;
        
        for (const cell of userCells) {
          const cellText = cell.textContent.toLowerCase();
          if (cellText.includes(cleanUsername)) {
            cell.click();
            found = true;
            await sleep(1500);
            break;
          }
        }
        
        if (!found) {
          console.error(`❌ User @${cleanUsername} not found.`);
          state.stats.failed++;
          return false;
        }
        
        // Click Next if present
        const nextBtn = document.querySelector('[data-testid="nextButton"]');
        if (nextBtn) {
          nextBtn.click();
          await sleep(1500);
        }
        
        // Type message
        const msgInput = document.querySelector(SELECTORS.messageInput);
        if (!msgInput) {
          console.error('❌ Message input not found.');
          state.stats.failed++;
          return false;
        }
        
        msgInput.focus();
        
        // Use execCommand for better compatibility
        document.execCommand('insertText', false, message);
        
        await sleep(1000);
        
        // Send message
        const sendBtn = document.querySelector(SELECTORS.sendButton);
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          await sleep(1500);
          
          markAsSent(cleanUsername);
          state.stats.sent++;
          state.messageLog.push({
            to: cleanUsername,
            message,
            timestamp: new Date().toISOString(),
          });
          
          console.log(`✅ Message sent to @${cleanUsername}!`);
          return true;
        } else {
          console.error('❌ Send button not available.');
          state.stats.failed++;
          return false;
        }
        
      } catch (e) {
        console.error(`❌ Error sending to @${cleanUsername}:`, e.message);
        state.stats.failed++;
        return false;
      }
    },
    
    // Send to all target users
    sendToAll: async () => {
      if (CONFIG.targetUsers.length === 0) {
        console.error('❌ No target users configured!');
        return;
      }
      
      console.log(`🚀 Starting to send DMs to ${CONFIG.targetUsers.length} users...`);
      console.log(`⏱️ Delay between messages: ${CONFIG.limits.delayBetweenMessages / 1000}s`);
      console.log('');
      
      state.isRunning = true;
      
      for (const username of CONFIG.targetUsers) {
        if (!state.isRunning) break;
        if (state.stats.sent >= CONFIG.limits.messagesPerSession) {
          console.log(`🛑 Reached limit of ${CONFIG.limits.messagesPerSession} messages.`);
          break;
        }
        
        await window.XActions.DM.sendTo(username);
        
        if (state.isRunning && CONFIG.targetUsers.indexOf(username) < CONFIG.targetUsers.length - 1) {
          console.log(`⏳ Waiting ${CONFIG.limits.delayBetweenMessages / 1000}s before next message...`);
          await randomDelay(CONFIG.limits.delayBetweenMessages);
        }
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 DM SESSION COMPLETE!                                   ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.DM.stats();
    },
    
    // Add user to target list
    addUser: (username) => {
      const clean = username.replace('@', '').toLowerCase();
      if (!CONFIG.targetUsers.includes(clean)) {
        CONFIG.targetUsers.push(clean);
        console.log(`✅ Added @${clean} to DM list`);
      }
    },
    
    // Set message template
    setMessage: (template) => {
      CONFIG.messageTemplate = template;
      console.log('✅ Message template updated.');
      console.log('Preview:', template.replace('{username}', 'example'));
    },
    
    // Stop
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Stopped.');
    },
    
    // Stats
    stats: () => {
      console.log('');
      console.log('📊 DM STATS:');
      console.log(`   ✅ Sent: ${state.stats.sent}`);
      console.log(`   ❌ Failed: ${state.stats.failed}`);
      console.log(`   ⏭️ Skipped: ${state.stats.skipped}`);
      console.log(`   📜 Total messaged (all time): ${getSentHistory().length}`);
      console.log('');
    },
    
    // View message log
    log: () => {
      console.log('');
      console.log('📜 MESSAGE LOG:');
      state.messageLog.forEach(m => {
        console.log(`   → @${m.to} at ${m.timestamp}`);
      });
      console.log('');
    },
    
    // Clear sent history
    clearHistory: () => {
      if (confirm('⚠️ Clear all sent message history?')) {
        storage.set('sent', []);
        console.log('✅ History cleared.');
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 DM COMMANDS:');
      console.log('');
      console.log('   XActions.DM.addUser("username")');
      console.log('   XActions.DM.setMessage("Your message {username}")');
      console.log('   XActions.DM.sendTo("username")');
      console.log('   XActions.DM.sendToAll()');
      console.log('   XActions.DM.stop()');
      console.log('   XActions.DM.stats()');
      console.log('   XActions.DM.log()');
      console.log('   XActions.DM.clearHistory()');
      console.log('');
      console.log('💡 Use {username} in message template as placeholder.');
      console.log('⚠️ Always be respectful and don\'t spam!');
      console.log('');
    }
  };
  
  console.log('✅ Direct Message Helper loaded!');
  console.log('   Run XActions.DM.help() for commands.');
  console.log('');
})();
