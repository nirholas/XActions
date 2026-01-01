// XActions Automation - Don't Unfollow Active Users
// https://github.com/nirholas/XActions
//
// REQUIRES: Paste core.js first!
//
// Protect users who have engaged with your content from being unfollowed
//
// HOW TO USE:
// 1. Paste core.js first
// 2. Paste this script to scan your posts for active engagers
// 3. Use with smartUnfollow.js - it will respect the protected list

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, scrollBy, storage, SELECTORS } = window.XActions.Core;

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Your username (will auto-detect if not set)
    USERNAME: null,
    
    // How many of your recent posts to scan
    POSTS_TO_SCAN: 10,
    
    // Types of engagement to consider as "active"
    ENGAGEMENT_TYPES: {
      likers: true,       // People who liked your posts
      repliers: true,     // People who replied to your posts
      retweeters: true,   // People who retweeted your posts
      quoters: true,      // People who quoted your posts
    },
    
    // How far back to look (days)
    // Users who engaged within this period are protected
    LOOKBACK_DAYS: 30,
    
    // Minimum engagements to be considered "active"
    // User must have engaged at least this many times
    MIN_ENGAGEMENTS: 1,
    
    // Also protect users you recently followed
    PROTECT_RECENT_FOLLOWS: true,
    RECENT_FOLLOW_DAYS: 7,
  };

  // ============================================
  // STATE
  // ============================================
  const KEY = 'xactions_protected_users';
  
  const state = {
    postsScanned: 0,
    usersProtected: 0,
    engagements: {},
    isRunning: true,
  };

  const getProtectedList = () => storage.get(KEY) || {};
  
  const saveProtectedList = (list) => storage.set(KEY, list);

  // ============================================
  // DETECT CURRENT USER
  // ============================================
  const detectUsername = () => {
    if (CONFIG.USERNAME) return CONFIG.USERNAME;
    
    const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (switcher) {
      const match = switcher.textContent.match(/@(\w+)/);
      if (match) return match[1].toLowerCase();
    }
    
    const path = window.location.pathname;
    if (path.match(/^\/\w+\/(followers|following|status)/)) {
      return path.split('/')[1].toLowerCase();
    }
    
    return null;
  };

  // ============================================
  // GET MY POSTS
  // ============================================
  const getMyPosts = async (username) => {
    log('📍 Fetching your recent posts...', 'info');
    
    window.location.href = `https://twitter.com/${username}`;
    await sleep(3000);
    
    const posts = [];
    let scrolls = 0;
    const maxScrolls = 20;
    
    while (posts.length < CONFIG.POSTS_TO_SCAN && scrolls < maxScrolls) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      
      for (const tweet of tweets) {
        if (posts.length >= CONFIG.POSTS_TO_SCAN) break;
        
        // Make sure it's my post (not a retweet)
        const retweetIndicator = tweet.querySelector('[data-testid="socialContext"]');
        if (retweetIndicator?.textContent?.includes('reposted')) continue;
        
        const link = tweet.querySelector('a[href*="/status/"]');
        if (link && !posts.includes(link.href)) {
          posts.push(link.href);
        }
      }
      
      scrollBy(600);
      scrolls++;
      await sleep(1500);
    }
    
    log(`Found ${posts.length} posts to scan`, 'info');
    return posts;
  };

  // ============================================
  // SCAN POST FOR ENGAGERS
  // ============================================
  const scanPostEngagers = async (postUrl) => {
    const engagers = new Map();
    const postId = postUrl.match(/status\/(\d+)/)?.[1];
    if (!postId) return engagers;
    
    // Scan likers
    if (CONFIG.ENGAGEMENT_TYPES.likers) {
      log('  Scanning likers...', 'action');
      window.location.href = `${postUrl}/likes`;
      await sleep(2000);
      
      const users = await scrapeUserList();
      users.forEach(u => {
        if (!engagers.has(u)) engagers.set(u, []);
        engagers.get(u).push('like');
      });
    }
    
    // Scan retweeters
    if (CONFIG.ENGAGEMENT_TYPES.retweeters) {
      log('  Scanning retweeters...', 'action');
      window.location.href = `${postUrl}/retweets`;
      await sleep(2000);
      
      const users = await scrapeUserList();
      users.forEach(u => {
        if (!engagers.has(u)) engagers.set(u, []);
        engagers.get(u).push('retweet');
      });
    }
    
    // Scan quoters
    if (CONFIG.ENGAGEMENT_TYPES.quoters) {
      log('  Scanning quoters...', 'action');
      window.location.href = `${postUrl}/retweets/with_comments`;
      await sleep(2000);
      
      const users = await scrapeUserList();
      users.forEach(u => {
        if (!engagers.has(u)) engagers.set(u, []);
        engagers.get(u).push('quote');
      });
    }
    
    // Scan repliers (from the post itself)
    if (CONFIG.ENGAGEMENT_TYPES.repliers) {
      log('  Scanning repliers...', 'action');
      window.location.href = postUrl;
      await sleep(2000);
      
      // Scroll a bit to load replies
      for (let i = 0; i < 5; i++) {
        scrollBy(500);
        await sleep(1000);
      }
      
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      for (const tweet of tweets) {
        const link = tweet.querySelector('a[href^="/"]');
        if (link) {
          const username = link.getAttribute('href').replace('/', '').toLowerCase();
          if (username && !username.includes('/')) {
            if (!engagers.has(username)) engagers.set(username, []);
            engagers.get(username).push('reply');
          }
        }
      }
    }
    
    return engagers;
  };

  // ============================================
  // SCRAPE USER LIST
  // ============================================
  const scrapeUserList = async () => {
    const users = new Set();
    let scrolls = 0;
    let prev = 0;
    
    while (scrolls < 10) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      
      for (const cell of cells) {
        const link = cell.querySelector('a[href^="/"]');
        if (link) {
          const username = link.getAttribute('href').replace('/', '').toLowerCase();
          if (username && !username.includes('/')) {
            users.add(username);
          }
        }
      }
      
      if (users.size === prev) break;
      prev = users.size;
      
      scrollBy(500);
      scrolls++;
      await sleep(1000);
    }
    
    return users;
  };

  // ============================================
  // MAIN RUN
  // ============================================
  const run = async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🛡️ XActions - Protect Active Users                      ║
