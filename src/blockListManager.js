// Copyright (c) 2024-2026 nich (@nichxbt). MIT License.
// src/blockListManager.js
// Block list import/export/sharing for X/Twitter
// by nichxbt
// https://github.com/nirholas/XActions
//
// Features: export block list, import block list, share block list,
// view muted conversations, unmute specific conversation.
//
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// 4. Use window.XActions.blockListManager.<function>() to run features
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const SEL = {
    userCell: '[data-testid="UserCell"]',
    userName: '[data-testid="User-Name"]',
    confirm: '[data-testid="confirmationSheetConfirm"]',
    block: '[data-testid="block"]',
    userActions: '[data-testid="userActions"]',
    toast: '[data-testid="toast"]',
    backButton: '[data-testid="app-bar-back"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
  };

  const BLOCKED_URL = 'https://x.com/settings/blocked/all';
  const MUTED_KEYWORDS_URL = 'https://x.com/settings/muted_keywords';

  // Navigate within the SPA via history.pushState + a synthetic popstate.
  // Assigning window.location.href triggers a full page reload, which wipes
  // this console script's entire execution context mid-run.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) { /* fall through to hard navigation */ }
    window.location.href = url;
  };

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const downloadFile = (content, filename, type = 'application/json') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const extractUsernameFromCell = (cell) => {
    const links = cell.querySelectorAll('a[href^="/"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && /^\/[A-Za-z0-9_]+$/.test(href)) {
        return href.slice(1);
      }
    }
    return null;
  };

  const extractDisplayNameFromCell = (cell) => {
    const nameEl = cell.querySelector('[data-testid="User-Name"]');
    if (!nameEl) return null;
    const spans = nameEl.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent.trim();
      if (text && !text.startsWith('@')) return text;
    }
    return null;
  };

  // ─────────────────────────────────────────────────
  // State persistence via sessionStorage
  // ─────────────────────────────────────────────────
  const STORAGE_KEY = 'xactions_blocklist';

  const getCollected = () => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };

  const saveCollected = (items) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const clearCollected = () => {
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // ─────────────────────────────────────────────────
  // 1. Export Block List
  // ─────────────────────────────────────────────────
  const exportBlockList = async (format = 'json') => {
    if (window.location.href !== BLOCKED_URL) {
      console.log(`🔄 Navigating to blocked accounts page...`);
      window.location.href = BLOCKED_URL;
      console.log('⚠️ Re-run exportBlockList() after the page loads.');
      return;
    }

    console.log('🔄 Scraping blocked accounts... Scroll will happen automatically.');
    clearCollected();

    const seen = new Set();
    let noNewCount = 0;
    const maxRetries = 5;

    while (noNewCount < maxRetries) {
      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        const username = extractUsernameFromCell(cell);
        if (username && !seen.has(username)) {
          seen.add(username);
          foundNew = true;
          const displayName = extractDisplayNameFromCell(cell) || username;
          const collected = getCollected();
          collected.push({ username, displayName });
          saveCollected(collected);
        }
      }

      if (!foundNew) {
        noNewCount++;
      } else {
        noNewCount = 0;
      }

      window.scrollBy(0, 800);
      await sleep(2000);
    }

    const blockedUsers = getCollected();
    console.log(`✅ Found ${blockedUsers.length} blocked accounts.`);

    if (blockedUsers.length === 0) {
      console.log('⚠️ No blocked accounts found. Your block list may be empty.');
      return [];
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const csvHeader = 'username,displayName';
      const csvRows = blockedUsers.map(u => `${u.username},"${(u.displayName || '').replace(/"/g, '""')}"`);
      const csvContent = [csvHeader, ...csvRows].join('\n');
      downloadFile(csvContent, `xactions-blocklist-${timestamp}.csv`, 'text/csv');
      console.log(`📥 Downloaded block list as CSV (${blockedUsers.length} accounts).`);
    } else {
      const jsonContent = JSON.stringify({
        exportedAt: new Date().toISOString(),
        tool: 'XActions Block List Manager',
        count: blockedUsers.length,
        accounts: blockedUsers,
      }, null, 2);
      downloadFile(jsonContent, `xactions-blocklist-${timestamp}.json`);
      console.log(`📥 Downloaded block list as JSON (${blockedUsers.length} accounts).`);
    }

    clearCollected();
    return blockedUsers;
  };

  // ─────────────────────────────────────────────────
  // 2. Import Block List
  // ─────────────────────────────────────────────────
  const importBlockList = async (usernames = []) => {
    if (!Array.isArray(usernames) || usernames.length === 0) {
      console.log('❌ Provide an array of usernames: importBlockList(["user1", "user2"])');
      return { blocked: [], failed: [] };
    }

    const cleaned = usernames.map(u => u.replace(/^@/, '').trim()).filter(Boolean);
    console.log(`🔄 Importing block list: ${cleaned.length} accounts to block...`);

    const blocked = [];
    const failed = [];

    for (let i = 0; i < cleaned.length; i++) {
      const username = cleaned[i];
      console.log(`🔄 [${i + 1}/${cleaned.length}] Blocking @${username}...`);

      try {
        spaNavigate(`https://x.com/${username}`);
        await sleep(3000);

        // Wait for the profile page to load
        const actionsBtn = await waitForSelector(SEL.userActions, 8000);
        if (!actionsBtn) {
          console.log(`⚠️ Could not find actions menu for @${username}. Profile may not exist.`);
          failed.push({ username, reason: 'profile not found' });
          continue;
        }

        actionsBtn.click();
        await sleep(1000);

        // Find the block option in the dropdown
        const blockOption = await waitForSelector(SEL.block, 5000);
        if (!blockOption) {
          console.log(`⚠️ Block option not found for @${username}. May already be blocked.`);
          failed.push({ username, reason: 'block option not found' });
          continue;
        }

        blockOption.click();
        await sleep(1000);

        // Confirm the block action
        const confirmBtn = await waitForSelector(SEL.confirm, 5000);
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(1000);
        }

        console.log(`✅ Blocked @${username}`);
        blocked.push(username);
      } catch (err) {
        console.log(`❌ Error blocking @${username}: ${err.message}`);
        failed.push({ username, reason: err.message });
      }

      // Delay between blocks to avoid rate limiting
      if (i < cleaned.length - 1) {
        const delay = 2000 + Math.random() * 1000;
        await sleep(delay);
      }
    }

    console.log(`\n✅ Import complete: ${blocked.length} blocked, ${failed.length} failed.`);
    if (failed.length > 0) {
      console.log('⚠️ Failed accounts:', failed);
    }
    return { blocked, failed };
  };

  // ─────────────────────────────────────────────────
  // 3. Share Block List
  // ─────────────────────────────────────────────────
  const shareBlockList = async () => {
    console.log('🔄 Generating shareable block list...');

    if (window.location.href !== BLOCKED_URL) {
      console.log(`🔄 Navigating to blocked accounts page...`);
      window.location.href = BLOCKED_URL;
      console.log('⚠️ Re-run shareBlockList() after the page loads.');
      return;
    }

    // Scrape all blocked accounts first
    clearCollected();
    const seen = new Set();
    let noNewCount = 0;
    const maxRetries = 5;

    while (noNewCount < maxRetries) {
      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        const username = extractUsernameFromCell(cell);
        if (username && !seen.has(username)) {
          seen.add(username);
          foundNew = true;
          const displayName = extractDisplayNameFromCell(cell) || username;
          const collected = getCollected();
          collected.push({ username, displayName });
          saveCollected(collected);
        }
      }

      if (!foundNew) {
        noNewCount++;
      } else {
        noNewCount = 0;
      }

      window.scrollBy(0, 800);
      await sleep(2000);
    }

    const blockedUsers = getCollected();
    clearCollected();

    if (blockedUsers.length === 0) {
      console.log('⚠️ No blocked accounts found.');
      return null;
    }

    const shareableData = {
      format: 'xactions-blocklist-v1',
      createdAt: new Date().toISOString(),
      description: 'Shared block list from XActions',
      count: blockedUsers.length,
      usernames: blockedUsers.map(u => u.username),
    };

    const shareString = JSON.stringify(shareableData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);

    // Download the shareable file
    downloadFile(shareString, `xactions-shared-blocklist-${timestamp}.json`);
    console.log(`✅ Shareable block list generated (${blockedUsers.length} accounts).`);
    console.log('📋 To import this list, the recipient can use:');
    console.log('   const list = <paste JSON>;');
    console.log('   window.XActions.blockListManager.importBlockList(list.usernames);');

    // Also copy to clipboard if available
    try {
      await navigator.clipboard.writeText(shareString);
      console.log('📋 Block list copied to clipboard!');
    } catch {
      console.log('⚠️ Could not copy to clipboard. Use the downloaded file.');
    }

    return shareableData;
  };

  // ─────────────────────────────────────────────────
  // 4. View Muted Conversations
  // ─────────────────────────────────────────────────
  const viewMutedConversations = async () => {
    if (window.location.href !== MUTED_KEYWORDS_URL) {
      console.log('🔄 Navigating to muted keywords/conversations page...');
      window.location.href = MUTED_KEYWORDS_URL;
      console.log('⚠️ Re-run viewMutedConversations() after the page loads.');
      return;
    }

    console.log('🔄 Scraping muted conversations...');
    await sleep(2000);

    const mutedItems = [];
    const seen = new Set();
    let noNewCount = 0;
    const maxRetries = 3;

    while (noNewCount < maxRetries) {
      // Muted keywords/conversations appear as list items or cells
      const cells = $$('[data-testid="UserCell"], [role="listitem"], [data-testid="cellInnerDiv"]');
      let foundNew = false;

      for (const cell of cells) {
        const text = cell.textContent.trim();
        if (text && !seen.has(text)) {
          seen.add(text);
          foundNew = true;

          // Extract muted word/phrase details
          const spans = cell.querySelectorAll('span');
          const label = spans.length > 0 ? spans[0].textContent.trim() : text.slice(0, 100);
          mutedItems.push({
            label,
            fullText: text.slice(0, 200),
            element: cell,
          });
        }
      }

      if (!foundNew) {
        noNewCount++;
      } else {
        noNewCount = 0;
      }

      window.scrollBy(0, 500);
      await sleep(1500);
    }

    if (mutedItems.length === 0) {
      console.log('⚠️ No muted conversations/keywords found.');
      return [];
    }

    console.log(`✅ Found ${mutedItems.length} muted items:`);
    mutedItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.label}`);
    });

    // Return without DOM element references for clean output
    return mutedItems.map(({ label, fullText }) => ({ label, fullText }));
  };

  // ─────────────────────────────────────────────────
  // 5. Unmute Specific Conversation
  // ─────────────────────────────────────────────────
  const unmuteConversation = async (keyword) => {
    if (!keyword) {
      console.log('❌ Provide a keyword or phrase to unmute: unmuteConversation("keyword")');
      return false;
    }

    if (window.location.href !== MUTED_KEYWORDS_URL) {
      console.log('🔄 Navigating to muted keywords/conversations page...');
      window.location.href = MUTED_KEYWORDS_URL;
      console.log(`⚠️ Re-run unmuteConversation("${keyword}") after the page loads.`);
      return false;
    }

    console.log(`🔄 Looking for muted item matching "${keyword}"...`);
    await sleep(2000);

    const searchLower = keyword.toLowerCase();
    let found = false;
    let noNewCount = 0;
    const maxRetries = 3;

    while (noNewCount < maxRetries && !found) {
      const cells = $$('[data-testid="cellInnerDiv"], [role="listitem"]');

      for (const cell of cells) {
        const text = cell.textContent.toLowerCase();
        if (text.includes(searchLower)) {
          console.log(`🔄 Found matching muted item. Clicking to open...`);

          // Click the cell to open settings for this muted word
          cell.click();
          await sleep(1500);

          // Look for a delete/unmute button
          const deleteBtn = $('button[data-testid="confirmationSheetConfirm"]') ||
                            $('[role="menuitem"]') ||
                            $('div[role="button"][tabindex="0"]');

          // Try to find a dedicated unmute/delete option
          const allButtons = $$('button, div[role="button"]');
          let unmuted = false;

          for (const btn of allButtons) {
            const btnText = btn.textContent.toLowerCase();
            if (btnText.includes('delete') || btnText.includes('unmute') || btnText.includes('remove')) {
              btn.click();
              await sleep(1000);

              // Handle confirmation dialog if present
              const confirmBtn = await waitForSelector(SEL.confirm, 3000);
              if (confirmBtn) {
                confirmBtn.click();
                await sleep(1000);
              }

              console.log(`✅ Unmuted "${keyword}" successfully.`);
              unmuted = true;
              found = true;
              break;
            }
          }

          if (!unmuted) {
            console.log('⚠️ Found the item but could not locate unmute/delete button.');
            console.log('💡 Try clicking it manually in the UI.');
            found = true;
          }
          break;
        }
      }

      if (!found) {
        noNewCount++;
        window.scrollBy(0, 500);
        await sleep(1500);
      }
    }

    if (!found) {
      console.log(`❌ Could not find muted item matching "${keyword}".`);
    }

    return found;
  };

  // ─────────────────────────────────────────────────
  // Expose on window.XActions
  // ─────────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.blockListManager = {
    exportBlockList,
    importBlockList,
    shareBlockList,
    viewMutedConversations,
    unmuteConversation,
  };

  console.log('✅ XActions Block List Manager loaded!');
  console.log('');
  console.log('📋 Available commands:');
  console.log('  window.XActions.blockListManager.exportBlockList("json")   — Export blocked accounts as JSON');
  console.log('  window.XActions.blockListManager.exportBlockList("csv")    — Export blocked accounts as CSV');
  console.log('  window.XActions.blockListManager.importBlockList(["user1", "user2"])  — Block a list of users');
  console.log('  window.XActions.blockListManager.shareBlockList()          — Generate shareable block list');
  console.log('  window.XActions.blockListManager.viewMutedConversations()  — View muted conversations');
  console.log('  window.XActions.blockListManager.unmuteConversation("word") — Unmute a specific keyword');
})();
