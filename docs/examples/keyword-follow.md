# 🔍 Keyword Follow

Automatically search for keywords and follow users who tweet about topics you care about on X (Twitter).

---

## 📋 What It Does

This feature helps you grow your network strategically by:

1. **Searching keywords** - Finds users tweeting about specific topics, hashtags, or interests
2. **Smart filtering** - Filters by follower count, bio content, and engagement signals
3. **Targeted following** - Follows users likely to be interested in your content
4. **Duplicate prevention** - Tracks who you've followed to avoid repeat actions
5. **Rate limiting** - Uses random delays to mimic human behavior and avoid detection

**Use cases:**
- Find and follow people in your niche (crypto, AI, startups, etc.)
- Connect with users discussing specific topics or events
- Build a targeted audience around hashtags
- Grow followers who are likely to engage with your content
- Discover potential collaborators, customers, or community members

---

## ⚠️ IMPORTANT WARNINGS

> **🚨 USE RESPONSIBLY!** Automated following can get your account restricted or permanently suspended if overdone. X (Twitter) has strict limits on follow actions.

**Before you start:**
- ❌ **DON'T** follow more than 50-100 accounts per day
- ❌ **DON'T** run this continuously or multiple times per day
- ❌ **DON'T** use obvious bot-like patterns (identical delays)
- ❌ **DON'T** follow random accounts—target your niche
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

**Best for:** Quick follow sessions, targeting up to ~30 users from search results

**Steps:**
1. Go to `x.com/search?q=YOUR_KEYWORD` (e.g., `x.com/search?q=web3%20developer`)
2. Click on "People" tab to show user results, or stay on "Top" for tweet authors
3. Open browser console (F12 → Console tab)
4. Paste the script below and press Enter

