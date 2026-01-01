# 🎉 New Follower Alerts

Get notified when you gain new followers on X (Twitter).

---

## 📋 What It Does

This feature helps you track and celebrate your new followers by:

1. **Taking snapshots** - Saves your current followers list with timestamps
2. **Detecting new followers** - Shows who started following you since last check
3. **Tracking join dates** - Records when each follower was first detected
4. **Persistent storage** - Data survives browser restarts (localStorage/JSON files)
5. **Optional notifications** - Console alerts, file logs, or custom integrations

**Use cases:**
- Welcome new followers with personalized messages
- Track growth after viral tweets or campaigns
- Identify valuable new followers (verified, high-follower accounts)
- Monitor audience growth over time
- Build engagement by responding to new followers quickly
- Celebrate milestone followers (#100, #1000, etc.)

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Quick checks from your browser, no setup needed

**Steps:**
1. Go to `x.com/YOUR_USERNAME/followers`
2. Open browser console (F12 → Console tab)
3. Paste the script below and press Enter
4. Run again later to see NEW followers!

```javascript
// ============================================
// XActions - New Follower Alerts (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/YOUR_USERNAME/followers
// Open console (F12), paste this
// ============================================

(async () => {
  // Configuration
  const STORAGE_KEY = 'xactions_follower_alerts';
  const SCROLL_DELAY = 1500;         // Time between scrolls (ms)
  const MAX_SCROLL_RETRIES = 10;     // Stop if no new users found
  
  console.log('🎉 XActions - New Follower Alerts');
  console.log('═'.repeat(50));
  
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Verify we're on the followers page
  const pathMatch = window.location.pathname.match(/^\/([^/]+)\/followers/);
  if (!pathMatch) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: x.com/YOUR_USERNAME/followers');
    return;
  }
  
  const username = pathMatch[1].toLowerCase();
  console.log(`📍 Monitoring: @${username}`);
  console.log('');
  
  // ========================================
  // Step 1: Scrape current followers
  // ========================================
  console.log('📜 Step 1: Scanning your followers list...');
  
  const followers = new Map();
  let scrollRetries = 0;
  
  while (scrollRetries < MAX_SCROLL_RETRIES) {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const prevSize = followers.size;
    
    cells.forEach(cell => {
      try {
        // Get username from link
        const link = cell.querySelector('a[href^="/"]');
        const href = link?.getAttribute('href') || '';
        const handle = href.split('/')[1]?.toLowerCase();
        
        if (!handle || handle.includes('?') || handle.includes('/')) return;
        if (handle === username) return; // Skip self
        
        // Get display name
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const displayName = nameEl?.textContent?.trim() || handle;
        
        // Get bio
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || null;
        
        // Check verified status
        const verified = !!cell.querySelector('svg[aria-label*="Verified"]');
        
        // Get avatar
        const avatarEl = cell.querySelector('img[src*="profile_images"]');
        const avatar = avatarEl?.src || null;
        
        if (!followers.has(handle)) {
          followers.set(handle, {
            username: handle,
            displayName,
            bio,
            verified,
            avatar,
            scrapedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        // Skip malformed cells
      }
    });
    
    console.log(`   📊 Found ${followers.size} followers so far...`);
    
    // Check if we're stuck
    if (followers.size === prevSize) {
      scrollRetries++;
    } else {
      scrollRetries = 0;
    }
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  const currentFollowers = Array.from(followers.values());
  console.log('');
  console.log(`✅ Scan complete! Found ${currentFollowers.length} followers`);
  
  // ========================================
  // Step 2: Load previous snapshot
  // ========================================
  console.log('');
  console.log('📂 Step 2: Checking for previous snapshot...');
  
  let previousData = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      previousData = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('   ⚠️ Could not load previous data:', e.message);
  }
  
  // ========================================
  // Step 3: Compare and show NEW followers
  // ========================================
  let newFollowers = [];
  let followerHistory = {};
  
  if (previousData && previousData.username === username) {
    console.log(`   📸 Found snapshot from ${new Date(previousData.timestamp).toLocaleString()}`);
    console.log(`   📊 Previous count: ${previousData.count}`);
    console.log(`   📊 Current count: ${currentFollowers.length}`);
    console.log('');
    console.log('🔎 Step 3: Finding NEW followers...');
    
    // Load existing history
    followerHistory = previousData.history || {};
    
    // Create set of previous usernames
    const prevUsernames = new Set(Object.keys(previousData.followers));
    
    // Find new followers (in current, not in previous)
    newFollowers = currentFollowers.filter(f => !prevUsernames.has(f.username));
    
    // Add new followers to history with timestamp
    const now = new Date().toISOString();
    newFollowers.forEach(f => {
      if (!followerHistory[f.username]) {
        followerHistory[f.username] = {
          firstSeen: now,
          displayName: f.displayName,
          verified: f.verified
        };
      }
    });
    
    // Also track existing followers in history if not present
    currentFollowers.forEach(f => {
      if (!followerHistory[f.username]) {
        followerHistory[f.username] = {
          firstSeen: previousData.timestamp, // They were there before
          displayName: f.displayName,
          verified: f.verified
        };
      }
    });
    
    // Display NEW followers
    console.log('');
    if (newFollowers.length > 0) {
      console.log(`🎉 ${newFollowers.length} NEW FOLLOWERS since last check!`);
      console.log('─'.repeat(50));
      
      newFollowers.forEach((u, i) => {
        const verified = u.verified ? ' ✓' : '';
        console.log(`   ${i + 1}. @${u.username}${verified} — ${u.displayName}`);
        if (u.bio) {
          const shortBio = u.bio.length > 60 ? u.bio.slice(0, 60) + '...' : u.bio;
          console.log(`      └─ "${shortBio}"`);
        }
        console.log(`      └─ https://x.com/${u.username}`);
      });
      
      // Welcome message templates
      console.log('');
      console.log('📝 Quick welcome templates (copy & customize):');
      console.log('─'.repeat(50));
      newFollowers.slice(0, 5).forEach(f => {
        console.log(`Hey @${f.username}, thanks for the follow! 🙏 Welcome aboard!`);
      });
      if (newFollowers.length > 5) {
        console.log(`... and ${newFollowers.length - 5} more new followers!`);
      }
      console.log('─'.repeat(50));
      
      // Download new followers list
      const newFollowersList = newFollowers.map(u => ({
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        verified: u.verified,
        profileUrl: `https://x.com/${u.username}`,
        followedAt: new Date().toISOString()
      }));
      
      const json = JSON.stringify(newFollowersList, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `new-followers-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      console.log('');
      console.log('📥 Downloaded new followers list!');
      
      // Copy usernames to clipboard
      const usernames = newFollowers.map(f => `@${f.username}`).join(' ');
      await navigator.clipboard.writeText(usernames);
      console.log('📋 Copied new follower usernames to clipboard!');
      
    } else {
      console.log('📭 No new followers since last check.');
      console.log('   Keep creating great content! 🚀');
    }
    
    // Show growth stats
    console.log('');
    console.log('📈 GROWTH SUMMARY:');
    console.log('─'.repeat(50));
    const netChange = currentFollowers.length - previousData.count;
    const changeIcon = netChange > 0 ? '📈' : netChange < 0 ? '📉' : '➡️';
    const changePrefix = netChange >= 0 ? '+' : '';
    console.log(`   ${changeIcon} Net change: ${changePrefix}${netChange} followers`);
    console.log(`   🆕 New followers: +${newFollowers.length}`);
    console.log(`   📊 Total: ${previousData.count} → ${currentFollowers.length}`);
    
    // Check for unfollowers too (lost followers)
    const currUsernames = new Set(currentFollowers.map(f => f.username));
    const unfollowers = Object.keys(previousData.followers).filter(u => !currUsernames.has(u));
    if (unfollowers.length > 0) {
      console.log(`   👋 Lost: -${unfollowers.length}`);
    }
    
  } else {
    console.log('   📸 No previous snapshot found (first run)');
    console.log('   💡 Run this script again later to detect new followers!');
    
    // Initialize history for all current followers
    const now = new Date().toISOString();
    currentFollowers.forEach(f => {
      followerHistory[f.username] = {
        firstSeen: now,
        displayName: f.displayName,
        verified: f.verified
      };
    });
  }
  
  // ========================================
  // Step 4: Save updated snapshot
  // ========================================
  console.log('');
  console.log('💾 Step 4: Saving updated snapshot...');
  
  const snapshot = {
    username,
    followers: Object.fromEntries(
      currentFollowers.map(f => [f.username, f])
    ),
    history: followerHistory,
    count: currentFollowers.length,
    timestamp: new Date().toISOString(),
    newFollowersCount: newFollowers.length
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  console.log(`   ✅ Saved ${currentFollowers.length} followers`);
  console.log(`   📅 Timestamp: ${new Date().toLocaleString()}`);
  console.log(`   📚 Tracking history for ${Object.keys(followerHistory).length} users`);
  
  // Final message
  console.log('');
  console.log('═'.repeat(50));
  console.log('🔄 Run this script again to detect new followers!');
  console.log('💡 Tip: Run after posting tweets to see who follows you');
  console.log('═'.repeat(50));
  
  // Return data for further use
  return {
    username,
    currentCount: currentFollowers.length,
    newFollowers,
    totalHistoryTracked: Object.keys(followerHistory).length,
    snapshot
  };
})();
```

**What happens:**
1. Script scrolls through your followers list
2. Collects all follower data (username, display name, bio, verified status)
3. Compares with previously saved snapshot
4. Highlights NEW followers since last check
5. Tracks history of when each follower was first seen
6. Downloads JSON file of new followers
7. Copies usernames to clipboard for easy engagement

**Output example:**
```
🎉 XActions - New Follower Alerts
══════════════════════════════════════════════════
📍 Monitoring: @nichxbt

📜 Step 1: Scanning your followers list...
   📊 Found 156 followers so far...
   📊 Found 312 followers so far...
   📊 Found 489 followers so far...

✅ Scan complete! Found 489 followers

📂 Step 2: Checking for previous snapshot...
   📸 Found snapshot from 12/31/2025, 3:45:00 PM
   📊 Previous count: 482
   📊 Current count: 489

🔎 Step 3: Finding NEW followers...

🎉 7 NEW FOLLOWERS since last check!
──────────────────────────────────────────────────
   1. @crypto_whale ✓ — Crypto Whale 🐋
      └─ "Building the future of DeFi | 500K+ followers"
      └─ https://x.com/crypto_whale
   2. @tech_enthusiast — Tech Enthusiast
      └─ "Full-stack dev | Open source contributor"
      └─ https://x.com/tech_enthusiast
   3. @design_guru — Design Guru
      └─ https://x.com/design_guru
   ...

📝 Quick welcome templates (copy & customize):
──────────────────────────────────────────────────
Hey @crypto_whale, thanks for the follow! 🙏 Welcome aboard!
Hey @tech_enthusiast, thanks for the follow! 🙏 Welcome aboard!
Hey @design_guru, thanks for the follow! 🙏 Welcome aboard!
... and 4 more new followers!
──────────────────────────────────────────────────

📥 Downloaded new followers list!
📋 Copied new follower usernames to clipboard!

📈 GROWTH SUMMARY:
──────────────────────────────────────────────────
   📈 Net change: +7 followers
   🆕 New followers: +7
   📊 Total: 482 → 489

💾 Step 4: Saving updated snapshot...
   ✅ Saved 489 followers
   📅 Timestamp: 1/1/2026, 10:30:00 AM
   📚 Tracking history for 512 users

══════════════════════════════════════════════════
🔄 Run this script again to detect new followers!
💡 Tip: Run after posting tweets to see who follows you
══════════════════════════════════════════════════
```

---

## 🖥️ Example 2: Node.js with Puppeteer (Production)

**Best for:** Automated scheduled checks, historical tracking, notifications

**Features:**
- Runs on a schedule (cron, PM2, Task Scheduler)
- Saves detailed history with timestamps
- Optional notifications (console, file, webhook)
- Tracks exactly when each follower joined
- Export reports in JSON format
- Compare any two snapshots

### Setup

```bash
# Create project folder
mkdir new-follower-alerts && cd new-follower-alerts

# Initialize and install dependencies
npm init -y
npm install puppeteer
```

### Main Script: `new-follower-alerts.js`

```javascript
// ============================================
// XActions - New Follower Alerts (Node.js + Puppeteer)
// Author: nich (@nichxbt)
// 
// Usage:
//   node new-follower-alerts.js check <username>
//   node new-follower-alerts.js scrape <username>
//   node new-follower-alerts.js history <username>
//   node new-follower-alerts.js report <username>
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ============================================
// Configuration
// ============================================
const CONFIG = {
  headless: true,                    // Set to false to see browser
  scrollDelay: 2000,                 // Time between scrolls (ms)
  maxRetries: 15,                    // Max scroll retries before stopping
  dataDir: './data',                 // Where to save data files
  snapshotDir: './data/snapshots',   // Snapshot files
  historyFile: './data/history.json', // Follower history
  logDir: './data/logs',             // Log files
  userDataDir: './browser-data',     // Persistent browser session
  viewport: { width: 1280, height: 800 },
  
  // Notification settings
  notifications: {
    console: true,                   // Always show in console
    file: true,                      // Save to log file
    webhook: null                    // Optional: webhook URL for Slack/Discord
  }
};

// ============================================
// Initialize directories
// ============================================
[CONFIG.dataDir, CONFIG.snapshotDir, CONFIG.logDir, CONFIG.userDataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================
// Utility Functions
// ============================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const getDateString = () => new Date().toISOString().split('T')[0];

const getTimestamp = () => new Date().toISOString();

const log = (message, type = 'info') => {
  const timestamp = new Date().toLocaleString();
  const prefix = {
    info: '📌',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    celebration: '🎉'
  }[type] || '📌';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
};

// ============================================
// History Management
// ============================================

function loadHistory() {
  try {
    if (fs.existsSync(CONFIG.historyFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.historyFile, 'utf-8'));
    }
  } catch (e) {
    log(`Could not load history: ${e.message}`, 'warning');
  }
  return {};
}

function saveHistory(history) {
  fs.writeFileSync(CONFIG.historyFile, JSON.stringify(history, null, 2));
}

function updateHistory(username, currentFollowers, previousFollowers = {}) {
  const history = loadHistory();
  const now = getTimestamp();
  
  if (!history[username]) {
    history[username] = {
      followers: {},
      events: []
    };
  }
  
  const userHistory = history[username];
  const newFollowers = [];
  const lostFollowers = [];
  
  // Find new followers
  currentFollowers.forEach(f => {
    if (!userHistory.followers[f.username]) {
      // New follower!
      userHistory.followers[f.username] = {
        firstSeen: now,
        displayName: f.displayName,
        bio: f.bio,
        verified: f.verified,
        active: true
      };
      newFollowers.push(f);
      
      // Log event
      userHistory.events.push({
        type: 'new_follower',
        username: f.username,
        displayName: f.displayName,
        verified: f.verified,
        timestamp: now
      });
    } else {
      // Existing follower - mark as active
      userHistory.followers[f.username].active = true;
      userHistory.followers[f.username].lastSeen = now;
    }
  });
  
  // Find lost followers
  const currentUsernames = new Set(currentFollowers.map(f => f.username));
  Object.keys(previousFollowers).forEach(username => {
    if (!currentUsernames.has(username) && userHistory.followers[username]?.active) {
      userHistory.followers[username].active = false;
      userHistory.followers[username].unfollowedAt = now;
      lostFollowers.push(previousFollowers[username]);
      
      userHistory.events.push({
        type: 'unfollowed',
        username,
        timestamp: now
      });
    }
  });
  
  // Update stats
  userHistory.lastChecked = now;
  userHistory.totalFollowers = currentFollowers.length;
  
  saveHistory(history);
  
  return { newFollowers, lostFollowers, history: userHistory };
}

// ============================================
// Notification System
// ============================================

async function sendNotifications(username, newFollowers, totalCount) {
  const { notifications } = CONFIG;
  
  // Console notification (always)
  if (notifications.console && newFollowers.length > 0) {
    console.log('');
    console.log('🎉 NEW FOLLOWER ALERT! 🎉');
    console.log('═'.repeat(50));
    console.log(`📍 Account: @${username}`);
    console.log(`🆕 New followers: ${newFollowers.length}`);
    console.log(`📊 Total followers: ${totalCount}`);
    console.log('');
    console.log('New followers:');
    newFollowers.forEach((f, i) => {
      const verified = f.verified ? ' ✓' : '';
      console.log(`   ${i + 1}. @${f.username}${verified} — ${f.displayName}`);
    });
    console.log('═'.repeat(50));
  }
  
  // File notification
  if (notifications.file) {
    const logEntry = {
      timestamp: getTimestamp(),
      username,
      newFollowers: newFollowers.map(f => ({
        username: f.username,
        displayName: f.displayName,
        verified: f.verified
      })),
      totalCount
    };
    
    const logFile = path.join(CONFIG.logDir, `alerts-${getDateString()}.json`);
    let logs = [];
    
    if (fs.existsSync(logFile)) {
      try {
        logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      } catch (e) {
        logs = [];
      }
    }
    
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    log(`Alert logged to ${logFile}`, 'info');
  }
  
  // Webhook notification (Slack, Discord, etc.)
  if (notifications.webhook && newFollowers.length > 0) {
    try {
      const message = {
        text: `🎉 New follower alert for @${username}!`,
        attachments: [{
          color: '#1DA1F2',
          fields: [
            { title: 'New Followers', value: newFollowers.length.toString(), short: true },
            { title: 'Total Followers', value: totalCount.toString(), short: true },
            { 
              title: 'New Accounts', 
              value: newFollowers.map(f => `@${f.username}`).join(', ')
            }
          ]
        }]
      };
      
      await fetch(notifications.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      log('Webhook notification sent!', 'success');
    } catch (e) {
      log(`Webhook failed: ${e.message}`, 'error');
    }
  }
}

// ============================================
// Browser Functions
// ============================================

async function launchBrowser() {
  return await puppeteer.launch({
    headless: CONFIG.headless,
    userDataDir: CONFIG.userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });
}

async function checkLogin(page) {
  await page.goto('https://x.com/home', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  return await page.evaluate(() => {
    return !!document.querySelector('[data-testid="SideNav_NewTweet_Button"]') ||
           !!document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
  });
}

async function manualLogin() {
  console.log('\n🔐 Login Required');
  console.log('═'.repeat(50));
  console.log('1. A browser window will open');
  console.log('2. Log in to your X/Twitter account');
  console.log('3. Press Enter here when done');
  console.log('═'.repeat(50));
  
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: CONFIG.userDataDir,
    args: ['--no-sandbox']
  });
  
  const loginPage = await browser.newPage();
  await loginPage.goto('https://x.com/login', { waitUntil: 'networkidle2' });
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  console.log('✅ Login saved! You can now run in headless mode.\n');
}

// ============================================
// Scraping Functions
// ============================================

async function scrapeFollowers(username) {
  log(`Scraping followers for @${username}...`);
  
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);
  
  try {
    // Check login
    const isLoggedIn = await checkLogin(page);
    if (!isLoggedIn) {
      await browser.close();
      log('Not logged in to X/Twitter', 'error');
      await manualLogin();
      return await scrapeFollowers(username);
    }
    
    log('Logged in to X/Twitter', 'success');
    
    // Navigate to followers page
    log(`Navigating to @${username}/followers...`);
    await page.goto(`https://x.com/${username}/followers`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await sleep(3000);
    
    // Check for errors
    const pageError = await page.evaluate(() => {
      return document.body.innerText.includes("This account doesn't exist") ||
             document.body.innerText.includes("Account suspended");
    });
    
    if (pageError) {
      throw new Error(`Account @${username} not found or suspended`);
    }
    
    // Scrape followers
    log('Scanning followers list...');
    
    const followers = new Map();
    let retries = 0;
    let lastHeight = 0;
    
    while (retries < CONFIG.maxRetries) {
      const newFollowers = await page.evaluate(() => {
        const users = [];
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        
        cells.forEach(cell => {
          try {
            const link = cell.querySelector('a[href^="/"]');
            const href = link?.getAttribute('href') || '';
            const username = href.split('/')[1]?.toLowerCase();
            
            if (!username || username.includes('?') || username.includes('/')) return;
            
            const nameEl = cell.querySelector('[dir="ltr"] > span');
            const displayName = nameEl?.textContent?.trim() || username;
            
            const bioEl = cell.querySelector('[data-testid="UserDescription"]');
            const bio = bioEl?.textContent?.trim() || null;
            
            const verified = !!cell.querySelector('svg[aria-label*="Verified"]');
            
            users.push({ username, displayName, bio, verified });
          } catch (e) {}
        });
        
        return users;
      });
      
      const prevSize = followers.size;
      newFollowers.forEach(f => {
        if (!followers.has(f.username) && f.username !== username.toLowerCase()) {
          followers.set(f.username, f);
        }
      });
      
      log(`   Found ${followers.size} followers...`);
      
      if (followers.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }
      
      const currentHeight = await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        return document.body.scrollHeight;
      });
      
      if (currentHeight === lastHeight) retries++;
      lastHeight = currentHeight;
      
      await sleep(CONFIG.scrollDelay);
    }
    
    const followersList = Array.from(followers.values());
    log(`Scraping complete! Found ${followersList.length} followers`, 'success');
    
    // Save snapshot
    const snapshot = {
      username: username.toLowerCase(),
      followers: followersList,
      count: followersList.length,
      timestamp: getTimestamp(),
      date: getDateString()
    };
    
    const snapshotFile = path.join(CONFIG.snapshotDir, `${username.toLowerCase()}-${getDateString()}.json`);
    fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
    log(`Snapshot saved: ${snapshotFile}`, 'success');
    
    return snapshot;
    
  } finally {
    await browser.close();
  }
}

