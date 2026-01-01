# ☢️ Unfollow Everyone

The nuclear option - unfollow ALL accounts you're following on X (Twitter).

---

## ⚠️ MAJOR WARNING - READ FIRST!

> **🚨 THIS ACTION IS IRREVERSIBLE!**
>
> This script will unfollow **EVERYONE** you follow. There is no undo button.
> X/Twitter does not provide a way to restore your following list.
>
> **Before proceeding:**
> 1. ✅ Export your following list as a backup (scripts do this automatically)
> 2. ✅ Download the backup file and store it safely
> 3. ✅ Consider if you really want to do this
> 4. ✅ Have coffee and think about it again
>
> **You cannot recover your following list after running this script!**

---

## 📋 What It Does

This is the **nuclear option** for your X/Twitter account:

1. **Unfollows EVERYONE** - Every single account you follow, gone
2. **No exceptions** - Friends, celebrities, brands, everyone
3. **Complete reset** - Takes your following count to zero
4. **Permanent action** - Cannot be undone automatically

**Use cases:**
- Fresh start on your X account
- Privacy reset (removing all social connections)
- Account cleanup before rebranding
- Escaping an account takeover situation
- Starting over with a curated following list
- Detox from social media algorithm manipulation

**This is NOT for:**
- ❌ Unfollowing just non-followers (use [unfollow-non-followers.md](unfollow-non-followers.md) instead)
- ❌ Unfollowing a few specific accounts (do that manually)
- ❌ Testing or "just to see what happens"

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Accounts following up to ~500 users

**Steps:**
1. Go to `x.com/YOUR_USERNAME/following`
2. Open browser console (F12 → Console tab)
3. Paste the script below and press Enter
4. Confirm when prompted

