/**
 * ============================================================
 * 🔄 Unfollow Non-Followers
 * ============================================================
 * 
 * @name        unfollow-non-followers.js
 * @description Unfollow accounts that DON'T follow you back
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your Following page: https://x.com/YOUR_USERNAME/following
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Paste this ENTIRE script and press Enter
 * 5. Watch the console for progress
 * 
 * This script will ONLY unfollow users who don't have the
 * "Follows you" badge, keeping your mutual follows intact.
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Maximum retry attempts when no buttons found
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
  confirmStart: true,
  
  // Log kept users (mutual followers)
  logKept: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function unfollowNonFollowers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  const $followsYou = '[data-testid="userFollowIndicator"]'; // "Follows you" badge
  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 UNFOLLOW NON-FOLLOWERS                                 ║');
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
      '🔄 UNFOLLOW NON-FOLLOWERS\n\n' +
      'This will unfollow accounts that don\'t follow you back.\n' +
      'Mutual followers will be kept.\n\n' +
      'Click OK to start.'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting to unfollow non-followers...');
  console.log('💡 Accounts with "Follows you" badge will be kept.');
  console.log('');
  
  let totalUnfollowed = 0;
  let totalKept = 0;
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
    
    retries = 0;
    
    for (const btn of buttons) {
      // Check max unfollows limit
      if (CONFIG.maxUnfollows > 0 && totalUnfollowed >= CONFIG.maxUnfollows) {
        console.log(`\n✅ Reached limit of ${CONFIG.maxUnfollows} unfollows!`);
        logSummary();
        return;
      }
      
      try {
        // Find the parent UserCell to check for "Follows you" badge
        const userCell = btn.closest($userCell);
        
        if (userCell) {
          // Check if this user follows you back
          const followsYou = userCell.querySelector($followsYou);
          
          if (followsYou) {
            // This user follows you - KEEP them
            totalKept++;
            if (CONFIG.logKept) {
              const nameEl = userCell.querySelector('[dir="ltr"] span');
              const name = nameEl ? nameEl.textContent : 'Unknown';
              console.log(`💚 Keeping: ${name} (follows you)`);
            }
            continue;
          }
        }
        
        // User doesn't follow back - unfollow them
        btn.click();
        await sleep(500);
        
        // Click confirmation
        const confirmBtn = document.querySelector($confirmBtn);
        if (confirmBtn) {
          confirmBtn.click();
          totalUnfollowed++;
          
          // Try to get username
          const nameEl = userCell?.querySelector('[dir="ltr"] span');
          const name = nameEl ? nameEl.textContent : `User #${totalUnfollowed}`;
          console.log(`🚫 Unfollowed: ${name}`);
          
          await sleep(CONFIG.confirmDelay);
        }
        
        await sleep(CONFIG.unfollowDelay);
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
  }
  
  function logSummary() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ COMPLETE!                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`🚫 Unfollowed (non-followers): ${totalUnfollowed}`);
    console.log(`💚 Kept (mutual followers): ${totalKept}`);
    console.log('');
  }
  
  logSummary();
  
  return { unfollowed: totalUnfollowed, kept: totalKept };
})();
