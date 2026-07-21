// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🚪 Leave All Communities
 * ============================================================
 * 
 * @name        leave-all-communities.js
 * @description Automatically leave ALL X/Twitter Communities you've joined
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your Communities page: https://x.com/YOUR_USERNAME/communities
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Paste this ENTIRE script and press Enter
 * 5. The script navigates through each community and leaves it
 * 
 * ⚠️ NOTE: This script navigates between pages. If it stops,
 * just run it again - it remembers which communities were already left.
 *
 * To stop early: window.stopLeaveCommunities()
 *
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // Delay before clicking leave button
  leaveDelay: 1500,
  
  // Delay after confirming leave
  confirmDelay: 2000,
  
  // Delay for navigation
  navDelay: 2500,
  
  // Maximum communities to leave (0 = all)
  maxToLeave: 0
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

// Stop flag lives on window (not inside the recursive function) so it
// survives every re-invocation of leaveAllCommunities() below.
window.__xaStopLeaveCommunities = false;
window.stopLeaveCommunities = () => {
  window.__xaStopLeaveCommunities = true;
  console.log('🛑 [Leave Communities] Stop requested. Finishing the current step, then exiting.');
};

(async function leaveAllCommunities() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // DOM Selectors
  const $communityLink = 'a[href^="/i/communities/"]';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  const $backButton = '[data-testid="app-bar-back"]';

  // State management using sessionStorage (survives navigation)
  const STORAGE_KEY = 'xactions_left_communities';
  
  const getLeftCommunities = () => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  };
  
  const markAsLeft = (id) => {
    const left = getLeftCommunities();
    if (!left.includes(id)) {
      left.push(id);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(left));
    }
  };
  
  const isAlreadyLeft = (id) => getLeftCommunities().includes(id);

  if (window.__xaStopLeaveCommunities) {
    console.log('🛑 Stopped by user. Run the script again to resume where it left off.');
    return;
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚪 LEAVE ALL COMMUNITIES                                  ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('💡 To stop early: window.stopLeaveCommunities()');
  console.log('');

  const leftCount = getLeftCommunities().length;
  if (leftCount > 0) {
    console.log(`📊 Previously left: ${leftCount} communities`);
    console.log('');
  }
  
  // Check current page state
  const currentUrl = window.location.href;
  
  // Are we inside a community page?
  if (currentUrl.includes('/i/communities/') && !currentUrl.endsWith('/communities')) {
    console.log('📍 Inside a community page...');
    
    // Extract community ID from URL
    const match = currentUrl.match(/\/i\/communities\/(\d+)/);
    const communityId = match ? match[1] : null;
    
    // Find and click the "Joined" button
    const joinedBtn = document.querySelector($joinedButton);
    
    if (joinedBtn) {
      console.log('🔍 Found "Joined" button, clicking...');
      joinedBtn.click();
      await sleep(CONFIG.leaveDelay);

      // Click confirm
      const confirmBtn = document.querySelector($confirmButton);
      if (confirmBtn) {
        confirmBtn.click();
        console.log('✅ Left community!');
        if (communityId) markAsLeft(communityId);
        await sleep(CONFIG.confirmDelay);
      } else {
        // Mark as processed anyway so we don't re-enter this community forever
        console.log('⚠️ Confirmation dialog not found. Skipping this community.');
        if (communityId) markAsLeft(communityId);
      }
    } else {
      // No Joined button (admins cannot leave, or the page failed to load).
      // Mark as processed so the script does not loop back here forever.
      console.log('⚠️ "Joined" button not found (admin or load issue). Skipping this community.');
      if (communityId) markAsLeft(communityId);
    }
    
    // Navigate back to communities list
    const backBtn = document.querySelector($backButton);
    if (backBtn && !window.__xaStopLeaveCommunities) {
      console.log('🔙 Navigating back...');
      backBtn.click();
      await sleep(CONFIG.navDelay);

      // Re-run the script to continue
      console.log('🔄 Continuing to next community...');
      leaveAllCommunities();
    }

    return;
  }
  
  // We're on the communities list page
  console.log('📍 On communities list page...');
  console.log('🔍 Looking for communities to leave...');
  
  // Find all community links
  const communityLinks = document.querySelectorAll($communityLink);
  
  if (communityLinks.length === 0) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL DONE!                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Total communities left: ${getLeftCommunities().length}`);
    
    // Clear storage
    sessionStorage.removeItem(STORAGE_KEY);
    console.log('🧹 Cleared session storage.');
    return;
  }
  
  // Find next community to leave
  for (const link of communityLinks) {
    if (window.__xaStopLeaveCommunities) {
      console.log('🛑 Stopped by user. Run the script again to resume where it left off.');
      return;
    }

    const href = link.getAttribute('href');
    const match = href?.match(/\/i\/communities\/(\d+)/);
    const communityId = match ? match[1] : null;

    if (!communityId) continue;
    if (isAlreadyLeft(communityId)) continue;

    // Check limit
    if (CONFIG.maxToLeave > 0 && getLeftCommunities().length >= CONFIG.maxToLeave) {
      console.log(`✅ Reached limit of ${CONFIG.maxToLeave} communities.`);
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    console.log(`➡️ Entering community: ${communityId}`);
    link.click();
    await sleep(CONFIG.navDelay);
    
    // The page will navigate, then re-run to leave
    console.log('🔄 Page navigating... script will continue.');
    leaveAllCommunities();
    return;
  }
  
  // All visible communities processed
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ALL DONE!                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📊 Total communities left: ${getLeftCommunities().length}`);
  sessionStorage.removeItem(STORAGE_KEY);
})();