```javascript
// ============================================
// XActions - Unfollow Everyone (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/YOUR_USERNAME/following
// Open console (F12), paste this
// ============================================

(async () => {
  // Configuration
  const UNFOLLOW_DELAY_MIN = 3000;   // Minimum delay between unfollows (ms)
  const UNFOLLOW_DELAY_MAX = 5000;   // Maximum delay between unfollows (ms)
  const SCROLL_DELAY = 2000;         // Time between scrolls (ms)
  const BATCH_PAUSE = 30000;         // Pause every 10 unfollows (ms)
  const MAX_SCROLL_RETRIES = 15;     // Stop scrolling if no new users found
  
  console.log('');
  console.log('☢️  XActions - UNFOLLOW EVERYONE');
  console.log('====================================');
  console.log('⚠️  WARNING: This will unfollow ALL accounts!');
  console.log('⚠️  This action CANNOT be undone!');
  console.log('');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(min + Math.random() * (max - min));
  
  // Verify we're on the following page
  const pathMatch = window.location.pathname.match(/^\/([^/]+)\/following/);
  if (!pathMatch) {
    console.error('❌ Please navigate to your FOLLOWING page first!');
    console.log('👉 Go to: x.com/YOUR_USERNAME/following');
    return;
  }
  
  const currentUsername = pathMatch[1];
  console.log(`📍 Account: @${currentUsername}`);
  console.log('');
  
  // ============================================
  // Step 1: Scan all users you're following
  // ============================================
  console.log('📜 Step 1: Scanning your following list...');
  console.log('   (This may take a while for large lists)');
  
  const users = new Map();
  let scrollRetries = 0;
  
  while (scrollRetries < MAX_SCROLL_RETRIES) {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const prevSize = users.size;
    
    cells.forEach(cell => {
      try {
        const link = cell.querySelector('a[href^="/"]');
        const href = link?.getAttribute('href') || '';
        const username = href.split('/')[1];
        
        if (!username || username.includes('?') || username.includes('/')) return;
        
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const name = nameEl?.textContent?.trim() || username;
        
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || '';
        
        if (!users.has(username)) {
          users.set(username, {
            username,
            name,
            bio,
            cell
          });
        }
      } catch (e) {
        // Skip malformed cells
      }
    });
    
    // Progress update
    console.log(`   📊 Found: ${users.size} users`);
    
    if (users.size === prevSize) {
      scrollRetries++;
    } else {
      scrollRetries = 0;
    }
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  const allUsers = Array.from(users.values());
  console.log('');
  console.log(`   ✅ Total accounts found: ${allUsers.length}`);
  
  if (allUsers.length === 0) {
    console.log('');
    console.log('🎉 You\'re not following anyone! Nothing to do.');
    return;
  }
  
  // ============================================
  // Step 2: Export backup before unfollowing
  // ============================================
  console.log('');
  console.log('💾 Step 2: Creating backup of your following list...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportData = allUsers.map(u => ({
    username: u.username,
    name: u.name,
    bio: u.bio,
    exportedAt: new Date().toISOString()
  }));
  
  // Download JSON backup
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `following-backup-${currentUsername}-${timestamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log(`   📥 Backup downloaded: following-backup-${currentUsername}-${timestamp}.json`);
  console.log('   ⚠️  KEEP THIS FILE SAFE! It\'s your only way to know who you followed.');
  
  // Also copy to clipboard
  try {
    await navigator.clipboard.writeText(json);
    console.log('   📋 Also copied to clipboard!');
  } catch (e) {
    // Clipboard might not be available
  }
  
  // ============================================
  // Step 3: Show summary and get confirmation
  // ============================================
  console.log('');
  console.log('====================================');
  console.log('⚠️  FINAL WARNING');
  console.log('====================================');
  console.log(`You are about to unfollow ${allUsers.length} accounts.`);
  console.log('');
  console.log('Preview of accounts to unfollow:');
  allUsers.slice(0, 10).forEach((u, i) => {
    console.log(`   ${i + 1}. @${u.username} (${u.name})`);
  });
  if (allUsers.length > 10) {
    console.log(`   ... and ${allUsers.length - 10} more`);
  }
  console.log('');
  
  // Confirmation prompt
  const confirmed = window.confirm(
    `☢️ NUCLEAR OPTION: Unfollow ALL ${allUsers.length} accounts?\n\n` +
    `This action CANNOT be undone!\n\n` +
    `Your backup has been downloaded.\n` +
    `Click OK to proceed, Cancel to abort.`
  );
  
  if (!confirmed) {
    console.log('');
    console.log('👋 Cancelled! No accounts were unfollowed.');
    console.log('   Your backup file has been saved.');
    return { unfollowed: [], total: allUsers.length, cancelled: true };
  }
  
  console.log('');
  console.log('☢️  CONFIRMED - Starting unfollow process...');
  console.log('   Press Ctrl+C or close this tab to stop!');
  console.log('');
  
  // ============================================
  // Step 4: Unfollow everyone
  // ============================================
  console.log('🚫 Step 4: Unfollowing all accounts...');
  console.log('');
  
  const unfollowed = [];
  const failed = [];
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;
  
  // Scroll back to top
  window.scrollTo(0, 0);
  await sleep(1000);
  
  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    
    try {
      // Find current unfollow buttons on screen
      const unfollowButtons = document.querySelectorAll('[data-testid$="-unfollow"]');
      
      if (unfollowButtons.length === 0) {
        // Need to scroll to find more buttons
        window.scrollTo(0, 0);
        await sleep(1500);
        
        const retryButtons = document.querySelectorAll('[data-testid$="-unfollow"]');
        if (retryButtons.length === 0) {
          console.log('   ⏭️  No more unfollow buttons found, checking if done...');
          break;
        }
      }
      
      // Click the first available unfollow button
      const unfollowBtn = document.querySelector('[data-testid$="-unfollow"]');
      
      if (!unfollowBtn) {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log('   ⚠️  Multiple failures in a row, might be rate limited or done');
          break;
        }
        continue;
      }
      
      // Get username from the cell
      const cell = unfollowBtn.closest('[data-testid="UserCell"]');
      let username = 'unknown';
      if (cell) {
        const link = cell.querySelector('a[href^="/"]');
        username = link?.getAttribute('href')?.split('/')[1] || 'unknown';
      }
      
      // Click unfollow
      unfollowBtn.click();
      await sleep(500);
      
      // Click confirmation dialog
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      
      if (confirmBtn) {
        confirmBtn.click();
        unfollowed.push(username);
        consecutiveFailures = 0;
        
        const progress = ((i + 1) / allUsers.length * 100).toFixed(1);
        console.log(`   ✅ ${unfollowed.length} unfollowed | @${username} | ${progress}% complete`);
      } else {
        failed.push({ username, reason: 'No confirm dialog' });
        console.log(`   ⚠️  @${username} - Confirm dialog not found`);
        consecutiveFailures++;
      }
      
      // Wait between unfollows (3-5 seconds with randomization)
      await randomDelay(UNFOLLOW_DELAY_MIN, UNFOLLOW_DELAY_MAX);
      
      // Pause every 10 unfollows for safety
      if (unfollowed.length % 10 === 0 && unfollowed.length > 0) {
        console.log(`   ⏸️  Safety pause (${BATCH_PAUSE / 1000}s) - Completed ${unfollowed.length} unfollows...`);
        await sleep(BATCH_PAUSE);
        console.log('   ▶️  Resuming...');
      }
      
      // Check for rate limit warning
      const rateLimitWarning = document.querySelector('[data-testid="toast"]');
      if (rateLimitWarning?.textContent?.includes('limit')) {
        console.log('');
        console.log('⛔ RATE LIMIT DETECTED! Stopping to protect your account.');
        console.log('   Wait 15-30 minutes before running again.');
        break;
      }
      
    } catch (error) {
      failed.push({ username: user.username, reason: error.message });
      console.log(`   ❌ Error with @${user.username}: ${error.message}`);
      consecutiveFailures++;
    }
    
    // Safety check
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.log('');
      console.log('⚠️  Too many consecutive failures. Stopping.');
      break;
    }
  }
  
  // ============================================
  // Step 5: Final summary
  // ============================================
  console.log('');
  console.log('====================================');
  console.log('☢️  UNFOLLOW EVERYONE - COMPLETE');
  console.log('====================================');
  console.log(`📊 Total accounts scanned: ${allUsers.length}`);
  console.log(`✅ Successfully unfollowed: ${unfollowed.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log('');
  
  if (unfollowed.length === allUsers.length) {
    console.log('🎉 All accounts have been unfollowed!');
    console.log('   Your following count should now be 0.');
  } else {
    console.log(`💡 ${allUsers.length - unfollowed.length} accounts may remain.`);
    console.log('   Refresh the page and run the script again if needed.');
  }
  
  console.log('');
  console.log('📁 Your backup file: following-backup-' + currentUsername + '-*.json');
  console.log('   Use this to manually re-follow accounts if needed.');
  
  // Download results log
  const resultsData = {
    date: new Date().toISOString(),
    account: currentUsername,
    totalScanned: allUsers.length,
    unfollowed: unfollowed,
    failed: failed,
    unfollowedCount: unfollowed.length,
    failedCount: failed.length
  };
  
  const resultsBlob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' });
  const resultsUrl = URL.createObjectURL(resultsBlob);
  const resultsLink = document.createElement('a');
  resultsLink.href = resultsUrl;
  resultsLink.download = `unfollow-everyone-results-${timestamp}.json`;
  resultsLink.click();
  URL.revokeObjectURL(resultsUrl);
  
  console.log(`📥 Results saved: unfollow-everyone-results-${timestamp}.json`);
  
  return {
    unfollowed,
    failed,
    total: allUsers.length
  };
})();
```

**What happens:**
1. Script scans your entire following list
2. **Automatically downloads a backup** of everyone you follow
3. Shows a confirmation dialog with warning
4. Unfollows each account one by one with 3-5 second delays
5. Pauses for 30 seconds every 10 unfollows
6. Downloads a results log when complete

**Safety features:**
- ✅ Automatic backup download before any changes
- ✅ Confirmation dialog with clear warning
- ✅ 3-5 second random delay between unfollows
- ✅ 30 second pause every 10 unfollows
- ✅ Automatic stop on rate limit detection
- ✅ Progress tracking in console

---

## 🤖 Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Large accounts (500+ following), scheduled runs, complete automation

```javascript
// ============================================
// XActions - Unfollow Everyone (Node.js/Puppeteer)
// Author: nich (@nichxbt)
// Save as: unfollow-everyone.js
// Run: node unfollow-everyone.js
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import readline from 'readline';
import path from 'path';

puppeteer.use(StealthPlugin());

// ============================================
// Configuration
// ============================================
const CONFIG = {
  // Your X username (without @)
  username: 'YOUR_USERNAME',
  
  // Your auth_token cookie from X
  // Get this from: Browser DevTools → Application → Cookies → x.com → auth_token
  authToken: 'YOUR_AUTH_TOKEN_HERE',
  
  // Maximum users to unfollow per session (for safety)
  maxUnfollowsPerSession: 100,
  
  // Delay between unfollows (ms) - random between min and max
  unfollowDelayMin: 3000,
  unfollowDelayMax: 5000,
  
  // Pause every N unfollows (ms)
  batchSize: 10,
  batchPauseMin: 25000,
  batchPauseMax: 35000,
  
  // Extended pause every 50 unfollows
  extendedBatchSize: 50,
  extendedPauseMin: 120000,  // 2 minutes
  extendedPauseMax: 180000,  // 3 minutes
  
  // Run in headless mode (set to false to see browser)
  headless: true,
  
  // Skip confirmation prompt (⚠️ DANGEROUS!)
  skipConfirmation: false,
  
  // Output directory for backups and logs
  outputDir: './unfollow-everyone-output',
};

// ============================================
// Helper Functions
// ============================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => sleep(min + Math.random() * (max - min));

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    info: '   ',
    success: ' ✅',
    error: ' ❌',
    warning: ' ⚠️',
    progress: ' 📊',
  }[type] || '   ';
  console.log(`[${timestamp}]${prefix} ${message}`);
}

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // Directory exists
  }
}

// ============================================
// Scrape Following List
// ============================================

async function scrapeFollowingList(page, username, maxUsers = 5000) {
  log(`Navigating to @${username}/following...`);
  
  await page.goto(`https://x.com/${username}/following`, { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
  
  try {
    await page.waitForSelector('[data-testid="UserCell"]', { timeout: 15000 });
  } catch {
    log('No users found or page didn\'t load', 'warning');
    return [];
  }
  
  await sleep(2000);
  
  const users = new Map();
  let retries = 0;
  const maxRetries = 20;
  
  log('Scanning following list (this may take a while)...');
  
  while (users.size < maxUsers && retries < maxRetries) {
    const extracted = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells).map(cell => {
        try {
          const link = cell.querySelector('a[href^="/"]');
          const href = link?.getAttribute('href') || '';
          const username = href.split('/')[1];
          
          if (!username || username.includes('?') || username.includes('/')) return null;
          
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const bioEl = cell.querySelector('[data-testid="UserDescription"]');
          
          return {
            username,
            name: nameEl?.textContent?.trim() || null,
            bio: bioEl?.textContent?.trim() || null,
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
    });
    
    const prevSize = users.size;
    extracted.forEach(user => {
      if (!users.has(user.username)) {
        users.set(user.username, user);
      }
    });
    
    if (users.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }
    
    process.stdout.write(`\r   📊 Scanned: ${users.size} users...`);
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 2500);
  }
  
  console.log(''); // New line after progress
  return Array.from(users.values());
}

