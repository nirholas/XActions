/**
 * ============================================================
 * 🚪 Leave Specific Community
 * ============================================================
 * 
 * @name        leave-community.js
 * @description Leave a specific X/Twitter community by ID or name
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Go to the community page you want to leave
 *    OR go to your communities list: https://x.com/YOUR_USERNAME/communities
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Configure the COMMUNITY_ID below
 * 4. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Community ID to leave (get from URL: x.com/i/communities/1234567890)
  // Set to null to leave the community you're currently viewing
  communityId: null,
  
  // Delay for confirmations (ms)
  confirmDelay: 1500,
  
  // Delay for navigation (ms)
  navigationDelay: 2500
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function leaveCommunity() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $communityLinks = 'a[href^="/i/communities/"]';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚪 LEAVE SPECIFIC COMMUNITY                               ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Check if we're already on a community page
  const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
  const currentCommunityId = urlMatch ? urlMatch[1] : null;
  
  // Determine which community to leave
  let targetId = CONFIG.communityId || currentCommunityId;
  
  if (!targetId) {
    console.error('❌ ERROR: No community specified!');
    console.log('');
    console.log('📋 Options:');
    console.log('   1. Go directly to a community page');
    console.log('   2. Set CONFIG.communityId = "YOUR_COMMUNITY_ID"');
    console.log('');
    console.log('💡 Find community ID in the URL: x.com/i/communities/1234567890');
    return;
  }
  
  console.log(`🎯 Target community: ${targetId}`);
  
  // Navigate to community if not already there
  if (currentCommunityId !== targetId) {
    console.log('📍 Navigating to community...');
    window.location.href = `https://x.com/i/communities/${targetId}`;
    return; // Script will need to be run again after navigation
  }
  
  // Look for the Joined button
  console.log('🔍 Looking for Joined button...');
  await sleep(CONFIG.confirmDelay);
  
  const joinedBtn = document.querySelector($joinedButton);
  
  if (!joinedBtn) {
    console.error('❌ ERROR: Joined button not found!');
    console.log('');
    console.log('📋 Possible reasons:');
    console.log('   • You\'re not a member of this community');
    console.log('   • The page hasn\'t fully loaded (try again)');
    console.log('   • You may need to scroll down');
    return;
  }
  
  console.log('👆 Clicking Joined button...');
  joinedBtn.click();
  await sleep(CONFIG.confirmDelay);
  
  // Click confirmation
  const confirmBtn = document.querySelector($confirmButton);
  
  if (confirmBtn) {
    console.log('✅ Confirming leave...');
    confirmBtn.click();
    await sleep(CONFIG.confirmDelay);
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🎉 Successfully left community: ${targetId}              `);
    console.log('╚════════════════════════════════════════════════════════════╝');
  } else {
    console.warn('⚠️ Confirmation button not found. You may need to confirm manually.');
  }
})();
