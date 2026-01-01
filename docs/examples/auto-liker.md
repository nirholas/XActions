# ❤️ Auto-Liker

Automatically like tweets matching your criteria on X (Twitter).

---

## 📋 What It Does

This feature helps you engage with content automatically by:

1. **Scanning tweets** - Monitors your timeline, search results, or user profiles
2. **Keyword matching** - Only likes tweets containing specific keywords (optional)
3. **Smart filtering** - Skips replies, ads, and already-liked tweets
4. **Rate limiting** - Uses random delays to mimic human behavior
5. **Progress tracking** - Shows real-time stats and logs all actions

**Use cases:**
- Engage with tweets about topics you care about
- Support accounts you follow with automated likes
- Build engagement on specific hashtags or keywords
- Save time while maintaining an active presence
- Grow your network through consistent engagement

---

## ⚠️ IMPORTANT WARNINGS

> **🚨 USE RESPONSIBLY!** Automated liking can get your account restricted or permanently suspended if overdone. X (Twitter) actively detects and penalizes bot-like behavior.

**Before you start:**
- ❌ **DON'T** run this 24/7
- ❌ **DON'T** like more than 50-100 tweets per day
- ❌ **DON'T** use identical delays every time
- ❌ **DON'T** run multiple automation scripts simultaneously
- ✅ **DO** use random delays between actions
- ✅ **DO** take breaks between sessions
- ✅ **DO** mix automated and manual activity
- ✅ **DO** start with low limits and increase gradually

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Quick engagement sessions, liking up to ~30 tweets

**Steps:**
1. Go to `x.com/search?q=your-keyword` or your timeline
2. Open browser console (F12 → Console tab)
3. Paste the script below and press Enter

