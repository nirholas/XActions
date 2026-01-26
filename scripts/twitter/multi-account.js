/**
 * ============================================================
 * 👥 Multi-Account Manager
 * ============================================================
 * 
 * @name        multi-account.js
 * @description Manage and rotate between multiple X/Twitter accounts
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * ⚠️ SECURITY NOTICE:
 * ============================================================
 * 
 * Account data is stored in your browser's localStorage.
 * Only use this on your PERSONAL computer.
 * Never use on shared or public machines!
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Open any X page
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Use the manager commands shown below
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Storage key prefix
  storagePrefix: 'xactions_multi_',
  
  // Auto-detect current logged-in account
  autoDetect: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function multiAccountManager() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👥 MULTI-ACCOUNT MANAGER                                  ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage keys
  const KEYS = {
    accounts: CONFIG.storagePrefix + 'accounts',
    current: CONFIG.storagePrefix + 'current',
    stats: CONFIG.storagePrefix + 'stats',
    schedule: CONFIG.storagePrefix + 'schedule',
  };
  
  // Storage helpers
  const storage = {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(key) || 'null'); }
      catch { return null; }
    },
    set: (key, value) => {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };
  
  // Get current username from page
  const getCurrentUsername = () => {
    const accountBtn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (accountBtn) {
      const usernameEl = accountBtn.querySelector('div[dir="ltr"] span');
      if (usernameEl) {
        return usernameEl.textContent.replace('@', '').toLowerCase();
      }
    }
    return null;
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Accounts = {
    
    // Get all accounts
    getAll: () => storage.get(KEYS.accounts) || [],
    
    // Add account (just stores the username for tracking)
    add: (username, notes = '') => {
      const accounts = window.XActions.Accounts.getAll();
      const cleanUsername = username.replace('@', '').toLowerCase();
      
      if (accounts.find(a => a.username === cleanUsername)) {
        console.warn(`⚠️ Account @${cleanUsername} already exists.`);
        return false;
      }
      
      accounts.push({
        username: cleanUsername,
        notes,
        addedAt: Date.now(),
        lastUsed: null,
        status: 'active',
        stats: {
          follows: 0,
          unfollows: 0,
          likes: 0,
          tweets: 0,
        }
      });
      
      storage.set(KEYS.accounts, accounts);
      console.log(`✅ Added account @${cleanUsername}`);
      return true;
    },
    
    // Remove account
    remove: (username) => {
      let accounts = window.XActions.Accounts.getAll();
      const cleanUsername = username.replace('@', '').toLowerCase();
      const before = accounts.length;
      
      accounts = accounts.filter(a => a.username !== cleanUsername);
      
      if (accounts.length < before) {
        storage.set(KEYS.accounts, accounts);
        console.log(`✅ Removed account @${cleanUsername}`);
        return true;
      }
      
      console.warn(`⚠️ Account @${cleanUsername} not found.`);
      return false;
    },
    
    // Update account status
    setStatus: (username, status) => {
      const accounts = window.XActions.Accounts.getAll();
      const cleanUsername = username.replace('@', '').toLowerCase();
      const account = accounts.find(a => a.username === cleanUsername);
      
      if (account) {
        account.status = status;
        storage.set(KEYS.accounts, accounts);
        console.log(`✅ Updated @${cleanUsername} status to: ${status}`);
        return true;
      }
      
      console.warn(`⚠️ Account @${cleanUsername} not found.`);
      return false;
    },
    
    // Mark account as used
    markUsed: (username) => {
      const accounts = window.XActions.Accounts.getAll();
      const cleanUsername = username?.replace('@', '').toLowerCase();
      const account = accounts.find(a => a.username === cleanUsername);
      
      if (account) {
        account.lastUsed = Date.now();
        storage.set(KEYS.accounts, accounts);
        storage.set(KEYS.current, cleanUsername);
      }
    },
    
    // Get current account
    current: () => {
      const detected = getCurrentUsername();
      if (detected) {
        window.XActions.Accounts.markUsed(detected);
      }
      return detected || storage.get(KEYS.current);
    },
    
    // Get next account to use (for rotation)
    next: () => {
      const accounts = window.XActions.Accounts.getAll().filter(a => a.status === 'active');
      
      if (accounts.length === 0) {
        console.warn('⚠️ No active accounts available.');
        return null;
      }
      
      // Sort by lastUsed (null = never used = highest priority)
      accounts.sort((a, b) => {
        if (!a.lastUsed) return -1;
        if (!b.lastUsed) return 1;
        return a.lastUsed - b.lastUsed;
      });
      
      return accounts[0];
    },
    
    // Update stats for current account
    updateStats: (statType, increment = 1) => {
      const accounts = window.XActions.Accounts.getAll();
      const current = getCurrentUsername();
      const account = accounts.find(a => a.username === current);
      
      if (account && account.stats[statType] !== undefined) {
        account.stats[statType] += increment;
        storage.set(KEYS.accounts, accounts);
      }
    },
    
    // List all accounts
    list: () => {
      const accounts = window.XActions.Accounts.getAll();
      const current = getCurrentUsername();
      
      console.log('');
      console.log('═'.repeat(60));
      console.log('📋 ACCOUNT LIST');
      console.log('═'.repeat(60));
      
      if (accounts.length === 0) {
        console.log('No accounts added yet.');
        console.log('Use: XActions.Accounts.add("username")');
      } else {
        accounts.forEach((a, i) => {
          const lastUsed = a.lastUsed ? new Date(a.lastUsed).toLocaleString() : 'Never';
          const statusEmoji = {
            active: '✅',
            paused: '⏸️',
            limited: '⚠️',
            suspended: '🚫',
          }[a.status] || '❓';
          const isCurrent = a.username === current ? ' 👈 CURRENT' : '';
          
          console.log(`${i + 1}. ${statusEmoji} @${a.username}${isCurrent}`);
          console.log(`   Last used: ${lastUsed}`);
          console.log(`   Stats: ${a.stats.follows}F / ${a.stats.likes}L / ${a.stats.tweets}T`);
          if (a.notes) console.log(`   Notes: ${a.notes}`);
        });
      }
      console.log('═'.repeat(60));
      console.log('');
    },
    
    // Show stats for all accounts
    stats: () => {
      const accounts = window.XActions.Accounts.getAll();
      
      console.log('');
      console.log('📊 ACCOUNT STATISTICS:');
      console.log('');
      
      let totalFollows = 0;
      let totalLikes = 0;
      let totalTweets = 0;
      
      accounts.forEach(a => {
        console.log(`@${a.username}:`);
        console.log(`   Follows: ${a.stats.follows}, Likes: ${a.stats.likes}, Tweets: ${a.stats.tweets}`);
        totalFollows += a.stats.follows;
        totalLikes += a.stats.likes;
        totalTweets += a.stats.tweets;
      });
      
      console.log('');
      console.log(`📈 TOTALS: ${totalFollows} follows, ${totalLikes} likes, ${totalTweets} tweets`);
      console.log('');
    },
    
    // Switch account (opens account switcher)
    switch: () => {
      const switcherBtn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (switcherBtn) {
        switcherBtn.click();
        console.log('📋 Account switcher opened. Select an account.');
      } else {
        console.error('❌ Account switcher not found. Make sure you\'re on X.com');
      }
    },
    
    // Clear all account data
    clear: () => {
      if (confirm('⚠️ This will delete ALL saved account data. Continue?')) {
        localStorage.removeItem(KEYS.accounts);
        localStorage.removeItem(KEYS.current);
        localStorage.removeItem(KEYS.stats);
        console.log('✅ All account data cleared.');
      }
    },
    
    // Export accounts (without sensitive data)
    export: () => {
      const accounts = window.XActions.Accounts.getAll().map(a => ({
        username: a.username,
        notes: a.notes,
        status: a.status,
        stats: a.stats,
      }));
      
      const json = JSON.stringify(accounts, null, 2);
      console.log('📋 Account data (copy this):');
      console.log(json);
      
      // Also copy to clipboard
      navigator.clipboard?.writeText(json);
      console.log('✅ Copied to clipboard!');
    },
    
    // Import accounts
    import: (jsonString) => {
      try {
        const imported = JSON.parse(jsonString);
        const accounts = window.XActions.Accounts.getAll();
        
        imported.forEach(a => {
          if (!accounts.find(existing => existing.username === a.username)) {
            accounts.push({
              ...a,
              addedAt: Date.now(),
              lastUsed: null,
            });
          }
        });
        
        storage.set(KEYS.accounts, accounts);
        console.log(`✅ Imported ${imported.length} accounts.`);
      } catch (e) {
        console.error('❌ Invalid JSON format:', e.message);
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 MULTI-ACCOUNT COMMANDS:');
      console.log('');
      console.log('   XActions.Accounts.add("username")  - Add account');
      console.log('   XActions.Accounts.remove("user")   - Remove account');
      console.log('   XActions.Accounts.list()           - List all accounts');
      console.log('   XActions.Accounts.current()        - Get current account');
      console.log('   XActions.Accounts.next()           - Get next in rotation');
      console.log('   XActions.Accounts.switch()         - Open account switcher');
      console.log('   XActions.Accounts.stats()          - Show all stats');
      console.log('   XActions.Accounts.setStatus("u","s") - Set status');
      console.log('   XActions.Accounts.export()         - Export account list');
      console.log('   XActions.Accounts.import(json)     - Import accounts');
      console.log('   XActions.Accounts.clear()          - Clear all data');
      console.log('');
      console.log('📊 STATUS VALUES: active, paused, limited, suspended');
      console.log('');
    }
  };
  
  // Auto-detect current account
  if (CONFIG.autoDetect) {
    const current = getCurrentUsername();
    if (current) {
      const accounts = window.XActions.Accounts.getAll();
      if (!accounts.find(a => a.username === current)) {
        console.log(`🔍 Detected current account: @${current}`);
        console.log('   Run XActions.Accounts.add("' + current + '") to track it.');
      } else {
        window.XActions.Accounts.markUsed(current);
        console.log(`👤 Current account: @${current}`);
      }
    }
  }
  
  console.log('✅ Multi-Account Manager loaded!');
  console.log('   Run XActions.Accounts.help() for commands.');
  console.log('');
})();
