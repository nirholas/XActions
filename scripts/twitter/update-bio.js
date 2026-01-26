/**
 * ============================================================
 * ✏️ Update Profile Bio
 * ============================================================
 * 
 * @name        update-bio.js
 * @description Update your X/Twitter profile bio programmatically
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Go to your profile settings: https://x.com/settings/profile
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Set your NEW_BIO text below
 * 4. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Your new bio text (max 160 characters)
  newBio: `🚀 Building cool stuff with code
🐦 Automating X with @XActions
💡 Open source enthusiast
🔗 github.com/nirholas/XActions`,
  
  // Delay for UI interactions (ms)
  actionDelay: 1000,
  
  // Auto-save after updating
  autoSave: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function updateBio() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $bioTextarea = 'textarea[name="description"]';
  const $bioInput = '[data-testid="ocf-bio-input"]';
  const $saveButton = '[data-testid="Profile_Save_Button"]';
  const $editProfileBtn = '[data-testid="editProfileButton"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✏️ UPDATE PROFILE BIO                                     ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Validate bio length
  if (CONFIG.newBio.length > 160) {
    console.error('❌ ERROR: Bio exceeds 160 characters!');
    console.log(`   Current length: ${CONFIG.newBio.length} characters`);
    console.log('   Please shorten your bio.');
    return;
  }
  
  console.log(`📝 New bio (${CONFIG.newBio.length}/160 chars):`);
  console.log(`   "${CONFIG.newBio}"`);
  console.log('');
  
  // Check if we're on profile settings page
  const isSettingsPage = window.location.href.includes('/settings/profile');
  
  // Check if edit profile modal is open
  let bioField = document.querySelector($bioTextarea) || document.querySelector($bioInput);
  
  if (!bioField && !isSettingsPage) {
    // Try to click edit profile button
    const editBtn = document.querySelector($editProfileBtn);
    if (editBtn) {
      console.log('📍 Opening profile editor...');
      editBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      bioField = document.querySelector($bioTextarea) || document.querySelector($bioInput);
    }
  }
  
  if (!bioField) {
    console.error('❌ ERROR: Bio field not found!');
    console.log('');
    console.log('📋 Please try one of these:');
    console.log('   1. Go to: https://x.com/settings/profile');
    console.log('   2. Or click "Edit profile" on your profile page first');
    return;
  }
  
  // Clear and set new bio
  console.log('🔄 Updating bio...');
  
  // Focus the field
  bioField.focus();
  await sleep(300);
  
  // Select all and delete
  bioField.select ? bioField.select() : null;
  document.execCommand('selectAll', false, null);
  await sleep(100);
  
  // Clear current content
  bioField.value = '';
  bioField.textContent = '';
  bioField.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(300);
  
  // Type new bio
  bioField.value = CONFIG.newBio;
  bioField.textContent = CONFIG.newBio;
  bioField.dispatchEvent(new Event('input', { bubbles: true }));
  bioField.dispatchEvent(new Event('change', { bubbles: true }));
  
  await sleep(CONFIG.actionDelay);
  
  console.log('✅ Bio field updated!');
  
  // Auto-save if enabled
  if (CONFIG.autoSave) {
    const saveBtn = document.querySelector($saveButton);
    if (saveBtn) {
      console.log('💾 Saving profile...');
      saveBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 PROFILE BIO UPDATED SUCCESSFULLY!                      ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else {
      console.log('⚠️ Save button not found. Please save manually.');
    }
  } else {
    console.log('');
    console.log('💡 Bio field updated. Click "Save" to apply changes.');
  }
})();