```javascript
// ============================================
// XActions - Keyword Follow (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/search?q=YOUR_KEYWORD
// Open console (F12), paste this
// ============================================

(async () => {
  // ==========================================
  // CONFIGURATION - Customize these settings!
  // ==========================================
  const CONFIG = {
    // Follow limits (KEEP THESE LOW!)
    MAX_FOLLOWS: 20,                    // Maximum users to follow per session
    MAX_SCROLLS: 25,                    // Maximum times to scroll for more users
    
    // Filters
    MIN_FOLLOWERS: 50,                  // Skip users with fewer followers
    MAX_FOLLOWERS: 500000,              // Skip mega accounts (unlikely to follow back)
    MUST_HAVE_BIO: false,               // Only follow users with a bio
    SKIP_VERIFIED: false,               // Skip verified accounts
    SKIP_IF_FOLLOWING_YOU: false,       // Skip if they already follow you
    
    // Delays (in milliseconds) - Randomized to seem human
    MIN_DELAY: 5000,                    // Minimum delay between follows (5 seconds)
    MAX_DELAY: 12000,                   // Maximum delay between follows (12 seconds)
    SCROLL_DELAY: 2000,                 // Delay after scrolling
    
    // Safety
    PAUSE_EVERY: 8,                     // Pause every N follows
    PAUSE_DURATION: 20000,              // Pause duration (20 seconds)
  };

  // ==========================================
  // SCRIPT - Don't modify below this line
  // ==========================================
  
  console.log('🔍 XActions - Keyword Follow');
  console.log('='.repeat(50));
  console.log('⚙️  Settings:');
  console.log(`   • Max follows: ${CONFIG.MAX_FOLLOWS}`);
  console.log(`   • Delay: ${CONFIG.MIN_DELAY/1000}s - ${CONFIG.MAX_DELAY/1000}s`);
  console.log(`   • Min followers: ${CONFIG.MIN_FOLLOWERS}`);
  console.log(`   • Max followers: ${CONFIG.MAX_FOLLOWERS}`);
  console.log('');
  console.log('⚠️  Press Ctrl+C in console to stop at any time');
  console.log('='.repeat(50));
  console.log('');

  // Helpers
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // State - track who we've followed to avoid duplicates
  const followedUsers = new Set();
  const processedUsers = new Set();
  let followCount = 0;
  let scrollCount = 0;
  let skippedCount = 0;

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

  // Extract user info from a user cell or tweet article
  const extractUserFromCell = (element) => {
    try {
      // Try to find the username link
      const userLink = element.querySelector('a[href^="/"][role="link"]') ||
                       element.querySelector('a[href^="/"]');
      if (!userLink) return null;
      
      const href = userLink.getAttribute('href') || '';
      const username = href.split('/')[1]?.split('?')[0];
      
      // Skip invalid usernames
      if (!username || username.includes('/') || 
          ['search', 'explore', 'home', 'notifications', 'messages', 'i', 'settings'].includes(username)) {
        return null;
      }
      
      // Get display name
      const nameSpan = element.querySelector('[dir="ltr"] > span > span') ||
                       element.querySelector('[dir="ltr"] > span');
      const displayName = nameSpan?.textContent?.trim() || username;
      
      // Get bio if available
      const bioEl = element.querySelector('[data-testid="UserDescription"]');
      const bio = bioEl?.textContent?.trim() || '';
      
      // Check if verified
      const isVerified = !!element.querySelector('svg[aria-label*="Verified"]') ||
                         !!element.querySelector('[data-testid="icon-verified"]');
      
      // Try to get follower count from user cells
      let followers = 0;
      const statsText = element.textContent || '';
      
      // Look for patterns like "10.5K Followers" or "followers" nearby
      const followerPatterns = [
        /(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/i,
        /[Ff]ollowers\s*(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)/i
      ];
      
      for (const pattern of followerPatterns) {
        const match = statsText.match(pattern);
        if (match) {
          followers = parseFollowerCount(match[1]);
          break;
        }
      }
      
      // Check if already following
      const isFollowing = !!element.querySelector('[data-testid="userActions"] [data-testid*="unfollow"]') ||
                          !!element.querySelector('button[data-testid*="unfollow"]') ||
                          element.textContent?.includes('Following');
      
      // Check if follows you
      const followsYou = element.textContent?.includes('Follows you') || false;
      
      return {
        username,
        displayName,
        bio,
        followers,
        isVerified,
        isFollowing,
        followsYou
      };
    } catch (e) {
      return null;
    }
  };

  // Extract user from tweet article
  const extractUserFromTweet = (article) => {
    try {
      const userLink = article.querySelector('a[href^="/"][role="link"]');
      if (!userLink) return null;
      
      const href = userLink.getAttribute('href') || '';
      const username = href.split('/')[1]?.split('?')[0];
      
      if (!username || username.includes('/') || 
          ['search', 'explore', 'home', 'notifications', 'messages', 'i', 'settings'].includes(username)) {
        return null;
      }
      
      const nameSpan = article.querySelector('[data-testid="User-Name"] [dir="ltr"] > span');
      const displayName = nameSpan?.textContent?.trim() || username;
      
      const isVerified = !!article.querySelector('svg[aria-label*="Verified"]');
      
      return {
        username,
        displayName,
        bio: '',
        followers: 0, // Can't get from tweet view
        isVerified,
        isFollowing: false,
        followsYou: false
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
    if (userInfo.isFollowing) return false;
    
    // Bio requirement
    if (CONFIG.MUST_HAVE_BIO && !userInfo.bio) return false;
    
    // Verified filter
    if (CONFIG.SKIP_VERIFIED && userInfo.isVerified) return false;
    
    // Already follows you
    if (CONFIG.SKIP_IF_FOLLOWING_YOU && userInfo.followsYou) return false;
    
    // Follower count (only check if we have the data)
    if (userInfo.followers > 0) {
      if (userInfo.followers < CONFIG.MIN_FOLLOWERS) return false;
      if (userInfo.followers > CONFIG.MAX_FOLLOWERS) return false;
    }
    
    return true;
  };

  // Follow a user by clicking their follow button
  const followUser = async (element, userInfo) => {
    // Find the follow button
    const followBtn = element.querySelector('button[data-testid$="-follow"]') ||
                      element.querySelector('[role="button"][aria-label*="Follow @"]') ||
                      Array.from(element.querySelectorAll('button')).find(btn => 
                        btn.textContent === 'Follow' && !btn.textContent.includes('Following')
                      );
    
    if (!followBtn) return false;
    
    // Check if button says "Follow" (not "Following" or "Pending")
    const buttonText = followBtn.textContent?.trim() || '';
    if (buttonText !== 'Follow') return false;
    
    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    
    // Click the button
    followBtn.click();
    
    followCount++;
    followedUsers.add(userInfo.username.toLowerCase());
    processedUsers.add(userInfo.username.toLowerCase());
    
    console.log(`✅ [${followCount}/${CONFIG.MAX_FOLLOWS}] Followed @${userInfo.username}` +
                (userInfo.followers ? ` (${userInfo.followers.toLocaleString()} followers)` : ''));
    
    return true;
  };

  // Process user cells (People tab)
  const processUserCells = async () => {
    const userCells = document.querySelectorAll('[data-testid="UserCell"]');
    
    for (const cell of userCells) {
      if (followCount >= CONFIG.MAX_FOLLOWS) return false;
      
      const userInfo = extractUserFromCell(cell);
      if (!passesFilters(userInfo)) {
        if (userInfo?.username) {
          processedUsers.add(userInfo.username.toLowerCase());
        }
        skippedCount++;
        continue;
      }
      
      const followed = await followUser(cell, userInfo);
      
      if (followed) {
        // Random delay
        const delay = randomDelay(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY);
        console.log(`   ⏳ Waiting ${(delay/1000).toFixed(1)}s...`);
        await sleep(delay);
        
        // Periodic pause
        if (followCount > 0 && followCount % CONFIG.PAUSE_EVERY === 0) {
          console.log('');
          console.log(`☕ Taking a ${CONFIG.PAUSE_DURATION/1000}s break for safety...`);
          await sleep(CONFIG.PAUSE_DURATION);
          console.log('🔄 Resuming...');
          console.log('');
        }
      }
    }
    
    return true;
  };

  // Process tweet articles (Top/Latest tabs)
  const processTweets = async () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    
    for (const article of articles) {
      if (followCount >= CONFIG.MAX_FOLLOWS) return false;
      
      const userInfo = extractUserFromTweet(article);
      if (!passesFilters(userInfo)) {
        if (userInfo?.username) {
          processedUsers.add(userInfo.username.toLowerCase());
        }
        continue;
      }
      
      // Need to hover to reveal follow button on tweets
      // Try to find parent cell with follow button
      const userCell = article.querySelector('[data-testid="User-Name"]')?.closest('[data-testid="UserCell"]');
      
      if (userCell) {
        const followed = await followUser(userCell, userInfo);
        if (followed) {
          const delay = randomDelay(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY);
          console.log(`   ⏳ Waiting ${(delay/1000).toFixed(1)}s...`);
          await sleep(delay);
        }
      } else {
        // Mark as processed so we don't try again
        processedUsers.add(userInfo.username.toLowerCase());
        console.log(`ℹ️  Found @${userInfo.username} - visit profile to follow`);
      }
    }
    
    return true;
  };

  // Main loop
  console.log('🔍 Scanning for users to follow...');
  console.log('');

  while (scrollCount < CONFIG.MAX_SCROLLS && followCount < CONFIG.MAX_FOLLOWS) {
    // Process both user cells and tweets
    await processUserCells();
    await processTweets();
    
    if (followCount >= CONFIG.MAX_FOLLOWS) break;

    // Scroll down to load more
    window.scrollBy({ top: 800, behavior: 'smooth' });
    scrollCount++;
    
    // Progress update every 5 scrolls
    if (scrollCount % 5 === 0) {
      console.log(`📊 Progress: ${followCount} followed, ${skippedCount} skipped, ${scrollCount} scrolls`);
    }

    await sleep(CONFIG.SCROLL_DELAY);
  }

  // Final summary
  console.log('');
  console.log('='.repeat(50));
  console.log('✅ KEYWORD FOLLOW COMPLETE');
  console.log('='.repeat(50));
  console.log(`👥 Users followed: ${followCount}`);
  console.log(`⏭️  Users skipped: ${skippedCount}`);
  console.log(`📜 Total scrolls: ${scrollCount}`);
  console.log(`🕐 Session ended: ${new Date().toLocaleTimeString()}`);
  console.log('');
  console.log('📝 Users followed this session:');
  console.log(`   ${Array.from(followedUsers).map(u => '@' + u).join(', ') || 'None'}`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   • Wait at least 2-4 hours before running again');
  console.log('   • Unfollow non-followers after 7-14 days');
  console.log('   • Keep daily follows under 100 for safety');
  console.log('='.repeat(50));

  // Store followed users in localStorage for persistence
  const storedFollows = JSON.parse(localStorage.getItem('xactions_followed') || '[]');
  const newFollows = Array.from(followedUsers).map(username => ({
    username,
    followedAt: new Date().toISOString(),
    source: window.location.href
  }));
  localStorage.setItem('xactions_followed', JSON.stringify([...storedFollows, ...newFollows]));

  // Return results
  return {
    followed: followCount,
    skipped: skippedCount,
    scrolls: scrollCount,
    users: Array.from(followedUsers)
  };
})();
```

