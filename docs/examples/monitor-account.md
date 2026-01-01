# 🔭 Monitor Any Account

Track followers and following changes on **ANY public X (Twitter) account** — not just your own.

---

## 📋 What It Does

This powerful feature enables you to monitor follower/following activity on any public account:

1. **Monitor any public account** - Track @elonmusk, @naval, competitors, influencers
2. **Track both directions** - Monitor who follows them OR who they follow
3. **Detect changes over time** - See new followers and unfollowers
4. **Persistent snapshots** - Data survives browser restarts
5. **Automatic downloads** - Export change lists to files

**Use cases:**
- **Competitive analysis** - Track competitor follower growth and losses
- **Influencer monitoring** - Watch who influencers follow/unfollow
- **Industry tracking** - Monitor key accounts in your niche
- **Partnership research** - See who your potential partners engage with
- **Trend detection** - Spot emerging accounts getting follows from leaders
- **Due diligence** - Research accounts before collaborations

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Quick monitoring from your browser, no setup needed

**Steps:**
1. Go to `x.com/TARGET_USERNAME/followers` or `x.com/TARGET_USERNAME/following`
2. Open browser console (F12 → Console tab)
3. Paste the script below and press Enter
4. Run again later to detect changes!

```javascript
// ============================================
// XActions - Monitor Any Account (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/ANY_USERNAME/followers OR /following
// Open console (F12), paste this
// ============================================

(async () => {
  // Configuration
  const STORAGE_PREFIX = 'xactions_monitor_';
  const SCROLL_DELAY = 1500;          // Time between scrolls (ms)
  const MAX_SCROLL_RETRIES = 8;       // Stop if no new users found
  
  console.log('🔭 XActions - Monitor Any Account');
  console.log('===================================');
  
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Detect page type from URL
  const path = window.location.pathname;
  const isFollowersPage = path.includes('/followers');
  const isFollowingPage = path.includes('/following');
  
  if (!isFollowersPage && !isFollowingPage) {
    console.error('❌ Please navigate to a followers or following page!');
    console.log('');
    console.log('👉 Examples:');
    console.log('   https://x.com/elonmusk/followers');
    console.log('   https://x.com/naval/following');
    return;
  }
  
  // Extract target account and page type
  const targetUser = path.split('/')[1].toLowerCase();
  const pageType = isFollowersPage ? 'followers' : 'following';
  const storageKey = `${STORAGE_PREFIX}${targetUser}_${pageType}`;
  
  console.log(`📍 Target: @${targetUser}`);
  console.log(`📋 Monitoring: ${pageType}`);
  console.log('');
  
  // Step 1: Scrape current list
  console.log(`📜 Step 1: Scanning @${targetUser}'s ${pageType} list...`);
  
  const users = new Map();
  let scrollRetries = 0;
  
  while (scrollRetries < MAX_SCROLL_RETRIES) {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const prevSize = users.size;
    
    cells.forEach(cell => {
      try {
        // Get username from link
        const link = cell.querySelector('a[href^="/"]');
        const href = link?.getAttribute('href') || '';
        const handle = href.split('/')[1]?.toLowerCase();
        
        // Skip invalid entries
        if (!handle || handle.includes('?') || handle.includes('/')) return;
        if (handle === targetUser) return;
        
        // Get display name
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const displayName = nameEl?.textContent?.trim() || handle;
        
        // Get bio
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || null;
        
        // Check verified status
        const verified = !!cell.querySelector('svg[aria-label*="Verified"]');
        
        if (!users.has(handle)) {
          users.set(handle, {
            username: handle,
            displayName,
            bio,
            verified,
            scrapedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        // Skip malformed cells
      }
    });
    
    console.log(`   📊 Found ${users.size} accounts so far...`);
    
    // Check if we're stuck
    if (users.size === prevSize) {
      scrollRetries++;
    } else {
      scrollRetries = 0;
    }
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  const currentUsers = Array.from(users.values());
  const currentUsernames = currentUsers.map(u => u.username);
  
  console.log('');
  console.log(`✅ Scan complete! Found ${currentUsers.length} accounts`);
  
  // Step 2: Load previous snapshot
  console.log('');
  console.log('📂 Step 2: Checking for previous snapshot...');
  
  let previousData = null;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      previousData = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('   ⚠️ Could not load previous data:', e.message);
  }
  
  // Helper to download a list
  const downloadList = (list, filename) => {
    if (list.length === 0) return;
    const content = list.map(u => `@${u}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`   📥 Downloaded: ${filename}`);
  };
  
  // Step 3: Compare and show results
  if (previousData && previousData.target === targetUser && previousData.type === pageType) {
    const prevTimestamp = new Date(previousData.timestamp);
    const timeDiff = Date.now() - prevTimestamp.getTime();
    const hoursDiff = Math.round(timeDiff / (1000 * 60 * 60));
    
    console.log(`   📸 Found snapshot from ${prevTimestamp.toLocaleString()}`);
    console.log(`   ⏱️  Time since last check: ${hoursDiff} hours`);
    console.log(`   📊 Previous count: ${previousData.count}`);
    console.log(`   📊 Current count: ${currentUsers.length}`);
    console.log(`   📈 Net change: ${currentUsers.length - previousData.count > 0 ? '+' : ''}${currentUsers.length - previousData.count}`);
    console.log('');
    console.log('🔎 Step 3: Comparing snapshots...');
    
    // Create sets for comparison
    const prevUsernames = new Set(previousData.users.map(u => u.toLowerCase()));
    const currUsernames = new Set(currentUsernames.map(u => u.toLowerCase()));
    
    // Find changes
    const removed = previousData.users.filter(u => !currUsernames.has(u.toLowerCase()));
    const added = currentUsernames.filter(u => !prevUsernames.has(u.toLowerCase()));
    
    console.log('');
    
    // Show results based on page type
    if (pageType === 'followers') {
      // Monitoring who follows this account
      if (removed.length > 0) {
        console.log(`🚨 ${removed.length} ACCOUNTS UNFOLLOWED @${targetUser}:`);
        console.log('─'.repeat(40));
        removed.forEach((u, i) => {
          console.log(`   ${i + 1}. @${u} → https://x.com/${u}`);
        });
        console.log('');
        downloadList(removed, `${targetUser}-lost-followers-${Date.now()}.txt`);
      }
      
      if (added.length > 0) {
        console.log(`🎉 ${added.length} NEW FOLLOWERS FOR @${targetUser}:`);
        console.log('─'.repeat(40));
        added.forEach((u, i) => {
          console.log(`   ${i + 1}. @${u} → https://x.com/${u}`);
        });
        console.log('');
      }
    } else {
      // Monitoring who this account follows
      if (removed.length > 0) {
        console.log(`👋 @${targetUser} UNFOLLOWED ${removed.length} ACCOUNTS:`);
        console.log('─'.repeat(40));
        removed.forEach((u, i) => {
          console.log(`   ${i + 1}. @${u} → https://x.com/${u}`);
        });
        console.log('');
        downloadList(removed, `${targetUser}-unfollowed-${Date.now()}.txt`);
      }
      
      if (added.length > 0) {
        console.log(`➕ @${targetUser} STARTED FOLLOWING ${added.length} ACCOUNTS:`);
        console.log('─'.repeat(40));
        added.forEach((u, i) => {
          console.log(`   ${i + 1}. @${u} → https://x.com/${u}`);
        });
        console.log('');
      }
    }
    
    if (removed.length === 0 && added.length === 0) {
      console.log('✨ No changes detected since last check!');
      console.log('');
    }
    
  } else {
    console.log('   📸 First scan for this account! Saving baseline snapshot...');
    console.log('   💡 Run this script again later to detect changes.');
    console.log('');
  }
  
  // Step 4: Save new snapshot
  console.log('💾 Step 4: Saving snapshot...');
  
  const snapshotData = {
    target: targetUser,
    type: pageType,
    users: currentUsernames,
    fullData: currentUsers,
    count: currentUsers.length,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem(storageKey, JSON.stringify(snapshotData));
  
  console.log(`   ✅ Saved! Key: ${storageKey}`);
  console.log('');
  console.log('═'.repeat(50));
  console.log('📌 SUMMARY');
  console.log('═'.repeat(50));
  console.log(`   Target: @${targetUser}`);
  console.log(`   Type: ${pageType}`);
  console.log(`   Count: ${currentUsers.length}`);
  console.log(`   Saved: ${new Date().toLocaleString()}`);
  console.log('');
  console.log('💡 Tip: Run this script again later to detect changes!');
  console.log('💡 Tip: Check /followers AND /following for complete picture');
  console.log('');
  
  // Return data for further use
  return {
    target: targetUser,
    type: pageType,
    users: currentUsers,
    count: currentUsers.length
  };
})();
```

**What happens:**
1. Detects target account and page type from URL
2. Scrolls through the entire list to capture all accounts
3. Compares with previous snapshot (if exists)
4. Shows who unfollowed/followed with links
5. Downloads change lists automatically
6. Saves new snapshot for future comparisons

---

## 🖥️ Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Automated monitoring, scheduled jobs, competitor tracking

**Setup:**
```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

