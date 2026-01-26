/**
 * ============================================================
 * 🎯 Follow Target Users
 * ============================================================
 * 
 * @name        follow-target-users.js
 * @description Follow the followers/following of specified target accounts
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to a target account's followers or following page:
 *    https://x.com/TARGET/followers  OR
 *    https://x.com/TARGET/following
 * 
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Customize the CONFIG below
 * 4. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // ---- LIMITS ----
  
  // Maximum users to follow
  maxFollows: 30,
  
  // Max scrolls to load users
  maxScrolls: 50,
  
  // ---- FILTERS ----
  
  filters: {
    // Skip protected/private accounts
    skipProtected: true,
    
    // Skip verified accounts
    skipVerified: false,
    
    // Only follow users with bio containing these keywords
    // 💡 Leave empty [] to follow anyone
    bioKeywords: [],
    
    // Skip users whose bio contains these words
    bioBlacklist: ['bot', 'spam', 'promo']
  },
  
  // ---- TIMING ----
  
  minDelay: 2000,
  maxDelay: 4000,
  scrollDelay: 1500
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function followTargetUsers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  
  const $userCell = '[data-testid="UserCell"]';
  const $followButton = '[data-testid$="-follow"]';
  const $protectedIcon = '[data-testid="icon-lock"]';
  const $verifiedBadge = '[data-testid="icon-verified"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 FOLLOW TARGET USERS                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  const url = window.location.href;
  const pathMatch = url.match(/x\.com\/([^\/]+)\/(followers|following)/);
  
  if (!pathMatch) {
    console.error('❌ ERROR: Must be on a followers or following page!');
    console.log('📍 Go to: https://x.com/TARGET/followers');
    return;
  }
  
  const targetAccount = pathMatch[1];
  const listType = pathMatch[2];
  
  console.log(`👤 Target account: @${targetAccount}`);
  console.log(`📋 List type: ${listType}`);
  console.log(`📊 Max follows: ${CONFIG.maxFollows}`);
  console.log('');
  
  const STORAGE_KEY = 'xactions_followed_targets';
  const followedUsers = new Set();
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) JSON.parse(saved).forEach(u => followedUsers.add(u));
  } catch (e) {}
  
  let totalFollowed = 0;
  let scrolls = 0;
  
  /**
   * Get user info from cell
   */
  function getUserInfo(cell) {
    const link = cell.querySelector('a[href^="/"]');
    const username = link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
    
    // Get bio text
    const bioEl = cell.querySelector('[dir="auto"]:not([role])');
    const bio = bioEl ? bioEl.innerText.toLowerCase() : '';
    
    return { username, bio };
  }
  
  /**
   * Check if user passes filters
   */
  function passesFilters(cell, bio) {
    // Check protected
    if (CONFIG.filters.skipProtected && cell.querySelector($protectedIcon)) {
      return false;
    }
    
    // Check verified
    if (CONFIG.filters.skipVerified && cell.querySelector($verifiedBadge)) {
      return false;
    }
    
    // Bio keywords whitelist
    if (CONFIG.filters.bioKeywords.length > 0) {
      const hasKeyword = CONFIG.filters.bioKeywords.some(k => bio.includes(k.toLowerCase()));
      if (!hasKeyword) return false;
    }
    
    // Bio blacklist
    if (CONFIG.filters.bioBlacklist.length > 0) {
      const hasBlacklist = CONFIG.filters.bioBlacklist.some(k => bio.includes(k.toLowerCase()));
      if (hasBlacklist) return false;
    }
    
    return true;
  }
  
  console.log('🚀 Starting to follow users...');
  console.log('');
  
  while (totalFollowed < CONFIG.maxFollows && scrolls < CONFIG.maxScrolls) {
    const cells = document.querySelectorAll($userCell);
    
    for (const cell of cells) {
      if (totalFollowed >= CONFIG.maxFollows) break;
      
      const { username, bio } = getUserInfo(cell);
      if (!username || followedUsers.has(username)) continue;
      
      // Check filters
      if (!passesFilters(cell, bio)) {
        continue;
      }
      
      // Find follow button
      const followBtn = cell.querySelector($followButton);
      if (!followBtn) continue;
      
      try {
        followBtn.click();
        followedUsers.add(username);
        totalFollowed++;
        
        console.log(`✅ Followed #${totalFollowed}: @${username}`);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...followedUsers]));
        
        await sleep(randomDelay());
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
    
    if (scrolls % 10 === 0) {
      console.log(`📜 Scrolled ${scrolls} times, followed ${totalFollowed}...`);
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ FOLLOW TARGET USERS COMPLETE!                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`👥 Total followed: ${totalFollowed}`);
  console.log('');
  
  return { followed: totalFollowed };
})();
