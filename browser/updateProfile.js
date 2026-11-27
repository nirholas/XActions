// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        updateProfile.js
 * @title       Update Profile
 * @description Update your display name, bio, location, website and birthdate in the Edit profile form, dry run by default.
 * @category    profile
 * @page        x.com/<you> or x.com/settings/profile
 * @writes      true
 * @aliases     scripts/editProfile.js, scripts/updateProfile.js, scripts/twitter/edit-profile.js, scripts/twitter/update-bio.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Update Profile on X - by nichxbt
// https://github.com/nirholas/xactions
// Programmatically update your bio, display name, location, website, birthdate
// 1. Go to your profile page on x.com (or x.com/settings/profile)
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below
// 4. Paste browser/updateProfile.js into the Developer Console and run it
//    It starts as a dry run that only lists the changes: set
//    CONFIG.dryRun = false to apply them.
//
// Last Updated: 27 November 2026
(() => {
  const CONFIG = {
    // Set to null to skip updating a field ('' clears it)
    displayName: null,    // 'Your Name' (max 50 chars)
    bio: null,            // 'Your bio text' (max 160 chars)
    location: null,       // 'San Francisco, CA'
    website: null,        // 'https://yoursite.com'
    // Birthdate as { month: 'March', day: 14, year: 1990 }. null = leave unchanged.
    // month accepts a full month name ('March') or number (3). Any subset of
    // month/day/year you provide will be set; omitted parts are left as-is.
    birthdate: null,
    autoSave: true,
    dryRun: true,         // true = only list the changes. false = fill the form (and save if autoSave)
    actionDelay: 700,     // Delay for UI interactions (ms)
  };

  const $editProfileBtn = '[data-testid="editProfileButton"]';
  // X has shipped several testids/name attrs over time; try each in order.
  const $nameInput = ['input[name="displayName"]', '[data-testid="displayNameInput"]', 'input[name="name"]'];
  const $bioTextarea = ['textarea[name="description"]', '[data-testid="bioTextarea"]', '[data-testid="descriptionInput"]', '[data-testid="ocf-bio-input"]'];
  const $locationInput = ['input[name="location"]', '[data-testid="locationInput"]'];
  const $websiteInput = ['input[name="url"]', '[data-testid="urlInput"]'];
  const $saveButton = '[data-testid="Profile_Save_Button"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Resolve the first matching element from an array of selectors (or a single string).
  const findFirst = (selectors) => {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  // Set an input/textarea/select value through the native setter so React's
  // value tracker registers the change.
  const setNativeValue = (el, value) => {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const stats = { set: 0, notFound: 0 };

  const setInputValue = async (selector, value) => {
    const el = findFirst(selector);
    if (!el) {
      console.warn(`⚠️ Field not found: ${Array.isArray(selector) ? selector[0] : selector}`);
      stats.notFound++;
      return false;
    }

    el.focus();
    el.select?.();
    await sleep(100);

    // Clear existing value
    document.execCommand('selectAll');
    document.execCommand('delete');
    await sleep(100);

    // Type new value
    document.execCommand('insertText', false, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(200);

    // execCommand is ignored in some contexts: fall back to the native setter.
    if (el.value !== value) {
      setNativeValue(el, '');
      await sleep(120);
      setNativeValue(el, value);
      await sleep(200);
    }

    stats.set++;
    return true;
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
    const out = { month: null, day: null, year: null };
    for (const sel of document.querySelectorAll('select')) {
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
    if (!sel.month && !sel.day && !sel.year) {
      console.warn('⚠️ Birthdate dropdowns not found. If your profile has no birthdate yet, add one manually once, then this tool can update it.');
      stats.notFound++;
      return false;
    }
    let anyField = false;
    for (const part of ['month', 'day', 'year']) {
      if (bd[part] == null || !sel[part]) continue;
      if (setSelectByText(sel[part], bd[part])) {
        console.log(`✅ Birth ${part} updated (${bd[part]})`);
        anyField = true;
      } else {
        console.warn(`⚠️ Birth ${part} "${bd[part]}" not found in the dropdown.`);
      }
      await sleep(CONFIG.actionDelay);
    }
    if (anyField) stats.set++;
    else stats.notFound++;
    return anyField;
  };

  const run = async () => {
    console.log('✏️ UPDATE PROFILE - XActions by nichxbt');

    // Validate
    if (CONFIG.bio && CONFIG.bio.length > 160) {
      console.error(`❌ Bio too long: ${CONFIG.bio.length}/160 chars`);
      return;
    }
    if (CONFIG.displayName && CONFIG.displayName.length > 50) {
      console.error(`❌ Name too long: ${CONFIG.displayName.length}/50 chars`);
      return;
    }

    const updates = [];
    if (CONFIG.displayName !== null) updates.push(`Name: "${CONFIG.displayName}"`);
    if (CONFIG.bio !== null) updates.push(`Bio: "${CONFIG.bio.substring(0, 40)}..."`);
    if (CONFIG.location !== null) updates.push(`Location: "${CONFIG.location}"`);
    if (CONFIG.website !== null) updates.push(`Website: "${CONFIG.website}"`);
    if (CONFIG.birthdate !== null) updates.push(`Birthdate: ${['month', 'day', 'year'].filter(k => CONFIG.birthdate[k] != null).map(k => `${k} ${CONFIG.birthdate[k]}`).join(', ')}`);

    if (updates.length === 0) {
      console.log('❌ Nothing to update! Set values in CONFIG.');
      return;
    }

    console.log('📋 Updates to apply:');
    updates.forEach(u => console.log(`   • ${u}`));
    console.log('');

    if (CONFIG.dryRun) {
      console.log('🔒 DRY RUN: no changes made. Set CONFIG.dryRun = false to execute.');
      return;
    }

    // Open edit profile dialog (unless the form is already mounted)
    const formPresent = () => findFirst($nameInput) || findFirst($bioTextarea);
    if (!formPresent()) {
      const editBtn = document.querySelector($editProfileBtn);
      if (editBtn) {
        console.log('📍 Opening profile editor...');
        editBtn.click();
        await sleep(2000);
      } else if (!window.location.href.includes('/settings/profile')) {
        // Try navigating to settings
        console.error('❌ Cannot find Edit Profile button. Navigate to your profile page or x.com/settings/profile');
        return;
      }
      // The dialog / settings form may still be mounting on first paint.
      for (let waited = 0; !formPresent() && waited < 6; waited++) {
        await sleep(CONFIG.actionDelay);
      }
      if (!formPresent()) {
        console.error('❌ Could not find the profile form. Make sure you are on x.com/settings/profile or that the Edit profile dialog opened.');
        return;
      }
    }

    // Apply updates
    if (CONFIG.displayName !== null) {
      const ok = await setInputValue($nameInput, CONFIG.displayName);
      if (ok) console.log(`✅ Display name updated`);
    }

    if (CONFIG.bio !== null) {
      const ok = await setInputValue($bioTextarea, CONFIG.bio);
      if (ok) console.log(`✅ Bio updated (${CONFIG.bio.length}/160 chars)`);
    }

    if (CONFIG.location !== null) {
      const ok = await setInputValue($locationInput, CONFIG.location);
      if (ok) console.log(`✅ Location updated`);
    }

    if (CONFIG.website !== null) {
      const ok = await setInputValue($websiteInput, CONFIG.website);
      if (ok) console.log(`✅ Website updated`);
    }

    if (CONFIG.birthdate !== null) {
      await setBirthdate(CONFIG.birthdate);
    }

    console.log(`\n📊 Fields updated: ${stats.set} | Not found: ${stats.notFound}`);

    // Save
    if (stats.set === 0) {
      console.log('\n⚠️ No fields were actually changed (none of the requested fields were found). Nothing to save.');
    } else if (CONFIG.autoSave) {
      await sleep(500);
      const saveBtn = document.querySelector($saveButton);
      if (saveBtn) {
        saveBtn.click();
        console.log('\n💾 Profile saved!');
      } else {
        console.log('\n⚠️ Save button not found. Please save manually.');
      }
    } else {
      console.log('\n💡 Auto-save is off. Click "Save" to apply changes.');
    }
  };

  run();
})();
