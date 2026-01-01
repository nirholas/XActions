# 📋 List Members Scraping

Extract all members from any Twitter/X list - curated collections of accounts organized by topic, industry, or interest.

---

## 📦 What You Get

Scrape complete member data from any public X/Twitter list:

- **Username** - The @handle of each list member
- **Display name** - Full name as shown on profile
- **Bio/Description** - Profile bio text
- **Verified status** - Blue checkmark indicator
- **Avatar URL** - Profile image link
- **Follower count** - Number of followers (when available)
- **Export formats** - JSON and CSV ready for analysis

**Why scrape lists?**
- Lists are manually curated by users, often higher quality than random followers
- Find niche communities organized by experts
- Discover industry leaders grouped by topic
- Build targeted outreach lists
- Research competitor audiences

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Scraping lists with up to ~500 members quickly

**Steps:**
1. Go to any X/Twitter list page (e.g., `x.com/i/lists/123456789` or `x.com/username/lists/listname`)
2. Click on "Members" tab to view list members
3. Open browser console (F12 → Console tab)
4. Paste the script below and press Enter

```javascript
// ============================================
// XActions - List Members Scraper (Browser Console)
// Author: nich (@nichxbt)
// Go to: x.com/i/lists/LIST_ID (then click Members)
// Open console (F12), paste this
// ============================================

(async () => {
  // Configuration
  const TARGET_COUNT = 1000;        // Maximum members to scrape
  const SCROLL_DELAY = 1500;        // Delay between scrolls (ms)
  const MAX_RETRIES = 15;           // Stop if no new members found
  
  console.log('');
  console.log('📋 XActions - List Members Scraper');
  console.log('====================================');
  console.log(`🎯 Target: ${TARGET_COUNT} members`);
  console.log('');
  
  // Verify we're on a list page
  const isListPage = window.location.pathname.includes('/lists/') || 
                     window.location.pathname.includes('/i/lists/');
  
  if (!isListPage) {
    console.error('❌ Please navigate to a Twitter/X list page first!');
    console.log('👉 Example: x.com/i/lists/123456789');
    console.log('👉 Then click on the "Members" tab');
    return;
  }
  
  // Extract list info from page
  const listTitle = document.querySelector('h2[role="heading"]')?.textContent || 'Unknown List';
  console.log(`📌 List: ${listTitle}`);
  console.log('');
  
  const members = new Map();
  let retries = 0;
  
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
        
        // Skip if invalid or contains query params
        if (!username || username.includes('?') || username === 'i') return;
        
        // Get display name
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const name = nameEl?.textContent?.trim() || null;
        
        // Get bio/description
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || null;
        
        // Check verified status (blue checkmark)
        const verified = !!cell.querySelector('svg[aria-label*="Verified"]') ||
                        !!cell.querySelector('[data-testid="icon-verified"]');
        
        // Get avatar URL
        const avatarEl = cell.querySelector('img[src*="profile_images"]');
        const avatar = avatarEl?.src || null;
        
        // Try to get follower count if visible
        const statsText = cell.textContent || '';
        const followerMatch = statsText.match(/(\d+(?:\.\d+)?[KMB]?)\s*[Ff]ollowers?/);
        const followers = followerMatch ? followerMatch[1] : null;
        
        users.push({
          username,
          name,
          bio,
          verified,
          avatar,
          followers,
          scrapedAt: new Date().toISOString(),
        });
      } catch (e) {
        // Skip malformed cells
      }
    });
    
    return users;
  };
  
  // Sleep helper
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  console.log('🔄 Scrolling and extracting members...');
  console.log('');
  
  // Main scraping loop
  while (members.size < TARGET_COUNT && retries < MAX_RETRIES) {
    // Extract visible users
    const users = extractUsers();
    const prevSize = members.size;
    
    // Add to map (dedupes automatically by username)
    users.forEach(user => {
      if (!members.has(user.username)) {
        members.set(user.username, user);
      }
    });
    
    // Progress update
    if (members.size !== prevSize) {
      console.log(`📈 Scraped: ${members.size} members`);
    }
    
    // Check if we're stuck (no new members found)
    if (members.size === prevSize) {
      retries++;
      if (retries % 3 === 0) {
        console.log(`⏳ No new members found (retry ${retries}/${MAX_RETRIES})`);
      }
    } else {
      retries = 0;
    }
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  // Convert to array
  const result = Array.from(members.values());
  
  // Summary statistics
  console.log('');
  console.log('✅ Scraping complete!');
  console.log('====================================');
  console.log(`📊 Total members scraped: ${result.length}`);
  console.log(`✓ Verified accounts: ${result.filter(u => u.verified).length}`);
  console.log(`✓ With bio: ${result.filter(u => u.bio).length}`);
  console.log('');
  
  // Copy to clipboard
  const json = JSON.stringify(result, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    console.log('📋 Copied to clipboard!');
  } catch (e) {
    console.log('⚠️ Could not copy to clipboard (clipboard API blocked)');
  }
  
  // Create downloadable JSON file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeListTitle = listTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  a.download = `list-${safeListTitle}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  console.log('📥 JSON download started!');
  
  // Create downloadable CSV file
  const csvHeaders = ['username', 'name', 'bio', 'verified', 'followers', 'avatar'];
  const csvRows = result.map(row => 
    csvHeaders.map(h => {
      const val = row[h];
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      }
      return val ?? '';
    }).join(',')
  );
  const csv = [csvHeaders.join(','), ...csvRows].join('\n');
  
  const csvBlob = new Blob([csv], { type: 'text/csv' });
  const csvUrl = URL.createObjectURL(csvBlob);
  const csvLink = document.createElement('a');
  csvLink.href = csvUrl;
  csvLink.download = `list-${safeListTitle}-${new Date().toISOString().split('T')[0]}.csv`;
  csvLink.click();
  URL.revokeObjectURL(csvUrl);
  console.log('📥 CSV download started!');
  
  // Log data for manual access
  console.log('');
  console.log('💾 Data (right-click → Copy object):');
  console.log(result);
  
  // Show sample
  console.log('');
  console.log('📋 Sample (first 5 members):');
  result.slice(0, 5).forEach(m => {
    const badge = m.verified ? ' ✓' : '';
    console.log(`   @${m.username}${badge} - ${m.name || 'No name'}`);
  });
  
  return result;
})();
```

**What happens:**
1. Script scrolls through the list members page
2. Extracts data from each user card
3. Deduplicates automatically by username
4. Shows real-time progress in console
5. Downloads both JSON and CSV files
6. Copies data to clipboard

---

## 🖥️ Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Large lists, automation, scheduled scraping, batch processing

```javascript
// ============================================
// XActions - List Members Scraper (Node.js)
// Author: nich (@nichxbt)
// Save as: scrape-list.js
// Run: node scrape-list.js "https://x.com/i/lists/123456789"
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