**What happens:**
1. Script scans visible users on the search results page
2. Filters users based on your settings (followers, bio, etc.)
3. Clicks the Follow button with random delays
4. Scrolls down to find more users
5. Takes periodic breaks for safety
6. Saves followed users to localStorage

**Output example:**
```
🔍 XActions - Keyword Follow
==================================================
⚙️  Settings:
   • Max follows: 20
   • Delay: 5s - 12s
   • Min followers: 50
   • Max followers: 500000

⚠️  Press Ctrl+C in console to stop at any time
==================================================

🔍 Scanning for users to follow...

✅ [1/20] Followed @cryptobuilder (12,450 followers)
   ⏳ Waiting 7.3s...
✅ [2/20] Followed @web3dev_sarah (8,200 followers)
   ⏳ Waiting 5.8s...
✅ [3/20] Followed @defi_researcher (45,100 followers)
   ⏳ Waiting 9.2s...
📊 Progress: 3 followed, 12 skipped, 5 scrolls
...

☕ Taking a 20s break for safety...
🔄 Resuming...

...

==================================================
✅ KEYWORD FOLLOW COMPLETE
==================================================
👥 Users followed: 20
⏭️  Users skipped: 87
📜 Total scrolls: 18
🕐 Session ended: 2:45:32 PM

📝 Users followed this session:
   @cryptobuilder, @web3dev_sarah, @defi_researcher, ...

💡 Tips:
   • Wait at least 2-4 hours before running again
   • Unfollow non-followers after 7-14 days
   • Keep daily follows under 100 for safety
==================================================
```

---

## 🖥️ Example 2: Node.js with Puppeteer (Production)

**Best for:** Scheduled keyword campaigns, persistent tracking, detailed logging

**Features:**
- Search for multiple keywords and follow matching users
- Filter by minimum follower count
- Persistent file-based tracking (never follow same user twice)
- Configurable daily limits with built-in enforcement
- Comprehensive logging with timestamps
- Human-like random delays
- Graceful error handling
- Resume support

### Setup

```bash
# Create project folder
mkdir keyword-follow && cd keyword-follow

# Initialize and install dependencies
npm init -y
npm install puppeteer

# Create the script
touch keyword-follow.js
```

### Main Script: `keyword-follow.js`