```javascript
// ============================================
// XActions - Auto-Liker (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/search or your timeline
// Open console (F12), paste this
// ============================================

(async () => {
  // ==========================================
  // CONFIGURATION - Customize these settings!
  // ==========================================
  const CONFIG = {
    // Targeting
    KEYWORDS: [],                       // Keywords to match (empty = like ALL visible tweets)
    SKIP_REPLIES: true,                 // Skip tweets that are replies
    SKIP_RETWEETS: true,                // Skip retweets
    SKIP_ADS: true,                     // Skip promoted tweets
    
    // Limits (KEEP THESE LOW!)
    MAX_LIKES: 25,                      // Maximum tweets to like per session
    MAX_SCROLLS: 30,                    // Maximum times to scroll down
    
    // Delays (in milliseconds) - Randomized to seem human
    MIN_DELAY: 3000,                    // Minimum delay between likes (3 seconds)
    MAX_DELAY: 8000,                    // Maximum delay between likes (8 seconds)
    SCROLL_DELAY: 2000,                 // Delay after scrolling
    
    // Safety
    PAUSE_EVERY: 10,                    // Pause every N likes
    PAUSE_DURATION: 15000,              // Pause duration (15 seconds)
  };

  // ==========================================
  // SCRIPT - Don't modify below this line
  // ==========================================
  
  console.log('❤️  XActions - Auto-Liker');
  console.log('='.repeat(50));
  console.log('⚙️  Settings:');
  console.log(`   • Keywords: ${CONFIG.KEYWORDS.length ? CONFIG.KEYWORDS.join(', ') : 'ALL TWEETS'}`);
  console.log(`   • Max likes: ${CONFIG.MAX_LIKES}`);
  console.log(`   • Delay: ${CONFIG.MIN_DELAY/1000}s - ${CONFIG.MAX_DELAY/1000}s`);
  console.log(`   • Skip replies: ${CONFIG.SKIP_REPLIES ? 'Yes' : 'No'}`);
  console.log(`   • Skip retweets: ${CONFIG.SKIP_RETWEETS ? 'Yes' : 'No'}`);
  console.log('');
  console.log('⚠️  Press Ctrl+C in console to stop at any time');
  console.log('='.repeat(50));
  console.log('');

  // Helpers
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // State
  let likeCount = 0;
  let scrollCount = 0;
  let skippedCount = 0;
  const likedTweetIds = new Set();
  const processedTweets = new Set();

  // Check if tweet matches keywords
  const matchesKeywords = (text) => {
    if (CONFIG.KEYWORDS.length === 0) return true;
    const lowerText = text.toLowerCase();
    return CONFIG.KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
  };

  // Get unique tweet identifier
  const getTweetId = (article) => {
    const link = article.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    // Fallback: use text content hash
    const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
    return text.substring(0, 100);
  };

  // Check if tweet is a reply
  const isReply = (article) => {
    const text = article.innerText || '';
    return text.includes('Replying to @') || 
           !!article.querySelector('[data-testid="Tweet-User-Avatar"]')?.closest('article')?.innerHTML?.includes('Replying to');
  };

  // Check if tweet is a retweet
  const isRetweet = (article) => {
    const socialContext = article.querySelector('[data-testid="socialContext"]');
    return socialContext?.textContent?.includes('reposted') || 
           socialContext?.textContent?.includes('Retweeted');
  };

  // Check if tweet is an ad
  const isAd = (article) => {
    return !!article.querySelector('[data-testid="placementTracking"]') ||
           article.innerText?.includes('Promoted') ||
           article.innerText?.includes('Ad');
  };

  // Check if already liked
  const isAlreadyLiked = (article) => {
    const unlikeBtn = article.querySelector('[data-testid="unlike"]');
    return !!unlikeBtn;
  };

  // Like a single tweet
  const likeTweet = async (article, tweetId) => {
    const likeBtn = article.querySelector('[data-testid="like"]');
    if (!likeBtn) return false;

    // Scroll tweet into view
    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);

    // Click like button
    likeBtn.click();
    likeCount++;
    likedTweetIds.add(tweetId);

    // Get tweet preview for logging
    const textEl = article.querySelector('[data-testid="tweetText"]');
    const preview = textEl?.textContent?.substring(0, 50) || '[No text]';
    
    console.log(`❤️  [${likeCount}/${CONFIG.MAX_LIKES}] Liked: "${preview}..."`);
    
    return true;
  };

  // Process all visible tweets
  const processVisibleTweets = async () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    
    for (const article of articles) {
      // Check if we've hit our limit
      if (likeCount >= CONFIG.MAX_LIKES) {
        console.log('');
        console.log('🎯 Reached maximum likes limit!');
        return false;
      }

      const tweetId = getTweetId(article);
      if (!tweetId || processedTweets.has(tweetId)) continue;
      processedTweets.add(tweetId);

      // Skip already liked
      if (isAlreadyLiked(article)) {
        continue;
      }

      // Skip based on settings
      if (CONFIG.SKIP_REPLIES && isReply(article)) {
        skippedCount++;
        continue;
      }

      if (CONFIG.SKIP_RETWEETS && isRetweet(article)) {
        skippedCount++;
        continue;
      }

      if (CONFIG.SKIP_ADS && isAd(article)) {
        skippedCount++;
        continue;
      }

      // Check keyword match
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const tweetText = textEl?.textContent || '';
      
      if (!matchesKeywords(tweetText)) {
        skippedCount++;
        continue;
      }

      // Like this tweet!
      const liked = await likeTweet(article, tweetId);
      
      if (liked) {
        // Random delay between likes
        const delay = randomDelay(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY);
        console.log(`   ⏳ Waiting ${(delay/1000).toFixed(1)}s...`);
        await sleep(delay);

        // Periodic pause for safety
        if (likeCount > 0 && likeCount % CONFIG.PAUSE_EVERY === 0) {
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

  // Main loop
  console.log('🔍 Scanning for tweets to like...');
  console.log('');

  while (scrollCount < CONFIG.MAX_SCROLLS && likeCount < CONFIG.MAX_LIKES) {
    const shouldContinue = await processVisibleTweets();
    if (!shouldContinue) break;

    // Scroll down to load more tweets
    window.scrollBy({ top: 800, behavior: 'smooth' });
    scrollCount++;
    
    // Progress update every 5 scrolls
    if (scrollCount % 5 === 0) {
      console.log(`📊 Progress: ${likeCount} liked, ${skippedCount} skipped, ${scrollCount} scrolls`);
    }

    await sleep(CONFIG.SCROLL_DELAY);
  }

  // Final summary
  console.log('');
  console.log('='.repeat(50));
  console.log('✅ AUTO-LIKER COMPLETE');
  console.log('='.repeat(50));
  console.log(`❤️  Tweets liked: ${likeCount}`);
  console.log(`⏭️  Tweets skipped: ${skippedCount}`);
  console.log(`📜 Total scrolls: ${scrollCount}`);
  console.log(`🕐 Session ended: ${new Date().toLocaleTimeString()}`);
  console.log('');
  console.log('💡 Tip: Wait at least 1-2 hours before running again!');
  console.log('='.repeat(50));

  // Return results
  return {
    liked: likeCount,
    skipped: skippedCount,
    scrolls: scrollCount,
    tweetIds: Array.from(likedTweetIds)
  };
})();
```

