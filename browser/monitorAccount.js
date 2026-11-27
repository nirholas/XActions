// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * MonitorAccount.js — Track follows/unfollows on ANY public X (Twitter) account
 * https://github.com/nirholas/XActions
 *
 * @name        monitorAccount.js
 * @title       Monitor Account
 * @description Snapshot a public account's followers or following list and report who was added or removed since the last run.
 * @category    monitor
 * @page        x.com/<username>/followers or x.com/<username>/following
 * @writes      false
 * @aliases     scripts/monitorAccount.js, scripts/twitter/monitor-account.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 *
 * HOW TO USE:
 * 1. Go to https://x.com/TARGET_USERNAME/followers (or /following)
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste browser/monitorAccount.js and press Enter
 * 4. Run again later to see changes!
 *
 * Works on:
 * - /followers — track who follows/unfollows this account
 * - /following — track who this account follows/unfollows
 *
 * After a run: window.accountSnapshot (first run) or
 * window.accountChanges ({ removed, added } with display names).
 *
 * NOTE: Only works on PUBLIC accounts. Private accounts hide their lists.
 */

(() => {
  const CONFIG = {
    scrollDelay: 2000,       // ms between scrolls
    maxRetries: 5,           // Scrolls with no new accounts before stopping
    maxScrolls: Infinity,    // Hard cap on scrolls
    maxUsers: Infinity,      // Stop after this many accounts (a capped scan reports the rest as removed)
    downloadReport: false,   // Also download a full added/removed report (.txt) when something changed
  };

  const STORAGE_PREFIX = 'xactions_monitor_';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Detect page type
  const path = window.location.pathname;
  const isFollowersPage = path.includes('/followers');
  const isFollowingPage = path.includes('/following');

  if (!isFollowersPage && !isFollowingPage) {
    console.error('❌ Please navigate to a followers or following page!');
    console.log('👉 Example: https://x.com/elonmusk/followers');
    return;
  }

  const pageType = isFollowersPage ? 'followers' : 'following';
  const rawTargetUser = path.split('/')[1];
  const targetUser = rawTargetUser.toLowerCase();
  const storageKey = `${STORAGE_PREFIX}${targetUser}_${pageType}`;
  // Older standalone versions kept the handle's original case in the key.
  const legacyStorageKey = `${STORAGE_PREFIX}${rawTargetUser}_${pageType}`;

  const displayNames = {};

  const scrapeUsers = async () => {
    const users = new Set();
    let previousSize = 0;
    let retries = 0;
    let scrolls = 0;
    const maxRetries = CONFIG.maxRetries;

    console.log(`🔍 Scanning @${targetUser}'s ${pageType}...`);

    while (retries < maxRetries && scrolls < CONFIG.maxScrolls && users.size < CONFIG.maxUsers) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;

      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      userCells.forEach(cell => {
        // Get username from the link
        const links = cell.querySelectorAll('a[href^="/"]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('/') && !href.includes('/status/')) {
            const username = href.replace('/', '').split('/')[0].toLowerCase();
            if (username && username !== targetUser && !username.includes('?') && users.size < CONFIG.maxUsers) {
              users.add(username);
              if (!displayNames[username]) {
                const span = cell.querySelector('[dir="ltr"] span');
                if (span && span.textContent) displayNames[username] = span.textContent;
              }
            }
          }
        });
      });

      console.log(`   Found ${users.size} accounts so far...`);

      if (users.size === previousSize) {
        retries++;
      } else {
        retries = 0;
        previousSize = users.size;
      }
    }

    return Array.from(users);
  };

  // Accepts both snapshot shapes: { users: [..], timestamp } and the older
  // standalone { users: { name: displayName }, savedAt }.
  const normalize = (data) => {
    if (!data || !data.users) return null;
    if (Array.isArray(data.users)) return data;
    const users = Object.keys(data.users);
    return {
      ...data,
      users,
      displayNames: { ...data.users },
      timestamp: data.timestamp || data.savedAt,
      count: data.count ?? users.length,
    };
  };

  const loadPrevious = () => {
    try {
      const data = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
      return data ? normalize(JSON.parse(data)) : null;
    } catch (e) {
      return null;
    }
  };

  const saveData = (users) => {
    const data = {
      target: targetUser,
      type: pageType,
      users,
      timestamp: new Date().toISOString(),
      count: users.length,
      displayNames: Object.fromEntries(users.filter(u => displayNames[u]).map(u => [u, displayNames[u]])),
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  };

  const compare = (previous, current) => {
    const prevSet = new Set(previous.map(u => u.toLowerCase()));
    const currSet = new Set(current.map(u => u.toLowerCase()));

    const removed = previous.filter(u => !currSet.has(u.toLowerCase()));
    const added = current.filter(u => !prevSet.has(u.toLowerCase()));

    return { removed, added };
  };

  const formatDate = (iso) => new Date(iso).toLocaleString();

  const downloadList = (list, filename) => {
    if (list.length === 0) return;
    const blob = new Blob([list.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadReport = (previous, currentCount, removed, added, timestamp) => {
    let report = 'ACCOUNT MONITOR REPORT\n';
    report += `${'='.repeat(50)}\n`;
    report += `Account: @${targetUser}\n`;
    report += `Type: ${pageType}\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Previous: ${previous.count} (${previous.timestamp})\n`;
    report += `Current: ${currentCount}\n`;
    report += `${'='.repeat(50)}\n\n`;
    if (removed.length > 0) {
      report += `REMOVED (${removed.length}):\n`;
      removed.forEach((u, i) => { report += `${i + 1}. @${u}\n`; });
      report += '\n';
    }
    if (added.length > 0) {
      report += `ADDED (${added.length}):\n`;
      added.forEach((u, i) => { report += `${i + 1}. @${u}\n`; });
    }
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetUser}_${pageType}_changes_${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log('💾 Report downloaded!');
  };

  const run = async () => {
    console.log(`\n🔭 XActions Monitor — Tracking @${targetUser}'s ${pageType}\n`);

    const currentUsers = await scrapeUsers();
    console.log(`\n✅ Found ${currentUsers.length} accounts\n`);

    const previous = loadPrevious();
    let changes = null;

    if (previous) {
      console.log(`📊 Comparing with snapshot from ${formatDate(previous.timestamp)}`);
      console.log(`   Previous: ${previous.count} | Current: ${currentUsers.length}`);
      console.log('');

      const { removed, added } = compare(previous.users, currentUsers);

      if (pageType === 'followers') {
        // Tracking who follows this account
        if (removed.length > 0) {
          console.log(`\n🚨 ${removed.length} ACCOUNTS UNFOLLOWED @${targetUser}:\n`);
          removed.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          downloadList(removed, `${targetUser}-lost-followers-${Date.now()}.txt`);
        }
        if (added.length > 0) {
          console.log(`\n🎉 ${added.length} NEW FOLLOWERS FOR @${targetUser}:\n`);
          added.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
        }
      } else {
        // Tracking who this account follows
        if (removed.length > 0) {
          console.log(`\n👋 @${targetUser} UNFOLLOWED ${removed.length} ACCOUNTS:\n`);
          removed.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          downloadList(removed, `${targetUser}-unfollowed-${Date.now()}.txt`);
        }
        if (added.length > 0) {
          console.log(`\n➕ @${targetUser} FOLLOWED ${added.length} NEW ACCOUNTS:\n`);
          added.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
        }
      }

      if (removed.length === 0 && added.length === 0) {
        console.log('✨ No changes detected since last check!');
      }

      const timestamp = new Date().toISOString();
      if (CONFIG.downloadReport && (removed.length > 0 || added.length > 0)) {
        downloadReport(previous, currentUsers.length, removed, added, timestamp);
      }

      const prevNames = previous.displayNames || {};
      changes = {
        username: targetUser,
        pageType,
        removed: removed.map(u => ({ username: u, displayName: prevNames[u] || prevNames[u.toLowerCase()] || u })),
        added: added.map(u => ({ username: u, displayName: displayNames[u] || u })),
        timestamp,
      };
    } else {
      console.log('📸 First scan! Saving snapshot...');
      console.log('   Run again later to detect changes.');
    }

    const saved = saveData(currentUsers);
    console.log(`\n💾 Snapshot saved at ${formatDate(saved.timestamp)}`);
    console.log(`   Stored as: ${storageKey}`);
    console.log('   Run this script again to check for changes!\n');

    if (changes) {
      window.accountChanges = changes;
      console.log('💡 Access via: window.accountChanges');
    } else {
      window.accountSnapshot = saved;
    }
  };

  run();
})();