// ============================================
// Export Following List as Backup
// ============================================

async function exportBackup(users, username, outputDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const backupData = {
    exportedAt: new Date().toISOString(),
    account: username,
    totalCount: users.length,
    users: users.map(u => ({
      username: u.username,
      name: u.name,
      bio: u.bio,
    }))
  };
  
  // Save JSON
  const jsonPath = path.join(outputDir, `following-backup-${username}-${timestamp}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(backupData, null, 2));
  log(`Backup saved: ${jsonPath}`, 'success');
  
  // Save CSV
  const csvPath = path.join(outputDir, `following-backup-${username}-${timestamp}.csv`);
  const csvHeader = 'username,name,bio';
  const csvRows = users.map(u => 
    `"${u.username}","${(u.name || '').replace(/"/g, '""')}","${(u.bio || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
  );
  await fs.writeFile(csvPath, [csvHeader, ...csvRows].join('\n'));
  log(`CSV backup saved: ${csvPath}`, 'success');
  
  // Save simple text list
  const txtPath = path.join(outputDir, `following-backup-${username}-${timestamp}.txt`);
  const txtContent = users.map(u => `@${u.username}`).join('\n');
  await fs.writeFile(txtPath, txtContent);
  log(`Text list saved: ${txtPath}`, 'success');
  
  return { jsonPath, csvPath, txtPath, timestamp };
}

