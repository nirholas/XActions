// UnfollowX Automation - Multi-Account Manager
// https://github.com/nirholas/UnfollowX
//
// REQUIRES: Paste core.js first!
//
// Manages multiple X accounts for automation.
// Stores account list locally, rotates between them.
//
// ⚠️ SECURITY NOTE: Credentials are stored in your browser's localStorage.
// Only use this on your personal computer. Never on shared/public machines.
//
// HOW TO USE:
// 1. Open any X page
// 2. Paste core.js, then paste this script
// 3. Use the manager functions to add/manage accounts

(() => {
  if (!window.UnfollowX?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, storage } = window.UnfollowX.Core;

  // ============================================
  // STORAGE KEYS
  // ============================================
  const ACCOUNTS_KEY = 'multi_accounts';
  const CURRENT_ACCOUNT_KEY = 'current_account';
  const ACCOUNT_STATS_KEY = 'account_stats';

  // ============================================
  // ACCOUNT MANAGER
  // ============================================
  const AccountManager = {
    
    // Get all accounts
    getAccounts: () => {
      return storage.get(ACCOUNTS_KEY) || [];
    },

    // Add a new account
    addAccount: (username, password, notes = '') => {
      const accounts = AccountManager.getAccounts();
      
      // Check if already exists
      if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
        log(`Account @${username} already exists`, 'warning');
        return false;
      }

      accounts.push({
        username: username.toLowerCase(),
        password,
        notes,
        addedAt: Date.now(),
        lastUsed: null,
        status: 'active', // active, paused, limited, suspended
      });

      storage.set(ACCOUNTS_KEY, accounts);
      log(`Added account @${username}`, 'success');
      return true;
    },

    // Remove an account
    removeAccount: (username) => {
      let accounts = AccountManager.getAccounts();
      const before = accounts.length;
      accounts = accounts.filter(a => a.username.toLowerCase() !== username.toLowerCase());
      
      if (accounts.length < before) {
        storage.set(ACCOUNTS_KEY, accounts);
        log(`Removed account @${username}`, 'success');
        return true;
      }
      
      log(`Account @${username} not found`, 'warning');
      return false;
    },

    // Update account status
    updateStatus: (username, status) => {
      const accounts = AccountManager.getAccounts();
      const account = accounts.find(a => a.username.toLowerCase() === username.toLowerCase());
      
      if (account) {
        account.status = status;
        storage.set(ACCOUNTS_KEY, accounts);
        log(`Updated @${username} status to: ${status}`, 'success');
        return true;
      }
      
      return false;
    },

    // Get next account to use (rotation)
    getNextAccount: () => {
      const accounts = AccountManager.getAccounts().filter(a => a.status === 'active');
      
      if (accounts.length === 0) {
        log('No active accounts available', 'warning');
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

    // Mark account as used
    markUsed: (username) => {
      const accounts = AccountManager.getAccounts();
      const account = accounts.find(a => a.username.toLowerCase() === username.toLowerCase());
      
      if (account) {
        account.lastUsed = Date.now();
        storage.set(ACCOUNTS_KEY, accounts);
        storage.set(CURRENT_ACCOUNT_KEY, username);
      }
    },

    // Get current account
    getCurrentAccount: () => {
      return storage.get(CURRENT_ACCOUNT_KEY);
    },

    // List all accounts
    listAccounts: () => {
      const accounts = AccountManager.getAccounts();
      
      console.log('\n' + '='.repeat(60));
      console.log('📋 ACCOUNT LIST');
      console.log('='.repeat(60));
      
      if (accounts.length === 0) {
        console.log('No accounts added yet.');
        console.log('Use: UnfollowX.Accounts.add("username", "password")');
      } else {
        accounts.forEach((a, i) => {
          const lastUsed = a.lastUsed ? new Date(a.lastUsed).toLocaleString() : 'Never';
          const statusEmoji = {
            active: '✅',
            paused: '⏸️',
            limited: '⚠️',
            suspended: '❌',
          }[a.status] || '❓';
          
          console.log(`\n${i + 1}. @${a.username} ${statusEmoji}`);
          console.log(`   Status: ${a.status}`);
          console.log(`   Last used: ${lastUsed}`);
          if (a.notes) console.log(`   Notes: ${a.notes}`);
        });
      }
      
      console.log('\n' + '='.repeat(60));
      return accounts;
    },

    // Export accounts (for backup - SENSITIVE!)
    exportAccounts: () => {
      const accounts = AccountManager.getAccounts();
      const data = JSON.stringify(accounts, null, 2);
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `x-accounts-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      log('⚠️ Exported accounts. Keep this file secure!', 'warning');
    },

    // Import accounts from backup
    importAccounts: (jsonString) => {
      try {
        const imported = JSON.parse(jsonString);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        
        const existing = AccountManager.getAccounts();
        let added = 0;
        
        for (const account of imported) {
          if (!existing.some(e => e.username === account.username)) {
            existing.push(account);
            added++;
          }
        }
        
        storage.set(ACCOUNTS_KEY, existing);
        log(`Imported ${added} new accounts`, 'success');
        return added;
      } catch (e) {
        log(`Import error: ${e.message}`, 'error');
        return 0;
      }
    },

    // Import accounts from simple text format (user:pass per line)
    // Perfect for pasting from a txt or csv file!
    importFromText: (text) => {
      const lines = text.trim().split('\n');
      let added = 0;
      let skipped = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue; // Skip empty lines and comments
        
        // Support multiple formats:
        // user:pass
        // user,pass
        // user;pass
        // user\tpass (tab separated)
        const parts = trimmed.split(/[:;,\t]/);
        
        if (parts.length >= 1) {
          const username = parts[0].trim().replace('@', '').toLowerCase();
          const password = parts[1]?.trim() || '';
          const notes = parts[2]?.trim() || '';
          
          if (username) {
            const success = AccountManager.addAccount(username, password, notes);
            if (success) added++;
            else skipped++;
          }
        }
      }
      
      log(`Imported ${added} accounts (${skipped} skipped/duplicates)`, 'success');
      return added;
    },

    // Export accounts as simple text format
    exportAsText: () => {
      const accounts = AccountManager.getAccounts();
      const lines = accounts.map(a => {
        let line = a.username;
        if (a.password) line += ':' + a.password;
        if (a.notes) line += ':' + a.notes;
        return line;
      });
      
      const text = lines.join('\n');
      
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `x-accounts-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      log('Exported accounts as text file', 'success');
      console.log('\nFormat: username:password:notes');
      console.log('Preview:\n' + text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      
      return text;
    },

    // Clear all accounts
    clearAll: () => {
      storage.remove(ACCOUNTS_KEY);
      storage.remove(CURRENT_ACCOUNT_KEY);
      log('Cleared all accounts', 'warning');
    },
  };

  // ============================================
  // ACCOUNT STATS
  // ============================================
  const AccountStats = {
    
    record: (username, action, count = 1) => {
      const stats = storage.get(ACCOUNT_STATS_KEY) || {};
      
      if (!stats[username]) {
        stats[username] = {
          follows: 0,
          unfollows: 0,
          likes: 0,
          comments: 0,
          sessions: 0,
        };
      }
      
      stats[username][action] = (stats[username][action] || 0) + count;
      stats[username].lastAction = Date.now();
      
      storage.set(ACCOUNT_STATS_KEY, stats);
    },

    get: (username) => {
      const stats = storage.get(ACCOUNT_STATS_KEY) || {};
      return stats[username] || null;
    },

    getAll: () => {
      return storage.get(ACCOUNT_STATS_KEY) || {};
    },

    show: () => {
      const stats = AccountStats.getAll();
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 ACCOUNT STATISTICS');
      console.log('='.repeat(60));
      
      for (const [username, data] of Object.entries(stats)) {
        console.log(`\n@${username}:`);
        console.log(`   Follows: ${data.follows || 0}`);
        console.log(`   Unfollows: ${data.unfollows || 0}`);
        console.log(`   Likes: ${data.likes || 0}`);
        console.log(`   Comments: ${data.comments || 0}`);
        console.log(`   Sessions: ${data.sessions || 0}`);
      }
      
      console.log('\n' + '='.repeat(60));
    },
  };

  // ============================================
  // LOGIN HELPER
  // ============================================
  const LoginHelper = {
    
    // Check if currently logged in
    isLoggedIn: () => {
      return !!document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    },

    // Get current logged in username
    getCurrentUser: () => {
      const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (switcher) {
        const match = switcher.textContent.match(/@(\w+)/);
        return match ? match[1].toLowerCase() : null;
      }
      return null;
    },

    // Navigate to login page
    goToLogin: () => {
      window.location.href = 'https://twitter.com/login';
    },

    // Navigate to logout
    logout: async () => {
      // Click account switcher
      const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (switcher) {
        switcher.click();
        await sleep(500);
        
        // Look for logout option
        const logoutBtn = [...document.querySelectorAll('[role="menuitem"]')]
          .find(el => el.textContent.includes('Log out'));
        
        if (logoutBtn) {
          logoutBtn.click();
          await sleep(500);
          
          // Confirm logout
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) confirmBtn.click();
        }
      }
    },

    // Instructions for manual login
    showLoginInstructions: (account) => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔐 LOGIN REQUIRED                                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Account: @${account.username.padEnd(20)}                 ║
║  Password: ${account.password.substring(0, 3)}${'*'.repeat(account.password.length - 3).padEnd(17)}                 ║
║                                                           ║
║  Please log in manually, then run your automation.        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    },
  };

  // ============================================
  // EXPOSE API
  // ============================================
  window.UnfollowX.Accounts = {
    // Account management
    add: AccountManager.addAccount,
    remove: AccountManager.removeAccount,
    list: AccountManager.listAccounts,
    setStatus: AccountManager.updateStatus,
    getNext: AccountManager.getNextAccount,
    getCurrent: AccountManager.getCurrentAccount,
    export: AccountManager.exportAccounts,
    exportText: AccountManager.exportAsText,
    import: AccountManager.importAccounts,
    importText: AccountManager.importFromText,
    clear: AccountManager.clearAll,
    
    // Stats
    stats: AccountStats,
    
    // Login
    login: LoginHelper,
  };

  // ============================================
  // STARTUP INFO
  // ============================================
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  👥 UnfollowX Multi-Account Manager                       ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Commands:                                                ║
║  • XAccounts.add(user, pass)     - Add account            ║
║  • XAccounts.list()              - List accounts          ║
║  • XAccounts.remove(user)        - Remove account         ║
║  • XAccounts.getNext()           - Get next to use        ║
║  • XAccounts.stats.show()        - Show statistics        ║
║  • XAccounts.export()            - Backup (JSON)          ║
║  • XAccounts.exportText()        - Backup (user:pass txt) ║
║                                                           ║
║  Import from txt/csv (user:pass format):                  ║
║  • XAccounts.importText(\`                                 ║
║      personal:mypass123                                   ║
║      business:bizpass456                                  ║
║    \`)                                                     ║
║                                                           ║
║  Current user: @${(LoginHelper.getCurrentUser() || 'not logged in').padEnd(20)}    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Global shortcut
  window.XAccounts = window.UnfollowX.Accounts;

  const accounts = AccountManager.getAccounts();
  if (accounts.length > 0) {
    log(`Loaded ${accounts.length} accounts`, 'info');
  }
})();
