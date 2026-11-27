// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 💬 Follow Likers & Engagers
 * ============================================================
 *
 * @name        followEngagers.js
 * @title       Follow Engagers
 * @description Follow the people who liked, reposted or quoted a post, or the recent posts on a profile, with filters and a cap.
 * @category    grow
 * @page        x.com/<username>/status/<id> or x.com/<username>
 * @writes      true
 * @aliases     src/automation/followEngagers.js, scripts/twitter/follow-engagers.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * Find users who engage with specific posts and follow them.
 *
 * 1. Open any X post you want to analyze (or a profile, to use its
 *    most recent posts)
 * 2. Configure CONFIG below
 * 3. Paste browser/followEngagers.js into the DevTools console and press Enter
 *    (src/automation/core.js is optional: when it is pasted first its
 *    logger, storage and selectors are used)
 * 4. Run stopEngager() to stop early
 * ============================================================
 */

(() => {
  // ============================================
  // CORE (optional): use core.js when present, built-ins otherwise
  // ============================================
  const Core = window.XActions?.Core;

  const sleep = Core?.sleep || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  const randomDelay = Core?.randomDelay || ((min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min));
  const log = Core?.log || ((message, type = 'info') => {
    const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
    console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
  });
  const scrollBy = Core?.scrollBy || ((pixels) => window.scrollBy({ top: pixels, behavior: 'smooth' }));
  const clickElement = Core?.clickElement || (async (element) => {
    if (!element) return false;
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);
      element.click();
      return true;
    } catch (e) {
      log(`Click error: ${e.message}`, 'error');
      return false;
    }
  });
  const waitForElement = Core?.waitForElement || (async (selector, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(100);
    }
    return null;
  });
  // Same key layout as core.js storage (xactions_ prefix, JSON values)
  const storage = Core?.storage || {
    get: (key) => {
      try {
        const data = localStorage.getItem('xactions_' + key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('xactions_' + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
  const SELECTORS = Core?.SELECTORS || {
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    tweet: '[data-testid="tweet"]',
    userCell: '[data-testid="UserCell"]',
  };

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // What to scrape: 'likers', 'retweeters', 'quoters', or 'all'
    MODE: 'likers',
    
    // Target posts to analyze (leave empty to use current page)
    // Format: ['https://x.com/user/status/123456']
    TARGET_POSTS: [],
    
    // How many posts to analyze if using a profile
    MAX_POSTS_TO_ANALYZE: 5,
    
    // How many users to follow per post
    MAX_FOLLOWS_PER_POST: 15,
    
    // Total maximum follows
    TOTAL_MAX_FOLLOWS: 20,
    
    // -------- FILTERS --------
    FILTERS: {
      MIN_FOLLOWERS: 50,
      MAX_FOLLOWERS: 50000,
      MUST_HAVE_BIO: false,
      SKIP_PROTECTED: true,
      SKIP_VERIFIED: false,
    },
    
    // -------- TIMING --------
    DELAY_BETWEEN_FOLLOWS: 3000,
    DELAY_BETWEEN_SCROLLS: 2000,
    
    // -------- INTERACTION --------
    INTERACT_AFTER_FOLLOW: false,
    LIKES_PER_USER: 2,
  };

  // ============================================
  // STATE
  // ============================================
  const state = {
    totalFollowed: 0,
    postsAnalyzed: 0,
    skipped: { protected: 0, verified: 0, filtered: 0, alreadyFollowing: 0 },
    isRunning: true,
  };

  // Flat list of followed usernames written by the scripts/twitter variant
  const LEGACY_STORAGE_KEY = 'xactions_followed_engagers';
  const loadLegacyFollowed = () => {
    try {
      const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };
  const legacyFollowed = new Set(loadLegacyFollowed());

  const tracked = {
    followed: new Map(Object.entries(storage.get('engager_followed') || {})),
    processed: new Set([
      ...(storage.get('engager_processed') || []),
      ...Array.from(legacyFollowed, u => String(u).toLowerCase()),
    ]),
  };

  const saveTracked = () => {
    storage.set('engager_followed', Object.fromEntries(tracked.followed));
    storage.set('engager_processed', Array.from(tracked.processed));
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([...legacyFollowed]));
    } catch {
      // storage full or blocked: engager_followed above still has it
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script before it can continue.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        if (target.href !== window.location.href) {
          window.history.pushState({}, '', target.href);
          window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        }
        return;
      }
    } catch { /* fall through to a full page load below */ }
    window.location.href = url;
  };

  const extractPostId = (url) => {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const getUserInfoFromCell = (cell) => {
    const info = {
      username: null,
      isProtected: false,
      isVerified: false,
    };
    
    const link = cell.querySelector('a[href^="/"]');
    if (link) {
      info.username = link.getAttribute('href').replace('/', '').split('/')[0].toLowerCase();
    }
    
    info.isProtected = !!cell.querySelector('[data-testid="icon-lock"]');
    info.isVerified = !!cell.querySelector('[data-testid="icon-verified"]');
    
    return info;
  };

  const meetsFilters = (userInfo) => {
    const { FILTERS } = CONFIG;
    
    if (FILTERS.SKIP_PROTECTED && userInfo.isProtected) {
      state.skipped.protected++;
      return false;
    }
    
    if (FILTERS.SKIP_VERIFIED && userInfo.isVerified) {
      state.skipped.verified++;
      return false;
    }
    
    return true;
  };

  // ============================================
  // OPEN ENGAGEMENT LIST
  // ============================================
  const openEngagementList = async (postUrl, type) => {
    const postId = extractPostId(postUrl);
    if (!postId) {
      log('Could not extract post ID from URL', 'error');
      return false;
    }
    
    // Navigate to the post first
    spaNavigate(postUrl);
    await sleep(3000);
    
    // Find and click the appropriate button based on type
    if (type === 'likers') {
      // Look for the likes count and click it
      const likeLinks = document.querySelectorAll('a[href*="/likes"]');
      for (const link of likeLinks) {
        if (link.href.includes(postId)) {
          await clickElement(link);
          await sleep(2000);
          return true;
        }
      }
      
      // Alternative: navigate directly
      spaNavigate(`${postUrl}/likes`);
      await sleep(3000);
      return true;
    } else if (type === 'retweeters') {
      const retweetLinks = document.querySelectorAll('a[href*="/retweets"]');
      for (const link of retweetLinks) {
        if (link.href.includes(postId) && !link.href.includes('/with_comments')) {
          await clickElement(link);
          await sleep(2000);
          return true;
        }
      }
      
      spaNavigate(`${postUrl}/retweets`);
      await sleep(3000);
      return true;
    } else if (type === 'quoters') {
      spaNavigate(`${postUrl}/retweets/with_comments`);
      await sleep(3000);
      return true;
    }
    
    return false;
  };

  // ============================================
  // PROCESS ENGAGEMENT LIST
  // ============================================
  const processEngagementList = async (postUrl, type) => {
    log(`📍 Processing ${type} for post...`, 'info');
    
    // Open the list
    const opened = await openEngagementList(postUrl, type);
    if (!opened) {
      log(`Could not open ${type} list`, 'error');
      return 0;
    }
    
    // Wait for user cells
    await waitForElement(SELECTORS.userCell, 10000);
    
    let followedThisPost = 0;
    let scrolls = 0;
    const processedThisSession = new Set();
    
    while (
      scrolls < 20 &&
      followedThisPost < CONFIG.MAX_FOLLOWS_PER_POST &&
      state.totalFollowed < CONFIG.TOTAL_MAX_FOLLOWS &&
      state.isRunning
    ) {
      const cells = document.querySelectorAll(SELECTORS.userCell);
      
      for (const cell of cells) {
        if (!state.isRunning) break;
        if (state.totalFollowed >= CONFIG.TOTAL_MAX_FOLLOWS) break;
        if (followedThisPost >= CONFIG.MAX_FOLLOWS_PER_POST) break;
        
        const userInfo = getUserInfoFromCell(cell);
        if (!userInfo.username) continue;
        
        if (processedThisSession.has(userInfo.username)) continue;
        processedThisSession.add(userInfo.username);
        
        if (tracked.followed.has(userInfo.username) || tracked.processed.has(userInfo.username)) {
          continue;
        }
        
        const unfollowBtn = cell.querySelector(SELECTORS.unfollowButton);
        if (unfollowBtn) {
          state.skipped.alreadyFollowing++;
          tracked.processed.add(userInfo.username);
          continue;
        }
        
        if (!meetsFilters(userInfo)) {
          log(`⏭️ Skipping @${userInfo.username} (filtered)`, 'info');
          tracked.processed.add(userInfo.username);
          continue;
        }
        
        const followBtn = cell.querySelector(SELECTORS.followButton);
        if (!followBtn) continue;
        
        await clickElement(followBtn);
        state.totalFollowed++;
        followedThisPost++;
        
        tracked.followed.set(userInfo.username, {
          at: Date.now(),
          source: `${type}`,
          postUrl: postUrl,
        });
        tracked.processed.add(userInfo.username);
        legacyFollowed.add(userInfo.username);
        saveTracked();
        
        log(`✅ Followed @${userInfo.username} [${state.totalFollowed}/${CONFIG.TOTAL_MAX_FOLLOWS}]`, 'success');
        
        await randomDelay(CONFIG.DELAY_BETWEEN_FOLLOWS, CONFIG.DELAY_BETWEEN_FOLLOWS * 1.5);
      }
      
      scrollBy(500);
      scrolls++;
      await sleep(CONFIG.DELAY_BETWEEN_SCROLLS);
    }
    
    return followedThisPost;
  };

  // ============================================
  // GET POSTS FROM PROFILE
  // ============================================
  const getPostsFromProfile = async () => {
    const posts = [];
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    
    for (const tweet of tweets) {
      if (posts.length >= CONFIG.MAX_POSTS_TO_ANALYZE) break;
      
      const link = tweet.querySelector('a[href*="/status/"]');
      if (link) {
        posts.push(link.href);
      }
    }
    
    return posts;
  };

  // ============================================
  // MAIN RUN
  // ============================================
  const run = async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  💬 XActions - Follow Likers & Engagers                  ║
╠═══════════════════════════════════════════════════════════╣
║  Mode: ${CONFIG.MODE.padEnd(15)}                               ║
║  Max per post: ${String(CONFIG.MAX_FOLLOWS_PER_POST).padEnd(5)}                                ║
║  Total max: ${String(CONFIG.TOTAL_MAX_FOLLOWS).padEnd(5)}                                    ║
║                                                           ║
║  Run stopEngager() to stop early.                         ║
╚═══════════════════════════════════════════════════════════╝
    `);

    // Determine which posts to analyze
    let posts = CONFIG.TARGET_POSTS;
    
    if (posts.length === 0) {
      const currentUrl = window.location.href.split('?')[0];
      if (currentUrl.includes('/status/')) {
        posts = [currentUrl];
        log('Using current post', 'info');
      } else {
        log('Getting posts from current page...', 'info');
        posts = await getPostsFromProfile();
      }
    }
    
    if (posts.length === 0) {
      log('⚠️ No posts found! Navigate to a post or profile first.', 'warning');
      return;
    }
    
    log(`Found ${posts.length} posts to analyze`, 'info');
    
    // Determine which types to process
    const types = CONFIG.MODE === 'all' 
      ? ['likers', 'retweeters', 'quoters'] 
      : [CONFIG.MODE];
    
    for (const postUrl of posts) {
      if (!state.isRunning) break;
      if (state.totalFollowed >= CONFIG.TOTAL_MAX_FOLLOWS) break;
      
      log(`\n📍 Analyzing post: ${postUrl.substring(0, 50)}...`, 'info');
      state.postsAnalyzed++;
      
      for (const type of types) {
        if (!state.isRunning) break;
        if (state.totalFollowed >= CONFIG.TOTAL_MAX_FOLLOWS) break;
        
        await processEngagementList(postUrl, type);
      }
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ SESSION COMPLETE                                      ║
╠═══════════════════════════════════════════════════════════╣
║  Posts analyzed: ${String(state.postsAnalyzed).padEnd(5)}                               ║
║  Total Followed: ${String(state.totalFollowed).padEnd(5)}                               ║
║                                                           ║
║  Skipped:                                                 ║
║    Already following: ${String(state.skipped.alreadyFollowing).padEnd(5)}                          ║
║    Protected: ${String(state.skipped.protected).padEnd(5)}                                  ║
║    Verified: ${String(state.skipped.verified).padEnd(5)}                                   ║
╚═══════════════════════════════════════════════════════════╝
    `);
  };

  run();

  window.stopEngager = () => {
    state.isRunning = false;
    log('Stopping engager follow...', 'warning');
  };

  window.XActions = window.XActions || {};
  window.XActions.Engager = {
    state: () => state,
    tracked: () => tracked,
    config: CONFIG,
  };
})();
