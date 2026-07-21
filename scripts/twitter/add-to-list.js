// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * ➕ Add To List - XActions
 * ============================================
 *
 * @name         add-to-list
 * @description  Add a batch of users to one of your Twitter Lists via the list's "Manage members" search, rate-limited.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to your Lists page: https://x.com/<your-handle>/lists
 *      (the script clicks into the list named in CONFIG.listName for you)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Edit CONFIG: set listName and the usernames array (no @ needed)
 *   4. Set CONFIG.dryRun to false when you are ready to actually add them
 *   5. Paste this entire script and press Enter
 *
 * Example:
 *   listName: 'Solana builders', usernames: ['toly', 'aeyakovenko', 'rajgokal']
 *   With dryRun: true it prints who it would add. Set dryRun: false and it opens
 *   the list, opens Manage members, searches each handle, and adds the match,
 *   pausing 2-4s between users.
 *   To stop early, run window.stopAddToList() in the console.
 *
 * ============================================
 */

(async function addToList() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // The EXISTING list to add people to (must appear on your Lists page)
    listName: 'My List',

    // Users to add (handles without the leading @)
    usernames: [
      // 'user1',
      // 'user2'
    ],

    // Safety: preview without adding anyone. Set to false to execute.
    dryRun: true,

    // Rate limiting between users (randomized between min and max, ms)
    minDelay: 2000,
    maxDelay: 4000,

    // How long to wait for search results per user (ms)
    searchWait: 2200,

    // Delay between UI navigation steps (ms)
    stepDelay: 1500
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    listLink: 'a[href*="/lists/"]',
    editButton: '[data-testid="editList"], [aria-label="Edit List"], [aria-label="Edit list"]',
    manageMembers: '[data-testid="listManageMembers"]',
    addMembersTab: '[data-testid="addMembers"]',
    searchInput: '[data-testid="searchPeople"], input[data-testid="searchPeople"]',
    userCell: '[data-testid="UserCell"]',
    // Inside the add-members list, each row exposes an add/remove follow-style button
    addButton: '[data-testid$="-follow"], [role="button"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    step: (msg) => console.log(`   → ${msg}`)
  };

  let stopped = false;
  window.stopAddToList = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current user, then exiting.');
  };

  const qs = (sel) => document.querySelector(sel);

  const waitFor = async (sel, timeoutMs = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (stopped) return null;
      const el = qs(sel);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const setReactInput = (el, value) => {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const findButtonByText = (labels) => {
    const wanted = labels.map(l => l.toLowerCase());
    for (const b of document.querySelectorAll('[role="button"], button, [role="tab"], [role="menuitem"]')) {
      const t = (b.textContent || '').trim().toLowerCase();
      if (wanted.some(w => t === w || t.startsWith(w))) return b;
    }
    return null;
  };

  const findListLinkByName = (name) => {
    const target = name.trim().toLowerCase();
    for (const link of document.querySelectorAll(SELECTORS.listLink)) {
      const text = (link.textContent || '').trim().toLowerCase();
      if (text.includes(target)) return link;
    }
    return null;
  };

  const handleFromCell = (cell) => {
    const link = cell.querySelector('a[href^="/"]');
    if (!link) return '';
    const href = link.getAttribute('href') || '';
    const m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
    return m ? m[1] : '';
  };

  // ============================================
  // 🚀 RUN
  // ============================================
  const stats = { added: 0, notFound: 0, alreadyIn: 0, errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  ➕ ADD TO LIST - XActions                               ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard
  if (!/\/lists/.test(window.location.pathname) && !/\/i\/lists/.test(window.location.pathname)) {
    log.warning('You are not on a Lists page.');
    log.info('Go to https://x.com/<your-handle>/lists, then paste this script again.');
    return;
  }

  const users = CONFIG.usernames.map(u => u.replace(/^@/, '').trim()).filter(Boolean);
  if (users.length === 0) {
    log.warning('CONFIG.usernames is empty. Add at least one handle to CONFIG.usernames.');
    return;
  }

  log.info(`Target list: "${CONFIG.listName}"`);
  log.info(`Users to add: ${users.length}`);
  if (CONFIG.dryRun) {
    log.warning('DRY RUN is ON. No one will be added. Set CONFIG.dryRun = false to execute.');
    users.forEach(u => log.step(`Would add @${u}`));
    console.log('\n✅ Dry run complete. by nichxbt');
    return { dryRun: true, wouldAdd: users };
  }
  log.info('To stop early: window.stopAddToList()');
  console.log('');

  // 1) Open the target list
  const listLink = findListLinkByName(CONFIG.listName);
  if (!listLink) {
    log.error(`Could not find a list named "${CONFIG.listName}" on this page.`);
    log.info('Confirm the name matches exactly and you are on x.com/<you>/lists.');
    return;
  }
  log.step(`Opening list "${CONFIG.listName}"`);
  listLink.click();
  await sleep(CONFIG.stepDelay);

  // 2) Open Edit -> Manage members -> Add members
  const editBtn = await waitFor(SELECTORS.editButton, 5000) || findButtonByText(['edit list']);
  if (editBtn) { editBtn.click(); await sleep(CONFIG.stepDelay); }

  const manageBtn = await waitFor(SELECTORS.manageMembers, 4000) || findButtonByText(['manage members']);
  if (manageBtn) { manageBtn.click(); await sleep(CONFIG.stepDelay); }

  const addTab = await waitFor(SELECTORS.addMembersTab, 4000) || findButtonByText(['add members', 'suggested']);
  if (addTab) { addTab.click(); await sleep(CONFIG.stepDelay); }

  const searchInput = await waitFor(SELECTORS.searchInput, 5000);
  if (!searchInput) {
    log.error('Could not open the "Add members" search box.');
    log.info('Open the list, tap Edit List then Manage members, then rerun this script.');
    return;
  }

  // 3) Add each user, one at a time, rate-limited
  for (const username of users) {
    if (stopped) break;

    try {
      searchInput.focus();
      setReactInput(searchInput, '');
      await sleep(300);
      setReactInput(searchInput, username);
      await sleep(CONFIG.searchWait);

      const cells = document.querySelectorAll(SELECTORS.userCell);
      let matchedCell = null;
      for (const cell of cells) {
        if (handleFromCell(cell).toLowerCase() === username.toLowerCase()) { matchedCell = cell; break; }
      }
      // Fall back to a looser text match if the handle link was not resolvable
      if (!matchedCell) {
        for (const cell of cells) {
          if ((cell.textContent || '').toLowerCase().includes('@' + username.toLowerCase())) { matchedCell = cell; break; }
        }
      }

      if (!matchedCell) {
        stats.notFound++;
        log.warning(`@${username} not found in search results`);
        continue;
      }

      // Already a member? X labels the row control "Remove" when present.
      const control = matchedCell.querySelector(SELECTORS.addButton);
      const controlText = control ? (control.textContent || '').trim().toLowerCase() : '';
      if (controlText.includes('remove')) {
        stats.alreadyIn++;
        log.info(`@${username} is already in the list, skipping`);
        continue;
      }

      if (control) control.click();
      else matchedCell.click();

      stats.added++;
      log.success(`Added #${stats.added}: @${username}`);
      await sleep(randomDelay());
    } catch (e) {
      stats.errors++;
      log.error(`Error adding @${username}: ${e.message}`);
    }
  }

  // 4) Save / close the manage-members dialog if a save control is present
  const saveBtn = findButtonByText(['done', 'save']);
  if (saveBtn) { try { saveBtn.click(); } catch (e) {} }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  📊 ADD TO LIST - COMPLETE                               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`   ✅ Added:        ${stats.added}`);
  console.log(`   ⏭️  Already in:   ${stats.alreadyIn}`);
  console.log(`   🔍 Not found:    ${stats.notFound}`);
  console.log(`   ❌ Errors:       ${stats.errors}`);
  console.log('✅ Script completed! by nichxbt');

  return stats;
})();
