# 🔍 Search Tweets

Search and scrape tweets from X/Twitter using keywords, hashtags, advanced operators, and filters.

## 📦 What You Get

- **Keyword Search** - Find tweets containing specific words or phrases
- **Hashtag Search** - Search by #hashtags
- **User Search** - Tweets from specific users (from:username)
- **Advanced Operators** - Combine filters for precise results
- **Tab Filters** - Switch between Top, Latest, Photos, Videos
- **Full Tweet Data** - Text, metrics, media, timestamps
- **Export Options** - JSON, CSV, clipboard

### Supported Search Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `keyword` | `bitcoin` | Basic keyword search |
| `"exact phrase"` | `"to the moon"` | Exact phrase match |
| `#hashtag` | `#crypto` | Search by hashtag |
| `from:` | `from:elonmusk` | Tweets from a user |
| `to:` | `to:openai` | Replies to a user |
| `@mention` | `@github` | Tweets mentioning user |
| `since:` | `since:2025-01-01` | Tweets after date |
| `until:` | `until:2025-12-31` | Tweets before date |
| `min_faves:` | `min_faves:1000` | Minimum likes |
| `min_retweets:` | `min_retweets:500` | Minimum retweets |
| `min_replies:` | `min_replies:100` | Minimum replies |
| `filter:` | `filter:images` | Filter by media type |
| `lang:` | `lang:en` | Filter by language |
| `-keyword` | `-spam` | Exclude keyword |
| `OR` | `bitcoin OR ethereum` | Match either term |

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Quick searches, testing queries, up to ~200 tweets

