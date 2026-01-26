/**
 * ============================================================
 * 🔑 Keyword Follow
 * ============================================================
 * 
 * @name        keyword-follow.js
 * @description Search for keywords and follow matching users
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to X search page: https://x.com/search
 * 2. Search for your keyword with "People" filter, e.g.:
 *    https://x.com/search?q=web3%20developer&f=user
 * 3. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 4. Paste this script and press Enter
 * 
 * 💡 TIP: Use the &f=user parameter to show People results
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // ---- LIMITS ----
  
  // Maximum users to follow
  maxFollows: 20,
  
  // Max scrolls
  maxScrolls: 30,
  
  // ---- FILTERS ----
  
  filters: {
    // Skip protected accounts
    skipProtected: true,
    
    // Skip accounts that already follow you
    skipMutuals: false,
    
    // Skip verified accounts
    skipVerified: false,
    
    // Bio must contain at least one of these keywords
    // 💡 Leave empty to follow anyone in search results
    bioMustContain: [],
    
    // Bio must NOT contain these keywords
    bioBlacklist: ['bot', 'automated', 'promo', 'giveaway']
  },
  
  // ---- TRACKING ----
  // The script tracks who you followed and when, enabling smart unfollow later
  
  trackFollows: true,
  
  // ---- TIMING ----
  
  minDelay: 2000,
  maxDelay: 5000,
  scrollDelay: 2000
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function keywordFollow() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  
  const $userCell = '[data-testid="UserCell"]';
  const $followButton = '[data-testid$="-follow"]';
  const $followsYou = '[data-testid="userFollowIndicator"]';
  const $protectedIcon = '[data-testid="icon-lock"]';
  const $verifiedBadge = '[data-testid="icon-verified"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔑 KEYWORD FOLLOW                                         ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on search page
  if (!window.location.href.includes('/search')) {
    console.error('❌ ERROR: Must be on a search results page!');
    console.log('📍 Go to: https://x.com/search?q=YOUR_KEYWORD&f=user');
    return;
  }
  
  // Get search query
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || 'unknown';
  
  console.log(`🔍 Search query: "${query}"`);
  console.log(`📊 Max follows: ${CONFIG.maxFollows}`);
  console.log('');
  
  const STORAGE_KEY = 'xactions_keyword_followed';
  const TRACKING_KEY = 'xactions_follow_tracking';
  
  const followedUsers = new Set();
  let trackingData = {};
  
  // Load existing data
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) JSON.parse(saved).forEach(u => followedUsers.add(u));
    
    const tracking = localStorage.getItem(TRACKING_KEY);
    if (tracking) trackingData = JSON.parse(tracking);
  } catch (e) {}
  
  let totalFollowed = 0;
  let scrolls = 0;
  
  /**
   * Get user info
   */
  function getUserInfo(cell) {
    const link = cell.querySelector('a[href^="/"]');
    const username = link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
    
    // Get bio
    const bioEl = cell.querySelector('[dir="auto"]:not([role])');
    const bio = bioEl ? bioEl.innerText.toLowerCase() : '';
    
    return { username, bio };
  }
  
  /**
   * Check filters
   */
  function passesFilters(cell, bio) {
    if (CONFIG.filters.skipProtected && cell.querySelector($protectedIcon)) return false;
    if (CONFIG.filters.skipVerified && cell.querySelector($verifiedBadge)) return false;
    if (CONFIG.filters.skipMutuals && cell.querySelector($followsYou)) return false;
    
    // Bio whitelist
    if (CONFIG.filters.bioMustContain.length > 0) {
      const has = CONFIG.filters.bioMustContain.some(k => bio.includes(k.toLowerCase()));
      if (!has) return false;
    }
    
    // Bio blacklist
    if (CONFIG.filters.bioBlacklist.length > 0) {
      const has = CONFIG.filters.bioBlacklist.some(k => bio.includes(k.toLowerCase()));
      if (has) return false;
    }
    
    return true;
  }
  
  console.log('🚀 Starting keyword follow...');
  console.log('');
  
  while (totalFollowed < CONFIG.maxFollows && scrolls < CONFIG.maxScrolls) {
    const cells = document.querySelectorAll($userCell);
    
    for (const cell of cells) {
      if (totalFollowed >= CONFIG.maxFollows) break;
      
      const { username, bio } = getUserInfo(cell);
      if (!username || followedUsers.has(username)) continue;
      
      if (!passesFilters(cell, bio)) continue;
      
      const followBtn = cell.querySelector($followButton);
      if (!followBtn) continue;
      
      try {
        followBtn.click();
        followedUsers.add(username);
        totalFollowed++;
        
        console.log(`✅ Followed #${totalFollowed}: @${username}`);
        
        // Track follow with timestamp
        if (CONFIG.trackFollows) {
          trackingData[username] = {
            followedAt: new Date().toISOString(),
            keyword: query
          };
          localStorage.setItem(TRACKING_KEY, JSON.stringify(trackingData));
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...followedUsers]));
        
        await sleep(randomDelay());
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ KEYWORD FOLLOW COMPLETE!                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`👥 Total followed: ${totalFollowed}`);
  console.log(`📊 Total tracked: ${Object.keys(trackingData).length}`);
  console.log('');
  console.log('💡 Use smart-unfollow.js later to unfollow non-followers!');
  console.log('');
  
  return { followed: totalFollowed };
})();
