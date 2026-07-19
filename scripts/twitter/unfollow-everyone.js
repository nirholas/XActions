// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * ============================================================
 * 🚫 Unfollow Everyone
 * ============================================================
 * 
 * @name        unfollow-everyone.js
 * @description Mass unfollow ALL accounts you follow on X/Twitter
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * ⚠️ WARNING: This will unfollow EVERYONE you follow!
 * ============================================================
 * 
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your Following page: https://x.com/YOUR_USERNAME/following
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Paste this ENTIRE script and press Enter
 * 5. Watch the console for progress
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Maximum retry attempts when no buttons found
  // 💡 Increase if you have many accounts (takes longer to scroll)
  maxRetries: 5,
  
  // Delay between unfollows (milliseconds)
  // 💡 Increase to 3000-5000 if getting rate limited
  unfollowDelay: 1500,
  
  // Delay after clicking confirm button
  confirmDelay: 1000,
  
  // Delay for scrolling to load more
  scrollDelay: 2000,
  
  // Stop after unfollowing this many (0 = unlimited)
  // 💡 Set to 50-100 for testing first
  maxUnfollows: 0,
  
  // Show confirmation prompt before starting
  confirmStart: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function unfollowEveryone() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚫 UNFOLLOW EVERYONE                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on the right page
  if (!window.location.href.includes('/following')) {
    console.error('❌ ERROR: You must be on your Following page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/following');
    return;
  }
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '⚠️ WARNING: This will unfollow EVERYONE!\n\n' +
      'Are you sure you want to continue?\n\n' +
      'Click OK to start unfollowing.'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting mass unfollow...');
  console.log('');
  
  let totalUnfollowed = 0;
  let retries = 0;
  
  while (retries < CONFIG.maxRetries) {
    // Scroll to bottom to load more users
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    
    // Find all unfollow buttons
    const buttons = document.querySelectorAll($unfollowBtn);
    
    if (buttons.length === 0) {
      retries++;
      console.log(`⏳ No buttons found. Retry ${retries}/${CONFIG.maxRetries}...`);
      await sleep(CONFIG.scrollDelay);
      continue;
    }
    
    let confirmedThisPass = 0;

    for (const btn of buttons) {
      // Check max unfollows limit
      if (CONFIG.maxUnfollows > 0 && totalUnfollowed >= CONFIG.maxUnfollows) {
        console.log(`\n✅ Reached limit of ${CONFIG.maxUnfollows} unfollows!`);
        console.log(`📊 Total unfollowed: ${totalUnfollowed}`);
        return { total: totalUnfollowed };
      }
      
      try {
        // Click unfollow button
        btn.click();
        await sleep(500);
        
        // Click confirmation
        const confirmBtn = document.querySelector($confirmBtn);
        if (confirmBtn) {
          confirmBtn.click();
          totalUnfollowed++;
          confirmedThisPass++;
          console.log(`✅ Unfollowed #${totalUnfollowed}`);
          await sleep(CONFIG.confirmDelay);
        }

        await sleep(CONFIG.unfollowDelay);

      } catch (e) {
        console.warn('⚠️ Error unfollowing:', e.message);
      }
    }

    // Only reset retries on real progress; otherwise a button that never
    // confirms would keep this loop spinning forever
    if (confirmedThisPass > 0) {
      retries = 0;
    } else {
      retries++;
      console.log(`⏳ No unfollows confirmed this pass. Retry ${retries}/${CONFIG.maxRetries}...`);
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ COMPLETE!                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📊 Total unfollowed: ${totalUnfollowed}`);
  console.log('');
  
  return { total: totalUnfollowed };
})();