```javascript
// ============================================
// XActions - Keyword Follow (Node.js + Puppeteer)
// Author: nich (@nichxbt)
//
// Usage:
//   node keyword-follow.js "web3 developer"           # Search and follow
//   node keyword-follow.js "AI startup" --limit 15   # Custom limit
//   node keyword-follow.js --keywords "crypto,defi"  # Multiple keywords
//
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
  // Keywords to search (command line overrides this)
  keywords: ['web3 developer', 'crypto founder', 'blockchain engineer'],
  
  // Browser settings
  headless: true,                       // Set to false to watch the browser
  userDataDir: './browser-data',        // Persistent login session
  viewport: { width: 1280, height: 900 },
  
  // Follow limits (KEEP THESE CONSERVATIVE!)
  maxFollowsPerKeyword: 10,             // Max follows per keyword search
  maxFollowsPerSession: 30,             // Max follows per script run
  maxFollowsPerDay: 80,                 // Max follows per 24 hours
  maxScrollsPerKeyword: 20,             // Max scrolls per keyword
  
  // Filters
  minFollowers: 100,                    // Minimum follower count
  maxFollowers: 500000,                 // Maximum follower count
  mustHaveBio: false,                   // Require bio
  skipVerified: false,                  // Skip verified accounts
  bioKeywords: [],                      // Bio must contain one of these (empty = any)
  
  // Delays (milliseconds) - IMPORTANT FOR SAFETY
  minDelay: 5000,                       // Min delay between follows (5 seconds)
  maxDelay: 15000,                      // Max delay between follows (15 seconds)
  scrollDelay: 2500,                    // Delay after scrolling
  pageLoadDelay: 5000,                  // Wait for page to load
  keywordDelay: 30000,                  // Delay between keyword searches
  
  // Safety pauses
  pauseEvery: 8,                        // Take a break every N follows
  pauseDuration: 30000,                 // Break duration (30 seconds)
  
  // File paths
  followedFile: './followed-users.json',   // Persistent follow tracking
  logDir: './logs',                         // Log directory
  statsFile: './follow-stats.json',         // Daily stats
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay + Math.floor(Math.random() * 1000);
};

const getTimestamp = () => new Date().toISOString();
const getDateKey = () => new Date().toISOString().split('T')[0];

// Ensure directories exist
const ensureDirectories = () => {
  if (!fs.existsSync(CONFIG.userDataDir)) {
    fs.mkdirSync(CONFIG.userDataDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true });
  }
};

// ==========================================
// LOGGER CLASS
// ==========================================

class Logger {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.logFile = path.join(CONFIG.logDir, `keyword-follow-${getDateKey()}.log`);
  }

  log(level, message) {
    const timestamp = getTimestamp();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(line);
    fs.appendFileSync(this.logFile, line + '\n');
  }

  info(message) { this.log('info', message); }
  success(message) { this.log('success', `✅ ${message}`); }
  warning(message) { this.log('warning', `⚠️  ${message}`); }
  error(message) { this.log('error', `❌ ${message}`); }
  follow(message) { this.log('follow', `👥 ${message}`); }
}

// ==========================================
// FOLLOWED USERS TRACKER
// ==========================================

class FollowedUsersTracker {
  constructor() {
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(CONFIG.followedFile)) {
        this.users = JSON.parse(fs.readFileSync(CONFIG.followedFile, 'utf8'));
      } else {
        this.users = {};
      }
    } catch (e) {
      this.users = {};
    }
  }

  save() {
    fs.writeFileSync(CONFIG.followedFile, JSON.stringify(this.users, null, 2));
  }

  hasFollowed(username) {
    return !!this.users[username.toLowerCase()];
  }

  addFollow(username, keyword, extraData = {}) {
    this.users[username.toLowerCase()] = {
      username: username,
      followedAt: new Date().toISOString(),
      keyword: keyword,
      followedBack: null,
      checkedAt: null,
      ...extraData
    };
    this.save();
  }

  getCount() {
    return Object.keys(this.users).length;
  }

  getFollowedToday() {
    const today = getDateKey();
    return Object.values(this.users).filter(u => 
      u.followedAt && u.followedAt.startsWith(today)
    ).length;
  }

  canFollowMore() {
    return this.getFollowedToday() < CONFIG.maxFollowsPerDay;
  }

  getRemainingToday() {
    return Math.max(0, CONFIG.maxFollowsPerDay - this.getFollowedToday());
  }

  // Export to CSV
  exportCSV(filename = 'followed-users.csv') {
    const headers = ['username', 'followedAt', 'keyword', 'followedBack', 'checkedAt'];
    const rows = Object.values(this.users).map(u => 
      headers.map(h => u[h] || '').join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    fs.writeFileSync(filename, csv);
    return filename;
  }
}

// ==========================================
// STATS TRACKER
// ==========================================

class StatsTracker {
  constructor() {
    this.loadStats();
  }

  loadStats() {
    try {
      if (fs.existsSync(CONFIG.statsFile)) {
        this.stats = JSON.parse(fs.readFileSync(CONFIG.statsFile, 'utf8'));
      } else {
        this.stats = {};
      }
    } catch (e) {
      this.stats = {};
    }
  }

  saveStats() {
    fs.writeFileSync(CONFIG.statsFile, JSON.stringify(this.stats, null, 2));
  }

  recordSession(keyword, followCount) {
    const today = getDateKey();
    if (!this.stats[today]) {
      this.stats[today] = { totalFollows: 0, sessions: [], keywords: {} };
    }
    
    this.stats[today].totalFollows += followCount;
    this.stats[today].sessions.push({
      time: getTimestamp(),
      keyword,
      follows: followCount
    });
    
    if (!this.stats[today].keywords[keyword]) {
      this.stats[today].keywords[keyword] = 0;
    }
    this.stats[today].keywords[keyword] += followCount;
    
    this.saveStats();
  }
}

// ==========================================
// BROWSER AUTOMATION
// ==========================================

async function launchBrowser(headless = CONFIG.headless) {
  return await puppeteer.launch({
    headless,
    userDataDir: CONFIG.userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,900'
    ]
  });
}

async function checkLogin(page, logger) {
  logger.info('Checking login status...');
  
  await page.goto('https://x.com/home', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  await sleep(3000);
  
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="SideNav_NewTweet_Button"]') ||
           !!document.querySelector('[data-testid="AppTabBar_Profile_Link"]') ||
           !!document.querySelector('[aria-label="Post"]');
  });
  
  return isLoggedIn;
}

async function promptLogin(logger) {
  logger.warning('Not logged in to X/Twitter');
  logger.info('Opening browser for manual login...');
  
  console.log('\n' + '='.repeat(50));
  console.log('🔐 LOGIN REQUIRED');
  console.log('='.repeat(50));
  console.log('1. A browser window will open');
  console.log('2. Log in to your X/Twitter account');
  console.log('3. Complete any 2FA if prompted');
  console.log('4. Press ENTER here when done');
  console.log('='.repeat(50) + '\n');
  
  const browser = await launchBrowser(false);
  const page = await browser.newPage();
  await page.goto('https://x.com/login', { waitUntil: 'networkidle2' });
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  logger.success('Login saved! Session will persist for future runs.');
}

// ==========================================
// USER EXTRACTION & FOLLOWING
// ==========================================

async function searchForKeyword(page, keyword, logger) {
  logger.info(`Searching for: "${keyword}"`);
  
  // Navigate to people search
  const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=user`;
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  
  await sleep(CONFIG.pageLoadDelay);
  
  // Wait for user cells to appear
  try {
    await page.waitForSelector('[data-testid="UserCell"]', { timeout: 10000 });
  } catch (e) {
    logger.warning('No user results found for this keyword');
    return false;
  }
  
  return true;
}

