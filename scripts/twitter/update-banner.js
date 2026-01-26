/**
 * ============================================================
 * 🏞️ Update Banner Image
 * ============================================================
 * 
 * @name        update-banner.js
 * @description Guide and helper for updating X/Twitter profile banner
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
  
  // Auto-open the edit profile modal
  autoOpenEditor: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function updateBanner() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $editProfileBtn = '[data-testid="editProfileButton"]';
  const $addBannerBtn = '[data-testid="addBannerButton"]';
  const $bannerImageInput = 'input[data-testid="fileInput"]';
  const $saveButton = '[data-testid="Profile_Save_Button"]';
  const $cancelBtn = '[data-testid="cancelButton"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🏞️ UPDATE BANNER IMAGE                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Check if edit profile modal is open
  let bannerBtn = document.querySelector($addBannerBtn);
  
  if (!bannerBtn) {
    // Try to click edit profile button
    const editBtn = document.querySelector($editProfileBtn);
    if (editBtn) {
      console.log('📍 Opening profile editor...');
      editBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      bannerBtn = document.querySelector($addBannerBtn);
    } else {
      console.error('❌ ERROR: Edit profile button not found!');
      console.log('');
      console.log('📋 Please go to your profile page:');
      console.log('   https://x.com/YOUR_USERNAME');
      return;
    }
  }
  
  console.log('🖼️ Profile editor opened!');
  console.log('');
  
  // Create helper functions
  window.XActions = window.XActions || {};
  window.XActions.Banner = {
    
    // Click the banner area to trigger file selection
    selectFile: () => {
      const bannerBtn = document.querySelector($addBannerBtn);
      if (bannerBtn) {
        bannerBtn.click();
        console.log('📂 File picker should open. Select your banner image.');
        console.log('');
        console.log('💡 Recommended size: 1500 x 500 pixels (3:1 ratio)');
      } else {
        console.error('❌ Banner button not found. Make sure the profile editor is open.');
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
    
    // Cancel changes
    cancel: () => {
      const cancelBtn = document.querySelector($cancelBtn);
      if (cancelBtn) {
        cancelBtn.click();
        console.log('❌ Changes cancelled.');
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 AVAILABLE COMMANDS:');
      console.log('');
      console.log('   XActions.Banner.selectFile()');
      console.log('   → Opens file picker to select new banner');
      console.log('');
      console.log('   XActions.Banner.save()');
      console.log('   → Saves the profile changes');
      console.log('');
      console.log('   XActions.Banner.cancel()');
      console.log('   → Cancels changes and closes editor');
      console.log('');
      console.log('📐 BANNER DIMENSIONS:');
      console.log('   Recommended: 1500 x 500 pixels (3:1 ratio)');
      console.log('   Minimum: 600 x 200 pixels');
      console.log('   Max file size: 2 MB');
      console.log('');
    }
  };
  
  console.log('✅ Banner Helper loaded!');
  console.log('');
  console.log('📋 INSTRUCTIONS:');
  console.log('');
  console.log('   Step 1: Run XActions.Banner.selectFile()');
  console.log('           Or click on the banner area directly');
  console.log('   Step 2: Choose your image file (1500x500 recommended)');
  console.log('   Step 3: Adjust the crop if needed');
  console.log('   Step 4: Click Apply, then run XActions.Banner.save()');
  console.log('');
  console.log('💡 Type XActions.Banner.help() for more info');
  console.log('');
  
  // Auto-click banner area if enabled
  if (CONFIG.autoOpenEditor && bannerBtn) {
    console.log('👆 Click on the banner area at the top to change it.');
  }
})();
