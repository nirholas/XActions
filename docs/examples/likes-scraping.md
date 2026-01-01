# ❤️ Likes Scraping

Extract the complete list of users who liked a specific tweet on X/Twitter.

---

## 📋 What You Get

See exactly who engaged with any tweet by liking it:

- **Username** and display name of each user who liked the tweet
- **Bio/description** - what they write about themselves
- **Verified status** - blue checkmarks and verification badges
- **Avatar URL** - profile picture links
- **Follower indicators** - identify high-value engagers
- **Export to JSON or CSV** - for further analysis

**Perfect for:**
- Finding users interested in specific topics
- Analyzing engagement on your own tweets
- Discovering potential followers or customers
- Competitive research on viral content
- Building targeted outreach lists

---

## 🖥️ Example 1: Browser Console (Quick)

**Best for:** Quick scraping of up to ~500 likers directly in your browser

**Steps:**
1. Go to the tweet you want to analyze
2. Click on the "Likes" count to open the likes modal
3. Open browser console (F12 → Console tab)
4. Paste the script below and press Enter

```javascript
// ============================================
// XActions - Tweet Likes Scraper (Browser Console)
// Step 1: Go to any tweet on x.com
// Step 2: Click on the "Likes" count to open likes modal
// Step 3: Open console (F12), paste this, press Enter
// Author: nich (@nichxbt)
// ============================================

(async () => {
  const TARGET_COUNT = 500;    // Number of likers to scrape (adjust as needed)
  const SCROLL_DELAY = 1500;   // ms between scrolls
  const MAX_RETRIES = 15;      // Stop if no new users found after this many tries
  
  console.log('');
  console.log('❤️  XActions - Tweet Likes Scraper');
  console.log('====================================');
  console.log(`🎯 Target: ${TARGET_COUNT} likers`);
  console.log('');
  
  // Verify we're on a tweet page or likes modal is open
  const isOnTweet = window.location.pathname.includes('/status/');
  const likesModal = document.querySelector('[aria-label="Timeline: Liked by"]') ||
                     document.querySelector('[data-testid="sheetDialog"]');
  
  if (!isOnTweet && !likesModal) {
    console.error('❌ Please navigate to a tweet first!');
    console.log('👉 Go to: x.com/username/status/tweet_id');
    console.log('👉 Then click on the "Likes" count');
    return;
  }
  
  // Check if likes modal is visible
  const scrollContainer = document.querySelector('[aria-label="Timeline: Liked by"]') ||
                          document.querySelector('[data-testid="sheetDialog"]') ||
                          document.querySelector('[aria-modal="true"]');
  
  if (!scrollContainer) {
    console.warn('⚠️  Likes modal not detected. Click on the likes count first!');
    console.log('💡 The number next to the heart icon - click it to open the modal');
    return;
  }
  
  // Extract tweet ID from URL
  const tweetIdMatch = window.location.pathname.match(/\/status\/(\d+)/);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : 'unknown';
  console.log(`📍 Tweet ID: ${tweetId}`);
  console.log('');
  
  const likers = new Map();
  let retries = 0;
  
  // Helper: Sleep function
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Helper: Extract user data from visible user cells
  const extractUsers = () => {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const users = [];
    
    cells.forEach(cell => {
      try {
        // Get username from link
        const link = cell.querySelector('a[href^="/"]');
        const href = link?.getAttribute('href') || '';
        const username = href.split('/')[1];
        
        // Skip if invalid or has query params
        if (!username || username.includes('?') || username.includes('/')) return;
        
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
        
        // Check if they follow you (if visible)
        const followsYou = !!cell.querySelector('[data-testid="userFollowIndicator"]');
        
        users.push({
          username,
          name,
          bio,
          verified,
          avatar,
          followsYou,
          scrapedAt: new Date().toISOString(),
        });
      } catch (e) {
        // Skip malformed cells
      }
    });
    
    return users;
  };
  
  // Helper: Scroll within the modal
  const scrollModal = () => {
    const modalContent = document.querySelector('[aria-label="Timeline: Liked by"]') ||
                        document.querySelector('[data-testid="sheetDialog"]') ||
                        document.querySelector('[aria-modal="true"] [data-testid="primaryColumn"]');
    
    if (modalContent) {
      modalContent.scrollTop = modalContent.scrollHeight;
    } else {
      // Fallback: scroll the page
      window.scrollTo(0, document.body.scrollHeight);
    }
  };
  
  console.log('📜 Scanning users who liked this tweet...');
  console.log('');
  
  // Main scraping loop
  while (likers.size < TARGET_COUNT && retries < MAX_RETRIES) {
    // Extract visible users
    const users = extractUsers();
    const prevSize = likers.size;
    
    // Add to map (automatically deduplicates by username)
    users.forEach(user => {
      if (!likers.has(user.username)) {
        likers.set(user.username, user);
      }
    });
    
    // Progress update
    const progress = Math.round((likers.size / TARGET_COUNT) * 100);
    console.log(`❤️  Scraped: ${likers.size} likers (${Math.min(progress, 100)}%)`);
    
    // Check if we're stuck (no new users found)
    if (likers.size === prevSize) {
      retries++;
      if (retries >= MAX_RETRIES) {
        console.log('');
        console.log('📍 Reached end of likes list or rate limit');
        break;
      }
    } else {
      retries = 0;
    }
    
    // Scroll to load more
    scrollModal();
    await sleep(SCROLL_DELAY);
  }
  
  // Convert to array
  const result = Array.from(likers.values());
  
  // Summary statistics
  console.log('');
  console.log('✅ Scraping complete!');
  console.log('====================================');
  console.log(`📊 Total likers scraped: ${result.length}`);
  console.log(`✓  Verified users: ${result.filter(u => u.verified).length}`);
  console.log(`✓  With bio: ${result.filter(u => u.bio).length}`);
  console.log(`✓  Follow you: ${result.filter(u => u.followsYou).length}`);
  console.log('');
  
  // Prepare JSON
  const exportData = {
    tweetId,
    tweetUrl: window.location.href.split('?')[0],
    scrapedAt: new Date().toISOString(),
    totalLikers: result.length,
    likers: result,
  };
  
  const json = JSON.stringify(exportData, null, 2);
  
  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(json);
    console.log('📋 Copied to clipboard!');
  } catch (e) {
    console.log('⚠️  Could not copy to clipboard (browser restriction)');
  }
  
  // Create downloadable file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tweet-${tweetId}-likers-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('📥 Download started!');
  console.log('');
  console.log('💾 Data preview (first 5 users):');
  result.slice(0, 5).forEach(u => {
    const badge = u.verified ? ' ✓' : '';
    console.log(`   @${u.username}${badge} - ${u.name || '(no name)'}`);
  });
  
  // Also expose in console for inspection
  console.log('');
  console.log('🔍 Full data (right-click → Copy object):');
  console.log(exportData);
  
  return exportData;
})();
```

