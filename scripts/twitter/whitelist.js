/**
 * ============================================================
 * ✅ Whitelist Manager
 * ============================================================
 * 
 * @name        whitelist.js
 * @description Manage a whitelist of protected users
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 WHAT IT DOES:
 * ============================================================
 * 
 * • Maintains a list of protected accounts
 * • Never unfollow whitelisted users
 * • Never block/mute whitelisted users
 * • Other XActions scripts can check this list
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Open any X page
 * 2. Open Chrome DevTools (F12)
 * 3. Paste this script and press Enter
 * 4. Use XActions.Whitelist commands
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Storage key
  storageKey: 'xactions_whitelist',
  
  // Pre-populate with important accounts
  defaultWhitelist: [
    // 'nichxbt',
    // 'importantfriend',
  ],
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(function whitelistManager() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ WHITELIST MANAGER                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage helpers
  const getWhitelist = () => {
    try {
      const data = localStorage.getItem(CONFIG.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };
  
  const saveWhitelist = (list) => {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
  };
  
  // Initialize with defaults if empty
  const init = () => {
    const current = getWhitelist();
    if (current.length === 0 && CONFIG.defaultWhitelist.length > 0) {
      const defaults = CONFIG.defaultWhitelist.map(u => ({
        username: u.replace('@', '').toLowerCase(),
        addedAt: Date.now(),
        reason: 'default'
      }));
      saveWhitelist(defaults);
    }
  };
  
  init();
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Whitelist = {
    
    // Add user to whitelist
    add: (username, reason = '') => {
      const list = getWhitelist();
      const clean = username.replace('@', '').toLowerCase();
      
      if (list.find(u => u.username === clean)) {
        console.log(`⚠️ @${clean} is already whitelisted.`);
        return false;
      }
      
      list.push({
        username: clean,
        addedAt: Date.now(),
        reason: reason || 'manual'
      });
      
      saveWhitelist(list);
      console.log(`✅ Added @${clean} to whitelist.`);
      return true;
    },
    
    // Add multiple users
    addBulk: (usernames) => {
      let added = 0;
      usernames.forEach(u => {
        if (window.XActions.Whitelist.add(u, 'bulk')) added++;
      });
      console.log(`✅ Added ${added} users to whitelist.`);
    },
    
    // Remove user from whitelist
    remove: (username) => {
      let list = getWhitelist();
      const clean = username.replace('@', '').toLowerCase();
      const before = list.length;
      
      list = list.filter(u => u.username !== clean);
      
      if (list.length < before) {
        saveWhitelist(list);
        console.log(`✅ Removed @${clean} from whitelist.`);
        return true;
      }
      
      console.log(`⚠️ @${clean} was not in whitelist.`);
      return false;
    },
    
    // Check if user is whitelisted
    includes: (username) => {
      const list = getWhitelist();
      const clean = username.replace('@', '').toLowerCase();
      return list.some(u => u.username === clean);
    },
    
    // Alias for includes
    has: (username) => window.XActions.Whitelist.includes(username),
    
    // Get all whitelisted users
    getAll: () => {
      return getWhitelist();
    },
    
    // Get just usernames
    getUsernames: () => {
      return getWhitelist().map(u => u.username);
    },
    
    // Count
    count: () => {
      return getWhitelist().length;
    },
    
    // List all
    list: () => {
      const list = getWhitelist();
      console.log('');
      console.log('═'.repeat(50));
      console.log('✅ WHITELISTED USERS');
      console.log('═'.repeat(50));
      
      if (list.length === 0) {
        console.log('No users whitelisted yet.');
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
    
    // Clear all
    clear: () => {
      if (confirm('⚠️ Clear entire whitelist?')) {
        saveWhitelist([]);
        console.log('✅ Whitelist cleared.');
      }
    },
    
    // Export
    export: () => {
      const list = getWhitelist();
      const usernames = list.map(u => u.username);
      console.log('📋 Whitelist (copy this):');
      console.log(JSON.stringify(usernames));
      navigator.clipboard?.writeText(JSON.stringify(usernames));
      console.log('✅ Copied to clipboard!');
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
      
      window.XActions.Whitelist.addBulk(usernamesArray);
    },
    
    // Collect from current page (following list, etc.)
    collectFromPage: () => {
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      const users = [];
      
      userCells.forEach(cell => {
        const link = cell.querySelector('a[href^="/"]');
        const username = link?.getAttribute('href')?.replace('/', '');
        if (username && !username.includes('/')) {
          users.push(username);
        }
      });
      
      console.log(`📥 Found ${users.length} users on page.`);
      
      if (users.length > 0) {
        const add = confirm(`Add ${users.length} users to whitelist?`);
        if (add) {
          window.XActions.Whitelist.addBulk(users);
        }
      }
      
      return users;
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 WHITELIST COMMANDS:');
      console.log('');
      console.log('   XActions.Whitelist.add("username")');
      console.log('   XActions.Whitelist.add("user", "reason")');
      console.log('   XActions.Whitelist.addBulk(["u1", "u2"])');
      console.log('   XActions.Whitelist.remove("username")');
      console.log('   XActions.Whitelist.has("username")');
      console.log('   XActions.Whitelist.list()');
      console.log('   XActions.Whitelist.count()');
      console.log('   XActions.Whitelist.export()');
      console.log('   XActions.Whitelist.import([...])');
      console.log('   XActions.Whitelist.collectFromPage()');
      console.log('   XActions.Whitelist.clear()');
      console.log('');
    }
  };
  
  console.log(`✅ Whitelist Manager loaded! (${getWhitelist().length} users)`);
  console.log('   Run XActions.Whitelist.help() for commands.');
  console.log('');
})();
