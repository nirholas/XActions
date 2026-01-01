# 👥 Following Scraping

Scrape the complete list of accounts that any public X/Twitter user follows — with mutual follow detection.

> **Author:** nich ([@nichxbt](https://x.com/nichxbt))

---

## 📦 What You Get

When you scrape a user's following list, you get:

| Field | Description |
|-------|-------------|
| `username` | The @handle of the followed account |
| `name` | Display name |
| `bio` | Profile bio/description |
| `verified` | Blue checkmark status |
| `avatar` | Profile image URL |
| `followsBack` | Whether this account follows the target user back |

The **`followsBack`** indicator is powerful — it lets you instantly identify:
- ✅ **Mutual follows** (they follow each other)
- ❌ **One-way follows** (target follows them, but they don't follow back)

---

## 🖥️ Example 1: Browser Console (Quick)

**Best for:** Scraping up to ~500 following quickly from your browser

### Instructions

1. Go to `x.com/USERNAME/following` (replace USERNAME with target)
2. Open DevTools (F12 or Cmd+Opt+I)
3. Go to Console tab
4. Paste the code below and press Enter

```javascript
// ============================================
// XActions - Following Scraper (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/USERNAME/following
// Open console (F12), paste this entire script
// ============================================

(async () => {
  const TARGET_COUNT = 500; // Adjust as needed
  const SCROLL_DELAY = 1500; // ms between scrolls
  
  console.log('🔍 Starting following scrape...');
  console.log(`📊 Target: ${TARGET_COUNT} accounts`);
  
  const following = new Map();
  let retries = 0;
  const maxRetries = 10;
  
  // Helper to extract user data from cells
  const extractUsers = () => {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const users = [];
    
    cells.forEach(cell => {
      try {
        // Get username from link
        const link = cell.querySelector('a[href^="/"]');
        const href = link?.getAttribute('href') || '';
        const username = href.split('/')[1];
        
        // Skip if invalid or query params
        if (!username || username.includes('?')) return;
        
        // Get display name
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const name = nameEl?.textContent?.trim() || null;
        
        // Get bio
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || null;
        
        // Check verified status
        const verified = !!cell.querySelector('svg[aria-label*="Verified"]');
        
        // Get avatar
        const avatarEl = cell.querySelector('img[src*="profile_images"]');
        const avatar = avatarEl?.src || null;
        
        // Check if they follow back (look for "Follows you" badge)
        const followsBackEl = cell.querySelector('[data-testid="userFollowIndicator"]');
        const followsBackText = cell.textContent?.includes('Follows you');
        const followsBack = !!(followsBackEl || followsBackText);
        
        users.push({
          username,
          name,
          bio,
          verified,
          avatar,
          followsBack,
        });
      } catch (e) {
        // Skip malformed cells
      }
    });
    
    return users;
  };
  
  // Sleep helper
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Main scraping loop
  while (following.size < TARGET_COUNT && retries < maxRetries) {
    // Extract visible users
    const users = extractUsers();
    const prevSize = following.size;
    
    // Add to map (dedupes automatically)
    users.forEach(user => {
      if (!following.has(user.username)) {
        following.set(user.username, user);
      }
    });
    
    // Progress update
    const mutualCount = Array.from(following.values()).filter(u => u.followsBack).length;
    console.log(`📈 Scraped: ${following.size} following (${mutualCount} mutual)`);
    
    // Check if we're stuck
    if (following.size === prevSize) {
      retries++;
      console.log(`⏳ No new users found (retry ${retries}/${maxRetries})`);
    } else {
      retries = 0;
    }
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  // Convert to array
  const result = Array.from(following.values());
  
  // Calculate stats
  const mutualFollows = result.filter(u => u.followsBack);
  const oneWayFollows = result.filter(u => !u.followsBack);
  const verifiedCount = result.filter(u => u.verified).length;
  const withBioCount = result.filter(u => u.bio).length;
  
  // Summary
  console.log('\n✅ Scraping complete!');
  console.log('━'.repeat(40));
  console.log(`📊 Total following scraped: ${result.length}`);
  console.log(`🤝 Mutual follows: ${mutualFollows.length} (${Math.round(mutualFollows.length / result.length * 100)}%)`);
  console.log(`➡️  One-way follows: ${oneWayFollows.length} (${Math.round(oneWayFollows.length / result.length * 100)}%)`);
  console.log(`✓ Verified: ${verifiedCount}`);
  console.log(`✓ With bio: ${withBioCount}`);
  console.log('━'.repeat(40));
  
  // Copy to clipboard
  const json = JSON.stringify(result, null, 2);
  await navigator.clipboard.writeText(json);
  console.log('\n📋 Full data copied to clipboard!');
  
  // Also expose data for inspection
  console.log('\n💾 Data objects (right-click → Copy object):');
  console.log('All following:', result);
  console.log('Mutual follows:', mutualFollows);
  console.log('One-way follows:', oneWayFollows);
  
  // Create downloadable file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `following-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  console.log('\n📥 Download started!');
  
  // Return for further use in console
  return {
    all: result,
    mutual: mutualFollows,
    oneWay: oneWayFollows,
    stats: {
      total: result.length,
      mutual: mutualFollows.length,
      oneWay: oneWayFollows.length,
      verified: verifiedCount,
      withBio: withBioCount,
    }
  };
})();
```

### What Happens

1. 🔄 Script scrolls through the following list automatically
2. 📊 Extracts data from each user card
3. 🔍 Detects "Follows you" badge for each account
4. 🔁 Deduplicates automatically
5. 📈 Shows live progress with mutual follow count
6. 📥 Downloads JSON file automatically
7. 📋 Copies data to clipboard

### Sample Output

```
🔍 Starting following scrape...
📊 Target: 500 accounts
📈 Scraped: 47 following (12 mutual)
📈 Scraped: 89 following (31 mutual)
📈 Scraped: 156 following (52 mutual)
...
📈 Scraped: 500 following (187 mutual)

✅ Scraping complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total following scraped: 500
🤝 Mutual follows: 187 (37%)
➡️  One-way follows: 313 (63%)
✓ Verified: 45
✓ With bio: 412
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Full data copied to clipboard!

📥 Download started!
```

---

## 🚀 Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Large following lists, automation, scheduled jobs, exporting to JSON/CSV

### Installation

```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

### Full Script

Save as `scrape-following.js`:

```javascript
// ============================================
// XActions - Following Scraper (Node.js)
// Author: nich (@nichxbt)
// 
// Save as: scrape-following.js
// Run: node scrape-following.js <username> [limit]
// Example: node scrape-following.js elonmusk 1000
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Scrape the accounts that a Twitter/X user follows
 * @param {string} username - Account to scrape following from
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of following user objects
 */
async function scrapeFollowing(username, options = {}) {
  const {
    limit = 1000,
    headless = true,
    authToken = null,
    onProgress = null,
    scrollDelay = 1500,
    maxRetries = 10,
    timeout = 30000,
  } = options;

  console.log(`\n🔍 Scraping following for @${username}`);
  console.log(`📊 Limit: ${limit}`);
  console.log(`🕐 Started: ${new Date().toLocaleTimeString()}\n`);

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set realistic viewport with slight randomization
    await page.setViewport({ 
      width: 1280 + Math.floor(Math.random() * 100), 
      height: 800 + Math.floor(Math.random() * 100),
    });
    
    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set auth cookie if provided (for private accounts or rate limit bypass)
    if (authToken) {
      await page.setCookie({
        name: 'auth_token',
        value: authToken,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
      console.log('🔐 Auth token set');
    }

    // Navigate to following page
    const url = `https://x.com/${username}/following`;
    console.log(`🌐 Navigating to ${url}`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait for user cells to appear
    try {
      await page.waitForSelector('[data-testid="UserCell"]', { timeout: 10000 });
    } catch (e) {
      // Check if account exists or is private
      const pageContent = await page.content();
      if (pageContent.includes('This account doesn't exist')) {
        throw new Error(`Account @${username} does not exist`);
      }
      if (pageContent.includes('These posts are protected')) {
        throw new Error(`Account @${username} is private. Provide authToken to access.`);
      }
      throw new Error('Could not load following list. Page may have changed or be rate limited.');
    }
    
    // Small random delay to mimic human behavior
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    const following = new Map();
    let retries = 0;

    // Main scraping loop
    while (following.size < limit && retries < maxRetries) {
      // Extract users from page
      const users = await page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).map(cell => {
          try {
            // Get username from profile link
            const link = cell.querySelector('a[href^="/"]');
            const href = link?.getAttribute('href') || '';
            const username = href.split('/')[1];
            
            // Skip if invalid username
            if (!username || username.includes('?') || username.includes('/')) return null;
            
            // Get display name
            const nameEl = cell.querySelector('[dir="ltr"] > span');
            const name = nameEl?.textContent?.trim() || null;
            
            // Get bio
            const bioEl = cell.querySelector('[data-testid="UserDescription"]');
            const bio = bioEl?.textContent?.trim() || null;
            
            // Get avatar URL
            const avatarEl = cell.querySelector('img[src*="profile_images"]');
            const avatar = avatarEl?.src || null;
            
            // Check verified status
            const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');
            const verified = !!verifiedEl;
            
            // Check if they follow back
            // Look for "Follows you" indicator
            const followsBackIndicator = cell.querySelector('[data-testid="userFollowIndicator"]');
            const cellText = cell.textContent || '';
            const followsBack = !!(followsBackIndicator || cellText.includes('Follows you'));
            
            return {
              username,
              name,
              bio,
              verified,
              avatar,
              followsBack,
              scrapedAt: new Date().toISOString(),
            };
          } catch {
            return null;
          }
        }).filter(Boolean);
      });

      const prevSize = following.size;
      
      // Add to map (automatically dedupes by username)
      users.forEach(user => {
        if (!following.has(user.username)) {
          following.set(user.username, user);
        }
      });

      // Fire progress callback if provided
      if (onProgress) {
        const current = Array.from(following.values());
        const mutualCount = current.filter(u => u.followsBack).length;
        onProgress({
          scraped: following.size,
          limit,
          percent: Math.round((following.size / limit) * 100),
          mutual: mutualCount,
        });
      }

      // Check if we're stuck (no new users found)
      if (following.size === prevSize) {
        retries++;
        // Longer wait when stuck
        await new Promise(r => setTimeout(r, scrollDelay + 1000));
      } else {
        retries = 0;
      }

      // Scroll down to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Random delay between scrolls
      await new Promise(r => setTimeout(r, scrollDelay + Math.random() * 500));
    }

    // Convert to array and limit
    const result = Array.from(following.values()).slice(0, limit);
    
    // Calculate final stats
    const mutualCount = result.filter(u => u.followsBack).length;
    const oneWayCount = result.length - mutualCount;
    
    console.log(`\n✅ Scraped ${result.length} following`);
    console.log(`🤝 Mutual: ${mutualCount} | ➡️  One-way: ${oneWayCount}`);
    
    return result;

  } finally {
    await browser.close();
  }
}

