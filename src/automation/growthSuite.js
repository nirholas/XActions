// UnfollowX Automation - Growth Automation Suite
// https://github.com/nirholas/UnfollowX
//
// REQUIRES: Paste core.js first!
//
// All-in-one growth automation combining:
// - Keyword-based following
// - Auto-liking relevant content
// - Smart unfollowing after X days
// - Engagement on target accounts
//
// HOW TO USE:
// 1. Open X home page
// 2. Paste core.js, then paste this script
// 3. Configure your growth strategy below
// 4. Run and let it work!

(() => {
  if (!window.UnfollowX?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, rateLimit, SELECTORS } = window.UnfollowX.Core;

  // ============================================
  // GROWTH STRATEGY CONFIGURATION
  // ============================================
  const STRATEGY = {
    // -------- TARGETING --------
    // Keywords to search for (niche targeting)
    KEYWORDS: [
      'web3 developer',
      'solidity engineer', 
      'defi builder',
    ],
    
    // Accounts to engage with (their followers are your targets)
    TARGET_ACCOUNTS: [
      // 'vitalikbuterin',
      // 'elonmusk',
    ],
    
    // -------- ACTIONS --------
    ACTIONS: {
      FOLLOW: true,              // Follow users from keyword search
      LIKE: true,                // Like posts in your feed
      UNFOLLOW: true,            // Unfollow non-followers after grace period
    },
    
    // -------- LIMITS (per session) --------
    LIMITS: {
      FOLLOWS: 20,
      LIKES: 30,
      UNFOLLOWS: 15,
    },
    
    // -------- TIMING --------
    TIMING: {
      UNFOLLOW_AFTER_DAYS: 3,    // Days to wait before unfollowing
      DELAY_BETWEEN_ACTIONS: 3000,
      SESSION_DURATION_MINUTES: 30,
    },
    
    // -------- FILTERS --------
    FILTERS: {
      MIN_FOLLOWERS: 50,
      MAX_FOLLOWERS: 50000,
      MUST_HAVE_BIO: true,
      SKIP_PRIVATE: true,
      LANGUAGE: null,            // null = any, or 'en', 'es', etc.
    },
  };

  // ============================================
  // STATE
  // ============================================
  const state = {
    follows: 0,
    likes: 0,
    unfollows: 0,
    startTime: Date.now(),
    isRunning: true,
  };

  const tracked = {
    followed: new Map(Object.entries(storage.get('growth_followed') || {})),
    liked: new Set(storage.get('growth_liked') || []),
  };

  // ============================================
  // SAVE STATE
  // ============================================
  const saveTracked = () => {
    storage.set('growth_followed', Object.fromEntries(tracked.followed));
    storage.set('growth_liked', Array.from(tracked.liked));
  };

  // ============================================
  // SESSION CHECK
  // ============================================
  const isSessionExpired = () => {
    const elapsed = (Date.now() - state.startTime) / 1000 / 60;
    return elapsed >= STRATEGY.TIMING.SESSION_DURATION_MINUTES;
  };

  const checkLimits = () => {
    return {
      canFollow: state.follows < STRATEGY.LIMITS.FOLLOWS,
      canLike: state.likes < STRATEGY.LIMITS.LIKES,
      canUnfollow: state.unfollows < STRATEGY.LIMITS.UNFOLLOWS,
    };
  };

  // ============================================
  // FOLLOW ACTION
  // ============================================
  const doFollow = async (userCell) => {
    if (!STRATEGY.ACTIONS.FOLLOW) return false;
    if (!checkLimits().canFollow) return false;

    const followBtn = userCell.querySelector(SELECTORS.followButton);
    if (!followBtn) return false;

    const link = userCell.querySelector('a[href^="/"]');
    const username = link?.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username || tracked.followed.has(username)) return false;

    await clickElement(followBtn);
    state.follows++;
    tracked.followed.set(username, { at: Date.now(), source: 'growth' });
    saveTracked();
    
    log(`Followed @${username} (${state.follows}/${STRATEGY.LIMITS.FOLLOWS})`, 'success');
    return true;
  };

  // ============================================
  // LIKE ACTION
  // ============================================
  const doLike = async (tweet) => {
    if (!STRATEGY.ACTIONS.LIKE) return false;
    if (!checkLimits().canLike) return false;

    const likeBtn = tweet.querySelector(SELECTORS.likeButton);
    if (!likeBtn) return false;

    const tweetLink = tweet.querySelector('a[href*="/status/"]');
    const tweetId = tweetLink?.href?.match(/status\/(\d+)/)?.[1];
    if (!tweetId || tracked.liked.has(tweetId)) return false;

    await clickElement(likeBtn);
    state.likes++;
    tracked.liked.add(tweetId);
    saveTracked();
    
    log(`Liked tweet (${state.likes}/${STRATEGY.LIMITS.LIKES})`, 'success');
    return true;
  };

  // ============================================
  // SMART UNFOLLOW
  // ============================================
  const findExpiredFollows = () => {
    const expired = [];
    const now = Date.now();
    const threshold = STRATEGY.TIMING.UNFOLLOW_AFTER_DAYS * 24 * 60 * 60 * 1000;

    for (const [username, data] of tracked.followed) {
      if (now - data.at > threshold && !data.followedBack) {
        expired.push(username);
      }
    }

    return expired;
  };

  const doUnfollow = async (userCell, username) => {
    if (!STRATEGY.ACTIONS.UNFOLLOW) return false;
    if (!checkLimits().canUnfollow) return false;

    const unfollowBtn = userCell.querySelector(SELECTORS.unfollowButton);
    if (!unfollowBtn) return false;

    await clickElement(unfollowBtn);
    await sleep(500);
    
    const confirmBtn = await waitForElement(SELECTORS.confirmButton, 2000);
    if (confirmBtn) await clickElement(confirmBtn);
    
    state.unfollows++;
    tracked.followed.delete(username);
    saveTracked();
    
    log(`Unfollowed @${username} (${state.unfollows}/${STRATEGY.LIMITS.UNFOLLOWS})`, 'action');
    return true;
  };

  // ============================================
  // PHASES
  // ============================================
  
  // Phase 1: Search and Follow
  const phaseFollow = async () => {
    if (!STRATEGY.ACTIONS.FOLLOW) return;
    log('📍 Phase 1: Keyword Follow', 'info');

    for (const keyword of STRATEGY.KEYWORDS) {
      if (!state.isRunning || !checkLimits().canFollow) break;

      log(`Searching: "${keyword}"`, 'action');
      window.location.href = `https://twitter.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=user`;
      await sleep(3000);
      await waitForElement(SELECTORS.userCell, 10000);

      let scrolls = 0;
      while (scrolls < 10 && checkLimits().canFollow && state.isRunning) {
        const cells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of cells) {
          if (!checkLimits().canFollow) break;
          
          // Check if already following
          if (cell.querySelector(SELECTORS.unfollowButton)) continue;
          
          await doFollow(cell);
          await randomDelay(STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS, STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS * 1.5);
        }

        scrollBy(600);
        scrolls++;
        await sleep(2000);
      }
    }
  };

  // Phase 2: Like Timeline
  const phaseLike = async () => {
    if (!STRATEGY.ACTIONS.LIKE) return;
    log('📍 Phase 2: Timeline Engagement', 'info');

    window.location.href = 'https://twitter.com/home';
    await sleep(3000);

    let scrolls = 0;
    while (scrolls < 20 && checkLimits().canLike && state.isRunning) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      
      for (const tweet of tweets) {
        if (!checkLimits().canLike) break;
        if (tweet.querySelector(SELECTORS.unlikeButton)) continue; // Already liked
        
        await doLike(tweet);
        await randomDelay(STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS, STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS * 1.5);
      }

      scrollBy(600);
      scrolls++;
      await sleep(2000);
    }
  };

  // Phase 3: Smart Unfollow
  const phaseUnfollow = async () => {
    if (!STRATEGY.ACTIONS.UNFOLLOW) return;
    log('📍 Phase 3: Smart Unfollow', 'info');

    const expired = findExpiredFollows();
    if (expired.length === 0) {
      log('No expired follows to clean up', 'info');
      return;
    }

    log(`Found ${expired.length} users past ${STRATEGY.TIMING.UNFOLLOW_AFTER_DAYS}-day threshold`, 'info');

    // Go to following page
    const username = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')
      ?.textContent?.match(/@(\w+)/)?.[1];
    
    if (username) {
      window.location.href = `https://twitter.com/${username}/following`;
      await sleep(3000);

      const expiredSet = new Set(expired);
      let scrolls = 0;

      while (scrolls < 50 && checkLimits().canUnfollow && state.isRunning) {
        const cells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of cells) {
          if (!checkLimits().canUnfollow) break;
          
          const link = cell.querySelector('a[href^="/"]');
          const cellUser = link?.getAttribute('href')?.replace('/', '').toLowerCase();
          
          if (cellUser && expiredSet.has(cellUser)) {
            await doUnfollow(cell, cellUser);
            await randomDelay(STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS, STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS * 1.5);
          }
        }

        scrollBy(600);
        scrolls++;
        await sleep(2000);
      }
    }
  };

  // ============================================
  // MAIN RUN
  // ============================================
  const run = async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🚀 UnfollowX Growth Automation                           ║
