// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/editProfile.js
// Browser console script to update X/Twitter profile fields
// Paste in DevTools console on x.com/settings/profile
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURE YOUR PROFILE UPDATES HERE
  // =============================================
  const UPDATES = {
    // Set to null to skip a field
    name: null,        // e.g., 'Your Name'
    bio: null,         // e.g., 'Building cool stuff 🚀'
    location: null,    // e.g., 'San Francisco, CA'
    website: null,     // e.g., 'https://example.com'
  };
  // =============================================

  const SELECTORS = {
    editButton: '[data-testid="editProfileButton"]',
    nameInput: 'input[name="displayName"]',
    bioTextarea: 'textarea[name="description"]',
    locationInput: 'input[name="location"]',
    websiteInput: 'input[name="url"]',
    saveButton: '[data-testid="Profile_Save_Button"]',
  };

  const setInputValue = async (selector, value) => {
    const el = document.querySelector(selector);
    if (!el || !value) return false;

    el.focus();
    el.select?.();
    
    // Use native input setter for React controlled inputs
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else {
      el.value = value;
    }
    
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const run = async () => {
    console.log('📝 XActions Profile Editor');
    console.log('========================');

    // Click edit profile if needed
    const editBtn = document.querySelector(SELECTORS.editButton);
    if (editBtn) {
      editBtn.click();
      await sleep(2000);
      console.log('✅ Opened edit profile dialog');
    }

    let updated = 0;

    if (UPDATES.name) {
      if (await setInputValue(SELECTORS.nameInput, UPDATES.name)) {
        console.log(`✅ Name → "${UPDATES.name}"`);
        updated++;
      }
      await sleep(500);
    }

    if (UPDATES.bio) {
      if (await setInputValue(SELECTORS.bioTextarea, UPDATES.bio)) {
        console.log(`✅ Bio → "${UPDATES.bio}"`);
        updated++;
      }
      await sleep(500);
    }

    if (UPDATES.location) {
      if (await setInputValue(SELECTORS.locationInput, UPDATES.location)) {
        console.log(`✅ Location → "${UPDATES.location}"`);
        updated++;
      }
      await sleep(500);
    }

    if (UPDATES.website) {
      if (await setInputValue(SELECTORS.websiteInput, UPDATES.website)) {
        console.log(`✅ Website → "${UPDATES.website}"`);
        updated++;
      }
      await sleep(500);
    }

    if (updated === 0) {
      console.log('ℹ️ No updates configured. Edit UPDATES object at top of script.');
      return;
    }

    // Save
    const saveBtn = document.querySelector(SELECTORS.saveButton);
    if (saveBtn) {
      saveBtn.click();
      await sleep(2000);
      console.log(`\n🎉 Profile updated! (${updated} field${updated > 1 ? 's' : ''})`);
    } else {
      console.log('⚠️ Save button not found — changes may not be saved');
    }
  };

  run();
})();
