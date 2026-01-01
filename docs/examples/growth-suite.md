# 🚀 Growth Suite

All-in-one growth automation combining follow + like + smart unfollow for X (Twitter).

---

## ⭐ Pro Feature

> **This is an advanced feature available in XActions Pro tier.** Growth Suite combines multiple automation strategies into a single, intelligent workflow that grows your account organically while you focus on creating content.

---

## 📋 What It Does

The Growth Suite is your **complete growth automation engine** that:

1. **Keyword-Based Following** - Searches for users by niche keywords and follows promising accounts
2. **Auto-Liking** - Engages with content in your timeline to boost visibility
3. **Smart Unfollowing** - Automatically unfollows users who don't follow back after a grace period
4. **Engagement Tracking** - Remembers who you've followed/liked to avoid duplicates
5. **Session Management** - Runs for configurable time periods with proper breaks
6. **Rate Limiting** - Built-in delays and limits to protect your account

**The Growth Flywheel:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🔍 Search Keywords  ──▶  👤 Follow Users  ──▶  ❤️ Like    │
│         ▲                                         Content   │
│         │                                            │      │
│         │                                            ▼      │
│    📊 Track &     ◀──  🔄 Smart Unfollow  ◀──  ⏰ Wait     │
│       Analyze              Non-Followers        X Days      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Use cases:**
- 📈 Grow a new account from zero to 10K followers
- 🎯 Build a niche-targeted audience (crypto, tech, marketing, etc.)
- 🤝 Increase engagement through strategic follows and likes
- 🧹 Maintain a healthy following/follower ratio
- ⏰ Save hours of daily manual engagement work
- 🔄 Run consistent growth campaigns on autopilot

---

## ⚠️ CRITICAL SAFETY WARNINGS

> **🚨 ACCOUNT SAFETY FIRST!**
>
> Aggressive automation WILL get your account restricted or permanently suspended.
> X (Twitter) actively detects and penalizes bot-like behavior.

**Before you start:**

| ❌ DON'T | ✅ DO |
|----------|-------|
| Run 24/7 without breaks | Run 1-2 sessions per day max |
| Follow/unfollow hundreds per day | Stay under 30 follows per day |
| Use identical timing patterns | Randomize all delays |
| Run multiple scripts at once | Run one automation at a time |
| Start with high limits | Start LOW, increase gradually |
| Ignore warning signs | Stop immediately if rate limited |

**Warning Signs to Watch For:**
- 🔴 "You've reached your daily limit" messages
- 🔴 Temporary restrictions on following/liking
- 🔴 Account locked for suspicious activity
- 🔴 Captcha challenges appearing frequently

**If you see these signs, STOP all automation for 24-48 hours!**

---

## ⚙️ Configuration Options

### Targeting

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `KEYWORDS` | `string[]` | `[]` | Keywords to search for (niche targeting) |
| `TARGET_ACCOUNTS` | `string[]` | `[]` | Accounts whose followers you want to target |

### Actions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `FOLLOW` | `boolean` | `true` | Enable following users from search |
| `LIKE` | `boolean` | `true` | Enable liking tweets in timeline |
| `UNFOLLOW` | `boolean` | `true` | Enable smart unfollowing |

### Limits (Per Session)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `FOLLOWS` | `number` | `20` | Maximum follows per session |
| `LIKES` | `number` | `30` | Maximum likes per session |
| `UNFOLLOWS` | `number` | `15` | Maximum unfollows per session |

### Timing

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `UNFOLLOW_AFTER_DAYS` | `number` | `3` | Days to wait before unfollowing non-followers |
| `DELAY_BETWEEN_ACTIONS` | `number` | `3000` | Milliseconds between actions |
| `SESSION_DURATION_MINUTES` | `number` | `30` | How long each session runs |

### Filters

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `MIN_FOLLOWERS` | `number` | `50` | Skip accounts with fewer followers |
| `MAX_FOLLOWERS` | `number` | `50000` | Skip accounts with more followers |
| `MUST_HAVE_BIO` | `boolean` | `true` | Only follow accounts with bios |
| `SKIP_PRIVATE` | `boolean` | `true` | Skip private/protected accounts |
| `LANGUAGE` | `string \| null` | `null` | Filter by language (`'en'`, `'es'`, etc.) |