**Steps:**
1. Go to [x.com/search](https://x.com/search)
2. Enter your search query in the search bar
3. Select a tab (Top, Latest, People, Photos, Videos)
4. Open console (F12 → Console tab)
5. Paste the script below and press Enter

```javascript
// ============================================
// XActions - Tweet Search Scraper (Browser Console)
// Go to: x.com/search?q=YOUR_QUERY
// Open console (F12), paste this
// Author: nich (@nichxbt)
// ============================================

(async () => {
  const TARGET_COUNT = 200; // Adjust as needed
  const SCROLL_DELAY = 2000; // ms between scrolls
  
  // Get current search query from URL
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q') || 'unknown';
  const searchFilter = urlParams.get('f') || 'top'; // top, live (latest), image, video
  
  console.log('🔍 Starting tweet search scrape...');
  console.log(`📝 Query: "${searchQuery}"`);
  console.log(`🏷️ Filter: ${searchFilter}`);
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
        const userLinks = article.querySelectorAll('a[href^="/"][role="link"]');
        let author = null;
        for (const link of userLinks) {
          const linkHref = link.getAttribute('href') || '';
          if (linkHref.match(/^\/[a-zA-Z0-9_]+$/) && !linkHref.includes('/status/')) {
            author = linkHref.slice(1);
            break;
          }
        }
        
        // Get display name
        const nameEl = article.querySelector('[data-testid="User-Name"]');
        const displayName = nameEl?.querySelector('span')?.textContent?.trim() || null;
        
        // Check if verified
        const verified = !!article.querySelector('[data-testid="icon-verified"]') ||
                        !!article.querySelector('svg[aria-label*="Verified"]');
        
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
        
        // Extract hashtags from text
        const hashtags = (text.match(/#\w+/g) || []).map(h => h.toLowerCase());
        
        // Extract mentions from text
        const mentions = (text.match(/@\w+/g) || []).map(m => m.toLowerCase());
        
        // Extract URLs from tweet
        const urlElements = article.querySelectorAll('[data-testid="tweetText"] a[href^="http"]');
        const urls = Array.from(urlElements).map(a => a.getAttribute('href')).filter(Boolean);
        
        // Check if it's a retweet
        const socialContext = article.querySelector('[data-testid="socialContext"]');
        const isRetweet = socialContext?.textContent?.toLowerCase().includes('reposted') || false;
        
        // Check if it's a reply
        const isReply = !!article.querySelector('[data-testid="tweetText"]')
          ?.closest('div')
          ?.parentElement
          ?.querySelector('div[dir] > span')
          ?.textContent?.includes('Replying to');
        
        extracted.push({
          id: tweetId,
          author,
          displayName,
          verified,
          text,
          timestamp,
          displayTime,
          replies,
          retweets,
          likes,
          views,
          media: mediaUrls,
          hashtags,
          mentions,
          urls,
          isRetweet,
          isReply,
          searchQuery,
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
  
  // Convert to array and sort by engagement (likes)
  const result = Array.from(tweets.values())
    .sort((a, b) => b.likes - a.likes);
  
  // Calculate stats
  const totalLikes = result.reduce((sum, t) => sum + t.likes, 0);
  const totalRetweets = result.reduce((sum, t) => sum + t.retweets, 0);
  const totalViews = result.reduce((sum, t) => sum + t.views, 0);
  const withMedia = result.filter(t => t.media.length > 0).length;
  const verifiedAuthors = result.filter(t => t.verified).length;
  const uniqueAuthors = new Set(result.map(t => t.author)).size;
  
  // Summary
  console.log('\n✅ Search scraping complete!');
  console.log(`📝 Query: "${searchQuery}"`);
  console.log(`📊 Total tweets: ${result.length}`);
  console.log(`👥 Unique authors: ${uniqueAuthors}`);
  console.log(`✓ Verified authors: ${verifiedAuthors}`);
  console.log(`🖼️ With media: ${withMedia}`);
  console.log(`❤️ Total likes: ${totalLikes.toLocaleString()}`);
  console.log(`🔄 Total retweets: ${totalRetweets.toLocaleString()}`);
  console.log(`👁️ Total views: ${totalViews.toLocaleString()}`);
  
  // Top 5 tweets by engagement
  console.log('\n🏆 Top 5 Tweets by Likes:');
  result.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. @${t.author}: ${t.text.slice(0, 50)}... (${t.likes.toLocaleString()} ❤️)`);
  });
  
  // Copy to clipboard
  const json = JSON.stringify(result, null, 2);
  await navigator.clipboard.writeText(json);
  console.log('\n📋 Copied to clipboard!');
  
  // Create downloadable file
  const safeQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const blob = new Blob([json], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `search-${safeQuery}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  console.log('📥 Download started!');
  
  // Store in window for access
  window.searchResults = result;
  console.log('\n💾 Access data: window.searchResults');
  
  return result;
})();
```

**What happens:**
1. Reads the current search query from the URL
2. Scrolls through search results automatically
3. Extracts full tweet data including metrics and media
4. Deduplicates by tweet ID
5. Sorts results by engagement (likes)
6. Downloads JSON file with safe filename
7. Copies data to clipboard

**Sample Output:**
```json
{
  "id": "1234567890123456789",
  "author": "VitalikButerin",
  "displayName": "vitalik.eth",
  "verified": true,
  "text": "Ethereum scaling is progressing faster than expected! 🚀 #ETH",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "displayTime": "5h",
  "replies": 1234,
  "retweets": 5678,
  "likes": 45000,
  "views": 2300000,
  "media": [],
  "hashtags": ["#eth"],
  "mentions": [],
  "urls": [],
  "isRetweet": false,
  "isReply": false,
  "searchQuery": "ethereum",
  "url": "https://x.com/VitalikButerin/status/1234567890123456789"
}
```

---

## 🖥️ Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Large searches, automation, scheduled monitoring, data analysis

### Installation

```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

### Full Script

```javascript
// ============================================
// XActions - Tweet Search Scraper (Node.js)
// Save as: search-tweets.js
// Run: node search-tweets.js "bitcoin" --filter latest --count 500
// Author: nich (@nichxbt)
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

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
 * Search and scrape tweets from Twitter/X
 * @param {string} query - Search query (supports operators)
 * @param {Object} options - Configuration options
 * @returns {Array} Array of tweet objects
 */
async function searchTweets(query, options = {}) {
  const {
    count = 100,
    filter = 'top',        // 'top', 'latest', 'photos', 'videos'
    scrollDelay = 2000,
    maxRetries = 15,
    headless = true,
    cookiesPath = null,    // Path to cookies JSON for auth
    outputFormat = 'json', // 'json' or 'csv'
    outputPath = null,     // Output file path
  } = options;

  console.log('🔍 XActions Tweet Search Scraper');
  console.log('================================');
  console.log(`📝 Query: "${query}"`);
  console.log(`🏷️ Filter: ${filter}`);
  console.log(`📊 Target: ${count} tweets`);
  console.log(`💻 Headless: ${headless}`);

  // Map filter names to URL parameters
  const filterMap = {
    'top': '',
    'latest': '&f=live',
    'photos': '&f=image',
    'videos': '&f=video',
  };

  const filterParam = filterMap[filter] || '';
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `https://x.com/search?q=${encodedQuery}${filterParam}&src=typed_query`;

  console.log(`🔗 URL: ${searchUrl}\n`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();

  // Set viewport and user agent
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Load cookies if provided (for authenticated searches)
  if (cookiesPath) {
    try {
      const cookiesData = await fs.readFile(cookiesPath, 'utf-8');
      const cookies = JSON.parse(cookiesData);
      await page.setCookie(...cookies);
      console.log('🍪 Loaded authentication cookies');
    } catch (e) {
      console.log('⚠️ Could not load cookies, continuing without auth');
    }
  }

  // Navigate to search page
  console.log('🌐 Loading search page...');
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for tweets to load
  await page.waitForSelector('article[data-testid="tweet"]', { timeout: 30000 })
    .catch(() => console.log('⚠️ No tweets found or page took too long'));

  // Give extra time for initial load
  await new Promise(r => setTimeout(r, 3000));

  const tweets = new Map();
  let retries = 0;

  // Main scraping loop
  while (tweets.size < count && retries < maxRetries) {
    // Extract tweets from page
    const extracted = await page.evaluate(() => {
      const parseCount = (str) => {
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

          // Get author
          const userLinks = article.querySelectorAll('a[href^="/"][role="link"]');
          let author = null;
          for (const link of userLinks) {
            const linkHref = link.getAttribute('href') || '';
            if (linkHref.match(/^\/[a-zA-Z0-9_]+$/) && !linkHref.includes('/status/')) {
              author = linkHref.slice(1);
              break;
            }
          }

          // Get display name
          const nameEl = article.querySelector('[data-testid="User-Name"]');
          const displayName = nameEl?.querySelector('span')?.textContent?.trim() || null;

          // Verified status
          const verified = !!article.querySelector('[data-testid="icon-verified"]') ||
                          !!article.querySelector('svg[aria-label*="Verified"]');

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

          const replies = parseCount(replyBtn?.textContent);
          const retweets = parseCount(retweetBtn?.textContent);
          const likes = parseCount(likeBtn?.textContent);
          const views = parseCount(viewsEl?.textContent);

          // Media
          const mediaUrls = [];
          const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
          images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && src.includes('pbs.twimg.com/media')) {
              mediaUrls.push({
                type: 'image',
                url: src.replace(/&name=\w+/, '&name=large'),
              });
            }
          });

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

          // Extract hashtags and mentions
          const hashtags = (text.match(/#\w+/g) || []).map(h => h.toLowerCase());
          const mentions = (text.match(/@\w+/g) || []).map(m => m.toLowerCase());

          // URLs in tweet
          const urlElements = article.querySelectorAll('[data-testid="tweetText"] a[href^="http"]');
          const urls = Array.from(urlElements).map(a => a.getAttribute('href')).filter(Boolean);

          // Retweet check
          const socialContext = article.querySelector('[data-testid="socialContext"]');
          const isRetweet = socialContext?.textContent?.toLowerCase().includes('reposted') || false;

          results.push({
            id: tweetId,
            author,
            displayName,
            verified,
            text,
            timestamp,
            displayTime,
            replies,
            retweets,
            likes,
            views,
            media: mediaUrls,
            hashtags,
            mentions,
            urls,
            isRetweet,
            url: `https://x.com/${author}/status/${tweetId}`,
          });
        } catch (e) {
          // Skip malformed
        }
      });

      return results;
    });

    const prevSize = tweets.size;

    // Add to map (dedupe)
    extracted.forEach(tweet => {
      if (!tweets.has(tweet.id)) {
        tweets.set(tweet.id, { ...tweet, searchQuery: query, filter });
      }
    });

    console.log(`📈 Scraped: ${tweets.size}/${count} tweets`);

    // Check if stuck
    if (tweets.size === prevSize) {
      retries++;
      console.log(`⏳ No new tweets (retry ${retries}/${maxRetries})`);
    } else {
      retries = 0;
    }

    // Scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, scrollDelay));
  }

  // Close browser
  await browser.close();

  // Convert to array and sort
  const result = Array.from(tweets.values())
    .sort((a, b) => b.likes - a.likes);

  // Statistics
  const stats = {
    query,
    filter,
    totalTweets: result.length,
    uniqueAuthors: new Set(result.map(t => t.author)).size,
    verifiedAuthors: result.filter(t => t.verified).length,
    withMedia: result.filter(t => t.media.length > 0).length,
    totalLikes: result.reduce((sum, t) => sum + t.likes, 0),
    totalRetweets: result.reduce((sum, t) => sum + t.retweets, 0),
    totalViews: result.reduce((sum, t) => sum + t.views, 0),
    avgLikes: Math.round(result.reduce((sum, t) => sum + t.likes, 0) / result.length) || 0,
    scrapedAt: new Date().toISOString(),
  };

  // Print summary
  console.log('\n✅ Search scraping complete!');
  console.log('================================');
  console.log(`📝 Query: "${query}"`);
  console.log(`📊 Total tweets: ${stats.totalTweets}`);
  console.log(`👥 Unique authors: ${stats.uniqueAuthors}`);
  console.log(`✓ Verified: ${stats.verifiedAuthors}`);
  console.log(`🖼️ With media: ${stats.withMedia}`);
  console.log(`❤️ Total likes: ${stats.totalLikes.toLocaleString()}`);
  console.log(`📊 Avg likes: ${stats.avgLikes.toLocaleString()}`);
  console.log(`🔄 Total retweets: ${stats.totalRetweets.toLocaleString()}`);
  console.log(`👁️ Total views: ${stats.totalViews.toLocaleString()}`);

  // Top tweets
  console.log('\n🏆 Top 5 Tweets:');
  result.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. @${t.author} (${t.likes.toLocaleString()} ❤️): ${t.text.slice(0, 60)}...`);
  });

  // Export
  const exportData = { stats, tweets: result };

  if (outputPath || outputFormat) {
    const safeQuery = query.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const defaultPath = `search-${safeQuery}-${new Date().toISOString().split('T')[0]}`;

    if (outputFormat === 'csv') {
      const csvPath = outputPath || `${defaultPath}.csv`;
      const csvContent = convertToCSV(result);
      await fs.writeFile(csvPath, csvContent);
      console.log(`\n💾 Saved to: ${csvPath}`);
    } else {
      const jsonPath = outputPath || `${defaultPath}.json`;
      await fs.writeFile(jsonPath, JSON.stringify(exportData, null, 2));
      console.log(`\n💾 Saved to: ${jsonPath}`);
    }
  }

  return exportData;
}

/**
 * Convert tweets array to CSV format
 */
function convertToCSV(tweets) {
  const headers = [
    'id', 'author', 'displayName', 'verified', 'text', 'timestamp',
    'replies', 'retweets', 'likes', 'views', 'hashtags', 'mentions',
    'mediaCount', 'isRetweet', 'url'
  ];

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '';
    const escaped = String(str).replace(/"/g, '""');
    return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
      ? `"${escaped}"`
      : escaped;
  };

  const rows = tweets.map(t => [
    t.id,
    t.author,
    t.displayName,
    t.verified,
    t.text,
    t.timestamp,
    t.replies,
    t.retweets,
    t.likes,
    t.views,
    t.hashtags.join(';'),
    t.mentions.join(';'),
    t.media.length,
    t.isRetweet,
    t.url,
  ].map(escapeCSV).join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    query: '',
    count: 100,
    filter: 'top',
    headless: true,
    outputFormat: 'json',
    outputPath: null,
    cookiesPath: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--count' || arg === '-c') {
      options.count = parseInt(args[++i]) || 100;
    } else if (arg === '--filter' || arg === '-f') {
      options.filter = args[++i] || 'top';
    } else if (arg === '--format') {
      options.outputFormat = args[++i] || 'json';
    } else if (arg === '--output' || arg === '-o') {
      options.outputPath = args[++i];
    } else if (arg === '--cookies') {
      options.cookiesPath = args[++i];
    } else if (arg === '--no-headless') {
      options.headless = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
🔍 XActions Tweet Search Scraper

Usage:
  node search-tweets.js <query> [options]

Arguments:
  <query>              Search query (supports Twitter operators)

Options:
  -c, --count <n>      Number of tweets to scrape (default: 100)
  -f, --filter <type>  Filter type: top, latest, photos, videos (default: top)
  --format <type>      Output format: json, csv (default: json)
  -o, --output <path>  Output file path
  --cookies <path>     Path to cookies.json for authenticated searches
  --no-headless        Show browser window
  -h, --help           Show this help

Examples:
  node search-tweets.js "bitcoin"
  node search-tweets.js "#ethereum" --filter latest --count 500
  node search-tweets.js "from:elonmusk AI" --format csv
  node search-tweets.js "crypto min_faves:1000" --cookies cookies.json

Twitter Search Operators:
  from:user            Tweets from a specific user
  to:user              Replies to a user
  @user                Mentions of a user
  #hashtag             Hashtag search
  "exact phrase"       Exact phrase match
  since:YYYY-MM-DD     Tweets after date
  until:YYYY-MM-DD     Tweets before date
  min_faves:N          Minimum likes
  min_retweets:N       Minimum retweets
  filter:images        Only tweets with images
  filter:videos        Only tweets with videos
  lang:en              Language filter
  -word                Exclude word
  word1 OR word2       Match either word
      `);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.query = arg;
    }
  }

  return options;
}

