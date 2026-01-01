# 💬 Auto-Commenter

Automatically post comments/replies on tweets matching your criteria on X (Twitter).

---

## 📋 What It Does

This feature helps you engage with content automatically by posting relevant comments on tweets. It's ideal for:

1. **Monitoring accounts** - Watch specific users and reply to their new posts instantly
2. **Keyword targeting** - Comment on tweets containing specific keywords or hashtags
3. **Smart replies** - Use a pool of template comments for natural variation
4. **Rate limiting** - Uses random delays to mimic human behavior
5. **Duplicate prevention** - Tracks previously commented tweets to avoid spamming

**Use cases:**
- Engage with thought leaders in your niche as soon as they post
- Build relationships by being first to comment
- Promote your presence on trending topics
- Support accounts you follow with timely engagement
- Run engagement campaigns with varied responses

---

## ⚠️ CRITICAL WARNINGS

> **🚨 HIGH RISK AUTOMATION!** Auto-commenting is MORE DANGEROUS than auto-liking. Spammy, repetitive, or low-quality comments will get your account restricted or PERMANENTLY SUSPENDED very quickly.

### 🔴 WHAT NOT TO DO

- ❌ **DON'T** post identical comments repeatedly
- ❌ **DON'T** comment more than 10-20 times per day
- ❌ **DON'T** use generic/spammy comments like "Great post!" everywhere
- ❌ **DON'T** comment on accounts that don't know you
- ❌ **DON'T** run this 24/7 or on multiple accounts
- ❌ **DON'T** comment too fast (under 30 seconds between comments)
- ❌ **DON'T** use this for promotional/advertising content

### ✅ WHAT TO DO

- ✅ **DO** use varied, contextual comment templates
- ✅ **DO** keep delays between 30-60+ seconds minimum
- ✅ **DO** limit to 5-10 comments per session
- ✅ **DO** only comment on relevant content you'd genuinely engage with
- ✅ **DO** mix automated and manual commenting
- ✅ **DO** monitor for warning signs and stop immediately if flagged
- ✅ **DO** have genuine, value-adding comments

### ⚡ Account Risk Levels

| Behavior | Risk Level | Likely Outcome |
|----------|------------|----------------|
| 5-10 varied comments/day | 🟢 Low | Generally safe |
| 10-20 comments/day | 🟡 Medium | Monitor closely |
| 20-50 comments/day | 🔴 High | Likely restriction |
| 50+ comments/day | ⛔ Extreme | Almost certain ban |
| Identical comments | ⛔ Extreme | Immediate flag |
| Fast commenting (<30s) | ⛔ Extreme | Immediate flag |

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Quickly commenting on visible tweets from a user's profile or search results

**Steps:**
1. Go to a user's profile (`x.com/username`) or search results
2. Open browser console (F12 → Console tab)
3. Paste the script below and press Enter