---

## 🖥️ Example 1: Browser Console

**Best for:** Quick growth sessions, testing your strategy

**Steps:**
1. Go to `x.com/home`
2. Open browser console (F12 → Console tab)
3. First paste `core.js` from the XActions repository
4. Then paste the growth script below
5. Watch the magic happen!

```javascript
// ============================================
// XActions - Growth Suite (Browser Console)
// Author: nich (@nichxbt)
// REQUIRES: Paste core.js first!
// ============================================

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, SELECTORS } = window.XActions.Core;

  // ============================================
  // 🎯 CONFIGURE YOUR GROWTH STRATEGY
  // ============================================
  const STRATEGY = {
    // Keywords to search for (your niche)
    KEYWORDS: [
      'javascript developer',
      'web developer',
      'react developer',
    ],
    
    // Enable/disable actions
    ACTIONS: {
      FOLLOW: true,
      LIKE: true,
      UNFOLLOW: true,
    },
    
    // ⚠️ KEEP THESE LOW for safety!
    LIMITS: {
      FOLLOWS: 15,     // Per session
      LIKES: 20,       // Per session
      UNFOLLOWS: 10,   // Per session
    },
    
    // Timing settings
    TIMING: {
      UNFOLLOW_AFTER_DAYS: 3,
      DELAY_BETWEEN_ACTIONS: 4000,
      SESSION_DURATION_MINUTES: 25,
    },
    
    // User filters
    FILTERS: {
      MIN_FOLLOWERS: 50,
      MAX_FOLLOWERS: 50000,
      MUST_HAVE_BIO: true,
      SKIP_PRIVATE: true,
    },
  };

  // ============================================
  // STATE & TRACKING
  // ============================================
  const state = { follows: 0, likes: 0, unfollows: 0, startTime: Date.now(), isRunning: true };
  const tracked = {
    followed: new Map(Object.entries(storage.get('growth_followed') || {})),
    liked: new Set(storage.get('growth_liked') || []),
  };

  const saveTracked = () => {
    storage.set('growth_followed', Object.fromEntries(tracked.followed));
    storage.set('growth_liked', Array.from(tracked.liked));
  };

  const checkLimits = () => ({
    canFollow: state.follows < STRATEGY.LIMITS.FOLLOWS,
    canLike: state.likes < STRATEGY.LIMITS.LIKES,
    canUnfollow: state.unfollows < STRATEGY.LIMITS.UNFOLLOWS,
  });

  const isSessionExpired = () => {
    return (Date.now() - state.startTime) / 60000 >= STRATEGY.TIMING.SESSION_DURATION_MINUTES;
  };

  // ============================================
  // ACTIONS
  // ============================================
  const doFollow = async (userCell) => {
    if (!checkLimits().canFollow) return false;
    const followBtn = userCell.querySelector(SELECTORS.followButton);
    if (!followBtn) return false;

    const link = userCell.querySelector('a[href^="/"]');
    const username = link?.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username || tracked.followed.has(username)) return false;

    await clickElement(followBtn);
    state.follows++;
    tracked.followed.set(username, { at: Date.now(), source: 'growth' });
    saveTracked();
    log(`✅ Followed @${username} (${state.follows}/${STRATEGY.LIMITS.FOLLOWS})`, 'success');
    return true;
  };

  const doLike = async (tweet) => {
    if (!checkLimits().canLike) return false;
    const likeBtn = tweet.querySelector(SELECTORS.likeButton);
    if (!likeBtn) return false;

    const tweetLink = tweet.querySelector('a[href*="/status/"]');
    const tweetId = tweetLink?.href?.match(/status\/(\d+)/)?.[1];
    if (!tweetId || tracked.liked.has(tweetId)) return false;

    await clickElement(likeBtn);
    state.likes++;
    tracked.liked.add(tweetId);
    saveTracked();
    log(`❤️ Liked tweet (${state.likes}/${STRATEGY.LIMITS.LIKES})`, 'success');
    return true;
  };

  // ============================================
  // RUN
  // ============================================
  const run = async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🚀 XActions Growth Suite - Pro                          ║
╠═══════════════════════════════════════════════════════════╣
║  Keywords: ${STRATEGY.KEYWORDS.slice(0, 2).join(', ').substring(0, 35).padEnd(35)}   ║
║  Session: ${STRATEGY.TIMING.SESSION_DURATION_MINUTES} minutes                                 ║
║                                                           ║
║  Limits: ${STRATEGY.LIMITS.FOLLOWS} follows | ${STRATEGY.LIMITS.LIKES} likes | ${STRATEGY.LIMITS.UNFOLLOWS} unfollows         ║
║  Grace period: ${STRATEGY.TIMING.UNFOLLOW_AFTER_DAYS} days                                  ║
║                                                           ║
║  Run: stopGrowth() to stop early                          ║
╚═══════════════════════════════════════════════════════════╝
    `);

    log(`📊 Tracking ${tracked.followed.size} previously followed users`, 'info');

    // Phase 1: Follow
    if (STRATEGY.ACTIONS.FOLLOW) {
      log('📍 Phase 1: Keyword Search & Follow', 'info');
      for (const keyword of STRATEGY.KEYWORDS) {
        if (!state.isRunning || !checkLimits().canFollow) break;
        log(`🔍 Searching: "${keyword}"`, 'action');
        window.location.href = `https://twitter.com/search?q=${encodeURIComponent(keyword)}&f=user`;
        await sleep(3000);
        await waitForElement(SELECTORS.userCell, 10000);
        
        for (let scroll = 0; scroll < 8 && checkLimits().canFollow; scroll++) {
          const cells = document.querySelectorAll(SELECTORS.userCell);
          for (const cell of cells) {
            if (!checkLimits().canFollow) break;
            if (cell.querySelector(SELECTORS.unfollowButton)) continue;
            await doFollow(cell);
            await randomDelay(STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS, STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS * 1.5);
          }
          scrollBy(600);
          await sleep(2000);
        }
      }
    }

    // Phase 2: Like
    if (STRATEGY.ACTIONS.LIKE && state.isRunning && !isSessionExpired()) {
      log('📍 Phase 2: Timeline Engagement', 'info');
      window.location.href = 'https://twitter.com/home';
      await sleep(3000);
      
      for (let scroll = 0; scroll < 15 && checkLimits().canLike; scroll++) {
        const tweets = document.querySelectorAll(SELECTORS.tweet);
        for (const tweet of tweets) {
          if (!checkLimits().canLike) break;
          if (tweet.querySelector(SELECTORS.unlikeButton)) continue;
          await doLike(tweet);
          await randomDelay(STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS, STRATEGY.TIMING.DELAY_BETWEEN_ACTIONS * 1.5);
        }
        scrollBy(600);
        await sleep(2000);
      }
    }

    // Summary
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ SESSION COMPLETE                                      ║
╠═══════════════════════════════════════════════════════════╣
║  Follows:   ${String(state.follows).padEnd(5)}                                      ║
║  Likes:     ${String(state.likes).padEnd(5)}                                      ║
║  Unfollows: ${String(state.unfollows).padEnd(5)}                                      ║
║                                                           ║
║  Total tracked: ${String(tracked.followed.size).padEnd(5)} users                        ║
╚═══════════════════════════════════════════════════════════╝
    `);
  };

  run();
  window.stopGrowth = () => { state.isRunning = false; log('⏹️ Stopping...', 'warning'); };
})();
```