// ============================================
// Main Commands
// ============================================

async function checkNewFollowers(username) {
  console.log('\n🎉 XActions - New Follower Alerts');
  console.log('═'.repeat(50));
  log(`Checking for new followers of @${username}...`);
  
  // Load previous snapshot
  const files = fs.readdirSync(CONFIG.snapshotDir)
    .filter(f => f.startsWith(`${username.toLowerCase()}-`) && f.endsWith('.json'))
    .sort()
    .reverse();
  
  let previousSnapshot = null;
  let previousFollowers = {};
  
  if (files.length > 0) {
    const prevFile = path.join(CONFIG.snapshotDir, files[0]);
    previousSnapshot = JSON.parse(fs.readFileSync(prevFile, 'utf-8'));
    previousFollowers = Object.fromEntries(
      previousSnapshot.followers.map(f => [f.username, f])
    );
    log(`Found previous snapshot: ${files[0]} (${previousSnapshot.count} followers)`);
  } else {
    log('First time checking this account', 'info');
  }
  
  // Scrape current followers
  const currentSnapshot = await scrapeFollowers(username);
  
  // Update history and find changes
  const { newFollowers, lostFollowers, history } = updateHistory(
    username.toLowerCase(),
    currentSnapshot.followers,
    previousFollowers
  );
  
  // Display results
  console.log('');
  console.log('═'.repeat(50));
  
  if (newFollowers.length > 0) {
    console.log(`🎉 ${newFollowers.length} NEW FOLLOWERS!`);
    console.log('─'.repeat(50));
    newFollowers.forEach((f, i) => {
      const verified = f.verified ? ' ✓' : '';
      console.log(`   ${i + 1}. @${f.username}${verified} — ${f.displayName}`);
      if (f.bio) {
        const shortBio = f.bio.length > 50 ? f.bio.slice(0, 50) + '...' : f.bio;
        console.log(`      └─ "${shortBio}"`);
      }
    });
    
    // Send notifications
    await sendNotifications(username, newFollowers, currentSnapshot.count);
    
  } else {
    console.log('📭 No new followers since last check.');
  }
  
  if (lostFollowers.length > 0) {
    console.log('');
    console.log(`👋 ${lostFollowers.length} unfollowed:`);
    lostFollowers.forEach(f => console.log(`   • @${f.username}`));
  }
  
  // Summary
  console.log('');
  console.log('📈 SUMMARY:');
  console.log('─'.repeat(50));
  
  if (previousSnapshot) {
    const netChange = currentSnapshot.count - previousSnapshot.count;
    const changeIcon = netChange > 0 ? '📈' : netChange < 0 ? '📉' : '➡️';
    console.log(`   ${changeIcon} Net change: ${netChange >= 0 ? '+' : ''}${netChange}`);
    console.log(`   🆕 New: +${newFollowers.length}`);
    console.log(`   👋 Lost: -${lostFollowers.length}`);
  }
  
  console.log(`   📊 Total followers: ${currentSnapshot.count}`);
  console.log(`   📚 All-time tracked: ${Object.keys(history.followers).length}`);
  console.log('═'.repeat(50));
  
  return {
    username,
    newFollowers,
    lostFollowers,
    currentCount: currentSnapshot.count,
    previousCount: previousSnapshot?.count || 0
  };
}