/**
 * Export data to JSON file
 * @param {Array} data - Data to export
 * @param {string} filename - Output filename
 */
async function exportJSON(data, filename) {
  const output = {
    exportedAt: new Date().toISOString(),
    count: data.length,
    mutualCount: data.filter(u => u.followsBack).length,
    oneWayCount: data.filter(u => !u.followsBack).length,
    data,
  };
  
  await fs.writeFile(filename, JSON.stringify(output, null, 2));
  console.log(`💾 Saved JSON to ${filename}`);
}

/**
 * Export data to CSV file
 * @param {Array} data - Data to export
 * @param {string} filename - Output filename
 */
async function exportCSV(data, filename) {
  const headers = ['username', 'name', 'bio', 'verified', 'followsBack', 'avatar', 'scrapedAt'];
  
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'string') {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const escaped = val.replace(/"/g, '""').replace(/\n/g, ' ');
      if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
        return `"${escaped}"`;
      }
      return escaped;
    }
    return String(val);
  };
  
  const rows = data.map(row => 
    headers.map(h => escapeCSV(row[h])).join(',')
  );
  
  const csv = [headers.join(','), ...rows].join('\n');
  await fs.writeFile(filename, csv);
  console.log(`💾 Saved CSV to ${filename}`);
}

/**
 * Export only mutual follows
 */