```javascript
// ============================================
// XActions - Auto-Commenter (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/username or x.com/search
// Open console (F12), paste this
// ============================================

(async () => {
  // ==========================================
  // CONFIGURATION - Customize these settings!
  // ==========================================
  const CONFIG = {
    // Comment templates - MAKE THESE VARIED AND GENUINE!
    // The script will randomly pick from these
    COMMENTS: [
      '🔥 Great insight!',
      'This is so true 👏',
      'Interesting perspective, thanks for sharing!',
      'Love this take 💯',
      'Really good point here',
      'This resonates with me',
      'Solid thread, appreciate you sharing this',
      'Facts! This needed to be said',
      'Exactly what I was thinking',
      'Quality content as always 🙌',
    ],
    
    // Targeting
    KEYWORDS: [],                       // Only comment if tweet contains these (empty = all tweets)
    SKIP_REPLIES: true,                 // Skip tweets that are replies
    SKIP_RETWEETS: true,                // Skip retweets
    
    // Limits (KEEP THESE VERY LOW!)
    MAX_COMMENTS: 5,                    // Maximum comments per session (KEEP LOW!)
    MAX_SCROLLS: 10,                    // Maximum times to scroll down
    
    // Delays (in milliseconds) - KEEP THESE HIGH!
    MIN_DELAY: 30000,                   // Minimum delay between comments (30 seconds)
    MAX_DELAY: 60000,                   // Maximum delay between comments (60 seconds)
    SCROLL_DELAY: 3000,                 // Delay after scrolling
    TYPE_DELAY: 100,                    // Delay between keystrokes (ms)
    
    // Safety
    PAUSE_EVERY: 3,                     // Pause every N comments
    PAUSE_DURATION: 45000,              // Pause duration (45 seconds)
  };

  // ==========================================
  // SCRIPT - Don't modify below this line
  // ==========================================
  
  console.log('💬 XActions - Auto-Commenter');
  console.log('='.repeat(50));
  console.log('⚙️  Settings:');
  console.log(`   • Comment templates: ${CONFIG.COMMENTS.length} variations`);
  console.log(`   • Keywords: ${CONFIG.KEYWORDS.length ? CONFIG.KEYWORDS.join(', ') : 'ALL TWEETS'}`);
  console.log(`   • Max comments: ${CONFIG.MAX_COMMENTS}`);
  console.log(`   • Delay: ${CONFIG.MIN_DELAY/1000}s - ${CONFIG.MAX_DELAY/1000}s`);
  console.log(`   • Skip replies: ${CONFIG.SKIP_REPLIES ? 'Yes' : 'No'}`);
  console.log(`   • Skip retweets: ${CONFIG.SKIP_RETWEETS ? 'Yes' : 'No'}`);
  console.log('');
  console.log('⚠️  WARNING: Use responsibly! Spammy comments = account ban!');
  console.log('⚠️  Press Ctrl+C in console to stop at any time');
  console.log('='.repeat(50));
  console.log('');

  // Helpers
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const getRandomComment = () => CONFIG.COMMENTS[Math.floor(Math.random() * CONFIG.COMMENTS.length)];
  
  // State
  let commentCount = 0;
  let scrollCount = 0;
  let skippedCount = 0;
  const commentedTweetIds = new Set();
  const processedTweets = new Set();

  // Load previously commented tweets from localStorage
  const storageKey = 'xactions_commented_tweets';
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      JSON.parse(saved).forEach(id => commentedTweetIds.add(id));
      console.log(`📋 Loaded ${commentedTweetIds.size} previously commented tweets`);
    }
  } catch (e) {}

  // Save commented tweets to localStorage
  const saveCommentedTweets = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...commentedTweetIds]));
    } catch (e) {}
  };

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
    return null;
  };

  // Check if tweet is a reply
  const isReply = (article) => {
    return article.innerText?.includes('Replying to @') || false;
  };

  // Check if tweet is a retweet
  const isRetweet = (article) => {
    const socialContext = article.querySelector('[data-testid="socialContext"]');
    return socialContext?.textContent?.includes('reposted') || 
           socialContext?.textContent?.includes('Retweeted') || false;
  };

  // Simulate typing for more human-like behavior
  const simulateTyping = async (element, text) => {
    element.focus();
    await sleep(200);
    
    for (const char of text) {
      document.execCommand('insertText', false, char);
      await sleep(CONFIG.TYPE_DELAY + Math.random() * 50);
    }
  };

  // Post a comment on a tweet
  const postComment = async (article, tweetId) => {
    try {
      // Find and click the reply button
      const replyBtn = article.querySelector('[data-testid="reply"]');
      if (!replyBtn) {
        console.log('   ⚠️  Reply button not found, skipping...');
        return false;
      }

      // Scroll tweet into view
      article.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(800);

      // Click reply button
      replyBtn.click();
      await sleep(1500);

      // Wait for reply modal/input to appear
      let replyInput = null;
      for (let i = 0; i < 10; i++) {
        replyInput = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (replyInput) break;
        await sleep(300);
      }

      if (!replyInput) {
        console.log('   ⚠️  Reply input not found, closing modal...');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return false;
      }

      // Get a random comment
      const comment = getRandomComment();
      
      // Type the comment with realistic delays
      await simulateTyping(replyInput, comment);
      await sleep(800);

      // Find and click the Post/Reply button
      let postBtn = null;
      for (let i = 0; i < 10; i++) {
        postBtn = document.querySelector('[data-testid="tweetButton"]');
        if (postBtn && !postBtn.disabled) break;
        await sleep(300);
      }

      if (!postBtn || postBtn.disabled) {
        console.log('   ⚠️  Post button not available, closing modal...');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return false;
      }

      // Click post button
      postBtn.click();
      await sleep(2000);

      // Close any remaining modal
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // Mark as commented
      commentedTweetIds.add(tweetId);
      saveCommentedTweets();
      commentCount++;

      return { success: true, comment };

    } catch (error) {
      console.log(`   ❌ Error posting comment: ${error.message}`);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }
  };

  // Process all visible tweets
  const processVisibleTweets = async () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    
    for (const article of articles) {
      // Check if we've hit our limit
      if (commentCount >= CONFIG.MAX_COMMENTS) {
        console.log('');
        console.log('🎯 Reached maximum comments limit!');
        return false;
      }

      const tweetId = getTweetId(article);
      if (!tweetId || processedTweets.has(tweetId)) continue;
      processedTweets.add(tweetId);

      // Skip if already commented
      if (commentedTweetIds.has(tweetId)) {
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

      // Check keyword match
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const tweetText = textEl?.textContent || '';
      
      if (!matchesKeywords(tweetText)) {
        skippedCount++;
        continue;
      }

      // Get tweet preview for logging
      const preview = tweetText.substring(0, 40) || '[No text]';
      console.log(`🎯 Found tweet: "${preview}..."`);

      // Post comment on this tweet
      const result = await postComment(article, tweetId);
      
      if (result && result.success) {
        console.log(`💬 [${commentCount}/${CONFIG.MAX_COMMENTS}] Commented: "${result.comment}"`);
        
        // Random delay between comments
        const delay = randomDelay(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY);
        console.log(`   ⏳ Waiting ${(delay/1000).toFixed(0)}s before next comment...`);
        await sleep(delay);

        // Periodic pause for safety
        if (commentCount > 0 && commentCount % CONFIG.PAUSE_EVERY === 0) {
          console.log('');
          console.log(`☕ Taking a ${CONFIG.PAUSE_DURATION/1000}s safety break...`);
          await sleep(CONFIG.PAUSE_DURATION);
          console.log('🔄 Resuming...');
          console.log('');
        }
      } else {
        skippedCount++;
      }
    }

    return true;
  };

  // Main loop
  console.log('🔍 Scanning for tweets to comment on...');
  console.log('');

  while (scrollCount < CONFIG.MAX_SCROLLS && commentCount < CONFIG.MAX_COMMENTS) {
    const shouldContinue = await processVisibleTweets();
    if (!shouldContinue) break;

    // Scroll down to load more tweets
    window.scrollBy({ top: 600, behavior: 'smooth' });
    scrollCount++;
    
    // Progress update every 3 scrolls
    if (scrollCount % 3 === 0) {
      console.log(`📊 Progress: ${commentCount} commented, ${skippedCount} skipped, ${scrollCount} scrolls`);
    }

    await sleep(CONFIG.SCROLL_DELAY);
  }

  // Final summary
  console.log('');
  console.log('='.repeat(50));
  console.log('✅ AUTO-COMMENTER COMPLETE');
  console.log('='.repeat(50));
  console.log(`💬 Comments posted: ${commentCount}`);
  console.log(`⏭️  Tweets skipped: ${skippedCount}`);
  console.log(`📜 Total scrolls: ${scrollCount}`);
  console.log(`🕐 Session ended: ${new Date().toLocaleTimeString()}`);
  console.log(`📋 Total commented tweets tracked: ${commentedTweetIds.size}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Wait at least 2-4 hours before running again!');
  console.log('⚠️  Mix with manual activity to appear more natural.');
  console.log('='.repeat(50));

  // Return results
  return {
    commented: commentCount,
    skipped: skippedCount,
    scrolls: scrollCount,
    commentedIds: Array.from(commentedTweetIds)
  };
})();
```

**What happens:**
1. Script scans visible tweets on the page
2. Filters based on your settings (keywords, replies, retweets)
3. Opens the reply modal for matching tweets
4. Types a random comment from your template list
5. Posts the reply with human-like typing delays
6. Saves commented tweet IDs to avoid repeat commenting
7. Waits 30-60 seconds between comments for safety
8. Stops when reaching your limit

**Output example:**
```
💬 XActions - Auto-Commenter
==================================================
⚙️  Settings:
   • Comment templates: 10 variations
   • Keywords: ALL TWEETS
   • Max comments: 5
   • Delay: 30s - 60s
   • Skip replies: Yes
   • Skip retweets: Yes