function showHistory(username) {
  console.log('\n📚 Follower History');
  console.log('═'.repeat(50));
  
  const history = loadHistory();
  const userHistory = history[username.toLowerCase()];
  
  if (!userHistory) {
    console.log(`No history found for @${username}`);
    return;
  }
  
  console.log(`📍 Account: @${username}`);
  console.log(`📊 Total followers: ${userHistory.totalFollowers}`);
  console.log(`📅 Last checked: ${userHistory.lastChecked}`);
  console.log('');
  
  // Show recent events
  const recentEvents = userHistory.events.slice(-20).reverse();
  
  if (recentEvents.length > 0) {
    console.log('📜 Recent Activity:');
    console.log('─'.repeat(50));
    
    recentEvents.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString();
      const time = new Date(event.timestamp).toLocaleTimeString();
      
      if (event.type === 'new_follower') {
        const verified = event.verified ? ' ✓' : '';
        console.log(`   🆕 ${date} ${time} — @${event.username}${verified} followed`);
      } else if (event.type === 'unfollowed') {
        console.log(`   👋 ${date} ${time} — @${event.username} unfollowed`);
      }
    });
  }
  
  // Show all-time stats
  console.log('');
  console.log('📈 All-Time Stats:');
  console.log('─'.repeat(50));
  
  const allFollowers = Object.values(userHistory.followers);
  const activeFollowers = allFollowers.filter(f => f.active);
  const lostFollowers = allFollowers.filter(f => !f.active);
  const verifiedFollowers = allFollowers.filter(f => f.verified && f.active);
  
  console.log(`   ✅ Active followers: ${activeFollowers.length}`);
  console.log(`   👋 Past followers (unfollowed): ${lostFollowers.length}`);
  console.log(`   ✓ Verified followers: ${verifiedFollowers.length}`);
  console.log(`   📚 Total tracked: ${allFollowers.length}`);
}