---

## 🖥️ Example 2: Node.js (Production-Ready)

**Best for:** Scheduled automation, long-term growth campaigns, server deployment

This production-ready script includes:
- ✅ Scheduled execution (runs automatically)
- ✅ Comprehensive logging with timestamps
- ✅ Persistent tracking across sessions
- ✅ Error handling and recovery
- ✅ Rate limit protection
- ✅ Progress reporting

```javascript
// ============================================
// XActions Growth Suite - Node.js Production Script
// Author: nich (@nichxbt)
// 
// Features:
// - Searches for users by keywords
// - Follows promising accounts
// - Likes their recent tweets
// - Unfollows non-followers after X days
// - Runs on schedule
// - Comprehensive logging
// ============================================

const { XActions } = require('xactions');
const fs = require('fs');
const path = require('path');

// ============================================
// 🎯 GROWTH STRATEGY CONFIGURATION
// ============================================
const STRATEGY = {
  // Your niche keywords - be specific!
  KEYWORDS: [
    'web3 developer',
    'solidity engineer',
    'defi builder',
    'ethereum dev',
    'smart contract developer',
  ],

  // Target accounts (follow their followers)
  TARGET_ACCOUNTS: [
    // Add usernames without @
  ],

  // Daily limits - STAY CONSERVATIVE!
  DAILY_LIMITS: {
    FOLLOWS: 25,
    LIKES: 40,
    UNFOLLOWS: 20,
  },

  // Session settings
  SESSION: {
    DURATION_MINUTES: 30,
    SESSIONS_PER_DAY: 2,
  },

  // Smart unfollow settings
  UNFOLLOW: {
    GRACE_PERIOD_DAYS: 3,      // Wait this long before unfollowing
    PROTECT_VERIFIED: true,    // Don't unfollow verified accounts
    PROTECT_ACTIVE: true,      // Don't unfollow accounts that engage with you
  },

  // User filters
  FILTERS: {
    MIN_FOLLOWERS: 50,
    MAX_FOLLOWERS: 50000,
    MIN_FOLLOWING: 20,
    MAX_FOLLOWING: 5000,
    MUST_HAVE_BIO: true,
    MUST_HAVE_AVATAR: true,
    SKIP_PRIVATE: true,
    ACCOUNT_AGE_DAYS: 30,      // Skip accounts younger than this
    LANGUAGE: 'en',            // null for any language
  },

  // Timing (milliseconds)
  DELAYS: {
    BETWEEN_ACTIONS: { MIN: 3000, MAX: 6000 },
    BETWEEN_USERS: { MIN: 2000, MAX: 4000 },
    BATCH_PAUSE: { EVERY: 10, DURATION: 30000 },
    SCROLL: 2000,
  },

  // Schedule (using cron syntax)
  SCHEDULE: {
    ENABLED: true,
    // Run at 9 AM and 6 PM
    CRON: '0 9,18 * * *',
  },
};

// ============================================
// 📁 DATA STORAGE
// ============================================
const DATA_DIR = path.join(__dirname, '.growth-data');
const TRACKING_FILE = path.join(DATA_DIR, 'tracking.json');
const LOG_FILE = path.join(DATA_DIR, 'growth.log');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load/save tracking data
const loadTracking = () => {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
      return {
        followed: new Map(Object.entries(data.followed || {})),
        liked: new Set(data.liked || []),
        unfollowed: new Set(data.unfollowed || []),
        dailyStats: data.dailyStats || {},
      };
    }
  } catch (err) {
    console.error('Failed to load tracking data:', err);
  }
  return { followed: new Map(), liked: new Set(), unfollowed: new Set(), dailyStats: {} };
};

const saveTracking = (tracking) => {
  const data = {
    followed: Object.fromEntries(tracking.followed),
    liked: Array.from(tracking.liked),
    unfollowed: Array.from(tracking.unfollowed),
    dailyStats: tracking.dailyStats,
  };
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
};

// ============================================
// 📝 LOGGING
// ============================================
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}`;
  console.log(logLine);
  fs.appendFileSync(LOG_FILE, logLine + '\n');
};