async function exportMutualOnly(data, baseFilename) {
  const mutuals = data.filter(u => u.followsBack);
  const jsonFile = `${baseFilename}-mutuals.json`;
  const csvFile = `${baseFilename}-mutuals.csv`;
  
  await exportJSON(mutuals, jsonFile);
  await exportCSV(mutuals, csvFile);
  
  console.log(`\n🤝 Exported ${mutuals.length} mutual follows separately`);
}

/**
 * Export only one-way follows (they don't follow back)
 */
async function exportOneWayOnly(data, baseFilename) {
  const oneWay = data.filter(u => !u.followsBack);
  const jsonFile = `${baseFilename}-oneway.json`;
  const csvFile = `${baseFilename}-oneway.csv`;
  
  await exportJSON(oneWay, jsonFile);
  await exportCSV(oneWay, csvFile);
  
  console.log(`\n➡️  Exported ${oneWay.length} one-way follows separately`);
}

// ============================================
// CLI Execution
// ============================================

const args = process.argv.slice(2);
const username = args[0];
const limit = parseInt(args[1]) || 500;
const exportType = args[2] || 'all'; // 'all', 'mutual', 'oneway'

if (!username) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           XActions - Following Scraper                       ║
║           Author: nich (@nichxbt)                            ║
╚══════════════════════════════════════════════════════════════╝

