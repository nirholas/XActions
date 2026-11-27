// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        listManager.js
 * @title       List Manager
 * @description Create, rename or delete your X Lists, add users to a list, and export your lists or a list's members, dry run by default.
 * @category    lists
 * @page        x.com/<you>/lists or x.com/i/lists/<id>/members
 * @writes      true
 * @aliases     scripts/listManager.js, scripts/manageLists.js, scripts/twitter/list-manager.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Manage Lists on X - by nichxbt
// https://github.com/nirholas/xactions
// Create, manage, and populate X lists programmatically
// 1. Go to x.com/YOUR_USERNAME/lists (create, rename, delete, export your lists)
//    or open a list (add users, export its members)
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below. dryRun is ON by default and only previews the steps:
//    set dryRun = false to actually create, rename, delete or add.
// 4. Paste browser/listManager.js into the Developer Console and run it
//
// Sections run in this order when enabled: createList, renameList, deleteList,
// addUsers, exportLists, exportMembers.
// To abort mid-flow: window.stopListManager()
//
// Last Updated: 27 November 2026
(() => {
  const CONFIG = {
    // Safety: preview the steps without changing anything. Set to false to execute.
    dryRun: true,
    // Create a new list
    createList: {
      enabled: false,
      name: 'My List',
      description: 'Created by XActions',
      isPrivate: true,
    },
    // Rename one of your lists (run on x.com/<you>/lists so the list is on screen)
    renameList: {
      enabled: false,
      name: '',       // the EXISTING list name
      newName: '',    // the name to change it to
    },
    // Delete one of your lists (run on x.com/<you>/lists). This cannot be undone.
    deleteList: {
      enabled: false,
      name: '',       // the EXISTING list name
    },
    // Add users to an existing list (navigate to list page first)
    addUsers: {
      enabled: true,
      usernames: [
        // 'user1',
        // 'user2',
      ],
    },
    // Export your lists (name, link, description, member count) from x.com/<you>/lists
    exportLists: {
      enabled: false,
      maxLists: 50,
    },
    // Export list members
    exportMembers: {
      enabled: false,
      maxMembers: 200,
    },
    copyToClipboard: false,   // Also copy exported JSON to the clipboard
    actionDelay: 2000,
    scrollDelay: 1500,
    stepDelay: 1500,          // Delay between UI steps for rename and delete (ms)
  };

  const $createListButton = '[data-testid="createList"], a[href="/i/lists/create"]';
  const $listNameInput = '[data-testid="listNameInput"], input[name="name"]';
  const $listDescInput = '[data-testid="listDescriptionInput"], textarea[name="description"]';
  const $listPrivateToggle = '[data-testid="listPrivateToggle"]';
  const $listSaveButton = '[data-testid="listSaveButton"], [data-testid="listCreationSheet-headerButton"]';
  const $addMemberButton = '[data-testid="addMembers"]';
  const $searchInput = '[data-testid="searchPeople"]';
  const $userCell = '[data-testid="UserCell"]';
  const $userName = '[data-testid="User-Name"]';
  const $listLink = 'a[href*="/lists/"]';
  const $listItem = '[data-testid="listItem"], a[href*="/lists/"]';
  const $editListButton = '[data-testid="editList"], [aria-label="Edit List"], [aria-label="Edit list"]';
  const $listDeleteButton = '[data-testid="listDeleteButton"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let stopped = false;
  window.stopListManager = () => {
    stopped = true;
    console.warn('⚠️ Stop requested. The script will halt at the next step.');
  };

  const results = [];

  // Wait for an element to appear (up to timeoutMs)
  const waitFor = async (sel, timeoutMs = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (stopped) return null;
      const el = document.querySelector(sel);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  // Set a value on a React-controlled input/textarea so the framework registers it
  const setReactInput = (el, value) => {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // Find a clickable button whose visible text matches one of the labels
  const findButtonByText = (labels) => {
    const wanted = labels.map(l => l.toLowerCase());
    const buttons = document.querySelectorAll('[role="button"], button, [role="menuitem"]');
    for (const b of buttons) {
      const t = (b.textContent || '').trim().toLowerCase();
      if (wanted.some(w => t === w || t.startsWith(w))) return b;
    }
    return null;
  };

  // Locate a list row on the Lists page by its visible name
  const findListLinkByName = (name) => {
    const target = name.trim().toLowerCase();
    for (const link of document.querySelectorAll($listLink)) {
      const text = (link.textContent || '').trim().toLowerCase();
      if (text.includes(target)) return link;
    }
    return null;
  };

  const extractBio = (cell) => {
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    return cell.querySelector('[dir="auto"]:not([data-testid])')?.textContent || '';
  };

  const download = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copyJson = async (data) => {
    if (!CONFIG.copyToClipboard) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      console.log('📋 Copied to clipboard!');
    } catch (e) {
      console.warn(`⚠️ Could not copy to clipboard: ${e.message}`);
    }
  };

  const createNewList = async () => {
    const { name, description, isPrivate } = CONFIG.createList;
    console.log(`📋 Creating list: "${name}" (${isPrivate ? 'private' : 'public'})`);
    if (!name.trim()) {
      console.error('❌ CONFIG.createList.name is empty. Set a name to create.');
      return false;
    }

    if (CONFIG.dryRun) {
      console.log('   📝 DRY RUN: would open the create-list dialog');
      console.log(`   📝 DRY RUN: would type name "${name}" and description "${description}"`);
      console.log('   📝 DRY RUN: would save. Set CONFIG.dryRun = false to execute.');
      return true;
    }

    const createBtn = document.querySelector($createListButton);
    if (createBtn) {
      createBtn.click();
      await sleep(1500);
    }

    const nameInput = document.querySelector($listNameInput) || await waitFor($listNameInput, 4000);
    if (!nameInput) {
      console.error('❌ List name input did not appear. Are you on x.com/<you>/lists?');
      return false;
    }
    nameInput.focus();
    nameInput.value = '';
    document.execCommand('insertText', false, name);
    await sleep(500);

    const descInput = document.querySelector($listDescInput);
    if (descInput && description) {
      descInput.focus();
      descInput.value = '';
      document.execCommand('insertText', false, description);
      await sleep(500);
    }

    if (isPrivate) {
      const toggle = document.querySelector($listPrivateToggle);
      if (toggle) toggle.click();
      await sleep(300);
    }

    let saveBtn = document.querySelector($listSaveButton);
    if (!saveBtn) {
      // The current flow has a "Next" step after the details
      const next = findButtonByText(['next']);
      if (next && !next.getAttribute('aria-disabled')) {
        next.click();
        await sleep(CONFIG.stepDelay);
      }
      saveBtn = document.querySelector($listSaveButton) || findButtonByText(['done', 'create', 'save']);
    }
    if (!saveBtn) {
      console.error('❌ Could not find the save/create button.');
      return false;
    }
    saveBtn.click();
    console.log('✅ List created!');
    await sleep(1500);
    return true;
  };

  const openTargetList = async (name) => {
    const link = findListLinkByName(name);
    if (!link) {
      console.error(`❌ Could not find a list named "${name}" on this page.`);
      console.log('   Make sure you are on x.com/<you>/lists and the list name matches.');
      return false;
    }
    console.log(`   → Opening list "${name}"`);
    link.click();
    await sleep(CONFIG.stepDelay);
    return true;
  };

  const renameList = async () => {
    const { name, newName } = CONFIG.renameList;
    console.log(`✏️ Rename list: "${name}" -> "${newName}"`);
    if (!name.trim()) { console.error('❌ CONFIG.renameList.name is empty. Set the existing list name.'); return false; }
    if (!newName.trim()) { console.error('❌ CONFIG.renameList.newName is empty. Set the new name.'); return false; }

    if (CONFIG.dryRun) {
      console.log(`   📝 DRY RUN: would open "${name}", edit it, set name to "${newName}", and save.`);
      console.log('   📝 Set CONFIG.dryRun = false to execute.');
      return true;
    }

    if (!await openTargetList(name)) return false;

    const editBtn = await waitFor($editListButton, 5000) || findButtonByText(['edit list']);
    if (!editBtn) { console.error('❌ Could not find the "Edit List" control.'); return false; }
    editBtn.click();
    await sleep(CONFIG.stepDelay);

    const nameInput = await waitFor($listNameInput);
    if (!nameInput) { console.error('❌ List name input did not appear in the edit dialog.'); return false; }
    nameInput.focus();
    setReactInput(nameInput, newName);
    await sleep(500);

    const saveBtn = document.querySelector($listSaveButton) || findButtonByText(['done', 'save']);
    if (!saveBtn) { console.error('❌ Could not find the save button.'); return false; }
    saveBtn.click();
    await sleep(CONFIG.stepDelay);
    console.log(`✅ List renamed to "${newName}".`);
    return true;
  };

  const deleteList = async () => {
    const { name } = CONFIG.deleteList;
    console.log(`🗑️ Delete list: "${name}"`);
    if (!name.trim()) { console.error('❌ CONFIG.deleteList.name is empty. Set the list name to delete.'); return false; }

    if (CONFIG.dryRun) {
      console.log(`   📝 DRY RUN: would open "${name}", edit it, click Delete, and confirm.`);
      console.log('   📝 Set CONFIG.dryRun = false to execute. This cannot be undone.');
      return true;
    }

    if (!await openTargetList(name)) return false;

    const editBtn = await waitFor($editListButton, 5000) || findButtonByText(['edit list']);
    if (!editBtn) { console.error('❌ Could not find the "Edit List" control.'); return false; }
    editBtn.click();
    await sleep(CONFIG.stepDelay);

    const deleteBtn = await waitFor($listDeleteButton, 4000) || findButtonByText(['delete list']);
    if (!deleteBtn) { console.error('❌ Could not find the "Delete List" button.'); return false; }
    deleteBtn.click();
    await sleep(CONFIG.stepDelay);

    const confirm = await waitFor($confirmButton, 4000) || findButtonByText(['delete']);
    if (!confirm) { console.error('❌ Could not find the delete confirmation button.'); return false; }
    confirm.click();
    await sleep(CONFIG.stepDelay);
    console.log(`✅ List "${name}" deleted.`);
    return true;
  };

  const addUsersToList = async () => {
    const users = CONFIG.addUsers.usernames;
    if (users.length === 0) {
      console.error('❌ No usernames provided! Edit CONFIG.addUsers.usernames.');
      return false;
    }
    console.log(`👥 Adding ${users.length} users to list...`);

    if (CONFIG.dryRun) {
      users.forEach(u => console.log(`   📝 Would add: @${u}`));
      return true;
    }

    const addBtn = document.querySelector($addMemberButton);
    if (addBtn) {
      addBtn.click();
      await sleep(1500);
    }

    let added = 0;
    for (const username of users) {
      if (stopped) break;
      const searchInput = document.querySelector($searchInput);
      if (!searchInput) {
        console.error('❌ Search input not found');
        break;
      }

      searchInput.focus();
      searchInput.value = '';
      document.execCommand('insertText', false, username);
      await sleep(2000);

      // Click on matching user
      const cells = document.querySelectorAll($userCell);
      let found = false;
      for (const cell of cells) {
        if (cell.textContent.toLowerCase().includes(username.toLowerCase())) {
          cell.click();
          found = true;
          added++;
          console.log(`✅ Added @${username}`);
          break;
        }
      }

      if (!found) {
        console.warn(`⚠️ @${username} not found`);
      }

      // Clear search
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(CONFIG.actionDelay);
    }

    console.log(`✅ Added ${added}/${users.length} members`);
    return added > 0;
  };

  const exportYourLists = async () => {
    console.log('📋 Exporting lists...');

    const lists = [];
    let scrollAttempts = 0;

    while (lists.length < CONFIG.exportLists.maxLists && scrollAttempts < 10 && !stopped) {
      document.querySelectorAll($listItem).forEach(el => {
        const name = el.querySelector('[dir="ltr"]')?.textContent || el.textContent?.trim() || '';
        const link = el.href || el.querySelector('a')?.href || '';
        const description = el.querySelector('[data-testid="listDescription"]')?.textContent || '';
        const memberCount = el.querySelector('[data-testid="memberCount"]')?.textContent || '';

        if (name && link && !lists.find(l => l.link === link) && lists.length < CONFIG.exportLists.maxLists) {
          lists.push({
            name: name.trim().substring(0, 100),
            link,
            description: description.trim(),
            memberCount,
          });
        }
      });

      window.scrollBy(0, 800);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    console.log(`📊 Found ${lists.length} lists`);
    lists.forEach((l, i) => {
      console.log(`  ${i + 1}. ${l.name} ${l.memberCount ? `(${l.memberCount} members)` : ''}`);
    });
    if (lists.length === 0) return false;

    const data = { lists, scrapedAt: new Date().toISOString() };
    download(data, `xactions-lists-${new Date().toISOString().slice(0, 10)}.json`);
    console.log('📥 Lists exported as JSON');
    await copyJson(data);
    return true;
  };

  const exportListMembers = async () => {
    console.log('📥 Exporting list members...');

    const members = new Map();
    let noNewItems = 0;

    while (members.size < CONFIG.exportMembers.maxMembers && noNewItems < 5 && !stopped) {
      const prevSize = members.size;
      const cells = document.querySelectorAll($userCell);

      cells.forEach(cell => {
        const nameEl = cell.querySelector($userName);
        const linkEl = cell.querySelector('a[href^="/"]');
        const username = linkEl?.href?.replace(/^.*x\.com\//, '').split('/')[0] || '';
        if (username && !members.has(username)) {
          members.set(username, {
            username,
            displayName: nameEl?.textContent?.split('@')[0]?.trim() || '',
            bio: extractBio(cell),
            isVerified: !!cell.querySelector('[data-testid="icon-verified"]'),
          });
        }
      });

      if (members.size === prevSize) noNewItems++;
      else noNewItems = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const data = [...members.values()];
    console.log(`📊 Found ${data.length} list members`);
    if (data.length === 0) return false;

    download(data, `xactions-list-members-${new Date().toISOString().slice(0, 10)}.json`);
    console.log('📥 List members exported as JSON');
    await copyJson(data);
    return true;
  };

  const runStep = async (label, fn) => {
    if (stopped) {
      results.push({ step: label, result: 'stopped' });
      return;
    }
    let ok = false;
    try {
      ok = await fn();
    } catch (e) {
      console.error(`❌ ${label} failed: ${e.message}`);
    }
    results.push({ step: label, result: CONFIG.dryRun && !label.startsWith('export') ? 'dry run (no change)' : (ok ? 'success' : 'not completed') });
  };

  const run = async () => {
    console.log('📋 LIST MANAGER - XActions by nichxbt\n');

    // Page guard: every section needs a lists page (your lists, or one list)
    if (!/\/lists/.test(window.location.pathname)) {
      console.warn('⚠️ You are not on a Lists page.');
      console.log('   Go to https://x.com/<your-handle>/lists (or open a list), then paste this script again.');
      return;
    }

    if (CONFIG.dryRun) {
      console.warn('⚠️ DRY RUN is ON. No changes will be made. Set CONFIG.dryRun = false to execute.');
    }
    console.log('   To abort mid-flow: window.stopListManager()\n');

    if (CONFIG.createList.enabled) await runStep('createList', createNewList);
    if (CONFIG.renameList.enabled) await runStep('renameList', renameList);
    if (CONFIG.deleteList.enabled) await runStep('deleteList', deleteList);
    if (CONFIG.addUsers.enabled) await runStep('addUsers', addUsersToList);
    if (CONFIG.exportLists.enabled) await runStep('exportLists', exportYourLists);
    if (CONFIG.exportMembers.enabled) await runStep('exportMembers', exportListMembers);

    if (results.length > 0) {
      console.log('\n🏁 SUMMARY');
      results.forEach(r => console.log(`   ${r.step.padEnd(14)} ${r.result}`));
    }
    console.log('\n✅ Done!');
  };

  run();
})();
