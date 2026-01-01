# Tweet Scraping

Scrape tweets from any public X/Twitter profile with full metadata extraction.

## What You Get

- Tweet text content
- Timestamps (posted date/time)
- Engagement metrics (likes, retweets, replies, views)
- Media URLs (images, videos, GIFs)
- Quote tweet references
- Reply-to information
- Export to JSON or CSV

---

## Example 1: Browser Console (Quick)

**Best for:** Scraping up to ~100 tweets quickly from any profile

```javascript
// ============================================
// XActions - Tweet Scraper (Browser Console)
// Go to: x.com/USERNAME (any profile page)
// Open console (F12), paste this
// Author: nich (@nichxbt)
// ============================================

(async () => {
  const TARGET_COUNT = 100; // Adjust as needed
  const SCROLL_DELAY = 2000; // ms between scrolls
  
  console.log('🐦 Starting tweet scrape...');
  console.log(`📊 Target: ${TARGET_COUNT} tweets`);
  
  const tweets = new Map();
  let retries = 0;
  const maxRetries = 15;
  
  // Helper to parse count strings like "1.2K", "45M"
  const parseCount = (str) => {
    if (!str) return 0;
    str = str.trim().replace(/,/g, '');
    if (str.endsWith('K')) return Math.round(parseFloat(str) * 1000);
    if (str.endsWith('M')) return Math.round(parseFloat(str) * 1000000);
    if (str.endsWith('B')) return Math.round(parseFloat(str) * 1000000000);
    return parseInt(str) || 0;
  };
  
  // Extract tweet data from article elements
  const extractTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const extracted = [];
    
    articles.forEach(article => {
      try {
        // Get tweet ID from the tweet link
        const tweetLink = article.querySelector('a[href*="/status/"]');
        const href = tweetLink?.getAttribute('href') || '';
        const statusMatch = href.match(/\/status\/(\d+)/);
        const tweetId = statusMatch ? statusMatch[1] : null;
        
        if (!tweetId) return;
        
        // Get author info
        const userLink = article.querySelector('a[href^="/"][role="link"]');
        const authorHref = userLink?.getAttribute('href') || '';
        const author = authorHref.split('/')[1] || null;
        
        // Get display name
        const nameEl = article.querySelector('[data-testid="User-Name"]');
        const displayName = nameEl?.querySelector('span')?.textContent?.trim() || null;
        
        // Get tweet text
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl?.textContent?.trim() || '';
        
        // Get timestamp
        const timeEl = article.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || null;
        const displayTime = timeEl?.textContent?.trim() || null;
        
        // Get engagement metrics
        const replyBtn = article.querySelector('[data-testid="reply"]');
        const retweetBtn = article.querySelector('[data-testid="retweet"]');
        const likeBtn = article.querySelector('[data-testid="like"]');
        const viewsEl = article.querySelector('a[href*="/analytics"]');
        
        const replies = parseCount(replyBtn?.textContent);
        const retweets = parseCount(retweetBtn?.textContent);
        const likes = parseCount(likeBtn?.textContent);
        const views = parseCount(viewsEl?.textContent);
        
        // Get media (images, videos, GIFs)
        const mediaUrls = [];
        
        // Images
        const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
        images.forEach(img => {
          const src = img.getAttribute('src');
          if (src && src.includes('pbs.twimg.com/media')) {
            // Get high-res version
            const highRes = src.replace(/&name=\w+/, '&name=large');
            mediaUrls.push({
              type: 'image',
              url: highRes,
            });
          }
        });
        
        // Videos/GIFs
        const videos = article.querySelectorAll('video');
        videos.forEach(video => {
          const poster = video.getAttribute('poster');
          const src = video.querySelector('source')?.getAttribute('src');
          mediaUrls.push({
            type: video.closest('[data-testid="videoPlayer"]') ? 'video' : 'gif',
            url: src || poster || null,
            thumbnail: poster,
          });
        });
        
        // Check if it's a retweet
        const retweetIndicator = article.querySelector('[data-testid="socialContext"]');
        const isRetweet = retweetIndicator?.textContent?.includes('reposted') || false;
        
        // Check if it's a reply
        const replyIndicator = article.querySelector('[data-testid="tweet"] > div > div > div > div > a[href*="/status/"]');
        const isReply = !!article.querySelector('[data-testid="tweet"] [data-testid="tweetText"]')?.closest('div')?.querySelector('a[href*="/status/"]');
        
        // Get quoted tweet if any
        const quotedTweet = article.querySelector('[data-testid="tweet"] [role="link"][href*="/status/"]');
        let quotedTweetId = null;
        if (quotedTweet) {
          const quotedHref = quotedTweet.getAttribute('href') || '';
          const quotedMatch = quotedHref.match(/\/status\/(\d+)/);
          quotedTweetId = quotedMatch ? quotedMatch[1] : null;
        }
        
        extracted.push({
          id: tweetId,
          author,
          displayName,
          text,
          timestamp,
          displayTime,
          replies,
          retweets,
          likes,
          views,
          media: mediaUrls,
          isRetweet,
          quotedTweetId,
          url: `https://x.com/${author}/status/${tweetId}`,
        });
      } catch (e) {
        // Skip malformed tweets
      }
    });
    
    return extracted;
  };
  
  // Sleep helper
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Main scraping loop
  while (tweets.size < TARGET_COUNT && retries < maxRetries) {
    // Extract visible tweets
    const extracted = extractTweets();
    const prevSize = tweets.size;
    
    // Add to map (dedupes automatically by tweet ID)
    extracted.forEach(tweet => {
      if (!tweets.has(tweet.id)) {
        tweets.set(tweet.id, tweet);
      }
    });
    
    // Progress update
    console.log(`📈 Scraped: ${tweets.size} tweets`);
    
    // Check if we're stuck
    if (tweets.size === prevSize) {
      retries++;
      console.log(`⏳ No new tweets found (retry ${retries}/${maxRetries})`);
    } else {
      retries = 0;
    }
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  // Convert to array and sort by timestamp (newest first)
  const result = Array.from(tweets.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Summary
  console.log('\n✅ Scraping complete!');
  console.log(`📊 Total tweets scraped: ${result.length}`);
  console.log(`🖼️ With media: ${result.filter(t => t.media.length > 0).length}`);
  console.log(`🔁 Retweets: ${result.filter(t => t.isRetweet).length}`);
  console.log(`❤️ Total likes: ${result.reduce((sum, t) => sum + t.likes, 0).toLocaleString()}`);
  console.log(`🔄 Total retweets: ${result.reduce((sum, t) => sum + t.retweets, 0).toLocaleString()}`);
  
  // Copy to clipboard
  const json = JSON.stringify(result, null, 2);
  await navigator.clipboard.writeText(json);
  console.log('\n📋 Copied to clipboard!');
  
  // Also log for inspection
  console.log('\n💾 Data (right-click → Copy object):');
  console.log(result);
  
  // Create downloadable file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tweets-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  console.log('📥 Download started!');
  
  return result;
})();
```

**What happens:**
1. Script scrolls through the user's tweet timeline
2. Extracts full tweet data including text, metrics, media
3. Deduplicates automatically by tweet ID
4. Shows progress in console
5. Downloads JSON file automatically
6. Copies data to clipboard

**Sample Output:**
```json
{
  "id": "1234567890123456789",
  "author": "elonmusk",
  "displayName": "Elon Musk",
  "text": "The future is here! 🚀",
  "timestamp": "2026-01-01T15:30:00.000Z",
  "displayTime": "3h",
  "replies": 5432,
  "retweets": 12000,
  "likes": 98000,
  "views": 5400000,
  "media": [
    {
      "type": "image",
      "url": "https://pbs.twimg.com/media/..."
    }
  ],
  "isRetweet": false,
  "quotedTweetId": null,
  "url": "https://x.com/elonmusk/status/1234567890123456789"
}
```

---

## Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Large tweet archives, automation, scheduled jobs, data analysis

```javascript
// ============================================
// XActions - Tweet Scraper (Node.js)
// Save as: scrape-tweets.js
// Run: node scrape-tweets.js elonmusk 200
// Author: nich (@nichxbt)
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Parse count strings like "1.2K", "45M" to numbers
 */