puppeteer.use(StealthPlugin());

/**
 * Parse list URL to extract list ID
 * @param {string} listUrl - Full list URL
 * @returns {string} List ID
 */
function parseListUrl(listUrl) {
  // Handle various list URL formats:
  // https://x.com/i/lists/123456789
  // https://twitter.com/i/lists/123456789
  // https://x.com/username/lists/listname
  
  const url = new URL(listUrl);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Format: /i/lists/LIST_ID
  if (pathParts[0] === 'i' && pathParts[1] === 'lists') {
    return pathParts[2];
  }
  
  // Format: /username/lists/LIST_NAME
  if (pathParts[1] === 'lists') {
    return pathParts[2];
  }
  
  throw new Error(`Invalid list URL format: ${listUrl}`);
}

/**
 * Scrape all members from a Twitter/X list
 * @param {string} listUrl - Full URL to the list
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of member objects
 */
async function scrapeListMembers(listUrl, options = {}) {
  const {
    limit = 5000,
    headless = true,
    authToken = null,
    onProgress = null,
    scrollDelay = 1500,
    maxRetries = 15,
    timeout = 30000,
  } = options;

  console.log('📋 XActions - List Members Scraper');
  console.log('====================================');
  console.log(`🔗 URL: ${listUrl}`);
  console.log(`📊 Limit: ${limit}`);
  console.log('');

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
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

    // Set auth cookie if provided (required for private lists)
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

    // Navigate to list page
    console.log('🌐 Loading list page...');
    await page.goto(listUrl, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait for page to stabilize
    await new Promise(r => setTimeout(r, 2000));

    // Extract list title
    const listTitle = await page.evaluate(() => {
      const heading = document.querySelector('h2[role="heading"]');
      return heading?.textContent || 'Unknown List';
    });
    console.log(`📌 List: ${listTitle}`);

    // Try to click on Members tab if not already on members view
    try {
      const membersTab = await page.$('a[href*="/members"]');
      if (membersTab) {
        await membersTab.click();
        await new Promise(r => setTimeout(r, 2000));
        console.log('👥 Navigated to Members tab');
      }
    } catch (e) {
      // May already be on members view
    }

    // Wait for user cells to appear
    try {
      await page.waitForSelector('[data-testid="UserCell"]', { timeout: 10000 });
    } catch (e) {
      console.log('⚠️ No members found or list is empty');
      return [];
    }
    
    console.log('🔄 Scraping members...');
    console.log('');

    const members = new Map();
    let retries = 0;

    // Main scraping loop
    while (members.size < limit && retries < maxRetries) {
      // Extract users from current view
      const users = await page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).map(cell => {
          try {
            const link = cell.querySelector('a[href^="/"]');
            const href = link?.getAttribute('href') || '';
            const username = href.split('/')[1];
            
            // Skip invalid usernames
            if (!username || username.includes('?') || username === 'i') return null;
            
            const nameEl = cell.querySelector('[dir="ltr"] > span');
            const bioEl = cell.querySelector('[data-testid="UserDescription"]');
            const avatarEl = cell.querySelector('img[src*="profile_images"]');
            const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]') ||
                              cell.querySelector('[data-testid="icon-verified"]');
            
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

      const prevSize = members.size;
      
      // Add new members to map (deduplication)
      users.forEach(user => {
        if (!members.has(user.username)) {
          members.set(user.username, {
            ...user,
            scrapedAt: new Date().toISOString(),
          });
        }
      });

      // Progress callback
      if (onProgress && members.size !== prevSize) {
        onProgress({
          scraped: members.size,
          limit,
          percent: Math.min(100, Math.round((members.size / limit) * 100)),
          listTitle,
        });
      }

      // Check if stuck (no new members)
      if (members.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      // Scroll down to load more
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Random delay to avoid detection
      await new Promise(r => setTimeout(r, scrollDelay + Math.random() * 500));
    }

    const result = Array.from(members.values()).slice(0, limit);
    
    console.log('');
    console.log(`✅ Scraped ${result.length} members from "${listTitle}"`);
    
    return {
      listTitle,
      listUrl,
      members: result,
      scrapedAt: new Date().toISOString(),
      totalScraped: result.length,
    };

  } finally {
    await browser.close();
  }
}

/**
 * Export data to JSON file
 */
async function exportJSON(data, filename) {
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  console.log(`💾 Saved JSON: ${filename}`);
}

/**
 * Export members to CSV file
 */
async function exportCSV(members, filename) {
  const headers = ['username', 'name', 'bio', 'verified', 'avatar', 'scrapedAt'];
  const rows = members.map(row => 
    headers.map(h => {
      const val = row[h];
      if (typeof val === 'string') {
        // Escape quotes and remove newlines for CSV compatibility
        return `"${val.replace(/"/g, '""').replace(/[\n\r]/g, ' ')}"`;
      }
      return val ?? '';
    }).join(',')
  );
  
  const csv = [headers.join(','), ...rows].join('\n');
  await fs.writeFile(filename, csv);
  console.log(`💾 Saved CSV: ${filename}`);
}

/**
 * Generate safe filename from list title
 */
function safeFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// ============================================
// CLI Entry Point
// ============================================

const args = process.argv.slice(2);
const listUrl = args[0];
const limit = parseInt(args[1]) || 1000;

if (!listUrl) {
  console.log(`
📋 XActions - List Members Scraper
====================================

Usage: node scrape-list.js <list-url> [limit]

Arguments:
  list-url  - Full URL to the Twitter/X list
  limit     - Maximum members to scrape (default: 1000)

Examples:
  node scrape-list.js "https://x.com/i/lists/123456789" 500
  node scrape-list.js "https://x.com/elonmusk/lists/spacex-team"
  node scrape-list.js "https://twitter.com/i/lists/87654321" 2000

Supported URL formats:
  - https://x.com/i/lists/LIST_ID
  - https://twitter.com/i/lists/LIST_ID
  - https://x.com/username/lists/listname

Output:
  - list-{name}-{date}.json - Full data with metadata
  - list-{name}-{date}.csv  - Members only, spreadsheet-ready
`);
  process.exit(1);
}

// Validate URL
try {
  new URL(listUrl);
} catch {
  console.error('❌ Invalid URL format');
  process.exit(1);
}

// Run scraper with progress indicator
console.log('');

scrapeListMembers(listUrl, {
  limit,
  onProgress: ({ scraped, limit, percent, listTitle }) => {
    process.stdout.write(`\r📈 Progress: ${scraped}/${limit} (${percent}%) - ${listTitle}`);
  },
})
  .then(async (data) => {
    if (!data || !data.members || data.members.length === 0) {
      console.log('\n⚠️ No members found. The list may be empty or private.');
      process.exit(0);
    }
    
    console.log('\n');
    
    const { listTitle, members } = data;
    
    // Calculate stats
    const verified = members.filter(u => u.verified).length;
    const withBio = members.filter(u => u.bio).length;
    
    console.log('📊 Summary:');
    console.log(`   List: ${listTitle}`);
    console.log(`   Total members: ${members.length}`);
    console.log(`   Verified: ${verified} (${Math.round(verified/members.length*100)}%)`);
    console.log(`   With bio: ${withBio} (${Math.round(withBio/members.length*100)}%)`);
    console.log('');
    
    // Generate filenames
    const date = new Date().toISOString().split('T')[0];
    const safeName = safeFilename(listTitle);
    const jsonFile = `list-${safeName}-${date}.json`;
    const csvFile = `list-${safeName}-${date}.csv`;
    
    // Export both formats
    await exportJSON(data, jsonFile);
    await exportCSV(members, csvFile);
    
    // Show sample
    console.log('\n📋 Sample members (first 5):');
    members.slice(0, 5).forEach(m => {
      const badge = m.verified ? ' ✓' : '';
      const bio = m.bio ? ` - "${m.bio.substring(0, 40)}${m.bio.length > 40 ? '...' : ''}"` : '';
      console.log(`   @${m.username}${badge}${bio}`);
    });
    
    console.log('\n✅ Done!');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('timeout')) {
      console.log('💡 Tip: Try again, the page may have been slow to load');
    }
    if (error.message.includes('auth')) {
      console.log('💡 Tip: For private lists, provide an auth token');
    }
    process.exit(1);
  });
```

**Installation:**
```bash
# Install required dependencies
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

**Run it:**
```bash
# Scrape a public list (1000 members)
node scrape-list.js "https://x.com/i/lists/1234567890" 1000

# Scrape with custom limit
node scrape-list.js "https://x.com/elonmusk/lists/spacex" 500

# Scrape all members (up to 5000)
node scrape-list.js "https://x.com/i/lists/9876543210" 5000
```

**Output:**
```
📋 XActions - List Members Scraper
====================================
🔗 URL: https://x.com/i/lists/1234567890
📊 Limit: 1000

🌐 Loading list page...
📌 List: Tech Leaders 2025
👥 Navigated to Members tab
🔄 Scraping members...

📈 Progress: 1000/1000 (100%) - Tech Leaders 2025

✅ Scraped 1000 members from "Tech Leaders 2025"

📊 Summary:
   List: Tech Leaders 2025
   Total members: 1000
   Verified: 342 (34%)
   With bio: 891 (89%)

💾 Saved JSON: list-tech-leaders-2025-2026-01-01.json
💾 Saved CSV: list-tech-leaders-2025-2026-01-01.csv

📋 Sample members (first 5):
   @satyanadella ✓ - "Chairman and CEO of Microsoft"
   @sundarpichai ✓ - "CEO @Google and Alphabet"
   @timcook ✓ - "CEO Apple"
   @elonmusk ✓ - "Mars, Cars, Stars"
   @jkrohnert - "Tech enthusiast and angel investor..."

✅ Done!
```

---

## 🎯 Use Cases

### 1. Curated Industry Lists

Find and scrape lists curated by industry experts:

```javascript
// Example: Scrape a VC investor list
const data = await scrapeListMembers('https://x.com/i/lists/vc-investors', {
  limit: 2000,
});

// Filter for verified investors only
const verifiedVCs = data.members.filter(m => m.verified);
console.log(`Found ${verifiedVCs.length} verified VCs`);
```

### 2. Competitor Audience Analysis

Scrape lists your competitors follow or are members of:

```javascript
// Analyze who competitors consider important
const competitorLists = [
  'https://x.com/competitor1/lists/team',
  'https://x.com/competitor2/lists/partners',
];

for (const listUrl of competitorLists) {
  const data = await scrapeListMembers(listUrl, { limit: 500 });
  console.log(`${data.listTitle}: ${data.members.length} members`);
}
```

### 3. Build Targeted Outreach Lists

Create contact lists from niche communities:

```javascript
// Scrape a niche list and filter by bio keywords
const data = await scrapeListMembers('https://x.com/i/lists/ai-researchers', {
  limit: 1000,
});

const mlEngineers = data.members.filter(m => 
  m.bio?.toLowerCase().includes('machine learning') ||
  m.bio?.toLowerCase().includes('ml engineer')
);

console.log(`Found ${mlEngineers.length} ML engineers`);
```

### 4. Monitor List Changes Over Time

Track when members are added or removed:

```javascript
// compare-lists.js
import fs from 'fs/promises';

async function compareListSnapshots(oldFile, newFile) {
  const oldData = JSON.parse(await fs.readFile(oldFile, 'utf-8'));
  const newData = JSON.parse(await fs.readFile(newFile, 'utf-8'));
  
  const oldSet = new Set(oldData.members.map(u => u.username));
  const newSet = new Set(newData.members.map(u => u.username));
  
  const added = newData.members.filter(u => !oldSet.has(u.username));
  const removed = oldData.members.filter(u => !newSet.has(u.username));
  
  console.log(`\n➕ Added ${added.length} members:`);
  added.slice(0, 10).forEach(u => console.log(`   @${u.username}`));
  
  console.log(`\n➖ Removed ${removed.length} members:`);
  removed.slice(0, 10).forEach(u => console.log(`   @${u.username}`));
}
```

### 5. Find High-Value Accounts

Analyze lists to find influential accounts:

```javascript
// Extract verified accounts from multiple lists
const lists = [
  'https://x.com/i/lists/list1',
  'https://x.com/i/lists/list2',
];

const allVerified = new Map();

for (const listUrl of lists) {
  const data = await scrapeListMembers(listUrl, { limit: 500 });
  data.members
    .filter(m => m.verified)
    .forEach(m => {
      if (!allVerified.has(m.username)) {
        allVerified.set(m.username, m);
      }
    });
}

console.log(`Found ${allVerified.size} unique verified accounts across all lists`);
```

---

## 💡 Tips

### Performance Expectations

| List Size | Estimated Time |
|-----------|----------------|
| 100 members | ~1 minute |
| 500 members | ~3 minutes |
| 1000 members | ~5 minutes |
| 2000 members | ~10 minutes |
| 5000 members | ~20-25 minutes |

### Best Practices

- **Rate Limiting**: Wait at least 5 minutes between scraping different lists
- **Random Delays**: The scripts include random delays to mimic human behavior
- **Headless Mode**: Use `headless: false` for debugging or if you encounter issues
- **Private Lists**: Require authentication - pass your `auth_token` cookie value

### Getting Your Auth Token (for private lists)

1. Open X/Twitter in your browser
2. Open DevTools (F12) → Application tab
3. Cookies → x.com → `auth_token`
4. Copy the value

```javascript
const data = await scrapeListMembers(listUrl, {
  authToken: 'your_auth_token_here',
});
```

### Handling Large Lists (5000+ members)

```javascript
const data = await scrapeListMembers(listUrl, {
  limit: 10000,
  scrollDelay: 2000,    // Slower scrolling
  maxRetries: 25,       // More patience
  headless: false,      // Watch for issues
});
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Empty results | Make sure you're on the Members tab, not the list overview |
| Timeout errors | Increase `timeout` option or try again |
| Bot detection | Use `headless: false` and add longer delays |
| Private list | Provide `authToken` option |

---

## 🌐 Website Alternative

Don't want to code? Use [xactions.app](https://xactions.app):

1. 🔐 Login with your X account
2. 📋 Paste any list URL
3. ▶️ Click "Scrape List Members"
4. ⏳ Wait for completion
5. 📥 Download CSV or JSON

**Benefits:**
- ✅ No coding required
- ✅ Works in your browser
- ✅ Automatic rate limiting
- ✅ Export to multiple formats
- ✅ Save scraping history
- ✅ Schedule recurring scrapes

---

## 📚 Related Examples

- [followers-scraping.md](followers-scraping.md) - Scrape followers from any account
- [following-scraping.md](following-scraping.md) - Scrape who an account follows
- [profile-scraping.md](profile-scraping.md) - Get detailed profile information
- [hashtag-scraping.md](hashtag-scraping.md) - Scrape users from hashtag feeds

---

*Author: nich ([@nichxbt](https://x.com/nichxbt))*