Usage: node scrape-following.js <username> [limit] [export-type]

Arguments:
  username     Twitter/X username (without @)
  limit        Maximum accounts to scrape (default: 500)
  export-type  What to export: 'all', 'mutual', 'oneway' (default: all)

Examples:
  node scrape-following.js elonmusk 1000
  node scrape-following.js naval 500 mutual
  node scrape-following.js pmarca 200 oneway
  node scrape-following.js vitalikbuterin

Output Files:
  {username}-following-{date}.json     Full data as JSON
  {username}-following-{date}.csv      Full data as CSV
  {username}-following-{date}-mutuals.json   Mutual follows only
  {username}-following-{date}-oneway.json    One-way follows only

Environment Variables:
  X_AUTH_TOKEN    Your X auth token for private accounts
`);
  process.exit(1);
}

// Get auth token from environment if available
const authToken = process.env.X_AUTH_TOKEN || null;

// Run the scraper with progress indicator
console.log('');
console.log('═'.repeat(60));

scrapeFollowing(username, {
  limit,
  authToken,
  onProgress: ({ scraped, limit, percent, mutual }) => {
    process.stdout.write(`\r📈 Progress: ${scraped}/${limit} (${percent}%) | 🤝 Mutual: ${mutual}`);
  },
})
  .then(async (following) => {
    console.log('\n');
    console.log('═'.repeat(60));
    
    // Calculate detailed stats
    const mutualFollows = following.filter(u => u.followsBack);
    const oneWayFollows = following.filter(u => !u.followsBack);
    const verified = following.filter(u => u.verified);
    const withBio = following.filter(u => u.bio);
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log('─'.repeat(40));
    console.log(`   Total scraped:    ${following.length}`);
    console.log(`   🤝 Mutual follows: ${mutualFollows.length} (${Math.round(mutualFollows.length / following.length * 100)}%)`);
    console.log(`   ➡️  One-way:        ${oneWayFollows.length} (${Math.round(oneWayFollows.length / following.length * 100)}%)`);
    console.log(`   ✓ Verified:       ${verified.length}`);
    console.log(`   ✓ With bio:       ${withBio.length}`);
    console.log('─'.repeat(40));
    
    // Generate base filename
    const date = new Date().toISOString().split('T')[0];
    const baseFilename = `${username}-following-${date}`;
    
    // Export based on type
    console.log('\n📁 Exporting files...\n');
    
    await exportJSON(following, `${baseFilename}.json`);
    await exportCSV(following, `${baseFilename}.csv`);
    
    if (exportType === 'all' || exportType === 'mutual') {
      await exportMutualOnly(following, baseFilename);
    }
    
    if (exportType === 'all' || exportType === 'oneway') {
      await exportOneWayOnly(following, baseFilename);
    }
    
    // Show sample data
    console.log('\n📋 Sample mutual follows (first 5):');
    mutualFollows.slice(0, 5).forEach(f => {
      console.log(`   @${f.username} ${f.verified ? '✓' : ''} - ${f.name || 'No name'}`);
    });
    
    console.log('\n📋 Sample one-way follows (first 5):');
    oneWayFollows.slice(0, 5).forEach(f => {
      console.log(`   @${f.username} ${f.verified ? '✓' : ''} - ${f.name || 'No name'}`);
    });
    
    console.log('\n✨ Done!\n');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
```