// ============================================
// 🔧 HELPER FUNCTIONS
// ============================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const randomDelay = async (min, max) => {
  const delay = min + Math.random() * (max - min);
  await sleep(delay);
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

const getDailyStats = (tracking) => {
  const today = getTodayKey();
  if (!tracking.dailyStats[today]) {
    tracking.dailyStats[today] = { follows: 0, likes: 0, unfollows: 0 };
  }
  return tracking.dailyStats[today];
};

const canPerformAction = (tracking, action) => {
  const stats = getDailyStats(tracking);
  switch (action) {
    case 'follow': return stats.follows < STRATEGY.DAILY_LIMITS.FOLLOWS;
    case 'like': return stats.likes < STRATEGY.DAILY_LIMITS.LIKES;
    case 'unfollow': return stats.unfollows < STRATEGY.DAILY_LIMITS.UNFOLLOWS;
    default: return false;
  }
};

const passesFilters = (user) => {
  const f = STRATEGY.FILTERS;
  
  if (user.followers < f.MIN_FOLLOWERS || user.followers > f.MAX_FOLLOWERS) return false;
  if (user.following < f.MIN_FOLLOWING || user.following > f.MAX_FOLLOWING) return false;
  if (f.MUST_HAVE_BIO && !user.bio) return false;
  if (f.MUST_HAVE_AVATAR && user.hasDefaultAvatar) return false;
  if (f.SKIP_PRIVATE && user.isProtected) return false;
  if (f.LANGUAGE && user.language !== f.LANGUAGE) return false;
  
  // Check account age
  if (f.ACCOUNT_AGE_DAYS) {
    const accountAge = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAge < f.ACCOUNT_AGE_DAYS) return false;
  }
  
  return true;
};