**What happens:**
1. Script scans visible tweets on the page
2. Filters based on your settings (keywords, replies, retweets, ads)
3. Likes matching tweets with random delays
4. Scrolls down to find more tweets
5. Takes periodic breaks for safety
6. Stops when reaching your limit

**Output example:**
```
❤️  XActions - Auto-Liker
==================================================
⚙️  Settings:
   • Keywords: ALL TWEETS
   • Max likes: 25
   • Delay: 3s - 8s
   • Skip replies: Yes
   • Skip retweets: Yes

⚠️  Press Ctrl+C in console to stop at any time
==================================================

🔍 Scanning for tweets to like...

❤️  [1/25] Liked: "Just launched my new project! Check it out..."
   ⏳ Waiting 4.2s...
❤️  [2/25] Liked: "Great thread on web development best practi..."
   ⏳ Waiting 6.1s...
❤️  [3/25] Liked: "The future of AI is looking incredible..."
   ⏳ Waiting 3.8s...
📊 Progress: 3 liked, 5 skipped, 5 scrolls
...

☕ Taking a 15s break for safety...
🔄 Resuming...

...

==================================================
✅ AUTO-LIKER COMPLETE
==================================================
❤️  Tweets liked: 25
⏭️  Tweets skipped: 47
📜 Total scrolls: 18
🕐 Session ended: 2:45:32 PM

💡 Tip: Wait at least 1-2 hours before running again!
==================================================
```

---

## 🖥️ Example 2: Node.js with Puppeteer (Production)

**Best for:** Scheduled engagement, keyword-based campaigns, detailed logging

**Features:**
- Search for specific keywords and like matching tweets
- Persistent browser session (stay logged in)
- Comprehensive logging with timestamps
- Configurable daily limits with built-in tracking
- Human-like random delays
- Graceful error handling

### Setup

```bash
# Create project folder
mkdir auto-liker && cd auto-liker

# Initialize and install dependencies
npm init -y
npm install puppeteer

# Create the script
touch auto-liker.js
```

### Main Script: `auto-liker.js`

