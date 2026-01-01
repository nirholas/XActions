# 👥 Follow Engagers

Automatically follow users who engage (like, retweet, or reply) with specific tweets on X (Twitter).

---

## 📋 What It Does

This powerful feature helps you build a targeted audience by following people who actively engage with content similar to yours:

1. **Engagement targeting** - Finds users who liked, retweeted, or quoted specific tweets
2. **Competitor analysis** - Follow people engaging with your competitors' content
3. **Warm leads** - These users have already shown interest in your niche
4. **Smart filtering** - Skip protected accounts, verified users, or accounts outside your target range
5. **Duplicate prevention** - Tracks who you've followed to avoid repeat actions
6. **Rate limiting** - Uses random delays to mimic human behavior and avoid detection

**Use cases:**
- Follow people who liked a competitor's viral tweet
- Target users engaging with industry leaders in your space
- Find active community members around specific topics
- Build an audience of people already interested in your niche
- Convert engagers into followers by appearing in their notifications
- Discover potential customers who engage with product-related content

---

## ⚠️ IMPORTANT WARNINGS

> **🚨 USE RESPONSIBLY!** Automated following can get your account restricted or permanently suspended if overdone. X (Twitter) has strict limits on follow actions.

**Before you start:**
- ❌ **DON'T** follow more than 50-100 accounts per day
- ❌ **DON'T** run this continuously or multiple times per day
- ❌ **DON'T** use obvious bot-like patterns (identical delays)
- ❌ **DON'T** target small accounts exclusively (looks suspicious)
- ✅ **DO** use random delays between actions (5-15 seconds minimum)
- ✅ **DO** take breaks between sessions (hours, not minutes)
- ✅ **DO** mix automated and manual following
- ✅ **DO** start with low limits (10-20) and increase gradually
- ✅ **DO** unfollow non-followers after 7-14 days to maintain ratio

**X/Twitter Follow Limits:**
- ~400 follows per day (hard limit)
- ~100-200 follows recommended for safety
- Account age matters (new accounts get stricter limits)
- Following/follower ratio is monitored

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Quick follow sessions from a tweet's likes or retweets list

**Steps:**
1. Go to any tweet and click on the "Likes" or "Retweets" count to open the list
2. The URL should look like: `x.com/username/status/123456789/likes` or `.../retweets`
3. Open browser console (F12 → Console tab)
4. Paste the script below and press Enter