### Usage

```bash
# Basic usage - scrape 500 following
node scrape-following.js elonmusk

# Scrape 1000 following
node scrape-following.js elonmusk 1000

# Scrape and export only mutual follows
node scrape-following.js naval 500 mutual

# Scrape and export only one-way follows
node scrape-following.js pmarca 200 oneway

# Use with auth token for private accounts
X_AUTH_TOKEN="your_token_here" node scrape-following.js username 500
```

### Output

```
═══════════════════════════════════════════════════════════════

🔍 Scraping following for @elonmusk
📊 Limit: 1000
🕐 Started: 2:30:45 PM

🌐 Navigating to https://x.com/elonmusk/following
📈 Progress: 1000/1000 (100%) | 🤝 Mutual: 342

═══════════════════════════════════════════════════════════════

✅ Scraped 1000 following
🤝 Mutual: 342 | ➡️  One-way: 658

📊 Summary:
────────────────────────────────────────
   Total scraped:    1000
   🤝 Mutual follows: 342 (34%)
   ➡️  One-way:        658 (66%)
   ✓ Verified:       156
   ✓ With bio:       891
────────────────────────────────────────

📁 Exporting files...

💾 Saved JSON to elonmusk-following-2026-01-01.json
💾 Saved CSV to elonmusk-following-2026-01-01.csv

🤝 Exported 342 mutual follows separately
💾 Saved JSON to elonmusk-following-2026-01-01-mutuals.json
💾 Saved CSV to elonmusk-following-2026-01-01-mutuals.csv

➡️  Exported 658 one-way follows separately
💾 Saved JSON to elonmusk-following-2026-01-01-oneway.json
💾 Saved CSV to elonmusk-following-2026-01-01-oneway.csv

📋 Sample mutual follows (first 5):
   @kloris ✓ - Kloris Wong
   @jason ✓ - Jason Calacanis
   @pmarca ✓ - Marc Andreessen
   @naval - Naval Ravikant
   @balajis ✓ - Balaji Srinivasan

📋 Sample one-way follows (first 5):
   @SpaceX ✓ - SpaceX
   @Tesla ✓ - Tesla
   @boring_company - The Boring Company
   @neuralink ✓ - Neuralink
   @xAI ✓ - xAI

✨ Done!
```

---

## 💡 Use Cases

### 1. Finding Mutual Follows

Identify who has a reciprocal relationship:

```javascript
// After scraping, filter mutual follows
const mutuals = following.filter(u => u.followsBack);
console.log(`Found ${mutuals.length} mutual follows!`);

// Export just the usernames
const mutualUsernames = mutuals.map(u => `@${u.username}`);
```

### 2. Analyzing Someone's Network

Understand who an influencer or competitor follows:

```javascript
// Analyze verified accounts they follow
const verifiedFollowing = following.filter(u => u.verified);
console.log(`They follow ${verifiedFollowing.length} verified accounts`);

// Find accounts with specific keywords in bio
const cryptoAccounts = following.filter(u => 
  u.bio?.toLowerCase().includes('crypto') ||
  u.bio?.toLowerCase().includes('bitcoin') ||
  u.bio?.toLowerCase().includes('web3')
);
```

### 3. Find Potential Unfollows

Identify accounts that don't follow back (candidates for cleanup):

```javascript
// Get accounts that don't follow back
const notFollowingBack = following.filter(u => !u.followsBack);

console.log(`${notFollowingBack.length} accounts don't follow back`);
console.log('Consider unfollowing:');
notFollowingBack.forEach(u => console.log(`  @${u.username}`));
```

### 4. Compare Following Lists

Track changes over time:

```javascript
// compare-following.js
import fs from 'fs/promises';

