// GENERATED FILE: a copy of browser/growthSuite.js, written by scripts/build-script-manifest.mjs. Edit browser/growthSuite.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🚀 Growth Automation Suite
 * ============================================================
 * 
 * @name        growthSuite.js
 * @title       Growth Suite
 * @description All-in-one growth automation: keyword follow, feed likes and unfollowing non-followers after a grace period, with per-session caps.
 * @category    grow
 * @page        x.com/home
 * @writes      true
 * @aliases     src/automation/growthSuite.js, scripts/twitter/growth-suite.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
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
 * 4. Paste browser/growthSuite.js and press Enter
 * 5. Run a command (XActions.Growth.help() lists them), or
 *    XActions.Growth.run() for the full session: keyword follow, timeline
 *    likes, then unfollowing tracked follows past the grace period.
 *    Set autoRun: true to start the full session on paste.
 * 
 * Stop: window.stopGrowth() or XActions.Growth.stop()
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // Start the full session (XActions.Growth.run()) as soon as the script is
  // pasted. false = load the commands and wait for one to be called.
  autoRun: false,
  
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
    
    // The first /status/ link can belong to a quoted tweet; the anchor around
    // the timestamp is the tweet's own permalink
    const timeEl = tweet.querySelector('time');
    const tweetLink = (timeEl && timeEl.closest('a[href*="/status/"]')) || tweet.querySelector('a[href*="/status/"]');
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
    
    // The confirmation sheet can take a moment to render: wait up to 2s
    let confirmBtn = document.querySelector(SELECTORS.confirmButton);
    for (let waited = 0; !confirmBtn && waited < 2000; waited += 100) {
      await sleep(100);
      confirmBtn = document.querySelector(SELECTORS.confirmButton);
    }
    if (confirmBtn) confirmBtn.click();
    
    state.unfollows++;
    followed.delete(username);
    saveTracked();
    
    log(`Unfollowed @${username} (${state.unfollows}/${CONFIG.limits.unfollows})`, 'success');
    return true;
  };
  
  // Same-origin navigation through X's router: a full page load
  // (location.href) would destroy this console script mid-session.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch { /* fall through to a full page load below */ }
    window.location.href = url;
  };
  
  const waitForElement = async (selector, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(100);
    }
    return null;
  };
  
  // ============================================
  // FULL SESSION: three phases, run by XActions.Growth.run()
  // ============================================
  
  // Phase 1: Search each keyword (People tab) and follow
  const phaseFollow = async () => {
    if (!CONFIG.actions.follow) return;
    log('📍 Phase 1: Keyword Follow');
    
    for (const keyword of CONFIG.keywords) {
      if (!state.isRunning || !checkLimits().canFollow) break;
      
      log(`Searching: "${keyword}"`);
      spaNavigate(`https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=user`);
      await sleep(3000);
      await waitForElement(SELECTORS.userCell, 10000);
      
      let scrolls = 0;
      while (scrolls < 10 && checkLimits().canFollow && state.isRunning) {
        const cells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of cells) {
          if (!state.isRunning || !checkLimits().canFollow) break;
          
          // Check if already following
          if (cell.querySelector(SELECTORS.unfollowButton)) continue;
          
          await doFollow(cell);
          await randomDelay(CONFIG.timing.delayBetweenActions, CONFIG.timing.delayBetweenActions * 1.5);
        }
        
        window.scrollBy(0, 600);
        scrolls++;
        await sleep(2000);
      }
    }
  };
  
  // Phase 2: Like the home timeline
  const phaseLike = async () => {
    if (!CONFIG.actions.like) return;
    log('📍 Phase 2: Timeline Engagement');
    
    spaNavigate('https://x.com/home');
    await sleep(3000);
    
    let scrolls = 0;
    while (scrolls < 20 && checkLimits().canLike && state.isRunning) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      
      for (const tweet of tweets) {
        if (!state.isRunning || !checkLimits().canLike) break;
        if (tweet.querySelector(SELECTORS.unlikeButton)) continue; // Already liked
        
        await doLike(tweet);
        await randomDelay(CONFIG.timing.delayBetweenActions, CONFIG.timing.delayBetweenActions * 1.5);
      }
      
      window.scrollBy(0, 600);
      scrolls++;
      await sleep(2000);
    }
  };
  
  // Phase 3: Unfollow accounts this suite followed more than
  // unfollowAfterDays ago that do not follow back
  const phaseUnfollow = async () => {
    if (!CONFIG.actions.unfollow) return;
    log('📍 Phase 3: Smart Unfollow');
    
    const threshold = CONFIG.timing.unfollowAfterDays * 24 * 60 * 60 * 1000;
    const expired = [...followed].filter(([, data]) => Date.now() - data.at > threshold).map(([username]) => username);
    if (expired.length === 0) {
      log('No expired follows to clean up');
      return;
    }
    
    log(`Found ${expired.length} users past ${CONFIG.timing.unfollowAfterDays}-day threshold`);
    
    // Go to your own following page
    const username = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')
      ?.textContent?.match(/@(\w+)/)?.[1];
    if (!username) {
      log('Could not find your handle in the sidebar; skipping unfollow phase', 'warning');
      return;
    }
    
    spaNavigate(`https://x.com/${username}/following`);
    await sleep(3000);
    
    const expiredSet = new Set(expired);
    let scrolls = 0;
    
    while (scrolls < 50 && checkLimits().canUnfollow && state.isRunning) {
      const cells = document.querySelectorAll(SELECTORS.userCell);
      
      for (const cell of cells) {
        if (!state.isRunning || !checkLimits().canUnfollow) break;
        
        const link = cell.querySelector('a[href^="/"]');
        const cellUser = link?.getAttribute('href')?.replace('/', '').toLowerCase();
        
        if (cellUser && expiredSet.has(cellUser)) {
          await doUnfollow(cell);
          await randomDelay(CONFIG.timing.delayBetweenActions, CONFIG.timing.delayBetweenActions * 1.5);
        }
      }
      
      window.scrollBy(0, 600);
      scrolls++;
      await sleep(2000);
    }
  };
  
  const run = async () => {
    state.isRunning = true;
    state.startTime = Date.now();
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🚀 XActions Growth Automation                           ║
╠═══════════════════════════════════════════════════════════╣
║  Keywords: ${CONFIG.keywords.slice(0, 3).join(', ').substring(0, 30).padEnd(30)}  ║
║  Session: ${CONFIG.timing.sessionDuration} minutes                                 ║
║                                                           ║
║  Limits:                                                  ║
║    Follows:   ${String(CONFIG.limits.follows).padEnd(5)} | Likes:    ${String(CONFIG.limits.likes).padEnd(5)}       ║
║    Unfollows: ${String(CONFIG.limits.unfollows).padEnd(5)} | After:    ${CONFIG.timing.unfollowAfterDays} days       ║
║                                                           ║
║  Run stopGrowth() to stop early.                          ║
╚═══════════════════════════════════════════════════════════╝
    `);
    
    log(`Tracking ${followed.size} followed users`);
    
    await phaseFollow();
    
    if (state.isRunning && !isSessionExpired()) {
      await phaseLike();
    }
    
    if (state.isRunning && !isSessionExpired()) {
      await phaseUnfollow();
    }
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ SESSION COMPLETE                                      ║
╠═══════════════════════════════════════════════════════════╣
║  Follows:   ${String(state.follows).padEnd(5)}                                      ║
║  Likes:     ${String(state.likes).padEnd(5)}                                      ║
║  Unfollows: ${String(state.unfollows).padEnd(5)}                                      ║
║                                                           ║
║  Total tracked: ${String(followed.size).padEnd(5)} users                        ║
╚═══════════════════════════════════════════════════════════╝
    `);
  };
  
  const stop = () => {
    state.isRunning = false;
    log('Automation stopped.', 'warning');
  };
  window.stopGrowth = stop;
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Growth = {
    state: () => state,
    tracked: () => ({ followed, liked }),
    config: CONFIG,
    strategy: CONFIG,
    
    // Full session: keyword follow, timeline likes, expired-follow unfollow
    run,
    
    // Run auto-like on current feed
    autoLike: async () => {
      log('Starting auto-like on current feed...');
      state.isRunning = true; // re-arm: stop() latches this false for every action

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
      state.isRunning = true; // re-arm: stop() latches this false for every action

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
      state.isRunning = true; // re-arm: stop() latches this false for every action

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
    stop,
    
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
      console.log('   XActions.Growth.run()           - Full session: follow, like, unfollow');
      console.log('   XActions.Growth.autoLike()      - Auto-like feed posts');
      console.log('   XActions.Growth.autoFollow()    - Auto-follow users');
      console.log('   XActions.Growth.smartUnfollow() - Unfollow non-followers');
      console.log('   XActions.Growth.stop()          - Stop automation (or stopGrowth())');
      console.log('   XActions.Growth.stats()         - Show statistics');
      console.log('   XActions.Growth.state()         - Current counters');
      console.log('   XActions.Growth.tracked()       - Tracked follows and likes');
      console.log('');
    },
  };
  
  log('Growth Suite loaded! Use XActions.Growth.help() for commands.');
  console.log('');
  
  if (CONFIG.autoRun) await run();
})();