async function extractUsersFromPage(page) {
  return await page.evaluate((config) => {
    const users = [];
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    
    cells.forEach(cell => {
      try {
        // Get username
        const link = cell.querySelector('a[href^="/"][role="link"]');
        const href = link?.getAttribute('href') || '';
        const username = href.split('/')[1]?.split('?')[0];
        
        if (!username || username.includes('/')) return;
        
        // Get display name
        const nameSpan = cell.querySelector('[dir="ltr"] > span > span') ||
                         cell.querySelector('[dir="ltr"] > span');
        const displayName = nameSpan?.textContent?.trim() || username;
        
        // Get bio
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || '';
        
        // Check verified
        const isVerified = !!cell.querySelector('svg[aria-label*="Verified"]');
        
        // Check if already following
        const isFollowing = !!cell.querySelector('[data-testid*="unfollow"]') ||
                            cell.textContent?.includes('Following');
        
        // Check follows you
        const followsYou = cell.textContent?.includes('Follows you');
        
        // Try to get follower count
        let followers = 0;
        const statsText = cell.textContent || '';
        const match = statsText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/i);
        if (match) {
          let str = match[1].replace(/,/g, '');
          const num = parseFloat(str);
          if (str.toUpperCase().includes('K')) followers = num * 1000;
          else if (str.toUpperCase().includes('M')) followers = num * 1000000;
          else followers = num;
        }
        
        // Check if follow button is available
        const followBtn = cell.querySelector('button[data-testid$="-follow"]') ||
                          Array.from(cell.querySelectorAll('button')).find(btn => 
                            btn.textContent === 'Follow'
                          );
        const canFollow = !!followBtn && !isFollowing;
        
        users.push({
          username,
          displayName,
          bio,
          followers,
          isVerified,
          isFollowing,
          followsYou,
          canFollow
        });
      } catch (e) {
        // Skip
      }
    });
    
    return users;
  }, CONFIG);
}

async function followUserOnPage(page, username, logger) {
  return await page.evaluate((targetUsername) => {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    
    for (const cell of cells) {
      const link = cell.querySelector('a[href^="/"][role="link"]');
      const href = link?.getAttribute('href') || '';
      const cellUsername = href.split('/')[1]?.split('?')[0];
      
      if (cellUsername?.toLowerCase() === targetUsername.toLowerCase()) {
        const followBtn = cell.querySelector('button[data-testid$="-follow"]') ||
                          Array.from(cell.querySelectorAll('button')).find(btn => 
                            btn.textContent === 'Follow' && !btn.textContent.includes('Following')
                          );
        
        if (followBtn) {
          followBtn.click();
          return true;
        }
      }
    }
    
    return false;
  }, username);
}

function passesFilters(user, followedTracker) {
  if (!user || !user.username) return false;
  
  // Already followed before
  if (followedTracker.hasFollowed(user.username)) return false;
  
  // Already following
  if (user.isFollowing) return false;
  
  // Can't follow
  if (!user.canFollow) return false;
  
  // Bio requirement
  if (CONFIG.mustHaveBio && !user.bio) return false;
  
  // Verified filter
  if (CONFIG.skipVerified && user.isVerified) return false;
  
  // Bio keywords
  if (CONFIG.bioKeywords.length > 0) {
    const bioLower = user.bio.toLowerCase();
    if (!CONFIG.bioKeywords.some(kw => bioLower.includes(kw.toLowerCase()))) {
      return false;
    }
  }
  
  // Follower count
  if (user.followers > 0) {
    if (user.followers < CONFIG.minFollowers) return false;
    if (user.followers > CONFIG.maxFollowers) return false;
  }
  
  return true;
}

// ==========================================
// MAIN KEYWORD FOLLOW FUNCTION
// ==========================================