function parseCount(str) {
  if (!str) return 0;
  str = str.trim().replace(/,/g, '');
  if (str.endsWith('K')) return Math.round(parseFloat(str) * 1000);
  if (str.endsWith('M')) return Math.round(parseFloat(str) * 1000000);
  if (str.endsWith('B')) return Math.round(parseFloat(str) * 1000000000);
  return parseInt(str) || 0;
}

/**
 * Scrape tweets from a Twitter/X profile
 * @param {string} username - Twitter username (without @)
 * @param {Object} options - Configuration options
 * @returns {Array} Array of tweet objects
 */
async function scrapeTweets(username, options = {}) {
  const {
    limit = 100,
    headless = true,
    authToken = null,
    onProgress = null,
    scrollDelay = 2000,
    maxRetries = 15,
    includeReplies = false,
  } = options;

  console.log(`🐦 Scraping tweets from @${username}`);
  console.log(`📊 Limit: ${limit} tweets`);

  // Launch browser
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
    
    // Set realistic viewport and user agent
    await page.setViewport({ 
      width: 1280 + Math.floor(Math.random() * 100), 
      height: 900 + Math.floor(Math.random() * 100),
    });
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Optional: Set auth cookie for logged-in view
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

    // Navigate to profile (with or without replies)
    const profileUrl = includeReplies 
      ? `https://x.com/${username}/with_replies`
      : `https://x.com/${username}`;
      
    await page.goto(profileUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for tweets to load
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });
    
    // Add a small random delay (human-like)
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

    const tweets = new Map();
    let retries = 0;

    // Main scraping loop
    while (tweets.size < limit && retries < maxRetries) {
      // Extract tweets from page
      const extracted = await page.evaluate(() => {
        const parseCountInPage = (str) => {
          if (!str) return 0;
          str = str.trim().replace(/,/g, '');
          if (str.endsWith('K')) return Math.round(parseFloat(str) * 1000);
          if (str.endsWith('M')) return Math.round(parseFloat(str) * 1000000);
          if (str.endsWith('B')) return Math.round(parseFloat(str) * 1000000000);
          return parseInt(str) || 0;
        };

        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        const results = [];
        
        articles.forEach(article => {
          try {
            // Get tweet ID
            const tweetLink = article.querySelector('a[href*="/status/"]');
            const href = tweetLink?.getAttribute('href') || '';
            const statusMatch = href.match(/\/status\/(\d+)/);
            const tweetId = statusMatch ? statusMatch[1] : null;
            
            if (!tweetId) return;
            
            // Author info
            const userLink = article.querySelector('a[href^="/"][role="link"]');
            const authorHref = userLink?.getAttribute('href') || '';
            const author = authorHref.split('/')[1] || null;
            
            const nameEl = article.querySelector('[data-testid="User-Name"]');
            const displayName = nameEl?.querySelector('span')?.textContent?.trim() || null;
            
            // Tweet text
            const textEl = article.querySelector('[data-testid="tweetText"]');
            const text = textEl?.textContent?.trim() || '';
            
            // Timestamp
            const timeEl = article.querySelector('time');
            const timestamp = timeEl?.getAttribute('datetime') || null;
            const displayTime = timeEl?.textContent?.trim() || null;
            
            // Engagement metrics
            const replyBtn = article.querySelector('[data-testid="reply"]');
            const retweetBtn = article.querySelector('[data-testid="retweet"]');
            const likeBtn = article.querySelector('[data-testid="like"]');
            const viewsEl = article.querySelector('a[href*="/analytics"]');
            
            const replies = parseCountInPage(replyBtn?.textContent);
            const retweets = parseCountInPage(retweetBtn?.textContent);
            const likes = parseCountInPage(likeBtn?.textContent);
            const views = parseCountInPage(viewsEl?.textContent);
            
            // Media extraction
            const media = [];
            
            // Images
            const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
            images.forEach(img => {
              const src = img.getAttribute('src');
              if (src && src.includes('pbs.twimg.com/media')) {
                media.push({
                  type: 'image',
                  url: src.replace(/&name=\w+/, '&name=large'),
                });
              }
            });
            
            // Videos
            const videos = article.querySelectorAll('video');
            videos.forEach(video => {
              const poster = video.getAttribute('poster');
              const src = video.querySelector('source')?.getAttribute('src');
              media.push({
                type: 'video',
                url: src || null,
                thumbnail: poster,
              });
            });
            
            // Retweet check
            const socialContext = article.querySelector('[data-testid="socialContext"]');
            const isRetweet = socialContext?.textContent?.includes('reposted') || false;
            
            // Quote tweet
            let quotedTweetId = null;
            const quotedTweet = article.querySelector('[role="link"][href*="/status/"]');
            if (quotedTweet && quotedTweet !== tweetLink) {
              const quotedHref = quotedTweet.getAttribute('href') || '';
              const quotedMatch = quotedHref.match(/\/status\/(\d+)/);
              quotedTweetId = quotedMatch ? quotedMatch[1] : null;
            }
            
            results.push({
              id: tweetId,
              author,
              displayName,
              text,
              timestamp,
              displayTime,
              replies,
              retweets,
              likes,
              views,
              media,
              isRetweet,
              quotedTweetId,
              url: `https://x.com/${author}/status/${tweetId}`,
            });
          } catch (e) {
            // Skip malformed tweets
          }
        });
        
        return results;
      });

      const prevSize = tweets.size;
      
      // Add to map (dedupes by ID)
      extracted.forEach(tweet => {
        if (!tweets.has(tweet.id)) {
          tweets.set(tweet.id, tweet);
        }
      });

      // Progress callback
      if (onProgress) {
        onProgress({
          scraped: tweets.size,
          limit,
          percent: Math.round((tweets.size / limit) * 100),
        });
      }

      // Check if stuck
      if (tweets.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Random delay between scrolls
      await new Promise(r => setTimeout(r, scrollDelay + Math.random() * 1000));
    }

    // Convert to array and sort by timestamp
    const result = Array.from(tweets.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    console.log(`\n✅ Scraped ${result.length} tweets`);
    return result;

  } finally {
    await browser.close();
  }
}

