# 🧠 Smart Unfollow

> Intelligently unfollow users who haven't followed you back after a configurable grace period.

**Author:** nich ([@nichxbt](https://x.com/nichxbt))

---

## 📖 What It Does

Smart Unfollow is an intelligent unfollowing system that:

1. **Tracks when you follow someone** - Maintains a log of all follow actions with timestamps
2. **Respects a grace period** - Gives users X days to follow you back before considering them for unfollow
3. **Identifies non-reciprocal follows** - Finds users who haven't followed back after the grace period expires
4. **Safely unfollows** - Removes these users with rate limiting and detailed logging
5. **Supports dry-run mode** - Preview what would happen without making actual changes

This approach is smarter than a simple "unfollow non-followers" script because it accounts for the fact that people need time to see your follow and decide to follow back.

---

## ⚙️ Example 1: Configuration Approach

The simplest way to use Smart Unfollow is through the xactions configuration:

```javascript
const { xactions } = require('xactions');

const client = new xactions({
  username: process.env.X_USERNAME,
  password: process.env.X_PASSWORD,
});

await client.smartUnfollow({
  gracePeriodDays: 3,        // Wait 3 days before unfollowing
  maxUnfollows: 50,          // Limit per session
  dryRun: false,             // Set to true to preview
  excludeVerified: true,     // Don't unfollow verified accounts
  excludeList: ['nichxbt'],  // Never unfollow these users
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gracePeriodDays` | number | 3 | Days to wait before unfollowing |
| `maxUnfollows` | number | 100 | Maximum unfollows per session |
| `dryRun` | boolean | false | Preview mode without actual unfollows |
| `excludeVerified` | boolean | true | Skip verified accounts |
| `excludeList` | string[] | [] | Usernames to never unfollow |
| `logFile` | string | `./follow_log.json` | Path to the follow tracking log |

---

## 🚀 Example 2: Node.js with Puppeteer

Here's a complete, production-ready implementation:

### Project Structure

```
smart-unfollow/
├── smart-unfollow.js      # Main script
├── follow_log.json        # Auto-generated follow tracking
├── unfollow_log.json      # Auto-generated unfollow history
├── .env                   # Your credentials
└── package.json
```

### package.json

```json
{
  "name": "smart-unfollow",
  "version": "1.0.0",
  "description": "Intelligently unfollow non-followers after grace period",
  "main": "smart-unfollow.js",
  "scripts": {
    "start": "node smart-unfollow.js",
    "dry-run": "node smart-unfollow.js --dry-run",
    "log-follow": "node smart-unfollow.js --log-follow"
  },
  "dependencies": {
    "puppeteer": "^21.0.0",
    "dotenv": "^16.0.0"
  }
}
```

### .env

```env
X_USERNAME=your_username
X_PASSWORD=your_password
X_EMAIL=your_email@example.com
GRACE_PERIOD_DAYS=3
MAX_UNFOLLOWS_PER_SESSION=50
```

### smart-unfollow.js

```javascript
/**
 * Smart Unfollow - Intelligent Non-Follower Removal
 * 
 * Unfollows users who haven't followed back after a configurable grace period.
 * Maintains persistent logs to track follow dates and unfollow history.
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Credentials
  username: process.env.X_USERNAME,
  password: process.env.X_PASSWORD,
  email: process.env.X_EMAIL,

  // Grace period settings
  gracePeriodDays: parseInt(process.env.GRACE_PERIOD_DAYS) || 3,
  maxUnfollowsPerSession: parseInt(process.env.MAX_UNFOLLOWS_PER_SESSION) || 50,

  // File paths
  followLogPath: path.join(__dirname, 'follow_log.json'),
  unfollowLogPath: path.join(__dirname, 'unfollow_log.json'),

  // Rate limiting (milliseconds)
  delayBetweenActions: 3000,
  delayBetweenScrolls: 2000,
  pageLoadDelay: 5000,

  // Browser settings
  headless: false,
  slowMo: 50,

  // Safety settings
  excludeVerified: true,
  excludeUsernames: ['nichxbt', 'elonmusk'], // Never unfollow these

  // Selectors (may need updates if X changes their UI)
  selectors: {
    usernameInput: 'input[autocomplete="username"]',
    passwordInput: 'input[name="password"]',
    nextButton: '[role="button"]:has-text("Next")',
    loginButton: '[data-testid="LoginForm_Login_Button"]',
    followingLink: 'a[href$="/following"]',
    userCell: '[data-testid="UserCell"]',
    unfollowButton: '[data-testid="placementTracking"] [role="button"]',
    confirmUnfollow: '[data-testid="confirmationSheetConfirm"]',
    verifiedBadge: 'svg[aria-label="Verified account"]',
  },
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

class Logger {
  static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
  };

  static timestamp() {
    return new Date().toISOString();
  }

  static log(message, color = 'reset') {
    console.log(`${this.colors[color]}[${this.timestamp()}] ${message}${this.colors.reset}`);
  }

  static info(message) { this.log(`ℹ️  ${message}`, 'blue'); }
  static success(message) { this.log(`✅ ${message}`, 'green'); }
  static warning(message) { this.log(`⚠️  ${message}`, 'yellow'); }
  static error(message) { this.log(`❌ ${message}`, 'red'); }
  static action(message) { this.log(`🔄 ${message}`, 'cyan'); }
  static dry(message) { this.log(`🧪 [DRY-RUN] ${message}`, 'magenta'); }
}

// ============================================================================
// FOLLOW LOG MANAGEMENT
// ============================================================================

class FollowLog {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      Logger.warning(`Could not load follow log: ${error.message}`);
    }
    return { follows: {}, metadata: { created: new Date().toISOString() } };
  }

  save() {
    try {
      this.data.metadata.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
      Logger.success(`Follow log saved with ${Object.keys(this.data.follows).length} entries`);
    } catch (error) {
      Logger.error(`Could not save follow log: ${error.message}`);
    }
  }

  addFollow(username) {
    const normalizedUsername = username.toLowerCase().replace('@', '');
    if (!this.data.follows[normalizedUsername]) {
      this.data.follows[normalizedUsername] = {
        username: normalizedUsername,
        followedAt: new Date().toISOString(),
        status: 'following',
      };
      Logger.success(`Logged follow: @${normalizedUsername}`);
      return true;
    }
    Logger.warning(`@${normalizedUsername} already in log`);
    return false;
  }

  markUnfollowed(username, reason = 'manual') {
    const normalizedUsername = username.toLowerCase().replace('@', '');
    if (this.data.follows[normalizedUsername]) {
      this.data.follows[normalizedUsername].status = 'unfollowed';
      this.data.follows[normalizedUsername].unfollowedAt = new Date().toISOString();
      this.data.follows[normalizedUsername].unfollowReason = reason;
    }
  }

  getExpiredNonFollowers(gracePeriodDays) {
    const now = new Date();
    const expired = [];

    for (const [username, entry] of Object.entries(this.data.follows)) {
      if (entry.status !== 'following') continue;

      const followedAt = new Date(entry.followedAt);
      const daysSinceFollow = (now - followedAt) / (1000 * 60 * 60 * 24);

      if (daysSinceFollow >= gracePeriodDays) {
        expired.push({
          username,
          followedAt: entry.followedAt,
          daysSinceFollow: Math.floor(daysSinceFollow),
        });
      }
    }

    return expired.sort((a, b) => b.daysSinceFollow - a.daysSinceFollow);
  }

  getStats() {
    const follows = Object.values(this.data.follows);
    return {
      total: follows.length,
      following: follows.filter(f => f.status === 'following').length,
      unfollowed: follows.filter(f => f.status === 'unfollowed').length,
    };
  }
}

// ============================================================================
// UNFOLLOW LOG MANAGEMENT
// ============================================================================

class UnfollowLog {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (error) {
      Logger.warning(`Could not load unfollow log: ${error.message}`);
    }
    return { sessions: [], totalUnfollowed: 0 };
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      Logger.error(`Could not save unfollow log: ${error.message}`);
    }
  }

  logSession(unfollowed, dryRun = false) {
    const session = {
      timestamp: new Date().toISOString(),
      dryRun,
      count: unfollowed.length,
      users: unfollowed,
    };
    this.data.sessions.push(session);
    if (!dryRun) {
      this.data.totalUnfollowed += unfollowed.length;
    }
    this.save();
  }
}

// ============================================================================
// SMART UNFOLLOW ENGINE
// ============================================================================

class SmartUnfollower {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.followLog = new FollowLog(config.followLogPath);
    this.unfollowLog = new UnfollowLog(config.unfollowLogPath);
    this.sessionUnfollowed = [];
  }

  async initialize() {
    Logger.info('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    Logger.success('Browser initialized');
  }

  async login() {
    Logger.action('Navigating to X login...');
    await this.page.goto('https://x.com/i/flow/login', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    await this.delay(this.config.pageLoadDelay);

    // Enter username
    Logger.action('Entering username...');
    await this.page.waitForSelector(this.config.selectors.usernameInput, { timeout: 30000 });
    await this.page.type(this.config.selectors.usernameInput, this.config.username, { delay: 100 });
    
    // Click Next
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      const nextButton = buttons.find(b => b.textContent.includes('Next'));
      if (nextButton) nextButton.click();
    });

    await this.delay(3000);

    // Check for email verification challenge
    const emailInput = await this.page.$('input[data-testid="ocfEnterTextTextInput"]');
    if (emailInput) {
      Logger.warning('Email verification required...');
      await emailInput.type(this.config.email, { delay: 100 });
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('[role="button"]'));
        const nextButton = buttons.find(b => b.textContent.includes('Next'));
        if (nextButton) nextButton.click();
      });
      await this.delay(3000);
    }

    // Enter password
    Logger.action('Entering password...');
    await this.page.waitForSelector(this.config.selectors.passwordInput, { timeout: 30000 });
    await this.page.type(this.config.selectors.passwordInput, this.config.password, { delay: 100 });

    // Click Login
    await this.page.waitForSelector(this.config.selectors.loginButton, { timeout: 10000 });
    await this.page.click(this.config.selectors.loginButton);

    await this.delay(this.config.pageLoadDelay);
    Logger.success('Login successful');
  }

  async getFollowers() {
    Logger.action('Fetching your followers list...');
    await this.page.goto(`https://x.com/${this.config.username}/followers`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await this.delay(this.config.pageLoadDelay);

    const followers = new Set();
    let previousSize = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 50;

    while (scrollAttempts < maxScrollAttempts) {
      // Extract usernames from current view
      const usernames = await this.page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).map(cell => {
          const link = cell.querySelector('a[href^="/"]');
          if (link) {
            const href = link.getAttribute('href');
            return href.replace('/', '').toLowerCase();
          }
          return null;
        }).filter(Boolean);
      });

      usernames.forEach(u => followers.add(u));

      // Check if we got new followers
      if (followers.size === previousSize) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0;
        previousSize = followers.size;
      }

      // Scroll down
      await this.page.evaluate(() => window.scrollBy(0, 800));
      await this.delay(this.config.delayBetweenScrolls);

      Logger.info(`Found ${followers.size} followers so far...`);

      // Stop if no new followers after several attempts
      if (scrollAttempts >= 5) break;
    }

    Logger.success(`Total followers found: ${followers.size}`);
    return followers;
  }

  async getFollowing() {
    Logger.action('Fetching your following list...');
    await this.page.goto(`https://x.com/${this.config.username}/following`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await this.delay(this.config.pageLoadDelay);

    const following = new Map(); // username -> { verified, displayName }
    let previousSize = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 50;

    while (scrollAttempts < maxScrollAttempts) {
      // Extract user info from current view
      const users = await this.page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).map(cell => {
          const link = cell.querySelector('a[href^="/"]');
          const verified = cell.querySelector('svg[aria-label*="Verified"]') !== null;
          const displayNameEl = cell.querySelector('[dir="ltr"] > span');
          
          if (link) {
            const href = link.getAttribute('href');
            return {
              username: href.replace('/', '').toLowerCase(),
              verified,
              displayName: displayNameEl ? displayNameEl.textContent : '',
            };
          }
          return null;
        }).filter(Boolean);
      });

      users.forEach(u => following.set(u.username, u));

      if (following.size === previousSize) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0;
        previousSize = following.size;
      }

      await this.page.evaluate(() => window.scrollBy(0, 800));
      await this.delay(this.config.delayBetweenScrolls);

      Logger.info(`Found ${following.size} following so far...`);

      if (scrollAttempts >= 5) break;
    }

    Logger.success(`Total following found: ${following.size}`);
    return following;
  }

  async unfollowUser(username) {
    try {
      await this.page.goto(`https://x.com/${username}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.delay(2000);

      // Find and click the Following button (which will show unfollow option)
      const unfollowed = await this.page.evaluate(() => {
        // Look for the "Following" button
        const buttons = Array.from(document.querySelectorAll('[role="button"]'));
        const followingBtn = buttons.find(b => {
          const text = b.textContent || '';
          return text.includes('Following') && !text.includes('Followers');
        });

        if (followingBtn) {
          followingBtn.click();
          return true;
        }
        return false;
      });

      if (!unfollowed) {
        Logger.warning(`Could not find Following button for @${username}`);
        return false;
      }

      await this.delay(1000);

      // Confirm unfollow in the dialog
      await this.page.evaluate(() => {
        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) confirmBtn.click();
      });

      await this.delay(1000);
      return true;
    } catch (error) {
      Logger.error(`Failed to unfollow @${username}: ${error.message}`);
      return false;
    }
  }

  async runSmartUnfollow(dryRun = false) {
    Logger.info('='.repeat(60));
    Logger.info('🧠 SMART UNFOLLOW - Starting Session');
    Logger.info(`   Grace Period: ${this.config.gracePeriodDays} days`);
    Logger.info(`   Max Unfollows: ${this.config.maxUnfollowsPerSession}`);
    Logger.info(`   Dry Run: ${dryRun ? 'YES' : 'NO'}`);
    Logger.info('='.repeat(60));

    await this.initialize();

    try {
      await this.login();

      // Get current followers and following
      const followers = await this.getFollowers();
      const following = await this.getFollowing();

      // Find non-followers
      const nonFollowers = [];
      for (const [username, userData] of following) {
        if (!followers.has(username)) {
          nonFollowers.push({ username, ...userData });
        }
      }

      Logger.info(`Found ${nonFollowers.length} non-followers out of ${following.size} following`);

      // Get expired entries from our log
      const expiredFromLog = this.followLog.getExpiredNonFollowers(this.config.gracePeriodDays);
      Logger.info(`Found ${expiredFromLog.length} users past grace period in follow log`);

      // Cross-reference: only unfollow if they're in our log AND still non-followers
      const toUnfollow = [];
      for (const entry of expiredFromLog) {
        const nonFollower = nonFollowers.find(nf => nf.username === entry.username);
        if (nonFollower) {
          // Check exclusions
          if (this.config.excludeUsernames.includes(entry.username)) {
            Logger.warning(`Skipping @${entry.username} (in exclude list)`);
            continue;
          }
          if (this.config.excludeVerified && nonFollower.verified) {
            Logger.warning(`Skipping @${entry.username} (verified account)`);
            continue;
          }

          toUnfollow.push({
            ...entry,
            verified: nonFollower.verified,
          });
        }
      }

      Logger.info('='.repeat(60));
      Logger.info(`📋 UNFOLLOW CANDIDATES: ${toUnfollow.length}`);
      Logger.info('='.repeat(60));

      if (toUnfollow.length === 0) {
        Logger.success('No users to unfollow! Everyone is either:');
        Logger.info('  - Following you back');
        Logger.info('  - Still within grace period');
        Logger.info('  - In your exclude list');
        return;
      }

      // Limit to max per session
      const batch = toUnfollow.slice(0, this.config.maxUnfollowsPerSession);
      
      Logger.info(`Processing ${batch.length} users (limited to ${this.config.maxUnfollowsPerSession} per session)`);
      Logger.info('');

      for (const user of batch) {
        Logger.info(`@${user.username} - followed ${user.daysSinceFollow} days ago`);
      }

      Logger.info('');

      if (dryRun) {
        Logger.dry('='.repeat(60));
        Logger.dry('DRY RUN COMPLETE - No actual unfollows performed');
        Logger.dry(`Would have unfollowed ${batch.length} users`);
        Logger.dry('='.repeat(60));
        
        this.unfollowLog.logSession(batch.map(u => u.username), true);
        return;
      }

      // Perform actual unfollows
      Logger.action('Starting unfollow process...');
      let successCount = 0;

      for (let i = 0; i < batch.length; i++) {
        const user = batch[i];
        Logger.action(`[${i + 1}/${batch.length}] Unfollowing @${user.username}...`);

        const success = await this.unfollowUser(user.username);
        
        if (success) {
          successCount++;
          this.sessionUnfollowed.push(user.username);
          this.followLog.markUnfollowed(user.username, 'smart-unfollow');
          Logger.success(`Unfollowed @${user.username}`);
        } else {
          Logger.error(`Failed to unfollow @${user.username}`);
        }

        // Rate limiting
        if (i < batch.length - 1) {
          Logger.info(`Waiting ${this.config.delayBetweenActions / 1000}s before next action...`);
          await this.delay(this.config.delayBetweenActions);
        }
      }

      // Save logs
      this.followLog.save();
      this.unfollowLog.logSession(this.sessionUnfollowed, false);

      // Summary
      Logger.info('='.repeat(60));
      Logger.success('SESSION COMPLETE');
      Logger.info(`   Attempted: ${batch.length}`);
      Logger.info(`   Successful: ${successCount}`);
      Logger.info(`   Failed: ${batch.length - successCount}`);
      Logger.info('='.repeat(60));

    } catch (error) {
      Logger.error(`Session error: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async logNewFollow(username) {
    const added = this.followLog.addFollow(username);
    if (added) {
      this.followLog.save();
    }
    
    const stats = this.followLog.getStats();
    Logger.info(`Follow log stats: ${stats.following} following, ${stats.unfollowed} unfollowed`);
  }

  async showStats() {
    const stats = this.followLog.getStats();
    const expired = this.followLog.getExpiredNonFollowers(this.config.gracePeriodDays);

    Logger.info('='.repeat(60));
    Logger.info('📊 SMART UNFOLLOW STATISTICS');
    Logger.info('='.repeat(60));
    Logger.info(`Total logged follows: ${stats.total}`);
    Logger.info(`Currently following: ${stats.following}`);
    Logger.info(`Unfollowed: ${stats.unfollowed}`);
    Logger.info(`Past grace period: ${expired.length}`);
    Logger.info(`Grace period: ${this.config.gracePeriodDays} days`);
    Logger.info('='.repeat(60));

    if (expired.length > 0) {
      Logger.info('Users past grace period:');
      expired.slice(0, 10).forEach(u => {
        Logger.info(`  @${u.username} - ${u.daysSinceFollow} days ago`);
      });
      if (expired.length > 10) {
        Logger.info(`  ... and ${expired.length - 10} more`);
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('Browser closed');
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const logFollow = args.includes('--log-follow');
  const showStats = args.includes('--stats');
  const username = args.find(a => !a.startsWith('--'));

  const unfollower = new SmartUnfollower(CONFIG);

  try {
    if (showStats) {
      await unfollower.showStats();
    } else if (logFollow && username) {
      await unfollower.logNewFollow(username);
    } else if (logFollow) {
      Logger.error('Usage: node smart-unfollow.js --log-follow <username>');
      process.exit(1);
    } else {
      await unfollower.runSmartUnfollow(dryRun);
    }
  } catch (error) {
    Logger.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
```

### Usage

```bash
# Install dependencies
npm install

# Run dry-run first to see what would be unfollowed
npm run dry-run

# Run actual unfollow
npm start

# Log a new follow (when you follow someone)
node smart-unfollow.js --log-follow username123

# View statistics
node smart-unfollow.js --stats
```

### Sample Output

```
[2026-01-01T12:00:00.000Z] ℹ️  ============================================================
[2026-01-01T12:00:00.000Z] ℹ️  🧠 SMART UNFOLLOW - Starting Session
[2026-01-01T12:00:00.000Z] ℹ️     Grace Period: 3 days
[2026-01-01T12:00:00.000Z] ℹ️     Max Unfollows: 50
[2026-01-01T12:00:00.000Z] ℹ️     Dry Run: NO
[2026-01-01T12:00:00.000Z] ℹ️  ============================================================
[2026-01-01T12:00:01.000Z] ✅ Browser initialized
[2026-01-01T12:00:05.000Z] ✅ Login successful
[2026-01-01T12:00:30.000Z] ✅ Total followers found: 1,523
[2026-01-01T12:00:55.000Z] ✅ Total following found: 892
[2026-01-01T12:00:55.000Z] ℹ️  Found 156 non-followers out of 892 following
[2026-01-01T12:00:55.000Z] ℹ️  Found 23 users past grace period in follow log
[2026-01-01T12:00:56.000Z] 🔄 [1/23] Unfollowing @inactive_user...
[2026-01-01T12:00:58.000Z] ✅ Unfollowed @inactive_user
...
```

---

## ⏰ Why Grace Period Matters

### The Problem with Instant Unfollowing

When you follow someone, they might not see your follow immediately:

- They could be offline or busy
- They might have notifications turned off
- They could be in a different timezone
- They might check Twitter/X only weekly
- Your follow could get lost in a sea of notifications

### The Grace Period Solution

A grace period (typically 3-7 days) gives people fair time to:

1. **See your follow notification** - Not everyone checks social media daily
2. **Check out your profile** - They need time to review your content
3. **Make a decision** - Following back isn't always instant
4. **Actually follow back** - Technical issues happen

### Recommended Grace Periods

| Audience Type | Recommended Grace Period |
|---------------|--------------------------|
| Active users | 3 days |
| General audience | 5-7 days |
| Business/Professional | 7-14 days |
| Celebrities/Influencers | Never (don't expect follow-back) |

### Best Practices

1. **Start with 7 days** - This is a fair window for most users
2. **Track your metrics** - See what grace period works for your audience
3. **Adjust based on results** - If many people follow back on day 5-7, extend it
4. **Consider time zones** - International audiences may need more time
5. **Quality over quantity** - Don't rush the unfollow process

---

## 🌐 Website Alternative

Don't want to run code? Use the web dashboard:

### [xactions.app](https://xactions.app)

The xactions.app dashboard provides:

- **Visual Smart Unfollow** - Same functionality with a beautiful UI
- **Follow Tracking** - Automatic logging of when you follow users
- **Grace Period Settings** - Customize your waiting period
- **Exclude Lists** - Protect important accounts
- **Scheduling** - Set up automated smart unfollow sessions
- **Analytics** - Track your follow/unfollow ratio over time
- **No Code Required** - Just connect and configure

### Getting Started with xactions.app

1. Visit [xactions.app](https://xactions.app)
2. Connect your X account
3. Navigate to **Tools → Smart Unfollow**
4. Configure your grace period and exclusions
5. Review candidates and start unfollowing

---

## 🔒 Safety & Best Practices

1. **Always use dry-run first** - Preview before taking action
2. **Set reasonable limits** - Don't unfollow too many at once
3. **Maintain your follow log** - The system is only as good as your data
4. **Exclude important accounts** - Protect business relationships
5. **Respect rate limits** - Don't get your account restricted
6. **Regular backups** - Keep copies of your follow_log.json

---

## 📚 Related Documentation

- [Unfollow Non-Followers](./unfollow-non-followers.md) - Simple non-follower removal
- [Unfollow Everyone](./unfollow-everyone.md) - Mass unfollow tool
- [Followers Scraping](./followers-scraping.md) - Get your followers list
- [Following Scraping](./following-scraping.md) - Get your following list

---

<div align="center">

**Built with ❤️ by [@nichxbt](https://x.com/nichxbt)**

[Report Bug](https://github.com/nichxbt/xactions/issues) · [Request Feature](https://github.com/nichxbt/xactions/issues)

</div>