╠═══════════════════════════════════════════════════════════╣
║  Posts to scan: ${String(CONFIG.POSTS_TO_SCAN).padEnd(5)}                                ║
║  Lookback: ${String(CONFIG.LOOKBACK_DAYS).padEnd(5)} days                               ║
║  Min engagements: ${String(CONFIG.MIN_ENGAGEMENTS).padEnd(5)}                              ║
║                                                           ║
║  Run stopProtect() to stop early.                         ║
╚═══════════════════════════════════════════════════════════╝
    `);

    const username = detectUsername();
    if (!username) {
      log('⚠️ Could not detect your username!', 'error');
      return;
    }
    log(`Detected username: @${username}`, 'info');
    
    // Get posts
    const posts = await getMyPosts(username);
    
    // Scan each post
    const allEngagers = new Map();
    
    for (const postUrl of posts) {
      if (!state.isRunning) break;
      
      log(`\n📍 Scanning post ${state.postsScanned + 1}/${posts.length}`, 'info');
      state.postsScanned++;
      
      const postEngagers = await scanPostEngagers(postUrl);
      
      // Merge into allEngagers
      for (const [user, types] of postEngagers) {
        if (!allEngagers.has(user)) allEngagers.set(user, []);
        allEngagers.get(user).push(...types);
      }
    }
    
    // Filter by minimum engagements
    const protectedUsers = {};
    const now = Date.now();
    
    for (const [user, engagements] of allEngagers) {
      if (engagements.length >= CONFIG.MIN_ENGAGEMENTS) {
        protectedUsers[user] = {
          engagements: engagements,
          count: engagements.length,
          protectedAt: now,
          expiresAt: now + (CONFIG.LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
        };
        state.usersProtected++;
      }
    }
    
    // Merge with existing protected list
    const existing = getProtectedList();
    const merged = { ...existing, ...protectedUsers };
    
    // Remove expired entries
    for (const [user, data] of Object.entries(merged)) {
      if (data.expiresAt && data.expiresAt < now) {
        delete merged[user];
      }
    }
    
    saveProtectedList(merged);

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ SCAN COMPLETE                                         ║
╠═══════════════════════════════════════════════════════════╣
║  Posts scanned: ${String(state.postsScanned).padEnd(5)}                                ║
║  New protected: ${String(state.usersProtected).padEnd(5)}                                ║
║  Total protected: ${String(Object.keys(merged).length).padEnd(5)}                              ║
║                                                           ║
║  Protected users will not be unfollowed by smartUnfollow  ║
║  Protection expires after ${CONFIG.LOOKBACK_DAYS} days                        ║
╚═══════════════════════════════════════════════════════════╝
    `);
    
    // Show top engagers
    const sorted = [...allEngagers.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    if (sorted.length > 0) {
      console.log('\n🌟 Top 10 Active Engagers:');
      sorted.forEach(([user, engs], i) => {
        console.log(`  ${i + 1}. @${user}: ${engs.length} engagements (${[...new Set(engs)].join(', ')})`);
      });
    }
  };

  run();

  window.stopProtect = () => {
    state.isRunning = false;
    log('Stopping scan...', 'warning');
  };
  
  // View protected users
  window.viewProtected = () => {
    const list = getProtectedList();
    const users = Object.keys(list);
    console.log(`\n🛡️ Protected Users (${users.length}):`);
    users.forEach(u => {
      const data = list[u];
      console.log(`  @${u}: ${data.count} engagements, expires ${new Date(data.expiresAt).toLocaleDateString()}`);
    });
  };
  
  // Check if user is protected
  window.isProtected = (username) => {
    const list = getProtectedList();
    const user = list[username.toLowerCase().replace('@', '')];
    if (user && user.expiresAt > Date.now()) {
      console.log(`✅ @${username} is protected (${user.count} engagements)`);
      return true;
    }
    console.log(`❌ @${username} is not protected`);
    return false;
  };

  window.XActions.ActiveUsers = {
    getProtected: getProtectedList,
    isProtected: (u) => {
      const list = getProtectedList();
      const user = list[u.toLowerCase().replace('@', '')];
      return user && user.expiresAt > Date.now();
    },
    clearProtected: () => {
      saveProtectedList({});
      log('Protected list cleared', 'success');
    },
  };
})();
