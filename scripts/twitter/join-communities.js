// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * ============================================================
 * 🏘️ Join Communities from List
 * ============================================================
 * 
 * @name        join-communities.js
 * @description Join multiple X/Twitter communities from a list of IDs
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Add community IDs to the COMMUNITIES array below
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. The script will navigate to each community and join
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Community IDs to join (get from URL: x.com/i/communities/1234567890)
  communities: [
    // '1234567890123456789',
    // '9876543210987654321',
  ],
  
  // Delay between joining communities (ms)
  joinDelay: 3000,
  
  // Delay for page load (ms)
  navigationDelay: 3000,
  
  // Maximum communities to join (0 = all in list)
  maxJoin: 0,
  
  // Skip communities you've already joined
  skipAlreadyJoined: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function joinCommunities() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $joinButton = 'button[aria-label^="Join"]:not([aria-label^="Joined"])';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $pendingButton = 'button[aria-label^="Pending"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🏘️ JOIN COMMUNITIES FROM LIST                             ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Validate configuration
  if (!CONFIG.communities || CONFIG.communities.length === 0) {
    console.error('❌ ERROR: No communities configured!');
    console.log('');
    console.log('📋 How to configure:');
    console.log('   1. Find community IDs from URLs: x.com/i/communities/1234567890');
    console.log('   2. Add them to CONFIG.communities array:');
    console.log('      communities: [');
    console.log('        "1234567890123456789",');
    console.log('        "9876543210987654321",');
    console.log('      ]');
    return;
  }
  
  // State tracking (persists across page navigations)
  const getJoinedCommunities = () => {
    try {
      return JSON.parse(sessionStorage.getItem('xactions_joined_communities') || '[]');
    } catch { return []; }
  };
  
  const markAsJoined = (id, status) => {
    const joined = getJoinedCommunities();
    if (!joined.find(c => c.id === id)) {
      joined.push({ id, status, timestamp: Date.now() });
      sessionStorage.setItem('xactions_joined_communities', JSON.stringify(joined));
    }
  };
  
  const getCurrentIndex = () => {
    return parseInt(sessionStorage.getItem('xactions_join_index') || '0', 10);
  };
  
  const setCurrentIndex = (idx) => {
    sessionStorage.setItem('xactions_join_index', idx.toString());
  };
  
  console.log(`📋 Communities to join: ${CONFIG.communities.length}`);
  console.log(`✅ Already processed: ${getJoinedCommunities().length}`);
  console.log('');
  
  const processCurrentCommunity = async () => {
    const index = getCurrentIndex();
    
    // Check if we're done
    if (index >= CONFIG.communities.length) {
      const joined = getJoinedCommunities();
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log(`║  🎉 COMPLETE! Processed ${joined.length} communities       `);
      console.log('╚════════════════════════════════════════════════════════════╝');
      
      // Summary
      const successful = joined.filter(c => c.status === 'joined').length;
      const pending = joined.filter(c => c.status === 'pending').length;
      const skipped = joined.filter(c => c.status === 'already_joined').length;
      const failed = joined.filter(c => c.status === 'failed').length;
      
      console.log(`   ✅ Joined: ${successful}`);
      console.log(`   ⏳ Pending approval: ${pending}`);
      console.log(`   ⏭️ Already joined: ${skipped}`);
      console.log(`   ❌ Failed: ${failed}`);
      
      // Cleanup
      sessionStorage.removeItem('xactions_joined_communities');
      sessionStorage.removeItem('xactions_join_index');
      return;
    }
    
    // Check limits
    if (CONFIG.maxJoin > 0) {
      const successCount = getJoinedCommunities().filter(c => c.status === 'joined').length;
      if (successCount >= CONFIG.maxJoin) {
        console.log(`🛑 Reached limit of ${CONFIG.maxJoin} communities. Stopping.`);
        return;
      }
    }
    
    const communityId = CONFIG.communities[index];
    const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
    const currentId = urlMatch ? urlMatch[1] : null;
    
    // Navigate to community if not there
    if (currentId !== communityId) {
      console.log(`📍 Navigating to community ${index + 1}/${CONFIG.communities.length}: ${communityId}`);
      console.log('💡 Re-paste this script after the page loads to continue (progress is saved).');
      window.location.href = `https://x.com/i/communities/${communityId}`;
      return;
    }
    
    console.log(`🔍 Processing community ${index + 1}/${CONFIG.communities.length}: ${communityId}`);
    await sleep(CONFIG.navigationDelay);
    
    // Check if already joined
    const joinedBtn = document.querySelector($joinedButton);
    if (joinedBtn && CONFIG.skipAlreadyJoined) {
      console.log(`⏭️ Already a member, skipping...`);
      markAsJoined(communityId, 'already_joined');
      setCurrentIndex(index + 1);
      await sleep(1000);
      return processCurrentCommunity();
    }
    
    // Check if pending
    const pendingBtn = document.querySelector($pendingButton);
    if (pendingBtn) {
      console.log(`⏳ Request pending, skipping...`);
      markAsJoined(communityId, 'pending');
      setCurrentIndex(index + 1);
      await sleep(1000);
      return processCurrentCommunity();
    }
    
    // Try to join
    const joinBtn = document.querySelector($joinButton);
    if (joinBtn) {
      console.log(`👆 Clicking Join button...`);
      joinBtn.click();
      await sleep(CONFIG.joinDelay);
      
      // Check result
      const nowJoined = document.querySelector($joinedButton);
      const nowPending = document.querySelector($pendingButton);
      
      if (nowJoined) {
        console.log(`✅ Successfully joined community: ${communityId}`);
        markAsJoined(communityId, 'joined');
      } else if (nowPending) {
        console.log(`⏳ Request sent (awaiting approval): ${communityId}`);
        markAsJoined(communityId, 'pending');
      } else {
        console.log(`❓ Join status unknown for: ${communityId}`);
        markAsJoined(communityId, 'unknown');
      }
    } else {
      console.log(`❌ Join button not found for: ${communityId}`);
      markAsJoined(communityId, 'failed');
    }
    
    // Move to next
    setCurrentIndex(index + 1);
    await sleep(CONFIG.joinDelay);
    return processCurrentCommunity();
  };
  
  processCurrentCommunity();
})();