/**
 * Export tweets to JSON file
 */
async function exportJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filename, json);
  console.log(`💾 Saved to ${filename}`);
}

/**
 * Export tweets to CSV file
 */
async function exportCSV(data, filename) {
  const headers = [
    'id',
    'author',
    'displayName',
    'text',
    'timestamp',
    'replies',
    'retweets',
    'likes',
    'views',
    'mediaCount',
    'isRetweet',
    'url'
  ];
  
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    }
    return str;
  };
  
  const rows = data.map(tweet => 
    headers.map(h => {
      if (h === 'mediaCount') return tweet.media?.length || 0;
      return escapeCSV(tweet[h]);
    }).join(',')
  );
  
  const csv = [headers.join(','), ...rows].join('\n');
  await fs.writeFile(filename, csv);
  console.log(`💾 Saved to ${filename}`);
}

/**
 * Export media URLs to a separate file
 */
async function exportMedia(data, filename) {
  const mediaList = [];
  
  data.forEach(tweet => {
    if (tweet.media && tweet.media.length > 0) {
      tweet.media.forEach((m, idx) => {
        mediaList.push({
          tweetId: tweet.id,
          tweetUrl: tweet.url,
          mediaIndex: idx + 1,
          type: m.type,
          url: m.url,
          thumbnail: m.thumbnail || null,
        });
      });
    }
  });
  
  if (mediaList.length > 0) {
    await fs.writeFile(filename, JSON.stringify(mediaList, null, 2));
    console.log(`🖼️ Saved ${mediaList.length} media items to ${filename}`);
  }
  
  return mediaList;
}

