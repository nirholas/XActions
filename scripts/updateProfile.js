// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/updateProfile.js
// Browser console script for updating your X/Twitter profile fields
// Paste in DevTools console on x.com/YOUR_USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    displayName: '',          // New display name (max 50 chars, '' to skip)
    bio: '',                  // New bio (max 160 chars, '' to skip)
    location: '',             // New location ('' to skip)
    website: '',              // New website URL ('' to skip)
    autoSave: true,           // Auto-click Save after updating
    dryRun: true,             // SET FALSE TO EXECUTE — preview changes only
  };
  // =============================================

  const setInputValue = async (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) {
      console.warn(`⚠️ Field not found: ${selector}`);
      return false;
    }
    el.focus();
    el.select?.();
    await sleep(100);
    document.execCommand('selectAll');
    document.execCommand('delete');
    await sleep(100);
    document.execCommand('insertText', false, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(200);
    return true;
  };

  const run = async () => {
    console.log('✏️ UPDATE PROFILE — XActions by nichxbt');
    console.log('━'.repeat(45));

    // Validate lengths
    if (CONFIG.displayName && CONFIG.displayName.length > 50) {
      console.error(`❌ Display name too long: ${CONFIG.displayName.length}/50 chars`);
      return;
    }
    if (CONFIG.bio && CONFIG.bio.length > 160) {
      console.error(`❌ Bio too long: ${CONFIG.bio.length}/160 chars`);
      return;
    }

    // Collect updates
    const updates = [];
    if (CONFIG.displayName) updates.push({ field: 'Name', value: CONFIG.displayName });
    if (CONFIG.bio) updates.push({ field: 'Bio', value: CONFIG.bio.substring(0, 40) + (CONFIG.bio.length > 40 ? '...' : '') });
    if (CONFIG.location) updates.push({ field: 'Location', value: CONFIG.location });
    if (CONFIG.website) updates.push({ field: 'Website', value: CONFIG.website });

    if (updates.length === 0) {
      console.log('❌ Nothing to update! Set values in CONFIG.');
      return;
    }

    console.log('\n📋 Updates to apply:');
    updates.forEach(u => console.log(`   • ${u.field}: "${u.value}"`));

    if (CONFIG.dryRun) {
      console.log('\n🔒 DRY RUN — no changes made. Set CONFIG.dryRun = false to execute.');
      return;
    }

    // Open edit profile dialog
    const editBtn = document.querySelector('[data-testid="editProfileButton"]');
    if (editBtn) {
      console.log('\n📍 Opening profile editor...');
      editBtn.click();
      await sleep(2000);
    } else if (!window.location.href.includes('/settings/profile')) {
      console.error('❌ Edit Profile button not found. Navigate to your profile page.');
      return;
    }

    // Apply updates
    if (CONFIG.displayName) {
      const ok = await setInputValue('input[name="displayName"]', CONFIG.displayName);
      if (ok) console.log('✅ Display name updated');
    }

    if (CONFIG.bio) {
      const ok = await setInputValue('textarea[name="description"]', CONFIG.bio);
      if (ok) console.log(`✅ Bio updated (${CONFIG.bio.length}/160 chars)`);
    }

    if (CONFIG.location) {
      const ok = await setInputValue('input[name="location"]', CONFIG.location);
      if (ok) console.log('✅ Location updated');
    }

    if (CONFIG.website) {
      const ok = await setInputValue('input[name="url"]', CONFIG.website);
      if (ok) console.log('✅ Website updated');
    }

    // Save
    if (CONFIG.autoSave) {
      await sleep(500);
      const saveBtn = document.querySelector('[data-testid="Profile_Save_Button"]');
      if (saveBtn) {
        saveBtn.click();
        console.log('\n💾 Profile saved!');
      } else {
        console.log('\n⚠️ Save button not found. Click "Save" manually.');
      }
    } else {
      console.log('\n💡 Auto-save is off. Click "Save" to apply changes.');
    }

    console.log('');
  };

  run();
})();
