// XActions Automation - Keyword Search & Follow
// https://github.com/nirholas/XActions
//
// REQUIRES: Paste core.js first!
//
// HOW TO USE:
// 1. Go to X search page: x.com/search
// 2. Paste core.js, then paste this script
// 3. Configure keywords below and run!

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, rateLimit, SELECTORS, extractUserFromCell, parseCount } = window.XActions.Core;

  // ============================================
  // CONFIGURATION
  // ============================================
  const OPTIONS = {
    // Search terms (will search each one)
    KEYWORDS: ['web3 developer', 'solidity engineer', 'crypto founder'],
    
    // Follow settings
    MAX_FOLLOWS_PER_KEYWORD: 10,
    MAX_FOLLOWS_TOTAL: 30,
    
    // Filters
    MIN_FOLLOWERS: 100,           // Skip users with fewer followers
    MAX_FOLLOWERS: 100000,        // Skip mega accounts
    MUST_HAVE_BIO: true,          // Skip users without bio
    BIO_KEYWORDS: [],             // Bio must contain one of these (empty = any)
    SKIP_IF_FOLLOWING: true,      // Skip users you already follow
    
    // Timing
    DELAY_BETWEEN_FOLLOWS: 3000,
    DELAY_BETWEEN_SEARCHES: 10000,
  };

  // ============================================
  // STATE
  // ============================================
  let followCount = 0;
  const followedUsers = new Map(Object.entries(storage.get('followed_users') || {}));

  // ============================================
  // SAVE FOLLOW DATA
  // ============================================
  const saveFollowedUser = (username) => {
    followedUsers.set(username.toLowerCase(), {
      followedAt: Date.now(),
      followedBack: false,
      checkedAt: null,
    });
    storage.set('followed_users', Object.fromEntries(followedUsers));
  };

  // ============================================
  // NAVIGATION
  // ============================================
  const searchFor = async (keyword) => {
    log(`Searching for: "${keyword}"`, 'action');
    
    // Navigate to search
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=user`;
    window.location.href = searchUrl;
    
    // Wait for page load
    await sleep(3000);
    await waitForElement(SELECTORS.userCell, 10000);
    await sleep(1000);
  };

  // ============================================
  // USER EXTRACTION
  // ============================================
  const extractUserInfo = (userCell) => {
    return extractUserFromCell(userCell);
  };

  // ============================================
  // FILTERS
  // ============================================
  const passesFilters = (userInfo) => {
    if (!userInfo || !userInfo.username) return false;
    
    // Already following
    if (OPTIONS.SKIP_IF_FOLLOWING && userInfo.isFollowing) {
      return false;
    }
    
    // Already in our tracked list
    if (followedUsers.has(userInfo.username.toLowerCase())) {
      return false;
    }
    
    // Bio requirement
    if (OPTIONS.MUST_HAVE_BIO && !userInfo.bio) {
      return false;
    }
    
    // Bio keywords
    if (OPTIONS.BIO_KEYWORDS.length > 0) {
      const bioLower = userInfo.bio.toLowerCase();
      if (!OPTIONS.BIO_KEYWORDS.some(kw => bioLower.includes(kw.toLowerCase()))) {
        return false;
      }
    }
    
    // Follower count (if available)
    if (userInfo.followers > 0) {
      if (userInfo.followers < OPTIONS.MIN_FOLLOWERS) return false;
      if (userInfo.followers > OPTIONS.MAX_FOLLOWERS) return false;
    }
    
    return true;
  };

  // ============================================
  // FOLLOW ACTION
  // ============================================
  const followUser = async (userCell, userInfo) => {
    const followBtn = userCell.querySelector(SELECTORS.followButton);
    if (!followBtn) return false;

    const clicked = await clickElement(followBtn);
    if (clicked) {
      followCount++;
      saveFollowedUser(userInfo.username);
      rateLimit.increment('follow', 'day');
      log(`Followed @${userInfo.username} (${userInfo.displayName}) - #${followCount}`, 'success');
      return true;
    }
    return false;
  };

  // ============================================
  // MAIN PROCESS
  // ============================================
  const processSearchResults = async (keyword) => {
    let keywordFollows = 0;
    let scrolls = 0;
    const maxScrolls = 20;

    while (keywordFollows < OPTIONS.MAX_FOLLOWS_PER_KEYWORD && 
           followCount < OPTIONS.MAX_FOLLOWS_TOTAL &&
           scrolls < maxScrolls) {
      
      // Check rate limit
      if (!rateLimit.check('follow', 100, 'day')) {
        log('Daily follow limit reached', 'warning');
        return;
      }

      const userCells = document.querySelectorAll(SELECTORS.userCell);
      
      for (const cell of userCells) {
        if (keywordFollows >= OPTIONS.MAX_FOLLOWS_PER_KEYWORD) break;
        if (followCount >= OPTIONS.MAX_FOLLOWS_TOTAL) break;

        const userInfo = extractUserInfo(cell);
        if (!passesFilters(userInfo)) continue;

        log(`Found match: @${userInfo.username} [bio:${userInfo._meta?.bioStrategy}] - "${userInfo.bio?.substring(0, 50)}..."`, 'info');
        
        await followUser(cell, userInfo);
        keywordFollows++;
        
        await randomDelay(OPTIONS.DELAY_BETWEEN_FOLLOWS, OPTIONS.DELAY_BETWEEN_FOLLOWS * 1.5);
      }

      // Scroll for more
      scrollBy(600);
      scrolls++;
      await sleep(2000);
    }

    log(`Followed ${keywordFollows} users from "${keyword}"`, 'info');
  };

  // ============================================
  // RUN
  // ============================================
  const run = async () => {
    log('🚀 Starting Keyword Follow Bot...', 'info');
    log(`Keywords: ${OPTIONS.KEYWORDS.join(', ')}`, 'info');
    log(`Max follows: ${OPTIONS.MAX_FOLLOWS_TOTAL}`, 'info');
    log(`Tracking ${followedUsers.size} previously followed users`, 'info');

    for (const keyword of OPTIONS.KEYWORDS) {
      if (followCount >= OPTIONS.MAX_FOLLOWS_TOTAL) break;
      
      await searchFor(keyword);
      await processSearchResults(keyword);
      
      if (OPTIONS.KEYWORDS.indexOf(keyword) < OPTIONS.KEYWORDS.length - 1) {
        log(`Waiting before next search...`, 'info');
        await sleep(OPTIONS.DELAY_BETWEEN_SEARCHES);
      }
    }

    log(`\n✅ Done! Followed ${followCount} new users.`, 'success');
    log(`Total tracked: ${followedUsers.size} users`, 'info');
    log(`Run smartUnfollow.js later to remove non-followers!`, 'info');
  };

  // If we're on search page, start immediately. Otherwise, navigate first.
  if (window.location.pathname.includes('/search')) {
    processSearchResults(OPTIONS.KEYWORDS[0]);
  } else {
    run();
  }

  window.stopKeywordFollow = () => {
    OPTIONS.MAX_FOLLOWS_TOTAL = 0;
    log('Stopping...', 'warning');
  };
})();