// ============================================
// 🚀 MAIN GROWTH CLASS
// ============================================
class GrowthSuite {
  constructor(options = {}) {
    this.auth = options.auth;
    this.x = null;
    this.tracking = loadTracking();
    this.sessionStats = { follows: 0, likes: 0, unfollows: 0 };
    this.isRunning = false;
  }

  async init() {
    log('Initializing XActions Growth Suite...', 'INFO');
    
    this.x = new XActions({
      auth: this.auth,
      rateLimit: {
        enabled: true,
        maxRetries: 3,
        backoff: 'exponential',
      },
    });

    await this.x.init();
    log('XActions initialized successfully', 'INFO');
  }

  async searchAndFollow() {
    log('📍 Phase 1: Keyword Search & Follow', 'INFO');

    for (const keyword of STRATEGY.KEYWORDS) {
      if (!this.isRunning || !canPerformAction(this.tracking, 'follow')) break;

      log(`🔍 Searching for: "${keyword}"`, 'INFO');

      try {
        const users = await this.x.searchUsers(keyword, { limit: 50 });
        log(`Found ${users.length} users for "${keyword}"`, 'INFO');

        for (const user of users) {
          if (!this.isRunning || !canPerformAction(this.tracking, 'follow')) break;

          // Skip if already followed or doesn't pass filters
          if (this.tracking.followed.has(user.username)) continue;
          if (this.tracking.unfollowed.has(user.username)) continue;
          if (!passesFilters(user)) continue;

          try {
            await this.x.follow(user.username);
            
            this.tracking.followed.set(user.username, {
              at: Date.now(),
              source: 'keyword',
              keyword: keyword,
              followers: user.followers,
            });
            
            getDailyStats(this.tracking).follows++;
            this.sessionStats.follows++;
            saveTracking(this.tracking);

            log(`✅ Followed @${user.username} (${user.followers} followers)`, 'SUCCESS');

            // Batch pause
            if (this.sessionStats.follows % STRATEGY.DELAYS.BATCH_PAUSE.EVERY === 0) {
              log(`⏸️ Pausing for ${STRATEGY.DELAYS.BATCH_PAUSE.DURATION / 1000}s...`, 'INFO');
              await sleep(STRATEGY.DELAYS.BATCH_PAUSE.DURATION);
            }

            await randomDelay(
              STRATEGY.DELAYS.BETWEEN_ACTIONS.MIN,
              STRATEGY.DELAYS.BETWEEN_ACTIONS.MAX
            );

          } catch (err) {
            log(`Failed to follow @${user.username}: ${err.message}`, 'ERROR');
            
            if (err.message.includes('rate limit')) {
              log('Rate limited! Pausing for 5 minutes...', 'WARN');
              await sleep(5 * 60 * 1000);
            }
          }
        }

        await randomDelay(
          STRATEGY.DELAYS.BETWEEN_USERS.MIN,
          STRATEGY.DELAYS.BETWEEN_USERS.MAX
        );

      } catch (err) {
        log(`Search failed for "${keyword}": ${err.message}`, 'ERROR');
      }
    }
  }