async function keywordFollow(keywords = CONFIG.keywords, options = {}) {
  const sessionId = Date.now().toString(36);
  const logger = new Logger(sessionId);
  const followedTracker = new FollowedUsersTracker();
  const statsTracker = new StatsTracker();
  
  ensureDirectories();
  
  // Session stats
  let totalFollowed = 0;
  let totalSkipped = 0;
  const sessionFollows = [];
  
  logger.info('='.repeat(50));
  logger.info('🔍 XActions - Keyword Follow');
  logger.info('='.repeat(50));
  logger.info(`Keywords: ${keywords.join(', ')}`);
  logger.info(`Max follows per keyword: ${CONFIG.maxFollowsPerKeyword}`);
  logger.info(`Max follows per session: ${CONFIG.maxFollowsPerSession}`);
  logger.info(`Already tracked: ${followedTracker.getCount()} users`);
  logger.info(`Followed today: ${followedTracker.getFollowedToday()}/${CONFIG.maxFollowsPerDay}`);
  logger.info('='.repeat(50));
  
  // Check daily limit
  if (!followedTracker.canFollowMore()) {
    logger.warning(`Daily limit reached! Followed ${followedTracker.getFollowedToday()} today.`);
    logger.info('Try again tomorrow or increase maxFollowsPerDay.');
    return { followed: 0, message: 'Daily limit reached' };
  }
  
  let browser;
  let page;
  
  try {
    // Launch browser
    logger.info('Launching browser...');
    browser = await launchBrowser();
    page = await browser.newPage();
    await page.setViewport(CONFIG.viewport);
    
    // Check login
    const isLoggedIn = await checkLogin(page, logger);
    
    if (!isLoggedIn) {
      await browser.close();
      await promptLogin(logger);
      
      // Relaunch
      browser = await launchBrowser();
      page = await browser.newPage();
      await page.setViewport(CONFIG.viewport);
      
      const stillNotLoggedIn = !(await checkLogin(page, logger));
      if (stillNotLoggedIn) {
        throw new Error('Login failed. Please try again.');
      }
    }
    
    logger.success('Logged in successfully!');
    
    // Process each keyword
    for (const keyword of keywords) {
      if (totalFollowed >= CONFIG.maxFollowsPerSession) {
        logger.info('Session follow limit reached');
        break;
      }
      
      if (!followedTracker.canFollowMore()) {
        logger.warning('Daily follow limit reached');
        break;
      }
      
      logger.info('');
      logger.info(`━━━ Searching: "${keyword}" ━━━`);
      
      const hasResults = await searchForKeyword(page, keyword, logger);
      if (!hasResults) continue;
      
      let keywordFollows = 0;
      let scrolls = 0;
      const processedThisKeyword = new Set();
      
      while (
        keywordFollows < CONFIG.maxFollowsPerKeyword &&
        totalFollowed < CONFIG.maxFollowsPerSession &&
        scrolls < CONFIG.maxScrollsPerKeyword &&
        followedTracker.canFollowMore()
      ) {
        // Extract users
        const users = await extractUsersFromPage(page);
        
        for (const user of users) {
          if (processedThisKeyword.has(user.username.toLowerCase())) continue;
          processedThisKeyword.add(user.username.toLowerCase());
          
          if (!passesFilters(user, followedTracker)) {
            totalSkipped++;
            continue;
          }
          
          if (keywordFollows >= CONFIG.maxFollowsPerKeyword) break;
          if (totalFollowed >= CONFIG.maxFollowsPerSession) break;
          
          // Follow the user
          const success = await followUserOnPage(page, user.username, logger);
          
          if (success) {
            keywordFollows++;
            totalFollowed++;
            
            followedTracker.addFollow(user.username, keyword, {
              displayName: user.displayName,
              followers: user.followers,
              bio: user.bio?.substring(0, 200)
            });
            
            sessionFollows.push(user.username);
            
            logger.follow(
              `[${totalFollowed}/${CONFIG.maxFollowsPerSession}] @${user.username}` +
              (user.followers ? ` (${user.followers.toLocaleString()} followers)` : '')
            );
            
            // Random delay
            const delay = randomDelay(CONFIG.minDelay, CONFIG.maxDelay);
            logger.info(`   Waiting ${(delay/1000).toFixed(1)}s...`);
            await sleep(delay);
            
            // Periodic pause
            if (totalFollowed > 0 && totalFollowed % CONFIG.pauseEvery === 0) {
              logger.info('');
              logger.info(`☕ Safety pause: ${CONFIG.pauseDuration/1000}s...`);
              await sleep(CONFIG.pauseDuration);
              logger.info('Resuming...');
            }
          }
        }
        
        // Scroll for more
        await page.evaluate(() => window.scrollBy(0, 600));
        scrolls++;
        await sleep(CONFIG.scrollDelay);
        
        if (scrolls % 5 === 0) {
          logger.info(`   Scrolled ${scrolls}x, found ${keywordFollows} for "${keyword}"`);
        }
      }
      
      logger.info(`   ✓ Followed ${keywordFollows} users from "${keyword}"`);
      statsTracker.recordSession(keyword, keywordFollows);
      
      // Delay between keywords
      if (keywords.indexOf(keyword) < keywords.length - 1 && keywordFollows > 0) {
        logger.info(`   Waiting ${CONFIG.keywordDelay/1000}s before next keyword...`);
        await sleep(CONFIG.keywordDelay);
      }
    }
    
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Final summary
  logger.info('');
  logger.info('='.repeat(50));
  logger.success('KEYWORD FOLLOW COMPLETE');
  logger.info('='.repeat(50));
  logger.info(`👥 Users followed: ${totalFollowed}`);
  logger.info(`⏭️  Users skipped: ${totalSkipped}`);
  logger.info(`📅 Total followed today: ${followedTracker.getFollowedToday()}/${CONFIG.maxFollowsPerDay}`);
  logger.info(`📊 All-time tracked: ${followedTracker.getCount()} users`);
  logger.info('');
  logger.info('Users followed this session:');
  sessionFollows.forEach(u => logger.info(`   • @${u}`));
  logger.info('');
  logger.info('💾 Data saved to:');
  logger.info(`   • ${CONFIG.followedFile}`);
  logger.info(`   • ${CONFIG.statsFile}`);
  logger.info('='.repeat(50));
  
  return {
    followed: totalFollowed,
    skipped: totalSkipped,
    users: sessionFollows,
    todayTotal: followedTracker.getFollowedToday()
  };
}

// ==========================================
// CLI INTERFACE
// ==========================================

async function main() {
  const args = process.argv.slice(2);
  let keywords = CONFIG.keywords;
  let limit = CONFIG.maxFollowsPerSession;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keywords' && args[i + 1]) {
      keywords = args[i + 1].split(',').map(k => k.trim());
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      CONFIG.maxFollowsPerSession = limit;
      i++;
    } else if (args[i] === '--min-followers' && args[i + 1]) {
      CONFIG.minFollowers = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--headless') {
      CONFIG.headless = true;
    } else if (args[i] === '--visible') {
      CONFIG.headless = false;
    } else if (args[i] === '--export-csv') {
      const tracker = new FollowedUsersTracker();
      const file = tracker.exportCSV();
      console.log(`✅ Exported to ${file}`);
      return;
    } else if (args[i] === '--stats') {
      const tracker = new FollowedUsersTracker();
      console.log('📊 Keyword Follow Stats:');
      console.log(`   Total followed: ${tracker.getCount()}`);
      console.log(`   Followed today: ${tracker.getFollowedToday()}`);
      console.log(`   Remaining today: ${tracker.getRemainingToday()}`);
      return;
    } else if (args[i] === '--help') {
      console.log(`
🔍 XActions - Keyword Follow

Usage:
  node keyword-follow.js [keyword]                    Search and follow
  node keyword-follow.js --keywords "crypto,defi"    Multiple keywords
  node keyword-follow.js "AI startup" --limit 15     Custom limit
  node keyword-follow.js --min-followers 500         Filter by followers
  node keyword-follow.js --visible                   Show browser window
  node keyword-follow.js --export-csv                Export follows to CSV
  node keyword-follow.js --stats                     Show statistics
  node keyword-follow.js --help                      Show this help

Examples:
  node keyword-follow.js "web3 developer"
  node keyword-follow.js --keywords "crypto,nft,defi" --limit 20
  node keyword-follow.js "AI researcher" --min-followers 1000 --visible
      `);
      return;
    } else if (!args[i].startsWith('--')) {
      // Single keyword as positional argument
      keywords = [args[i]];
    }
  }
  
  await keywordFollow(keywords);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { keywordFollow, FollowedUsersTracker, CONFIG };