```javascript
// ============================================
// XActions - Follow Engagers (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/.../status/.../likes or /retweets
// Open console (F12), paste this
// ============================================

(async () => {
  // ==========================================
  // CONFIGURATION - Customize these settings!
  // ==========================================
  const CONFIG = {
    // Follow limits (KEEP THESE LOW!)
    MAX_FOLLOWS: 25,                    // Maximum users to follow per session
    MAX_SCROLLS: 30,                    // Maximum times to scroll for more users
    
    // Filters
    MIN_FOLLOWERS: 50,                  // Skip users with fewer followers (spam filter)
    MAX_FOLLOWERS: 100000,              // Skip mega accounts (unlikely to follow back)
    SKIP_PROTECTED: true,               // Skip private/protected accounts
    SKIP_VERIFIED: false,               // Skip verified accounts
    SKIP_IF_ALREADY_FOLLOWING: true,    // Skip users you already follow
    
    // Delays (in milliseconds) - Randomized to seem human
    MIN_DELAY: 5000,                    // Minimum delay between follows (5 seconds)
    MAX_DELAY: 12000,                   // Maximum delay between follows (12 seconds)
    SCROLL_DELAY: 2000,                 // Delay after scrolling
    
    // Safety
    PAUSE_EVERY: 8,                     // Pause every N follows
    PAUSE_DURATION: 25000,              // Pause duration (25 seconds)
  };

  // ==========================================
  // SCRIPT - Don't modify below this line
  // ==========================================
  
  // Validate we're on the right page
  const currentUrl = window.location.href;
  const isLikesPage = currentUrl.includes('/likes');
  const isRetweetsPage = currentUrl.includes('/retweets');
  const isQuotesPage = currentUrl.includes('/quotes');
  
  if (!isLikesPage && !isRetweetsPage && !isQuotesPage) {
    console.error('❌ ERROR: Not on a likes/retweets/quotes page!');
    console.log('👉 Go to a tweet, click on "Likes" or "Retweets" count first');
    console.log('   URL should look like: x.com/user/status/123456/likes');
    return;
  }
  
  const engagementType = isLikesPage ? 'Likers' : isRetweetsPage ? 'Retweeters' : 'Quoters';
  
  console.log('👥 XActions - Follow Engagers');
  console.log('='.repeat(50));
  console.log(`📍 Mode: Following ${engagementType}`);
  console.log('⚙️  Settings:');
  console.log(`   • Max follows: ${CONFIG.MAX_FOLLOWS}`);
  console.log(`   • Delay: ${CONFIG.MIN_DELAY/1000}s - ${CONFIG.MAX_DELAY/1000}s`);
  console.log(`   • Skip protected: ${CONFIG.SKIP_PROTECTED ? 'Yes' : 'No'}`);
  console.log(`   • Skip verified: ${CONFIG.SKIP_VERIFIED ? 'Yes' : 'No'}`);
  console.log('');
  console.log('⚠️  Press Ctrl+C in console to stop at any time');
  console.log('='.repeat(50));
  console.log('');

  // Helpers
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // State tracking
  const followedUsers = new Set();
  const processedUsers = new Set();
  let followCount = 0;
  let scrollCount = 0;
  let skippedCount = 0;
  let isRunning = true;

  // Parse follower count strings like "10.5K" or "1.2M"
  const parseFollowerCount = (str) => {
    if (!str) return 0;
    str = str.trim().replace(/,/g, '');
    const num = parseFloat(str);
    if (str.toUpperCase().includes('K')) return num * 1000;
    if (str.toUpperCase().includes('M')) return num * 1000000;
    if (str.toUpperCase().includes('B')) return num * 1000000000;
    return num || 0;
  };

  // Extract user info from a user cell
  const extractUserInfo = (cell) => {
    try {
      // Get username from the link
      const userLink = cell.querySelector('a[href^="/"][role="link"]');
      if (!userLink) return null;
      
      const href = userLink.getAttribute('href') || '';
      const username = href.split('/')[1]?.split('?')[0];
      
      // Skip invalid usernames
      if (!username || username.includes('/') || 
          ['search', 'explore', 'home', 'notifications', 'messages', 'i', 'settings', 'compose'].includes(username)) {
        return null;
      }
      
      // Get display name
      const nameSpan = cell.querySelector('[dir="ltr"] > span > span') ||
                       cell.querySelector('[dir="ltr"] > span');
      const displayName = nameSpan?.textContent?.trim() || username;
      
      // Get bio if available
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const bio = bioEl?.textContent?.trim() || '';
      
      // Check if verified
      const isVerified = !!cell.querySelector('svg[aria-label*="Verified"]') ||
                         !!cell.querySelector('[data-testid="icon-verified"]');
      
      // Check if protected/private
      const isProtected = !!cell.querySelector('svg[aria-label*="Protected"]') ||
                          !!cell.querySelector('[data-testid="icon-lock"]') ||
                          cell.innerHTML.includes('Protected');
      
      // Check if already following
      const followingBtn = cell.querySelector('[data-testid$="-unfollow"]') ||
                           cell.querySelector('button[aria-label*="Following"]');
      const isFollowing = !!followingBtn || cell.textContent?.includes('Following');
      
      // Check if follows you
      const followsYou = cell.textContent?.includes('Follows you') || false;
      
      // Try to get follower count
      let followers = 0;
      const statsText = cell.textContent || '';
      const followerMatch = statsText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/i);
      if (followerMatch) {
        followers = parseFollowerCount(followerMatch[1]);
      }
      
      return {
        username,
        displayName,
        bio,
        followers,
        isVerified,
        isProtected,
        isFollowing,
        followsYou
      };
    } catch (e) {
      return null;
    }
  };

  // Check if user passes filters
  const passesFilters = (userInfo) => {
    if (!userInfo || !userInfo.username) return false;
    
    // Skip if already processed
    if (processedUsers.has(userInfo.username.toLowerCase())) return false;
    
    // Skip if already following
    if (CONFIG.SKIP_IF_ALREADY_FOLLOWING && userInfo.isFollowing) {
      skippedCount++;
      return false;
    }
    
    // Skip protected accounts
    if (CONFIG.SKIP_PROTECTED && userInfo.isProtected) {
      skippedCount++;
      return false;
    }
    
    // Skip verified accounts
    if (CONFIG.SKIP_VERIFIED && userInfo.isVerified) {
      skippedCount++;
      return false;
    }
    
    // Follower count filters (only if we have the data)
    if (userInfo.followers > 0) {
      if (userInfo.followers < CONFIG.MIN_FOLLOWERS) {
        skippedCount++;
        return false;
      }
      if (userInfo.followers > CONFIG.MAX_FOLLOWERS) {
        skippedCount++;
        return false;
      }
    }
    
    return true;
  };

  // Follow a user by clicking their follow button
  const followUser = async (cell, userInfo) => {
    // Find the follow button
    const followBtn = cell.querySelector('button[data-testid$="-follow"]') ||
                      cell.querySelector('[role="button"][aria-label*="Follow @"]') ||
                      Array.from(cell.querySelectorAll('button')).find(btn => 
                        btn.textContent?.trim() === 'Follow' && 
                        !btn.textContent.includes('Following') &&
                        !btn.getAttribute('aria-label')?.includes('Following')
                      );
    
    if (!followBtn) return false;
    
    // Verify button says "Follow"
    const buttonText = followBtn.textContent?.trim() || '';
    const ariaLabel = followBtn.getAttribute('aria-label') || '';
    
    if (buttonText !== 'Follow' && !ariaLabel.includes('Follow @')) {
      return false;
    }
    
    // Scroll into view
    cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    
    // Click the button
    followBtn.click();
    
    followCount++;
    followedUsers.add(userInfo.username.toLowerCase());
    processedUsers.add(userInfo.username.toLowerCase());
    
    const followerStr = userInfo.followers > 0 
      ? ` (${userInfo.followers.toLocaleString()} followers)` 
      : '';
    
    console.log(`✅ [${followCount}/${CONFIG.MAX_FOLLOWS}] Followed @${userInfo.username}${followerStr}`);
    
    return true;
  };

  // Main loop
  console.log('🔄 Starting to process engagers...\n');
  
  while (scrollCount < CONFIG.MAX_SCROLLS && followCount < CONFIG.MAX_FOLLOWS && isRunning) {
    // Get all user cells
    const userCells = document.querySelectorAll('[data-testid="UserCell"]');
    
    if (userCells.length === 0) {
      console.log('⚠️  No user cells found. Waiting for content to load...');
      await sleep(3000);
      scrollCount++;
      continue;
    }
    
    for (const cell of userCells) {
      if (!isRunning) break;
      if (followCount >= CONFIG.MAX_FOLLOWS) break;
      
      const userInfo = extractUserInfo(cell);
      
      if (!passesFilters(userInfo)) continue;
      
      // Mark as processed before attempting follow
      processedUsers.add(userInfo.username.toLowerCase());
      
      // Attempt to follow
      const followed = await followUser(cell, userInfo);
      
      if (followed) {
        // Random delay between follows
        const delay = randomDelay(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY);
        console.log(`⏳ Waiting ${(delay/1000).toFixed(1)}s...`);
        await sleep(delay);
        
        // Extra pause every N follows
        if (followCount > 0 && followCount % CONFIG.PAUSE_EVERY === 0) {
          console.log(`\n🛑 Safety pause (${CONFIG.PAUSE_DURATION/1000}s) after ${followCount} follows...\n`);
          await sleep(CONFIG.PAUSE_DURATION);
        }
      }
    }
    
    // Scroll down to load more users
    window.scrollBy({ top: 800, behavior: 'smooth' });
    scrollCount++;
    
    if (scrollCount % 5 === 0) {
      console.log(`📜 Scrolled ${scrollCount} times, found ${followCount} users to follow so far...`);
    }
    
    await sleep(CONFIG.SCROLL_DELAY);
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ SESSION COMPLETE');
  console.log('='.repeat(50));
  console.log(`📊 Results:`);
  console.log(`   • ${engagementType} followed: ${followCount}`);
  console.log(`   • Users skipped: ${skippedCount}`);
  console.log(`   • Scrolls performed: ${scrollCount}`);
  console.log('');
  console.log('💡 Tip: Wait at least 1 hour before running again!');
  console.log('='.repeat(50));
  
  // Make stop function available
  window.stopFollowEngagers = () => {
    isRunning = false;
    console.log('🛑 Stopping... (will finish current action)');
  };
  
  console.log('\n📝 Run stopFollowEngagers() to stop early');
})();
```