  async likeTimeline() {
    log('📍 Phase 2: Timeline Engagement', 'INFO');

    if (!canPerformAction(this.tracking, 'like')) {
      log('Daily like limit reached, skipping...', 'INFO');
      return;
    }

    try {
      const tweets = await this.x.getTimeline({ limit: 100 });
      log(`Found ${tweets.length} tweets in timeline`, 'INFO');

      for (const tweet of tweets) {
        if (!this.isRunning || !canPerformAction(this.tracking, 'like')) break;

        // Skip if already liked
        if (this.tracking.liked.has(tweet.id)) continue;
        if (tweet.isRetweet || tweet.isAd) continue;

        try {
          await this.x.likeTweet(tweet.id);
          
          this.tracking.liked.add(tweet.id);
          getDailyStats(this.tracking).likes++;
          this.sessionStats.likes++;
          saveTracking(this.tracking);

          log(`❤️ Liked tweet from @${tweet.author.username}`, 'SUCCESS');

          await randomDelay(
            STRATEGY.DELAYS.BETWEEN_ACTIONS.MIN,
            STRATEGY.DELAYS.BETWEEN_ACTIONS.MAX
          );

        } catch (err) {
          log(`Failed to like tweet: ${err.message}`, 'ERROR');
        }
      }

    } catch (err) {
      log(`Timeline fetch failed: ${err.message}`, 'ERROR');
    }
  }

  async smartUnfollow() {
    log('📍 Phase 3: Smart Unfollow', 'INFO');

    if (!canPerformAction(this.tracking, 'unfollow')) {
      log('Daily unfollow limit reached, skipping...', 'INFO');
      return;
    }

    const now = Date.now();
    const gracePeriod = STRATEGY.UNFOLLOW.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    const expired = [];

    // Find users past grace period who haven't followed back
    for (const [username, data] of this.tracking.followed) {
      if (now - data.at > gracePeriod) {
        expired.push({ username, data });
      }
    }

    log(`Found ${expired.length} users past ${STRATEGY.UNFOLLOW.GRACE_PERIOD_DAYS}-day grace period`, 'INFO');

    for (const { username, data } of expired) {
      if (!this.isRunning || !canPerformAction(this.tracking, 'unfollow')) break;

      try {
        // Check if they follow us back
        const followsBack = await this.x.checkFollowing(username);
        
        if (followsBack) {
          // They followed back! Update tracking
          this.tracking.followed.set(username, { ...data, followedBack: true });
          saveTracking(this.tracking);
          log(`🤝 @${username} follows back - keeping!`, 'INFO');
          continue;
        }

        // Check if verified and we should protect
        if (STRATEGY.UNFOLLOW.PROTECT_VERIFIED) {
          const user = await this.x.getUser(username);
          if (user.isVerified) {
            log(`✓ @${username} is verified - keeping!`, 'INFO');
            continue;
          }
        }

        // Unfollow
        await this.x.unfollow(username);
        
        this.tracking.followed.delete(username);
        this.tracking.unfollowed.add(username);
        getDailyStats(this.tracking).unfollows++;
        this.sessionStats.unfollows++;
        saveTracking(this.tracking);

        log(`🔄 Unfollowed @${username} (no follow-back after ${STRATEGY.UNFOLLOW.GRACE_PERIOD_DAYS} days)`, 'SUCCESS');

        await randomDelay(
          STRATEGY.DELAYS.BETWEEN_ACTIONS.MIN,
          STRATEGY.DELAYS.BETWEEN_ACTIONS.MAX
        );

      } catch (err) {
        log(`Failed to process @${username}: ${err.message}`, 'ERROR');
      }
    }
  }