⚠️  WARNING: Use responsibly! Spammy comments = account ban!
⚠️  Press Ctrl+C in console to stop at any time
==================================================

📋 Loaded 12 previously commented tweets
🔍 Scanning for tweets to comment on...

🎯 Found tweet: "Just launched my new project! Check it o..."
💬 [1/5] Commented: "🔥 Great insight!"
   ⏳ Waiting 42s before next comment...
🎯 Found tweet: "Thread on why web3 is changing everythi..."
💬 [2/5] Commented: "Solid thread, appreciate you sharing this"
   ⏳ Waiting 38s before next comment...
🎯 Found tweet: "Hot take: AI will replace most develope..."
💬 [3/5] Commented: "Interesting perspective, thanks for sharing!"
   ⏳ Waiting 55s before next comment...

☕ Taking a 45s safety break...
🔄 Resuming...

...

==================================================
✅ AUTO-COMMENTER COMPLETE
==================================================
💬 Comments posted: 5
⏭️  Tweets skipped: 12
📜 Total scrolls: 6
🕐 Session ended: 3:15:42 PM
📋 Total commented tweets tracked: 17

⚠️  IMPORTANT: Wait at least 2-4 hours before running again!
⚠️  Mix with manual activity to appear more natural.
==================================================
```

---

## 🖥️ Example 2: Node.js with Puppeteer (Production)

**Best for:** Monitoring a specific user for new tweets and auto-replying

**Features:**
- Monitors a target user's profile for new tweets
- Posts smart replies from a customizable template list
- Comprehensive logging with timestamps
- Persistent tracking of commented tweets
- Human-like random delays
- Configurable safety limits
- Graceful error handling

### Setup

```bash
# Create project folder
mkdir auto-commenter && cd auto-commenter

# Initialize and install dependencies
npm init -y
npm install puppeteer

