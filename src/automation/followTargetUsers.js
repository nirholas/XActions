// XActions Automation - Follow Followers/Following of Target Users
// https://github.com/nirholas/XActions
//
// REQUIRES: Paste core.js first!
//
// Follow the followers or following of any target account
//
// HOW TO USE:
// 1. Open X home page
// 2. Paste core.js, then paste this script
// 3. Configure target accounts below
// 4. Run and let it work!

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, SELECTORS, extractUserFromCell } = window.XActions.Core;

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
    TOTAL_MAX_FOLLOWS: 50,
    
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

  const saveTracked = () => {
    storage.set('targetfollow_followed', Object.fromEntries(tracked.followed));
    storage.set('targetfollow_processed', Array.from(tracked.processed));
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
  const processTargetAccount = async (targetUsername) => {
    log(`\n📍 Processing @${targetUsername}'s ${CONFIG.LIST_TYPE}...`, 'info');
    
    // Navigate to the list
    const url = `https://x.com/${targetUsername}/${CONFIG.LIST_TYPE}`;
    window.location.href = url;
    await sleep(3000);
    
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
        if (tracked.followed.has(userInfo.username) || tracked.processed.has(userInfo.username)) {
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
          source: `${targetUsername}/${CONFIG.LIST_TYPE}`,
        });
        tracked.processed.add(userInfo.username);
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
      log('⚠️ No target accounts configured! Add usernames to CONFIG.TARGET_ACCOUNTS', 'warning');
      return;
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
