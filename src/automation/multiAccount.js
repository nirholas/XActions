// GENERATED FILE: a copy of browser/multiAccount.js, written by scripts/build-script-manifest.mjs. Edit browser/multiAccount.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 👥 Multi-Account Manager
 * ============================================================
 *
 * @name        multiAccount.js
 * @title       Multi-Account Manager
 * @description Keep a local list of your X accounts with status, rotation, usage stats, import and export, from the console.
 * @category    profile
 * @page        x.com/*
 * @writes      false
 * @aliases     src/automation/multiAccount.js, scripts/twitter/multi-account.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * ⚠️ SECURITY NOTE:
 *
 * Account data (and any password you choose to add) is stored in your
 * browser's localStorage. Only use this on your personal computer.
 * Never on shared/public machines. Exports leave passwords out unless
 * you set CONFIG.exportPasswords = true.
 *
 * ============================================================
 * 📋 USAGE:
 *
 * Manages multiple X accounts for automation.
 * Stores account list locally, rotates between them.
 *
 * 1. Open any X page
 * 2. Paste browser/multiAccount.js into the DevTools console and press Enter
 *    (src/automation/core.js is optional: when it is pasted first its
 *    logger and storage are used)
 * 3. Use the manager functions to add/manage accounts:
 *    XAccounts.help() lists every command
 * ============================================================
 */

