# 👥 Multi-Account Management

Manage and automate multiple X (Twitter) accounts from a single interface with intelligent rotation, per-account rate limiting, and comprehensive logging.

---

## 📋 What It Does

Multi-Account Management enables you to:

1. **Manage Multiple Accounts** - Store and organize credentials for multiple X accounts
2. **Rotate Between Accounts** - Automatically switch between accounts for distributed automation
3. **Per-Account Rate Limits** - Respect individual rate limits to avoid suspensions
4. **Session Management** - Handle authentication cookies and sessions for each account
5. **Centralized Logging** - Track actions and stats per account
6. **Account Health Monitoring** - Detect and pause limited/suspended accounts

**Use cases:**
- Social media agencies managing client accounts
- Brand accounts across multiple regions
- Personal + business account management
- Growth automation across account networks
- A/B testing engagement strategies

**⚠️ Important Considerations:**
- Always comply with X's Terms of Service
- Use different IPs/proxies for each account
- Never link accounts through similar behavior patterns
- This is an advanced feature for professional users

---

## 🗂️ Example 1: Configuration File Format

Create an `accounts.json` file to store your account configurations:

```json
{
  "accounts": [
    {
      "username": "brand_official",
      "displayName": "Brand Official",
      "cookies": [
        {
          "name": "auth_token",
          "value": "YOUR_AUTH_TOKEN_HERE",
          "domain": ".x.com",
          "path": "/",
          "secure": true,
          "httpOnly": true
        },
        {
          "name": "ct0",
          "value": "YOUR_CSRF_TOKEN_HERE",
          "domain": ".x.com",
          "path": "/",
          "secure": true,
          "httpOnly": false
        }
      ],
      "proxy": "http://user:pass@proxy1.example.com:8080",
      "status": "active",
      "dailyLimits": {
        "follows": 50,
        "unfollows": 100,
        "likes": 200,
        "comments": 30
      },
      "notes": "Main brand account - be conservative"
    },
    {
      "username": "brand_support",
      "displayName": "Brand Support",
      "cookies": [
        {
          "name": "auth_token",
          "value": "YOUR_AUTH_TOKEN_HERE",
          "domain": ".x.com",
          "path": "/",
          "secure": true,
          "httpOnly": true
        },
        {
          "name": "ct0",
          "value": "YOUR_CSRF_TOKEN_HERE",
          "domain": ".x.com",
          "path": "/",
          "secure": true,
          "httpOnly": false
        }
      ],
      "proxy": "http://user:pass@proxy2.example.com:8080",
      "status": "active",
      "dailyLimits": {
        "follows": 100,
        "unfollows": 150,
        "likes": 300,
        "comments": 50
      },
      "notes": "Support account - can be more active"
    },
    {
      "username": "founder_personal",
      "displayName": "Founder Personal",
      "cookies": [],
      "proxy": null,
      "status": "paused",
      "dailyLimits": {
        "follows": 30,
        "unfollows": 50,
        "likes": 100,
        "comments": 20
      },
      "notes": "Personal account - currently paused"
    }
  ],
  "globalSettings": {
    "rotationStrategy": "round-robin",
    "delayBetweenAccounts": 30000,
    "pauseOnRateLimit": true,
    "logLevel": "info"
  }
}
```

### 🔐 How to Get Your Cookies

1. Log into X in your browser
2. Open Developer Tools (F12)
3. Go to **Application** → **Cookies** → `https://x.com`
4. Copy the values for `auth_token` and `ct0`
5. These cookies authenticate your session without storing passwords

> **⚠️ Security Warning:** Never share your `auth_token` cookie. It provides full access to your account!

---

## 💻 Example 2: Node.js with Puppeteer

Production-ready multi-account automation with account rotation, rate limiting, and logging:

```javascript
// ============================================
// XActions - Multi-Account Manager (Puppeteer)
// Author: nich (@nichxbt)
// Production-ready multi-account automation
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  accountsFile: './accounts.json',
  logsDir: './logs',
  stateDir: './state',
  headless: true,
  
  // Timing (in milliseconds)
  actionDelay: { min: 3000, max: 7000 },
  accountCooldown: 30000,           // Delay between switching accounts
  rateLimitPause: 15 * 60 * 1000,   // 15 min pause on rate limit
  
  // Viewport settings
  viewport: { width: 1280, height: 800 },
};

// ============================================
// UTILITIES
// ============================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => sleep(min + Math.random() * (max - min));
const timestamp = () => new Date().toISOString();

// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// ============================================
// LOGGER - Per-Account Logging
// ============================================
class AccountLogger {
  constructor(username) {
    this.username = username;
    this.logFile = path.join(CONFIG.logsDir, `${username}.log`);
    this.statsFile = path.join(CONFIG.stateDir, `${username}-stats.json`);
    ensureDir(CONFIG.logsDir);
    ensureDir(CONFIG.stateDir);
  }

  log(level, message, data = {}) {
    const entry = {
      timestamp: timestamp(),
      level,
      message,
      ...data,
    };

    const logLine = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(`[@${this.username}] ${logLine}`);
    
    fs.appendFileSync(this.logFile, logLine + '\n');
    return entry;
  }

  info(message, data) { return this.log('info', message, data); }
  warn(message, data) { return this.log('warn', message, data); }
  error(message, data) { return this.log('error', message, data); }
  success(message, data) { return this.log('success', message, data); }

  // Load/save daily stats
  getStats() {
    try {
      if (fs.existsSync(this.statsFile)) {
        const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
        // Reset stats if it's a new day
        if (data.date !== new Date().toDateString()) {
          return this.resetStats();
        }
        return data;
      }
    } catch (e) {}
    return this.resetStats();
  }

  resetStats() {
    const stats = {
      date: new Date().toDateString(),
      follows: 0,
      unfollows: 0,
      likes: 0,
      comments: 0,
      errors: 0,
    };
    this.saveStats(stats);
    return stats;
  }

  saveStats(stats) {
    fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
  }

  incrementStat(action, count = 1) {
    const stats = this.getStats();
    stats[action] = (stats[action] || 0) + count;
    this.saveStats(stats);
    return stats;
  }
}

// ============================================
// RATE LIMITER - Per-Account Limits
// ============================================
class RateLimiter {
  constructor(account, logger) {
    this.account = account;
    this.logger = logger;
    this.limits = account.dailyLimits || {
      follows: 50,
      unfollows: 100,
      likes: 200,
      comments: 30,
    };
  }

  canPerform(action) {
    const stats = this.logger.getStats();
    const current = stats[action] || 0;
    const limit = this.limits[action] || 100;
    
    if (current >= limit) {
      this.logger.warn(`Daily limit reached for ${action}: ${current}/${limit}`);
      return false;
    }
    
    return true;
  }

  record(action) {
    this.logger.incrementStat(action);
  }

  getRemaining(action) {
    const stats = this.logger.getStats();
    const current = stats[action] || 0;
    const limit = this.limits[action] || 100;
    return Math.max(0, limit - current);
  }

  printStatus() {
    const stats = this.logger.getStats();
    console.log(`\n📊 Rate Limit Status for @${this.account.username}:`);
    for (const [action, limit] of Object.entries(this.limits)) {
      const current = stats[action] || 0;
      const remaining = limit - current;
      const bar = '█'.repeat(Math.round((current / limit) * 20)).padEnd(20, '░');
      console.log(`   ${action}: [${bar}] ${current}/${limit} (${remaining} remaining)`);
    }
  }
}

// ============================================
// ACCOUNT MANAGER
// ============================================
class MultiAccountManager {
  constructor() {
    this.accounts = [];
    this.browsers = new Map();  // username -> browser instance
    this.currentIndex = 0;
    this.loadAccounts();
  }

  loadAccounts() {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG.accountsFile, 'utf8'));
      this.accounts = data.accounts.filter(a => a.status === 'active');
      this.settings = data.globalSettings || {};
      console.log(`✅ Loaded ${this.accounts.length} active accounts`);
    } catch (error) {
      console.error('❌ Failed to load accounts:', error.message);
      this.accounts = [];
    }
  }

  // Get next account in rotation
  getNextAccount() {
    if (this.accounts.length === 0) return null;
    
    const account = this.accounts[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
    return account;
  }

  // Get all active accounts
  getActiveAccounts() {
    return this.accounts.filter(a => a.status === 'active');
  }

  // Update account status
  updateAccountStatus(username, status) {
    const account = this.accounts.find(a => a.username === username);
    if (account) {
      account.status = status;
      console.log(`📝 Updated @${username} status to: ${status}`);
    }
  }

  // Initialize browser for an account
  async initBrowser(account) {
    if (this.browsers.has(account.username)) {
      return this.browsers.get(account.username);
    }

    const launchOptions = {
      headless: CONFIG.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    };

    // Add proxy if configured
    if (account.proxy) {
      launchOptions.args.push(`--proxy-server=${account.proxy}`);
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport(CONFIG.viewport);

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Inject cookies
    if (account.cookies && account.cookies.length > 0) {
      await page.setCookie(...account.cookies);
    }

    this.browsers.set(account.username, { browser, page });
    return { browser, page };
  }

  // Close browser for an account
  async closeBrowser(username) {
    const instance = this.browsers.get(username);
    if (instance) {
      await instance.browser.close();
      this.browsers.delete(username);
    }
  }

  // Close all browsers
  async closeAll() {
    for (const [username, { browser }] of this.browsers) {
      await browser.close();
      console.log(`🔒 Closed browser for @${username}`);
    }
    this.browsers.clear();
  }
}

// ============================================
// ACTION EXECUTOR
// ============================================
class ActionExecutor {
  constructor(account, page, logger, rateLimiter) {
    this.account = account;
    this.page = page;
    this.logger = logger;
    this.rateLimiter = rateLimiter;
  }

  // Navigate to X
  async goToX() {
    await this.page.goto('https://x.com/home', { 
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2000);
    
    // Check if logged in
    const isLoggedIn = await this.page.evaluate(() => {
      return !!document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    });

    if (!isLoggedIn) {
      this.logger.error('Not logged in - cookies may be expired');
      return false;
    }

    this.logger.success('Successfully authenticated');
    return true;
  }

  // Like a tweet by URL
  async likeTweet(tweetUrl) {
    if (!this.rateLimiter.canPerform('likes')) {
      return { success: false, reason: 'rate_limit' };
    }

    try {
      await this.page.goto(tweetUrl, { waitUntil: 'networkidle2' });
      await randomDelay(CONFIG.actionDelay.min, CONFIG.actionDelay.max);

      // Find and click the like button
      const likeButton = await this.page.$('[data-testid="like"]');
      if (!likeButton) {
        // Already liked or not found
        const unlikeButton = await this.page.$('[data-testid="unlike"]');
        if (unlikeButton) {
          this.logger.info('Tweet already liked');
          return { success: true, reason: 'already_liked' };
        }
        return { success: false, reason: 'button_not_found' };
      }

      await likeButton.click();
      await sleep(1000);

      this.rateLimiter.record('likes');
      this.logger.success(`Liked tweet: ${tweetUrl}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to like tweet: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }

  // Follow a user
  async followUser(username) {
    if (!this.rateLimiter.canPerform('follows')) {
      return { success: false, reason: 'rate_limit' };
    }

    try {
      await this.page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
      await randomDelay(CONFIG.actionDelay.min, CONFIG.actionDelay.max);

      // Check for follow button
      const followButton = await this.page.$('[data-testid$="-follow"]');
      if (!followButton) {
        const followingButton = await this.page.$('[data-testid$="-unfollow"]');
        if (followingButton) {
          this.logger.info(`Already following @${username}`);
          return { success: true, reason: 'already_following' };
        }
        return { success: false, reason: 'button_not_found' };
      }

      await followButton.click();
      await sleep(1000);

      this.rateLimiter.record('follows');
      this.logger.success(`Followed @${username}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to follow @${username}: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }

  // Unfollow a user
  async unfollowUser(username) {
    if (!this.rateLimiter.canPerform('unfollows')) {
      return { success: false, reason: 'rate_limit' };
    }

    try {
      await this.page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
      await randomDelay(CONFIG.actionDelay.min, CONFIG.actionDelay.max);

      // Look for Following/Unfollow button
      const followingButton = await this.page.$('[data-testid$="-unfollow"]');
      if (!followingButton) {
        this.logger.info(`Not following @${username}`);
        return { success: true, reason: 'not_following' };
      }

      await followingButton.click();
      await sleep(500);

      // Confirm unfollow in modal
      const confirmButton = await this.page.$('[data-testid="confirmationSheetConfirm"]');
      if (confirmButton) {
        await confirmButton.click();
        await sleep(1000);
      }

      this.rateLimiter.record('unfollows');
      this.logger.success(`Unfollowed @${username}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to unfollow @${username}: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }
}

// ============================================
// MAIN ORCHESTRATOR
// ============================================
async function runMultiAccountAutomation(tasks) {
  console.log('\n' + '═'.repeat(60));
  console.log('👥 XActions Multi-Account Manager');
  console.log('═'.repeat(60));

  const manager = new MultiAccountManager();
  const accounts = manager.getActiveAccounts();

  if (accounts.length === 0) {
    console.error('❌ No active accounts found. Check your accounts.json file.');
    return;
  }

  console.log(`\n📋 Found ${accounts.length} active accounts:`);
  accounts.forEach((a, i) => console.log(`   ${i + 1}. @${a.username}`));

  // Process each account
  for (const account of accounts) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`🔄 Switching to @${account.username}`);
    console.log(`${'─'.repeat(50)}`);

    const logger = new AccountLogger(account.username);
    const rateLimiter = new RateLimiter(account, logger);

    try {
      // Initialize browser with account
      const { browser, page } = await manager.initBrowser(account);
      const executor = new ActionExecutor(account, page, logger, rateLimiter);

      // Authenticate
      const loggedIn = await executor.goToX();
      if (!loggedIn) {
        manager.updateAccountStatus(account.username, 'auth_failed');
        continue;
      }

      // Execute tasks for this account
      if (tasks && tasks.length > 0) {
        for (const task of tasks) {
          logger.info(`Executing task: ${task.type}`);

          switch (task.type) {
            case 'follow':
              for (const username of task.targets || []) {
                await executor.followUser(username);
                await randomDelay(CONFIG.actionDelay.min, CONFIG.actionDelay.max);
              }
              break;

            case 'unfollow':
              for (const username of task.targets || []) {
                await executor.unfollowUser(username);
                await randomDelay(CONFIG.actionDelay.min, CONFIG.actionDelay.max);
              }
              break;

            case 'like':
              for (const tweetUrl of task.targets || []) {
                await executor.likeTweet(tweetUrl);
                await randomDelay(CONFIG.actionDelay.min, CONFIG.actionDelay.max);
              }
              break;

            default:
              logger.warn(`Unknown task type: ${task.type}`);
          }
        }
      }

      // Print rate limit status
      rateLimiter.printStatus();

    } catch (error) {
      logger.error(`Account error: ${error.message}`);
      manager.updateAccountStatus(account.username, 'error');
    }

    // Cooldown before next account
    if (accounts.indexOf(account) < accounts.length - 1) {
      console.log(`\n⏳ Cooling down for ${CONFIG.accountCooldown / 1000}s before next account...`);
      await sleep(CONFIG.accountCooldown);
    }
  }

  // Cleanup
  await manager.closeAll();

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Multi-account automation complete!');
  console.log('═'.repeat(60) + '\n');
}

