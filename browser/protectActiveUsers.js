// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🛡️ Protect Active Users
 * ============================================================
 *
 * @name        protectActiveUsers.js
 * @title       Protect Active Users
 * @description Scan your recent posts for likers, repliers, reposters and quoters and save them as a protected list that smart unfollow never touches.
 * @category    cleanup
 * @page        x.com/<you>
 * @writes      false
 * @aliases     src/automation/protectActiveUsers.js, scripts/twitter/protect-active-users.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * Protect users who have engaged with your content from being unfollowed.
 *
 * 1. Go to your own profile: https://x.com/YOUR_USERNAME (or any page:
 *    your handle is detected from the side menu)
 * 2. Paste browser/protectActiveUsers.js into the DevTools console and press Enter
 *    (src/automation/core.js is optional: when it is pasted first its
 *    logger, storage and selectors are used)
 * 3. Use with browser/smartUnfollow.js: it will respect the protected list
 *    (saved to localStorage under xactions_protected_users)
 * 4. Run stopProtect() to stop early; viewProtected() and
 *    isProtected('user') to inspect the list; results: window.protectedUsers
 * ============================================================
 */

(() => {
  // ============================================
  // CORE (optional): use core.js when present, built-ins otherwise
  // ============================================
  const Core = window.XActions?.Core;

  const sleep = Core?.sleep || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  const log = Core?.log || ((message, type = 'info') => {
    const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
    console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
  });
  const scrollBy = Core?.scrollBy || ((pixels) => window.scrollBy({ top: pixels, behavior: 'smooth' }));
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
    tweet: '[data-testid="tweet"]',
  };

  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script before the first scan.
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

    // Engagement list scrolling
    SCROLL_DELAY: 1500,          // Wait after each scroll in a likes/reposts/quotes list (ms)
    MAX_SCROLLS_PER_LIST: 10,    // Max scrolls per engagement list
  };

  // ============================================
  // STATE
  // ============================================
  // Map { user: { engagements, count, protectedAt, expiresAt } } through
  // storage (localStorage key xactions_xactions_protected_users)
  const KEY = 'xactions_protected_users';
  // Shared list { savedAt, myUsername, postsScanned, totalProtected, users: [...] }
  // at the raw localStorage key smartUnfollow and whitelist read
  const SHARED_KEY = 'xactions_protected_users';
  
  const state = {
    postsScanned: 0,
    usersProtected: 0,
    engagements: {},
    isRunning: true,
  };

  const getProtectedList = () => {
    const list = storage.get(KEY) || {};
    // Include users saved to the shared list by the scripts/twitter variant
    try {
      const shared = JSON.parse(localStorage.getItem(SHARED_KEY) || 'null');
      const savedAt = (shared?.savedAt && Date.parse(shared.savedAt)) || Date.now();
      (Array.isArray(shared?.users) ? shared.users : []).forEach((u) => {
        const name = u?.username?.toLowerCase();
        if (!name || list[name]) return;
        const engagements = u.engagements || u.engagementTypes || [];
        list[name] = {
          engagements,
          count: u.count ?? u.engagementCount ?? engagements.length,
          tweets: u.tweets || [],
          protectedAt: u.protectedAt || savedAt,
          expiresAt: u.expiresAt || savedAt + (CONFIG.LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
        };
      });
    } catch {
      // unreadable shared list: the storage map above is still complete
    }
    return list;
  };
  
  const saveProtectedList = (list, meta = {}) => {
    storage.set(KEY, list);
    const users = Object.entries(list)
      .map(([username, data]) => ({
        username,
        engagementCount: data.count,
        engagementTypes: [...new Set(data.engagements || [])],
        tweets: data.tweets || [],
        ...data,
      }))
      .sort((a, b) => b.engagementCount - a.engagementCount);
    const result = {
      savedAt: new Date().toISOString(),
      myUsername: meta.myUsername || null,
      postsScanned: meta.postsScanned || 0,
      totalProtected: users.length,
      users,
    };
    try {
      localStorage.setItem(SHARED_KEY, JSON.stringify(result));
    } catch (e) {
      log(`Could not save the shared protected list: ${e.message}`, 'error');
    }
    return result;
  };

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

    // Your own profile page
    const profile = path.match(/^\/(\w+)\/?$/);
    if (profile && !['home', 'explore', 'search', 'notifications', 'messages', 'i'].includes(profile[1].toLowerCase())) {
      return profile[1].toLowerCase();
    }
    
    return null;
  };

  // ============================================
  // GET MY POSTS
  // ============================================
  const getMyPosts = async (username) => {
    log('📍 Fetching your recent posts...', 'info');
    
    spaNavigate(`https://x.com/${username}`);
    await sleep(3000);
    
    const posts = [];
    let scrolls = 0;
    const maxScrolls = 20;
    
    while (posts.length < CONFIG.POSTS_TO_SCAN && scrolls < maxScrolls) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      
      for (const tweet of tweets) {
        if (posts.length >= CONFIG.POSTS_TO_SCAN) break;
        
        // Make sure it's my post (not a retweet). Reposts render socialContext
        // inside an <a>; pinned posts don't. Structural check works on any UI
        // language; the English text is a fallback.
        const retweetIndicator = tweet.querySelector('[data-testid="socialContext"]');
        if (retweetIndicator && retweetIndicator.closest('a') !== null) continue;
        if (retweetIndicator?.textContent?.includes('reposted')) continue;

        // Author must be you
        const authorLink = tweet.querySelector('a[href^="/"][role="link"]');
        const author = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0].toLowerCase() : null;
        if (author && author !== username.toLowerCase()) continue;

        // Prefer the permalink around the timestamp: the first /status/ link
        // can belong to a quoted tweet
        const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
        const link = timeAnchor || tweet.querySelector('a[href*="/status/"]');
        const id = link?.href.match(/\/status\/(\d+)/)?.[1];
        const postUrl = id ? `https://x.com/${username}/status/${id}` : null;
        if (postUrl && !posts.includes(postUrl)) {
          posts.push(postUrl);
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
  let myUsername = null;

  const scanPostEngagers = async (postUrl) => {
    const engagers = new Map();
    const postId = postUrl.match(/status\/(\d+)/)?.[1];
    if (!postId) return engagers;
    
    // Scan likers
    if (CONFIG.ENGAGEMENT_TYPES.likers) {
      log('  Scanning likers...', 'action');
      spaNavigate(`${postUrl}/likes`);
      await sleep(2000);
      
      const users = await scrapeUserList();
      users.forEach(u => {
        if (!engagers.has(u)) engagers.set(u, []);
        engagers.get(u).push('like');
      });
      log(`   ❤️ Found ${users.size} likers`, 'info');
    }
    
    // Scan retweeters
    if (CONFIG.ENGAGEMENT_TYPES.retweeters) {
      log('  Scanning retweeters...', 'action');
      spaNavigate(`${postUrl}/retweets`);
      await sleep(2000);
      
      const users = await scrapeUserList();
      users.forEach(u => {
        if (!engagers.has(u)) engagers.set(u, []);
        engagers.get(u).push('retweet');
      });
      log(`   🔄 Found ${users.size} retweeters`, 'info');
    }
    
    // Scan quoters
    if (CONFIG.ENGAGEMENT_TYPES.quoters) {
      log('  Scanning quoters...', 'action');
      spaNavigate(`${postUrl}/retweets/with_comments`);
      await sleep(2000);
      
      const users = await scrapeUserList();
      users.forEach(u => {
        if (!engagers.has(u)) engagers.set(u, []);
        engagers.get(u).push('quote');
      });
      log(`   💬 Found ${users.size} quoters`, 'info');
    }
    
    // Scan repliers (from the post itself)
    if (CONFIG.ENGAGEMENT_TYPES.repliers) {
      log('  Scanning repliers...', 'action');
      spaNavigate(postUrl);
      await sleep(2000);
      
      // Scroll a bit to load replies
      for (let i = 0; i < 5; i++) {
        scrollBy(500);
        await sleep(1000);
      }
      
      let repliers = 0;
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      for (const tweet of tweets) {
        const link = tweet.querySelector('a[href^="/"]');
        if (link) {
          const username = link.getAttribute('href').replace('/', '').toLowerCase();
          if (username && !username.includes('/') && username !== myUsername) {
            if (!engagers.has(username)) engagers.set(username, []);
            engagers.get(username).push('reply');
            repliers++;
          }
        }
      }
      log(`   💬 Found ${repliers} repliers`, 'info');
    }

    // Never list yourself as your own engager
    if (myUsername) engagers.delete(myUsername);
    
    return engagers;
  };

  // ============================================
  // SCRAPE USER LIST
  // ============================================
  const scrapeUserList = async () => {
    const users = new Set();
    let scrolls = 0;
    let prev = 0;
    
    while (scrolls < CONFIG.MAX_SCROLLS_PER_LIST) {
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
      await sleep(CONFIG.SCROLL_DELAY);
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
    myUsername = username.toLowerCase();
    
    // Get posts
    const posts = await getMyPosts(username);
    
    // Scan each post
    const allEngagers = new Map();
    const engagedTweets = new Map(); // user -> post URLs
    
    for (const postUrl of posts) {
      if (!state.isRunning) break;
      
      log(`\n📍 Scanning post ${state.postsScanned + 1}/${posts.length}`, 'info');
      state.postsScanned++;
      
      const postEngagers = await scanPostEngagers(postUrl);
      
      // Merge into allEngagers
      for (const [user, types] of postEngagers) {
        if (!allEngagers.has(user)) allEngagers.set(user, []);
        allEngagers.get(user).push(...types);
        if (!engagedTweets.has(user)) engagedTweets.set(user, []);
        engagedTweets.get(user).push(postUrl);
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
          tweets: engagedTweets.get(user) || [],
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
    
    const result = saveProtectedList(merged, { myUsername: username, postsScanned: state.postsScanned });
    window.protectedUsers = result;

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

    console.log('\n💡 smartUnfollow will respect this list!');
    console.log('💡 Access via: window.protectedUsers');
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

  window.XActions = window.XActions || {};
  window.XActions.ActiveUsers = {
    getProtected: getProtectedList,
    isProtected: (u) => {
      const list = getProtectedList();
      const user = list[u.toLowerCase().replace('@', '')];
      return user && user.expiresAt > Date.now();
    },
    clearProtected: () => {
      saveProtectedList({}, { myUsername });
      log('Protected list cleared', 'success');
    },
  };
})();
