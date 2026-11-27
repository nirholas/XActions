// GENERATED FILE: a copy of browser/smartUnfollow.js, written by scripts/build-script-manifest.mjs. Edit browser/smartUnfollow.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🧠 Smart Unfollow
 * ============================================================
 * 
 * @name        smartUnfollow.js
 * @title       Smart Unfollow
 * @description Unfollow accounts that did not follow you back within a grace period, with a whitelist, a dry run and a cap.
 * @category    cleanup
 * @page        x.com/<you>/following or x.com/<you>/followers
 * @writes      true
 * @aliases     src/automation/smartUnfollow.js, scripts/twitter/smart-unfollow.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * This script works best with browser/keywordFollow.js, which tracks
 * when you followed each user (xactions_follow_tracking and
 * xactions_followed_users are both read).
 * 
 * STEP 1: Run on YOUR FOLLOWERS page first
 *    Go to: https://x.com/YOUR_USERNAME/followers
 *    Paste browser/smartUnfollow.js to scan who follows you
 * 
 * STEP 2: Run on YOUR FOLLOWING page
 *    Go to: https://x.com/YOUR_USERNAME/following
 *    Paste it again to unfollow non-followers past grace period
 * 
 * Stop early: window.stopSmartUnfollow()
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // ---- TIMING ----
  
  // Days to wait before unfollowing non-followers
  // 💡 Give users time to follow back!
  daysToWait: 3,
  
  // ---- LIMITS ----
  
  // Maximum unfollows per session
  maxUnfollows: 30,
  
  // ---- PROTECTION ----
  
  // Usernames to NEVER unfollow
  // 💡 Add important accounts here
  whitelist: [
    // 'elonmusk',
    // 'naval',
  ],
  
  // Only unfollow users tracked by keyword-follow
  // 💡 Set to false to unfollow any non-follower past grace period
  onlyTracked: true,
  
  // Dry run mode - just show who would be unfollowed
  dryRun: false,
  
  // ---- TIMING ----
  
  unfollowDelay: 1500,
  confirmDelay: 1000,
  scrollDelay: 2000,
  maxScrolls: 100,
  maxRetries: 5
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function smartUnfollow() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Stop switch: window.stopSmartUnfollow() halts after the current account.
  let stopped = false;
  window.stopSmartUnfollow = () => {
    stopped = true;
    console.log('🛑 Stopping...');
  };
  
  const $userCell = '[data-testid="UserCell"]';
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  const $followsYou = '[data-testid="userFollowIndicator"]';
  
  const TRACKING_KEY = 'xactions_follow_tracking';
  const FOLLOWERS_KEY = 'xactions_my_current_followers';
  // Shared with protect-active-users.js and whitelist.js so a user marked
  // protected/whitelisted by either script is never touched here.
  const PROTECTED_KEY = 'xactions_protected_users';
  const WHITELIST_KEY = 'xactions_whitelist';
  // Written by the core.js-based variant of this tool and by keywordFollow:
  // { username: { followedAt: <ms>, followedBack, checkedAt } }, and a plain
  // follower list (or a detectUnfollowers snapshot { followers: [...] }).
  const CORE_TRACKING_KEY = 'xactions_followed_users';
  const CORE_FOLLOWERS_KEY = 'xactions_my_followers';
  const UNFOLLOW_COUNT_KEY = 'xactions_ratelimit_unfollow_day';
  const whitelistLower = new Set(CONFIG.whitelist.map(u => String(u).replace(/^@/, '').toLowerCase()));
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧠 SMART UNFOLLOW                                         ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Detect page type
  const url = window.location.href;
  const isFollowersPage = url.includes('/followers');
  const isFollowingPage = url.includes('/following');
  
  if (!isFollowersPage && !isFollowingPage) {
    console.error('❌ ERROR: Must be on your followers or following page!');
    console.log('📍 Step 1: https://x.com/YOUR_USERNAME/followers');
    console.log('📍 Step 2: https://x.com/YOUR_USERNAME/following');
    return;
  }
  
  /**
   * Get username from cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    return link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
  }
  
  // ==========================================
  // PHASE 1: Scan followers
  // ==========================================
  
  if (isFollowersPage) {
    console.log('📋 PHASE 1: Scanning your followers...');
    console.log('');
    
    const followers = new Set();
    let lastCount = 0;
    let retries = 0;
    let scrolls = 0;
    
    while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries && !stopped) {
      document.querySelectorAll($userCell).forEach(cell => {
        const username = getUsername(cell);
        if (username) followers.add(username);
      });
      
      if (followers.size === lastCount) {
        retries++;
      } else {
        retries = 0;
        lastCount = followers.size;
      }
      
      console.log(`📊 Found ${followers.size} followers...`);
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;
    }
    
    // Save followers
    localStorage.setItem(FOLLOWERS_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      followers: [...followers]
    }));
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ PHASE 1 COMPLETE!                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Saved ${followers.size} followers`);
    console.log('');
    console.log('👉 Now go to your FOLLOWING page and run this script again!');
    console.log('   https://x.com/YOUR_USERNAME/following');
    console.log('');
    
    return { phase: 1, followers: followers.size };
  }
  
  // ==========================================
  // PHASE 2: Unfollow non-followers
  // ==========================================
  
  console.log('📋 PHASE 2: Unfollowing non-followers...');
  console.log(`⏱️ Grace period: ${CONFIG.daysToWait} days`);
  console.log(`📊 Max unfollows: ${CONFIG.maxUnfollows}`);
  if (CONFIG.dryRun) console.log('🔍 DRY RUN MODE - no actual unfollows');
  console.log('');
  
  // Load followers
  let myFollowers = new Set();
  try {
    const saved = localStorage.getItem(FOLLOWERS_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      data.followers.forEach(u => myFollowers.add(u));
      console.log(`📚 Loaded ${myFollowers.size} followers from Phase 1`);
    }
  } catch (e) { /* unreadable saved data: start without it */ }
  // Fall back to the follower list the core.js variant saved
  if (myFollowers.size === 0) {
    try {
      const saved = JSON.parse(localStorage.getItem(CORE_FOLLOWERS_KEY) || 'null');
      const list = Array.isArray(saved) ? saved : (saved && Array.isArray(saved.followers) ? saved.followers : []);
      list.forEach(u => typeof u === 'string' && myFollowers.add(u));
      if (myFollowers.size > 0) console.log(`📚 Loaded ${myFollowers.size} followers from ${CORE_FOLLOWERS_KEY}`);
    } catch (e) { /* unreadable saved data: start without it */ }
  }
  const myFollowersLower = new Set(Array.from(myFollowers, u => u.toLowerCase()));
  
  if (myFollowers.size === 0) {
    console.warn('⚠️ No followers data found!');
    console.log('👉 Run this script on your FOLLOWERS page first!');
    return;
  }
  
  // Load tracking data
  let trackingData = {};
  try {
    const saved = localStorage.getItem(TRACKING_KEY);
    if (saved) trackingData = JSON.parse(saved);
    console.log(`📚 Loaded ${Object.keys(trackingData).length} tracked follows`);
  } catch (e) { /* unreadable saved data: start without it */ }
  
  // Tracking kept by the core.js variant (keys are lowercase usernames)
  let coreTracking = {};
  try {
    const saved = localStorage.getItem(CORE_TRACKING_KEY);
    if (saved) coreTracking = JSON.parse(saved) || {};
    if (Object.keys(coreTracking).length > 0) {
      console.log(`📚 Loaded ${Object.keys(coreTracking).length} tracked follows from ${CORE_TRACKING_KEY}`);
    }
  } catch (e) { /* unreadable saved data: start without it */ }
  const saveCoreTracking = () => {
    try {
      localStorage.setItem(CORE_TRACKING_KEY, JSON.stringify(coreTracking));
    } catch (e) {
      console.warn('⚠️ Could not save tracking:', e.message);
    }
  };
  
  if (CONFIG.onlyTracked && Object.keys(trackingData).length === 0 && Object.keys(coreTracking).length === 0) {
    console.warn('⚠️ No tracked users found. Run browser/keywordFollow.js first to track who you follow.');
    console.log('💡 Or set onlyTracked: false to unfollow any non-follower.');
    return;
  }

  // Load protected users (from protect-active-users.js: engaged likers/
  // repliers/retweeters) and the shared whitelist (from whitelist.js) so
  // both lists are respected here too, not just CONFIG.whitelist.
  const protectedUsers = new Set();
  try {
    const saved = localStorage.getItem(PROTECTED_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      (data.users || []).forEach(u => u.username && protectedUsers.add(u.username.toLowerCase()));
    }
  } catch (e) { /* unreadable saved data: start without it */ }
  try {
    const saved = localStorage.getItem(WHITELIST_KEY);
    if (saved) {
      const list = JSON.parse(saved);
      (Array.isArray(list) ? list : []).forEach(u => u.username && protectedUsers.add(u.username.toLowerCase()));
    }
  } catch (e) { /* unreadable saved data: start without it */ }
  if (protectedUsers.size > 0) {
    console.log(`🛡️ Loaded ${protectedUsers.size} protected/whitelisted users (never unfollowed)`);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.daysToWait);
  
  let totalUnfollowed = 0;
  let scrolls = 0;
  let retries = 0;
  const seenUsers = new Set();

  console.log('');
  console.log('🚀 Scanning following list...');
  console.log('');

  while (totalUnfollowed < CONFIG.maxUnfollows && scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries && !stopped) {
    const cells = document.querySelectorAll($userCell);
    let newUsersThisPass = 0;

    for (const cell of cells) {
      if (totalUnfollowed >= CONFIG.maxUnfollows || stopped) break;

      const username = getUsername(cell);
      if (!username) continue;

      // Progress = new accounts appearing in the list, not just unfollow
      // candidates. A run of mutuals must not end the session early.
      if (!seenUsers.has(username)) {
        seenUsers.add(username);
        newUsersThisPass++;
      }

      // Skip whitelist (inline CONFIG list + shared whitelist.js / protect-active-users.js lists)
      if (whitelistLower.has(username.toLowerCase())) continue;
      if (protectedUsers.has(username.toLowerCase())) continue;

      const coreRecord = coreTracking[username.toLowerCase()];

      // Check if follows you
      if (myFollowers.has(username) || myFollowersLower.has(username.toLowerCase()) || cell.querySelector($followsYou)) {
        if (coreRecord && !coreRecord.followedBack) {
          coreRecord.followedBack = true;
          coreRecord.checkedAt = Date.now();
          saveCoreTracking();
        }
        continue; // Mutual - keep
      }
      if (coreRecord && coreRecord.followedBack) continue; // Followed back earlier
      
      // Check tracking (either store)
      const tracking = trackingData[username];
      
      if (CONFIG.onlyTracked && !tracking && !coreRecord) {
        continue; // Not tracked, skip
      }
      
      // Check grace period
      if (tracking || coreRecord) {
        const followedDate = new Date((tracking || coreRecord).followedAt);
        if (followedDate > cutoffDate) {
          continue; // Still in grace period
        }
      }
      
      // This user should be unfollowed
      const unfollowBtn = cell.querySelector($unfollowBtn);
      if (!unfollowBtn) continue;

      if (CONFIG.dryRun) {
        console.log(`🔍 Would unfollow: @${username}`);
        totalUnfollowed++;
        continue;
      }
      
      try {
        unfollowBtn.click();
        await sleep(500);
        
        // The confirmation sheet can take a moment to render: wait up to 3s
        let confirmBtn = document.querySelector($confirmBtn);
        for (let waited = 0; !confirmBtn && waited < 3000; waited += 100) {
          await sleep(100);
          confirmBtn = document.querySelector($confirmBtn);
        }
        if (confirmBtn) {
          confirmBtn.click();
          totalUnfollowed++;
          
          console.log(`🚫 Unfollowed #${totalUnfollowed}: @${username}`);
          
          // Remove from tracking
          if (tracking) {
            delete trackingData[username];
            localStorage.setItem(TRACKING_KEY, JSON.stringify(trackingData));
          }
          if (coreRecord) {
            delete coreTracking[username.toLowerCase()];
            saveCoreTracking();
          }
          
          // Daily unfollow counter shared with core.js (rateLimit 'unfollow', 'day')
          try {
            const count = JSON.parse(localStorage.getItem(UNFOLLOW_COUNT_KEY) || 'null');
            const fresh = !count || Date.now() - count.timestamp > 86400000;
            localStorage.setItem(UNFOLLOW_COUNT_KEY, JSON.stringify(fresh
              ? { count: 1, timestamp: Date.now() }
              : { count: count.count + 1, timestamp: count.timestamp }));
          } catch (e) {
            console.warn('⚠️ Could not update the daily unfollow count:', e.message);
          }
          
          await sleep(CONFIG.confirmDelay);
        }
        
        await sleep(CONFIG.unfollowDelay);
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    if (newUsersThisPass === 0) {
      retries++;
    } else {
      retries = 0;
    }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SMART UNFOLLOW COMPLETE!                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🚫 Total unfollowed: ${totalUnfollowed}`);
  if (CONFIG.dryRun) console.log('🔍 (Dry run - no actual unfollows performed)');
  console.log('');
  
  return { phase: 2, unfollowed: totalUnfollowed };
})();