function generateReport(username) {
  console.log('\n📊 Generating Report');
  console.log('═'.repeat(50));
  
  const history = loadHistory();
  const userHistory = history[username.toLowerCase()];
  
  if (!userHistory) {
    console.log(`No history found for @${username}`);
    return;
  }
  
  const report = {
    generatedAt: getTimestamp(),
    username,
    currentFollowers: userHistory.totalFollowers,
    lastChecked: userHistory.lastChecked,
    
    stats: {
      totalTracked: Object.keys(userHistory.followers).length,
      activeFollowers: Object.values(userHistory.followers).filter(f => f.active).length,
      lostFollowers: Object.values(userHistory.followers).filter(f => !f.active).length,
      verifiedFollowers: Object.values(userHistory.followers).filter(f => f.verified && f.active).length
    },
    
    recentActivity: userHistory.events.slice(-50),
    
    followers: Object.entries(userHistory.followers).map(([username, data]) => ({
      username,
      ...data
    }))
  };
  
  const reportFile = path.join(CONFIG.dataDir, `report-${username}-${getDateString()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  log(`Report saved: ${reportFile}`, 'success');
  
  // Also create a readable summary
  const summaryFile = path.join(CONFIG.dataDir, `report-${username}-${getDateString()}.txt`);
  const summary = `
New Follower Report for @${username}
Generated: ${new Date().toLocaleString()}
${'═'.repeat(50)}

CURRENT STATUS
  Total Followers: ${report.currentFollowers}
  Last Checked: ${new Date(report.lastChecked).toLocaleString()}

ALL-TIME STATS
  Total Tracked: ${report.stats.totalTracked}
  Active Followers: ${report.stats.activeFollowers}
  Lost Followers: ${report.stats.lostFollowers}
  Verified Followers: ${report.stats.verifiedFollowers}

RECENT NEW FOLLOWERS
${report.recentActivity
  .filter(e => e.type === 'new_follower')
  .slice(-10)
  .map(e => `  • @${e.username} — ${new Date(e.timestamp).toLocaleDateString()}`)
  .join('\n')}

RECENT UNFOLLOWERS
${report.recentActivity
  .filter(e => e.type === 'unfollowed')
  .slice(-10)
  .map(e => `  • @${e.username} — ${new Date(e.timestamp).toLocaleDateString()}`)
  .join('\n') || '  (none)'}
`.trim();
  
  fs.writeFileSync(summaryFile, summary);
  log(`Summary saved: ${summaryFile}`, 'success');
  
  console.log('\n' + summary);
}

// ============================================
// CLI Handler
// ============================================

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'check':
      if (!args[1]) {
        console.log('Usage: node new-follower-alerts.js check <username>');
        process.exit(1);
      }
      await checkNewFollowers(args[1].replace('@', ''));
      break;
      
    case 'scrape':
      if (!args[1]) {
        console.log('Usage: node new-follower-alerts.js scrape <username>');
        process.exit(1);
      }
      await scrapeFollowers(args[1].replace('@', ''));
      break;
      
    case 'history':
      if (!args[1]) {
        console.log('Usage: node new-follower-alerts.js history <username>');
        process.exit(1);
      }
      showHistory(args[1].replace('@', ''));
      break;
      
    case 'report':
      if (!args[1]) {
        console.log('Usage: node new-follower-alerts.js report <username>');
        process.exit(1);
      }
      generateReport(args[1].replace('@', ''));
      break;
      
    default:
      console.log('\n🎉 XActions - New Follower Alerts');
      console.log('═'.repeat(50));
      console.log('');
      console.log('Commands:');
      console.log('  check <username>     Check for new followers (main command)');
      console.log('  scrape <username>    Just scrape and save followers');
      console.log('  history <username>   Show follower history');
      console.log('  report <username>    Generate detailed report');
      console.log('');
      console.log('Examples:');
      console.log('  node new-follower-alerts.js check nichxbt');
      console.log('  node new-follower-alerts.js history nichxbt');
      console.log('  node new-follower-alerts.js report nichxbt');
  }
}

main().catch(console.error);
```

### Usage Examples

```bash
# First run - check for new followers (creates initial snapshot)
node new-follower-alerts.js check nichxbt

# Output:
# 🎉 XActions - New Follower Alerts
# ══════════════════════════════════════════════════
# 📌 [1/1/2026, 10:30:00 AM] Checking for new followers of @nichxbt...
# 📌 [1/1/2026, 10:30:01 AM] First time checking this account
# 📌 [1/1/2026, 10:30:02 AM] Logged in to X/Twitter
# 📌 [1/1/2026, 10:30:03 AM] Navigating to @nichxbt/followers...
# 📌 [1/1/2026, 10:30:05 AM] Scanning followers list...
#    Found 156 followers...
#    Found 312 followers...
#    Found 489 followers...
# ✅ [1/1/2026, 10:31:15 AM] Scraping complete! Found 489 followers
# ✅ [1/1/2026, 10:31:15 AM] Snapshot saved: ./data/snapshots/nichxbt-2026-01-01.json
# 
# ══════════════════════════════════════════════════
# 📭 No new followers since last check.
# 
# 📈 SUMMARY:
# ──────────────────────────────────────────────────
#    📊 Total followers: 489
#    📚 All-time tracked: 489
# ══════════════════════════════════════════════════
```

```bash
# Later runs - detect new followers
node new-follower-alerts.js check nichxbt

# Output when new followers found:
# 🎉 7 NEW FOLLOWERS!
# ──────────────────────────────────────────────────
#    1. @crypto_whale ✓ — Crypto Whale 🐋
#       └─ "Building the future of DeFi..."
#    2. @tech_enthusiast — Tech Enthusiast
#       └─ "Full-stack dev | Open source..."
#    ...
```

```bash
# View follower history
node new-follower-alerts.js history nichxbt
```

```bash
# Generate detailed report
node new-follower-alerts.js report nichxbt
```

---

## ⏰ Scheduling Tips

Run the script automatically to never miss a new follower!

### Linux/Mac (Cron)

```bash
# Edit crontab
crontab -e

# Check every 6 hours
0 */6 * * * cd /path/to/new-follower-alerts && node new-follower-alerts.js check nichxbt >> logs/cron.log 2>&1

# Check twice daily (9am and 9pm)
0 9,21 * * * cd /path/to/new-follower-alerts && node new-follower-alerts.js check nichxbt >> logs/cron.log 2>&1

# Check every hour (for active growth periods)
0 * * * * cd /path/to/new-follower-alerts && node new-follower-alerts.js check nichxbt >> logs/cron.log 2>&1
```

### Windows (Task Scheduler)

1. Open Task Scheduler (search "Task Scheduler" in Start menu)
2. Click **Create Basic Task...**
3. Name: "New Follower Alerts"
4. Trigger: **Daily** or **When I log on**
5. Action: **Start a program**
   - Program/script: `node`
   - Arguments: `new-follower-alerts.js check nichxbt`
   - Start in: `C:\path\to\new-follower-alerts`
6. Finish and test with **Run**

### Using PM2 (Node.js Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'new-follower-alerts',
    script: 'new-follower-alerts.js',
    args: 'check nichxbt',
    cron_restart: '0 */6 * * *',  // Every 6 hours
    autorestart: false,
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Start the scheduled job
pm2 start ecosystem.config.js

# Save PM2 configuration (survives reboots)
pm2 save
pm2 startup

# View logs
pm2 logs new-follower-alerts

# Monitor status
pm2 status
```

### Using Node-cron (In-script scheduling)

Add this to your script for continuous monitoring:

```javascript
// Add to the top of new-follower-alerts.js
const cron = require('node-cron');

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ Scheduled check running...');
  await checkNewFollowers('nichxbt');
});