// ============================================
// CLI Usage
// ============================================

const args = process.argv.slice(2);
const username = args[0];
const limit = parseInt(args[1]) || 100;

if (!username) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          XActions - Tweet Scraper (Node.js)                 ║
║          Author: nich (@nichxbt)                            ║
╚══════════════════════════════════════════════════════════════╝

Usage: node scrape-tweets.js <username> [limit]

Arguments:
  username    Twitter/X username (without @)
  limit       Maximum tweets to scrape (default: 100)

Examples:
  node scrape-tweets.js elonmusk 200
  node scrape-tweets.js naval 50
  node scrape-tweets.js pmarca

Output:
  {username}-tweets-{date}.json    Full tweet data
  {username}-tweets-{date}.csv     Spreadsheet format
  {username}-media-{date}.json     Media URLs only
`);
  process.exit(1);
}

// Run the scraper
console.log('');
console.log('═'.repeat(50));

scrapeTweets(username, {
  limit,
  onProgress: ({ scraped, limit, percent }) => {
    process.stdout.write(`\r📈 Progress: ${scraped}/${limit} (${percent}%)`);
  },
})
  .then(async (tweets) => {
    console.log('\n' + '═'.repeat(50));
    
    // Calculate stats
    const withMedia = tweets.filter(t => t.media.length > 0).length;
    const retweetCount = tweets.filter(t => t.isRetweet).length;
    const totalLikes = tweets.reduce((sum, t) => sum + t.likes, 0);
    const totalRetweets = tweets.reduce((sum, t) => sum + t.retweets, 0);
    const totalViews = tweets.reduce((sum, t) => sum + t.views, 0);
    const avgEngagement = tweets.length > 0 
      ? Math.round((totalLikes + totalRetweets) / tweets.length) 
      : 0;
    
    // Display stats
    console.log('\n📊 Summary:');
    console.log(`   Total tweets: ${tweets.length}`);
    console.log(`   With media: ${withMedia}`);
    console.log(`   Retweets: ${retweetCount}`);
    console.log(`   Original: ${tweets.length - retweetCount}`);
    console.log('');
    console.log('📈 Engagement:');
    console.log(`   Total likes: ${totalLikes.toLocaleString()}`);
    console.log(`   Total retweets: ${totalRetweets.toLocaleString()}`);
    console.log(`   Total views: ${totalViews.toLocaleString()}`);
    console.log(`   Avg engagement/tweet: ${avgEngagement.toLocaleString()}`);
    console.log('');
    
    // Export files
    const date = new Date().toISOString().split('T')[0];
    await exportJSON(tweets, `${username}-tweets-${date}.json`);
    await exportCSV(tweets, `${username}-tweets-${date}.csv`);
    await exportMedia(tweets, `${username}-media-${date}.json`);
    
    // Show sample tweets
    console.log('\n📋 Sample tweets (first 3):');
    console.log('─'.repeat(50));
    tweets.slice(0, 3).forEach((t, i) => {
      const preview = t.text.length > 80 ? t.text.slice(0, 80) + '...' : t.text;
      console.log(`${i + 1}. ${preview}`);
      console.log(`   ❤️ ${t.likes.toLocaleString()} · 🔁 ${t.retweets.toLocaleString()} · 💬 ${t.replies.toLocaleString()}`);
      console.log('');
    });
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
```