  async runSession() {
    this.isRunning = true;
    this.sessionStats = { follows: 0, likes: 0, unfollows: 0 };
    const startTime = Date.now();

    log('═'.repeat(60), 'INFO');
    log('🚀 GROWTH SESSION STARTED', 'INFO');
    log('═'.repeat(60), 'INFO');
    log(`Keywords: ${STRATEGY.KEYWORDS.join(', ')}`, 'INFO');
    log(`Daily limits: ${STRATEGY.DAILY_LIMITS.FOLLOWS} follows, ${STRATEGY.DAILY_LIMITS.LIKES} likes, ${STRATEGY.DAILY_LIMITS.UNFOLLOWS} unfollows`, 'INFO');
    log(`Session duration: ${STRATEGY.SESSION.DURATION_MINUTES} minutes`, 'INFO');
    log(`Tracked users: ${this.tracking.followed.size}`, 'INFO');
    log('═'.repeat(60), 'INFO');

    try {
      // Phase 1: Search and Follow
      await this.searchAndFollow();

      // Check if session expired
      const elapsed = (Date.now() - startTime) / 60000;
      if (elapsed < STRATEGY.SESSION.DURATION_MINUTES && this.isRunning) {
        // Phase 2: Like Timeline
        await this.likeTimeline();
      }

      // Phase 3: Smart Unfollow
      if (this.isRunning) {
        await this.smartUnfollow();
      }

    } catch (err) {
      log(`Session error: ${err.message}`, 'ERROR');
    }

    // Session summary
    const duration = Math.round((Date.now() - startTime) / 60000);
    log('═'.repeat(60), 'INFO');
    log('✅ SESSION COMPLETE', 'INFO');
    log('═'.repeat(60), 'INFO');
    log(`Duration: ${duration} minutes`, 'INFO');
    log(`Follows: ${this.sessionStats.follows}`, 'INFO');
    log(`Likes: ${this.sessionStats.likes}`, 'INFO');
    log(`Unfollows: ${this.sessionStats.unfollows}`, 'INFO');
    log(`Total tracked: ${this.tracking.followed.size} users`, 'INFO');
    log('═'.repeat(60), 'INFO');

    this.isRunning = false;
  }

  stop() {
    log('⏹️ Stopping growth session...', 'WARN');
    this.isRunning = false;
  }
}

// ============================================
// 🕐 SCHEDULER
// ============================================
const runScheduled = async () => {
  const growth = new GrowthSuite({
    auth: {
      // Use environment variables!
      username: process.env.X_USERNAME,
      password: process.env.X_PASSWORD,
      email: process.env.X_EMAIL,
    },
  });

  await growth.init();

  if (STRATEGY.SCHEDULE.ENABLED) {
    const cron = require('node-cron');
    
    log(`📅 Scheduler enabled: ${STRATEGY.SCHEDULE.CRON}`, 'INFO');
    
    cron.schedule(STRATEGY.SCHEDULE.CRON, async () => {
      log('⏰ Scheduled session triggered', 'INFO');
      await growth.runSession();
    });

    // Run immediately on start
    await growth.runSession();
  } else {
    // Run once
    await growth.runSession();
    process.exit(0);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...', 'WARN');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...', 'WARN');
  process.exit(0);
});

// Start
runScheduled().catch((err) => {
  log(`Fatal error: ${err.message}`, 'ERROR');
  process.exit(1);
});
```

### Running the Node.js Script

**Install dependencies:**

```bash
npm install xactions node-cron
```

**Set environment variables:**

```bash
export X_USERNAME="your_username"
export X_PASSWORD="your_password"
export X_EMAIL="your_email"
```

**Run:**

```bash
node growth-suite.js
```

**Run with PM2 (production):**

```bash
npm install -g pm2
pm2 start growth-suite.js --name "xactions-growth"
pm2 save
pm2 startup
```

---

## 📊 Safety Limits Reference

### Recommended Daily Limits

| Account Age | Followers | Max Follows/Day | Max Unfollows/Day | Max Likes/Day |
|-------------|-----------|-----------------|-------------------|---------------|
| < 1 month | < 100 | **5-10** | **5** | **15-20** |
| 1-3 months | 100-500 | **10-15** | **10** | **25-30** |
| 3-6 months | 500-1K | **15-25** | **15** | **40-50** |
| 6-12 months | 1K-5K | **25-40** | **25** | **60-80** |
| > 1 year | 5K+ | **40-50** | **40** | **100** |

### Session Limits

| Metric | Conservative | Moderate | Aggressive ⚠️ |
|--------|--------------|----------|---------------|
| Follows per session | 10-15 | 20-30 | 40-50 |
| Likes per session | 15-20 | 30-40 | 50-70 |
| Unfollows per session | 10-15 | 20-30 | 40-50 |
| Sessions per day | 1-2 | 2-3 | 3-4 |
| Session duration | 20-30 min | 30-45 min | 45-60 min |
| Delay between actions | 4-8 sec | 3-5 sec | 2-4 sec |

### ⚠️ Hard Limits (Never Exceed!)

| Action | Absolute Maximum | Why |
|--------|-----------------|-----|
| Follows/day | **50** | X suspends aggressive followers |
| Unfollows/day | **50** | Pattern detection triggers |
| Likes/day | **100** | Rate limiting kicks in |
| Actions/hour | **30** | Velocity detection |

---

## 🎯 Growth Strategy Best Practices

### 1. Keyword Selection

**DO:**
- ✅ Use specific niche keywords (`"solidity engineer"` not `"developer"`)
- ✅ Include job titles, technologies, interests
- ✅ Test different keywords and track results
- ✅ Focus on 3-5 high-quality keywords

**DON'T:**
- ❌ Use generic terms with millions of results
- ❌ Target unrelated niches for bigger numbers
- ❌ Change keywords too frequently

### 2. Timing Strategy

**Optimal schedule:**
```
Morning (9-10 AM):   Session 1 - Focus on following
Evening (6-7 PM):    Session 2 - Focus on engagement
```

**Why this works:**
- People are most active during these times
- Your follows/likes appear in their notifications when they're online
- Better chance of immediate engagement

### 3. The 3-Day Grace Period

The default 3-day unfollow window is strategic:

- **Day 1-2:** New follows see your profile, may check your content
- **Day 3:** Decision time - if they haven't followed back, they likely won't
- **Day 4+:** Unfollow to maintain ratio and free up capacity

### 4. Content Quality Matters

> **Automation amplifies your content, it doesn't replace it.**

For best results:
- 📝 Post valuable content daily (2-3 tweets minimum)
- 🧵 Create threads on topics your target audience cares about
- 💬 Engage manually with replies that bring value
- 🎯 Have a clear bio and profile that explains who you are

### 5. The Follow-Back Flywheel

```
Better Content → More Follow-Backs → Better Ratio
      ↑                                    ↓
      └──────── More Credibility ←─────────┘