---

## 🖥️ Example 2: Node.js with Puppeteer (Production)

**Best for:** Server-side automation, scheduled jobs, multi-tweet analysis, tracking

**Requirements:**
- Node.js 18+
- Puppeteer installed (`npm install puppeteer`)
- Valid X (Twitter) session cookies

**Features:**
- Takes any tweet URL and extracts engagers
- Follows likers, retweeters, or both
- Configurable limits and filters
- Persistent tracking of followed users
- JSON logging of all actions
- Error handling and rate limiting

```javascript
// ============================================
// XActions - Follow Engagers (Node.js + Puppeteer)
// Author: nich (@nichxbt)
// 
// Production-ready script for following users
// who engage with specific tweets
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
  // Target tweet URL (REQUIRED)
  TWEET_URL: 'https://x.com/elonmusk/status/1234567890',
  
  // What to scrape: 'likers', 'retweeters', 'both'
  ENGAGEMENT_TYPE: 'likers',
  
  // Follow limits
  MAX_FOLLOWS: 30,
  MAX_SCROLL_ATTEMPTS: 25,
  
  // Filters
  MIN_FOLLOWERS: 100,
  MAX_FOLLOWERS: 50000,
  SKIP_PROTECTED: true,
  SKIP_VERIFIED: false,
  SKIP_NO_PROFILE_PIC: true,
  
  // Delays (milliseconds)
  MIN_DELAY_BETWEEN_FOLLOWS: 5000,
  MAX_DELAY_BETWEEN_FOLLOWS: 12000,
  PAGE_LOAD_DELAY: 3000,
  SCROLL_DELAY: 2000,
  
  // Pause settings
  PAUSE_AFTER_N_FOLLOWS: 10,
  PAUSE_DURATION: 30000,
  
  // Browser settings
  HEADLESS: false, // Set to true for background execution
  
  // File paths
  COOKIES_FILE: './twitter-cookies.json',
  TRACKING_FILE: './followed-engagers.json',
  LOG_FILE: './engager-follow-log.json',
};

// ==========================================
// TRACKING & LOGGING
// ==========================================
class FollowTracker {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.load();
  }
  
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading tracking file:', e.message);
    }
    return { followed: {}, processed: [] };
  }
  
  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
  
  hasFollowed(username) {
    return this.data.followed[username.toLowerCase()] !== undefined;
  }
  
  hasProcessed(username) {
    return this.data.processed.includes(username.toLowerCase());
  }
  
  markFollowed(username, metadata = {}) {
    this.data.followed[username.toLowerCase()] = {
      followedAt: new Date().toISOString(),
      ...metadata
    };
    if (!this.data.processed.includes(username.toLowerCase())) {
      this.data.processed.push(username.toLowerCase());
    }
    this.save();
  }
  
  markProcessed(username) {
    if (!this.data.processed.includes(username.toLowerCase())) {
      this.data.processed.push(username.toLowerCase());
      this.save();
    }
  }
  
  getFollowedCount() {
    return Object.keys(this.data.followed).length;
  }
  
  getSessionFollowed() {
    const today = new Date().toDateString();
    return Object.entries(this.data.followed).filter(([_, data]) => 
      new Date(data.followedAt).toDateString() === today
    ).length;
  }
}

class ActionLogger {
  constructor(filePath) {
    this.filePath = filePath;
    this.logs = this.load();
  }
  
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (e) {}
    return [];
  }
  
  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.logs, null, 2));
  }
  
  log(action, data) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      action,
      ...data
    });
    this.save();
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const randomDelay = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const parseFollowerCount = (str) => {
  if (!str) return 0;
  str = str.trim().replace(/,/g, '');
  const num = parseFloat(str);
  if (str.toUpperCase().includes('K')) return num * 1000;
  if (str.toUpperCase().includes('M')) return num * 1000000;
  return num || 0;
};

const extractTweetId = (url) => {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
};

// ==========================================
// MAIN FOLLOW ENGAGERS CLASS
// ==========================================
class FollowEngagers {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.tracker = new FollowTracker(config.TRACKING_FILE);
    this.logger = new ActionLogger(config.LOG_FILE);
    this.stats = {
      followed: 0,
      skipped: 0,
      errors: 0,
      alreadyFollowing: 0
    };
  }
  
  async init() {
    console.log('🚀 Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: this.config.HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,900'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1280, height: 900 });
    
    // Set user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Load cookies
    await this.loadCookies();
    
    console.log('✅ Browser ready');
  }
  
  async loadCookies() {
    try {
      if (fs.existsSync(this.config.COOKIES_FILE)) {
        const cookies = JSON.parse(fs.readFileSync(this.config.COOKIES_FILE, 'utf8'));
        await this.page.setCookie(...cookies);
        console.log('🍪 Cookies loaded successfully');
      } else {
        throw new Error('Cookies file not found');
      }
    } catch (e) {
      console.error('❌ Error loading cookies:', e.message);
      console.log('📝 Please export your X cookies to:', this.config.COOKIES_FILE);
      console.log('   Use a browser extension like "EditThisCookie" to export cookies as JSON');
      process.exit(1);
    }
  }
  
  async navigateToEngagementList(tweetUrl, type) {
    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) {
      throw new Error('Invalid tweet URL');
    }
    
    let targetUrl;
    if (type === 'likers') {
      targetUrl = `${tweetUrl}/likes`;
    } else if (type === 'retweeters') {
      targetUrl = `${tweetUrl}/retweets`;
    } else {
      throw new Error('Invalid engagement type');
    }
    
    console.log(`\n📍 Navigating to ${type} list...`);
    console.log(`   ${targetUrl}`);
    
    await this.page.goto(targetUrl, { waitUntil: 'networkidle2' });
    await sleep(this.config.PAGE_LOAD_DELAY);
    
    // Check if we're logged in
    const isLoggedIn = await this.page.evaluate(() => {
      return !document.body.innerText.includes('Sign in to X');
    });
    
    if (!isLoggedIn) {
      throw new Error('Not logged in - cookies may be expired');
    }
    
    // Wait for user cells to load
    await this.page.waitForSelector('[data-testid="UserCell"]', { timeout: 10000 })
      .catch(() => {
        console.log('⚠️  No users found or slow loading. The tweet might have no engagements.');
      });
  }
  
  async extractUsersFromPage() {
    return await this.page.evaluate(() => {
      const users = [];
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      
      userCells.forEach(cell => {
        try {
          // Get username
          const userLink = cell.querySelector('a[href^="/"][role="link"]');
          if (!userLink) return;
          
          const href = userLink.getAttribute('href') || '';
          const username = href.split('/')[1]?.split('?')[0];
          
          if (!username || username.includes('/')) return;
          
          // Get display name
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const displayName = nameEl?.textContent?.trim() || username;
          
          // Check if verified
          const isVerified = !!cell.querySelector('svg[aria-label*="Verified"]') ||
                            !!cell.querySelector('[data-testid="icon-verified"]');
          
          // Check if protected
          const isProtected = !!cell.querySelector('svg[aria-label*="Protected"]') ||
                             !!cell.querySelector('[data-testid="icon-lock"]');
          
          // Check if already following
          const isFollowing = !!cell.querySelector('[data-testid$="-unfollow"]') ||
                             !!cell.querySelector('button[aria-label*="Following"]');
          
          // Check for follow button
          const hasFollowButton = !!cell.querySelector('button[data-testid$="-follow"]') ||
                                 !!Array.from(cell.querySelectorAll('button')).find(btn => 
                                   btn.textContent?.trim() === 'Follow'
                                 );
          
          // Get bio
          const bioEl = cell.querySelector('[data-testid="UserDescription"]');
          const bio = bioEl?.textContent?.trim() || '';
          
          // Get follower count if visible
          let followers = 0;
          const statsText = cell.textContent || '';
          const match = statsText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/i);
          if (match) {
            const str = match[1].replace(/,/g, '');
            const num = parseFloat(str);
            if (str.toUpperCase().includes('K')) followers = num * 1000;
            else if (str.toUpperCase().includes('M')) followers = num * 1000000;
            else followers = num || 0;
          }
          
          // Check for default profile pic
          const hasDefaultPic = !!cell.querySelector('img[src*="default_profile"]');
          
          users.push({
            username,
            displayName,
            bio,
            followers,
            isVerified,
            isProtected,
            isFollowing,
            hasFollowButton,
            hasDefaultPic
          });
        } catch (e) {}
      });
      
      return users;
    });
  }
  
  passesFilters(user) {
    if (this.tracker.hasFollowed(user.username)) {
      return { passes: false, reason: 'already_followed_previously' };
    }
    
    if (this.tracker.hasProcessed(user.username)) {
      return { passes: false, reason: 'already_processed' };
    }
    
    if (user.isFollowing) {
      this.stats.alreadyFollowing++;
      return { passes: false, reason: 'already_following' };
    }
    
    if (!user.hasFollowButton) {
      return { passes: false, reason: 'no_follow_button' };
    }
    
    if (this.config.SKIP_PROTECTED && user.isProtected) {
      return { passes: false, reason: 'protected' };
    }
    
    if (this.config.SKIP_VERIFIED && user.isVerified) {
      return { passes: false, reason: 'verified' };
    }
    
    if (this.config.SKIP_NO_PROFILE_PIC && user.hasDefaultPic) {
      return { passes: false, reason: 'no_profile_pic' };
    }
    
    if (user.followers > 0) {
      if (user.followers < this.config.MIN_FOLLOWERS) {
        return { passes: false, reason: 'below_min_followers' };
      }
      if (user.followers > this.config.MAX_FOLLOWERS) {
        return { passes: false, reason: 'above_max_followers' };
      }
    }
    
    return { passes: true };
  }
  
  async followUser(username) {
    try {
      // Find and click the follow button for this user
      const followed = await this.page.evaluate((targetUsername) => {
        const userCells = document.querySelectorAll('[data-testid="UserCell"]');
        
        for (const cell of userCells) {
          const userLink = cell.querySelector('a[href^="/"][role="link"]');
          if (!userLink) continue;
          
          const href = userLink.getAttribute('href') || '';
          const username = href.split('/')[1]?.split('?')[0]?.toLowerCase();
          
          if (username !== targetUsername.toLowerCase()) continue;
          
          // Find follow button
          const followBtn = cell.querySelector('button[data-testid$="-follow"]') ||
                           Array.from(cell.querySelectorAll('button')).find(btn => 
                             btn.textContent?.trim() === 'Follow' && 
                             !btn.getAttribute('aria-label')?.includes('Following')
                           );
          
          if (followBtn) {
            // Scroll into view
            cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Small delay then click
            setTimeout(() => followBtn.click(), 300);
            return true;
          }
        }
        return false;
      }, username);
      
      if (followed) {
        await sleep(1000); // Wait for the follow action to register
        return true;
      }
      
      return false;
    } catch (e) {
      console.error(`Error following @${username}:`, e.message);
      return false;
    }
  }
  
  async processEngagementList(type) {
    console.log(`\n📋 Processing ${type}...`);
    
    let scrollCount = 0;
    let noNewUsersCount = 0;
    let lastUserCount = 0;
    
    while (
      this.stats.followed < this.config.MAX_FOLLOWS &&
      scrollCount < this.config.MAX_SCROLL_ATTEMPTS &&
      noNewUsersCount < 5
    ) {
      // Extract current users on page
      const users = await this.extractUsersFromPage();
      
      // Process each user
      for (const user of users) {
        if (this.stats.followed >= this.config.MAX_FOLLOWS) break;
        
        const filterResult = this.passesFilters(user);
        
        if (!filterResult.passes) {
          if (filterResult.reason !== 'already_processed' && filterResult.reason !== 'already_followed_previously') {
            this.stats.skipped++;
            this.tracker.markProcessed(user.username);
          }
          continue;
        }
        
        // Attempt to follow
        console.log(`\n👤 Following @${user.username}...`);
        
        const success = await this.followUser(user.username);
        
        if (success) {
          this.stats.followed++;
          this.tracker.markFollowed(user.username, {
            source: type,
            tweetUrl: this.config.TWEET_URL,
            displayName: user.displayName,
            followers: user.followers
          });
          
          this.logger.log('follow', {
            username: user.username,
            source: type,
            tweetUrl: this.config.TWEET_URL
          });
          
          const followerStr = user.followers > 0 
            ? ` (${user.followers.toLocaleString()} followers)` 
            : '';
          
          console.log(`   ✅ [${this.stats.followed}/${this.config.MAX_FOLLOWS}] Followed @${user.username}${followerStr}`);
          
          // Random delay
          const delay = randomDelay(
            this.config.MIN_DELAY_BETWEEN_FOLLOWS,
            this.config.MAX_DELAY_BETWEEN_FOLLOWS
          );
          console.log(`   ⏳ Waiting ${(delay/1000).toFixed(1)}s...`);
          await sleep(delay);
          
          // Periodic pause
          if (this.stats.followed > 0 && this.stats.followed % this.config.PAUSE_AFTER_N_FOLLOWS === 0) {
            console.log(`\n🛑 Safety pause (${this.config.PAUSE_DURATION/1000}s)...\n`);
            await sleep(this.config.PAUSE_DURATION);
          }
        } else {
          this.stats.errors++;
          this.tracker.markProcessed(user.username);
          console.log(`   ⚠️  Could not follow @${user.username}`);
        }
      }
      
      // Check if we found new users
      if (users.length === lastUserCount) {
        noNewUsersCount++;
      } else {
        noNewUsersCount = 0;
      }
      lastUserCount = users.length;
      
      // Scroll down
      await this.page.evaluate(() => {
        window.scrollBy({ top: 800, behavior: 'smooth' });
      });
      scrollCount++;
      
      if (scrollCount % 5 === 0) {
        console.log(`\n📜 Scrolled ${scrollCount}x | Followed: ${this.stats.followed} | Skipped: ${this.stats.skipped}`);
      }
      
      await sleep(this.config.SCROLL_DELAY);
    }
  }
  
  async run() {
    console.log('\n' + '═'.repeat(55));
    console.log('  👥 XActions - Follow Engagers (Puppeteer)');
    console.log('═'.repeat(55));
    console.log(`\n📍 Tweet: ${this.config.TWEET_URL}`);
    console.log(`📊 Mode: ${this.config.ENGAGEMENT_TYPE}`);
    console.log(`🎯 Max follows: ${this.config.MAX_FOLLOWS}`);
    console.log(`⏱️  Delay: ${this.config.MIN_DELAY_BETWEEN_FOLLOWS/1000}s - ${this.config.MAX_DELAY_BETWEEN_FOLLOWS/1000}s`);
    console.log(`📁 Tracking file: ${this.config.TRACKING_FILE}`);
    console.log('\n' + '─'.repeat(55));
    
    try {
      await this.init();
      
      const types = this.config.ENGAGEMENT_TYPE === 'both' 
        ? ['likers', 'retweeters'] 
        : [this.config.ENGAGEMENT_TYPE];
      
      for (const type of types) {
        if (this.stats.followed >= this.config.MAX_FOLLOWS) break;
        
        await this.navigateToEngagementList(this.config.TWEET_URL, type);
        await this.processEngagementList(type);
      }
      
      // Print final stats
      console.log('\n' + '═'.repeat(55));
      console.log('  ✅ SESSION COMPLETE');
      console.log('═'.repeat(55));
      console.log(`\n📊 Results:`);
      console.log(`   • Followed: ${this.stats.followed}`);
      console.log(`   • Skipped: ${this.stats.skipped}`);
      console.log(`   • Already following: ${this.stats.alreadyFollowing}`);
      console.log(`   • Errors: ${this.stats.errors}`);
      console.log(`   • Total ever followed: ${this.tracker.getFollowedCount()}`);
      console.log(`   • Followed today: ${this.tracker.getSessionFollowed()}`);
      console.log('\n' + '═'.repeat(55));
      
      this.logger.log('session_complete', {
        tweetUrl: this.config.TWEET_URL,
        stats: this.stats
      });
      
    } catch (e) {
      console.error('\n❌ Error:', e.message);
      this.logger.log('error', { message: e.message });
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log('\n🏁 Browser closed');
      }
    }
  }
}

// ==========================================
// RUN THE SCRIPT
// ==========================================
const engagers = new FollowEngagers(CONFIG);
engagers.run().catch(console.error);
```

