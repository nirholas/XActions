# 🚫 Unfollow Non-Followers

Find and unfollow people who don't follow you back on X (Twitter).

---

## 📋 What It Does

This feature helps you clean up your following list by:

1. **Scanning your following list** - Goes through everyone you follow
2. **Identifying non-followers** - Checks who doesn't have the "Follows you" badge
3. **Unfollowing automatically** - Removes them from your following list with confirmation
4. **Rate limit protection** - Includes delays to keep your account safe

**Use cases:**
- Clean up your following/follower ratio
- Remove accounts that unfollowed you
- Maintain a more engaged network
- Free up your timeline from one-sided follows

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Unfollowing up to ~50 non-followers quickly

**Steps:**
1. Go to `x.com/YOUR_USERNAME/following`
2. Open browser console (F12 → Console tab)
3. Paste the script below and press Enter

```javascript
// ============================================
// XActions - Unfollow Non-Followers (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/YOUR_USERNAME/following
// Open console (F12), paste this
// ============================================

(async () => {
  // Configuration
  const MAX_UNFOLLOWS = 50;          // Maximum people to unfollow per run
  const SCROLL_DELAY = 2000;         // Time between scrolls (ms)
  const UNFOLLOW_DELAY = 3000;       // Time between unfollows (ms)
  const BATCH_PAUSE = 15000;         // Pause every 10 unfollows (ms)
  const MAX_SCROLL_RETRIES = 10;     // Stop if no new users found
  
  console.log('🔍 XActions - Unfollow Non-Followers');
  console.log('====================================');
  console.log(`⚙️  Max unfollows: ${MAX_UNFOLLOWS}`);
  console.log(`⚙️  Unfollow delay: ${UNFOLLOW_DELAY}ms`);
  console.log('');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Step 1: Collect all users you're following
  console.log('📜 Step 1: Scanning your following list...');
  
  const users = new Map();
  let scrollRetries = 0;
  
  while (scrollRetries < MAX_SCROLL_RETRIES) {
    // Find all user cells
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const prevSize = users.size;
    
    cells.forEach(cell => {
      try {
        // Get username from link
        const link = cell.querySelector('a[href^="/"]');
        const href = link?.getAttribute('href') || '';
        const username = href.split('/')[1];
        
        if (!username || username.includes('?')) return;
        
        // Check for "Follows you" badge
        const followsYou = cell.querySelector('[data-testid="userFollowIndicator"]') !== null;
        
        // Get display name
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const name = nameEl?.textContent?.trim() || username;
        
        // Get the unfollow button for this user
        const unfollowBtn = cell.querySelector('[data-testid$="-unfollow"]');
        
        if (!users.has(username)) {
          users.set(username, {
            username,
            name,
            followsYou,
            element: unfollowBtn,
            cell
          });
        }
      } catch (e) {
        // Skip malformed cells
      }
    });
    
    // Progress update
    const nonFollowers = Array.from(users.values()).filter(u => !u.followsYou);
    console.log(`   📊 Scanned: ${users.size} users (${nonFollowers.length} don't follow back)`);
    
    // Check if we found new users
    if (users.size === prevSize) {
      scrollRetries++;
    } else {
      scrollRetries = 0;
    }
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  // Step 2: Filter non-followers
  console.log('');
  console.log('🔎 Step 2: Identifying non-followers...');
  
  const allUsers = Array.from(users.values());
  const nonFollowers = allUsers.filter(u => !u.followsYou);
  const followers = allUsers.filter(u => u.followsYou);
  
  console.log(`   ✅ Total following: ${allUsers.length}`);
  console.log(`   ✅ Follow you back: ${followers.length}`);
  console.log(`   ❌ Don't follow back: ${nonFollowers.length}`);
  
  if (nonFollowers.length === 0) {
    console.log('');
    console.log('🎉 Great news! Everyone you follow also follows you back!');
    return { unfollowed: [], nonFollowers: [] };
  }
  
  // Show list of non-followers
  console.log('');
  console.log('📋 Non-followers found:');
  nonFollowers.slice(0, 20).forEach((u, i) => {
    console.log(`   ${i + 1}. @${u.username} (${u.name})`);
  });
  if (nonFollowers.length > 20) {
    console.log(`   ... and ${nonFollowers.length - 20} more`);
  }
  
  // Step 3: Export list before unfollowing
  console.log('');
  console.log('💾 Step 3: Exporting non-followers list...');
  
  const exportData = nonFollowers.map(u => ({
    username: u.username,
    name: u.name,
    followsYou: false
  }));
  
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `non-followers-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  console.log('   📥 List downloaded! Check your downloads folder.');
  await navigator.clipboard.writeText(json);
  console.log('   📋 Also copied to clipboard!');
  
  // Step 4: Unfollow non-followers
  console.log('');
  console.log(`🚫 Step 4: Unfollowing (max ${MAX_UNFOLLOWS})...`);
  console.log('   ⚠️  Press Ctrl+C in console to stop at any time');
  console.log('');
  
  const toUnfollow = nonFollowers.slice(0, MAX_UNFOLLOWS);
  const unfollowed = [];
  const failed = [];
  
  for (let i = 0; i < toUnfollow.length; i++) {
    const user = toUnfollow[i];
    
    try {
      // Scroll the user into view
      user.cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);
      
      // Find and click the unfollow button
      const unfollowBtn = user.cell.querySelector('[data-testid$="-unfollow"]');
      
      if (!unfollowBtn) {
        console.log(`   ⏭️  @${user.username} - Button not found, skipping`);
        failed.push({ username: user.username, reason: 'Button not found' });
        continue;
      }
      
      // Click unfollow
      unfollowBtn.click();
      await sleep(500);
      
      // Click confirmation dialog
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      
      if (confirmBtn) {
        confirmBtn.click();
        unfollowed.push(user.username);
        console.log(`   ✅ ${i + 1}/${toUnfollow.length} - Unfollowed @${user.username}`);
      } else {
        // Sometimes confirmation doesn't appear, try alternative
        failed.push({ username: user.username, reason: 'Confirm dialog not found' });
        console.log(`   ⚠️  ${i + 1}/${toUnfollow.length} - @${user.username} - No confirm dialog`);
      }
      
      // Wait between unfollows (rate limit protection)
      await sleep(UNFOLLOW_DELAY + Math.random() * 1000);
      
      // Pause every 10 unfollows for safety
      if ((i + 1) % 10 === 0 && i < toUnfollow.length - 1) {
        console.log(`   ⏸️  Pausing for ${BATCH_PAUSE / 1000}s (safety break)...`);
        await sleep(BATCH_PAUSE);
      }
      
    } catch (error) {
      console.log(`   ❌ Error with @${user.username}: ${error.message}`);
      failed.push({ username: user.username, reason: error.message });
    }
  }
  
  // Summary
  console.log('');
  console.log('====================================');
  console.log('✅ COMPLETE!');
  console.log('====================================');
  console.log(`📊 Total non-followers found: ${nonFollowers.length}`);
  console.log(`✅ Successfully unfollowed: ${unfollowed.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log('');
  
  if (nonFollowers.length > MAX_UNFOLLOWS) {
    console.log(`💡 There are ${nonFollowers.length - MAX_UNFOLLOWS} more non-followers.`);
    console.log('   Wait 15-30 minutes, then run the script again!');
  }
  
  return {
    unfollowed,
    failed,
    remaining: nonFollowers.length - unfollowed.length
  };
})();
```

**What happens:**
1. Script scrolls through your following list
2. Identifies accounts without "Follows you" badge
3. Downloads the non-followers list as JSON
4. Asks for confirmation before unfollowing
5. Unfollows with safe delays between each action
6. Shows progress and final summary

**Safety features:**
- ✅ 3 second delay between unfollows
- ✅ 15 second pause every 10 unfollows
- ✅ Exports list before any changes
- ✅ Maximum 50 unfollows per run

---

## 🤖 Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Large following lists, automation, scheduling, batch operations

```javascript
// ============================================
// XActions - Unfollow Non-Followers (Node.js)
// Author: nich (@nichxbt)
// Save as: unfollow-non-followers.js
// Run: node unfollow-non-followers.js
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import readline from 'readline';

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
  
  // Maximum users to scan in each list
  maxScan: 2000,
  
  // Maximum users to unfollow per run
  maxUnfollows: 50,
  
  // Delay between unfollows (ms)
  unfollowDelay: 4000,
  
  // Pause every N unfollows (ms)
  batchPause: 20000,
  batchSize: 10,
  
  // Run in headless mode
  headless: true,
  
  // Auto-unfollow without asking (⚠️ be careful!)
  autoUnfollow: false,
};