```

### Running the Script

```bash
# First run (will prompt for login)
node keyword-follow.js "web3 developer"

# With custom limit
node keyword-follow.js "crypto founder" --limit 15

# Multiple keywords
node keyword-follow.js --keywords "AI,machine learning,deep learning"

# With minimum follower filter
node keyword-follow.js "startup" --min-followers 500

# Watch the browser (not headless)
node keyword-follow.js "defi" --visible

# Check your stats
node keyword-follow.js --stats

# Export followed users to CSV
node keyword-follow.js --export-csv
```

### Output Example

```
[2026-01-15T10:30:00.000Z] [INFO] ==================================================
[2026-01-15T10:30:00.001Z] [INFO] 🔍 XActions - Keyword Follow
[2026-01-15T10:30:00.002Z] [INFO] ==================================================
[2026-01-15T10:30:00.003Z] [INFO] Keywords: web3 developer, crypto founder
[2026-01-15T10:30:00.004Z] [INFO] Max follows per keyword: 10
[2026-01-15T10:30:00.005Z] [INFO] Max follows per session: 30
[2026-01-15T10:30:00.006Z] [INFO] Already tracked: 156 users
[2026-01-15T10:30:00.007Z] [INFO] Followed today: 12/80
[2026-01-15T10:30:00.008Z] [INFO] ==================================================
[2026-01-15T10:30:00.009Z] [INFO] Launching browser...
[2026-01-15T10:30:02.500Z] [INFO] Checking login status...
[2026-01-15T10:30:05.800Z] [SUCCESS] ✅ Logged in successfully!
[2026-01-15T10:30:05.801Z] [INFO] 
[2026-01-15T10:30:05.802Z] [INFO] ━━━ Searching: "web3 developer" ━━━
[2026-01-15T10:30:08.100Z] [INFO] Searching for: "web3 developer"
[2026-01-15T10:30:13.500Z] [FOLLOW] 👥 [1/30] @cryptobuilder (15,200 followers)
[2026-01-15T10:30:13.501Z] [INFO]    Waiting 7.3s...
[2026-01-15T10:30:21.000Z] [FOLLOW] 👥 [2/30] @web3_sarah (8,400 followers)
[2026-01-15T10:30:21.001Z] [INFO]    Waiting 9.1s...
...