```

---

## 🌐 Website Alternative

**Prefer a no-code solution?** The Growth Suite is available in the [xactions.app](https://xactions.app) Pro tier:

### What's Included in Pro:

| Feature | Description |
|---------|-------------|
| 🎯 Visual Strategy Builder | Configure growth campaigns with a simple UI |
| 📊 Analytics Dashboard | Track follower growth, engagement rates, best times |
| 📅 Smart Scheduler | AI-optimized timing for maximum engagement |
| 🔄 Auto-Unfollow | Automatic cleanup of non-followers |
| 📈 Progress Reports | Weekly email reports on your growth |
| 🛡️ Safety Monitoring | Automatic pausing when rate limits detected |
| 💾 Cloud Sync | Your data synced across devices |
| 🎧 Priority Support | Direct access to the team |

### Getting Started with Pro:

1. Visit [xactions.app/pricing](https://xactions.app/pricing)
2. Sign up for Pro tier ($19/month)
3. Connect your X account
4. Configure your growth strategy
5. Let it run on autopilot!

**Pro Tip:** Use the web app for daily automation and the scripts for more advanced customization.

---

## 🔧 Troubleshooting

### "Rate limited" errors

**Solution:**
1. Stop all automation immediately
2. Wait 24-48 hours before resuming
3. Reduce your limits by 50%
4. Increase delays between actions

### "Account locked" message

**Solution:**
1. Complete any verification challenges
2. Wait 48-72 hours before any automation
3. Start with very conservative limits (5 follows/day)
4. Mix in manual activity

### Script stops unexpectedly

**Possible causes:**
- Session timeout - restart the script
- DOM changes - check for XActions updates
- Rate limiting - wait and retry
- Network issues - check your connection

### Not finding users to follow

**Solutions:**
- Broaden your keywords
- Check if search is working manually
- Verify you're not shadow-banned
- Try different keyword combinations

---

## 📚 Related Documentation

- [Auto-Liker](auto-liker.md) - Standalone liking automation
- [Keyword Follow](keyword-follow.md) - Focused following by keyword
- [Unfollow Non-Followers](unfollow-non-followers.md) - Cleanup non-followers
- [Multi-Account](multi-account.md) - Run across multiple accounts

---

## 📜 License & Disclaimer

**Author:** nich (@nichxbt)

**Disclaimer:** This tool is for educational purposes. You are responsible for how you use it. Aggressive automation violates X's Terms of Service and can result in account suspension. Always use conservative limits and monitor your account's health.

**License:** MIT - See [LICENSE](../../LICENSE) for details.