```javascript
// ============================================
// XActions - Auto-Liker (Node.js + Puppeteer)
// Author: nich (@nichxbt)
//
// Usage:
//   node auto-liker.js "web3"              # Like tweets about web3
//   node auto-liker.js "AI" --limit 20     # Like 20 tweets about AI
//   node auto-liker.js --timeline          # Like from your timeline
//
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
  // Browser settings
  headless: true,                       // Set to false to watch the browser
  userDataDir: './browser-data',        // Persistent login session
  viewport: { width: 1280, height: 900 },
  
  // Limits (KEEP THESE CONSERVATIVE!)
  maxLikesPerSession: 30,               // Max likes per script run
  maxLikesPerDay: 100,                  // Max likes per 24 hours
  maxScrolls: 50,                       // Max page scrolls
  
  // Delays (milliseconds) - IMPORTANT FOR SAFETY
  minDelay: 4000,                       // Min delay between likes (4 seconds)
  maxDelay: 10000,                      // Max delay between likes (10 seconds)
  scrollDelay: 2500,                    // Delay after scrolling
  pageLoadDelay: 5000,                  // Wait for page to load
  
  // Safety pauses
  pauseEvery: 8,                        // Take a break every N likes
  pauseDuration: 20000,                 // Break duration (20 seconds)
  
  // Filters
  skipReplies: true,                    // Skip reply tweets
  skipRetweets: true,                   // Skip retweets
  skipAds: true,                        // Skip promoted content
  
  // Logging
  logDir: './logs',                     // Where to save logs
  statsFile: './like-stats.json',       // Daily stats tracking
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  // Add small random variation for more human-like behavior
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

// Logger with file output
class Logger {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.logFile = path.join(CONFIG.logDir, `auto-liker-${getDateKey()}.log`);
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
  action(message) { this.log('action', `❤️  ${message}`); }
}

// Daily stats tracker
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

  getTodayLikes() {
    const today = getDateKey();
    return this.stats[today]?.likes || 0;
  }

  addLike() {
    const today = getDateKey();
    if (!this.stats[today]) {
      this.stats[today] = { likes: 0, sessions: 0 };
    }
    this.stats[today].likes++;
    this.saveStats();
  }

  startSession() {
    const today = getDateKey();
    if (!this.stats[today]) {
      this.stats[today] = { likes: 0, sessions: 0 };
    }
    this.stats[today].sessions++;
    this.saveStats();
  }

  canLikeMore() {
    return this.getTodayLikes() < CONFIG.maxLikesPerDay;
  }

  getRemainingLikes() {
    return Math.max(0, CONFIG.maxLikesPerDay - this.getTodayLikes());
  }
}

// ==========================================
// BROWSER AUTOMATION
// ==========================================

async function launchBrowser() {
  return await puppeteer.launch({
    headless: CONFIG.headless,
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
  
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: CONFIG.userDataDir,
    args: ['--no-sandbox', '--window-size=1280,900']
  });
  
  const page = await browser.newPage();
  await page.goto('https://x.com/login', { waitUntil: 'networkidle2' });
  
  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  logger.success('Login saved! Session will persist for future runs.');
}

// ==========================================
// AUTO-LIKER LOGIC
// ==========================================

async function autoLike(searchQuery, options = {}) {
  const sessionId = Date.now().toString(36);
  const logger = new Logger(sessionId);
  const stats = new StatsTracker();
  
  ensureDirectories();
  
  // Log session start
  console.log('\n' + '='.repeat(60));
  console.log('❤️  XACTIONS AUTO-LIKER');
  console.log('='.repeat(60));
  
  logger.info(`Session ID: ${sessionId}`);
  logger.info(`Search query: ${searchQuery || 'Timeline'}`);
  logger.info(`Max likes this session: ${options.limit || CONFIG.maxLikesPerSession}`);
  
  // Check daily limit
  const todayLikes = stats.getTodayLikes();
  const remainingLikes = stats.getRemainingLikes();
  
  logger.info(`Today's likes so far: ${todayLikes}/${CONFIG.maxLikesPerDay}`);
  
  if (!stats.canLikeMore()) {
    logger.warning(`Daily limit reached (${CONFIG.maxLikesPerDay} likes)`);
    logger.info('Try again tomorrow to avoid account restrictions.');
    return { success: false, reason: 'daily_limit_reached' };
  }
  
  // Adjust session limit based on daily remaining
  const sessionLimit = Math.min(
    options.limit || CONFIG.maxLikesPerSession,
    remainingLikes
  );
  
  logger.info(`Adjusted session limit: ${sessionLimit} likes`);
  stats.startSession();
  
  // Launch browser
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);
  
  // Set a realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  let likeCount = 0;
  let skippedCount = 0;
  let scrollCount = 0;
  const likedTweets = [];
  
  try {
    // Check login
    const isLoggedIn = await checkLogin(page, logger);
    
    if (!isLoggedIn) {
      await browser.close();
      await promptLogin(logger);
      return await autoLike(searchQuery, options); // Retry
    }
    
    logger.success('Logged in to X/Twitter');
    
    // Navigate to search or timeline
    let targetUrl;
    if (searchQuery) {
      const encodedQuery = encodeURIComponent(searchQuery);
      targetUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`;
      logger.info(`Searching for: "${searchQuery}"`);
    } else {
      targetUrl = 'https://x.com/home';
      logger.info('Using home timeline');
    }
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(CONFIG.pageLoadDelay);
    
    logger.info('Page loaded, starting to scan tweets...\n');
    
    const processedIds = new Set();
    
    // Main loop
    while (scrollCount < CONFIG.maxScrolls && likeCount < sessionLimit) {
      // Get all visible tweets
      const tweets = await page.evaluate(() => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        const results = [];
        
        articles.forEach((article, index) => {
          // Get tweet ID
          const statusLink = article.querySelector('a[href*="/status/"]');
          const href = statusLink?.getAttribute('href') || '';
          const idMatch = href.match(/\/status\/(\d+)/);
          const tweetId = idMatch ? idMatch[1] : `temp-${index}-${Date.now()}`;
          
          // Get tweet text
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const text = textEl?.textContent || '';
          
          // Get author
          const userLink = article.querySelector('a[href^="/"][role="link"]');
          const authorHref = userLink?.getAttribute('href') || '';
          const author = authorHref.replace('/', '').split('/')[0] || 'unknown';
          
          // Check states
          const isLiked = !!article.querySelector('[data-testid="unlike"]');
          const hasLikeBtn = !!article.querySelector('[data-testid="like"]');
          
          // Check if reply
          const isReply = article.innerText?.includes('Replying to @') || false;
          
          // Check if retweet
          const socialContext = article.querySelector('[data-testid="socialContext"]');
          const isRetweet = socialContext?.textContent?.includes('reposted') || 
                           socialContext?.textContent?.includes('Retweeted') || false;
          
          // Check if ad
          const isAd = !!article.querySelector('[data-testid="placementTracking"]') ||
                       article.innerText?.includes('Promoted') || false;
          
          results.push({
            tweetId,
            text: text.substring(0, 100),
            author,
            isLiked,
            hasLikeBtn,
            isReply,
            isRetweet,
            isAd
          });
        });
        
        return results;
      });
      
      // Process each tweet
      for (const tweet of tweets) {
        if (likeCount >= sessionLimit) break;
        if (processedIds.has(tweet.tweetId)) continue;
        
        processedIds.add(tweet.tweetId);
        
        // Skip conditions
        if (tweet.isLiked || !tweet.hasLikeBtn) continue;
        if (CONFIG.skipReplies && tweet.isReply) {
          skippedCount++;
          continue;
        }
        if (CONFIG.skipRetweets && tweet.isRetweet) {
          skippedCount++;
          continue;
        }
        if (CONFIG.skipAds && tweet.isAd) {
          skippedCount++;
          continue;
        }
        
        // Like this tweet!
        const liked = await page.evaluate((tweetId) => {
          const articles = document.querySelectorAll('article[data-testid="tweet"]');
          for (const article of articles) {
            const link = article.querySelector('a[href*="/status/"]');
            const href = link?.getAttribute('href') || '';
            if (href.includes(tweetId)) {
              const likeBtn = article.querySelector('[data-testid="like"]');
              if (likeBtn) {
                // Scroll into view
                article.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
              }
            }
          }
          return false;
        }, tweet.tweetId);
        
        if (liked) {
          await sleep(500); // Wait for scroll
          
          // Click the like button
          const success = await page.evaluate((tweetId) => {
            const articles = document.querySelectorAll('article[data-testid="tweet"]');
            for (const article of articles) {
              const link = article.querySelector('a[href*="/status/"]');
              const href = link?.getAttribute('href') || '';
              if (href.includes(tweetId)) {
                const likeBtn = article.querySelector('[data-testid="like"]');
                if (likeBtn) {
                  likeBtn.click();
                  return true;
                }
              }
            }
            return false;
          }, tweet.tweetId);
          
          if (success) {
            likeCount++;
            stats.addLike();
            
            const preview = tweet.text.substring(0, 40);
            logger.action(`[${likeCount}/${sessionLimit}] @${tweet.author}: "${preview}..."`);
            
            likedTweets.push({
              tweetId: tweet.tweetId,
              author: tweet.author,
              text: tweet.text,
              timestamp: getTimestamp()
            });
            
            // Random delay
            const delay = randomDelay(CONFIG.minDelay, CONFIG.maxDelay);
            logger.info(`   Waiting ${(delay/1000).toFixed(1)}s...`);
            await sleep(delay);
            
            // Periodic break
            if (likeCount > 0 && likeCount % CONFIG.pauseEvery === 0) {
              logger.warning(`Taking a ${CONFIG.pauseDuration/1000}s safety break...`);
              await sleep(CONFIG.pauseDuration);
              logger.info('Resuming...\n');
            }
          }
        }
      }
      
      // Scroll for more tweets
      await page.evaluate(() => {
        window.scrollBy({ top: 800, behavior: 'smooth' });
      });
      scrollCount++;
      
      // Progress update
      if (scrollCount % 5 === 0) {
        logger.info(`Progress: ${likeCount} liked, ${skippedCount} skipped, ${scrollCount} scrolls`);
      }
      
      await sleep(CONFIG.scrollDelay);
    }
    
    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('✅ SESSION COMPLETE');
    console.log('='.repeat(60));
    logger.success(`Tweets liked: ${likeCount}`);
    logger.info(`Tweets skipped: ${skippedCount}`);
    logger.info(`Total scrolls: ${scrollCount}`);
    logger.info(`Today's total likes: ${stats.getTodayLikes()}/${CONFIG.maxLikesPerDay}`);
    logger.info(`Remaining today: ${stats.getRemainingLikes()}`);
    console.log('='.repeat(60));
    
    // Save session log
    const sessionLog = {
      sessionId,
      query: searchQuery || 'timeline',
      startTime: new Date(parseInt(sessionId, 36)).toISOString(),
      endTime: getTimestamp(),
      likesCount: likeCount,
      skippedCount,
      tweets: likedTweets
    };
    
    const logPath = path.join(CONFIG.logDir, `session-${sessionId}.json`);
    fs.writeFileSync(logPath, JSON.stringify(sessionLog, null, 2));
    logger.info(`Session log saved: ${logPath}`);
    
    console.log('\n💡 Wait at least 1-2 hours before running again!\n');
    
    return {
      success: true,
      liked: likeCount,
      skipped: skippedCount,
      tweets: likedTweets
    };
    
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
    
  } finally {
    await browser.close();
  }
}

