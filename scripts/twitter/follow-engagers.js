/**
 * ============================================================
 * 👥 Follow Engagers
 * ============================================================
 * 
 * @name        follow-engagers.js
 * @description Follow users who liked/retweeted a specific tweet
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to any tweet: https://x.com/user/status/TWEET_ID
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Customize the CONFIG below
 * 4. Paste this script and press Enter
 * 
 * The script will find users who engaged and follow them.
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // ---- ENGAGEMENT TYPE ----
  // Which engagers to follow
  // Options: 'likers', 'retweeters', 'all'
  mode: 'likers',
  
  // ---- LIMITS ----
  
  // Max follows from this post
  maxFollows: 20,
  
  // ---- FILTERS ----
  
  filters: {
    // Minimum followers the user must have
    minFollowers: 100,
    
    // Maximum followers (to avoid following huge accounts)
    maxFollowers: 50000,
    
    // Skip protected/private accounts
    skipProtected: true,
    
    // Skip verified accounts
    skipVerified: false
  },
  
  // ---- TIMING ----
  
  // Delay between follows (milliseconds)
  minDelay: 2000,
  maxDelay: 4000,
  
  // Scroll delay
  scrollDelay: 1500
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function followEngagers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  
  // DOM Selectors
  const $userCell = '[data-testid="UserCell"]';
  const $followButton = '[data-testid$="-follow"]';
  const $protectedIcon = '[data-testid="icon-lock"]';
  const $verifiedBadge = '[data-testid="icon-verified"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👥 FOLLOW ENGAGERS                                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on a tweet page
  if (!window.location.href.includes('/status/')) {
    console.error('❌ ERROR: Must be on a tweet page!');
    console.log('📍 Go to any tweet: https://x.com/user/status/TWEET_ID');
    return;
  }
  
  const tweetUrl = window.location.href.split('?')[0];
  console.log(`📍 Tweet: ${tweetUrl}`);
  console.log(`🎯 Mode: ${CONFIG.mode}`);
  console.log(`📊 Max follows: ${CONFIG.maxFollows}`);
  console.log('');
  
  const STORAGE_KEY = 'xactions_followed_engagers';
  const followedUsers = new Set();
  
  // Load previously followed
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) JSON.parse(saved).forEach(u => followedUsers.add(u));
  } catch (e) {}
  
  let totalFollowed = 0;
  
  /**
   * Get username from user cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    return link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
  }
  
  /**
   * Check if user passes filters
   */
  function passesFilters(cell) {
    // Check protected
    if (CONFIG.filters.skipProtected && cell.querySelector($protectedIcon)) {
      return false;
    }
    
    // Check verified
    if (CONFIG.filters.skipVerified && cell.querySelector($verifiedBadge)) {
      return false;
    }
    
    // Note: Follower count filtering would require visiting each profile
    // For simplicity, we skip that in the console version
    
    return true;
  }
  
  /**
   * Scrape and follow users from current list
   */
  async function followFromList() {
    let scrolls = 0;
    const maxScrolls = 30;
    
    while (totalFollowed < CONFIG.maxFollows && scrolls < maxScrolls) {
      const cells = document.querySelectorAll($userCell);
      
      for (const cell of cells) {
        if (totalFollowed >= CONFIG.maxFollows) break;
        
        const username = getUsername(cell);
        if (!username || followedUsers.has(username)) continue;
        
        // Check filters
        if (!passesFilters(cell)) {
          console.log(`⏭️ Skipping @${username} (filtered)`);
          continue;
        }
        
        // Find follow button
        const followBtn = cell.querySelector($followButton);
        if (!followBtn) continue; // Already following or no button
        
        try {
          followBtn.click();
          followedUsers.add(username);
          totalFollowed++;
          
          console.log(`✅ Followed #${totalFollowed}: @${username}`);
          
          // Save to storage
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...followedUsers]));
          
          await sleep(randomDelay());
          
        } catch (e) {
          console.warn('⚠️ Error following:', e.message);
        }
      }
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;
    }
  }
  
  // Navigate to likes or retweets list
  if (CONFIG.mode === 'likers' || CONFIG.mode === 'all') {
    console.log('📍 Opening likes list...');
    
    // Find likes link
    const likesLink = document.querySelector('a[href$="/likes"]');
    if (likesLink) {
      likesLink.click();
      await sleep(2000);
      
      console.log('🚀 Following likers...');
      await followFromList();
    } else {
      console.log('⚠️ Could not find likes link. Try clicking on the likes count manually.');
    }
  }
  
  if (CONFIG.mode === 'retweeters' || CONFIG.mode === 'all') {
    // Go back if needed
    if (CONFIG.mode === 'all') {
      window.history.back();
      await sleep(2000);
    }
    
    console.log('📍 Opening retweets list...');
    
    const retweetsLink = document.querySelector('a[href$="/retweets"]');
    if (retweetsLink) {
      retweetsLink.click();
      await sleep(2000);
      
      console.log('🚀 Following retweeters...');
      await followFromList();
    } else {
      console.log('⚠️ Could not find retweets link.');
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ FOLLOW ENGAGERS COMPLETE!                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`👥 Total followed: ${totalFollowed}`);
  console.log('');
  
  return { followed: totalFollowed };
})();