console.log('🕐 Scheduler started. Checking every 6 hours.');
console.log('   Press Ctrl+C to stop.');
```

```bash
# Install node-cron
npm install node-cron

# Run the scheduler (keeps running)
node new-follower-alerts.js scheduler nichxbt
```

---

## 🌐 Website Alternative

Don't want to run scripts? Use **[xactions.app](https://xactions.app)** instead!

### Features:
- ✅ **No coding required** - Just sign in and enable
- ✅ **Real-time alerts** - Get notified instantly when someone follows
- ✅ **Email notifications** - New follower summaries in your inbox
- ✅ **Push notifications** - Browser/mobile alerts
- ✅ **Dashboard analytics** - Growth charts and trends
- ✅ **Follower insights** - See verified, influential, and quality followers
- ✅ **Welcome automation** - Auto-like or auto-reply to new followers
- ✅ **Historical data** - Track your growth over months/years
- ✅ **Multiple accounts** - Monitor all your X accounts in one place

### How It Works:
1. Visit [xactions.app](https://xactions.app)
2. Click **"Connect X Account"** (secure OAuth, no password needed)
3. Enable **"New Follower Alerts"** in your dashboard
4. Choose notification preferences (email, push, or both)
5. Get notified whenever someone follows you! 🎉

### Pricing:
- **Free tier:** Basic alerts, daily summary email
- **Pro tier:** Real-time alerts, detailed analytics, automation

---

## 💡 Pro Tips

1. **Check after tweeting** - New content often brings new followers
2. **Monitor engagement** - Replies and retweets attract followers
3. **Welcome new followers** - A quick "thanks for following!" builds community
4. **Track verified followers** - They're often influential and worth engaging
5. **Look for patterns** - Which tweets bring the most followers?
6. **Export regularly** - Keep backups of your follower data
7. **Set up webhooks** - Get alerts in Slack, Discord, or Telegram

---

## ⚠️ Rate Limits & Safety

- **Browser console:** Safe for up to ~2,000 followers per session
- **Puppeteer:** Can handle 10,000+ with proper delays
- **Check frequency:** Once every few hours is plenty; don't overdo it
- **Account safety:** These scripts only READ data, never post or follow

---

## 📚 Related Features

- [Detect Unfollowers](detect-unfollowers.md) - Track who unfollowed you
- [Followers Scraping](followers-scraping.md) - Export your complete followers list
- [Profile Scraping](profile-scraping.md) - Get detailed info on any profile

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))  
**Repository:** [github.com/nirholas/XActions](https://github.com/nirholas/XActions)