// ==========================================
// CLI INTERFACE
// ==========================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
❤️  XActions Auto-Liker
======================

Usage:
  node auto-liker.js <keyword>           Search and like tweets about keyword
  node auto-liker.js --timeline          Like from your home timeline
  node auto-liker.js <keyword> --limit N Like max N tweets (default: ${CONFIG.maxLikesPerSession})

Options:
  --timeline    Use home timeline instead of search
  --limit N     Maximum tweets to like (default: ${CONFIG.maxLikesPerSession})
  --help, -h    Show this help message

Examples:
  node auto-liker.js "web3"
  node auto-liker.js "AI" --limit 15
  node auto-liker.js --timeline --limit 20

⚠️  Safety Notes:
  • Daily limit: ${CONFIG.maxLikesPerDay} likes per day
  • Delays: ${CONFIG.minDelay/1000}s - ${CONFIG.maxDelay/1000}s between actions
  • Takes ${CONFIG.pauseDuration/1000}s break every ${CONFIG.pauseEvery} likes
    `);
    return;
  }
  
  // Parse arguments
  const useTimeline = args.includes('--timeline');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : CONFIG.maxLikesPerSession;
  
  // Get search query (first non-flag argument)
  const searchQuery = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-') && isNaN(arg));
  
  if (!useTimeline && !searchQuery) {
    console.log('❌ Please provide a search keyword or use --timeline');
    console.log('   Example: node auto-liker.js "web3"');
    console.log('   Run with --help for more options');
    return;
  }
  
  // Run the auto-liker
  await autoLike(useTimeline ? null : searchQuery, { limit });
}

main().catch(console.error);
```