(() => {
  // ============================================
  // CORE (optional): use core.js when present, built-ins otherwise
  // ============================================
  const Core = window.XActions?.Core;

  const sleep = Core?.sleep || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  const log = Core?.log || ((message, type = 'info') => {
    const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
    console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
  });
  // Same key layout as core.js storage (xactions_ prefix, JSON values)
  const storage = Core?.storage || {
    get: (key) => {
      try {
        const data = localStorage.getItem('xactions_' + key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('xactions_' + key, JSON.stringify(value));
        return true;
      } catch (e) {
        log(`Storage set error: ${e.message}`, 'error');
        return false;
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem('xactions_' + key);
      } catch {
        // storage blocked: nothing to remove
      }
    },
  };

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // On load, detect the signed-in account; mark it used if it is tracked,
    // or print the command to track it
    autoDetect: false,

    // Include stored passwords in export() and exportText() files
    exportPasswords: false,
  };

  // ============================================
  // STORAGE KEYS
  // ============================================
  const ACCOUNTS_KEY = 'multi_accounts';         // xactions_multi_accounts (shared by every version)
  const CURRENT_ACCOUNT_KEY = 'current_account';
  const LEGACY_CURRENT_KEY = 'multi_current';    // written by the scripts/twitter variant
  const LEGACY_STATS_KEY = 'multi_stats';
  const ACCOUNT_STATS_KEY = 'account_stats';

  const cleanName = (username) => String(username || '').replace('@', '').toLowerCase();
  const emptyStats = () => ({ follows: 0, unfollows: 0, likes: 0, tweets: 0 });

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
      const clean = cleanName(username);

      // Check if already exists
      if (accounts.some(a => a.username.toLowerCase() === clean)) {
        log(`Account @${clean} already exists`, 'warning');
        return false;
      }

      accounts.push({
        username: clean,
        password: password || '',
        notes,
        addedAt: Date.now(),
        lastUsed: null,
        status: 'active', // active, paused, limited, suspended
        stats: emptyStats(),
      });

      storage.set(ACCOUNTS_KEY, accounts);
      log(`Added account @${clean}`, 'success');
      return true;
    },

    // Remove an account
    removeAccount: (username) => {
      let accounts = AccountManager.getAccounts();
      const clean = cleanName(username);
      const before = accounts.length;
      accounts = accounts.filter(a => a.username.toLowerCase() !== clean);

      if (accounts.length < before) {
        storage.set(ACCOUNTS_KEY, accounts);
        log(`Removed account @${clean}`, 'success');
        return true;
      }

      log(`Account @${clean} not found`, 'warning');
      return false;
    },

    // Update account status
    updateStatus: (username, status) => {
      const accounts = AccountManager.getAccounts();
      const clean = cleanName(username);
      const account = accounts.find(a => a.username.toLowerCase() === clean);

      if (account) {
        account.status = status;
        storage.set(ACCOUNTS_KEY, accounts);
        log(`Updated @${clean} status to: ${status}`, 'success');
        return true;
      }

      log(`Account @${clean} not found`, 'warning');
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
      const clean = cleanName(username);
      const account = accounts.find(a => a.username.toLowerCase() === clean);

      if (account) {
        account.lastUsed = Date.now();
        storage.set(ACCOUNTS_KEY, accounts);
        storage.set(CURRENT_ACCOUNT_KEY, clean);
        storage.set(LEGACY_CURRENT_KEY, clean);
      }
    },

    // Get current account
    getCurrentAccount: () => {
      return storage.get(CURRENT_ACCOUNT_KEY) || storage.get(LEGACY_CURRENT_KEY);
    },

    // Detect the signed-in account from the page, mark it used, fall back to the stored one
    detectCurrentAccount: () => {
      const detected = LoginHelper.getCurrentUser();
      if (detected) {
        AccountManager.markUsed(detected);
      }
      return detected || AccountManager.getCurrentAccount();
    },

    // Add to a usage counter (follows, unfollows, likes, tweets) of the signed-in account
    updateStats: (statType, increment = 1) => {
      const accounts = AccountManager.getAccounts();
      const current = LoginHelper.getCurrentUser();
      const account = accounts.find(a => a.username === current);

      if (account) {
        account.stats = account.stats || emptyStats();
        if (account.stats[statType] !== undefined) {
          account.stats[statType] += increment;
          storage.set(ACCOUNTS_KEY, accounts);
        }
      }
    },

    // List all accounts
    listAccounts: () => {
      const accounts = AccountManager.getAccounts();
      const current = LoginHelper.getCurrentUser();

      console.log('\n' + '='.repeat(60));
      console.log('📋 ACCOUNT LIST');
      console.log('='.repeat(60));

      if (accounts.length === 0) {
        console.log('No accounts added yet.');
        console.log('Use: XActions.Accounts.add("username", "password")');
      } else {
        accounts.forEach((a, i) => {
          const lastUsed = a.lastUsed ? new Date(a.lastUsed).toLocaleString() : 'Never';
          const statusEmoji = {
            active: '✅',
            paused: '⏸️',
            limited: '⚠️',
            suspended: '❌',
          }[a.status] || '❓';
          const isCurrent = a.username === current ? ' 👈 CURRENT' : '';

          console.log(`\n${i + 1}. @${a.username} ${statusEmoji}${isCurrent}`);
          console.log(`   Status: ${a.status}`);
          console.log(`   Last used: ${lastUsed}`);
          if (a.stats) console.log(`   Stats: ${a.stats.follows || 0}F / ${a.stats.likes || 0}L / ${a.stats.tweets || 0}T`);
          if (a.notes) console.log(`   Notes: ${a.notes}`);
        });
      }

      console.log('\n' + '='.repeat(60));
      return accounts;
    },

    // Account records as exported: passwords only when CONFIG.exportPasswords is on
    exportable: () => {
      return AccountManager.getAccounts().map((a) => {
        if (CONFIG.exportPasswords) return a;
        const { password: _password, ...rest } = a;
        return rest;
      });
    },

    // Export accounts (for backup)
    exportAccounts: () => {
      const accounts = AccountManager.exportable();
      const data = JSON.stringify(accounts, null, 2);

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `x-accounts-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log('📋 Account data (copy this):');
      console.log(data);

      // Also copy to clipboard (only claim success when the write succeeds)
      if (navigator.clipboard) {
        navigator.clipboard.writeText(data)
          .then(() => console.log('✅ Copied to clipboard!'))
          .catch(() => console.warn('⚠️ Clipboard copy failed. Copy the JSON above manually.'));
      }

      if (CONFIG.exportPasswords) {
        log('⚠️ Exported accounts WITH passwords. Keep this file secure!', 'warning');
      } else {
        log('Exported accounts (passwords left out; set CONFIG.exportPasswords = true to include them)', 'success');
      }
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
        if (CONFIG.exportPasswords) {
          if (a.password) line += ':' + a.password;
          if (a.notes) line += ':' + a.notes;
        } else if (a.notes) {
          // Empty password field keeps notes in the third column
          line += '::' + a.notes;
        }
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

      log(`Exported accounts as text file${CONFIG.exportPasswords ? '' : ' (passwords left out)'}`, 'success');
      console.log('\nFormat: username:password:notes');
      console.log('Preview:\n' + text.substring(0, 200) + (text.length > 200 ? '...' : ''));

      return text;
    },

    // Clear all accounts
    clearAll: () => {
      if (!confirm('⚠️ This will delete ALL saved account data. Continue?')) {
        log('Clear cancelled', 'info');
        return false;
      }
      storage.remove(ACCOUNTS_KEY);
      storage.remove(CURRENT_ACCOUNT_KEY);
      storage.remove(LEGACY_CURRENT_KEY);
      storage.remove(LEGACY_STATS_KEY);
      log('Cleared all accounts', 'warning');
      return true;
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

      // Per-account counters kept on the account records (updateStats)
      const tracked = AccountManager.getAccounts().filter(a => a.stats);
      if (tracked.length > 0) {
        let totalFollows = 0;
        let totalLikes = 0;
        let totalTweets = 0;

        console.log('\nPer-account counters:');
        tracked.forEach(a => {
          console.log(`@${a.username}:`);
          console.log(`   Follows: ${a.stats.follows || 0}, Likes: ${a.stats.likes || 0}, Tweets: ${a.stats.tweets || 0}`);
          totalFollows += a.stats.follows || 0;
          totalLikes += a.stats.likes || 0;
          totalTweets += a.stats.tweets || 0;
        });

        console.log(`\n📈 TOTALS: ${totalFollows} follows, ${totalLikes} likes, ${totalTweets} tweets`);
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
        // The button holds both the display name and the @handle; look for
        // the span starting with "@" first
        for (const span of switcher.querySelectorAll('span')) {
          const text = span.textContent.trim();
          if (text.startsWith('@')) return text.slice(1).toLowerCase();
        }
        const match = switcher.textContent.match(/@(\w+)/);
        return match ? match[1].toLowerCase() : null;
      }
      return null;
    },

    // Open the account switcher so you can pick another signed-in account
    openSwitcher: () => {
      const switcherBtn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (switcherBtn) {
        switcherBtn.click();
        console.log('📋 Account switcher opened. Select an account.');
        return true;
      }
      console.error('❌ Account switcher not found. Make sure you\'re on X.com');
      return false;
    },

    // Navigate to login page
    goToLogin: () => {
      window.location.href = 'https://x.com/login';
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
      const password = account.password || '';
      const masked = password
        ? password.substring(0, 3) + '*'.repeat(Math.max(0, password.length - 3))
        : '(not stored)';
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔐 LOGIN REQUIRED                                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Account: @${account.username.padEnd(20)}                 ║
║  Password: ${masked.padEnd(20)}                 ║
║                                                           ║
║  Please log in manually, then run your automation.        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    },
  };

  // stats() prints every statistic; stats.record/get/getAll/show stay available
  const stats = () => AccountStats.show();
  Object.assign(stats, AccountStats);

  const help = () => {
    console.log('');
    console.log('📋 MULTI-ACCOUNT COMMANDS:');
    console.log('');
    console.log('   XAccounts.add("user", "pass", "notes") - Add account (password and notes optional)');
    console.log('   XAccounts.remove("user")       - Remove account');
    console.log('   XAccounts.list()               - List all accounts');
    console.log('   XAccounts.getAll()             - All account records');
    console.log('   XAccounts.current()            - Detect the signed-in account');
    console.log('   XAccounts.getCurrent()         - Last account marked used');
    console.log('   XAccounts.getNext() / next()   - Next active account in rotation');
    console.log('   XAccounts.markUsed("user")     - Mark an account as used now');
    console.log('   XAccounts.switch()             - Open the account switcher');
    console.log('   XAccounts.setStatus("u","s")   - Set status');
    console.log('   XAccounts.updateStats("likes") - Count an action for the signed-in account');
    console.log('   XAccounts.stats()              - Show all stats');
    console.log('   XAccounts.export()             - Backup (JSON download + clipboard)');
    console.log('   XAccounts.exportText()         - Backup (user:pass:notes txt)');
    console.log('   XAccounts.import(json)         - Import a JSON backup');
    console.log('   XAccounts.importText(text)     - Import user:pass lines');
    console.log('   XAccounts.clear()              - Clear all data (asks first)');
    console.log('');
    console.log('📊 STATUS VALUES: active, paused, limited, suspended');
    console.log('');
  };

  // ============================================
  // EXPOSE API
  // ============================================
  window.XActions = window.XActions || {};
  window.XActions.Accounts = {
    // Account management
    add: AccountManager.addAccount,
    remove: AccountManager.removeAccount,
    list: AccountManager.listAccounts,
    getAll: AccountManager.getAccounts,
    setStatus: AccountManager.updateStatus,
    getNext: AccountManager.getNextAccount,
    next: AccountManager.getNextAccount,
    getCurrent: AccountManager.getCurrentAccount,
    current: AccountManager.detectCurrentAccount,
    markUsed: AccountManager.markUsed,
    updateStats: AccountManager.updateStats,
    switch: LoginHelper.openSwitcher,
    export: AccountManager.exportAccounts,
    exportText: AccountManager.exportAsText,
    import: AccountManager.importAccounts,
    importText: AccountManager.importFromText,
    clear: AccountManager.clearAll,
    help,

    // Stats
    stats,

    // Login
    login: LoginHelper,
  };

  // ============================================
  // STARTUP INFO
  // ============================================
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  👥 XActions Multi-Account Manager                       ║
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
║  • XAccounts.help()              - Every command          ║
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
  window.XAccounts = window.XActions.Accounts;

  const accounts = AccountManager.getAccounts();
  if (accounts.length > 0) {
    log(`Loaded ${accounts.length} accounts`, 'info');
  }

  // Auto-detect current account
  if (CONFIG.autoDetect) {
    const current = LoginHelper.getCurrentUser();
    if (current) {
      if (!accounts.find(a => a.username === current)) {
        console.log(`🔍 Detected current account: @${current}`);
        console.log('   Run XActions.Accounts.add("' + current + '") to track it.');
      } else {
        AccountManager.markUsed(current);
        console.log(`👤 Current account: @${current}`);
      }
    }
  }
})();