**What happens:**
1. Script detects the likes modal and starts scrolling
2. Extracts user data from each visible user card
3. Automatically deduplicates by username
4. Shows real-time progress in console
5. Downloads JSON file with all likers
6. Copies data to clipboard for easy pasting

**Output file structure:**
```json
{
  "tweetId": "1234567890123456789",
  "tweetUrl": "https://x.com/username/status/1234567890123456789",
  "scrapedAt": "2026-01-01T12:00:00.000Z",
  "totalLikers": 342,
  "likers": [
    {
      "username": "user1",
      "name": "John Doe",
      "bio": "Tech enthusiast | Builder",
      "verified": true,
      "avatar": "https://pbs.twimg.com/profile_images/...",
      "followsYou": false,
      "scrapedAt": "2026-01-01T12:00:00.000Z"
    }
  ]
}
```

---

## 🚀 Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Large-scale scraping, automation, scheduled jobs, API integration

Save as `scrape-tweet-likes.js`:

```javascript
// ============================================
// XActions - Tweet Likes Scraper (Node.js)
// Save as: scrape-tweet-likes.js
// Run: node scrape-tweet-likes.js https://x.com/username/status/123456
// Author: nich (@nichxbt)
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Scrape users who liked a specific tweet
 * @param {string} tweetUrl - Full URL to the tweet
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Object containing tweet info and likers array
 */
async function scrapeTweetLikes(tweetUrl, options = {}) {
  const {
    limit = 1000,
    headless = true,
    authToken = null,
    scrollDelay = 1500,
    maxRetries = 15,
    onProgress = null,
    outputDir = '.',
  } = options;

  // Extract tweet ID from URL
  const tweetIdMatch = tweetUrl.match(/status\/(\d+)/);
  if (!tweetIdMatch) {
    throw new Error('Invalid tweet URL. Expected format: https://x.com/username/status/123456789');
  }
  const tweetId = tweetIdMatch[1];

  console.log('');
  console.log('❤️  XActions - Tweet Likes Scraper');
  console.log('====================================');
  console.log(`🔗 Tweet: ${tweetUrl}`);
  console.log(`🆔 Tweet ID: ${tweetId}`);
  console.log(`🎯 Limit: ${limit} likers`);
  console.log('');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1280,900',
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

    // Set auth cookie if provided (required for some tweets)
    if (authToken) {
      await page.setCookie({
        name: 'auth_token',
        value: authToken,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
      console.log('🔐 Authentication token set');
    }

    // Navigate to the tweet
    console.log('📍 Loading tweet...');
    await page.goto(tweetUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for tweet to load
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });
    
    // Small random delay to appear human
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    // Find and click the likes button/count
    console.log('🖱️  Opening likes modal...');
    
    // Try multiple selectors for the likes button
    const likesClicked = await page.evaluate(() => {
      // Method 1: Look for the likes link directly
      const likesLinks = Array.from(document.querySelectorAll('a[href*="/likes"]'));
      for (const link of likesLinks) {
        if (link.href.includes('/status/') && link.href.includes('/likes')) {
          link.click();
          return true;
        }
      }
      
      // Method 2: Look for the heart icon group with count
      const groups = document.querySelectorAll('[role="group"]');
      for (const group of groups) {
        const heartBtn = group.querySelector('[data-testid="like"]') || 
                        group.querySelector('[data-testid="unlike"]');
        if (heartBtn) {
          // Find the parent link or nearby likes count
          const likesCount = group.querySelector('a[href*="/likes"]');
          if (likesCount) {
            likesCount.click();
            return true;
          }
        }
      }
      
      return false;
    });

    if (!likesClicked) {
      // Try navigating directly to likes URL
      const likesUrl = tweetUrl.replace(/\/?$/, '/likes');
      console.log('📍 Navigating directly to likes page...');
      await page.goto(likesUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
    }

    // Wait for user cells to appear
    await page.waitForSelector('[data-testid="UserCell"]', { timeout: 15000 });
    console.log('✓  Likes modal opened');
    console.log('');

    // Small delay before starting
    await new Promise(r => setTimeout(r, 1500));

    const likers = new Map();
    let retries = 0;
    let lastLogTime = Date.now();

    // Main scraping loop
    console.log('📜 Scraping likers...');
    
    while (likers.size < limit && retries < maxRetries) {
      // Extract users from page
      const users = await page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).map(cell => {
          try {
            const link = cell.querySelector('a[href^="/"]');
            const href = link?.getAttribute('href') || '';
            const username = href.split('/')[1];

            if (!username || username.includes('?') || username.includes('/')) {
              return null;
            }

            const nameEl = cell.querySelector('[dir="ltr"] > span');
            const name = nameEl?.textContent?.trim() || null;

            const bioEl = cell.querySelector('[data-testid="UserDescription"]');
            const bio = bioEl?.textContent?.trim() || null;

            const verified = !!cell.querySelector('svg[aria-label*="Verified"]') ||
                           !!cell.querySelector('[data-testid="icon-verified"]');

            const avatarEl = cell.querySelector('img[src*="profile_images"]');
            const avatar = avatarEl?.src || null;

            const followsYou = !!cell.querySelector('[data-testid="userFollowIndicator"]');

            return { username, name, bio, verified, avatar, followsYou };
          } catch (e) {
            return null;
          }
        }).filter(Boolean);
      });

      const prevSize = likers.size;

      // Add to map (deduplicates automatically)
      for (const user of users) {
        if (!likers.has(user.username)) {
          likers.set(user.username, {
            ...user,
            scrapedAt: new Date().toISOString(),
          });
        }
      }

      // Progress logging (throttled to every 2 seconds)
      if (Date.now() - lastLogTime > 2000 || likers.size >= limit) {
        const pct = Math.min(100, Math.round((likers.size / limit) * 100));
        console.log(`❤️  Progress: ${likers.size}/${limit} (${pct}%)`);
        lastLogTime = Date.now();
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress({ current: likers.size, limit, percentage: pct });
        }
      }

      // Check if stuck
      if (likers.size === prevSize) {
        retries++;
        if (retries >= maxRetries) {
          console.log('');
          console.log('📍 Reached end of likes list');
          break;
        }
      } else {
        retries = 0;
      }

      // Scroll to load more users
      await page.evaluate(() => {
        // Try scrolling within modal first
        const modal = document.querySelector('[aria-label="Timeline: Liked by"]') ||
                     document.querySelector('[data-testid="sheetDialog"]') ||
                     document.querySelector('[aria-modal="true"]');
        if (modal) {
          modal.scrollTop = modal.scrollHeight;
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      });

      // Random delay between scrolls
      await new Promise(r => setTimeout(r, scrollDelay + Math.random() * 500));
    }

    // Convert to array
    const likersArray = Array.from(likers.values());

    // Build result object
    const result = {
      tweetId,
      tweetUrl,
      scrapedAt: new Date().toISOString(),
      totalLikers: likersArray.length,
      stats: {
        verified: likersArray.filter(u => u.verified).length,
        withBio: likersArray.filter(u => u.bio).length,
        followsYou: likersArray.filter(u => u.followsYou).length,
      },
      likers: likersArray,
    };

    // Summary
    console.log('');
    console.log('✅ Scraping complete!');
    console.log('====================================');
    console.log(`📊 Total likers scraped: ${result.totalLikers}`);
    console.log(`✓  Verified users: ${result.stats.verified}`);
    console.log(`✓  With bio: ${result.stats.withBio}`);
    console.log(`✓  Follow you: ${result.stats.followsYou}`);

    // Save to files
    const dateStr = new Date().toISOString().split('T')[0];
    const baseFilename = `tweet-${tweetId}-likers-${dateStr}`;

    // Save JSON
    const jsonPath = path.join(outputDir, `${baseFilename}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(result, null, 2));
    console.log(`💾 Saved: ${jsonPath}`);

    // Save CSV
    const csvPath = path.join(outputDir, `${baseFilename}.csv`);
    const csvHeader = 'username,name,bio,verified,avatar,follows_you,scraped_at\n';
    const csvRows = likersArray.map(u => {
      const escapeCsv = (str) => str ? `"${String(str).replace(/"/g, '""')}"` : '';
      return [
        u.username,
        escapeCsv(u.name),
        escapeCsv(u.bio),
        u.verified,
        u.avatar || '',
        u.followsYou,
        u.scrapedAt,
      ].join(',');
    }).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);
    console.log(`💾 Saved: ${csvPath}`);

    // Show sample
    console.log('');
    console.log('📋 Sample (first 5):');
    likersArray.slice(0, 5).forEach(u => {
      const badge = u.verified ? ' ✓' : '';
      console.log(`   @${u.username}${badge} - ${u.name || '(no name)'}`);
    });

    return result;

  } finally {
    await browser.close();
  }
}