// Main execution
const options = parseArgs();

if (!options.query) {
  console.error('❌ Error: Search query is required');
  console.error('Usage: node search-tweets.js <query> [options]');
  console.error('Run with --help for more information');
  process.exit(1);
}

searchTweets(options.query, {
  count: options.count,
  filter: options.filter,
  headless: options.headless,
  outputFormat: options.outputFormat,
  outputPath: options.outputPath,
  cookiesPath: options.cookiesPath,
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

### Usage Examples

```bash
# Basic search
node search-tweets.js "bitcoin"

# Search with hashtag, get latest tweets
node search-tweets.js "#ethereum" --filter latest --count 500

# Search from specific user
node search-tweets.js "from:elonmusk AI" --count 200

# High engagement tweets only
node search-tweets.js "crypto min_faves:1000" --filter top

# Export to CSV
node search-tweets.js "#NFT" --format csv --output nft-tweets.csv

# With authentication (for protected searches)
node search-tweets.js "from:privatuser" --cookies cookies.json

# Watch browser (debugging)
node search-tweets.js "breaking news" --no-headless
```

---

## 🎯 Advanced Search Operators

Master Twitter's search operators for precise results:

### 👤 User Operators

```
from:elonmusk              # Tweets BY this user
to:openai                  # Replies TO this user
@github                    # Tweets mentioning this user
from:elonmusk to:BillGates # Conversation between users
```

### 📅 Date Operators

```
since:2025-01-01           # Tweets after Jan 1, 2025
until:2025-12-31           # Tweets before Dec 31, 2025
since:2025-01-01 until:2025-01-31  # Tweets in January 2025
```

### 📊 Engagement Operators

```
min_faves:1000             # At least 1000 likes
min_retweets:500           # At least 500 retweets
min_replies:100            # At least 100 replies
min_faves:10000 min_retweets:1000  # Viral tweets
```

### 🖼️ Media Filters

```
filter:images              # Only tweets with images
filter:videos              # Only tweets with videos
filter:links               # Only tweets with links
filter:media               # Tweets with any media
-filter:retweets           # Exclude retweets
-filter:replies            # Exclude replies
```

### 🌐 Language & Location

```
lang:en                    # English tweets only
lang:es                    # Spanish tweets only
lang:ja                    # Japanese tweets only
near:NYC within:10mi       # Tweets near location (limited)
```

### 🔤 Text Operators

```
"exact phrase"             # Exact phrase match
word1 OR word2             # Either word
word1 AND word2            # Both words (default)
-spam                      # Exclude word
(bitcoin OR ethereum)      # Group operators
```

### 💡 Power Combinations

```bash
# Viral AI tweets from 2025
"artificial intelligence" min_faves:5000 since:2025-01-01

# Tech influencer opinions on crypto
(from:elonmusk OR from:VitalikButerin) crypto

# Breaking news without retweets
"breaking" -filter:retweets since:2025-01-01

# Product launches with images
"launching" OR "announcing" filter:images min_faves:1000

# Job postings in tech
(hiring OR "we're looking") (developer OR engineer) -filter:retweets

# Viral threads
min_faves:10000 min_retweets:2000 -filter:retweets lang:en
```

---

## 💡 Tips & Best Practices

### 🚀 Performance Tips

1. **Start with Top filter** - Gets most engaging tweets first
2. **Use date ranges** - Narrow down results for faster scraping
3. **Add engagement filters** - `min_faves:100` reduces noise
4. **Exclude retweets** - `-filter:retweets` for original content only

### ⚠️ Rate Limiting

- Add delays between scrolls (2-3 seconds recommended)
- Don't scrape too aggressively (Twitter may block)
- Use authenticated sessions for higher limits
- Consider breaking large searches into date ranges

### 🔐 Authentication

For better results, export your Twitter cookies:

1. Login to Twitter in Chrome
2. Open DevTools → Application → Cookies
3. Export cookies to JSON file
4. Use `--cookies cookies.json` flag

### 📊 Data Processing

```javascript
// Filter high-engagement tweets
const viral = tweets.filter(t => t.likes > 1000);

// Get unique authors
const authors = [...new Set(tweets.map(t => t.author))];

// Group by hashtag
const byHashtag = tweets.reduce((acc, t) => {
  t.hashtags.forEach(h => {
    acc[h] = acc[h] || [];
    acc[h].push(t);
  });
  return acc;
}, {});

// Sort by date
const chronological = tweets.sort((a, b) => 
  new Date(a.timestamp) - new Date(b.timestamp)
);
```

---

## 🌐 Website Alternative

Don't want to run scripts? Use our web app:

### [xactions.app](https://xactions.app)

- ✅ No coding required
- ✅ Visual search interface
- ✅ One-click export to CSV/JSON
- ✅ Save search templates
- ✅ Schedule recurring searches
- ✅ Advanced filtering UI
- ✅ Real-time previews

---

## 📚 Related Examples

- [Tweet Scraping](tweet-scraping.md) - Scrape tweets from profiles
- [Followers Scraping](followers-scraping.md) - Get follower lists
- [Profile Scraping](profile-scraping.md) - Extract profile data

---

## 🔗 Resources

- [Twitter Search Docs](https://help.twitter.com/en/using-x/x-advanced-search)
- [XActions Documentation](https://xactions.app/docs)
- [Puppeteer Setup Guide](../../PUPPETEER_SETUP.md)

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))

**License:** MIT