**Save as:** `monitor-account.js`

```javascript
// ============================================
// XActions - Monitor Any Account (Node.js)
// Author: nich (@nichxbt)
// 
// Usage:
//   node monitor-account.js <username> [type] [--auth-token=xxx]
//
// Examples:
//   node monitor-account.js elonmusk followers
//   node monitor-account.js naval following
//   node monitor-account.js competitor followers --auth-token=abc123
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

puppeteer.use(StealthPlugin());

// Configuration
const DATA_DIR = './monitor-data';
const SCROLL_DELAY = 1500;
const MAX_RETRIES = 10;

/**
 * Monitor followers or following for any public account
 */
async function monitorAccount(username, type = 'followers', options = {}) {
  const {
    authToken = null,
    headless = true,
    onProgress = null,
    limit = 10000,
  } = options;

  console.log('');
  console.log('🔭 XActions - Monitor Any Account');
  console.log('═'.repeat(50));
  console.log(`📍 Target: @${username}`);
  console.log(`📋 Type: ${type}`);
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  console.log('');

  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });

  try {
    const page = await browser.newPage();

    // Realistic browser settings
    await page.setViewport({
      width: 1280 + Math.floor(Math.random() * 100),
      height: 800 + Math.floor(Math.random() * 100),
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set auth cookie if provided (helps avoid rate limits)
    if (authToken) {
      await page.setCookie({
        name: 'auth_token',
        value: authToken,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
      console.log('🔐 Using authenticated session');
    }

    // Navigate to target page
    const url = `https://x.com/${username}/${type}`;
    console.log(`🌐 Navigating to: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Check if account exists and is public
    const pageContent = await page.content();
    if (pageContent.includes('This account doesn't exist') || 
        pageContent.includes("This account doesn't exist")) {
      throw new Error(`Account @${username} does not exist`);
    }
    if (pageContent.includes('These Tweets are protected')) {
      throw new Error(`Account @${username} is private - cannot access ${type}`);
    }

    // Wait for user cells to appear
    try {
      await page.waitForSelector('[data-testid="UserCell"]', { timeout: 10000 });
    } catch {
      console.log('⚠️  No accounts found (list may be empty or private)');
      return { users: [], changes: null };
    }

    // Small random delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    // Scrape users
    console.log('📜 Scanning list...');
    const users = new Map();
    let retries = 0;

    while (users.size < limit && retries < MAX_RETRIES) {
      // Extract users from page
      const pageUsers = await page.evaluate((targetUser) => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).map(cell => {
          try {
            const link = cell.querySelector('a[href^="/"]');
            const href = link?.getAttribute('href') || '';
            const username = href.split('/')[1]?.toLowerCase();

            if (!username || username.includes('?') || username.includes('/')) return null;
            if (username === targetUser.toLowerCase()) return null;

            const nameEl = cell.querySelector('[dir="ltr"] > span');
            const bioEl = cell.querySelector('[data-testid="UserDescription"]');
            const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');

            return {
              username,
              displayName: nameEl?.textContent?.trim() || null,
              bio: bioEl?.textContent?.trim() || null,
              verified: !!verifiedEl,
            };
          } catch {
            return null;
          }
        }).filter(Boolean);
      }, username);

      const prevSize = users.size;

      // Add to map (deduplicates)
      pageUsers.forEach(user => {
        if (!users.has(user.username)) {
          users.set(user.username, user);
        }
      });

      // Progress update
      if (onProgress) {
        onProgress({ count: users.size });
      } else {
        process.stdout.write(`\r   📊 Found ${users.size} accounts...`);
      }

      // Check if stuck
      if (users.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, SCROLL_DELAY + Math.random() * 500));
    }

    console.log('');
    console.log(`✅ Scan complete! Found ${users.size} accounts`);

    // Load previous snapshot
    const snapshotFile = path.join(DATA_DIR, `${username}-${type}.json`);
    let previousSnapshot = null;

    try {
      const data = await fs.readFile(snapshotFile, 'utf8');
      previousSnapshot = JSON.parse(data);
      console.log(`📂 Found previous snapshot from ${new Date(previousSnapshot.timestamp).toLocaleString()}`);
    } catch {
      console.log('📸 First scan! Creating baseline snapshot...');
    }

    // Compare with previous
    let changes = null;
    const currentUsernames = Array.from(users.keys());

    if (previousSnapshot) {
      const prevUsernames = new Set(previousSnapshot.users.map(u => u.toLowerCase()));
      const currUsernames = new Set(currentUsernames.map(u => u.toLowerCase()));

      const removed = previousSnapshot.users.filter(u => !currUsernames.has(u.toLowerCase()));
      const added = currentUsernames.filter(u => !prevUsernames.has(u.toLowerCase()));

      changes = { removed, added };

      console.log('');
      console.log('🔎 Changes detected:');
      console.log(`   Previous count: ${previousSnapshot.count}`);
      console.log(`   Current count: ${users.size}`);
      console.log(`   Net change: ${users.size - previousSnapshot.count > 0 ? '+' : ''}${users.size - previousSnapshot.count}`);
      console.log('');

      if (type === 'followers') {
        if (removed.length > 0) {
          console.log(`🚨 ${removed.length} accounts UNFOLLOWED @${username}:`);
          removed.slice(0, 20).forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          if (removed.length > 20) console.log(`   ... and ${removed.length - 20} more`);
          console.log('');

          // Save to file
          const lostFile = path.join(DATA_DIR, `${username}-lost-followers-${Date.now()}.txt`);
          await fs.writeFile(lostFile, removed.map(u => `@${u}`).join('\n'));
          console.log(`   📥 Saved to: ${lostFile}`);
        }

        if (added.length > 0) {
          console.log(`🎉 ${added.length} NEW followers for @${username}:`);
          added.slice(0, 20).forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          if (added.length > 20) console.log(`   ... and ${added.length - 20} more`);
          console.log('');
        }
      } else {
        if (removed.length > 0) {
          console.log(`👋 @${username} UNFOLLOWED ${removed.length} accounts:`);
          removed.slice(0, 20).forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          if (removed.length > 20) console.log(`   ... and ${removed.length - 20} more`);
          console.log('');

          // Save to file
          const unfollowedFile = path.join(DATA_DIR, `${username}-unfollowed-${Date.now()}.txt`);
          await fs.writeFile(unfollowedFile, removed.map(u => `@${u}`).join('\n'));
          console.log(`   📥 Saved to: ${unfollowedFile}`);
        }

        if (added.length > 0) {
          console.log(`➕ @${username} started FOLLOWING ${added.length} accounts:`);
          added.slice(0, 20).forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          if (added.length > 20) console.log(`   ... and ${added.length - 20} more`);
          console.log('');
        }
      }

      if (removed.length === 0 && added.length === 0) {
        console.log('✨ No changes detected since last check!');
        console.log('');
      }
    }

    // Save new snapshot
    const snapshot = {
      target: username,
      type,
      users: currentUsernames,
      fullData: Array.from(users.values()),
      count: users.size,
      timestamp: new Date().toISOString(),
    };

    await fs.writeFile(snapshotFile, JSON.stringify(snapshot, null, 2));
    console.log(`💾 Snapshot saved: ${snapshotFile}`);

    // Also save dated backup
    const dateStr = new Date().toISOString().split('T')[0];
    const backupFile = path.join(DATA_DIR, `${username}-${type}-${dateStr}.json`);
    await fs.writeFile(backupFile, JSON.stringify(snapshot, null, 2));
    console.log(`💾 Backup saved: ${backupFile}`);

    return {
      target: username,
      type,
      users: Array.from(users.values()),
      count: users.size,
      changes,
      timestamp: snapshot.timestamp,
    };

  } finally {
    await browser.close();
  }
}

// ============================================
// CLI Interface
// ============================================

const args = process.argv.slice(2);
const username = args.find(a => !a.startsWith('--') && a !== 'followers' && a !== 'following');
const type = args.includes('following') ? 'following' : 'followers';
const authTokenArg = args.find(a => a.startsWith('--auth-token='));
const authToken = authTokenArg ? authTokenArg.split('=')[1] : null;

if (!username) {
  console.log(`
🔭 XActions - Monitor Any Account
═══════════════════════════════════════════════════

Track followers/following changes on ANY public X account.

Usage:
  node monitor-account.js <username> [type] [options]

Arguments:
  username    Twitter/X username to monitor (without @)
  type        'followers' or 'following' (default: followers)

Options:
  --auth-token=XXX    Your X auth token (optional, helps avoid rate limits)

Examples:
  node monitor-account.js elonmusk
  node monitor-account.js elonmusk followers
  node monitor-account.js naval following
  node monitor-account.js competitor followers --auth-token=abc123

Output:
  - Saves snapshots to ./monitor-data/
  - Compares with previous snapshot
  - Shows who followed/unfollowed
  - Creates dated backups

Pro Tips:
  • Run daily via cron for automated tracking
  • Monitor both followers AND following for complete picture
  • Use auth token to avoid rate limits on large accounts
  • Check the ./monitor-data folder for historical data

Author: nich (@nichxbt)
  `);
  process.exit(0);
}

// Run the monitor
monitorAccount(username, type, { authToken })
  .then(result => {
    console.log('');
    console.log('═'.repeat(50));
    console.log('📌 COMPLETE');
    console.log('═'.repeat(50));
    console.log(`   Target: @${result.target}`);
    console.log(`   Type: ${result.type}`);
    console.log(`   Total: ${result.count}`);
    
    if (result.changes) {
      console.log(`   New: +${result.changes.added.length}`);
      console.log(`   Lost: -${result.changes.removed.length}`);
    }
    
    console.log('');
    console.log('💡 Run again later to detect new changes!');
    console.log('');
  })
  .catch(error => {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
  });
```

**What happens:**
1. Navigates to target account's followers/following page
2. Scrapes the complete list with stealth mode
3. Loads previous snapshot from `./monitor-data/`
4. Compares and shows all changes with details
5. Saves new snapshot and dated backup
6. Downloads change lists automatically

---

## 🔄 Automated Monitoring (Cron)

Set up automated daily monitoring:

```bash
# Edit crontab
crontab -e

# Add daily monitoring at 9 AM
0 9 * * * cd /path/to/xactions && node monitor-account.js elonmusk followers >> logs/elonmusk.log 2>&1
0 9 * * * cd /path/to/xactions && node monitor-account.js naval following >> logs/naval.log 2>&1
```

---

## 💡 Use Cases

### 🎯 Competitive Intelligence

Monitor your competitors to:
- Track their follower growth rate
- See who unfollows them (potential leads!)
- Identify accounts they start following (potential partners)
- Spot trends in their audience changes

```bash
# Monitor competitor's followers
node monitor-account.js competitor_brand followers

# Track who they're following (partnerships, influencers)
node monitor-account.js competitor_brand following
```

### 📈 Influencer Tracking

Watch key influencers in your space:
- Get alerts when they follow new accounts (early trend signal)
- See who unfollows them
- Track their audience growth

```bash
# Track who an influencer follows
node monitor-account.js naval following

# Many successful accounts follow rising stars early
```

### 🤝 Partnership Research

Before reaching out to potential partners:
- Check their recent follower changes
- See who they've been following lately
- Identify mutual connections

### 📊 Industry Analysis

Create a monitoring list for your industry:
```bash
#!/bin/bash
# monitor-industry.sh

ACCOUNTS=("competitor1" "competitor2" "industry_leader" "rising_star")

for account in "${ACCOUNTS[@]}"; do
  echo "Monitoring @$account..."
  node monitor-account.js "$account" followers
  node monitor-account.js "$account" following
  sleep 60  # Be respectful of rate limits
done
```

---

## ⚠️ Important Notes

1. **Public accounts only** - Private/protected accounts cannot be monitored
2. **Rate limits** - Don't monitor too many accounts too frequently
3. **Data storage** - Snapshots are stored in `./monitor-data/` folder
4. **First run** - Creates baseline snapshot, changes shown on subsequent runs
5. **Auth token** - Using your auth token helps avoid rate limits but is optional

---

## 🌐 Website Alternative

Don't want to run scripts? Use **[xactions.app](https://xactions.app)** for:

- ✅ Visual dashboard for monitoring multiple accounts
- ✅ Automatic scheduled monitoring
- ✅ Email/webhook alerts for changes
- ✅ Historical charts and trends
- ✅ Export reports to CSV/PDF
- ✅ No coding or setup required

**Free tier available** — monitor up to 3 accounts with daily snapshots.

---

## 📚 Related Guides

- [Detect Unfollowers](detect-unfollowers.md) - Track who unfollowed YOUR account
- [Followers Scraping](followers-scraping.md) - Export complete follower lists
- [Following Scraping](following-scraping.md) - Export who an account follows
- [New Follower Alerts](new-follower-alerts.md) - Real-time notifications

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))  
**License:** MIT