**Installation:**
```bash
# Install dependencies
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

**Run it:**
```bash
# Scrape 200 tweets from a user
node scrape-tweets.js elonmusk 200
```

**Output:**
```
═══════════════════════════════════════════════════
🐦 Scraping tweets from @elonmusk
📊 Limit: 200 tweets

📈 Progress: 200/200 (100%)
═══════════════════════════════════════════════════

📊 Summary:
   Total tweets: 200
   With media: 45
   Retweets: 12
   Original: 188

📈 Engagement:
   Total likes: 2,450,000
   Total retweets: 342,000
   Total views: 89,000,000
   Avg engagement/tweet: 13,960

💾 Saved to elonmusk-tweets-2026-01-01.json
💾 Saved to elonmusk-tweets-2026-01-01.csv
🖼️ Saved 67 media items to elonmusk-media-2026-01-01.json

📋 Sample tweets (first 3):
──────────────────────────────────────────────────
1. The future is here! 🚀
   ❤️ 98,000 · 🔁 12,000 · 💬 5,432

2. Working on something exciting. More details coming soon...
   ❤️ 45,000 · 🔁 3,200 · 💬 2,100

3. Good morning everyone!
   ❤️ 120,000 · 🔁 8,500 · 💬 15,000
```

---

## Tips

### 🚦 Rate Limiting

- **Browser Console**: Wait 2-3 seconds between scrolls to avoid rate limits
- **Node.js**: Use `scrollDelay: 2500` or higher for large scrapes
- Don't scrape the same profile more than once per hour
- For 500+ tweets, consider breaking into multiple sessions

```javascript
// Safe configuration for large scrapes
const tweets = await scrapeTweets('username', {
  limit: 500,
  scrollDelay: 3000, // 3 seconds between scrolls
});
```

### 🔐 Authentication

For better results (view counts, etc.), use your auth token:

```javascript
const tweets = await scrapeTweets('username', {
  authToken: 'your_auth_token_here', // From browser cookies
});
```

**How to get auth_token:**
1. Go to x.com and login
2. Open DevTools (F12) → Application → Cookies
3. Find `auth_token` and copy the value

### 📊 Best Practices

1. **Start small**: Test with 20-50 tweets first
2. **Add delays**: More delay = less chance of rate limiting
3. **Rotate IPs**: For heavy scraping, use proxies
4. **Save incrementally**: For long scrapes, save progress periodically
5. **Respect the platform**: Don't abuse scraping capabilities

### 🐛 Error Handling

```javascript
try {
  const tweets = await scrapeTweets(username, { limit: 100 });
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Profile took too long to load - try again');
  } else if (error.message.includes('tweet')) {
    console.log('No tweets found - account may be private or suspended');
  } else {
    console.log('Unknown error:', error.message);
  }
}
```

### 📁 Working with the Data

```javascript
// Filter to only original tweets (no retweets)
const original = tweets.filter(t => !t.isRetweet);

// Find most liked tweet
const mostLiked = tweets.reduce((a, b) => a.likes > b.likes ? a : b);

// Get all image URLs
const allImages = tweets
  .flatMap(t => t.media)
  .filter(m => m.type === 'image')
  .map(m => m.url);

// Filter tweets with high engagement
const viral = tweets.filter(t => t.likes > 10000 || t.retweets > 1000);
```

---

## Website Alternative

Don't want to code? Use [xactions.app](https://xactions.app):

1. Login with your X account
2. Enter any username
3. Click "Scrape Tweets"
4. Select date range and filters
5. Download JSON, CSV, or view in dashboard

**Features:**
- No coding required
- Scheduled scraping
- Historical data storage
- Export to multiple formats
- Analytics dashboard