// ============================================
// Unfollow a Single User
// ============================================

async function unfollowUser(page, username) {
  try {
    // Navigate to user's profile
    await page.goto(`https://x.com/${username}`, { 
      waitUntil: 'networkidle2', 
      timeout: 20000 
    });
    
    await sleep(1000 + Math.random() * 500);
    
    // Find the "Following" button (which triggers unfollow)
    const followingBtn = await page.$('[data-testid$="-unfollow"]');
    
    if (!followingBtn) {
      // Check if we're already not following
      const followBtn = await page.$('[data-testid$="-follow"]');
      if (followBtn) {
        return { success: true, alreadyUnfollowed: true };
      }
      return { success: false, error: 'Follow button not found' };
    }
    
    // Click the following button
    await followingBtn.click();
    await sleep(600);
    
    // Click confirm in the dialog
    const confirmBtn = await page.$('[data-testid="confirmationSheetConfirm"]');
    
    if (confirmBtn) {
      await confirmBtn.click();
      await sleep(500);
      return { success: true };
    } else {
      return { success: false, error: 'Confirm dialog not found' };
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// Main Function
// ============================================

async function unfollowEveryone() {
  console.log('');
  console.log('☢️  ═══════════════════════════════════════════');
  console.log('☢️  XACTIONS - UNFOLLOW EVERYONE');
  console.log('☢️  ═══════════════════════════════════════════');
  console.log('');
  console.log('⚠️  WARNING: This will unfollow ALL accounts!');
  console.log('⚠️  This action CANNOT be undone!');
  console.log('');
  console.log(`👤 Account: @${CONFIG.username}`);
  console.log(`📊 Max unfollows per session: ${CONFIG.maxUnfollowsPerSession}`);
  console.log(`⏱️  Delay between unfollows: ${CONFIG.unfollowDelayMin/1000}-${CONFIG.unfollowDelayMax/1000}s`);
  console.log('');
  
  // Validate config
  if (CONFIG.username === 'YOUR_USERNAME' || CONFIG.authToken === 'YOUR_AUTH_TOKEN_HERE') {
    console.error('❌ Error: Please update CONFIG with your username and auth_token');
    console.log('');
    console.log('To get your auth_token:');
    console.log('1. Go to x.com in your browser and log in');
    console.log('2. Press F12 → Application tab → Cookies → x.com');
    console.log('3. Find "auth_token" and copy its value');
    console.log('4. Paste it in the CONFIG section of this script');
    process.exit(1);
  }
  
  // Create output directory
  await ensureDir(CONFIG.outputDir);
  
  // Launch browser
  log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: CONFIG.headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
    ],
  });
  
  const startTime = Date.now();
  const results = {
    startTime: new Date().toISOString(),
    account: CONFIG.username,
    unfollowed: [],
    failed: [],
    skipped: [],
  };
  
  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ 
      width: 1280 + Math.floor(Math.random() * 100), 
      height: 900 + Math.floor(Math.random() * 100),
    });
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );
    
    // Set auth cookie
    log('Setting authentication...');
    await page.setCookie({
      name: 'auth_token',
      value: CONFIG.authToken,
      domain: '.x.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
    
    // Test authentication
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
    await sleep(2500);
    
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null;
    });
    
    if (!isLoggedIn) {
      throw new Error('Authentication failed. Please check your auth_token.');
    }
    log('Logged in successfully!', 'success');
    console.log('');
    
    // ============================================
    // Step 1: Scrape following list
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📜 STEP 1: Exporting your following list (BACKUP)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const following = await scrapeFollowingList(page, CONFIG.username);
    
    log(`Found ${following.length} accounts you follow`, 'success');
    console.log('');
    
    if (following.length === 0) {
      log('You\'re not following anyone! Nothing to do.', 'success');
      return;
    }
    
    // ============================================
    // Step 2: Export backup
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 STEP 2: Creating backup files');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const backup = await exportBackup(following, CONFIG.username, CONFIG.outputDir);
    console.log('');
    log('IMPORTANT: Keep these backup files safe!', 'warning');
    log('They are your ONLY way to know who you followed.', 'warning');
    console.log('');
    
    // ============================================
    // Step 3: Show preview and confirm
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 3: Review and confirm');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('');
    console.log('Preview of accounts to unfollow:');
    following.slice(0, 15).forEach((u, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. @${u.username.padEnd(20)} ${u.name || ''}`);
    });
    if (following.length > 15) {
      console.log(`   ... and ${following.length - 15} more`);
    }
    console.log('');
    
    const toUnfollow = following.slice(0, CONFIG.maxUnfollowsPerSession);
    
    console.log('┌──────────────────────────────────────────┐');
    console.log('│  ☢️  NUCLEAR OPTION WARNING              │');
    console.log('├──────────────────────────────────────────┤');
    console.log(`│  Total following: ${following.length.toString().padEnd(20)} │`);
    console.log(`│  Will unfollow: ${toUnfollow.length.toString().padEnd(22)} │`);
    console.log('│                                          │');
    console.log('│  THIS CANNOT BE UNDONE!                  │');
    console.log('└──────────────────────────────────────────┘');
    console.log('');
    
    if (!CONFIG.skipConfirmation) {
      const answer = await askConfirmation(
        `☢️  Type "UNFOLLOW ALL" to confirm (or anything else to cancel): `
      );
      
      if (answer !== 'unfollow all') {
        console.log('');
        log('Cancelled! No accounts were unfollowed.', 'success');
        log(`Your backup has been saved to: ${CONFIG.outputDir}`);
        return;
      }
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('☢️  STEP 4: Unfollowing all accounts');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    log('Press Ctrl+C at any time to stop', 'warning');
    console.log('');
    
    // ============================================
    // Step 4: Unfollow everyone
    // ============================================
    
    for (let i = 0; i < toUnfollow.length; i++) {
      const user = toUnfollow[i];
      
      const result = await unfollowUser(page, user.username);
      
      if (result.success) {
        if (result.alreadyUnfollowed) {
          results.skipped.push(user.username);
          log(`${(i + 1).toString().padStart(3)}/${toUnfollow.length} - @${user.username} (already unfollowed)`, 'warning');
        } else {
          results.unfollowed.push(user.username);
          const percent = ((i + 1) / toUnfollow.length * 100).toFixed(1);
          log(`${(i + 1).toString().padStart(3)}/${toUnfollow.length} - Unfollowed @${user.username} (${percent}%)`, 'success');
        }
      } else {
        results.failed.push({ username: user.username, error: result.error });
        log(`${(i + 1).toString().padStart(3)}/${toUnfollow.length} - Failed @${user.username}: ${result.error}`, 'error');
      }
      
      // Standard delay between unfollows
      await randomDelay(CONFIG.unfollowDelayMin, CONFIG.unfollowDelayMax);
      
      // Batch pause every N unfollows
      if ((i + 1) % CONFIG.batchSize === 0 && i < toUnfollow.length - 1) {
        const pauseDuration = Math.floor(CONFIG.batchPauseMin + Math.random() * (CONFIG.batchPauseMax - CONFIG.batchPauseMin));
        log(`Safety pause (${Math.round(pauseDuration/1000)}s)...`, 'warning');
        await sleep(pauseDuration);
      }
      
      // Extended pause every 50 unfollows
      if ((i + 1) % CONFIG.extendedBatchSize === 0 && i < toUnfollow.length - 1) {
        const extendedPause = Math.floor(CONFIG.extendedPauseMin + Math.random() * (CONFIG.extendedPauseMax - CONFIG.extendedPauseMin));
        console.log('');
        log(`Extended safety pause (${Math.round(extendedPause/1000)}s) - Completed ${i + 1} unfollows`, 'warning');
        await sleep(extendedPause);
        console.log('');
      }
    }
    
    // ============================================
    // Step 5: Summary
    // ============================================
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('');
    console.log('☢️  ═══════════════════════════════════════════');
    console.log('☢️  UNFOLLOW EVERYONE - COMPLETE');
    console.log('☢️  ═══════════════════════════════════════════');
    console.log('');
    console.log(`📊 Total accounts found: ${following.length}`);
    console.log(`✅ Successfully unfollowed: ${results.unfollowed.length}`);
    console.log(`⏭️  Already unfollowed: ${results.skipped.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⏱️  Duration: ${Math.floor(duration/60)}m ${duration%60}s`);
    console.log('');
    
    if (following.length > CONFIG.maxUnfollowsPerSession) {
      console.log(`💡 ${following.length - CONFIG.maxUnfollowsPerSession} accounts remaining.`);
      console.log('   Wait 1-2 hours, then run the script again!');
      console.log('');
    }
    
    // Save results log
    results.endTime = new Date().toISOString();
    results.duration = duration;
    results.totalFound = following.length;
    
    const resultsPath = path.join(CONFIG.outputDir, `unfollow-results-${backup.timestamp}.json`);
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    log(`Results saved: ${resultsPath}`, 'success');
    
    console.log('');
    console.log('📁 All files saved to:', CONFIG.outputDir);
    console.log('   Keep the backup files to manually re-follow accounts if needed.');
    
  } finally {
    await browser.close();
  }
}

// ============================================
// Run
// ============================================

unfollowEveryone().catch(error => {
  console.error('');
  console.error('❌ Fatal Error:', error.message);
  process.exit(1);
});
```

**Setup & Run:**
```bash
# Create a new directory for this script
mkdir unfollow-everyone && cd unfollow-everyone

# Initialize npm project
npm init -y

# Add "type": "module" to package.json for ES modules
npm pkg set type=module

# Install dependencies
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth

# Create the script file
# Copy the code above into unfollow-everyone.js

# Edit the CONFIG section with your username and auth_token
# Then run:
node unfollow-everyone.js
```

**Getting your auth_token:**
1. Log into X/Twitter in your browser
2. Press F12 → Application tab (Chrome) or Storage tab (Firefox)
3. Click Cookies → `x.com`
4. Find `auth_token` and copy the value
5. Paste it in the CONFIG section

**Output example:**
```
☢️  ═══════════════════════════════════════════
☢️  XACTIONS - UNFOLLOW EVERYONE
☢️  ═══════════════════════════════════════════

⚠️  WARNING: This will unfollow ALL accounts!
⚠️  This action CANNOT be undone!

👤 Account: @nichxbt
📊 Max unfollows per session: 100
⏱️  Delay between unfollows: 3-5s

[10:23:45]    Launching browser...
[10:23:48]    Setting authentication...
[10:23:51] ✅ Logged in successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 STEP 1: Exporting your following list (BACKUP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 Scanned: 847 users...
[10:24:32] ✅ Found 847 accounts you follow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 STEP 2: Creating backup files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[10:24:33] ✅ Backup saved: ./unfollow-everyone-output/following-backup-nichxbt-2026-01-01T10-24-33-123Z.json
[10:24:33] ✅ CSV backup saved: ./unfollow-everyone-output/following-backup-nichxbt-2026-01-01T10-24-33-123Z.csv
[10:24:33] ✅ Text list saved: ./unfollow-everyone-output/following-backup-nichxbt-2026-01-01T10-24-33-123Z.txt

[10:24:33] ⚠️ IMPORTANT: Keep these backup files safe!
[10:24:33] ⚠️ They are your ONLY way to know who you followed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STEP 3: Review and confirm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preview of accounts to unfollow:
    1. @elonmusk             Elon Musk
    2. @OpenAI               OpenAI
    3. @github               GitHub
   ... and 832 more

┌──────────────────────────────────────────┐
│  ☢️  NUCLEAR OPTION WARNING              │
├──────────────────────────────────────────┤
│  Total following: 847                    │
│  Will unfollow: 100                      │
│                                          │
│  THIS CANNOT BE UNDONE!                  │
└──────────────────────────────────────────┘

☢️  Type "UNFOLLOW ALL" to confirm (or anything else to cancel): UNFOLLOW ALL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☢️  STEP 4: Unfollowing all accounts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[10:24:45] ⚠️ Press Ctrl+C at any time to stop

[10:24:50] ✅   1/100 - Unfollowed @elonmusk (1.0%)
[10:24:55] ✅   2/100 - Unfollowed @OpenAI (2.0%)
[10:25:00] ✅   3/100 - Unfollowed @github (3.0%)
...
[10:26:20] ⚠️ Safety pause (30s)...
...

☢️  ═══════════════════════════════════════════
☢️  UNFOLLOW EVERYONE - COMPLETE
☢️  ═══════════════════════════════════════════

📊 Total accounts found: 847
✅ Successfully unfollowed: 100
⏭️  Already unfollowed: 0
❌ Failed: 0
⏱️  Duration: 12m 34s

💡 747 accounts remaining.
   Wait 1-2 hours, then run the script again!

[10:37:19] ✅ Results saved: ./unfollow-everyone-output/unfollow-results-2026-01-01T10-24-33-123Z.json

📁 All files saved to: ./unfollow-everyone-output
   Keep the backup files to manually re-follow accounts if needed.
```

---

## ⚠️ Safety Guidelines & Rate Limits

### Rate Limit Guidelines

| Action | Recommended Limit | Reason |
|--------|------------------|--------|
| Unfollows per session | 50-100 | Avoid triggering rate limits |
| Delay between unfollows | 3-5 seconds | Mimics human behavior |
| Batch pause (every 10) | 25-35 seconds | Gives API breathing room |
| Extended pause (every 50) | 2-3 minutes | Major safety break |
| Between sessions | 1-2 hours | Account protection |
| Maximum per day | 200-300 | Stay well under radar |

### Warning Signs - STOP IMMEDIATELY If You See:

- ⛔ "You're doing that too fast" message
- ⛔ "Rate limit exceeded" error
- ⛔ Unfollow buttons stop responding
- ⛔ Account gets temporarily restricted
- ⛔ Asked to verify phone number
- ⛔ Multiple consecutive failures

### Recovery If Rate Limited

1. **Stop immediately** - Close the script/browser
2. **Wait at least 2 hours** - Let the rate limit reset
3. **Reduce batch size** - Set `maxUnfollowsPerSession` to 25-50
4. **Increase delays** - Double the delay times
5. **Try again tomorrow** - If issues persist, wait 24 hours

---

## 🌐 Website Alternative

Don't want to run scripts? Use [xactions.app](https://xactions.app):

1. **Login** - Connect your X account securely
2. **Backup** - Export your entire following list first
3. **Select** - Choose "Unfollow Everyone" option
4. **Confirm** - Multiple confirmation steps for safety
5. **Execute** - Automated unfollowing with built-in rate limits

**Benefits:**
- ✅ No coding or setup required
- ✅ Automatic backup before any changes
- ✅ Visual progress tracking
- ✅ Built-in rate limit protection
- ✅ Pause and resume capability
- ✅ Email notification when complete

---

## 📝 Frequently Asked Questions

### Can I undo this?

**No.** Once you unfollow everyone, there's no automatic way to restore your following list. The only way is to:
1. Use your backup file
2. Manually follow each account again one by one

### How long does this take?

Depends on how many accounts you follow:
- 100 accounts: ~10-15 minutes
- 500 accounts: ~1-2 hours (with safety pauses)
- 1000+ accounts: Multiple sessions over several hours

### Will my followers know?

They won't get notified that you unfollowed them. However:
- They may notice if they check their followers
- You'll disappear from their "Following" notifications
- DM history remains intact

### Is this against X/Twitter's rules?

Mass unfollowing is a gray area. To stay safe:
- Use reasonable delays (this script does)
- Don't run multiple sessions back-to-back
- Don't combine with other automation at the same time

### What about protected accounts I follow?

The script will attempt to unfollow them normally. If it fails, they'll appear in the "failed" list.

---

## 📚 Related Documentation

- [Detect Unfollowers](detect-unfollowers.md) - Track who unfollowed you
- [Unfollow Non-Followers](unfollow-non-followers.md) - Only unfollow people who don't follow back
- [Following Scraping](following-scraping.md) - Export your following list

---

*Author: nich ([@nichxbt](https://x.com/nichxbt))*  
*Part of [XActions](https://xactions.app) - X/Twitter Automation Tools*