**Save as `follow-engagers.js` and run:**

```bash
# Install dependencies
npm install puppeteer

# Export your cookies first (see setup below)

# Run the script
node follow-engagers.js
```

**Cookie Setup:**
1. Log into X (Twitter) in your browser
2. Install "EditThisCookie" browser extension
3. Export cookies for x.com as JSON
4. Save to `twitter-cookies.json` in the same directory

---

## 🎯 Use Cases

### 1. **Target Competitor's Audience**
Find and follow users who engage with your competitors' content. They're already interested in your niche!

```javascript
// In the Puppeteer script, set:
TWEET_URL: 'https://x.com/competitor/status/123456789',
ENGAGEMENT_TYPE: 'likers',
MAX_FOLLOWS: 30,
```

### 2. **Engage with Industry Leaders' Followers**
Follow people who like/retweet thought leaders in your space.

```javascript
// Target viral tweets from industry leaders
TWEET_URL: 'https://x.com/naval/status/123456789',
ENGAGEMENT_TYPE: 'retweeters', // Retweeters are often more engaged
```

### 3. **Build Community Around Events**
Follow users engaging with event announcements or product launches.

```javascript
// Conference announcement tweet
TWEET_URL: 'https://x.com/conference/status/123456789',
ENGAGEMENT_TYPE: 'both',
MIN_FOLLOWERS: 200,  // Quality filter
```

