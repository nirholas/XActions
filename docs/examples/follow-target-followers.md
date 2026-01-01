# 👥 Follow Target's Followers

Automatically follow the followers of any target account (competitor, influencer, industry leader) on X (Twitter).

---

## 📋 What It Does

This powerful growth strategy helps you build a targeted audience by following people who already follow accounts similar to yours:

1. **Competitor targeting** - Follow your competitors' followers who are likely interested in your content
2. **Influencer piggybacking** - Target followers of influencers in your niche
3. **Quality audience building** - These users already follow accounts like yours, making them warm leads
4. **Smart filtering** - Skip protected accounts, verified users, or accounts outside your follower range
5. **Duplicate prevention** - Tracks who you've already followed to avoid repeat actions
6. **Rate limiting** - Uses random delays to mimic human behavior and avoid detection

**Use cases:**
- Follow followers of your direct competitors
- Target followers of industry thought leaders
- Find active users in your niche by targeting popular accounts
- Build an audience of people already interested in your content type
- Grow your following with users more likely to follow back
- Discover potential customers who follow similar products/services

---

## ⚠️ IMPORTANT WARNINGS

> **🚨 USE RESPONSIBLY!** Automated following can get your account restricted or permanently suspended if overdone. X (Twitter) has strict limits on follow actions.

**Before you start:**
- ❌ **DON'T** follow more than 50-100 accounts per day
- ❌ **DON'T** run this continuously or multiple times per day
- ❌ **DON'T** use obvious bot-like patterns (identical delays)
- ❌ **DON'T** target only small accounts (looks suspicious)
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

**Best for:** Quick follow sessions directly from a target account's followers page

**Steps:**
1. Go to the target account's followers page: `x.com/TARGET_USERNAME/followers`
2. Open browser console (F12 → Console tab)
3. Paste the script below and press Enter

