/**
 * ============================================================
 * 🖼️ Update Profile Picture
 * ============================================================
 * 
 * @name        update-profile-picture.js
 * @description Guide and helper for updating X/Twitter profile picture
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * ⚠️ NOTE: Due to browser security, file selection requires
 *    user interaction. This script helps automate the process.
 * ============================================================
 * 
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your profile page: https://x.com/YOUR_USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Follow the on-screen instructions
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Delay for UI interactions (ms)
  actionDelay: 1500,
  
  // Auto-open the file picker
  autoOpenPicker: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function updateProfilePicture() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $editProfileBtn = '[data-testid="editProfileButton"]';
  const $avatarImageInput = 'input[data-testid="fileInput"][accept*="image"]';
  const $addAvatarBtn = '[data-testid="addAvatarButton"]';
  const $avatarContainer = '[data-testid="UserAvatar-Container"]';
  const $saveButton = '[data-testid="Profile_Save_Button"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🖼️ UPDATE PROFILE PICTURE                                 ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Check if edit profile modal is open
  let avatarBtn = document.querySelector($addAvatarBtn);
  let fileInput = document.querySelector($avatarImageInput);
  
  if (!avatarBtn && !fileInput) {
    // Try to click edit profile button
    const editBtn = document.querySelector($editProfileBtn);
    if (editBtn) {
      console.log('📍 Opening profile editor...');
      editBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      avatarBtn = document.querySelector($addAvatarBtn);
      fileInput = document.querySelector($avatarImageInput);
    } else {
      console.error('❌ ERROR: Edit profile button not found!');
      console.log('');
      console.log('📋 Please go to your profile page:');
      console.log('   https://x.com/YOUR_USERNAME');
      return;
    }
  }
  
  console.log('📸 Profile editor opened!');
  console.log('');
  
  // Create helper functions
  window.XActions = window.XActions || {};
  window.XActions.ProfilePicture = {
    
    // Trigger file picker
    selectFile: () => {
      const input = document.querySelector($avatarImageInput);
      if (input) {
        input.click();
        console.log('📂 File picker opened. Select your new profile picture.');
      } else {
        // Click on avatar to trigger picker
        const avatarBtn = document.querySelector($addAvatarBtn);
        if (avatarBtn) {
          avatarBtn.click();
          console.log('📂 Clicked avatar button. Select your new profile picture.');
        } else {
          console.error('❌ Could not find file input or avatar button.');
        }
      }
    },
    
    // Save changes
    save: async () => {
      const saveBtn = document.querySelector($saveButton);
      if (saveBtn) {
        saveBtn.click();
        await sleep(CONFIG.actionDelay);
        console.log('✅ Profile saved!');
      } else {
        console.error('❌ Save button not found.');
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 AVAILABLE COMMANDS:');
      console.log('');
      console.log('   XActions.ProfilePicture.selectFile()');
      console.log('   → Opens file picker to select new profile picture');
      console.log('');
      console.log('   XActions.ProfilePicture.save()');
      console.log('   → Saves the profile changes');
      console.log('');
    }
  };
  
  console.log('✅ Profile Picture Helper loaded!');
  console.log('');
  console.log('📋 INSTRUCTIONS:');
  console.log('');
  console.log('   Step 1: Run XActions.ProfilePicture.selectFile()');
  console.log('   Step 2: Choose your image file');
  console.log('   Step 3: Crop/adjust the image');
  console.log('   Step 4: Run XActions.ProfilePicture.save()');
  console.log('');
  console.log('💡 Type XActions.ProfilePicture.help() for more info');
  console.log('');
  
  // Auto-open file picker if enabled
  if (CONFIG.autoOpenPicker) {
    await sleep(CONFIG.actionDelay);
    console.log('🔄 Auto-opening file picker...');
    
    const avatarBtn = document.querySelector($addAvatarBtn);
    const avatarContainer = document.querySelector($avatarContainer);
    
    if (avatarBtn) {
      avatarBtn.click();
      console.log('📂 Click on your avatar to select a new picture!');
    } else if (avatarContainer) {
      avatarContainer.click();
      console.log('📂 Click on your avatar area to select a new picture!');
    }
  }
})();
