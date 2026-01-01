// Leave All X Communities - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to https://x.com/YOUR_USERNAME/communities
// 2. Open the Developer Console (COMMAND+ALT+I on Mac, F12 on Windows)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 1 January 2026
(() => {
  const $communityLinks = 'a[href^="/i/communities/"]';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  const $communitiesNav = 'a[aria-label="Communities"]';

  // Track communities we've already left
  const getLeftCommunities = () => {
    try {
      return JSON.parse(sessionStorage.getItem('xactions_left_ids') || '[]');
    } catch { return []; }
  };
  
  const markAsLeft = (id) => {
    const left = getLeftCommunities();
    if (!left.includes(id)) {
      left.push(id);
      sessionStorage.setItem('xactions_left_ids', JSON.stringify(left));
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const getCommunityId = () => {
    const leftAlready = getLeftCommunities();
    const links = document.querySelectorAll($communityLinks);
    
    for (const link of links) {
      const match = link.href.match(/\/i\/communities\/(\d+)/);
      if (match && !leftAlready.includes(match[1])) {
        return { id: match[1], element: link };
      }
    }
    return null;
  };

  const run = async () => {
    const leftCount = getLeftCommunities().length;
    console.log(`🚀 LEAVE ALL COMMUNITIES (Left so far: ${leftCount})`);
    console.log(`📋 Already processed: ${getLeftCommunities().join(', ') || 'none'}`);
    
    await sleep(1500);
    
    // Check if we're on a community page (has Joined button)
    const joinedBtn = document.querySelector($joinedButton);
    
    if (joinedBtn) {
      // Get current community ID from URL
      const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
      const currentId = urlMatch ? urlMatch[1] : null;
      
      console.log(`📍 INSIDE COMMUNITY ${currentId}, CLICKING JOINED...`);
      joinedBtn.click();
      await sleep(1000);
      
      const confirmBtn = document.querySelector($confirmButton);
      if (confirmBtn) {
        console.log('✅ CONFIRMING LEAVE...');
        confirmBtn.click();
        
        // Mark this community as left
        if (currentId) {
          markAsLeft(currentId);
          console.log(`📝 MARKED ${currentId} AS LEFT`);
        }
        
        await sleep(1500);
      }
      
      // Click Communities nav link to go back
      const communitiesLink = document.querySelector($communitiesNav);
      if (communitiesLink) {
        console.log('⬅️ GOING BACK TO COMMUNITIES...');
        communitiesLink.click();
        await sleep(2500);
        return run();
      }
    }
    
    // We're on communities list - find next community (not already left)
    const community = getCommunityId();
    
    if (community) {
      console.log(`🏠 ENTERING COMMUNITY ${community.id}...`);
      community.element.click();
      await sleep(2500);
      return run();
    } else {
      // No more communities found
      const total = getLeftCommunities().length;
      console.log(`🎉 DONE! LEFT ${total} COMMUNITIES TOTAL`);
      console.log(`IDs: ${getLeftCommunities().join(', ')}`);
      sessionStorage.removeItem('xactions_left_ids');
    }
  };

  run();
})();