// ============================================
// EXAMPLE USAGE
// ============================================

// Example: Run tasks across all accounts
const exampleTasks = [
  {
    type: 'follow',
    targets: ['elonmusk', 'naval', 'paulg'],
  },
  {
    type: 'like',
    targets: [
      'https://x.com/user/status/123456789',
    ],
  },
];

// Run the automation
// runMultiAccountAutomation(exampleTasks);

// ============================================
// EXPORTS
// ============================================
module.exports = {
  MultiAccountManager,
  AccountLogger,
  RateLimiter,
  ActionExecutor,
  runMultiAccountAutomation,
  CONFIG,
};
```

### 📁 Directory Structure

After running the multi-account script, your project will look like:

```
project/
├── accounts.json          # Account configurations
├── multi-account.js       # The script above
├── logs/
│   ├── brand_official.log
│   ├── brand_support.log
│   └── founder_personal.log
└── state/
    ├── brand_official-stats.json
    ├── brand_support-stats.json
    └── founder_personal-stats.json
```

---

## 🛡️ Safety Tips

Managing multiple accounts requires careful attention to avoid detection and account suspensions:

### 🌐 Use Different IPs/Proxies

```javascript
// Each account should use a unique proxy
const accounts = [
  {
    username: 'account1',
    proxy: 'http://user:pass@us-proxy.example.com:8080',   // US IP
  },
  {
    username: 'account2',
    proxy: 'http://user:pass@uk-proxy.example.com:8080',   // UK IP
  },
  {
    username: 'account3',
    proxy: 'http://user:pass@de-proxy.example.com:8080',   // Germany IP
  },
];
```

**Recommended proxy types:**
- ✅ Residential proxies (best, looks like real users)
- ✅ Mobile proxies (excellent, uses mobile carrier IPs)
- ⚠️ Datacenter proxies (risky, easily detected)

### 🔗 Don't Link Accounts

**Never do these things that link accounts:**
- ❌ Follow the same accounts from multiple accounts
- ❌ Like/retweet the same content from all accounts
- ❌ Use similar usernames, bios, or profile pictures
- ❌ Post similar content or at similar times
- ❌ Use the same device/browser fingerprint
- ❌ Access from the same IP address

**Instead:**
- ✅ Give each account unique behavior patterns
- ✅ Use different niches/interests per account
- ✅ Randomize action timing significantly
- ✅ Use different browser profiles/fingerprints

### ⏱️ Proper Delays

```javascript
// Conservative delay configuration
const SAFE_DELAYS = {
  // Between individual actions
  actionDelay: { min: 5000, max: 15000 },    // 5-15 seconds
  
  // Between switching accounts  
  accountCooldown: 60000,                     // 1 minute
  
  // Daily limits per account
  dailyLimits: {
    follows: 30,      // Very conservative
    unfollows: 50,
    likes: 100,
    comments: 15,
  },
  
  // Working hours (to appear human)
  activeHours: { start: 8, end: 22 },        // 8 AM - 10 PM
  
  // Rest days
  restDaysPerWeek: 2,                         // Take 2 random days off
};
```

### 🚨 Handle Rate Limits Gracefully

```javascript
// Detect and handle rate limits
async function handleRateLimitDetection(page, logger, account) {
  // Check for rate limit indicators
  const rateLimited = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('rate limit') || 
           text.includes('try again later') ||
           text.includes('temporarily restricted');
  });

  if (rateLimited) {
    logger.warn('Rate limit detected! Pausing account...');
    
    // Mark account as limited
    account.status = 'limited';
    account.limitedUntil = Date.now() + (60 * 60 * 1000); // 1 hour pause
    
    // Save state
    saveAccountState(account);
    
    return true;
  }
  
  return false;
}
```

### 📊 Monitor Account Health

```javascript
// Regular health checks
async function checkAccountHealth(page, username, logger) {
  try {
    await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
    
    // Check if account is suspended
    const suspended = await page.evaluate(() => {
      return document.body.innerText.includes('Account suspended');
    });
    
    if (suspended) {
      logger.error('Account is SUSPENDED!');
      return { status: 'suspended', healthy: false };
    }
    
    // Check if account is restricted
    const restricted = await page.evaluate(() => {
      return document.body.innerText.includes('temporarily restricted');
    });
    
    if (restricted) {
      logger.warn('Account is temporarily restricted');
      return { status: 'restricted', healthy: false };
    }
    
    return { status: 'active', healthy: true };
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    return { status: 'error', healthy: false };
  }
}
```

---

## 🌐 Website Alternative

Don't want to run scripts? **[xactions.app](https://xactions.app)** Pro tier includes multi-account management with a visual dashboard:

### ✨ Pro Tier Features

| Feature | Script | xactions.app Pro |
|---------|--------|------------------|
| Multi-account support | ✅ | ✅ |
| Visual dashboard | ❌ | ✅ |
| Automatic proxy rotation | ❌ | ✅ |
| Account health monitoring | Manual | ✅ Automatic |
| Scheduled automation | Cron jobs | ✅ Built-in |
| Team collaboration | ❌ | ✅ |
| Analytics & reports | Basic logs | ✅ Advanced |
| Priority support | Community | ✅ 24/7 |

### 🚀 Getting Started with xactions.app

1. Go to [xactions.app/pricing](https://xactions.app/pricing)
2. Sign up for Pro tier
3. Connect your accounts via secure OAuth
4. Configure automation rules in the dashboard
5. Monitor everything from a single interface

**Pro tier is ideal for:**
- Agencies managing 5+ accounts
- Teams needing collaboration features
- Users who prefer GUI over code
- Those needing 24/7 automated monitoring

---

## 📚 Related Examples

- [unfollow-everyone.md](unfollow-everyone.md) - Unfollow all accounts
- [unfollow-non-followers.md](unfollow-non-followers.md) - Unfollow non-followers
- [auto-liker.md](auto-liker.md) - Automated liking
- [followers-scraping.md](followers-scraping.md) - Scrape follower lists
- [monitor-account.md](monitor-account.md) - Account monitoring

---

## 📄 License

MIT License - See [LICENSE](../../LICENSE)

---

*Author: nich ([@nichxbt](https://x.com/nichxbt))*  
*Part of the [XActions](https://github.com/nirholas/XActions) toolkit*