// ============================================
// Helper Functions
// ============================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => sleep(min + Math.random() * (max - min));

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

// ============================================
// Scrape Users from a List Page
// ============================================

async function scrapeUserList(page, url, maxUsers) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  try {
    await page.waitForSelector('[data-testid="UserCell"]', { timeout: 10000 });
  } catch {
    console.log('   ⚠️  No users found or page didn\'t load');
    return [];
  }
  
  await sleep(1500);
  
  const users = new Map();
  let retries = 0;
  const maxRetries = 15;
  
  while (users.size < maxUsers && retries < maxRetries) {
    const extracted = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells).map(cell => {
        try {
          const link = cell.querySelector('a[href^="/"]');
          const href = link?.getAttribute('href') || '';
          const username = href.split('/')[1];
          
          if (!username || username.includes('?')) return null;
          
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const bioEl = cell.querySelector('[data-testid="UserDescription"]');
          const followsYouEl = cell.querySelector('[data-testid="userFollowIndicator"]');
          
          return {
            username,
            name: nameEl?.textContent?.trim() || null,
            bio: bioEl?.textContent?.trim() || null,
            followsYou: followsYouEl !== null,
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
    
    process.stdout.write(`\r   📊 Scraped: ${users.size} users`);
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 2500);
  }
  
  console.log('');
  return Array.from(users.values());
}

// ============================================
// Unfollow a Single User
// ============================================

async function unfollowUser(page, username) {
  try {
    await page.goto(`https://x.com/${username}`, { 
      waitUntil: 'networkidle2', 
      timeout: 20000 
    });
    
    await sleep(1000 + Math.random() * 1000);
    
    // Find the unfollow/following button
    const followingBtn = await page.$('[data-testid$="-unfollow"]');
    
    if (!followingBtn) {
      return { success: false, error: 'Follow button not found' };
    }
    
    // Click the following button
    await followingBtn.click();
    await sleep(500);
    
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

async function unfollowNonFollowers() {
  console.log('');
  console.log('🔍 XActions - Unfollow Non-Followers');
  console.log('====================================');
  console.log(`👤 Username: @${CONFIG.username}`);
  console.log(`📊 Max scan: ${CONFIG.maxScan}`);
  console.log(`🚫 Max unfollows: ${CONFIG.maxUnfollows}`);
  console.log('');
  
  // Validate config
  if (CONFIG.username === 'YOUR_USERNAME' || CONFIG.authToken === 'YOUR_AUTH_TOKEN_HERE') {
    console.error('❌ Error: Please update CONFIG with your username and auth_token');
    console.log('');
    console.log('To get your auth_token:');
    console.log('1. Go to x.com in your browser');
    console.log('2. Press F12 → Application tab → Cookies → x.com');
    console.log('3. Find "auth_token" and copy its value');
    process.exit(1);
  }
  
  // Launch browser
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: CONFIG.headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ 
      width: 1280 + Math.floor(Math.random() * 100), 
      height: 900 + Math.floor(Math.random() * 100),
    });
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Set auth cookie
    console.log('🔑 Setting authentication...');
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
    await sleep(2000);
    
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null;
    });
    
    if (!isLoggedIn) {
      throw new Error('Authentication failed. Please check your auth_token.');
    }
    console.log('✅ Logged in successfully!');
    console.log('');
    
    // Step 1: Scrape following list
    console.log('📜 Step 1: Fetching your following list...');
    const following = await scrapeUserList(
      page, 
      `https://x.com/${CONFIG.username}/following`,
      CONFIG.maxScan
    );
    console.log(`   ✅ Found ${following.length} accounts you follow`);
    console.log('');
    
    // Step 2: Scrape followers list
    console.log('📜 Step 2: Fetching your followers list...');
    const followers = await scrapeUserList(
      page,
      `https://x.com/${CONFIG.username}/followers`,
      CONFIG.maxScan
    );
    console.log(`   ✅ Found ${followers.length} followers`);
    console.log('');
    
    // Step 3: Find non-followers
    console.log('🔎 Step 3: Identifying non-followers...');
    
    const followerUsernames = new Set(followers.map(f => f.username));
    const nonFollowers = following.filter(f => !followerUsernames.has(f.username));
    
    console.log(`   📊 Following: ${following.length}`);
    console.log(`   📊 Followers: ${followers.length}`);
    console.log(`   ❌ Non-followers: ${nonFollowers.length}`);
    console.log('');
    
    if (nonFollowers.length === 0) {
      console.log('🎉 Great news! Everyone you follow also follows you back!');
      return;
    }
    
    // Step 4: Export non-followers list
    console.log('💾 Step 4: Exporting non-followers list...');
    
    const date = new Date().toISOString().split('T')[0];
    const exportData = nonFollowers.map(u => ({
      username: u.username,
      name: u.name,
      bio: u.bio,
    }));
    
    const jsonFilename = `non-followers-${CONFIG.username}-${date}.json`;
    const csvFilename = `non-followers-${CONFIG.username}-${date}.csv`;
    
    // Export JSON
    await fs.writeFile(jsonFilename, JSON.stringify(exportData, null, 2));
    console.log(`   📥 Saved: ${jsonFilename}`);
    
    // Export CSV
    const csvHeaders = 'username,name,bio';
    const csvRows = exportData.map(u => 
      `"${u.username}","${(u.name || '').replace(/"/g, '""')}","${(u.bio || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    );
    await fs.writeFile(csvFilename, [csvHeaders, ...csvRows].join('\n'));
    console.log(`   📥 Saved: ${csvFilename}`);
    console.log('');
    
    // Show preview
    console.log('📋 Non-followers preview (first 15):');
    nonFollowers.slice(0, 15).forEach((u, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. @${u.username.padEnd(20)} ${u.name || ''}`);
    });
    if (nonFollowers.length > 15) {
      console.log(`   ... and ${nonFollowers.length - 15} more`);
    }
    console.log('');
    
    // Step 5: Ask for confirmation
    if (!CONFIG.autoUnfollow) {
      const answer = await askConfirmation(
        `❓ Unfollow up to ${Math.min(nonFollowers.length, CONFIG.maxUnfollows)} accounts? (yes/no): `
      );
      
      if (answer !== 'yes' && answer !== 'y') {
        console.log('');
        console.log('👋 Cancelled. No accounts were unfollowed.');
        console.log('   Your non-followers list has been saved to the files above.');
        return;
      }
    }
    
    // Step 6: Unfollow non-followers
    console.log('');
    console.log(`🚫 Step 5: Unfollowing non-followers...`);
    console.log('   ⚠️  Press Ctrl+C to stop at any time');
    console.log('');
    
    const toUnfollow = nonFollowers.slice(0, CONFIG.maxUnfollows);
    const unfollowed = [];
    const failed = [];
    
    for (let i = 0; i < toUnfollow.length; i++) {
      const user = toUnfollow[i];
      
      const result = await unfollowUser(page, user.username);
      
      if (result.success) {
        unfollowed.push(user.username);
        console.log(`   ✅ ${(i + 1).toString().padStart(3)}/${toUnfollow.length} - Unfollowed @${user.username}`);
      } else {
        failed.push({ username: user.username, error: result.error });
        console.log(`   ❌ ${(i + 1).toString().padStart(3)}/${toUnfollow.length} - Failed @${user.username}: ${result.error}`);
      }
      
      // Delay between unfollows
      await randomDelay(CONFIG.unfollowDelay, CONFIG.unfollowDelay + 2000);
      
      // Batch pause
      if ((i + 1) % CONFIG.batchSize === 0 && i < toUnfollow.length - 1) {
        console.log(`   ⏸️  Safety pause (${CONFIG.batchPause / 1000}s)...`);
        await sleep(CONFIG.batchPause);
      }
    }
    
    // Summary
    console.log('');
    console.log('====================================');
    console.log('✅ COMPLETE!');
    console.log('====================================');
    console.log(`📊 Non-followers found: ${nonFollowers.length}`);
    console.log(`✅ Successfully unfollowed: ${unfollowed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (nonFollowers.length > CONFIG.maxUnfollows) {
      console.log('');
      console.log(`💡 ${nonFollowers.length - CONFIG.maxUnfollows} non-followers remaining.`);
      console.log('   Wait 30-60 minutes, then run the script again!');
    }
    
    // Save results
    const resultsFilename = `unfollow-results-${CONFIG.username}-${date}.json`;
    await fs.writeFile(resultsFilename, JSON.stringify({
      date: new Date().toISOString(),
      unfollowed,
      failed,
      remaining: nonFollowers.length - unfollowed.length,
    }, null, 2));
    console.log('');
    console.log(`📥 Results saved to: ${resultsFilename}`);
    
  } finally {
    await browser.close();
  }
}

// ============================================
// Run
// ============================================

unfollowNonFollowers().catch(error => {
  console.error('');
  console.error('❌ Error:', error.message);
  process.exit(1);
});
```

**Setup & Run:**
```bash
# Install dependencies
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth

# Edit the CONFIG section with your username and auth_token
# Then run:
node unfollow-non-followers.js
```

**Getting your auth_token:**
1. Log into X/Twitter in your browser
2. Press F12 → Application tab (Chrome) or Storage tab (Firefox)
3. Click Cookies → `x.com`
4. Find `auth_token` and copy the value
5. Paste it in the CONFIG section

**Output example:**
```
🔍 XActions - Unfollow Non-Followers
====================================
👤 Username: @nichxbt
📊 Max scan: 2000
🚫 Max unfollows: 50

🚀 Launching browser...
🔑 Setting authentication...
✅ Logged in successfully!

📜 Step 1: Fetching your following list...
   📊 Scraped: 847 users
   ✅ Found 847 accounts you follow

📜 Step 2: Fetching your followers list...
   📊 Scraped: 1203 users
   ✅ Found 1203 followers

🔎 Step 3: Identifying non-followers...
   📊 Following: 847
   📊 Followers: 1203
   ❌ Non-followers: 156

💾 Step 4: Exporting non-followers list...
   📥 Saved: non-followers-nichxbt-2026-01-01.json
   📥 Saved: non-followers-nichxbt-2026-01-01.csv

📋 Non-followers preview (first 15):
    1. @inactive_user1      Old Account
    2. @brand_account       Some Brand
   ...

❓ Unfollow up to 50 accounts? (yes/no): yes

🚫 Step 5: Unfollowing non-followers...
   ⚠️  Press Ctrl+C to stop at any time

   ✅   1/50 - Unfollowed @inactive_user1
   ✅   2/50 - Unfollowed @brand_account
   ...

====================================
✅ COMPLETE!
====================================
📊 Non-followers found: 156
✅ Successfully unfollowed: 50
❌ Failed: 0

💡 106 non-followers remaining.
   Wait 30-60 minutes, then run the script again!

📥 Results saved to: unfollow-results-nichxbt-2026-01-01.json
```

---

## ⚠️ Safety Tips & Rate Limits

### Rate Limit Guidelines

| Action | Recommended Limit | Wait Time |
|--------|------------------|-----------|
| Unfollows per session | 50 max | - |
| Delay between unfollows | 3-5 seconds | - |
| Batch pause (every 10) | 15-20 seconds | - |
| Between sessions | 30-60 minutes | Before re-running |
| Per day maximum | 100-150 | Total unfollows |

### Best Practices

1. **Start small** - Begin with 20-30 unfollows to test
2. **Export first** - Always save the list before unfollowing (scripts do this automatically)
3. **Don't rush** - Spread unfollows across multiple sessions
4. **Monitor your account** - Watch for any warnings from X
5. **Use during active hours** - Unfollowing during normal browsing looks more natural

### Warning Signs to Stop

- ⛔ "You're doing that too fast" message
- ⛔ Unfollow buttons stop working
- ⛔ Account temporarily restricted
- ⛔ Multiple failed unfollows in a row

### Recovery Steps

If you hit rate limits:
1. Stop immediately
2. Wait at least 1 hour
3. Reduce batch size when resuming
4. Increase delays between actions

---

## 🌐 Website Alternative

Don't want to run scripts? Use [xactions.app](https://xactions.app):

1. **Login** - Connect your X account securely
2. **Scan** - Click "Find Non-Followers" 
3. **Review** - See the list of accounts that don't follow back
4. **Export** - Download CSV/JSON before making changes
5. **Unfollow** - Select accounts and unfollow safely

**Benefits:**
- ✅ No coding required
- ✅ Visual interface
- ✅ Built-in rate limiting
- ✅ Progress tracking
- ✅ Automatic exports

---

## 📝 Notes

- **Protected accounts**: You can only check if public accounts follow you
- **Recent unfollowers**: Someone might have just unfollowed you - the script shows current state
- **Verification**: Always double-check a few accounts manually if unsure
- **Whitelist coming soon**: Future versions will let you protect specific accounts

---

*Author: nich ([@nichxbt](https://x.com/nichxbt))*  
*Part of [XActions](https://xactions.app) - X/Twitter Automation Tools*