### Running the Script

```bash
# First run (will prompt for login)
node auto-liker.js "javascript"

# Like tweets about AI (max 15)
node auto-liker.js "AI" --limit 15

# Like from your timeline
node auto-liker.js --timeline --limit 20

# Show help
node auto-liker.js --help
```

**Output example:**
```
============================================================
❤️  XACTIONS AUTO-LIKER
============================================================
[2026-01-01T14:30:00.000Z] [INFO] Session ID: abc123
[2026-01-01T14:30:00.001Z] [INFO] Search query: javascript
[2026-01-01T14:30:00.002Z] [INFO] Max likes this session: 30
[2026-01-01T14:30:00.003Z] [INFO] Today's likes so far: 15/100
[2026-01-01T14:30:00.004Z] [INFO] Adjusted session limit: 30 likes
[2026-01-01T14:30:02.000Z] [SUCCESS] ✅ Logged in to X/Twitter
[2026-01-01T14:30:03.000Z] [INFO] Searching for: "javascript"
[2026-01-01T14:30:08.000Z] [INFO] Page loaded, starting to scan tweets...

[2026-01-01T14:30:10.000Z] [ACTION] ❤️  [1/30] @devguy: "Just released my new JS library..."
[2026-01-01T14:30:10.001Z] [INFO]    Waiting 5.2s...
[2026-01-01T14:30:16.000Z] [ACTION] ❤️  [2/30] @coder123: "The new JavaScript features in..."
[2026-01-01T14:30:16.001Z] [INFO]    Waiting 7.8s...
...
[2026-01-01T14:32:00.000Z] [WARNING] ⚠️  Taking a 20s safety break...
[2026-01-01T14:32:20.000Z] [INFO] Resuming...
...

============================================================
✅ SESSION COMPLETE
============================================================
[2026-01-01T14:45:00.000Z] [SUCCESS] ✅ Tweets liked: 30
[2026-01-01T14:45:00.001Z] [INFO] Tweets skipped: 22
[2026-01-01T14:45:00.002Z] [INFO] Total scrolls: 15
[2026-01-01T14:45:00.003Z] [INFO] Today's total likes: 45/100
[2026-01-01T14:45:00.004Z] [INFO] Remaining today: 55
============================================================
[2026-01-01T14:45:00.005Z] [INFO] Session log saved: ./logs/session-abc123.json

💡 Wait at least 1-2 hours before running again!
```

