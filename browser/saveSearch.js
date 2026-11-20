// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔍 Save Searches — Production Grade
 * ============================================================
 *
 * @name        saveSearch.js
 * @description Save the current search query, list saved searches,
 *              and manage your saved search collection on X/Twitter.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/search or https://x.com/explore
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Action ───────────────────────────────────────────────
    action: 'save',
    //   'save'    — save a search query
    //   'list'    — list all saved searches
    //   'delete'  — delete a saved search by query text
    //   'search'  — run a search and save it

    // ── Search Query ─────────────────────────────────────────
    query: '',                       // The search query to save/run
    // e.g. 'xactions OR "twitter automation" -is:retweet'

    // ── Delete ───────────────────────────────────────────────
    deleteQuery: '',                 // Query text of the saved search to delete

    // ── Timing ───────────────────────────────────────────────
    navigationDelay: 3000,
    actionDelay: 2000,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,
  };

  const SEL = {
    searchInput:    '[data-testid="SearchBox_Search_Input"]',
    savedSearches:  '[data-testid="savedSearches"]',
    saveSearch:     '[data-testid="saveSearch"]',
    searchResults:  '[data-testid="primaryColumn"]',
    typeahead:      '[data-testid="typeaheadResult"]',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const stats = {
    action: CONFIG.action,
    querySaved: false,
    savedSearches: [],
    queryDeleted: false,
    searchPerformed: false,
    startTime: Date.now(),
  };

  const performSearch = async (query) => {
    console.log(`🔍 Searching: "${query}"...`);

    const searchInput = await waitForSelector(SEL.searchInput);
    if (!searchInput) {
      // Try navigating to search
      if (!CONFIG.dryRun) {
        window.location.href = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query`;
        return false;
      }
      console.log('❌ Could not find search input');
      return false;
    }

    if (!CONFIG.dryRun) {
      searchInput.focus();
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('focus', { bubbles: true }));
      await sleep(500);

      // Clear existing text
      searchInput.select();
      document.execCommand('delete');
      await sleep(200);

      // Type the query
      for (const char of query) {
        document.execCommand('insertText', false, char);
        await sleep(30);
      }
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(500);

      // Submit
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      const form = searchInput.closest('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));

      await sleep(CONFIG.navigationDelay);
    }

    stats.searchPerformed = true;
    return true;
  };

  const saveCurrentSearch = async () => {
    if (CONFIG.query) {
      const result = await performSearch(CONFIG.query);
      if (result === false && !CONFIG.dryRun) return; // Page redirected
    }

    console.log('💾 Saving search...');

    // Look for save search button (usually in the more menu or search bar)
    let saveBtn = await waitForSelector(SEL.saveSearch, 5000);

    if (!saveBtn) {
      // Try clicking the more/overflow menu in search
      const moreBtn = document.querySelector('[aria-label="More"], [data-testid="caret"]');
      if (moreBtn && !CONFIG.dryRun) {
        moreBtn.click();
        await sleep(CONFIG.actionDelay);

        const menuItems = $$('[role="menuitem"]');
        saveBtn = menuItems.find(item =>
          item.textContent.toLowerCase().includes('save')
        );
      }
    }

    if (saveBtn) {
      if (!CONFIG.dryRun) {
        saveBtn.click();
        await sleep(CONFIG.actionDelay);
      }
      stats.querySaved = true;
      console.log(`✅ Search saved: "${CONFIG.query || window.location.search}"`);
    } else {
      console.log('❌ Could not find Save Search button');
      console.log('💡 Perform a search first, then try saving');
    }
  };

  const listSavedSearches = async () => {
    console.log('📋 Listing saved searches...');

    // Focus the search input to show saved searches dropdown
    const searchInput = await waitForSelector(SEL.searchInput);
    if (searchInput && !CONFIG.dryRun) {
      searchInput.focus();
      searchInput.dispatchEvent(new Event('focus', { bubbles: true }));
      await sleep(CONFIG.actionDelay);
    }

    // Look for saved searches panel
    const savedPanel = $(SEL.savedSearches);
    if (savedPanel) {
      const items = savedPanel.querySelectorAll('[role="option"], [role="listitem"], a');
      for (const item of items) {
        const text = item.textContent?.trim();
        if (text) {
          stats.savedSearches.push(text);
          console.log(`  🔍 ${text}`);
        }
      }
    } else {
      // Try alternative: look for recent/saved in the typeahead
      const typeaheadResults = $$(SEL.typeahead);
      for (const result of typeaheadResults) {
        const text = result.textContent?.trim();
        if (text) {
          stats.savedSearches.push(text);
          console.log(`  🔍 ${text}`);
        }
      }

      if (stats.savedSearches.length === 0) {
        // Try navigating to saved searches settings
        console.log('💡 Trying alternative method...');
        const settingsLinks = $$('a[href*="saved_searches"]');
        if (settingsLinks.length > 0) {
          console.log('💡 Found saved searches settings link');
        } else {
          console.log('⚠️ Could not find saved searches — try clicking the search bar first');
        }
      }
    }

    console.log(`✅ Found ${stats.savedSearches.length} saved searches`);
  };

  const deleteSavedSearch = async () => {
    if (!CONFIG.deleteQuery) {
      console.log('❌ No deleteQuery provided in CONFIG.deleteQuery');
      return;
    }

    console.log(`🗑️ Deleting saved search: "${CONFIG.deleteQuery}"...`);

    // Focus search to show saved searches
    const searchInput = await waitForSelector(SEL.searchInput);
    if (searchInput && !CONFIG.dryRun) {
      searchInput.focus();
      searchInput.dispatchEvent(new Event('focus', { bubbles: true }));
      await sleep(CONFIG.actionDelay);
    }

    // Find the saved search and its delete button
    const savedPanel = $(SEL.savedSearches);
    const container = savedPanel || document;
    const allItems = container.querySelectorAll('[role="option"], [role="listitem"], a');

    for (const item of allItems) {
      const text = item.textContent?.trim()?.toLowerCase();
      if (text && text.includes(CONFIG.deleteQuery.toLowerCase())) {
        console.log(`🔍 Found: "${item.textContent.trim()}"`);

        // Look for delete/remove button within or near the item
        const deleteBtn = item.querySelector('[aria-label*="elete"], [aria-label*="emove"], button') ||
                          item.parentElement?.querySelector('[aria-label*="elete"], [aria-label*="emove"]');

        if (deleteBtn && !CONFIG.dryRun) {
          deleteBtn.click();
          await sleep(CONFIG.actionDelay);

          // Confirm if needed
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
            await sleep(CONFIG.actionDelay);
          }

          stats.queryDeleted = true;
          console.log(`✅ Deleted saved search: "${CONFIG.deleteQuery}"`);
          return;
        } else if (!deleteBtn) {
          console.log('⚠️ Found the search but could not find delete button');
        }
      }
    }

    if (!stats.queryDeleted) {
      console.log(`⚠️ Could not find saved search: "${CONFIG.deleteQuery}"`);
    }
  };

  const searchAndSave = async () => {
    if (!CONFIG.query) {
      console.log('❌ No query provided in CONFIG.query');
      return;
    }

    const result = await performSearch(CONFIG.query);
    if (result === false && !CONFIG.dryRun) return;

    await sleep(CONFIG.actionDelay);
    await saveCurrentSearch();
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔍 SAVE SEARCHES' + ' '.repeat(W - 20) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually act');
    }

    console.log(`📋 Action: ${CONFIG.action}`);
    if (CONFIG.query) console.log(`📋 Query: "${CONFIG.query}"`);

    const sessionKey = 'xactions_saveSearch';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    const actions = {
      save: saveCurrentSearch,
      list: listSavedSearches,
      delete: deleteSavedSearch,
      search: searchAndSave,
    };

    if (!actions[CONFIG.action]) {
      console.log(`❌ Unknown action: "${CONFIG.action}"`);
      console.log(`💡 Valid actions: ${Object.keys(actions).join(', ')}`);
      return;
    }

    await actions[CONFIG.action]();

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 SAVE SEARCH SUMMARY' + ' '.repeat(W - 26) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🔧 Action: ${CONFIG.action}`);
    if (stats.querySaved) console.log('💾 Search saved: ✅');
    if (stats.savedSearches.length > 0) console.log(`📋 Saved searches: ${stats.savedSearches.length}`);
    if (stats.queryDeleted) console.log('🗑️ Search deleted: ✅');
    if (stats.searchPerformed) console.log('🔍 Search performed: ✅');
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
