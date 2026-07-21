// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🛡️ Protect Active Users
 * ============================================================
 * 
 * @name        protect-active-users.js
 * @description Scan your posts to find engaged users, protecting them from unfollow
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your own profile: https://x.com/YOUR_USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. It will scan your recent posts and find engaged users
 * 5. These users are saved to localStorage for smart-unfollow to respect
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // Number of your recent posts to scan
  postsToScan: 10,
  
  // Which engagement types to track
  engagementTypes: {
    likers: true,
    repliers: true,
    retweeters: true,
    quoters: false // Requires navigating to quote tweets
  },
  
  // Only protect users who engaged within this many days
  lookbackDays: 30,
  
  // Minimum engagements to be protected
  minEngagements: 1,
  
  // Scroll delay when loading lists
  scrollDelay: 1500,
  
  // Max scrolls per engagement list
  maxScrollsPerList: 10
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function protectActiveUsers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script before the first scan.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) {}
    window.location.href = url;
  };
  
  const $tweet = 'article[data-testid="tweet"]';
  const $userCell = '[data-testid="UserCell"]';
  
  const STORAGE_KEY = 'xactions_protected_users';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🛡️ PROTECT ACTIVE USERS                                   ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Get username from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const myUsername = pathMatch ? pathMatch[1] : null;
  
  if (!myUsername || ['home', 'explore', 'search'].includes(myUsername)) {
    console.error('❌ ERROR: Must be on YOUR profile page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME');
    return;
  }
  
  console.log(`👤 Scanning posts from: @${myUsername}`);
  console.log(`📊 Posts to scan: ${CONFIG.postsToScan}`);
  console.log('');
  
  // Engagement tracking
  const engagementMap = new Map(); // username -> { count, types, tweets }
  
  /**
   * Get username from user cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    return link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
  }
  
  /**
   * Scrape users from current page (likes/retweets list)
   */
  async function scrapeUsers(type) {
    const users = new Set();
    let scrolls = 0;
    
    while (scrolls < CONFIG.maxScrollsPerList) {
      document.querySelectorAll($userCell).forEach(cell => {
        const username = getUsername(cell);
        if (username && username !== myUsername) {
          users.add(username);
        }
      });
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;
    }
    
    return [...users];
  }
  
  /**
   * Add engagement for users
   */
  function addEngagement(users, type, tweetUrl) {
    users.forEach(username => {
      if (!engagementMap.has(username)) {
        engagementMap.set(username, {
          count: 0,
          types: new Set(),
          tweets: []
        });
      }
      
      const data = engagementMap.get(username);
      data.count++;
      data.types.add(type);
      if (!data.tweets.includes(tweetUrl)) {
        data.tweets.push(tweetUrl);
      }
    });
  }
  
  // Get my recent tweets
  console.log('🔍 Finding your recent posts...');
  console.log('');
  
  const myTweets = [];
  const seenTweets = new Set();
  let scrolls = 0;
  
  while (myTweets.length < CONFIG.postsToScan && scrolls < 20) {
    document.querySelectorAll($tweet).forEach(tweet => {
      // Check if it's my tweet
      const authorLink = tweet.querySelector('a[href^="/"][role="link"]');
      const author = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0].toLowerCase() : null;
      
      if (author !== myUsername.toLowerCase()) return;
      
      // Get tweet ID. Prefer the permalink around the timestamp: the first
      // /status/ link can belong to a quoted tweet.
      const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
      const tweetLink = timeAnchor || tweet.querySelector('a[href*="/status/"]');
      if (!tweetLink) return;

      const match = tweetLink.href.match(/\/status\/(\d+)/);
      if (!match || seenTweets.has(match[1])) return;

      // Check if it's a retweet: reposts render socialContext inside an <a>;
      // pinned posts don't. Structural check works on any UI language.
      const socialContext = tweet.querySelector('[data-testid="socialContext"]');
      const isRetweet = !!socialContext && socialContext.closest('a') !== null;
      if (isRetweet) return;
      
      seenTweets.add(match[1]);
      myTweets.push({
        id: match[1],
        url: `https://x.com/${myUsername}/status/${match[1]}`
      });
    });
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(1000);
    scrolls++;
  }
  
  console.log(`📊 Found ${myTweets.length} of your posts`);
  console.log('');
  
  // Scan each tweet for engagers
  for (let i = 0; i < Math.min(myTweets.length, CONFIG.postsToScan); i++) {
    const tweet = myTweets[i];
    console.log(`🔍 Scanning post ${i + 1}/${CONFIG.postsToScan}: ${tweet.url}`);
    
    // Navigate to tweet (SPA navigation keeps this script alive)
    spaNavigate(tweet.url);
    await sleep(2000);
    
    // Get likers
    if (CONFIG.engagementTypes.likers) {
      const likesLink = document.querySelector('a[href$="/likes"]');
      if (likesLink) {
        likesLink.click();
        await sleep(1500);
        
        const likers = await scrapeUsers('like');
        addEngagement(likers, 'like', tweet.url);
        console.log(`   ❤️ Found ${likers.length} likers`);
        
        window.history.back();
        await sleep(1000);
      }
    }
    
    // Get retweeters
    if (CONFIG.engagementTypes.retweeters) {
      const retweetsLink = document.querySelector('a[href$="/retweets"]');
      if (retweetsLink) {
        retweetsLink.click();
        await sleep(1500);
        
        const retweeters = await scrapeUsers('retweet');
        addEngagement(retweeters, 'retweet', tweet.url);
        console.log(`   🔄 Found ${retweeters.length} retweeters`);
        
        window.history.back();
        await sleep(1000);
      }
    }
    
    // Get repliers (from the tweet page itself)
    if (CONFIG.engagementTypes.repliers) {
      const repliers = new Set();
      document.querySelectorAll($tweet).forEach(replyTweet => {
        const authorLink = replyTweet.querySelector('a[href^="/"][role="link"]');
        const author = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0] : null;
        if (author && author.toLowerCase() !== myUsername.toLowerCase()) {
          repliers.add(author);
        }
      });
      
      addEngagement([...repliers], 'reply', tweet.url);
      console.log(`   💬 Found ${repliers.size} repliers`);
    }
  }
  
  // Filter by minimum engagements
  const protectedUsers = [];
  engagementMap.forEach((data, username) => {
    if (data.count >= CONFIG.minEngagements) {
      protectedUsers.push({
        username,
        engagementCount: data.count,
        engagementTypes: [...data.types],
        tweets: data.tweets
      });
    }
  });
  
  // Sort by engagement count
  protectedUsers.sort((a, b) => b.engagementCount - a.engagementCount);
  
  // Save to localStorage
  const result = {
    savedAt: new Date().toISOString(),
    myUsername,
    postsScanned: Math.min(myTweets.length, CONFIG.postsToScan),
    totalProtected: protectedUsers.length,
    users: protectedUsers
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ PROTECTION LIST SAVED!                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🛡️ Protected users: ${protectedUsers.length}`);
  console.log('');
  
  console.log('🏆 TOP ENGAGED USERS:');
  protectedUsers.slice(0, 10).forEach((u, i) => {
    console.log(`   ${i + 1}. @${u.username} (${u.engagementCount} engagements: ${u.engagementTypes.join(', ')})`);
  });
  
  console.log('');
  console.log('💡 smart-unfollow.js will respect this list!');
  console.log('💡 Access via: window.protectedUsers');
  
  window.protectedUsers = result;
  
  return result;
})();