# Create the script
touch auto-commenter.js
```

### Main Script: `auto-commenter.js`

```javascript
// ============================================
// XActions - Auto-Commenter (Node.js + Puppeteer)
// Author: nich (@nichxbt)
//
// Monitors a user's profile and comments on new tweets
//
// Usage:
//   node auto-commenter.js elonmusk         # Monitor @elonmusk
//   node auto-commenter.js naval --limit 3  # Comment on max 3 tweets
//   node auto-commenter.js vitalik --keywords "ethereum,eth"
//
// ⚠️  USE RESPONSIBLY! Spammy comments = account ban!
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
  // Comment templates - CUSTOMIZE THESE!
  // Make them varied and genuine to avoid looking like a bot
  comments: [
    '🔥 Great point!',
    'This is insightful, thanks for sharing!',
    'Really interesting perspective 👏',
    'Love this take 💯',
    'Solid thread, appreciate you posting this',
    'Facts! This needed to be said',
    'This resonates with me',
    'Quality content as always 🙌',
    'Exactly what I was thinking',
    'Great insight here!',
  ],
  
  // Browser settings
  headless: true,                       // Set to false to watch the browser
  userDataDir: './browser-data',        // Persistent login session
  viewport: { width: 1280, height: 900 },
  
  // Limits (KEEP THESE VERY CONSERVATIVE!)
  maxCommentsPerSession: 5,             // Max comments per script run
  maxCommentsPerDay: 15,                // Max comments per 24 hours
  checkIntervalSeconds: 120,            // How often to check for new tweets (2 min)
  maxRunTimeMinutes: 60,                // Max time to run before stopping
  
  // Delays (milliseconds) - KEEP THESE HIGH!
  minCommentDelay: 30000,               // Min delay between comments (30 sec)
  maxCommentDelay: 90000,               // Max delay between comments (90 sec)
  pageLoadDelay: 5000,                  // Wait for page to load
  typeDelay: 80,                        // Delay between keystrokes (ms)
  
  // Filters
  skipReplies: true,                    // Skip tweets that are replies
  skipRetweets: true,                   // Skip retweets
  minTweetAgeSeconds: 30,               // Don't comment on tweets younger than this
  maxTweetAgeMinutes: 60,               // Don't comment on tweets older than this
  
  // Logging & Storage
  logDir: './logs',
  dataDir: './data',
  statsFile: './data/comment-stats.json',
  commentedFile: './data/commented-tweets.json',
};

// ==========================================
// PARSE COMMAND LINE ARGUMENTS
// ==========================================
const args = process.argv.slice(2);
const targetUsername = args[0]?.replace('@', '');

if (!targetUsername || targetUsername.startsWith('--')) {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  💬 XActions Auto-Commenter                               ║
╠═══════════════════════════════════════════════════════════╣
║  Usage:                                                   ║
║    node auto-commenter.js <username> [options]            ║
║                                                           ║
║  Examples:                                                ║
║    node auto-commenter.js elonmusk                        ║
║    node auto-commenter.js naval --limit 3                 ║
║    node auto-commenter.js vitalik --keywords "eth,defi"   ║
║                                                           ║
║  Options:                                                 ║
║    --limit <n>      Max comments per session              ║
║    --keywords <k>   Only comment if tweet contains these  ║
║    --headless       Run in headless mode (default: true)  ║
║    --watch          Run with visible browser              ║
║                                                           ║
║  ⚠️  USE RESPONSIBLY - Spam = Ban!                        ║
╚═══════════════════════════════════════════════════════════╝
  `);
  process.exit(0);
}

// Parse options
const options = {
  limit: CONFIG.maxCommentsPerSession,
  keywords: [],
  headless: CONFIG.headless,
};

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--keywords' && args[i + 1]) {
    options.keywords = args[i + 1].split(',').map(k => k.trim().toLowerCase());
    i++;
  } else if (args[i] === '--watch') {
    options.headless = false;
  } else if (args[i] === '--headless') {
    options.headless = true;
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay + Math.floor(Math.random() * 2000); // Add jitter
};

const getTimestamp = () => new Date().toISOString();
const getDateKey = () => new Date().toISOString().split('T')[0];

const getRandomComment = () => {
  return CONFIG.comments[Math.floor(Math.random() * CONFIG.comments.length)];
};

// Ensure directories exist
const ensureDirectories = () => {
  [CONFIG.userDataDir, CONFIG.logDir, CONFIG.dataDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// ==========================================
// LOGGER CLASS
// ==========================================
class Logger {
  constructor(username) {
    this.username = username;
    this.logFile = path.join(CONFIG.logDir, `auto-commenter-${getDateKey()}.log`);
    this.sessionLogs = [];
  }

  log(level, message) {
    const timestamp = getTimestamp();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(line);
    fs.appendFileSync(this.logFile, line + '\n');
    this.sessionLogs.push({ timestamp, level, message });
  }

  info(message) { this.log('info', message); }
  success(message) { this.log('success', `✅ ${message}`); }
  warning(message) { this.log('warning', `⚠️  ${message}`); }
  error(message) { this.log('error', `❌ ${message}`); }
  comment(message) { this.log('comment', `💬 ${message}`); }

  saveSessionLog(sessionId, stats) {
    const sessionFile = path.join(CONFIG.logDir, `session-${sessionId}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify({
      sessionId,
      username: this.username,
      stats,
      logs: this.sessionLogs
    }, null, 2));
    this.info(`Session log saved: ${sessionFile}`);
  }
}