[2026-01-15T10:45:30.000Z] [INFO] ==================================================
[2026-01-15T10:45:30.001Z] [SUCCESS] ✅ KEYWORD FOLLOW COMPLETE
[2026-01-15T10:45:30.002Z] [INFO] ==================================================
[2026-01-15T10:45:30.003Z] [INFO] 👥 Users followed: 20
[2026-01-15T10:45:30.004Z] [INFO] ⏭️  Users skipped: 85
[2026-01-15T10:45:30.005Z] [INFO] 📅 Total followed today: 32/80
[2026-01-15T10:45:30.006Z] [INFO] 📊 All-time tracked: 176 users
[2026-01-15T10:45:30.007Z] [INFO] 
[2026-01-15T10:45:30.008Z] [INFO] Users followed this session:
[2026-01-15T10:45:30.009Z] [INFO]    • @cryptobuilder
[2026-01-15T10:45:30.010Z] [INFO]    • @web3_sarah
[2026-01-15T10:45:30.011Z] [INFO]    • @defi_dev_mike
...
```

---

## 📂 Data Files

The script creates these files:

### `followed-users.json`
```json
{
  "cryptobuilder": {
    "username": "cryptobuilder",
    "followedAt": "2026-01-15T10:30:13.500Z",
    "keyword": "web3 developer",
    "displayName": "Crypto Builder 🛠️",
    "followers": 15200,
    "bio": "Building the future of web3. Smart contracts, DeFi, NFTs.",
    "followedBack": null,
    "checkedAt": null
  },
  "web3_sarah": {
    "username": "web3_sarah",
    "followedAt": "2026-01-15T10:30:21.000Z",
    "keyword": "web3 developer",
    "displayName": "Sarah | Web3 Dev",
    "followers": 8400,
    "bio": "Full-stack blockchain developer. Solidity / Rust / TypeScript.",
    "followedBack": null,
    "checkedAt": null
  }
}
```

### `follow-stats.json`
```json
{
  "2026-01-15": {
    "totalFollows": 32,
    "sessions": [
      { "time": "2026-01-15T10:30:00.000Z", "keyword": "web3 developer", "follows": 10 },
      { "time": "2026-01-15T10:42:00.000Z", "keyword": "crypto founder", "follows": 10 }
    ],
    "keywords": {
      "web3 developer": 10,
      "crypto founder": 10
    }
  }
}
```

---

## 💡 Strategy Tips

### 🎯 Best Keywords to Target

**Tech & Crypto:**
- `web3 developer`, `blockchain engineer`, `solidity dev`
- `crypto founder`, `defi builder`, `nft creator`
- `AI researcher`, `machine learning engineer`
- `startup founder`, `indie hacker`, `solopreneur`

**Business & Marketing:**
- `growth hacker`, `content creator`, `digital marketer`
- `saas founder`, `product manager`, `ux designer`
- `entrepreneur`, `business coach`, `sales leader`

**Creative:**
- `digital artist`, `graphic designer`, `video creator`
- `photographer`, `music producer`, `game developer`

**Niche-specific:**
- Use hashtags: `#buildinpublic`, `#indiehackers`, `#100DaysOfCode`
- Use events: `ETHDenver`, `Consensus`, `TechCrunch`
- Use tools: `Figma designer`, `Notion expert`, `Airtable`

### 📊 Recommended Limits

| Account Age | Daily Follows | Session Follows | Delay Between |
|-------------|---------------|-----------------|---------------|
| < 1 month   | 20-30         | 10-15           | 15-30 seconds |
| 1-6 months  | 40-60         | 15-25           | 10-20 seconds |
| 6+ months   | 60-100        | 20-30           | 5-15 seconds  |
| 1+ year     | 80-150        | 25-40           | 5-12 seconds  |

### 🔄 Follow-Back Strategy

1. **Follow targeted users** with this script
2. **Wait 7-14 days** for follow-backs
3. **Check who followed back** using the detect-unfollowers script
4. **Unfollow non-followers** using the unfollow-non-followers script
5. **Repeat** with new keywords

### ⚠️ Avoid These Mistakes

- ❌ Following hundreds of accounts in one day
- ❌ Using the same keywords everyone else uses
- ❌ Following accounts with 0 tweets (likely bots)
- ❌ Following private accounts (waste of follow)
- ❌ Running multiple automation scripts at once
- ❌ Identical timing patterns (no randomization)

### ✅ Best Practices

- ✅ Target users with 100-50K followers (more likely to follow back)
- ✅ Focus on users who tweet regularly (active accounts)
- ✅ Mix automated follows with genuine engagement (likes, replies)
- ✅ Run the script at different times of day
- ✅ Keep your following/follower ratio reasonable (<1.5x)
- ✅ Engage with content from people you follow

---

## 🌐 Website Alternative

Don't want to run scripts? Use the web dashboard at **[xactions.app](https://xactions.app)**:

### Features:
- ✨ **No coding required** - Just enter keywords and click
- 🔐 **Secure authentication** - OAuth with X/Twitter
- 📊 **Visual dashboard** - Track follows, follow-backs, and growth
- ⏰ **Scheduled campaigns** - Set it and forget it
- 🎯 **Advanced filters** - Filter by bio, location, verified status
- 📈 **Analytics** - See which keywords bring the best results
- 🔄 **Auto-unfollow** - Automatically unfollow non-followers after X days

### Pricing:
- **Free tier**: 20 follows/day, 1 keyword
- **Pro ($9/mo)**: 100 follows/day, unlimited keywords, scheduling
- **Business ($29/mo)**: 300 follows/day, multi-account, API access

[Get started at xactions.app →](https://xactions.app)

---

## 📚 Related Guides

- [🔍 Detect Unfollowers](detect-unfollowers.md) - Find who doesn't follow you back
- [👋 Unfollow Non-Followers](unfollow-non-followers.md) - Clean up your following list
- [❤️ Auto-Liker](auto-liker.md) - Automatically like tweets
- [👥 Followers Scraping](followers-scraping.md) - Export follower lists
- [📊 Growth Suite](growth-suite.md) - Complete growth automation

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))

**License:** MIT - Use responsibly!