async function compareFollowing(oldFile, newFile) {
  const oldData = JSON.parse(await fs.readFile(oldFile, 'utf-8'));
  const newData = JSON.parse(await fs.readFile(newFile, 'utf-8'));
  
  const oldSet = new Set(oldData.data.map(u => u.username));
  const newSet = new Set(newData.data.map(u => u.username));
  
  const unfollowed = oldData.data.filter(u => !newSet.has(u.username));
  const newlyFollowed = newData.data.filter(u => !oldSet.has(u.username));
  
  console.log(`\n🔴 Unfollowed ${unfollowed.length} accounts:`);
  unfollowed.forEach(u => console.log(`   @${u.username}`));
  
  console.log(`\n🟢 Newly followed ${newlyFollowed.length} accounts:`);
  newlyFollowed.forEach(u => console.log(`   @${u.username}`));
  
  // Check for mutual status changes
  const bothHave = newData.data.filter(u => oldSet.has(u.username));
  const lostMutual = bothHave.filter(newU => {
    const oldU = oldData.data.find(o => o.username === newU.username);
    return oldU?.followsBack && !newU.followsBack;
  });
  
  if (lostMutual.length > 0) {
    console.log(`\n⚠️  ${lostMutual.length} accounts stopped following back:`);
    lostMutual.forEach(u => console.log(`   @${u.username}`));
  }
}

// Usage: node compare-following.js old.json new.json
```

### 5. Build a Follow Recommendation Engine

Find accounts followed by multiple people you track:

```javascript
// Scrape following for multiple accounts, then find overlap
const followingLists = {
  'naval': navalFollowing,
  'balajis': balajiFollowing,
  'pmarca': pmarcaFollowing,
};

const followCounts = new Map();

Object.values(followingLists).forEach(list => {
  list.forEach(user => {
    const count = followCounts.get(user.username) || 0;
    followCounts.set(user.username, count + 1);
  });
});

// Find accounts followed by all three
const followedByAll = Array.from(followCounts.entries())
  .filter(([_, count]) => count === 3)
  .map(([username]) => username);

console.log('Accounts followed by all three:', followedByAll);
```

---

## 📊 Performance Tips

| Following Count | Estimated Time |
|-----------------|----------------|
| 100 | ~30 seconds |
| 500 | ~2-3 minutes |
| 1,000 | ~5-6 minutes |
| 5,000 | ~20-25 minutes |
| 10,000+ | ~45+ minutes |

### Optimizations

```javascript
// For large accounts, increase scroll delay to avoid rate limits
const following = await scrapeFollowing('largAccount', {
  limit: 10000,
  scrollDelay: 2500, // Slower, safer
});

// For faster scraping of smaller accounts
const following = await scrapeFollowing('smallAccount', {
  limit: 200,
  scrollDelay: 1000, // Faster
});
```

### Rate Limit Tips

- ⏱️ Don't scrape the same account more than once per hour
- 🔄 Add 5-10 second delays between different account scrapes
- 🔐 Use auth token for higher limits
- 🌙 Run large scrapes during off-peak hours

---

## 🌐 Website Alternative

Don't want to code? Use **[xactions.app](https://xactions.app)**:

1. 🔐 Login with your X account
2. 👤 Enter any public username
3. 📋 Click "Scrape Following"
4. ⏳ Wait for completion
5. 📥 Download as CSV or JSON
6. 🤝 Filter by mutual/one-way directly in the UI

**Features on xactions.app:**
- ✅ No coding required
- ✅ Cloud-based processing
- ✅ Automatic mutual detection
- ✅ Export to multiple formats
- ✅ Schedule recurring scrapes
- ✅ Compare historical data

---

## 🔗 Related Guides

- [Followers Scraping](followers-scraping.md) - Scrape who follows an account
- [Unfollow Non-Followers](unfollow-non-followers.md) - Clean up your following list
- [Profile Scraping](profile-scraping.md) - Get detailed profile information

---

<p align="center">
  <b>Built with ❤️ by <a href="https://x.com/nichxbt">@nichxbt</a></b><br>
  <sub>Part of the <a href="https://github.com/nirholas/xactions">XActions</a> toolkit</sub>
</p>
