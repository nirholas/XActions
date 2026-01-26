/**
 * ============================================================
 * ❤️ Interact With Likers
 * ============================================================
 * 
 * @name        interact-with-likers.js
 * @description Interact with users who liked specific posts
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 FEATURES:
 * ============================================================
 * 
 * • View likers of a specific tweet
 * • Follow engaged users
 * • Great for competitor analysis
 * • Build targeted audience
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Go to a tweet's likes page (click on "X likes")
 *    URL format: https://x.com/USER/status/ID/likes
 * 2. Open Chrome DevTools (F12)
 * 3. Paste this script and press Enter
 * 4. Run XActions.Likers.follow()
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Actions
  actions: {
    follow: true,
  },
  
  // Limits
  limits: {
    follows: 20,
  },
  
  // Filters
  filters: {
    skipPrivate: true,
    skipVerified: false,  // Skip verified accounts
    skipNoPhoto: false,   // Skip accounts with default photo
  },
  
  // Timing
  delayBetweenActions: 2000,
  scrollDelay: 2000,
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function interactWithLikers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  
  // DOM Selectors
  const SELECTORS = {
    userCell: '[data-testid="UserCell"]',
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    userName: '[data-testid="User-Name"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ❤️ INTERACT WITH LIKERS                                   ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on a likes page
  if (!window.location.href.includes('/likes')) {
    console.error('❌ ERROR: You must be on a tweet\'s Likes page!');
    console.log('');
    console.log('📋 How to get there:');
    console.log('   1. Go to any tweet');
    console.log('   2. Click on "X likes" below the tweet');
    console.log('   3. URL should be: x.com/USER/status/ID/likes');
    console.log('');
    return;
  }
  
  // State
  const state = {
    isRunning: false,
    stats: { followed: 0, skipped: 0 },
    processedUsers: new Set(),
  };
  
  // Check if user passes filters
  const passesFilters = (userCell) => {
    // Skip if already following
    if (userCell.querySelector(SELECTORS.unfollowButton)) return false;
    
    // Skip verified if configured
    if (CONFIG.filters.skipVerified && userCell.querySelector(SELECTORS.verifiedBadge)) {
      return false;
    }
    
    return true;
  };
  
  // Get username from cell
  const getUsername = (userCell) => {
    const link = userCell.querySelector('a[href^="/"]');
    return link?.getAttribute('href')?.replace('/', '');
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Likers = {
    config: CONFIG,
    state,
    
    // Follow likers
    follow: async () => {
      console.log('🚀 Starting to follow likers...');
      state.isRunning = true;
      state.stats = { followed: 0, skipped: 0 };
      
      while (state.isRunning && state.stats.followed < CONFIG.limits.follows) {
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of userCells) {
          if (!state.isRunning) break;
          if (state.stats.followed >= CONFIG.limits.follows) break;
          
          const username = getUsername(cell);
          if (!username || state.processedUsers.has(username)) continue;
          
          state.processedUsers.add(username);
          
          if (!passesFilters(cell)) {
            state.stats.skipped++;
            continue;
          }
          
          const followBtn = cell.querySelector(SELECTORS.followButton);
          if (followBtn) {
            try {
              followBtn.click();
              state.stats.followed++;
              console.log(`👥 Followed @${username} (${state.stats.followed}/${CONFIG.limits.follows})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            } catch (e) {
              console.warn(`⚠️ Failed to follow @${username}`);
            }
          }
        }
        
        // Scroll for more
        window.scrollBy(0, window.innerHeight);
        await sleep(CONFIG.scrollDelay);
        
        // Check if we've reached the end
        const newCells = document.querySelectorAll(SELECTORS.userCell);
        const allProcessed = [...newCells].every(cell => {
          const username = getUsername(cell);
          return state.processedUsers.has(username);
        });
        
        if (allProcessed && newCells.length > 0) {
          console.log('📄 Reached end of likers list.');
          break;
        }
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 FINISHED FOLLOWING LIKERS!                             ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.Likers.stats();
    },
    
    // Collect likers (just get usernames)
    collect: async () => {
      console.log('📥 Collecting likers...');
      const likers = [];
      
      let scrollCount = 0;
      const maxScrolls = 20;
      
      while (scrollCount < maxScrolls) {
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        
        userCells.forEach(cell => {
          const username = getUsername(cell);
          if (username && !likers.includes(username)) {
            likers.push(username);
          }
        });
        
        console.log(`   📊 Collected ${likers.length} likers...`);
        
        window.scrollBy(0, window.innerHeight);
        await sleep(CONFIG.scrollDelay);
        scrollCount++;
      }
      
      console.log('');
      console.log(`✅ Collected ${likers.length} likers!`);
      console.log('📋 Likers:', likers.join(', '));
      
      return likers;
    },
    
    // Stop
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Stopped.');
    },
    
    // Stats
    stats: () => {
      console.log('');
      console.log('📊 LIKERS INTERACTION STATS:');
      console.log(`   👥 Followed: ${state.stats.followed}`);
      console.log(`   ⏭️ Skipped: ${state.stats.skipped}`);
      console.log(`   📝 Total processed: ${state.processedUsers.size}`);
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 LIKERS INTERACTION COMMANDS:');
      console.log('');
      console.log('   XActions.Likers.follow()   - Follow likers');
      console.log('   XActions.Likers.collect()  - Just collect usernames');
      console.log('   XActions.Likers.stop()     - Stop following');
      console.log('   XActions.Likers.stats()    - Show statistics');
      console.log('');
      console.log('📍 Make sure you\'re on a likes page first!');
      console.log('   URL: x.com/USER/status/ID/likes');
      console.log('');
    }
  };
  
  console.log('✅ Interact With Likers loaded!');
  console.log('   Run XActions.Likers.follow() to start following.');
  console.log('   Run XActions.Likers.help() for all commands.');
  console.log('');
})();
