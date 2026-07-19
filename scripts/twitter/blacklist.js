// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * ============================================================
 * 🚫 Blacklist Manager
 * ============================================================
 * 
 * @name        blacklist.js
 * @description Manage a blacklist of users to ignore/skip
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 WHAT IT DOES:
 * ============================================================
 * 
 * • Maintains a list of users to ignore
 * • Never follow blacklisted users
 * • Never like/RT blacklisted users' content
 * • Skip blacklisted users in automation
 * • Other XActions scripts can check this list
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Open any X page
 * 2. Open Chrome DevTools (F12)
 * 3. Paste this script and press Enter
 * 4. Use XActions.Blacklist commands
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Storage key
  storageKey: 'xactions_blacklist',
  
  // Pre-populate with accounts to avoid
  defaultBlacklist: [
    // 'spammer123',
    // 'botaccount',
  ],
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(function blacklistManager() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚫 BLACKLIST MANAGER                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage helpers
  const getBlacklist = () => {
    try {
      const data = localStorage.getItem(CONFIG.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };
  
  const saveBlacklist = (list) => {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
  };
  
  // Initialize with defaults if empty
  const init = () => {
    const current = getBlacklist();
    if (current.length === 0 && CONFIG.defaultBlacklist.length > 0) {
      const defaults = CONFIG.defaultBlacklist.map(u => ({
        username: u.replace('@', '').toLowerCase(),
        addedAt: Date.now(),
        reason: 'default'
      }));
      saveBlacklist(defaults);
    }
  };
  
  init();
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Blacklist = {
    
    // Add user to blacklist
    add: (username, reason = '') => {
      const list = getBlacklist();
      const clean = username.replace('@', '').toLowerCase();
      
      if (list.find(u => u.username === clean)) {
        console.log(`⚠️ @${clean} is already blacklisted.`);
        return false;
      }
      
      list.push({
        username: clean,
        addedAt: Date.now(),
        reason: reason || 'manual'
      });
      
      saveBlacklist(list);
      console.log(`🚫 Added @${clean} to blacklist.`);
      return true;
    },
    
    // Add multiple users
    addBulk: (usernames, reason = 'bulk') => {
      let added = 0;
      usernames.forEach(u => {
        const list = getBlacklist();
        const clean = u.replace('@', '').toLowerCase();
        if (!list.find(x => x.username === clean)) {
          list.push({ username: clean, addedAt: Date.now(), reason });
          saveBlacklist(list);
          added++;
        }
      });
      console.log(`🚫 Added ${added} users to blacklist.`);
    },
    
    // Remove user from blacklist
    remove: (username) => {
      let list = getBlacklist();
      const clean = username.replace('@', '').toLowerCase();
      const before = list.length;
      
      list = list.filter(u => u.username !== clean);
      
      if (list.length < before) {
        saveBlacklist(list);
        console.log(`✅ Removed @${clean} from blacklist.`);
        return true;
      }
      
      console.log(`⚠️ @${clean} was not in blacklist.`);
      return false;
    },
    
    // Check if user is blacklisted
    includes: (username) => {
      const list = getBlacklist();
      const clean = username.replace('@', '').toLowerCase();
      return list.some(u => u.username === clean);
    },
    
    // Alias for includes
    has: (username) => window.XActions.Blacklist.includes(username),
    
    // Get all blacklisted users
    getAll: () => {
      return getBlacklist();
    },
    
    // Get just usernames
    getUsernames: () => {
      return getBlacklist().map(u => u.username);
    },
    
    // Count
    count: () => {
      return getBlacklist().length;
    },
    
    // List all
    list: () => {
      const list = getBlacklist();
      console.log('');
      console.log('═'.repeat(50));
      console.log('🚫 BLACKLISTED USERS');
      console.log('═'.repeat(50));
      
      if (list.length === 0) {
        console.log('No users blacklisted yet.');
      } else {
        list.forEach((u, i) => {
          const date = new Date(u.addedAt).toLocaleDateString();
          console.log(`${i + 1}. @${u.username} (added: ${date}${u.reason ? ', ' + u.reason : ''})`);
        });
      }
      
      console.log('═'.repeat(50));
      console.log(`Total: ${list.length} users`);
      console.log('');
    },
    
    // Search
    search: (query) => {
      const list = getBlacklist();
      const matches = list.filter(u => u.username.includes(query.toLowerCase()));
      
      console.log(`🔍 Found ${matches.length} matches for "${query}":`);
      matches.forEach(u => console.log(`   @${u.username}`));
      
      return matches;
    },
    
    // Clear all
    clear: () => {
      if (confirm('⚠️ Clear entire blacklist?')) {
        saveBlacklist([]);
        console.log('✅ Blacklist cleared.');
      }
    },
    
    // Export
    export: () => {
      const list = getBlacklist();
      const usernames = list.map(u => u.username);
      console.log('📋 Blacklist (copy this):');
      console.log(JSON.stringify(usernames));
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(usernames))
          .then(() => console.log('✅ Copied to clipboard!'))
          .catch(() => console.log('⚠️ Clipboard copy failed. Copy the JSON above manually.'));
      }
      return usernames;
    },
    
    // Import
    import: (usernamesArray) => {
      if (!Array.isArray(usernamesArray)) {
        try {
          usernamesArray = JSON.parse(usernamesArray);
        } catch {
          console.error('❌ Invalid format. Provide an array of usernames.');
          return;
        }
      }
      
      window.XActions.Blacklist.addBulk(usernamesArray, 'import');
    },
    
    // Block current user (from profile page)
    blockCurrentUser: () => {
      const urlMatch = window.location.href.match(/x\.com\/([^\/\?]+)/);
      if (urlMatch && urlMatch[1]) {
        const username = urlMatch[1];
        if (!['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(username)) {
          window.XActions.Blacklist.add(username, 'from profile');
          return true;
        }
      }
      console.error('❌ Not on a user profile page.');
      return false;
    },
    
    // Auto-blacklist users with certain patterns
    autoBlacklist: (options = {}) => {
      const defaults = {
        noProfilePic: true,
        noTweets: true,
        followRatio: 100, // Following / Followers ratio
      };
      
      const opts = { ...defaults, ...options };
      console.log('🤖 Auto-blacklist rules:', opts);
      console.log('💡 This is a configuration helper. Use with other scripts.');
      
      return opts;
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 BLACKLIST COMMANDS:');
      console.log('');
      console.log('   XActions.Blacklist.add("username")');
      console.log('   XActions.Blacklist.add("user", "spam")');
      console.log('   XActions.Blacklist.addBulk(["u1", "u2"])');
      console.log('   XActions.Blacklist.remove("username")');
      console.log('   XActions.Blacklist.has("username")');
      console.log('   XActions.Blacklist.list()');
      console.log('   XActions.Blacklist.search("pattern")');
      console.log('   XActions.Blacklist.count()');
      console.log('   XActions.Blacklist.export()');
      console.log('   XActions.Blacklist.import([...])');
      console.log('   XActions.Blacklist.blockCurrentUser()');
      console.log('   XActions.Blacklist.clear()');
      console.log('');
    }
  };
  
  console.log(`🚫 Blacklist Manager loaded! (${getBlacklist().length} users)`);
  console.log('   Run XActions.Blacklist.help() for commands.');
  console.log('');
})();