### 4. **Discover Warm Leads**
Follow users who liked product reviews or testimonials about tools in your space.

```javascript
TWEET_URL: 'https://x.com/user/status/123456789',
SKIP_VERIFIED: true,  // Focus on potential customers, not influencers
MAX_FOLLOWERS: 10000, // Target smaller accounts more likely to engage back
```

---

## 💡 Pro Tips

1. **Quality over quantity** - Following 20 highly targeted users is better than 100 random ones
2. **Timing matters** - Follow engagers while the tweet is fresh (within 24-48 hours)
3. **Engage after following** - Like or reply to their recent tweets for better follow-back rates
4. **Track your results** - The Puppeteer script saves who you followed; review periodically
5. **Clean up regularly** - Unfollow non-followers after 7-14 days using the smart-unfollow feature
6. **Combine strategies** - Use with keyword-follow and auto-liker for maximum growth
7. **Stay under limits** - Never exceed 100 follows per day, even if limits allow more

---

## 🌐 Website Alternative

Prefer a no-code solution? Use **[xactions.app](https://xactions.app)** for:

✅ **Visual interface** - No coding required  
✅ **One-click engager following** - Paste any tweet URL  
✅ **Smart filters** - Filter by followers, bio keywords, verification  
✅ **Scheduling** - Set up automated follow campaigns  
✅ **Analytics dashboard** - Track follow-back rates  
✅ **Multi-account support** - Manage multiple X accounts  
✅ **Cloud execution** - Runs 24/7, no computer needed  
✅ **Compliance tools** - Built-in rate limiting and safety features  

**Get started free at [xactions.app](https://xactions.app)**

---

## 📚 Related Features

- [🔍 Keyword Follow](keyword-follow.md) - Follow users tweeting about specific topics
- [❤️ Auto-Liker](auto-liker.md) - Automatically like tweets matching your criteria
- [🧹 Smart Unfollow](smart-unfollow.md) - Clean up non-followers automatically
- [👤 Profile Scraping](profile-scraping.md) - Extract user data from profiles
- [📊 Likes Scraping](likes-scraping.md) - Scrape who liked any tweet

---

## ⚖️ Disclaimer

This tool is for educational purposes. Use responsibly and in compliance with X (Twitter) Terms of Service. Automated following can result in account restrictions. The author is not responsible for any consequences of using these scripts.

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))  
**Project:** [XActions](https://github.com/nirholas/XActions)
