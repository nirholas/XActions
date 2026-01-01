// XActions Automation - Follow Likers & Commenters
// https://github.com/nirholas/XActions
//
// REQUIRES: Paste core.js first!
//
// Find users who engage with specific posts and follow them
//
// HOW TO USE:
// 1. Open any X post you want to analyze
// 2. Paste core.js, then paste this script
// 3. Configure and run

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, SELECTORS } = window.XActions.Core;

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // What to scrape: 'likers', 'retweeters', 'quoters', or 'all'
    MODE: 'likers',
    
    // Target posts to analyze (leave empty to use current page)
    // Format: ['https://twitter.com/user/status/123456']
    TARGET_POSTS: [],
    
    // How many posts to analyze if using a profile
    MAX_POSTS_TO_ANALYZE: 5,
    
    // How many users to follow per post
    MAX_FOLLOWS_PER_POST: 15,
    
    // Total maximum follows
    TOTAL_MAX_FOLLOWS: 30,
    
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

  const tracked = {
    followed: new Map(Object.entries(storage.get('engager_followed') || {})),
    processed: new Set(storage.get('engager_processed') || []),
  };

  const saveTracked = () => {
    storage.set('engager_followed', Object.fromEntries(tracked.followed));
    storage.set('engager_processed', Array.from(tracked.processed));
  };

  // ============================================
  // HELPERS
  // ============================================
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
      info.username = link.getAttribute('href').replace('/', '').toLowerCase();
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
    window.location.href = postUrl;
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
      window.location.href = `${postUrl}/likes`;
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
      
      window.location.href = `${postUrl}/retweets`;
      await sleep(3000);
      return true;
    } else if (type === 'quoters') {
      window.location.href = `${postUrl}/retweets/with_comments`;
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
      const currentUrl = window.location.href;
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

  window.XActions.Engager = {
    state: () => state,
    tracked: () => tracked,
    config: CONFIG,
  };
})();