// ==========================================
// STATS TRACKER CLASS
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

  getTodayComments() {
    const today = getDateKey();
    return this.stats[today]?.comments || 0;
  }

  addComment() {
    const today = getDateKey();
    if (!this.stats[today]) {
      this.stats[today] = { comments: 0, sessions: 0 };
    }
    this.stats[today].comments++;
    this.saveStats();
  }

  startSession() {
    const today = getDateKey();
    if (!this.stats[today]) {
      this.stats[today] = { comments: 0, sessions: 0 };
    }
    this.stats[today].sessions++;
    this.saveStats();
  }

  canCommentMore() {
    return this.getTodayComments() < CONFIG.maxCommentsPerDay;
  }

  getRemainingComments() {
    return Math.max(0, CONFIG.maxCommentsPerDay - this.getTodayComments());
  }
}

// ==========================================
// COMMENTED TWEETS TRACKER
// ==========================================
class CommentedTracker {
  constructor() {
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(CONFIG.commentedFile)) {
        this.commented = new Set(JSON.parse(fs.readFileSync(CONFIG.commentedFile, 'utf8')));
      } else {
        this.commented = new Set();
      }
    } catch (e) {
      this.commented = new Set();
    }
  }

  save() {
    fs.writeFileSync(CONFIG.commentedFile, JSON.stringify([...this.commented], null, 2));
  }

  has(tweetId) {
    return this.commented.has(tweetId);
  }

  add(tweetId) {
    this.commented.add(tweetId);
    this.save();
  }

  size() {
    return this.commented.size;
  }
}

// ==========================================
// BROWSER AUTOMATION
// ==========================================

