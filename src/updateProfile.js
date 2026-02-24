// Update Profile on X - by nichxbt
// https://github.com/nirholas/xactions
// Programmatically update your bio, display name, location, website
// 1. Go to your profile page on x.com
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Set to null to skip updating a field
    displayName: null,    // 'Your Name' (max 50 chars)
    bio: null,            // 'Your bio text' (max 160 chars)
    location: null,       // 'San Francisco, CA'
    website: null,        // 'https://yoursite.com'
    autoSave: true,
  };

  const $editProfileBtn = '[data-testid="editProfileButton"]';
  const $nameInput = 'input[name="displayName"]';
  const $bioTextarea = 'textarea[name="description"]';
  const $locationInput = 'input[name="location"]';
  const $websiteInput = 'input[name="url"]';
  const $saveButton = '[data-testid="Profile_Save_Button"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const setInputValue = async (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) {
      console.warn(`⚠️ Field not found: ${selector}`);
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

    return true;
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

    if (updates.length === 0) {
      console.log('❌ Nothing to update! Set values in CONFIG.');
      return;
    }

    console.log('📋 Updates to apply:');
    updates.forEach(u => console.log(`   • ${u}`));
    console.log('');

    // Open edit profile dialog
    const editBtn = document.querySelector($editProfileBtn);
    if (editBtn) {
      console.log('📍 Opening profile editor...');
      editBtn.click();
      await sleep(2000);
    } else {
      // Try navigating to settings
      if (!window.location.href.includes('/settings/profile')) {
        console.error('❌ Cannot find Edit Profile button. Navigate to your profile page or x.com/settings/profile');
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

    // Save
    if (CONFIG.autoSave) {
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