/**
 * Scrape likers from multiple tweets
 * @param {string[]} tweetUrls - Array of tweet URLs
 * @param {Object} options - Configuration options
 * @returns {Promise<Object[]>} Array of results for each tweet
 */
async function scrapeMultipleTweets(tweetUrls, options = {}) {
  const results = [];
  const { delayBetweenTweets = 5000, ...scraperOptions } = options;

  console.log(`📋 Scraping likers from ${tweetUrls.length} tweets`);
  console.log('');

  for (let i = 0; i < tweetUrls.length; i++) {
    console.log(`\n[${ i + 1}/${tweetUrls.length}] Processing tweet...`);
    console.log('─'.repeat(40));

    try {
      const result = await scrapeTweetLikes(tweetUrls[i], scraperOptions);
      results.push({ success: true, url: tweetUrls[i], data: result });
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      results.push({ success: false, url: tweetUrls[i], error: error.message });
    }

    // Delay between tweets (except for last one)
    if (i < tweetUrls.length - 1) {
      console.log(`\n⏳ Waiting ${delayBetweenTweets / 1000}s before next tweet...`);
      await new Promise(r => setTimeout(r, delayBetweenTweets));
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  console.log('');
  console.log('====================================');
  console.log(`📊 Batch complete: ${successful}/${tweetUrls.length} successful`);

  return results;
}

// ============================================
// CLI Interface
// ============================================

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('');
  console.log('❤️  XActions - Tweet Likes Scraper');
  console.log('====================================');
  console.log('');
  console.log('Usage:');
  console.log('  node scrape-tweet-likes.js <tweet_url> [limit]');
  console.log('');
  console.log('Examples:');
  console.log('  node scrape-tweet-likes.js https://x.com/elonmusk/status/1234567890');
  console.log('  node scrape-tweet-likes.js https://x.com/elonmusk/status/1234567890 500');
  console.log('');
  console.log('Options:');
  console.log('  tweet_url  Full URL to the tweet');
  console.log('  limit      Maximum number of likers to scrape (default: 1000)');
  console.log('');
  console.log('Environment Variables:');
  console.log('  X_AUTH_TOKEN  Your X/Twitter auth token (for private accounts)');
  console.log('');
  process.exit(0);
}

const tweetUrl = args[0];
const limit = parseInt(args[1]) || 1000;
const authToken = process.env.X_AUTH_TOKEN || null;

scrapeTweetLikes(tweetUrl, {
  limit,
  authToken,
  headless: true,
  scrollDelay: 1500,
})
  .then(result => {
    console.log('');
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('');
    console.error('❌ Error:', error.message);
    process.exit(1);
  });

// Export for use as module
export { scrapeTweetLikes, scrapeMultipleTweets };
```

**Installation:**
```bash
# Install dependencies
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

**Run it:**
```bash
# Scrape up to 1000 likers from a tweet
node scrape-tweet-likes.js https://x.com/elonmusk/status/1234567890123456789

# Scrape with custom limit
node scrape-tweet-likes.js https://x.com/username/status/1234567890 500

# With authentication (for viewing likes on protected content)
X_AUTH_TOKEN=your_token_here node scrape-tweet-likes.js https://x.com/user/status/123
```

**Output:**
```
❤️  XActions - Tweet Likes Scraper
====================================
🔗 Tweet: https://x.com/elonmusk/status/1234567890123456789
🆔 Tweet ID: 1234567890123456789
🎯 Limit: 1000 likers

📍 Loading tweet...
🖱️  Opening likes modal...
✓  Likes modal opened

📜 Scraping likers...
❤️  Progress: 250/1000 (25%)
❤️  Progress: 500/1000 (50%)
❤️  Progress: 750/1000 (75%)
❤️  Progress: 1000/1000 (100%)

✅ Scraping complete!
====================================
📊 Total likers scraped: 1000
✓  Verified users: 47
✓  With bio: 823
✓  Follow you: 12

💾 Saved: tweet-1234567890123456789-likers-2026-01-01.json
💾 Saved: tweet-1234567890123456789-likers-2026-01-01.csv

📋 Sample (first 5):
   @user1 ✓ - John Doe
   @user2 - Jane Smith  
   @user3 ✓ - Tech Guy
   @user4 - Crypto Enthusiast
   @user5 - Marketing Pro

🎉 Done!
```

---

## 💡 Use Cases

### 1. Engagement Analysis

Understand who engages with your content:

```javascript
// Analyze engagement patterns
const result = await scrapeTweetLikes(myTweetUrl, { limit: 500 });

// Find verified users who liked your tweet
const verifiedLikers = result.likers.filter(u => u.verified);
console.log(`${verifiedLikers.length} verified accounts liked this tweet!`);

// Identify potential collaborators
const influencers = result.likers.filter(u => 
  u.verified || (u.bio && u.bio.toLowerCase().includes('founder'))
);
```

### 2. Finding Interested Users

Build targeted lists of users interested in specific topics:

```javascript
// Scrape likers from viral tweets in your niche
const nicheTopics = [
  'https://x.com/user1/status/111...',  // Popular AI tweet
  'https://x.com/user2/status/222...',  // Trending tech post
];

const allLikers = new Map();

for (const url of nicheTopics) {
  const result = await scrapeTweetLikes(url, { limit: 500 });
  result.likers.forEach(u => {
    if (!allLikers.has(u.username)) {
      allLikers.set(u.username, { ...u, likedTweets: 1 });
    } else {
      allLikers.get(u.username).likedTweets++;
    }
  });
}

// Find users who liked multiple tweets (highly interested!)
const superFans = Array.from(allLikers.values())
  .filter(u => u.likedTweets >= 2)
  .sort((a, b) => b.likedTweets - a.likedTweets);

console.log('Super engaged users:', superFans);
```

### 3. Competitive Research

See who engages with competitor content:

```javascript
// Analyze competitor engagement
const competitorTweet = 'https://x.com/competitor/status/...';
const result = await scrapeTweetLikes(competitorTweet, { limit: 1000 });

// Export for CRM or outreach
const prospects = result.likers
  .filter(u => u.bio && !u.bio.includes('bot'))
  .map(u => ({
    handle: `@${u.username}`,
    name: u.name,
    interests: u.bio,
    verified: u.verified,
  }));

console.log(`Found ${prospects.length} potential prospects`);
```

### 4. Content Strategy

Analyze what type of users engage with different content:

```javascript
// Compare likers across different tweet types
const technicalTweet = await scrapeTweetLikes(techUrl);
const casualTweet = await scrapeTweetLikes(casualUrl);

const techVerified = technicalTweet.likers.filter(u => u.verified).length;
const casualVerified = casualTweet.likers.filter(u => u.verified).length;

console.log(`Technical content: ${techVerified} verified likers`);
console.log(`Casual content: ${casualVerified} verified likers`);
```

---

## ⚡ Tips

### Performance Expectations

| Likes Count | Estimated Time |
|-------------|----------------|
| 100 likers  | ~30 seconds    |
| 500 likers  | ~2 minutes     |
| 1000 likers | ~4 minutes     |
| 5000 likers | ~15-20 minutes |

### Rate Limiting Best Practices

- **Don't scrape too frequently** - Wait at least 5 minutes between scraping the same tweet
- **Add delays for batch jobs** - Use `delayBetweenTweets: 10000` (10s) for multiple tweets
- **Respect X's limits** - Slow down if you encounter errors

### Getting Your Auth Token

For accessing likes on protected tweets or when logged in:

1. Open X.com and log in
2. Open Developer Tools (F12)
3. Go to Application → Cookies → x.com
4. Find `auth_token` and copy the value
5. Use it: `X_AUTH_TOKEN=your_token node scrape-tweet-likes.js ...`

### Handling Large Like Counts

For viral tweets with 10K+ likes:

```javascript
const result = await scrapeTweetLikes(viralTweetUrl, {
  limit: 10000,
  scrollDelay: 2000,  // Slower scrolling
  maxRetries: 25,     // More patience
});
```

### Filtering Results

```javascript
// Only verified users
const verified = result.likers.filter(u => u.verified);

// Users with bios containing keywords
const devs = result.likers.filter(u => 
  u.bio && /developer|engineer|coding/i.test(u.bio)
);

// Remove likely bots
const humans = result.likers.filter(u => 
  u.bio && u.bio.length > 20 && !/follow.?back|dm.?promo/i.test(u.bio)
);
```

---

## 🌐 Website Alternative

Don't want to code? Use [xactions.app](https://xactions.app):

1. 🔐 Login with your X account
2. 🔗 Paste any tweet URL
3. ❤️ Click "Scrape Likes"
4. ⏳ Wait for completion
5. 📥 Download CSV or JSON

**Features:**
- One-click like extraction
- Bulk tweet support
- No coding required
- Automatic deduplication
- Export in multiple formats
- Works with any public tweet

---

## 📚 Related Examples

- [Tweet Scraping](tweet-scraping.md) - Extract tweet content and metadata
- [Followers Scraping](followers-scraping.md) - Get complete follower lists
- [Following Scraping](following-scraping.md) - See who an account follows
- [Profile Scraping](profile-scraping.md) - Extract user profile information

---

*Author: nich ([@nichxbt](https://x.com/nichxbt))*
