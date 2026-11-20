// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Delegate Access — by nichxbt
// https://github.com/nirholas/XActions
// Manage delegate access for your account: add/remove delegates and configure permissions.
//
// HOW TO USE:
// 1. Go to https://x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    autoNavigate: true,              // Navigate to delegate settings automatically
    scanDelegates: true,             // List current delegates
    showPermissionsInfo: true,       // Display permissions reference
    delayBetweenActions: 2000,       // ms between UI actions
    scrollDelay: 1500,               // ms between scroll actions
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_delegates';

  const SELECTORS = {
    delegateSettings: 'a[href="/settings/delegate"]',
    addDelegate: '[data-testid="addDelegate"]',
    delegatePermissions: '[data-testid="delegatePermissions"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    userCell: '[data-testid="UserCell"]',
    confirmButton: '[data-testid="confirmationSheetConfirm"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
  };

  const PERMISSION_TYPES = {
    post: {
      name: 'Post',
      icon: '✍️',
      description: 'Create, edit, and delete posts on your behalf',
    },
    directMessages: {
      name: 'Direct Messages',
      icon: '✉️',
      description: 'Read and send DMs on your behalf',
    },
    likes: {
      name: 'Likes',
      icon: '❤️',
      description: 'Like and unlike posts on your behalf',
    },
    follows: {
      name: 'Follows',
      icon: '👥',
      description: 'Follow and unfollow accounts on your behalf',
    },
    lists: {
      name: 'Lists',
      icon: '📋',
      description: 'Create and manage lists on your behalf',
    },
    spaces: {
      name: 'Spaces',
      icon: '🎙️',
      description: 'Create and manage Spaces on your behalf',
    },
    analytics: {
      name: 'Analytics',
      icon: '📊',
      description: 'View account analytics',
    },
    profile: {
      name: 'Profile',
      icon: '👤',
      description: 'Edit profile information',
    },
  };

  const showPermissionsInfo = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('🔑 DELEGATE PERMISSIONS REFERENCE');
    console.log('══════════════════════════════════════════════════\n');

    for (const [key, perm] of Object.entries(PERMISSION_TYPES)) {
      console.log(`   ${perm.icon} ${perm.name}`);
      console.log(`      ${perm.description}`);
    }

    console.log('\n💡 Tips:');
    console.log('   • Delegates can act on your behalf without your password');
    console.log('   • You can revoke access at any time');
    console.log('   • Grant minimum necessary permissions (principle of least privilege)');
    console.log('   • Delegate feature requires X Premium');
    console.log('   • Delegates cannot change account settings or password');
    console.log('══════════════════════════════════════════════════\n');
  };

  const navigateToDelegateSettings = async () => {
    console.log('🚀 Navigating to delegate settings...');

    const delegateLink = document.querySelector(SELECTORS.delegateSettings);

    if (delegateLink) {
      delegateLink.click();
      console.log('✅ Clicked delegate settings link.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Delegate settings link not found. Navigating directly...');
      window.location.href = 'https://x.com/settings/delegate';
      await sleep(CONFIG.delayBetweenActions * 2);
    }

    await sleep(CONFIG.delayBetweenActions);

    const primaryColumn = document.querySelector(SELECTORS.primaryColumn);
    if (primaryColumn) {
      const text = primaryColumn.textContent;
      if (text.includes('Delegate') || text.includes('delegate')) {
        console.log('✅ Delegate settings page loaded.');
      } else {
        console.log('ℹ️ Page loaded, checking content...');
      }
    }
  };

  const scanCurrentDelegates = async () => {
    console.log('👥 Scanning current delegates...');

    const delegates = [];
    const userCells = document.querySelectorAll(SELECTORS.userCell);

    userCells.forEach(cell => {
      const usernameEl = cell.querySelector('a[href^="/"]');
      const displayNameEl = cell.querySelector('[dir="ltr"] span');
      const permissionsEl = cell.querySelector(SELECTORS.delegatePermissions)
        || cell.querySelector('[class*="permission"]');

      if (usernameEl) {
        const href = usernameEl.getAttribute('href');
        const username = href.replace('/', '').split('/')[0];
        const displayName = displayNameEl?.textContent?.trim() || username;
        const permissions = permissionsEl?.textContent?.trim() || 'Unknown permissions';

        if (username && !username.includes('/') && !username.includes('settings')) {
          delegates.push({ username, displayName, permissions });
        }
      }
    });

    // Also look for delegate entries in non-UserCell layouts
    const delegateEntries = document.querySelectorAll('[data-testid*="delegate"], [class*="delegate-item"]');
    delegateEntries.forEach(entry => {
      const text = entry.textContent.trim();
      if (text && !delegates.find(d => text.includes(d.username))) {
        delegates.push({ username: 'Unknown', displayName: text.substring(0, 50), permissions: 'See settings' });
      }
    });

    if (delegates.length > 0) {
      console.log(`\n📋 Current Delegates (${delegates.length}):`);
      console.log('─'.repeat(50));
      delegates.forEach((d, i) => {
        console.log(`   ${i + 1}. @${d.username} (${d.displayName})`);
        console.log(`      Permissions: ${d.permissions}`);
      });

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          scannedAt: new Date().toISOString(),
          delegates,
        }));
        console.log('\n💾 Delegate list saved to sessionStorage.');
      } catch (e) {
        // Silent fail
      }
    } else {
      console.log('ℹ️ No delegates found. Your account has no delegates configured.');
      console.log('💡 Click "Add delegate" to invite someone to manage your account.');
    }

    return delegates;
  };

  const showAddDelegateInstructions = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('➕ HOW TO ADD A DELEGATE');
    console.log('══════════════════════════════════════════════════\n');
    console.log('   1. Click "Add delegate" or "Invite" button');
    console.log('   2. Search for the user by username');
    console.log('   3. Select the permissions you want to grant');
    console.log('   4. Confirm the invitation');
    console.log('   5. The invited user must accept the delegation');
    console.log('');
    console.log('   ⚠️ Security reminders:');
    console.log('   • Only delegate to people you trust');
    console.log('   • Review delegate activity regularly');
    console.log('   • Revoke access immediately if compromised');
    console.log('══════════════════════════════════════════════════\n');

    const addBtn = document.querySelector(SELECTORS.addDelegate)
      || document.querySelector('button[aria-label*="Add"]')
      || document.querySelector('a[href*="delegate/add"]');

    if (addBtn) {
      console.log('✅ "Add delegate" button found on page.');
    } else {
      console.log('ℹ️ "Add delegate" button not found — make sure you are on the delegate settings page.');
    }
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('🔑 XActions — Delegate Access');
    console.log('═══════════════════════════════════════════\n');

    if (CONFIG.showPermissionsInfo) {
      showPermissionsInfo();
      await sleep(1000);
    }

    if (CONFIG.autoNavigate) {
      await navigateToDelegateSettings();
      await sleep(1000);
    }

    if (CONFIG.scanDelegates) {
      await scanCurrentDelegates();
      await sleep(1000);
    }

    showAddDelegateInstructions();

    console.log('\n✅ Delegate Access script complete.');
    console.log('💡 Manage delegates: https://x.com/settings/delegate');
  };

  run();
})();
