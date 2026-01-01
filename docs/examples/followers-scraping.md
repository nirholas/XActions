# Followers Scraping

Scrape the complete followers list from any public X/Twitter account.

## What You Get

- Username and display name
- Bio/description
- Verified status
- Avatar URL
- Export to JSON or CSV

---

## Example 1: Browser Console (Quick)

**Best for:** Scraping up to ~500 followers quickly

```javascript
// ============================================
// XActions - Followers Scraper (Browser Console)
// Go to: x.com/USERNAME/followers
// Open console (F12), paste this
// ============================================

(async () => {
  const TARGET_COUNT = 500; // Adjust as needed
  const SCROLL_DELAY = 1500; // ms between scrolls
  
  console.log('🔍 Starting followers scrape...');
  console.log(`📊 Target: ${TARGET_COUNT} followers`);
  
  const followers = new Map();
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
        
        users.push({
          username,
          name,
          bio,
          verified,
          avatar,
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
  while (followers.size < TARGET_COUNT && retries < maxRetries) {
    // Extract visible users
    const users = extractUsers();
    const prevSize = followers.size;
    
    // Add to map (dedupes automatically)
    users.forEach(user => {
      if (!followers.has(user.username)) {
        followers.set(user.username, user);
      }
    });
    
    // Progress update
    console.log(`📈 Scraped: ${followers.size} followers`);
    
    // Check if we're stuck
    if (followers.size === prevSize) {
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
  const result = Array.from(followers.values());
  
  // Summary
  console.log('\n✅ Scraping complete!');
  console.log(`📊 Total followers scraped: ${result.length}`);
  console.log(`✓ Verified: ${result.filter(u => u.verified).length}`);
  console.log(`✓ With bio: ${result.filter(u => u.bio).length}`);
  
  // Copy to clipboard
  const json = JSON.stringify(result, null, 2);
  await navigator.clipboard.writeText(json);
  console.log('\n📋 Copied to clipboard!');
  
  // Also log for download
  console.log('\n💾 Data (right-click → Copy object):');
  console.log(result);
  
  // Create downloadable file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `followers-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  console.log('📥 Download started!');
  
  return result;
})();
```

**What happens:**
1. Script scrolls through the followers list
2. Extracts data from each user card
3. Deduplicates automatically
4. Shows progress in console
5. Downloads JSON file automatically
6. Copies data to clipboard

---

## Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Large follower lists, automation, batch jobs

```javascript
// ============================================
// XActions - Followers Scraper (Node.js)
// Save as: scrape-followers.js
// Run: node scrape-followers.js elonmusk 1000
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';

puppeteer.use(StealthPlugin());

/**
 * Scrape followers for a Twitter/X account
 * @param {string} username - Account to scrape followers from
 * @param {Object} options - Configuration
 * @returns {Array} Array of follower objects
 */
async function scrapeFollowers(username, options = {}) {
  const {
    limit = 1000,
    headless = true,
    authToken = null,
    onProgress = null,
    scrollDelay = 1500,
    maxRetries = 10,
  } = options;

  console.log(`🔍 Scraping followers for @${username}`);
  console.log(`📊 Limit: ${limit}`);

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
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

    // Set auth cookie if provided
    if (authToken) {
      await page.setCookie({
        name: 'auth_token',
        value: authToken,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
    }

    // Navigate to followers page
    await page.goto(`https://x.com/${username}/followers`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for user cells to appear
    await page.waitForSelector('[data-testid="UserCell"]', { timeout: 10000 });
    
    // Small delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    const followers = new Map();
    let retries = 0;

    // Scraping loop
    while (followers.size < limit && retries < maxRetries) {
      // Extract users from page
      const users = await page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).map(cell => {
          try {
            const link = cell.querySelector('a[href^="/"]');
            const href = link?.getAttribute('href') || '';
            const username = href.split('/')[1];
            
            if (!username || username.includes('?')) return null;
            
            const nameEl = cell.querySelector('[dir="ltr"] > span');
            const bioEl = cell.querySelector('[data-testid="UserDescription"]');
            const avatarEl = cell.querySelector('img[src*="profile_images"]');
            const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');
            
            return {
              username,
              name: nameEl?.textContent?.trim() || null,
              bio: bioEl?.textContent?.trim() || null,
              verified: !!verifiedEl,
              avatar: avatarEl?.src || null,
            };
          } catch {
            return null;
          }
        }).filter(Boolean);
      });

      const prevSize = followers.size;
      
      // Add to map
      users.forEach(user => {
        if (!followers.has(user.username)) {
          followers.set(user.username, user);
        }
      });

      // Progress callback
      if (onProgress) {
        onProgress({
          scraped: followers.size,
          limit,
          percent: Math.round((followers.size / limit) * 100),
        });
      }

      // Check if stuck
      if (followers.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Random delay
      await new Promise(r => setTimeout(r, scrollDelay + Math.random() * 500));
    }

    const result = Array.from(followers.values()).slice(0, limit);
    
    console.log(`✅ Scraped ${result.length} followers`);
    return result;

  } finally {
    await browser.close();
  }
}

