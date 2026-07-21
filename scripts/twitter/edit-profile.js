// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 📝 Edit Profile - XActions
 * ============================================
 *
 * @name         edit-profile
 * @description  Update your X profile fields (name, bio, location, website, birthdate) in one go.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/settings/profile
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Edit the CONFIG below. Leave a field as null to leave it untouched.
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Set name: "Ada Lovelace", bio: "Building on Solana. gm.", location: "London",
 *   website: "https://xactions.app", birthdate: null. Running it opens the Edit
 *   profile dialog, fills only those four fields, leaves your birthdate alone, and
 *   clicks Save. Only the fields you set are changed.
 *
 * ============================================
 */

(async function editProfile() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Display name (max 50 chars). null = leave unchanged.
    name: null,

    // Bio / description (max 160 chars). null = leave unchanged.
    bio: null,

    // Location string. null = leave unchanged. '' = clear the field.
    location: null,

    // Website URL. null = leave unchanged. '' = clear the field.
    website: null,

    // Birthdate as { month: 'March', day: 14, year: 1990 }. null = leave unchanged.
    // month accepts a full month name ('March') or number (3). Any subset of
    // month/day/year you provide will be set; omitted parts are left as-is.
    birthdate: null,

    // Click Save automatically after filling. If false, fields are filled and
    // you click Save yourself.
    autoSave: true,

    // Delay for UI interactions (ms).
    actionDelay: 700
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    editButton: '[data-testid="editProfileButton"]',
    // X has shipped several testids/name attrs over time; try each in order.
    nameInput: [
      '[data-testid="displayNameInput"]',
      'input[name="displayName"]',
      'input[name="name"]'
    ],
    bioInput: [
      '[data-testid="bioTextarea"]',
      '[data-testid="descriptionInput"]',
      '[data-testid="ocf-bio-input"]',
      'textarea[name="description"]'
    ],
    locationInput: [
      '[data-testid="locationInput"]',
      'input[name="location"]'
    ],
    websiteInput: [
      '[data-testid="urlInput"]',
      'input[name="url"]'
    ],
    saveButton: '[data-testid="Profile_Save_Button"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  // Resolve the first matching element from an array of selectors (or a single string).
  const findFirst = (selectors) => {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  // Set an input/textarea value through the native setter so React's value
  // tracker registers the change (a plain .value assignment is ignored by
  // React and the old value would be saved).
  const setNativeValue = (el, value) => {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // Fill one text field. Returns 'set' | 'notfound'.
  const fillField = async (label, selectors, value) => {
    const el = findFirst(selectors);
    if (!el) {
      log.warning(`${label} field not found on the page. Skipped.`);
      return 'notfound';
    }
    el.focus();
    await sleep(150);
    setNativeValue(el, '');
    await sleep(120);
    setNativeValue(el, value);
    await sleep(CONFIG.actionDelay);
    const preview = value.length > 60 ? value.slice(0, 60) + '…' : value;
    log.success(`${label} → "${preview}"`);
    return 'set';
  };

  // Set a native <select> to the option whose text or value matches `wanted`.
  const setSelectByText = (selectEl, wanted) => {
    const target = String(wanted).trim().toLowerCase();
    for (const opt of selectEl.options) {
      const txt = opt.textContent.trim().toLowerCase();
      const val = String(opt.value).trim().toLowerCase();
      if (txt === target || val === target) {
        setNativeValue(selectEl, opt.value);
        return true;
      }
    }
    // Numeric fallback (e.g. month '3' matching option value/text '3').
    for (const opt of selectEl.options) {
      if (parseInt(opt.value, 10) === parseInt(wanted, 10) && !Number.isNaN(parseInt(wanted, 10))) {
        setNativeValue(selectEl, opt.value);
        return true;
      }
    }
    return false;
  };

  // Locate the three birthdate <select>s by their option content.
  const findBirthdateSelects = () => {
    const selects = Array.from(document.querySelectorAll('select'));
    const out = { month: null, day: null, year: null };
    for (const sel of selects) {
      const texts = Array.from(sel.options).map(o => o.textContent.trim().toLowerCase());
      const joined = texts.join(' ');
      if (!out.month && (joined.includes('january') || joined.includes('month'))) out.month = sel;
      else if (!out.year && texts.some(t => /^(19|20)\d\d$/.test(t))) out.year = sel;
      else if (!out.day && texts.some(t => /^\d{1,2}$/.test(t)) && sel.options.length <= 40) out.day = sel;
    }
    return out;
  };

  const setBirthdate = async (bd) => {
    const sel = findBirthdateSelects();
    let anyField = false;
    if (bd.month != null && sel.month) {
      if (setSelectByText(sel.month, bd.month)) { log.success(`Birth month → ${bd.month}`); anyField = true; }
      else log.warning(`Birth month "${bd.month}" not found in the dropdown.`);
      await sleep(CONFIG.actionDelay);
    }
    if (bd.day != null && sel.day) {
      if (setSelectByText(sel.day, bd.day)) { log.success(`Birth day → ${bd.day}`); anyField = true; }
      else log.warning(`Birth day "${bd.day}" not found in the dropdown.`);
      await sleep(CONFIG.actionDelay);
    }
    if (bd.year != null && sel.year) {
      if (setSelectByText(sel.year, bd.year)) { log.success(`Birth year → ${bd.year}`); anyField = true; }
      else log.warning(`Birth year "${bd.year}" not found in the dropdown.`);
      await sleep(CONFIG.actionDelay);
    }
    if (!sel.month && !sel.day && !sel.year) {
      log.warning('Birthdate dropdowns not found. If your profile has no birthdate yet, add one manually once, then this tool can update it.');
      return 'notfound';
    }
    return anyField ? 'set' : 'notfound';
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = { set: 0, notFound: 0, errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📝 EDIT PROFILE - XActions                              ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn, do not hard-redirect (a redirect would kill this script).
  const onProfileSettings = /\/settings\/profile/.test(window.location.pathname);
  const onOwnProfile = !!document.querySelector(SELECTORS.editButton);
  if (!onProfileSettings && !onOwnProfile) {
    log.warning('Go to x.com/settings/profile (or open your own profile so the "Edit profile" button is visible), then run this again.');
    return stats;
  }

  // Validate lengths before touching anything.
  if (CONFIG.name != null && CONFIG.name.length > 50) {
    log.error(`Display name is ${CONFIG.name.length} chars (max 50). Shorten it and re-run.`);
    return stats;
  }
  if (CONFIG.bio != null && CONFIG.bio.length > 160) {
    log.error(`Bio is ${CONFIG.bio.length} chars (max 160). Shorten it and re-run.`);
    return stats;
  }

  const requested = [];
  if (CONFIG.name != null) requested.push('name');
  if (CONFIG.bio != null) requested.push('bio');
  if (CONFIG.location != null) requested.push('location');
  if (CONFIG.website != null) requested.push('website');
  if (CONFIG.birthdate != null) requested.push('birthdate');

  if (requested.length === 0) {
    log.warning('Nothing to change. Set at least one field (name, bio, location, website, birthdate) in CONFIG.');
    return stats;
  }
  log.info(`Fields to update: ${requested.join(', ')}`);

  // Open the Edit profile dialog if the form is not already mounted.
  const formPresent = () => findFirst(SELECTORS.nameInput) || findFirst(SELECTORS.bioInput);
  if (!formPresent()) {
    const editBtn = document.querySelector(SELECTORS.editButton);
    if (editBtn) {
      log.info('Opening the Edit profile dialog...');
      editBtn.click();
    }
    // The dialog / settings form may still be mounting on first paint.
    let waited = 0;
    while (!formPresent() && waited < 6) {
      await sleep(CONFIG.actionDelay);
      waited++;
    }
  }
  if (!formPresent()) {
    log.error('Could not find the profile form. Make sure you are on x.com/settings/profile or that the Edit profile dialog opened.');
    return stats;
  }

  const tally = (result) => {
    if (result === 'set') stats.set++;
    else if (result === 'notfound') stats.notFound++;
  };

  try {
    if (CONFIG.name != null) tally(await fillField('Name', SELECTORS.nameInput, CONFIG.name));
    if (CONFIG.bio != null) tally(await fillField('Bio', SELECTORS.bioInput, CONFIG.bio));
    if (CONFIG.location != null) tally(await fillField('Location', SELECTORS.locationInput, CONFIG.location));
    if (CONFIG.website != null) tally(await fillField('Website', SELECTORS.websiteInput, CONFIG.website));
    if (CONFIG.birthdate != null) tally(await setBirthdate(CONFIG.birthdate));
  } catch (error) {
    log.error(`Error while filling fields: ${error.message}`);
    stats.errors++;
  }

  if (stats.set === 0) {
    log.warning('No fields were actually changed (none of the requested fields were found). Nothing to save.');
  } else if (CONFIG.autoSave) {
    const saveBtn = document.querySelector(SELECTORS.saveButton);
    if (saveBtn) {
      log.info('Saving profile...');
      saveBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      log.success('Save clicked.');
    } else {
      log.warning('Save button not found. Click "Save" in the dialog to apply your changes.');
    }
  } else {
    log.info('autoSave is off. Click "Save" in the dialog to apply your changes.');
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 EDIT PROFILE - COMPLETE                              ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Fields updated:    ${String(stats.set).padEnd(32)}║
║  ⚠️  Fields not found:  ${String(stats.notFound).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  return stats;
})();
