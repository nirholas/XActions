// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🗂️ List Manager - XActions
 * ============================================
 *
 * @name         list-manager
 * @description  Create, rename, or delete one of your Twitter Lists through the Lists UI.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to your Lists page: https://x.com/<your-handle>/lists
 *      (rename and delete both need this page so the target list is on screen)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Edit the CONFIG block: set action, name, and (for rename) newName
 *   4. Set CONFIG.dryRun to false when you are ready to actually make the change
 *   5. Paste this entire script and press Enter
 *
 * Example:
 *   Create a new list:
 *     action: 'create', name: 'Solana builders', description: 'People shipping on Solana'
 *   Rename it later:
 *     action: 'rename', name: 'Solana builders', newName: 'Solana devs'
 *   Delete it:
 *     action: 'delete', name: 'Solana devs'
 *   Keep dryRun: true first to preview the steps, then set dryRun: false to run.
 *   To abort mid-flow, run window.stopListManager() in the console.
 *
 * ============================================
 */

(async function listManager() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // What to do: 'create' | 'rename' | 'delete'
    action: 'create',

    // For 'create': the new list name. For 'rename'/'delete': the EXISTING list name to target.
    name: 'My New List',

    // For 'rename' only: the name to change it to
    newName: '',

    // For 'create' only: optional description and privacy
    description: 'Created with XActions',
    isPrivate: false,

    // Safety: preview the steps without changing anything. Set to false to execute.
    dryRun: true,

    // Delay between UI steps (ms)
    stepDelay: 1500
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    createButton: '[data-testid="createList"], a[href="/i/lists/create"]',
    nameInput: '[data-testid="listNameInput"], input[name="name"]',
    descInput: '[data-testid="listDescriptionInput"], textarea[name="description"]',
    saveButton: '[data-testid="listSaveButton"], [data-testid="listCreationSheet-headerButton"]',
    listLink: 'a[href*="/lists/"]',
    editButton: '[data-testid="editList"], [aria-label="Edit List"], [aria-label="Edit list"]',
    deleteButton: '[data-testid="listDeleteButton"]',
    confirm: '[data-testid="confirmationSheetConfirm"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    step: (msg) => console.log(`   → ${msg}`)
  };

  let stopped = false;
  window.stopListManager = () => {
    stopped = true;
    log.warning('Stop requested. The script will halt at the next step.');
  };

  const qs = (sel) => document.querySelector(sel);

  // Wait for an element to appear (up to timeoutMs)
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
    for (const link of document.querySelectorAll(SELECTORS.listLink)) {
      const text = (link.textContent || '').trim().toLowerCase();
      if (text.includes(target)) return link;
    }
    return null;
  };

  // ============================================
  // 🎯 ACTIONS
  // ============================================
  const doCreate = async () => {
    log.info(`Create list: "${CONFIG.name}" (${CONFIG.isPrivate ? 'private' : 'public'})`);
    if (!CONFIG.name.trim()) { log.error('CONFIG.name is empty. Set a name to create.'); return false; }

    if (CONFIG.dryRun) {
      log.step('DRY RUN: would open the create-list dialog');
      log.step(`DRY RUN: would type name "${CONFIG.name}" and description "${CONFIG.description}"`);
      log.step('DRY RUN: would save. Set CONFIG.dryRun = false to execute.');
      return true;
    }

    const createBtn = await waitFor(SELECTORS.createButton, 4000);
    if (!createBtn) { log.error('Could not find the "Create a new List" button. Are you on x.com/<you>/lists?'); return false; }
    createBtn.click();
    await sleep(CONFIG.stepDelay);

    const nameInput = await waitFor(SELECTORS.nameInput);
    if (!nameInput) { log.error('List name input did not appear.'); return false; }
    nameInput.focus();
    setReactInput(nameInput, CONFIG.name);
    await sleep(500);

    if (CONFIG.description) {
      const descInput = qs(SELECTORS.descInput);
      if (descInput) {
        descInput.focus();
        setReactInput(descInput, CONFIG.description);
        await sleep(500);
      }
    }

    // First "Next" advances past the details step in the current flow
    let next = findButtonByText(['next']);
    if (next && !next.getAttribute('aria-disabled')) {
      next.click();
      await sleep(CONFIG.stepDelay);
    }

    const saveBtn = qs(SELECTORS.saveButton) || findButtonByText(['done', 'create', 'save']);
    if (!saveBtn) { log.error('Could not find the save/create button.'); return false; }
    saveBtn.click();
    await sleep(CONFIG.stepDelay);
    log.success(`List "${CONFIG.name}" created.`);
    return true;
  };

  const openTargetList = async () => {
    const link = findListLinkByName(CONFIG.name);
    if (!link) {
      log.error(`Could not find a list named "${CONFIG.name}" on this page.`);
      log.info('Make sure you are on x.com/<you>/lists and the list name matches.');
      return false;
    }
    log.step(`Opening list "${CONFIG.name}"`);
    link.click();
    await sleep(CONFIG.stepDelay);
    return true;
  };

  const doRename = async () => {
    log.info(`Rename list: "${CONFIG.name}" -> "${CONFIG.newName}"`);
    if (!CONFIG.newName.trim()) { log.error('CONFIG.newName is empty. Set the new name.'); return false; }

    if (CONFIG.dryRun) {
      log.step(`DRY RUN: would open "${CONFIG.name}", edit it, set name to "${CONFIG.newName}", and save.`);
      log.step('Set CONFIG.dryRun = false to execute.');
      return true;
    }

    if (!await openTargetList()) return false;

    const editBtn = await waitFor(SELECTORS.editButton, 5000) || findButtonByText(['edit list']);
    if (!editBtn) { log.error('Could not find the "Edit List" control.'); return false; }
    editBtn.click();
    await sleep(CONFIG.stepDelay);

    const nameInput = await waitFor(SELECTORS.nameInput);
    if (!nameInput) { log.error('List name input did not appear in the edit dialog.'); return false; }
    nameInput.focus();
    setReactInput(nameInput, CONFIG.newName);
    await sleep(500);

    const saveBtn = qs(SELECTORS.saveButton) || findButtonByText(['done', 'save']);
    if (!saveBtn) { log.error('Could not find the save button.'); return false; }
    saveBtn.click();
    await sleep(CONFIG.stepDelay);
    log.success(`List renamed to "${CONFIG.newName}".`);
    return true;
  };

  const doDelete = async () => {
    log.info(`Delete list: "${CONFIG.name}"`);

    if (CONFIG.dryRun) {
      log.step(`DRY RUN: would open "${CONFIG.name}", edit it, click Delete, and confirm.`);
      log.step('Set CONFIG.dryRun = false to execute. This cannot be undone.');
      return true;
    }

    if (!await openTargetList()) return false;

    const editBtn = await waitFor(SELECTORS.editButton, 5000) || findButtonByText(['edit list']);
    if (!editBtn) { log.error('Could not find the "Edit List" control.'); return false; }
    editBtn.click();
    await sleep(CONFIG.stepDelay);

    const deleteBtn = await waitFor(SELECTORS.deleteButton, 4000) || findButtonByText(['delete list']);
    if (!deleteBtn) { log.error('Could not find the "Delete List" button.'); return false; }
    deleteBtn.click();
    await sleep(CONFIG.stepDelay);

    const confirm = await waitFor(SELECTORS.confirm, 4000) || findButtonByText(['delete']);
    if (!confirm) { log.error('Could not find the delete confirmation button.'); return false; }
    confirm.click();
    await sleep(CONFIG.stepDelay);
    log.success(`List "${CONFIG.name}" deleted.`);
    return true;
  };

  // ============================================
  // 🚀 RUN
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🗂️ LIST MANAGER - XActions                              ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn (do not hard-redirect) if not on a lists page
  if (!/\/lists/.test(window.location.pathname) && !/\/i\/lists/.test(window.location.pathname)) {
    log.warning('You are not on your Lists page.');
    log.info('Go to https://x.com/<your-handle>/lists, then paste this script again.');
    return;
  }

  if (CONFIG.dryRun) {
    log.warning('DRY RUN is ON. No changes will be made. Set CONFIG.dryRun = false to execute.');
  }
  log.info('To abort mid-flow: window.stopListManager()');
  console.log('');

  let ok = false;
  try {
    if (CONFIG.action === 'create') ok = await doCreate();
    else if (CONFIG.action === 'rename') ok = await doRename();
    else if (CONFIG.action === 'delete') ok = await doDelete();
    else log.error(`Unknown action "${CONFIG.action}". Use 'create', 'rename', or 'delete'.`);
  } catch (e) {
    log.error(`Action failed: ${e.message}`);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🏁 LIST MANAGER - DONE                                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`   Action:  ${CONFIG.action}`);
  console.log(`   Target:  ${CONFIG.name}`);
  console.log(`   Result:  ${CONFIG.dryRun ? 'dry run (no change)' : (ok ? 'success' : 'not completed')}`);
  console.log('✅ Script completed! by nichxbt');

  return { action: CONFIG.action, dryRun: CONFIG.dryRun, success: ok };
})();
