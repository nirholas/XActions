// GENERATED FILE: a copy of browser/followTargetUsers.js, written by scripts/build-script-manifest.mjs. Edit browser/followTargetUsers.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        followTargetUsers.js
 * @title       Follow Target Users
 * @description Follow the followers or following of target accounts, filtered by follower count, bio and account type, with a total cap.
 * @category    grow
 * @page        x.com/<username>/followers or x.com/<username>/following or x.com/home
 * @writes      true
 * @aliases     src/automation/followTargetUsers.js, scripts/twitter/follow-target-users.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// XActions Automation - Follow Followers/Following of Target Users
// https://github.com/nirholas/XActions
//
// Runs on its own. If src/automation/core.js was pasted first, its helpers,
// selectors and storage are used; otherwise built-in equivalents with the
// same storage keys are used.
//
// Follow the followers or following of any target account
//
// HOW TO USE:
// 1. Either open a target's list (https://x.com/TARGET/followers or
//    https://x.com/TARGET/following) and leave TARGET_ACCOUNTS empty to work
//    on that page, or open X home and add target accounts below
// 2. Configure the options below
// 3. Paste browser/followTargetUsers.js and press Enter
// 4. Run stopTargetFollow() to stop early

(() => {
  window.XActions = window.XActions || {};

  // ─── Helpers: core.js when present, built-in equivalents otherwise ───
  const Core = window.XActions.Core || {};
  const sleep = Core.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const randomDelay = Core.randomDelay || ((min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min));
  const log = Core.log || ((message, type = 'info') => {
    const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
    console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
  });
  const scrollBy = Core.scrollBy || ((pixels) => window.scrollBy({ top: pixels, behavior: 'smooth' }));
  const waitForElement = Core.waitForElement || (async (selector, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(100);
    }
    return null;
  });
  const clickElement = Core.clickElement || (async (element) => {
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
  const SELECTORS = Core.SELECTORS || {
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweet: '[data-testid="tweet"]',
    userCell: '[data-testid="UserCell"]',
    userFollowIndicator: '[data-testid="userFollowIndicator"]',
    userDescription: '[data-testid="UserDescription"]',
  };
  // Same localStorage prefix as core.js (xactions_), so tracking is shared.
  const storage = Core.storage || {
    get: (key) => {
      try {
        const data = localStorage.getItem('xactions_' + key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        log(`Storage get error: ${e.message}`, 'error');
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('xactions_' + key, JSON.stringify(value));
        return true;
      } catch (e) {
        log(`Storage set error: ${e.message}`, 'error');
        return false;
      }
    },
  };
  const extractUserFromCell = Core.extractUserFromCell || ((cell) => {
    if (!cell) return null;
    try {
      const href = cell.querySelector('a[href^="/"]')?.getAttribute('href') || '';
      const username = (href.match(/^\/([^/]+)$/) || [, ''])[1].toLowerCase();
      const bio = cell.querySelector(SELECTORS.userDescription)?.textContent.trim() ||
        [...cell.querySelectorAll('[dir="auto"]:not([data-testid])')]
          .map((el) => el.textContent.trim())
          .find((t) => t && !t.startsWith('@') && t.length >= 10) || '';
      const followerMatch = (cell.textContent || '').match(/(\d[\d,]*\.?\d*[KMB]?)\s*Follower/i);
      return {
        username,
        bio,
        followers: followerMatch ? parseCount(followerMatch[1]) : 0,
        isFollowing: !!cell.querySelector(SELECTORS.unfollowButton),
        followsYou: !!cell.querySelector(SELECTORS.userFollowIndicator),
        isVerified: !!cell.querySelector('[data-testid="icon-verified"]') || !!cell.querySelector('svg[aria-label*="Verified"]'),
        isProtected: !!cell.querySelector('[data-testid="icon-lock"]'),
      };
    } catch (e) {
      log(`extractUserFromCell error: ${e.message}`, 'error');
      return null;
    }
  });

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Target accounts - follow their followers or following
    TARGET_ACCOUNTS: [
      // Add usernames without @
      // 'elonmusk',
      // 'naval',
    ],
    
    // Which list to scrape: 'followers' or 'following'
    LIST_TYPE: 'followers',
    
    // How many users to follow per target account
    MAX_FOLLOWS_PER_ACCOUNT: 20,
    
    // Total maximum follows across all targets
    TOTAL_MAX_FOLLOWS: 30,
    
    // -------- FILTERS --------
    FILTERS: {
      // Follower count range (0 = no limit)
      MIN_FOLLOWERS: 100,
      MAX_FOLLOWERS: 50000,
      
      // Following count (detect potential follow-for-follow accounts)
      MIN_FOLLOWING: 10,
      MAX_FOLLOWING: 5000,
      
      // Ratio filter (followers/following) - skip accounts with bad ratios
      MIN_RATIO: 0.1,  // At least 10% as many followers as following
      
      // Bio filters
      MUST_HAVE_BIO: true,
      BIO_KEYWORDS: [],  // Empty = any bio, otherwise must contain one of these
      BIO_BLACKLIST: [], // Skip bios containing any of these, e.g. ['bot', 'spam', 'promo']
      
      // Skip private/protected accounts
      SKIP_PROTECTED: true,
      
      // Skip verified accounts (often don't follow back)
      SKIP_VERIFIED: false,
    },
    
    // -------- TIMING --------
    DELAY_BETWEEN_FOLLOWS: 3000,
    DELAY_BETWEEN_SCROLLS: 2000,
    MAX_SCROLLS_PER_ACCOUNT: 30,
    
    // -------- INTERACTION --------
    // After following, also like some of their posts
    INTERACT_AFTER_FOLLOW: false,
    LIKES_PER_USER: 2,
  };

  // ============================================
  // STATE
  // ============================================
  const state = {
    totalFollowed: 0,
    skipped: { protected: 0, verified: 0, filtered: 0, alreadyFollowing: 0 },
    isRunning: true,
  };

  const tracked = {
    followed: new Map(Object.entries(storage.get('targetfollow_followed') || {})),
    processed: new Set(storage.get('targetfollow_processed') || []),
  };

  // Usernames followed by the older standalone variant of this tool
  // (localStorage xactions_followed_targets); skipped, and kept up to date.
  const followedTargets = new Set(storage.get('followed_targets') || []);

  const saveTracked = () => {
    storage.set('targetfollow_followed', Object.fromEntries(tracked.followed));
    storage.set('targetfollow_processed', Array.from(tracked.processed));
    storage.set('followed_targets', Array.from(followedTargets));
  };

  // ============================================
  // HELPERS
  // ============================================
  const parseCount = (text) => {
    if (!text) return 0;
    text = text.toLowerCase().replace(/,/g, '');
    if (text.includes('k')) return parseFloat(text) * 1000;
    if (text.includes('m')) return parseFloat(text) * 1000000;
    return parseInt(text) || 0;
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
    
    if (FILTERS.MIN_FOLLOWERS && userInfo.followers < FILTERS.MIN_FOLLOWERS) {
      state.skipped.filtered++;
      return false;
    }
    
    if (FILTERS.MAX_FOLLOWERS && userInfo.followers > FILTERS.MAX_FOLLOWERS) {
      state.skipped.filtered++;
      return false;
    }
    
    if (FILTERS.MUST_HAVE_BIO && !userInfo.bio) {
      state.skipped.filtered++;
      return false;
    }
    
    if (FILTERS.BIO_KEYWORDS.length > 0) {
      const bioLower = (userInfo.bio || '').toLowerCase();
      const hasKeyword = FILTERS.BIO_KEYWORDS.some(kw => bioLower.includes(kw.toLowerCase()));
      if (!hasKeyword) {
        state.skipped.filtered++;
        return false;
      }
    }
    
    if (FILTERS.BIO_BLACKLIST.length > 0) {
      const bioLower = (userInfo.bio || '').toLowerCase();
      if (FILTERS.BIO_BLACKLIST.some(kw => bioLower.includes(kw.toLowerCase()))) {
        state.skipped.filtered++;
        return false;
      }
    }
    
    return true;
  };

  // ============================================
  // GET USER INFO FROM CELL
  // ============================================
  const getUserInfoFromCell = (cell) => {
    const extracted = extractUserFromCell(cell);
    if (!extracted) {
      return { username: null, bio: null, isProtected: false, isVerified: false, followers: 0 };
    }
    return {
      username: extracted.username || null,
      bio: extracted.bio || null,
      isProtected: extracted.isProtected || false,
      isVerified: extracted.isVerified || false,
      followers: extracted.followers || 0,
    };
  };

  // ============================================
  // INTERACT WITH USER (like their posts)
  // ============================================
  const interactWithUser = async (username) => {
    if (!CONFIG.INTERACT_AFTER_FOLLOW) return;
    
    log(`Interacting with @${username}...`, 'action');
    
    // Navigate to their profile
    window.location.href = `https://x.com/${username}`;
    await sleep(3000);
    
    let liked = 0;
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    
    for (const tweet of tweets) {
      if (liked >= CONFIG.LIKES_PER_USER) break;
      
      const likeBtn = tweet.querySelector(SELECTORS.likeButton);
      if (!likeBtn) continue;
      
      // Check if not already liked
      if (tweet.querySelector(SELECTORS.unlikeButton)) continue;
      
      await clickElement(likeBtn);
      liked++;
      await sleep(1000);
    }
    
    if (liked > 0) {
      log(`Liked ${liked} posts from @${username}`, 'success');
    }
  };

  // ============================================
  // PROCESS TARGET ACCOUNT
  // ============================================
  const processTargetAccount = async (targetUsername, listType = CONFIG.LIST_TYPE) => {
    log(`\n📍 Processing @${targetUsername}'s ${listType}...`, 'info');
    
    // Navigate to the list (unless this page already is that list)
    const url = `https://x.com/${targetUsername}/${listType}`;
    if (window.location.pathname.toLowerCase().replace(/\/$/, '') !== `/${targetUsername}/${listType}`.toLowerCase()) {
      window.location.href = url;
      await sleep(3000);
    }
    
    // Wait for user cells to load
    await waitForElement(SELECTORS.userCell, 10000);
    
    let followedThisAccount = 0;
    let scrolls = 0;
    const processedThisSession = new Set();
    
    while (
      scrolls < CONFIG.MAX_SCROLLS_PER_ACCOUNT &&
      followedThisAccount < CONFIG.MAX_FOLLOWS_PER_ACCOUNT &&
      state.totalFollowed < CONFIG.TOTAL_MAX_FOLLOWS &&
      state.isRunning
    ) {
      const cells = document.querySelectorAll(SELECTORS.userCell);
      
      for (const cell of cells) {
        if (!state.isRunning) break;
        if (state.totalFollowed >= CONFIG.TOTAL_MAX_FOLLOWS) break;
        if (followedThisAccount >= CONFIG.MAX_FOLLOWS_PER_ACCOUNT) break;
        
        const userInfo = getUserInfoFromCell(cell);
        if (!userInfo.username) continue;
        
        // Skip if already processed this session
        if (processedThisSession.has(userInfo.username)) continue;
        processedThisSession.add(userInfo.username);
        
        // Skip if already in our tracked list
        if (tracked.followed.has(userInfo.username) || tracked.processed.has(userInfo.username) || followedTargets.has(userInfo.username)) {
          continue;
        }
        
        // Check if already following
        const unfollowBtn = cell.querySelector(SELECTORS.unfollowButton);
        if (unfollowBtn) {
          state.skipped.alreadyFollowing++;
          tracked.processed.add(userInfo.username);
          continue;
        }
        
        // Check filters
        if (!meetsFilters(userInfo)) {
          tracked.processed.add(userInfo.username);
          continue;
        }
        
        // Find follow button
        const followBtn = cell.querySelector(SELECTORS.followButton);
        if (!followBtn) continue;
        
        // Follow the user
        await clickElement(followBtn);
        state.totalFollowed++;
        followedThisAccount++;
        
        tracked.followed.set(userInfo.username, {
          at: Date.now(),
          source: `${targetUsername}/${listType}`,
        });
        tracked.processed.add(userInfo.username);
        followedTargets.add(userInfo.username);
        saveTracked();
        
        log(`✅ Followed @${userInfo.username} [${state.totalFollowed}/${CONFIG.TOTAL_MAX_FOLLOWS}]`, 'success');
        
        // Interact if enabled
        if (CONFIG.INTERACT_AFTER_FOLLOW) {
          await interactWithUser(userInfo.username);
          // Navigate back to the list
          window.location.href = url;
          await sleep(3000);
        }
        
        await randomDelay(CONFIG.DELAY_BETWEEN_FOLLOWS, CONFIG.DELAY_BETWEEN_FOLLOWS * 1.5);
      }
      
      // Scroll for more
      scrollBy(600);
      scrolls++;
      await sleep(CONFIG.DELAY_BETWEEN_SCROLLS);
    }
    
    log(`Finished @${targetUsername}: followed ${followedThisAccount} users`, 'info');
    return followedThisAccount;
  };

  // ============================================
  // MAIN RUN
  // ============================================
  const run = async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  👥 XActions - Follow Target's ${CONFIG.LIST_TYPE.padEnd(10)}              ║
╠═══════════════════════════════════════════════════════════╣
║  Targets: ${String(CONFIG.TARGET_ACCOUNTS.length).padEnd(5)} accounts                            ║
║  List type: ${CONFIG.LIST_TYPE.padEnd(12)}                             ║
║  Max per account: ${String(CONFIG.MAX_FOLLOWS_PER_ACCOUNT).padEnd(5)}                              ║
║  Total max: ${String(CONFIG.TOTAL_MAX_FOLLOWS).padEnd(5)}                                    ║
║                                                           ║
║  Run stopTargetFollow() to stop early.                    ║
╚═══════════════════════════════════════════════════════════╝
    `);

    if (CONFIG.TARGET_ACCOUNTS.length === 0) {
      // No targets configured: work on the followers/following page this tab is on.
      const pathMatch = window.location.pathname.match(/^\/([^/]+)\/(followers|following)\/?$/);
      if (!pathMatch) {
        log('⚠️ No target accounts configured! Add usernames to CONFIG.TARGET_ACCOUNTS, or open https://x.com/TARGET/followers and run again', 'warning');
        return;
      }
      log(`👤 Target account: @${pathMatch[1]} (this page), list type: ${pathMatch[2]}`, 'info');
      await processTargetAccount(pathMatch[1], pathMatch[2]);
    }

    for (const target of CONFIG.TARGET_ACCOUNTS) {
      if (!state.isRunning) break;
      if (state.totalFollowed >= CONFIG.TOTAL_MAX_FOLLOWS) break;
      
      await processTargetAccount(target);
    }

    // Summary
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ SESSION COMPLETE                                      ║
╠═══════════════════════════════════════════════════════════╣
║  Total Followed: ${String(state.totalFollowed).padEnd(5)}                                ║
║                                                           ║
║  Skipped:                                                 ║
║    Already following: ${String(state.skipped.alreadyFollowing).padEnd(5)}                          ║
║    Protected: ${String(state.skipped.protected).padEnd(5)}                                  ║
║    Verified: ${String(state.skipped.verified).padEnd(5)}                                   ║
║    Filtered: ${String(state.skipped.filtered).padEnd(5)}                                   ║
║                                                           ║
║  Total tracked: ${String(tracked.followed.size).padEnd(5)} users                          ║
╚═══════════════════════════════════════════════════════════╝
    `);
  };

  run();

  window.stopTargetFollow = () => {
    state.isRunning = false;
    log('Stopping target follow...', 'warning');
  };

  window.XActions.TargetFollow = {
    state: () => state,
    tracked: () => tracked,
    config: CONFIG,
  };
})();