╠═══════════════════════════════════════════════════════════╣
║  Keywords: ${STRATEGY.KEYWORDS.slice(0, 3).join(', ').substring(0, 30).padEnd(30)}  ║
║  Session: ${STRATEGY.TIMING.SESSION_DURATION_MINUTES} minutes                                 ║
║                                                           ║
║  Limits:                                                  ║
║    Follows:   ${String(STRATEGY.LIMITS.FOLLOWS).padEnd(5)} | Likes:    ${String(STRATEGY.LIMITS.LIKES).padEnd(5)}       ║
║    Unfollows: ${String(STRATEGY.LIMITS.UNFOLLOWS).padEnd(5)} | After:    ${STRATEGY.TIMING.UNFOLLOW_AFTER_DAYS} days       ║
║                                                           ║
║  Run stopGrowth() to stop early.                          ║
╚═══════════════════════════════════════════════════════════╝
    `);

    log(`Tracking ${tracked.followed.size} followed users`, 'info');

    // Run phases
    await phaseFollow();
    
    if (state.isRunning && !isSessionExpired()) {
      await phaseLike();
    }
    
    if (state.isRunning && !isSessionExpired()) {
      await phaseUnfollow();
    }

    // Summary
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ SESSION COMPLETE                                      ║
╠═══════════════════════════════════════════════════════════╣
║  Follows:   ${String(state.follows).padEnd(5)}                                      ║
║  Likes:     ${String(state.likes).padEnd(5)}                                      ║
║  Unfollows: ${String(state.unfollows).padEnd(5)}                                      ║
║                                                           ║
║  Total tracked: ${String(tracked.followed.size).padEnd(5)} users                        ║
╚═══════════════════════════════════════════════════════════╝
    `);
  };

  run();

  window.stopGrowth = () => {
    state.isRunning = false;
    log('Stopping growth automation...', 'warning');
  };

  window.UnfollowX.Growth = {
    state: () => state,
    tracked: () => tracked,
    strategy: STRATEGY,
  };
})();