/**
 * Export to JSON
 */
async function exportJSON(data, filename) {
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  console.log(`💾 Saved to ${filename}`);
}

/**
 * Export to CSV
 */
async function exportCSV(data, filename) {
  const headers = ['username', 'name', 'bio', 'verified', 'avatar'];
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      }
      return val ?? '';
    }).join(',')
  );
  
  const csv = [headers.join(','), ...rows].join('\n');
  await fs.writeFile(filename, csv);
  console.log(`💾 Saved to ${filename}`);
}

// ============================================
// CLI Usage
// ============================================

const args = process.argv.slice(2);
const username = args[0];
const limit = parseInt(args[1]) || 500;

if (!username) {
  console.log(`
Usage: node scrape-followers.js <username> [limit]

Examples:
  node scrape-followers.js elonmusk 1000
  node scrape-followers.js naval 500
  node scrape-followers.js pmarca

Options:
  username  - Twitter username (without @)
  limit     - Maximum followers to scrape (default: 500)
`);
  process.exit(1);
}

// Run with progress indicator
console.log('');
scrapeFollowers(username, {
  limit,
  onProgress: ({ scraped, limit, percent }) => {
    process.stdout.write(`\r📈 Progress: ${scraped}/${limit} (${percent}%)`);
  },
})
  .then(async (followers) => {
    console.log('\n');
    
    // Stats
    const verified = followers.filter(u => u.verified).length;
    const withBio = followers.filter(u => u.bio).length;
    
    console.log('📊 Summary:');
    console.log(`   Total: ${followers.length}`);
    console.log(`   Verified: ${verified}`);
    console.log(`   With bio: ${withBio}`);
    console.log('');
    
    // Export both formats
    const date = new Date().toISOString().split('T')[0];
    await exportJSON(followers, `${username}-followers-${date}.json`);
    await exportCSV(followers, `${username}-followers-${date}.csv`);
    
    // Show sample
    console.log('\n📋 Sample (first 5):');
    followers.slice(0, 5).forEach(f => {
      console.log(`   @${f.username} ${f.verified ? '✓' : ''} - ${f.name || 'No name'}`);
    });
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
```

**Run it:**
```bash
# Install dependencies first
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth

# Scrape 1000 followers
node scrape-followers.js elonmusk 1000
```

**Output:**
```
🔍 Scraping followers for @elonmusk
📊 Limit: 1000

📈 Progress: 1000/1000 (100%)

📊 Summary:
   Total: 1000
   Verified: 127
   With bio: 834

💾 Saved to elonmusk-followers-2026-01-01.json
💾 Saved to elonmusk-followers-2026-01-01.csv

📋 Sample (first 5):
   @user1 ✓ - John Doe
   @user2 - Jane Smith
   @user3 ✓ - Bob Wilson
   @user4 - Alice Brown
   @user5 - Charlie Davis
```

---

## Advanced: Compare Followers Over Time

```javascript
// compare-followers.js
import fs from 'fs/promises';

async function compareFollowers(oldFile, newFile) {
  const oldData = JSON.parse(await fs.readFile(oldFile, 'utf-8'));
  const newData = JSON.parse(await fs.readFile(newFile, 'utf-8'));
  
  const oldSet = new Set(oldData.map(u => u.username));
  const newSet = new Set(newData.map(u => u.username));
  
  const lost = oldData.filter(u => !newSet.has(u.username));
  const gained = newData.filter(u => !oldSet.has(u.username));
  
  console.log(`\n🚨 Lost ${lost.length} followers:`);
  lost.forEach(u => console.log(`   @${u.username}`));
  
  console.log(`\n🎉 Gained ${gained.length} followers:`);
  gained.forEach(u => console.log(`   @${u.username}`));
}

// Usage: node compare-followers.js old.json new.json
```

---

## Tips

### Performance
- 500 followers: ~2 minutes
- 1000 followers: ~4 minutes
- 5000 followers: ~15-20 minutes

### Rate Limits
- Don't scrape the same account more than once per hour
- Add random delays between different accounts

### Large Accounts
For accounts with 100K+ followers:
```javascript
const followers = await scrapeFollowers('bigaccount', {
  limit: 10000,
  scrollDelay: 2000, // Slower scrolling
});
```

---

## Website Alternative

Don't want to code? Use [xactions.app](https://xactions.app):
1. Login with your X account
2. Enter any username
3. Click "Scrape Followers"
4. Wait for completion
5. Download CSV or JSON
