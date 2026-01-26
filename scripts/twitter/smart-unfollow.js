/**
 * ============================================================
 * 🧠 Smart Unfollow
 * ============================================================
 * 
 * @name        smart-unfollow.js
 * @description Unfollow users who didn't follow back within X days
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * This script works best with keyword-follow.js which tracks
 * when you followed each user.
 * 
 * STEP 1: Run on YOUR FOLLOWERS page first
 *    Go to: https://x.com/YOUR_USERNAME/followers
 *    Run script to scan who follows you
 * 
 * STEP 2: Run on YOUR FOLLOWING page
 *    Go to: https://x.com/YOUR_USERNAME/following
 *    Run script again to unfollow non-followers past grace period
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
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
  
  const $userCell = '[data-testid="UserCell"]';
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  const $followsYou = '[data-testid="userFollowIndicator"]';
  
  const TRACKING_KEY = 'xactions_follow_tracking';
  const FOLLOWERS_KEY = 'xactions_my_current_followers';
  
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
    
    while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
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
  } catch (e) {}
  
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
  } catch (e) {}
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.daysToWait);
  
  let totalUnfollowed = 0;
  let scrolls = 0;
  let retries = 0;
  
  console.log('');
  console.log('🚀 Scanning following list...');
  console.log('');
  
  while (totalUnfollowed < CONFIG.maxUnfollows && scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const cells = document.querySelectorAll($userCell);
    let foundAny = false;
    
    for (const cell of cells) {
      if (totalUnfollowed >= CONFIG.maxUnfollows) break;
      
      const username = getUsername(cell);
      if (!username) continue;
      
      // Skip whitelist
      if (CONFIG.whitelist.includes(username.toLowerCase())) continue;
      
      // Check if follows you
      if (myFollowers.has(username) || cell.querySelector($followsYou)) {
        continue; // Mutual - keep
      }
      
      // Check tracking
      const tracking = trackingData[username];
      
      if (CONFIG.onlyTracked && !tracking) {
        continue; // Not tracked, skip
      }
      
      // Check grace period
      if (tracking) {
        const followedDate = new Date(tracking.followedAt);
        if (followedDate > cutoffDate) {
          continue; // Still in grace period
        }
      }
      
      // This user should be unfollowed
      const unfollowBtn = cell.querySelector($unfollowBtn);
      if (!unfollowBtn) continue;
      
      foundAny = true;
      
      if (CONFIG.dryRun) {
        console.log(`🔍 Would unfollow: @${username}`);
        totalUnfollowed++;
        continue;
      }
      
      try {
        unfollowBtn.click();
        await sleep(500);
        
        const confirmBtn = document.querySelector($confirmBtn);
        if (confirmBtn) {
          confirmBtn.click();
          totalUnfollowed++;
          
          console.log(`🚫 Unfollowed #${totalUnfollowed}: @${username}`);
          
          // Remove from tracking
          if (tracking) {
            delete trackingData[username];
            localStorage.setItem(TRACKING_KEY, JSON.stringify(trackingData));
          }
          
          await sleep(CONFIG.confirmDelay);
        }
        
        await sleep(CONFIG.unfollowDelay);
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    if (!foundAny) {
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
  console.log('');
  
  return { phase: 2, unfollowed: totalUnfollowed };
})();