```javascript
// ============================================
// XActions - Follow Target's Followers (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/TARGET_USERNAME/followers
// Open console (F12), paste this, press Enter
// ============================================

(async () => {
  // ==========================================
  // CONFIGURATION - Customize these settings!
  // ==========================================
  const CONFIG = {
    // Follow limits (KEEP THESE LOW!)
    MAX_FOLLOWS: 25,                    // Maximum users to follow per session
    MAX_SCROLLS: 40,                    // Maximum times to scroll for more users
    
    // Filters
    MIN_FOLLOWERS: 50,                  // Skip users with fewer followers (spam filter)
    MAX_FOLLOWERS: 100000,              // Skip mega accounts (unlikely to follow back)
    SKIP_PROTECTED: true,               // Skip private/protected accounts
    SKIP_VERIFIED: false,               // Skip verified accounts
    SKIP_NO_BIO: false,                 // Skip accounts without a bio
    SKIP_NO_PROFILE_PIC: true,          // Skip accounts with default profile picture
    SKIP_IF_ALREADY_FOLLOWING: true,    // Skip users you already follow
    
    // Delays (in milliseconds) - Randomized to seem human
    MIN_DELAY: 5000,                    // Minimum delay between follows (5 seconds)
    MAX_DELAY: 12000,                   // Maximum delay between follows (12 seconds)
    SCROLL_DELAY: 2000,                 // Delay after scrolling
    
    // Safety
    PAUSE_EVERY: 8,                     // Pause every N follows
    PAUSE_DURATION: 30000,              // Pause duration (30 seconds)
  };

  // ==========================================
  // SCRIPT - Don't modify below this line
  // ==========================================
  
  // Validate we're on the right page
  const currentUrl = window.location.href;
  const followersMatch = currentUrl.match(/x\.com\/([^\/]+)\/followers/i) || 
                         currentUrl.match(/twitter\.com\/([^\/]+)\/followers/i);
  
  if (!followersMatch) {
    console.error('❌ ERROR: Not on a followers page!');
    console.log('👉 Go to x.com/USERNAME/followers first');
    console.log('   Example: x.com/elonmusk/followers');
    return;
  }
  
  const targetUsername = followersMatch[1];
  
  console.log('👥 XActions - Follow Target\'s Followers');
  console.log('='.repeat(55));
  console.log(`📍 Target Account: @${targetUsername}`);
  console.log('⚙️  Settings:');
  console.log(`   • Max follows: ${CONFIG.MAX_FOLLOWS}`);
  console.log(`   • Delay: ${CONFIG.MIN_DELAY/1000}s - ${CONFIG.MAX_DELAY/1000}s`);
  console.log(`   • Min followers: ${CONFIG.MIN_FOLLOWERS.toLocaleString()}`);
  console.log(`   • Max followers: ${CONFIG.MAX_FOLLOWERS.toLocaleString()}`);
  console.log(`   • Skip protected: ${CONFIG.SKIP_PROTECTED ? 'Yes' : 'No'}`);
  console.log(`   • Skip verified: ${CONFIG.SKIP_VERIFIED ? 'Yes' : 'No'}`);
  console.log('');
  console.log('⚠️  Type stopFollowing() to stop at any time');
  console.log('='.repeat(55));
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

  // Make stop function globally available
  window.stopFollowing = () => {
    isRunning = false;
    console.log('🛑 Stopping... (will finish current action)');
  };

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
      
      // Skip if this is the target account
      if (username.toLowerCase() === targetUsername.toLowerCase()) {
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
      const isFollowing = !!followingBtn || 
                          (cell.textContent?.includes('Following') && 
                           !cell.textContent?.includes('Follows you'));
      
      // Check if follows you
      const followsYou = cell.textContent?.includes('Follows you') || false;
      
      // Check for default profile picture
      const hasDefaultPic = !!cell.querySelector('img[src*="default_profile"]');
      
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
        followsYou,
        hasDefaultPic
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
    
    // Skip accounts without bio
    if (CONFIG.SKIP_NO_BIO && !userInfo.bio) {
      skippedCount++;
      return false;
    }
    
    // Skip accounts with default profile picture
    if (CONFIG.SKIP_NO_PROFILE_PIC && userInfo.hasDefaultPic) {
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
    
    const followsYouStr = userInfo.followsYou ? ' 👋 follows you' : '';
    
    console.log(`✅ [${followCount}/${CONFIG.MAX_FOLLOWS}] Followed @${userInfo.username}${followerStr}${followsYouStr}`);
    
    return true;
  };

  // Main loop
  console.log('🔄 Starting to process followers...\n');
  
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
      console.log(`📜 Scrolled ${scrollCount}x | Followed: ${followCount} | Skipped: ${skippedCount}`);
    }
    
    await sleep(CONFIG.SCROLL_DELAY);
  }

  // Final summary
  console.log('\n' + '='.repeat(55));
  console.log('✅ SESSION COMPLETE');
  console.log('='.repeat(55));
  console.log(`📊 Results for @${targetUsername}'s followers:`);
  console.log(`   • Users followed: ${followCount}`);
  console.log(`   • Users skipped: ${skippedCount}`);
  console.log(`   • Scrolls performed: ${scrollCount}`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   • Wait at least 1-2 hours before running again');
  console.log('   • Try a different target account next time');
  console.log('   • Use smart-unfollow in 7-14 days to clean up');
  console.log('='.repeat(55));
})();
```

---

## 🖥️ Example 2: Node.js with Puppeteer (Production)

**Best for:** Server-side automation, scheduled jobs, multi-account targeting, comprehensive tracking

**Requirements:**
- Node.js 18+
- Puppeteer installed (`npm install puppeteer`)
- Valid X (Twitter) session cookies

**Features:**
- Takes any target username and scrapes their followers
- Follows them with configurable limits and filters
- Avoids users you've already followed
- Persistent tracking saved to JSON
- Detailed logging of all actions
- Error handling and rate limiting

```javascript
// ============================================
// XActions - Follow Target's Followers (Node.js + Puppeteer)
// Author: nich (@nichxbt)
// 
// Production-ready script for following the
// followers of any target account
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
  // Target account (REQUIRED) - without @
  TARGET_USERNAME: 'elonmusk',
  
  // Follow limits
  MAX_FOLLOWS: 30,
  MAX_SCROLL_ATTEMPTS: 40,
  
  // Filters
  MIN_FOLLOWERS: 100,
  MAX_FOLLOWERS: 50000,
  MIN_FOLLOWING: 10,
  MAX_FOLLOWING: 5000,
  SKIP_PROTECTED: true,
  SKIP_VERIFIED: false,
  SKIP_NO_BIO: false,
  SKIP_NO_PROFILE_PIC: true,
  MUST_FOLLOW_TARGET: true,  // Extra validation that user follows target
  
  // Bio keyword filters (optional - leave empty to skip)
  // User bio must contain at least one of these keywords
  BIO_KEYWORDS: [],  // e.g., ['crypto', 'web3', 'developer']
  
  // Delays (milliseconds)
  MIN_DELAY_BETWEEN_FOLLOWS: 5000,
  MAX_DELAY_BETWEEN_FOLLOWS: 15000,
  PAGE_LOAD_DELAY: 3000,
  SCROLL_DELAY: 2000,
  
  // Pause settings
  PAUSE_AFTER_N_FOLLOWS: 10,
  PAUSE_DURATION: 45000,
  
  // Browser settings
  HEADLESS: false,  // Set to true for background execution
  
  // File paths
  COOKIES_FILE: './twitter-cookies.json',
  TRACKING_FILE: './followed-target-followers.json',
  LOG_FILE: './target-followers-log.json',
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
    return { 
      followed: {},      // username -> { followedAt, source, displayName, followers }
      processed: [],     // usernames we've seen (followed or skipped)
      targets: {}        // target -> { lastProcessed, totalFollowed }
    };
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
    const lowerUsername = username.toLowerCase();
    this.data.followed[lowerUsername] = {
      followedAt: new Date().toISOString(),
      ...metadata
    };
    if (!this.data.processed.includes(lowerUsername)) {
      this.data.processed.push(lowerUsername);
    }
    this.save();
  }
  
  markProcessed(username) {
    const lowerUsername = username.toLowerCase();
    if (!this.data.processed.includes(lowerUsername)) {
      this.data.processed.push(lowerUsername);
      this.save();
    }
  }
  
  updateTarget(targetUsername, followedCount) {
    this.data.targets[targetUsername.toLowerCase()] = {
      lastProcessed: new Date().toISOString(),
      totalFollowed: (this.data.targets[targetUsername.toLowerCase()]?.totalFollowed || 0) + followedCount
    };
    this.save();
  }
  
  getFollowedCount() {
    return Object.keys(this.data.followed).length;
  }
  
  getFollowedToday() {
    const today = new Date().toDateString();
    return Object.entries(this.data.followed).filter(([_, data]) => 
      new Date(data.followedAt).toDateString() === today
    ).length;
  }
  
  getFollowedFromTarget(targetUsername) {
    return Object.entries(this.data.followed).filter(([_, data]) => 
      data.source?.toLowerCase() === targetUsername.toLowerCase()
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

const parseCount = (str) => {
  if (!str) return 0;
  str = str.trim().replace(/,/g, '');
  const num = parseFloat(str);
  if (str.toUpperCase().includes('K')) return num * 1000;
  if (str.toUpperCase().includes('M')) return num * 1000000;
  if (str.toUpperCase().includes('B')) return num * 1000000000;
  return num || 0;
};

// ==========================================
// MAIN FOLLOW TARGET FOLLOWERS CLASS
// ==========================================
class FollowTargetFollowers {
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
      alreadyFollowing: 0,
      filtered: {
        protected: 0,
        verified: 0,
        noProfilePic: 0,
        noBio: 0,
        followerCount: 0,
        bioKeyword: 0
      }
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
    
    // Set user agent to avoid detection
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
      console.log('\n📝 Cookie Setup Instructions:');
      console.log('   1. Log into X (Twitter) in your browser');
      console.log('   2. Install "EditThisCookie" browser extension');
      console.log('   3. Export cookies for x.com as JSON');
      console.log(`   4. Save to: ${this.config.COOKIES_FILE}`);
      process.exit(1);
    }
  }
  
  async navigateToFollowers() {
    const targetUrl = `https://x.com/${this.config.TARGET_USERNAME}/followers`;
    
    console.log(`\n📍 Navigating to @${this.config.TARGET_USERNAME}'s followers...`);
    console.log(`   ${targetUrl}`);
    
    await this.page.goto(targetUrl, { waitUntil: 'networkidle2' });
    await sleep(this.config.PAGE_LOAD_DELAY);
    
    // Check if we're logged in
    const isLoggedIn = await this.page.evaluate(() => {
      return !document.body.innerText.includes('Sign in to X') &&
             !document.body.innerText.includes('Log in');
    });
    
    if (!isLoggedIn) {
      throw new Error('Not logged in - cookies may be expired');
    }
    
    // Check if account exists
    const accountNotFound = await this.page.evaluate(() => {
      return document.body.innerText.includes('This account doesn't exist') ||
             document.body.innerText.includes('Account suspended');
    });
    
    if (accountNotFound) {
      throw new Error(`Account @${this.config.TARGET_USERNAME} not found or suspended`);
    }
    
    // Wait for user cells to load
    await this.page.waitForSelector('[data-testid="UserCell"]', { timeout: 15000 })
      .catch(() => {
        console.log('⚠️  No followers found or slow loading.');
      });
    
    console.log('✅ Followers page loaded');
  }
  
  async extractUsersFromPage() {
    return await this.page.evaluate((targetUsername) => {
      const users = [];
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      
      userCells.forEach(cell => {
        try {
          // Get username
          const userLink = cell.querySelector('a[href^="/"][role="link"]');
          if (!userLink) return;
          
          const href = userLink.getAttribute('href') || '';
          const username = href.split('/')[1]?.split('?')[0];
          
          // Skip invalid usernames and the target itself
          if (!username || username.includes('/') || 
              username.toLowerCase() === targetUsername.toLowerCase()) return;
          
          // Reserved routes to skip
          const reserved = ['search', 'explore', 'home', 'notifications', 'messages', 'i', 'settings', 'compose'];
          if (reserved.includes(username.toLowerCase())) return;
          
          // Get display name
          const nameEl = cell.querySelector('[dir="ltr"] > span > span') ||
                        cell.querySelector('[dir="ltr"] > span');
          const displayName = nameEl?.textContent?.trim() || username;
          
          // Check if verified
          const isVerified = !!cell.querySelector('svg[aria-label*="Verified"]') ||
                            !!cell.querySelector('[data-testid="icon-verified"]');
          
          // Check if protected
          const isProtected = !!cell.querySelector('svg[aria-label*="Protected"]') ||
                             !!cell.querySelector('[data-testid="icon-lock"]') ||
                             cell.innerHTML.includes('Protected');
          
          // Check if already following them
          const isFollowing = !!cell.querySelector('[data-testid$="-unfollow"]') ||
                             !!cell.querySelector('button[aria-label*="Following"]');
          
          // Check for follow button
          const hasFollowButton = !!cell.querySelector('button[data-testid$="-follow"]') ||
                                 !!Array.from(cell.querySelectorAll('button')).find(btn => 
                                   btn.textContent?.trim() === 'Follow' &&
                                   !btn.textContent.includes('Following')
                                 );
          
          // Get bio
          const bioEl = cell.querySelector('[data-testid="UserDescription"]');
          const bio = bioEl?.textContent?.trim() || '';
          
          // Get follower/following counts if visible
          let followers = 0;
          let following = 0;
          const statsText = cell.textContent || '';
          
          const followerMatch = statsText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/i);
          if (followerMatch) {
            const str = followerMatch[1].replace(/,/g, '');
            const num = parseFloat(str);
            if (str.toUpperCase().includes('K')) followers = num * 1000;
            else if (str.toUpperCase().includes('M')) followers = num * 1000000;
            else followers = num || 0;
          }
          
          const followingMatch = statsText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowing/i);
          if (followingMatch) {
            const str = followingMatch[1].replace(/,/g, '');
            const num = parseFloat(str);
            if (str.toUpperCase().includes('K')) following = num * 1000;
            else if (str.toUpperCase().includes('M')) following = num * 1000000;
            else following = num || 0;
          }
          
          // Check for default profile pic
          const hasDefaultPic = !!cell.querySelector('img[src*="default_profile"]');
          
          // Check if they follow you
          const followsYou = cell.textContent?.includes('Follows you') || false;
          
          users.push({
            username,
            displayName,
            bio,
            followers,
            following,
            isVerified,
            isProtected,
            isFollowing,
            hasFollowButton,
            hasDefaultPic,
            followsYou
          });
        } catch (e) {}
      });
      
      return users;
    }, this.config.TARGET_USERNAME);
  }
  
  passesFilters(user) {
    // Already tracked checks
    if (this.tracker.hasFollowed(user.username)) {
      return { passes: false, reason: 'already_followed_previously' };
    }
    
    if (this.tracker.hasProcessed(user.username)) {
      return { passes: false, reason: 'already_processed' };
    }
    
    // Already following
    if (user.isFollowing) {
      this.stats.alreadyFollowing++;
      return { passes: false, reason: 'already_following' };
    }
    
    // No follow button visible
    if (!user.hasFollowButton) {
      return { passes: false, reason: 'no_follow_button' };
    }
    
    // Protected accounts
    if (this.config.SKIP_PROTECTED && user.isProtected) {
      this.stats.filtered.protected++;
      return { passes: false, reason: 'protected' };
    }
    
    // Verified accounts
    if (this.config.SKIP_VERIFIED && user.isVerified) {
      this.stats.filtered.verified++;
      return { passes: false, reason: 'verified' };
    }
    
    // Default profile picture
    if (this.config.SKIP_NO_PROFILE_PIC && user.hasDefaultPic) {
      this.stats.filtered.noProfilePic++;
      return { passes: false, reason: 'no_profile_pic' };
    }
    
    // No bio
    if (this.config.SKIP_NO_BIO && !user.bio) {
      this.stats.filtered.noBio++;
      return { passes: false, reason: 'no_bio' };
    }
    
    // Follower count range
    if (user.followers > 0) {
      if (user.followers < this.config.MIN_FOLLOWERS || 
          user.followers > this.config.MAX_FOLLOWERS) {
        this.stats.filtered.followerCount++;
        return { passes: false, reason: 'follower_count' };
      }
    }
    
    // Following count range
    if (user.following > 0) {
      if (user.following < this.config.MIN_FOLLOWING || 
          user.following > this.config.MAX_FOLLOWING) {
        this.stats.filtered.followerCount++;
        return { passes: false, reason: 'following_count' };
      }
    }
    
    // Bio keywords filter
    if (this.config.BIO_KEYWORDS && this.config.BIO_KEYWORDS.length > 0) {
      const bioLower = (user.bio || '').toLowerCase();
      const hasKeyword = this.config.BIO_KEYWORDS.some(kw => 
        bioLower.includes(kw.toLowerCase())
      );
      if (!hasKeyword) {
        this.stats.filtered.bioKeyword++;
        return { passes: false, reason: 'bio_keyword' };
      }
    }
    
    return { passes: true };
  }
  
  async followUser(username) {
    try {
      const followed = await this.page.evaluate((targetUsername) => {
        const userCells = document.querySelectorAll('[data-testid="UserCell"]');
        
        for (const cell of userCells) {
          const userLink = cell.querySelector('a[href^="/"][role="link"]');
          if (!userLink) continue;
          
          const href = userLink.getAttribute('href') || '';
          const cellUsername = href.split('/')[1]?.split('?')[0]?.toLowerCase();
          
          if (cellUsername !== targetUsername.toLowerCase()) continue;
          
          // Find follow button
          const followBtn = cell.querySelector('button[data-testid$="-follow"]') ||
                           Array.from(cell.querySelectorAll('button')).find(btn => 
                             btn.textContent?.trim() === 'Follow' && 
                             !btn.getAttribute('aria-label')?.includes('Following')
                           );
          
          if (followBtn) {
            // Scroll into view
            cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Click after small delay
            setTimeout(() => followBtn.click(), 300);
            return true;
          }
        }
        return false;
      }, username);
      
      if (followed) {
        await sleep(1000);  // Wait for follow action to register
        return true;
      }
      
      return false;
    } catch (e) {
      console.error(`   ⚠️  Error following @${username}:`, e.message);
      return false;
    }
  }
  
  async processFollowers() {
    console.log(`\n📋 Processing @${this.config.TARGET_USERNAME}'s followers...`);
    
    let scrollCount = 0;
    let noNewUsersCount = 0;
    let lastUserCount = 0;
    const processedThisSession = new Set();
    
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
        
        // Skip if processed this session
        if (processedThisSession.has(user.username.toLowerCase())) continue;
        processedThisSession.add(user.username.toLowerCase());
        
        const filterResult = this.passesFilters(user);
        
        if (!filterResult.passes) {
          if (!['already_processed', 'already_followed_previously'].includes(filterResult.reason)) {
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
            source: this.config.TARGET_USERNAME,
            displayName: user.displayName,
            bio: user.bio?.substring(0, 100),
            followers: user.followers,
            following: user.following,
            followsYou: user.followsYou
          });
          
          this.logger.log('follow', {
            username: user.username,
            source: this.config.TARGET_USERNAME,
            displayName: user.displayName,
            followers: user.followers
          });
          
          const followerStr = user.followers > 0 
            ? ` (${user.followers.toLocaleString()} followers)` 
            : '';
          const followsYouStr = user.followsYou ? ' 👋' : '';
          
          console.log(`   ✅ [${this.stats.followed}/${this.config.MAX_FOLLOWS}] Followed @${user.username}${followerStr}${followsYouStr}`);
          
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
    
    // Update target tracking
    this.tracker.updateTarget(this.config.TARGET_USERNAME, this.stats.followed);
  }
  
  async run() {
    console.log('\n' + '═'.repeat(60));
    console.log('  👥 XActions - Follow Target\'s Followers (Puppeteer)');
    console.log('═'.repeat(60));
    console.log(`\n📍 Target: @${this.config.TARGET_USERNAME}`);
    console.log(`🎯 Max follows: ${this.config.MAX_FOLLOWS}`);
    console.log(`⏱️  Delay: ${this.config.MIN_DELAY_BETWEEN_FOLLOWS/1000}s - ${this.config.MAX_DELAY_BETWEEN_FOLLOWS/1000}s`);
    console.log(`🔍 Filters:`);
    console.log(`   • Followers: ${this.config.MIN_FOLLOWERS.toLocaleString()} - ${this.config.MAX_FOLLOWERS.toLocaleString()}`);
    console.log(`   • Skip protected: ${this.config.SKIP_PROTECTED}`);
    console.log(`   • Skip verified: ${this.config.SKIP_VERIFIED}`);
    if (this.config.BIO_KEYWORDS?.length > 0) {
      console.log(`   • Bio keywords: ${this.config.BIO_KEYWORDS.join(', ')}`);
    }
    console.log(`📁 Tracking: ${this.config.TRACKING_FILE}`);
    console.log(`📊 Previously followed from this target: ${this.tracker.getFollowedFromTarget(this.config.TARGET_USERNAME)}`);
    console.log('\n' + '─'.repeat(60));
    
    try {
      await this.init();
      await this.navigateToFollowers();
      await this.processFollowers();
      
      // Print final stats
      console.log('\n' + '═'.repeat(60));
      console.log('  ✅ SESSION COMPLETE');
      console.log('═'.repeat(60));
      console.log(`\n📊 Results for @${this.config.TARGET_USERNAME}'s followers:`);
      console.log(`   • Followed: ${this.stats.followed}`);
      console.log(`   • Skipped: ${this.stats.skipped}`);
      console.log(`   • Already following: ${this.stats.alreadyFollowing}`);
      console.log(`   • Errors: ${this.stats.errors}`);
      console.log(`\n📋 Filter breakdown:`);
      console.log(`   • Protected: ${this.stats.filtered.protected}`);
      console.log(`   • Verified: ${this.stats.filtered.verified}`);
      console.log(`   • No profile pic: ${this.stats.filtered.noProfilePic}`);
      console.log(`   • No bio: ${this.stats.filtered.noBio}`);
      console.log(`   • Follower count: ${this.stats.filtered.followerCount}`);
      console.log(`   • Bio keyword: ${this.stats.filtered.bioKeyword}`);
      console.log(`\n📈 Totals:`);
      console.log(`   • Total ever followed: ${this.tracker.getFollowedCount()}`);
      console.log(`   • Followed today: ${this.tracker.getFollowedToday()}`);
      console.log(`   • From @${this.config.TARGET_USERNAME}: ${this.tracker.getFollowedFromTarget(this.config.TARGET_USERNAME)}`);
      console.log('\n' + '═'.repeat(60));
      
      this.logger.log('session_complete', {
        target: this.config.TARGET_USERNAME,
        stats: this.stats,
        totals: {
          everFollowed: this.tracker.getFollowedCount(),
          followedToday: this.tracker.getFollowedToday()
        }
      });
      
    } catch (e) {
      console.error('\n❌ Error:', e.message);
      this.logger.log('error', { message: e.message, target: this.config.TARGET_USERNAME });
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
const follower = new FollowTargetFollowers(CONFIG);
follower.run().catch(console.error);
```

**Save as `follow-target-followers.js` and run:**

```bash
# Install dependencies
npm install puppeteer

# Export your cookies first (see setup below)

# Run the script
node follow-target-followers.js
```

**Cookie Setup:**
1. Log into X (Twitter) in your browser
2. Install "EditThisCookie" browser extension
3. Export cookies for x.com as JSON
4. Save to `twitter-cookies.json` in the same directory

**Multiple Targets:**
To follow from multiple accounts, modify the script or create a wrapper:

```javascript
// follow-multiple-targets.js
const targets = ['elonmusk', 'naval', 'paulg'];

for (const target of targets) {
  CONFIG.TARGET_USERNAME = target;
  const follower = new FollowTargetFollowers(CONFIG);
  await follower.run();
  
  // Wait between targets
  console.log(`\n⏳ Waiting 5 minutes before next target...\n`);
  await new Promise(r => setTimeout(r, 5 * 60 * 1000));
}
```

---

## 🎯 Strategy Tips

### 1. **Pick Relevant Target Accounts**

Choose accounts whose followers would genuinely be interested in your content:

| Your Niche | Good Targets |
|------------|--------------|
| Web3/Crypto | Industry builders, popular project accounts |
| SaaS/Startups | Successful founders, VC accounts, indie hackers |
| Content Creation | Successful creators in your format/topic |
| E-commerce | Popular brands, influencers in your product space |

### 2. **Quality Over Quantity**

```javascript
// HIGH-QUALITY targeting example
const CONFIG = {
  TARGET_USERNAME: 'naval',           // Thought leader in startups
  MAX_FOLLOWS: 20,                     // Keep it small
  MIN_FOLLOWERS: 500,                  // Established accounts
  MAX_FOLLOWERS: 25000,                // Still likely to engage
  SKIP_NO_BIO: true,                   // Active users have bios
  BIO_KEYWORDS: ['founder', 'startup', 'building', 'developer'],
};
```

### 3. **Target Multiple Related Accounts**

Don't just follow one competitor's followers. Spread across multiple relevant accounts:

```javascript
const targets = [
  'competitor1',      // Direct competitor
  'industryLeader',   // Thought leader
  'popularPodcast',   // Media in your space
  'relatedProduct',   // Complementary product
];
```

### 4. **Timing Matters**

- **Best times:** Run during active hours for your target timezone
- **Frequency:** Max once per day, ideally every 2-3 days
- **Cooldown:** Wait 1-2 hours between different target accounts

### 5. **Combine with Other Strategies**

- **After following:** Like 1-2 of their tweets to appear in notifications
- **Use Smart Unfollow:** Clean up non-followers after 7-14 days
- **Mix with organic:** Don't let automated follows be your only activity

### 6. **Track and Optimize**

The Puppeteer script tracks everything. Review periodically:

```bash
# Check your tracking file
cat followed-target-followers.json | jq '.followed | length'

# See who you followed from a specific target
cat followed-target-followers.json | jq '.followed | to_entries | map(select(.value.source == "naval")) | length'
```

---

## 🌐 Website Alternative

Prefer a no-code solution? Use **[xactions.app](https://xactions.app)** for:

✅ **Visual interface** - No coding required  
✅ **One-click target following** - Enter any username  
✅ **Smart filters** - Filter by followers, bio keywords, verification  
✅ **Scheduling** - Set up automated follow campaigns  
✅ **Multi-target support** - Queue multiple accounts  
✅ **Analytics dashboard** - Track follow-back rates by target  
✅ **Cloud execution** - Runs 24/7, no computer needed  
✅ **Compliance tools** - Built-in rate limiting and safety features  

**Get started free at [xactions.app](https://xactions.app)**

---

## 📚 Related Features

- [👥 Follow Engagers](follow-engagers.md) - Follow users who engage with specific tweets
- [🔍 Keyword Follow](keyword-follow.md) - Follow users tweeting about specific topics
- [❤️ Auto-Liker](auto-liker.md) - Automatically like tweets matching your criteria
- [🧹 Smart Unfollow](smart-unfollow.md) - Clean up non-followers automatically
- [👤 Followers Scraping](followers-scraping.md) - Export any account's followers
- [📊 Profile Scraping](profile-scraping.md) - Extract detailed user data

---

## ⚖️ Disclaimer

This tool is for educational purposes. Use responsibly and in compliance with X (Twitter) Terms of Service. Automated following can result in account restrictions or suspension. The author is not responsible for any consequences of using these scripts.

**Key limits to remember:**
- ~400 follows per day (hard limit)
- ~50-100 follows per day recommended for safety
- New accounts have stricter limits
- Aggressive following affects your account health

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))  
**Project:** [XActions](https://github.com/nirholas/XActions)