async function launchBrowser(headless = true) {
  return await puppeteer.launch({
    headless: headless ? 'new' : false,
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
// POST COMMENT FUNCTION
// ==========================================

async function postComment(page, tweetId, logger) {
  try {
    // Find the tweet by ID
    const tweetSelector = `article[data-testid="tweet"] a[href*="/status/${tweetId}"]`;
    const tweetLink = await page.$(tweetSelector);
    
    if (!tweetLink) {
      logger.warning(`Tweet ${tweetId} not found on page`);
      return false;
    }

    // Get the parent article
    const article = await page.evaluateHandle(el => el.closest('article'), tweetLink);
    
    if (!article) {
      logger.warning(`Could not find article for tweet ${tweetId}`);
      return false;
    }

    // Find reply button within the article
    const replyBtn = await article.$('[data-testid="reply"]');
    
    if (!replyBtn) {
      logger.warning('Reply button not found');
      return false;
    }

    // Scroll into view and click
    await article.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await sleep(800);
    await replyBtn.click();
    await sleep(1500);

    // Wait for reply modal
    const replyInput = await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 5000 });
    
    if (!replyInput) {
      logger.warning('Reply input not found');
      await page.keyboard.press('Escape');
      return false;
    }

    // Get random comment and type it
    const comment = getRandomComment();
    logger.info(`Typing comment: "${comment}"`);
    
    await replyInput.click();
    await sleep(300);
    
    // Type with human-like delays
    for (const char of comment) {
      await page.keyboard.type(char, { delay: CONFIG.typeDelay + Math.random() * 30 });
    }
    await sleep(800);

    // Find and click post button
    const postBtn = await page.waitForSelector('[data-testid="tweetButton"]:not([disabled])', { timeout: 3000 });
    
    if (!postBtn) {
      logger.warning('Post button not available');
      await page.keyboard.press('Escape');
      return false;
    }

    await postBtn.click();
    await sleep(2000);

    // Close any remaining modal
    await page.keyboard.press('Escape');
    await sleep(500);

    return { success: true, comment };

  } catch (error) {
    logger.error(`Error posting comment: ${error.message}`);
    try {
      await page.keyboard.press('Escape');
    } catch (e) {}
    return false;
  }
}

// ==========================================
// FIND NEW TWEETS FUNCTION
// ==========================================

async function findNewTweets(page, username, commentedTracker, logger) {
  const tweets = await page.evaluate((opts) => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const results = [];

    articles.forEach(article => {
      // Get tweet ID
      const statusLink = article.querySelector('a[href*="/status/"]');
      const href = statusLink?.getAttribute('href') || '';
      const idMatch = href.match(/\/status\/(\d+)/);
      const tweetId = idMatch ? idMatch[1] : null;
      
      if (!tweetId) return;

      // Get tweet text
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl?.textContent || '';

      // Get tweet time
      const timeEl = article.querySelector('time');
      const datetime = timeEl?.getAttribute('datetime') || null;

      // Check if reply
      const isReply = article.innerText?.includes('Replying to @') || false;

      // Check if retweet
      const socialContext = article.querySelector('[data-testid="socialContext"]');
      const isRetweet = socialContext?.textContent?.includes('reposted') || 
                        socialContext?.textContent?.includes('Retweeted') || false;

      // Check author (should match target username)
      const authorLink = article.querySelector('a[href^="/"][role="link"] span');
      const authorHref = article.querySelector('a[href*="/status/"]')?.getAttribute('href') || '';
      const authorMatch = authorHref.match(/^\/([^/]+)\//);
      const author = authorMatch ? authorMatch[1] : null;

      results.push({
        tweetId,
        text: text.substring(0, 150),
        datetime,
        isReply,
        isRetweet,
        author
      });
    });

    return results;
  }, { username });

  // Filter tweets
  const newTweets = [];
  const now = Date.now();

  for (const tweet of tweets) {
    // Skip if already commented
    if (commentedTracker.has(tweet.tweetId)) continue;

    // Skip if not from target user (compare lowercase)
    if (tweet.author?.toLowerCase() !== username.toLowerCase()) continue;

    // Skip replies if configured
    if (CONFIG.skipReplies && tweet.isReply) continue;

    // Skip retweets if configured
    if (CONFIG.skipRetweets && tweet.isRetweet) continue;

    // Check age
    if (tweet.datetime) {
      const tweetTime = new Date(tweet.datetime).getTime();
      const ageSeconds = (now - tweetTime) / 1000;
      const ageMinutes = ageSeconds / 60;

      if (ageSeconds < CONFIG.minTweetAgeSeconds) continue;
      if (ageMinutes > CONFIG.maxTweetAgeMinutes) continue;
    }

    // Check keywords if configured
    if (options.keywords.length > 0) {
      const lowerText = tweet.text.toLowerCase();
      const matches = options.keywords.some(kw => lowerText.includes(kw));
      if (!matches) continue;
    }

    newTweets.push(tweet);
  }

  return newTweets;
}

// ==========================================
// MAIN FUNCTION
// ==========================================

async function main() {
  const sessionId = Date.now().toString(36);
  const logger = new Logger(targetUsername);
  const stats = new StatsTracker();
  const commentedTracker = new CommentedTracker();

  ensureDirectories();

  // Session header
  console.log('\n' + '='.repeat(60));
  console.log('💬 XACTIONS AUTO-COMMENTER');
  console.log('='.repeat(60));
  
  logger.info(`Session ID: ${sessionId}`);
  logger.info(`Target user: @${targetUsername}`);
  logger.info(`Max comments this session: ${options.limit}`);
  if (options.keywords.length > 0) {
    logger.info(`Keywords filter: ${options.keywords.join(', ')}`);
  }

  // Check daily limit
  const todayComments = stats.getTodayComments();
  const remainingComments = stats.getRemainingComments();

  logger.info(`Today's comments so far: ${todayComments}/${CONFIG.maxCommentsPerDay}`);
  logger.info(`Previously commented tweets: ${commentedTracker.size()}`);

  if (!stats.canCommentMore()) {
    logger.warning(`Daily limit reached (${CONFIG.maxCommentsPerDay} comments)`);
    logger.info('Try again tomorrow to avoid account restrictions.');
    return { success: false, reason: 'daily_limit_reached' };
  }

  // Adjust session limit
  const sessionLimit = Math.min(options.limit, remainingComments);
  logger.info(`Adjusted session limit: ${sessionLimit} comments`);
  stats.startSession();

  // Launch browser
  const browser = await launchBrowser(options.headless);
  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);

  // Set realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  let commentCount = 0;
  let checkCount = 0;
  const startTime = Date.now();
  const maxRunTime = CONFIG.maxRunTimeMinutes * 60 * 1000;
  const commentsLog = [];

  try {
    // Check login
    const isLoggedIn = await checkLogin(page, logger);

    if (!isLoggedIn) {
      await browser.close();
      await promptLogin(logger);
      return await main(); // Retry
    }

    logger.success('Logged in to X/Twitter');

    // Navigate to target user's profile
    const profileUrl = `https://x.com/${targetUsername}`;
    logger.info(`Navigating to @${targetUsername}'s profile...`);
    
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(CONFIG.pageLoadDelay);

    // Verify profile loaded
    const profileExists = await page.evaluate(() => {
      return !document.body.innerText.includes('This account doesn't exist') &&
             !document.body.innerText.includes('Account suspended');
    });

    if (!profileExists) {
      logger.error(`Profile @${targetUsername} not found or suspended`);
      await browser.close();
      return { success: false, reason: 'profile_not_found' };
    }

    logger.success(`Profile @${targetUsername} loaded`);
    console.log('');

    // Main monitoring loop
    logger.info(`Starting to monitor @${targetUsername} for new tweets...`);
    logger.info(`Check interval: ${CONFIG.checkIntervalSeconds} seconds`);
    logger.info(`Max run time: ${CONFIG.maxRunTimeMinutes} minutes`);
    console.log('');

    while (commentCount < sessionLimit && (Date.now() - startTime) < maxRunTime) {
      checkCount++;
      const time = new Date().toLocaleTimeString();
      logger.info(`[${time}] Check #${checkCount}...`);

      // Refresh the page
      await page.reload({ waitUntil: 'networkidle2' });
      await sleep(CONFIG.pageLoadDelay);

      // Find new tweets
      const newTweets = await findNewTweets(page, targetUsername, commentedTracker, logger);

      if (newTweets.length > 0) {
        logger.success(`Found ${newTweets.length} new tweet(s) to comment on!`);

        for (const tweet of newTweets) {
          if (commentCount >= sessionLimit) break;

          logger.info(`Processing tweet: "${tweet.text.substring(0, 50)}..."`);

          const result = await postComment(page, tweet.tweetId, logger);

          if (result && result.success) {
            commentedTracker.add(tweet.tweetId);
            stats.addComment();
            commentCount++;

            commentsLog.push({
              timestamp: getTimestamp(),
              tweetId: tweet.tweetId,
              tweetPreview: tweet.text.substring(0, 100),
              comment: result.comment
            });

            logger.comment(`[${commentCount}/${sessionLimit}] Posted: "${result.comment}"`);

            // Delay before next comment
            if (commentCount < sessionLimit) {
              const delay = randomDelay(CONFIG.minCommentDelay, CONFIG.maxCommentDelay);
              logger.info(`Waiting ${(delay/1000).toFixed(0)}s before next action...`);
              await sleep(delay);
            }
          } else {
            logger.warning('Failed to post comment, skipping...');
          }
        }
      } else {
        logger.info('No new tweets found');
      }

      // Check if we should continue
      if (commentCount >= sessionLimit) {
        logger.info('Reached session comment limit');
        break;
      }

      // Wait for next check
      if ((Date.now() - startTime) < maxRunTime) {
        logger.info(`Next check in ${CONFIG.checkIntervalSeconds} seconds...`);
        await sleep(CONFIG.checkIntervalSeconds * 1000);
      }
    }

    // Reason for stopping
    if ((Date.now() - startTime) >= maxRunTime) {
      logger.warning(`Reached max run time (${CONFIG.maxRunTimeMinutes} minutes)`);
    }

  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    console.error(error);
  } finally {
    await browser.close();
  }

  // Final summary
  const finalStats = {
    sessionId,
    targetUser: targetUsername,
    commentsPosted: commentCount,
    checksPerformed: checkCount,
    todayTotal: stats.getTodayComments(),
    remainingToday: stats.getRemainingComments(),
    runTimeMinutes: ((Date.now() - startTime) / 60000).toFixed(1),
    comments: commentsLog
  };

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ SESSION COMPLETE');
  console.log('='.repeat(60));
  logger.success(`Comments posted: ${commentCount}`);
  logger.info(`Checks performed: ${checkCount}`);
  logger.info(`Run time: ${finalStats.runTimeMinutes} minutes`);
  logger.info(`Today's total comments: ${finalStats.todayTotal}/${CONFIG.maxCommentsPerDay}`);
  logger.info(`Remaining today: ${finalStats.remainingToday}`);
  console.log('='.repeat(60));
  
  // Save session log
  logger.saveSessionLog(sessionId, finalStats);

  console.log('');
  console.log('⚠️  IMPORTANT: Wait at least 2-4 hours before running again!');
  console.log('⚠️  Mix with manual activity to avoid detection.');
  console.log('');

  return finalStats;
}

// ==========================================
// RUN
// ==========================================
main().then(result => {
  if (!result.success) {
    process.exit(1);
  }
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### Running the Script

```bash
# Basic usage - monitor a user
node auto-commenter.js elonmusk

# Limit to 3 comments per session
node auto-commenter.js naval --limit 3

# Only comment on tweets containing specific keywords
node auto-commenter.js vitalik --keywords "ethereum,eth,crypto"

# Watch mode (visible browser)
node auto-commenter.js balajis --watch
```

**Output example:**
```
============================================================
💬 XACTIONS AUTO-COMMENTER
============================================================
[2026-01-01T14:30:00.000Z] [INFO] Session ID: abc123xyz
[2026-01-01T14:30:00.001Z] [INFO] Target user: @elonmusk
[2026-01-01T14:30:00.002Z] [INFO] Max comments this session: 5
[2026-01-01T14:30:00.003Z] [INFO] Today's comments so far: 3/15
[2026-01-01T14:30:00.004Z] [INFO] Previously commented tweets: 12
[2026-01-01T14:30:00.005Z] [INFO] Adjusted session limit: 5 comments
[2026-01-01T14:30:03.000Z] [SUCCESS] ✅ Logged in to X/Twitter
[2026-01-01T14:30:05.000Z] [INFO] Navigating to @elonmusk's profile...
[2026-01-01T14:30:10.000Z] [SUCCESS] ✅ Profile @elonmusk loaded

[2026-01-01T14:30:11.000Z] [INFO] Starting to monitor @elonmusk for new tweets...
[2026-01-01T14:30:11.001Z] [INFO] Check interval: 120 seconds
[2026-01-01T14:30:11.002Z] [INFO] Max run time: 60 minutes

[2026-01-01T14:30:15.000Z] [INFO] [2:30:15 PM] Check #1...
[2026-01-01T14:30:20.000Z] [SUCCESS] ✅ Found 1 new tweet(s) to comment on!
[2026-01-01T14:30:21.000Z] [INFO] Processing tweet: "Just had a great conversation about the futur..."
[2026-01-01T14:30:22.000Z] [INFO] Typing comment: "🔥 Great point!"
[2026-01-01T14:30:27.000Z] [COMMENT] 💬 [1/5] Posted: "🔥 Great point!"
[2026-01-01T14:30:27.001Z] [INFO] Waiting 45s before next action...

[2026-01-01T14:32:20.000Z] [INFO] [2:32:20 PM] Check #2...
[2026-01-01T14:32:25.000Z] [INFO] No new tweets found
[2026-01-01T14:32:25.001Z] [INFO] Next check in 120 seconds...
...

============================================================
✅ SESSION COMPLETE
============================================================
[2026-01-01T15:30:00.000Z] [SUCCESS] ✅ Comments posted: 3
[2026-01-01T15:30:00.001Z] [INFO] Checks performed: 28
[2026-01-01T15:30:00.002Z] [INFO] Run time: 60.0 minutes
[2026-01-01T15:30:00.003Z] [INFO] Today's total comments: 6/15
[2026-01-01T15:30:00.004Z] [INFO] Remaining today: 9
============================================================
[2026-01-01T15:30:00.005Z] [INFO] Session log saved: ./logs/session-abc123xyz.json

⚠️  IMPORTANT: Wait at least 2-4 hours before running again!
⚠️  Mix with manual activity to avoid detection.
```

---

## 🛡️ Safety & Rate Limits

### ⚠️ X (Twitter) Rate Limits for Comments/Replies

Commenting is treated MORE strictly than likes. These are conservative estimates:

| Action | Soft Limit | Hard Limit | Recommended |
|--------|------------|------------|-------------|
| Comments per hour | ~10-15 | ~25 | **3-5** |
| Comments per day | ~50 | ~100 | **10-15** |
| Comments per 15 min | ~5 | ~10 | **1-2** |

### 🚫 Spam Detection Triggers

X actively looks for these patterns:
- Identical or very similar comments
- Rapid-fire commenting (less than 30 seconds apart)
- Commenting on unrelated content
- One-word or emoji-only replies at scale
- Mass commenting on trending topics
- Automated promotional content

### 📊 Recommended Safe Limits

| Account Age | Max Comments/Day | Max Sessions | Min Wait Between |
|-------------|------------------|--------------|------------------|
| < 1 month | 5 | 1 | 4+ hours |
| 1-6 months | 10 | 1-2 | 3+ hours |
| 6+ months | 15 | 2 | 2+ hours |
| Verified | 20 | 2-3 | 2+ hours |

### ✅ Best Practices for Safe Auto-Commenting

1. **Vary your comments** - Use at least 10+ different templates
2. **Keep delays long** - Minimum 30 seconds, preferably 45-60+
3. **Add context** - Include keywords from the original tweet when possible
4. **Stay relevant** - Only comment on content in your niche
5. **Mix it up** - Combine auto-commenting with genuine manual engagement
6. **Monitor closely** - Watch for any warnings or restrictions
7. **Quality over quantity** - 5 good comments > 50 spam comments

### 🔴 Signs of Trouble

**Stop immediately if you see:**
- "You can't reply to this conversation" errors
- "Slow down" warnings
- Temporary restriction notices
- CAPTCHAs appearing frequently
- Comments not posting
- Account locked warning
- Shadow ban indicators (low engagement)

---

## 🌐 Website Alternative

### Use XActions.app

Don't want to run scripts? Use our web dashboard instead!

**[👉 xactions.app](https://xactions.app)**

**Features:**
- ✅ No coding required
- ✅ Visual configuration with template editor
- ✅ Built-in spam protection
- ✅ Smart comment rotation
- ✅ Real-time monitoring dashboard
- ✅ Automatic rate limit protection
- ✅ Comment history and analytics
- ✅ Multi-account support (Pro)
- ✅ Keyword-based targeting
- ✅ User watchlist monitoring

**How it works:**
1. Sign in with your X account at [xactions.app](https://xactions.app)
2. Navigate to **Automation** → **Auto-Commenter**
3. Add your comment templates (varied and genuine!)
4. Set up your target users or keywords
5. Configure safety limits
6. Click "Start" and monitor progress

The web version includes additional safety features and is recommended for users who want peace of mind.

---

## 📚 Related Examples

- [❤️ Auto-Liker](auto-liker.md) - Automatically like tweets
- [🔍 Detect Unfollowers](detect-unfollowers.md) - Track who unfollowed you
- [🚫 Unfollow Non-Followers](unfollow-non-followers.md) - Clean up your following list
- [👥 Followers Scraping](followers-scraping.md) - Get follower lists
- [🐦 Tweet Scraping](tweet-scraping.md) - Extract tweets and data

---

## 📄 License

MIT License - Use at your own risk. The author is not responsible for any account restrictions or suspensions resulting from the use of these scripts.

**Remember:** With great automation comes great responsibility. Don't be a spammer!

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))

**Last Updated:** January 2026
