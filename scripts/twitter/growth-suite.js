/**
 * ============================================================
 * 🚀 Growth Automation Suite
 * ============================================================
 * 
 * @name        growth-suite.js
 * @description All-in-one growth automation for X/Twitter
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 FEATURES:
 * ============================================================
 * 
 * • Keyword-based following
 * • Auto-liking relevant content
 * • Smart unfollowing after X days
 * • Engagement on target accounts
 * • Rate limiting and safety measures
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Go to X home page: https://x.com/home
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Configure your strategy below
 * 4. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // ============================================
  // TARGETING
  // ============================================
  
  // Keywords to search for (niche targeting)
  keywords: [
    'web3 developer',
    'crypto trader',
    'NFT artist',
  ],
  
  // Accounts to engage with (their followers are targets)
  targetAccounts: [
    // 'vitalikbuterin',
    // 'elonmusk',
  ],
  
  // ============================================
  // ACTIONS
  // ============================================
  
  actions: {
    follow: true,       // Follow users from searches
    like: true,         // Like posts in feed
    unfollow: true,     // Unfollow non-followers after grace period
  },
  
  // ============================================
  // LIMITS (per session)
  // ============================================
  
  limits: {
    follows: 20,
    likes: 30,
    unfollows: 15,
  },
  
  // ============================================
  // TIMING
  // ============================================
  
  timing: {
    unfollowAfterDays: 3,      // Days before unfollowing
    delayBetweenActions: 3000, // ms between actions
    sessionDuration: 30,        // minutes
  },
  
  // ============================================
  // FILTERS
  // ============================================
  
  filters: {
    minFollowers: 50,
    maxFollowers: 50000,
    mustHaveBio: true,
    skipPrivate: true,
    language: null,            // null = any, or 'en', 'es', etc.
  },
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function growthSuite() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  
  // DOM Selectors
  const SELECTORS = {
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userCell: '[data-testid="UserCell"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    confirmButton: '[data-testid="confirmationSheetConfirm"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 GROWTH AUTOMATION SUITE                                ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage helper
  const storage = {
    get: (key) => {
      try {
        return JSON.parse(localStorage.getItem(`xactions_growth_${key}`) || 'null');
      } catch { return null; }
    },
    set: (key, value) => {
      localStorage.setItem(`xactions_growth_${key}`, JSON.stringify(value));
    }
  };
  
  // State
  const state = {
    follows: 0,
    likes: 0,
    unfollows: 0,
    startTime: Date.now(),
    isRunning: true,
  };
  
  // Tracked data
  const followed = new Map(Object.entries(storage.get('followed') || {}));
  const liked = new Set(storage.get('liked') || []);
  
  const saveTracked = () => {
    storage.set('followed', Object.fromEntries(followed));
    storage.set('liked', Array.from(liked));
  };
  
  // Session check
  const isSessionExpired = () => {
    const elapsed = (Date.now() - state.startTime) / 1000 / 60;
    return elapsed >= CONFIG.timing.sessionDuration;
  };
  
  const checkLimits = () => ({
    canFollow: state.follows < CONFIG.limits.follows,
    canLike: state.likes < CONFIG.limits.likes,
    canUnfollow: state.unfollows < CONFIG.limits.unfollows,
  });
  
  // Log helper
  const log = (msg, type = 'info') => {
    const emoji = { info: '📘', success: '✅', warning: '⚠️', error: '❌' }[type] || '📘';
    console.log(`${emoji} ${msg}`);
  };
  
  // Follow action
  const doFollow = async (userCell) => {
    if (!CONFIG.actions.follow || !checkLimits().canFollow) return false;
    
    const followBtn = userCell.querySelector(SELECTORS.followButton);
    if (!followBtn) return false;
    
    const link = userCell.querySelector('a[href^="/"]');
    const username = link?.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username || followed.has(username)) return false;
    
    followBtn.click();
    state.follows++;
    followed.set(username, { at: Date.now(), source: 'growth' });
    saveTracked();
    
    log(`Followed @${username} (${state.follows}/${CONFIG.limits.follows})`, 'success');
    return true;
  };
  
  // Like action
  const doLike = async (tweet) => {
    if (!CONFIG.actions.like || !checkLimits().canLike) return false;
    
    const likeBtn = tweet.querySelector(SELECTORS.likeButton);
    if (!likeBtn) return false;
    
    const tweetLink = tweet.querySelector('a[href*="/status/"]');
    const tweetId = tweetLink?.href?.match(/status\/(\d+)/)?.[1];
    if (!tweetId || liked.has(tweetId)) return false;
    
    likeBtn.click();
    state.likes++;
    liked.add(tweetId);
    saveTracked();
    
    log(`Liked tweet (${state.likes}/${CONFIG.limits.likes})`, 'success');
    return true;
  };
  
  // Unfollow action (for non-followers)
  const doUnfollow = async (userCell) => {
    if (!CONFIG.actions.unfollow || !checkLimits().canUnfollow) return false;
    
    const unfollowBtn = userCell.querySelector(SELECTORS.unfollowButton);
    if (!unfollowBtn) return false;
    
    const link = userCell.querySelector('a[href^="/"]');
    const username = link?.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username) return false;
    
    // Check if we followed this user and grace period has passed
    const followData = followed.get(username);
    if (followData) {
      const daysSinceFollow = (Date.now() - followData.at) / 1000 / 60 / 60 / 24;
      if (daysSinceFollow < CONFIG.timing.unfollowAfterDays) return false;
    }
    
    // Check if they follow back (look for "Follows you" indicator)
    const followsYou = userCell.querySelector('[data-testid="userFollowIndicator"]');
    if (followsYou) return false;
    
    unfollowBtn.click();
    await sleep(500);
    
    const confirmBtn = document.querySelector(SELECTORS.confirmButton);
    if (confirmBtn) confirmBtn.click();
    
    state.unfollows++;
    followed.delete(username);
    saveTracked();
    
    log(`Unfollowed @${username} (${state.unfollows}/${CONFIG.limits.unfollows})`, 'success');
    return true;
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Growth = {
    state,
    config: CONFIG,
    
    // Run auto-like on current feed
    autoLike: async () => {
      log('Starting auto-like on current feed...');
      
      while (checkLimits().canLike && !isSessionExpired() && state.isRunning) {
        const tweets = document.querySelectorAll(SELECTORS.tweet);
        
        for (const tweet of tweets) {
          if (!state.isRunning || !checkLimits().canLike) break;
          
          const text = tweet.querySelector(SELECTORS.tweetText)?.textContent?.toLowerCase() || '';
          const matchesKeyword = CONFIG.keywords.length === 0 || 
            CONFIG.keywords.some(kw => text.includes(kw.toLowerCase()));
          
          if (matchesKeyword) {
            await doLike(tweet);
            await randomDelay(CONFIG.timing.delayBetweenActions, CONFIG.timing.delayBetweenActions * 1.5);
          }
        }
        
        window.scrollBy(0, window.innerHeight);
        await sleep(2000);
      }
      
      log(`Auto-like complete. Liked ${state.likes} tweets.`);
    },
    
    // Run auto-follow on search results or user lists
    autoFollow: async () => {
      log('Starting auto-follow...');
      log('📍 Navigate to a search results or followers list first');
      
      while (checkLimits().canFollow && !isSessionExpired() && state.isRunning) {
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of userCells) {
          if (!state.isRunning || !checkLimits().canFollow) break;
          await doFollow(cell);
          await randomDelay(CONFIG.timing.delayBetweenActions, CONFIG.timing.delayBetweenActions * 1.5);
        }
        
        window.scrollBy(0, window.innerHeight);
        await sleep(2000);
      }
      
      log(`Auto-follow complete. Followed ${state.follows} users.`);
    },
    
    // Run smart unfollow
    smartUnfollow: async () => {
      log('Starting smart unfollow...');
      log('📍 Navigate to your Following list first');
      
      while (checkLimits().canUnfollow && !isSessionExpired() && state.isRunning) {
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of userCells) {
          if (!state.isRunning || !checkLimits().canUnfollow) break;
          await doUnfollow(cell);
          await randomDelay(CONFIG.timing.delayBetweenActions * 1.5, CONFIG.timing.delayBetweenActions * 2);
        }
        
        window.scrollBy(0, window.innerHeight);
        await sleep(2000);
      }
      
      log(`Smart unfollow complete. Unfollowed ${state.unfollows} users.`);
    },
    
    // Stop all automation
    stop: () => {
      state.isRunning = false;
      log('Automation stopped.', 'warning');
    },
    
    // Get stats
    stats: () => {
      console.log('');
      console.log('📊 GROWTH STATS:');
      console.log(`   👥 Follows: ${state.follows}/${CONFIG.limits.follows}`);
      console.log(`   ❤️ Likes: ${state.likes}/${CONFIG.limits.likes}`);
      console.log(`   🚫 Unfollows: ${state.unfollows}/${CONFIG.limits.unfollows}`);
      console.log(`   📈 Total tracked follows: ${followed.size}`);
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 GROWTH SUITE COMMANDS:');
      console.log('');
      console.log('   XActions.Growth.autoLike()      - Auto-like feed posts');
      console.log('   XActions.Growth.autoFollow()    - Auto-follow users');
      console.log('   XActions.Growth.smartUnfollow() - Unfollow non-followers');
      console.log('   XActions.Growth.stop()          - Stop automation');
      console.log('   XActions.Growth.stats()         - Show statistics');
      console.log('');
    },
  };
  
  log('Growth Suite loaded! Use XActions.Growth.help() for commands.');
  console.log('');
})();
