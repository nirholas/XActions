// Copyright (c) 2024-2026 nich (@nichxbt). MIT License.
// src/xProManager.js
// X Pro (TweetDeck) automation for X/Twitter
// by nichxbt
// 1. Go to pro.x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    delayBetweenActions: 2000,   // ms between UI interactions
    scrollDelay: 1500,           // ms between scroll steps
    maxRetries: 3,               // retries for DOM element lookups
    storagePrefix: 'xactions_xpro_mgr',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /* ─── Selectors ─────────────────────────────────────────── */

  const SEL = {
    // X Pro layout
    column: '[data-testid="column"]',
    columnHeader: '[data-testid="columnHeader"]',
    columnSettings: '[data-testid="columnSettings"]',
    columnContent: '[data-testid="columnContent"]',
    addColumn: '[data-testid="addColumn"]',
    removeColumn: '[data-testid="removeColumn"]',
    deckContainer: '[data-testid="deck"], .deck-container, #deck',
    // General
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    confirmDialog: '[data-testid="confirmationSheetConfirm"]',
    toast: '[data-testid="toast"]',
    userCell: '[data-testid="UserCell"]',
    // Menus & dialogs
    menuItem: '[role="menuitem"]',
    option: '[role="option"]',
    dialog: '[role="dialog"]',
    closeDialog: '[data-testid="app-bar-close"]',
    backButton: '[data-testid="app-bar-back"]',
  };

  /* ─── State ─────────────────────────────────────────────── */

  let aborted = false;

  const stats = {
    columnsCreated: 0,
    columnsRemoved: 0,
    filtersApplied: 0,
    decksSaved: 0,
    collectionsCreated: 0,
    startTime: Date.now(),
  };

  /* ─── Helpers ───────────────────────────────────────────── */

  const isPro = () =>
    window.location.hostname.includes('pro.x.com') ||
    window.location.pathname.includes('/i/tweetdeck');

  const ensurePro = () => {
    if (!isPro()) {
      console.log('❌ This script must be run on pro.x.com');
      console.log('💡 Navigate to https://pro.x.com first, then paste this script.');
      return false;
    }
    return true;
  };

  const waitForElement = async (selector, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(250);
    }
    return null;
  };

  const waitForElements = async (selector, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) return els;
      await sleep(250);
    }
    return document.querySelectorAll(selector);
  };

  const clickElement = async (el) => {
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    el.click();
    await sleep(CONFIG.delayBetweenActions);
    return true;
  };

  const typeIntoInput = async (input, text) => {
    if (!input) return false;
    input.focus();
    await sleep(300);
    input.value = '';
    document.execCommand('insertText', false, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(500);
    return true;
  };

  const getStorageKey = (key) => `${CONFIG.storagePrefix}_${key}`;

  const saveToStorage = (key, data) => {
    try {
      sessionStorage.setItem(getStorageKey(key), JSON.stringify(data));
      return true;
    } catch {
      console.log('⚠️ Failed to save to sessionStorage');
      return false;
    }
  };

  const loadFromStorage = (key, fallback = null) => {
    try {
      const raw = sessionStorage.getItem(getStorageKey(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  /* ─── 1. Multi-Column View Setup ────────────────────────── */

  const getColumns = () => {
    const columns = document.querySelectorAll(
      `${SEL.column}, [class*="column"], section[aria-label]`
    );
    const result = [];
    columns.forEach((col, i) => {
      const header = col.querySelector(`${SEL.columnHeader}, h2, [role="heading"]`);
      const name = header?.textContent?.trim()
        || col.getAttribute('aria-label')
        || `Column ${i + 1}`;
      const tweets = col.querySelectorAll(SEL.tweet);
      result.push({
        index: i,
        name,
        tweetCount: tweets.length,
        element: col,
      });
    });
    return result;
  };

  const scanColumns = () => {
    if (!ensurePro()) return [];

    console.log('🔍 Scanning columns...');
    const columns = getColumns();

    if (columns.length === 0) {
      console.log('ℹ️ No columns detected. The deck may still be loading.');
      return [];
    }

    console.log(`\n📊 Found ${columns.length} column(s):`);
    console.log('─'.repeat(50));
    columns.forEach((col) => {
      console.log(`   ${col.index + 1}. 📌 ${col.name} — ${col.tweetCount} posts visible`);
    });
    console.log('─'.repeat(50));

    saveToStorage('columns', columns.map(({ element, ...rest }) => rest));
    return columns;
  };

  const reorderColumns = async (fromIndex, toIndex) => {
    if (!ensurePro()) return false;

    console.log(`🔄 Moving column ${fromIndex + 1} to position ${toIndex + 1}...`);

    const columns = getColumns();
    if (fromIndex < 0 || fromIndex >= columns.length || toIndex < 0 || toIndex >= columns.length) {
      console.log(`❌ Invalid column indices. You have ${columns.length} columns (0-${columns.length - 1}).`);
      return false;
    }

    const col = columns[fromIndex].element;
    const header = col.querySelector(`${SEL.columnHeader}, h2, [role="heading"]`);
    if (!header) {
      console.log('❌ Could not locate column header for drag.');
      return false;
    }

    // Simulate drag via dataTransfer events
    const rect = header.getBoundingClientRect();
    const startX = rect.x + rect.width / 2;
    const startY = rect.y + rect.height / 2;

    const targetCol = columns[toIndex].element;
    const targetRect = targetCol.getBoundingClientRect();
    const endX = targetRect.x + targetRect.width / 2;
    const endY = targetRect.y + targetRect.height / 2;

    header.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
    await sleep(200);
    header.dispatchEvent(new MouseEvent('mousemove', { clientX: endX, clientY: endY, bubbles: true }));
    await sleep(200);
    header.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }));
    await sleep(CONFIG.delayBetweenActions);

    console.log(`✅ Column move attempted: "${columns[fromIndex].name}" -> position ${toIndex + 1}`);
    console.log('💡 If column did not move, drag it manually — X Pro may require native drag events.');
    return true;
  };

  const scrollColumnToTop = async (columnIndex) => {
    const columns = getColumns();
    if (columnIndex < 0 || columnIndex >= columns.length) {
      console.log(`❌ Invalid column index: ${columnIndex}. You have ${columns.length} columns.`);
      return false;
    }

    const col = columns[columnIndex].element;
    const scrollable = col.querySelector(`${SEL.columnContent}, [style*="overflow"]`)
      || col;
    scrollable.scrollTop = 0;
    console.log(`⬆️ Scrolled column ${columnIndex + 1} ("${columns[columnIndex].name}") to top.`);
    return true;
  };

  /* ─── 2. Custom Column Creation ─────────────────────────── */

  const COLUMN_PRESETS = {
    home:          { label: 'Home',          icon: '🏠' },
    notifications: { label: 'Notifications', icon: '🔔' },
    mentions:      { label: 'Mentions',      icon: '💬' },
    messages:      { label: 'Messages',      icon: '✉️' },
    search:        { label: 'Search',        icon: '🔍' },
    list:          { label: 'List',          icon: '📋' },
    likes:         { label: 'Likes',         icon: '❤️' },
    trending:      { label: 'Trending',      icon: '📈' },
    followers:     { label: 'Followers',     icon: '👥' },
    collection:    { label: 'Collection',    icon: '📂' },
  };

  const openAddColumnMenu = async () => {
    const addBtn = document.querySelector(SEL.addColumn)
      || document.querySelector('button[aria-label*="Add column"]')
      || document.querySelector('button[aria-label*="add column"]');

    if (!addBtn) {
      console.log('❌ Add column button not found. Make sure you are on pro.x.com.');
      return false;
    }

    await clickElement(addBtn);
    return true;
  };

  const selectMenuOption = async (keyword) => {
    const items = document.querySelectorAll(`${SEL.menuItem}, ${SEL.option}, button`);
    const match = [...items].find(el =>
      el.textContent.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match) {
      await clickElement(match);
      return true;
    }
    return false;
  };

  const addColumn = async (type) => {
    if (!ensurePro()) return false;

    const preset = COLUMN_PRESETS[type];
    if (!preset) {
      console.log(`❌ Unknown column type: "${type}"`);
      console.log(`💡 Available types: ${Object.keys(COLUMN_PRESETS).join(', ')}`);
      return false;
    }

    console.log(`${preset.icon} Adding "${preset.label}" column...`);

    if (!(await openAddColumnMenu())) return false;

    const selected = await selectMenuOption(preset.label);
    if (!selected) {
      console.log(`⚠️ Could not find "${preset.label}" in the add-column menu.`);
      console.log('💡 The option may be named differently. Try adding it manually.');
      return false;
    }

    await sleep(CONFIG.delayBetweenActions);
    stats.columnsCreated++;
    console.log(`✅ "${preset.label}" column added.`);
    return true;
  };

  const addSearchColumn = async (query) => {
    if (!ensurePro()) return false;

    console.log(`🔍 Adding search column for: "${query}"...`);

    if (!(await openAddColumnMenu())) return false;

    const selected = await selectMenuOption('search');
    if (!selected) {
      console.log('⚠️ Search option not found in menu.');
      return false;
    }

    await sleep(CONFIG.delayBetweenActions);

    const searchInput = await waitForElement(SEL.searchInput)
      || await waitForElement('input[type="text"]');

    if (!searchInput) {
      console.log('❌ Search input not found.');
      return false;
    }

    await typeIntoInput(searchInput, query);
    await sleep(1000);

    // Submit the search
    const form = searchInput.closest('form');
    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.click();
    } else {
      searchInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true,
      }));
    }

    await sleep(CONFIG.delayBetweenActions);
    stats.columnsCreated++;
    console.log(`✅ Search column created for: "${query}"`);
    return true;
  };

  const addListColumn = async (listName) => {
    if (!ensurePro()) return false;

    console.log(`📋 Adding list column for: "${listName}"...`);

    if (!(await openAddColumnMenu())) return false;

    const selected = await selectMenuOption('list');
    if (!selected) {
      console.log('⚠️ List option not found in menu.');
      return false;
    }

    await sleep(CONFIG.delayBetweenActions);

    // Search for the list within the dialog
    const searchInput = await waitForElement('input[type="text"]');
    if (searchInput) {
      await typeIntoInput(searchInput, listName);
      await sleep(CONFIG.delayBetweenActions);

      // Select matching list
      const listItems = document.querySelectorAll(`${SEL.menuItem}, li, [role="option"]`);
      const match = [...listItems].find(el =>
        el.textContent.toLowerCase().includes(listName.toLowerCase())
      );
      if (match) {
        await clickElement(match);
        stats.columnsCreated++;
        console.log(`✅ List column created for: "${listName}"`);
        return true;
      }
    }

    console.log(`⚠️ Could not find list "${listName}". Make sure the list exists.`);
    return false;
  };

  const removeColumn = async (columnIndex) => {
    if (!ensurePro()) return false;

    const columns = getColumns();
    if (columnIndex < 0 || columnIndex >= columns.length) {
      console.log(`❌ Invalid column index: ${columnIndex}. You have ${columns.length} columns.`);
      return false;
    }

    const col = columns[columnIndex];
    console.log(`🗑️ Removing column ${columnIndex + 1}: "${col.name}"...`);

    // Open column settings
    const settingsBtn = col.element.querySelector(SEL.columnSettings)
      || col.element.querySelector('button[aria-label*="settings"]')
      || col.element.querySelector('button[aria-label*="Settings"]');

    if (settingsBtn) {
      await clickElement(settingsBtn);
    }

    const removeBtn = await waitForElement(SEL.removeColumn)
      || await waitForElement('button[aria-label*="Remove"]');

    if (removeBtn) {
      await clickElement(removeBtn);

      // Handle confirmation
      const confirm = await waitForElement(SEL.confirmDialog, 2000);
      if (confirm) {
        await clickElement(confirm);
      }

      stats.columnsRemoved++;
      console.log(`✅ Column "${col.name}" removed.`);
      return true;
    }

    console.log('⚠️ Remove button not found. Try removing the column manually via its settings.');
    return false;
  };

  /* ─── 3. Column Filtering ───────────────────────────────── */

  const openColumnSettings = async (columnIndex) => {
    const columns = getColumns();
    if (columnIndex < 0 || columnIndex >= columns.length) {
      console.log(`❌ Invalid column index: ${columnIndex}.`);
      return null;
    }

    const col = columns[columnIndex];
    const settingsBtn = col.element.querySelector(SEL.columnSettings)
      || col.element.querySelector('button[aria-label*="settings"]')
      || col.element.querySelector('button[aria-label*="Settings"]')
      || col.element.querySelector('button[aria-label*="filter"]');

    if (!settingsBtn) {
      console.log(`⚠️ Settings button not found for column "${col.name}".`);
      return null;
    }

    await clickElement(settingsBtn);
    return col;
  };

  const addKeywordFilter = async (columnIndex, keyword, exclude = false) => {
    if (!ensurePro()) return false;

    const col = await openColumnSettings(columnIndex);
    if (!col) return false;

    console.log(`🔧 Adding ${exclude ? 'exclusion' : 'inclusion'} filter "${keyword}" to column "${col.name}"...`);

    // Look for filter input inside settings panel
    const filterInput = await waitForElement('input[placeholder*="filter"]')
      || await waitForElement('input[placeholder*="Filter"]')
      || await waitForElement('input[aria-label*="filter"]');

    if (filterInput) {
      const filterText = exclude ? `-${keyword}` : keyword;
      await typeIntoInput(filterInput, filterText);
      await sleep(500);

      // Confirm / apply filter — scope to the settings panel/dialog so we
      // never fall back onto an unrelated document-wide button (e.g. "Add column").
      const panel = filterInput.closest(SEL.dialog) || filterInput.closest(SEL.columnSettings) || col.element;
      const applyBtn = panel.querySelector('button[aria-label*="Apply"]')
        || panel.querySelector('button[aria-label*="Save"]')
        || [...panel.querySelectorAll('button')].find(b =>
          b.textContent.toLowerCase().includes('apply') ||
          b.textContent.toLowerCase().includes('save') ||
          b.textContent.toLowerCase().includes('add')
        );

      if (applyBtn) {
        await clickElement(applyBtn);
        stats.filtersApplied++;
        console.log(`✅ Filter "${filterText}" applied to column "${col.name}".`);
        return true;
      }

      // Try pressing Enter as fallback
      filterInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true,
      }));
      await sleep(CONFIG.delayBetweenActions);
      stats.filtersApplied++;
      console.log(`✅ Filter "${filterText}" applied to column "${col.name}".`);
      return true;
    }

    console.log('⚠️ Filter input not found. Column filtering may not be available for this column type.');

    // Close settings dialog
    const closeBtn = document.querySelector(SEL.closeDialog) || document.querySelector(SEL.backButton);
    if (closeBtn) await clickElement(closeBtn);

    return false;
  };

  const addUserFilter = async (columnIndex, username, exclude = false) => {
    if (!ensurePro()) return false;

    const cleanUsername = username.replace(/^@/, '');
    const filterKeyword = exclude ? `-from:${cleanUsername}` : `from:${cleanUsername}`;

    console.log(`👤 Adding user filter: ${exclude ? 'excluding' : 'including'} @${cleanUsername}...`);
    return addKeywordFilter(columnIndex, filterKeyword, false);
  };

  const listColumnFilters = async (columnIndex) => {
    if (!ensurePro()) return [];

    const col = await openColumnSettings(columnIndex);
    if (!col) return [];

    console.log(`📋 Filters for column "${col.name}":`);

    // Gather any visible filter tags or list items
    const filterEls = document.querySelectorAll(
      '[class*="filter"], [data-testid*="filter"], [aria-label*="filter"]'
    );

    const filters = [];
    filterEls.forEach(el => {
      const text = el.textContent?.trim();
      if (text) {
        filters.push(text);
        console.log(`   🏷️ ${text}`);
      }
    });

    if (filters.length === 0) {
      console.log('   ℹ️ No filters found for this column.');
    }

    // Close dialog
    const closeBtn = document.querySelector(SEL.closeDialog) || document.querySelector(SEL.backButton);
    if (closeBtn) await clickElement(closeBtn);

    return filters;
  };

  /* ─── 4. Deck Management ────────────────────────────────── */

  const saveDeck = (name) => {
    if (!ensurePro()) return false;

    const columns = getColumns();
    if (columns.length === 0) {
      console.log('⚠️ No columns to save.');
      return false;
    }

    const deckName = name || `Deck ${new Date().toLocaleDateString()}`;
    console.log(`💾 Saving deck configuration: "${deckName}"...`);

    const deckData = {
      name: deckName,
      savedAt: new Date().toISOString(),
      columns: columns.map(({ element, ...rest }) => rest),
    };

    // Load existing saved decks
    const decks = loadFromStorage('decks', []);
    const existingIdx = decks.findIndex(d => d.name === deckName);
    if (existingIdx >= 0) {
      decks[existingIdx] = deckData;
      console.log(`🔄 Overwrote existing deck: "${deckName}"`);
    } else {
      decks.push(deckData);
    }

    saveToStorage('decks', decks);
    stats.decksSaved++;
    console.log(`✅ Deck "${deckName}" saved with ${deckData.columns.length} column(s).`);
    return true;
  };

  const listDecks = () => {
    const decks = loadFromStorage('decks', []);

    if (decks.length === 0) {
      console.log('ℹ️ No saved decks found.');
      console.log('💡 Use saveDeck("name") to save your current layout.');
      return [];
    }

    console.log(`\n📚 Saved Decks (${decks.length}):`);
    console.log('─'.repeat(50));
    decks.forEach((deck, i) => {
      const date = new Date(deck.savedAt).toLocaleString();
      console.log(`   ${i + 1}. 📋 ${deck.name} — ${deck.columns.length} columns — saved ${date}`);
    });
    console.log('─'.repeat(50));
    return decks;
  };

  const loadDeck = async (nameOrIndex) => {
    if (!ensurePro()) return false;

    const decks = loadFromStorage('decks', []);
    let deck;

    if (typeof nameOrIndex === 'number') {
      deck = decks[nameOrIndex];
    } else {
      deck = decks.find(d => d.name === nameOrIndex);
    }

    if (!deck) {
      console.log(`❌ Deck not found: "${nameOrIndex}"`);
      listDecks();
      return false;
    }

    console.log(`📂 Loading deck: "${deck.name}" (${deck.columns.length} columns)...`);
    console.log('⚠️ Note: X Pro does not support programmatic deck restoration.');
    console.log('   Columns from this deck:');
    deck.columns.forEach((col, i) => {
      console.log(`   ${i + 1}. ${col.name}`);
    });
    console.log('\n💡 Manually recreate these columns, or use addColumn()/addSearchColumn() for each.');
    return deck;
  };

  const deleteDeck = (nameOrIndex) => {
    const decks = loadFromStorage('decks', []);
    let removed;

    if (typeof nameOrIndex === 'number') {
      if (nameOrIndex < 0 || nameOrIndex >= decks.length) {
        console.log(`❌ Invalid deck index: ${nameOrIndex}`);
        return false;
      }
      removed = decks.splice(nameOrIndex, 1)[0];
    } else {
      const idx = decks.findIndex(d => d.name === nameOrIndex);
      if (idx < 0) {
        console.log(`❌ Deck not found: "${nameOrIndex}"`);
        return false;
      }
      removed = decks.splice(idx, 1)[0];
    }

    saveToStorage('decks', decks);
    console.log(`🗑️ Deleted deck: "${removed.name}"`);
    return true;
  };

  const exportDeck = (nameOrIndex) => {
    const decks = loadFromStorage('decks', []);
    let deck;

    if (nameOrIndex === undefined) {
      // Export current layout
      const columns = getColumns();
      deck = {
        name: 'Current Layout',
        exportedAt: new Date().toISOString(),
        columns: columns.map(({ element, ...rest }) => rest),
      };
    } else if (typeof nameOrIndex === 'number') {
      deck = decks[nameOrIndex];
    } else {
      deck = decks.find(d => d.name === nameOrIndex);
    }

    if (!deck) {
      console.log(`❌ Deck not found: "${nameOrIndex}"`);
      return false;
    }

    const json = JSON.stringify(deck, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions-deck-${deck.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`📥 Deck "${deck.name}" exported as JSON.`);
    return true;
  };

  const importDeck = (jsonString) => {
    try {
      const deck = JSON.parse(jsonString);
      if (!deck.name || !Array.isArray(deck.columns)) {
        console.log('❌ Invalid deck format. Expected { name, columns: [...] }');
        return false;
      }

      const decks = loadFromStorage('decks', []);
      deck.importedAt = new Date().toISOString();
      decks.push(deck);
      saveToStorage('decks', decks);

      console.log(`✅ Deck "${deck.name}" imported with ${deck.columns.length} column(s).`);
      console.log('💡 Use loadDeck() to view column instructions.');
      return true;
    } catch {
      console.log('❌ Failed to parse deck JSON. Check the format.');
      return false;
    }
  };

  /* ─── 5. Collections Management ─────────────────────────── */

  const getCollections = () => loadFromStorage('collections', []);

  const createCollection = (name, description = '') => {
    console.log(`📂 Creating collection: "${name}"...`);

    const collections = getCollections();
    if (collections.find(c => c.name === name)) {
      console.log(`⚠️ Collection "${name}" already exists.`);
      return false;
    }

    collections.push({
      name,
      description,
      createdAt: new Date().toISOString(),
      tweets: [],
    });

    saveToStorage('collections', collections);
    stats.collectionsCreated++;
    console.log(`✅ Collection "${name}" created.`);
    return true;
  };

  const listCollections = () => {
    const collections = getCollections();

    if (collections.length === 0) {
      console.log('ℹ️ No collections found.');
      console.log('💡 Use createCollection("name") to create one.');
      return [];
    }

    console.log(`\n📂 Collections (${collections.length}):`);
    console.log('─'.repeat(50));
    collections.forEach((col, i) => {
      console.log(`   ${i + 1}. 📌 ${col.name} — ${col.tweets.length} tweets${col.description ? ` — ${col.description}` : ''}`);
    });
    console.log('─'.repeat(50));
    return collections;
  };

  const addTweetToCollection = async (collectionName) => {
    if (!ensurePro()) return false;

    const collections = getCollections();
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) {
      console.log(`❌ Collection "${collectionName}" not found. Create it first.`);
      return false;
    }

    console.log(`🔍 Scanning visible tweets to add to "${collectionName}"...`);

    const tweets = document.querySelectorAll(SEL.tweet);
    if (tweets.length === 0) {
      console.log('⚠️ No tweets visible on screen.');
      return false;
    }

    let added = 0;
    for (const tweet of tweets) {
      if (aborted) break;

      const textEl = tweet.querySelector(SEL.tweetText);
      const text = textEl?.textContent?.trim() || '';
      if (!text) continue;

      const authorEl = tweet.querySelector('[data-testid="User-Name"] a');
      const authorLink = authorEl?.getAttribute('href') || '';
      const author = authorLink.replace(/^\//, '').split('/')[0] || 'unknown';

      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime') || '';

      const tweetLink = tweet.querySelector('a[href*="/status/"]');
      const tweetUrl = tweetLink ? `https://x.com${tweetLink.getAttribute('href')}` : '';

      // Deduplicate by URL
      if (tweetUrl && collection.tweets.find(t => t.url === tweetUrl)) continue;

      collection.tweets.push({
        text: text.substring(0, 280),
        author,
        timestamp,
        url: tweetUrl,
        addedAt: new Date().toISOString(),
      });
      added++;
    }

    saveToStorage('collections', collections);
    console.log(`✅ Added ${added} tweet(s) to "${collectionName}" (total: ${collection.tweets.length}).`);
    return true;
  };

  const addTweetByUrl = (collectionName, tweetUrl, note = '') => {
    const collections = getCollections();
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) {
      console.log(`❌ Collection "${collectionName}" not found.`);
      return false;
    }

    if (collection.tweets.find(t => t.url === tweetUrl)) {
      console.log('⚠️ Tweet already in this collection.');
      return false;
    }

    collection.tweets.push({
      text: note || '',
      author: '',
      timestamp: '',
      url: tweetUrl,
      addedAt: new Date().toISOString(),
    });

    saveToStorage('collections', collections);
    console.log(`✅ Tweet added to "${collectionName}".`);
    return true;
  };

  const removeTweetFromCollection = (collectionName, tweetIndex) => {
    const collections = getCollections();
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) {
      console.log(`❌ Collection "${collectionName}" not found.`);
      return false;
    }

    if (tweetIndex < 0 || tweetIndex >= collection.tweets.length) {
      console.log(`❌ Invalid tweet index: ${tweetIndex}`);
      return false;
    }

    const removed = collection.tweets.splice(tweetIndex, 1)[0];
    saveToStorage('collections', collections);
    console.log(`🗑️ Removed tweet from "${collectionName}": "${removed.text.substring(0, 50)}..."`);
    return true;
  };

  const viewCollection = (collectionName) => {
    const collections = getCollections();
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) {
      console.log(`❌ Collection "${collectionName}" not found.`);
      return null;
    }

    console.log(`\n📂 Collection: ${collection.name}`);
    if (collection.description) console.log(`   📝 ${collection.description}`);
    console.log(`   📅 Created: ${new Date(collection.createdAt).toLocaleString()}`);
    console.log(`   📊 Tweets: ${collection.tweets.length}`);
    console.log('─'.repeat(50));

    collection.tweets.forEach((tweet, i) => {
      const preview = tweet.text.substring(0, 80) || tweet.url || '(no text)';
      const author = tweet.author ? `@${tweet.author}` : '';
      console.log(`   ${i + 1}. ${author} ${preview}${tweet.text.length > 80 ? '...' : ''}`);
    });
    console.log('─'.repeat(50));

    return collection;
  };

  const deleteCollection = (collectionName) => {
    const collections = getCollections();
    const idx = collections.findIndex(c => c.name === collectionName);
    if (idx < 0) {
      console.log(`❌ Collection "${collectionName}" not found.`);
      return false;
    }

    const removed = collections.splice(idx, 1)[0];
    saveToStorage('collections', collections);
    console.log(`🗑️ Deleted collection "${removed.name}" (${removed.tweets.length} tweets).`);
    return true;
  };

  const exportCollection = (collectionName) => {
    const collections = getCollections();
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) {
      console.log(`❌ Collection "${collectionName}" not found.`);
      return false;
    }

    const json = JSON.stringify(collection, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions-collection-${collection.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`📥 Collection "${collection.name}" exported (${collection.tweets.length} tweets).`);
    return true;
  };

  /* ─── Public API ────────────────────────────────────────── */

  window.XActions = window.XActions || {};
  window.XActions.xProManager = {
    // Controls
    abort() { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      console.log(`📊 Columns created: ${stats.columnsCreated} | Removed: ${stats.columnsRemoved} | Filters: ${stats.filtersApplied} | Decks saved: ${stats.decksSaved} | Collections: ${stats.collectionsCreated} | ${elapsed}s`);
    },

    // 1. Multi-column view
    scanColumns,
    reorderColumns,
    scrollColumnToTop,

    // 2. Custom column creation
    addColumn,
    addSearchColumn,
    addListColumn,
    removeColumn,

    // 3. Column filtering
    addKeywordFilter,
    addUserFilter,
    listColumnFilters,

    // 4. Deck management
    saveDeck,
    listDecks,
    loadDeck,
    deleteDeck,
    exportDeck,
    importDeck,

    // 5. Collections management
    createCollection,
    listCollections,
    viewCollection,
    addTweetToCollection,
    addTweetByUrl,
    removeTweetFromCollection,
    deleteCollection,
    exportCollection,
  };

  /* ─── Menu ──────────────────────────────────────────────── */

  const showMenu = () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 XActions — X Pro Manager');
    console.log('   by nichxbt');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🎮 CONTROLS:');
    console.log('   window.XActions.xProManager.abort()   — stop running operations');
    console.log('   window.XActions.xProManager.status()  — check stats\n');

    console.log('📐 1. MULTI-COLUMN VIEW:');
    console.log('   .scanColumns()                        — list all current columns');
    console.log('   .reorderColumns(fromIdx, toIdx)       — move a column');
    console.log('   .scrollColumnToTop(idx)               — scroll column to top\n');

    console.log('➕ 2. CUSTOM COLUMN CREATION:');
    console.log('   .addColumn("type")                    — add column (home, notifications, search, list, etc.)');
    console.log('   .addSearchColumn("query")             — add a search column');
    console.log('   .addListColumn("listName")            — add a list column');
    console.log('   .removeColumn(idx)                    — remove a column by index\n');

    console.log('🔧 3. COLUMN FILTERING:');
    console.log('   .addKeywordFilter(colIdx, "word")     — include keyword in column');
    console.log('   .addKeywordFilter(colIdx, "word", true) — exclude keyword');
    console.log('   .addUserFilter(colIdx, "user")        — filter by user');
    console.log('   .listColumnFilters(colIdx)            — show filters for a column\n');

    console.log('💾 4. DECK MANAGEMENT:');
    console.log('   .saveDeck("name")                     — save current column layout');
    console.log('   .listDecks()                          — show saved decks');
    console.log('   .loadDeck("name" | idx)               — view deck details');
    console.log('   .deleteDeck("name" | idx)             — delete a saved deck');
    console.log('   .exportDeck("name" | idx)             — export deck as JSON');
    console.log('   .importDeck(jsonString)               — import a deck\n');

    console.log('📂 5. COLLECTIONS MANAGEMENT:');
    console.log('   .createCollection("name", "desc")     — create a tweet collection');
    console.log('   .listCollections()                    — list all collections');
    console.log('   .viewCollection("name")               — view tweets in a collection');
    console.log('   .addTweetToCollection("name")         — add visible tweets to collection');
    console.log('   .addTweetByUrl("name", "url")         — add a tweet by URL');
    console.log('   .removeTweetFromCollection("name", i) — remove tweet by index');
    console.log('   .deleteCollection("name")             — delete a collection');
    console.log('   .exportCollection("name")             — export collection as JSON\n');

    console.log('💡 All methods: window.XActions.xProManager.<method>()');
    console.log('═══════════════════════════════════════════════════════\n');
  };

  /* ─── Init ──────────────────────────────────────────────── */

  showMenu();

  if (isPro()) {
    console.log('✅ X Pro detected. Scanning columns...\n');
    scanColumns();
  } else {
    console.log('⚠️ You are not on pro.x.com. Navigate there first for full functionality.');
    console.log('💡 Collections and deck saving still work from any page.\n');
  }
})();