---

## 🛡️ Safety & Rate Limits

### ⚠️ X (Twitter) Rate Limits

X doesn't publish exact limits for likes, but based on community experience:

| Action | Soft Limit | Hard Limit | Recommended |
|--------|------------|------------|-------------|
| Likes per hour | ~50 | ~100 | **20-30** |
| Likes per day | ~500 | ~1000 | **50-100** |
| Likes per 15 min | ~25 | ~50 | **10-15** |

### 🚫 Ban Prevention Tips

1. **Start slow**: Begin with 10-20 likes per session for the first week
2. **Use random delays**: Always vary timing between 3-10 seconds
3. **Take breaks**: Pause every 8-10 likes for 15-30 seconds
4. **Limit daily usage**: Stay under 100 likes per day
5. **Mix it up**: Alternate between manual and automated activity
6. **Avoid patterns**: Don't run at the exact same time every day
7. **Watch for warnings**: If you get a "slow down" message, stop immediately

### 📊 Recommended Daily Limits

| Account Age | Max Likes/Day | Max Sessions | Wait Between |
|-------------|---------------|--------------|--------------|
| < 1 month | 30 | 1-2 | 4+ hours |
| 1-6 months | 50 | 2-3 | 2+ hours |
| 6+ months | 100 | 3-4 | 1+ hours |
| Verified | 150 | 4-5 | 1+ hours |

### 🔴 Signs of Trouble

Stop immediately if you see:
- "You've reached the limit" message
- Temporary restriction notice
- CAPTCHAs appearing frequently
- Likes not registering
- Account locked warning

---

## 🌐 Website Alternative

### Use XActions.app

Don't want to run scripts? Use our web dashboard instead!

**[👉 xactions.app](https://xactions.app)**

**Features:**
- ✅ No coding required
- ✅ Visual configuration
- ✅ Built-in safety limits
- ✅ Real-time progress tracking
- ✅ Automatic rate limit protection
- ✅ Session history and analytics
- ✅ Multi-account support (Pro)

**How it works:**
1. Sign in with your X account at [xactions.app](https://xactions.app)
2. Navigate to **Automation** → **Auto-Liker**
3. Configure your keywords and limits
4. Click "Start" and watch the magic happen!

The web version includes additional safety features and is easier to use for non-technical users.

---

## 📚 Related Examples

- [🔍 Detect Unfollowers](detect-unfollowers.md) - Track who unfollowed you
- [🚫 Unfollow Non-Followers](unfollow-non-followers.md) - Clean up your following list
- [🐦 Tweet Scraping](tweet-scraping.md) - Extract tweets and data
- [👥 Followers Scraping](followers-scraping.md) - Get follower lists

---

## 📄 License

MIT License - Use at your own risk. The author is not responsible for any account restrictions resulting from the use of these scripts.

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))

**Last Updated:** January 2026
