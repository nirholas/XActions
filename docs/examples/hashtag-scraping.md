# #️⃣ Hashtag Scraping

Scrape all tweets using a specific hashtag from X/Twitter with full metadata, engagement metrics, and flexible export options.

## 📦 What You Get

- **Complete hashtag search** - All tweets containing your target hashtag
- **Author information** - Username, display name, verification status
- Tweet text content with hashtags preserved
- Timestamps (posted date/time)
- Engagement metrics (likes, retweets, replies, views)
- Media URLs (images, videos, GIFs)
- Additional hashtags and mentions in each tweet
- URLs shared in tweets
- Filter by Top or Latest
- Export to JSON or CSV

---

## 💡 Use Cases

- **Track marketing campaigns** - Monitor your branded hashtags and campaign performance
- **Trend monitoring** - Follow trending topics and emerging conversations
- **Competitive analysis** - Analyze competitor campaigns and audience engagement
- **Research & analytics** - Study hashtag usage patterns and sentiment
- **Content curation** - Find the best content for newsletters and reports
- **Influencer discovery** - Identify key voices in specific hashtag communities
- **Event tracking** - Monitor live events, conferences, and product launches
- **Crisis monitoring** - Track brand mentions during PR situations

---

## 🌐 Example 1: Browser Console (Quick)

**Best for:** Quickly scraping hashtag tweets from search results, up to ~200 tweets

**Steps:**
1. Go to [x.com/search](https://x.com/search)
2. Enter your hashtag (e.g., `#AI` or `#crypto`)
3. Select a tab (Top or Latest)
4. Open browser console (F12 → Console tab)
5. Paste the code below and press Enter

```javascript
// ============================================
// XActions - Hashtag Scraper (Browser Console)
// Go to: x.com/search?q=%23YOUR_HASHTAG
// Open console (F12), paste this
// Author: nich (@nichxbt)
// ============================================

(async () => {
  const TARGET_COUNT = 200; // Adjust target tweet count
  const SCROLL_DELAY = 2000; // ms between scrolls (2 sec recommended)
  
  // Extract hashtag from current URL
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q') || '';
  const searchFilter = urlParams.get('f') || 'top'; // top, live (latest)
  
  // Find hashtag in query
  const hashtagMatch = searchQuery.match(/#\w+/);
  const targetHashtag = hashtagMatch ? hashtagMatch[0].toLowerCase() : searchQuery;
  
  console.log('#️⃣ Starting hashtag scrape...');
  console.log(`🏷️ Hashtag: ${targetHashtag}`);
  console.log(`📋 Filter: ${searchFilter === 'live' ? 'Latest' : 'Top'}`);
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
        
        // Extract all hashtags from text
        const hashtags = (text.match(/#\w+/g) || []).map(h => h.toLowerCase());
        
        // Extract mentions from text
        const mentions = (text.match(/@\w+/g) || []).map(m => m.toLowerCase());
        
        // Extract URLs from tweet
        const urlElements = article.querySelectorAll('[data-testid="tweetText"] a[href^="http"]');
        const urls = Array.from(urlElements).map(a => a.getAttribute('href')).filter(Boolean);
        
        // Check if it's a retweet
        const socialContext = article.querySelector('[data-testid="socialContext"]');
        const isRetweet = socialContext?.textContent?.toLowerCase().includes('reposted') || false;
        
        extracted.push({
          id: tweetId,
          url: `https://x.com/${author}/status/${tweetId}`,
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
          targetHashtag: targetHashtag,
          scrapedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Error extracting tweet:', e);
      }
    });
    
    return extracted;
  };
  
  // Scroll and collect tweets
  while (tweets.size < TARGET_COUNT && retries < maxRetries) {
    const extracted = extractTweets();
    const prevSize = tweets.size;
    
    extracted.forEach(tweet => {
      if (!tweets.has(tweet.id)) {
        tweets.set(tweet.id, tweet);
      }
    });
    
    console.log(`📊 Collected: ${tweets.size}/${TARGET_COUNT} tweets`);
    
    if (tweets.size === prevSize) {
      retries++;
      console.log(`⏳ No new tweets found, retry ${retries}/${maxRetries}`);
    } else {
      retries = 0;
    }
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, SCROLL_DELAY));
  }
  
  // Convert to array and sort by engagement
  const results = Array.from(tweets.values())
    .sort((a, b) => (b.likes + b.retweets) - (a.likes + a.retweets));
  
  console.log(`\n✅ Scraping complete!`);
  console.log(`📊 Total tweets: ${results.length}`);
  console.log(`🏷️ Hashtag: ${targetHashtag}`);
  
  // Calculate stats
  const totalLikes = results.reduce((sum, t) => sum + t.likes, 0);
  const totalRetweets = results.reduce((sum, t) => sum + t.retweets, 0);
  const totalReplies = results.reduce((sum, t) => sum + t.replies, 0);
  const uniqueAuthors = new Set(results.map(t => t.author)).size;
  const verifiedCount = results.filter(t => t.verified).length;
  
  console.log(`\n📈 Stats for ${targetHashtag}:`);
  console.log(`   👥 Unique authors: ${uniqueAuthors}`);
  console.log(`   ✅ Verified accounts: ${verifiedCount}`);
  console.log(`   ❤️ Total likes: ${totalLikes.toLocaleString()}`);
  console.log(`   🔄 Total retweets: ${totalRetweets.toLocaleString()}`);
  console.log(`   💬 Total replies: ${totalReplies.toLocaleString()}`);
  
  // Find top tweet
  if (results.length > 0) {
    const topTweet = results[0];
    console.log(`\n🏆 Top Tweet:`);
    console.log(`   @${topTweet.author}: "${topTweet.text.substring(0, 80)}..."`);
    console.log(`   ❤️ ${topTweet.likes.toLocaleString()} likes`);
  }
  
  // Export functions
  window.hashtagData = results;
  
  window.downloadJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hashtag_${targetHashtag.replace('#', '')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📁 JSON downloaded!');
  };
  
  window.downloadCSV = () => {
    const headers = ['id', 'url', 'author', 'displayName', 'verified', 'text', 'timestamp', 
                     'likes', 'retweets', 'replies', 'views', 'hashtags', 'mentions'];
    const csvRows = [headers.join(',')];
    
    results.forEach(tweet => {
      const row = [
        tweet.id,
        tweet.url,
        tweet.author,
        `"${(tweet.displayName || '').replace(/"/g, '""')}"`,
        tweet.verified,
        `"${tweet.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        tweet.timestamp,
        tweet.likes,
        tweet.retweets,
        tweet.replies,
        tweet.views,
        `"${tweet.hashtags.join(', ')}"`,
        `"${tweet.mentions.join(', ')}"`,
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hashtag_${targetHashtag.replace('#', '')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📁 CSV downloaded!');
  };
  
  window.copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    console.log('📋 Copied to clipboard!');
  };
  
  console.log(`\n💾 Export Options:`);
  console.log(`   downloadJSON()    - Save as JSON file`);
  console.log(`   downloadCSV()     - Save as CSV file`);
  console.log(`   copyToClipboard() - Copy to clipboard`);
  console.log(`   hashtagData       - Access raw data array`);
  
  return results;
})();
```

### 📊 Sample Output

```json
{
  "id": "1234567890123456789",
  "url": "https://x.com/username/status/1234567890123456789",
  "author": "username",
  "displayName": "Display Name",
  "verified": true,
  "text": "This is an amazing post about #AI and the future of technology! 🚀",
  "timestamp": "2025-12-15T14:30:00.000Z",
  "displayTime": "Dec 15",
  "replies": 42,
  "retweets": 156,
  "likes": 1234,
  "views": 45000,
  "media": [
    {
      "type": "image",
      "url": "https://pbs.twimg.com/media/xxxxx?format=jpg&name=large"
    }
  ],
  "hashtags": ["#ai", "#technology", "#future"],
  "mentions": ["@openai", "@anthropic"],
  "urls": ["https://example.com/article"],
  "isRetweet": false,
  "targetHashtag": "#ai",
  "scrapedAt": "2025-12-15T15:00:00.000Z"
}
```

---

## 🖥️ Example 2: Node.js with Puppeteer (Production)

**Best for:** Automated hashtag monitoring, large-scale scraping, scheduled jobs, CI/CD pipelines

### Prerequisites

```bash
npm install puppeteer
```

### Full Script

Create a file called `hashtag-scraper.js`:

```javascript
// ============================================
// XActions - Hashtag Scraper (Node.js + Puppeteer)
// Production-ready hashtag scraping script
// Author: nich (@nichxbt)
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  hashtag: process.argv[2] || '#AI',           // Pass hashtag as argument
  filter: process.argv[3] || 'top',            // 'top' or 'latest'
  targetCount: parseInt(process.argv[4]) || 100, // Number of tweets to scrape
  scrollDelay: 2000,                           // ms between scrolls
  maxRetries: 15,                              // Max retries when no new tweets
  headless: true,                              // Run in headless mode
  outputDir: './output',                       // Output directory
  cookiesPath: './cookies.json',               // Optional: path to cookies file
};

// Ensure hashtag starts with #
if (!CONFIG.hashtag.startsWith('#')) {
  CONFIG.hashtag = '#' + CONFIG.hashtag;
}

// Build search URL
function buildSearchUrl(hashtag, filter) {
  const encodedHashtag = encodeURIComponent(hashtag);
  let url = `https://x.com/search?q=${encodedHashtag}&src=typed_query`;
  
  if (filter === 'latest') {
    url += '&f=live';
  } else if (filter === 'top') {
    url += '&f=top';
  }
  
  return url;
}

// Main scraper function
async function scrapeHashtag() {
  console.log('#️⃣ XActions Hashtag Scraper');
  console.log('================================');
  console.log(`🏷️ Hashtag: ${CONFIG.hashtag}`);
  console.log(`📋 Filter: ${CONFIG.filter}`);
  console.log(`📊 Target: ${CONFIG.targetCount} tweets`);
  console.log(`🔇 Headless: ${CONFIG.headless}`);
  console.log('');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Load cookies if available
  if (fs.existsSync(CONFIG.cookiesPath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(CONFIG.cookiesPath, 'utf8'));
      await page.setCookie(...cookies);
      console.log('🍪 Loaded cookies from file');
    } catch (e) {
      console.warn('⚠️ Could not load cookies:', e.message);
    }
  }

  try {
    const searchUrl = buildSearchUrl(CONFIG.hashtag, CONFIG.filter);
    console.log(`🌐 Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for tweets to load
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 30000 });
    console.log('✅ Page loaded, starting scrape...\n');

    const tweets = new Map();
    let retries = 0;

    // Scraping loop
    while (tweets.size < CONFIG.targetCount && retries < CONFIG.maxRetries) {
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

            // Get media
            const mediaUrls = [];
            const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
            images.forEach(img => {
              const src = img.getAttribute('src');
              if (src && src.includes('pbs.twimg.com/media')) {
                const highRes = src.replace(/&name=\w+/, '&name=large');
                mediaUrls.push({ type: 'image', url: highRes });
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

            // Extract hashtags, mentions, URLs
            const hashtags = (text.match(/#\w+/g) || []).map(h => h.toLowerCase());
            const mentions = (text.match(/@\w+/g) || []).map(m => m.toLowerCase());
            const urlEls = article.querySelectorAll('[data-testid="tweetText"] a[href^="http"]');
            const urls = Array.from(urlEls).map(a => a.getAttribute('href')).filter(Boolean);

            // Check if retweet
            const socialContext = article.querySelector('[data-testid="socialContext"]');
            const isRetweet = socialContext?.textContent?.toLowerCase().includes('reposted') || false;

            results.push({
              id: tweetId,
              url: `https://x.com/${author}/status/${tweetId}`,
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
              scrapedAt: new Date().toISOString(),
            });
          } catch (e) {
            // Skip problematic tweets
          }
        });

        return results;
      });

      const prevSize = tweets.size;
      extracted.forEach(tweet => {
        if (!tweets.has(tweet.id)) {
          tweet.targetHashtag = CONFIG.hashtag;
          tweets.set(tweet.id, tweet);
        }
      });

      const progress = Math.min(100, Math.round((tweets.size / CONFIG.targetCount) * 100));
      process.stdout.write(`\r📊 Progress: ${tweets.size}/${CONFIG.targetCount} tweets (${progress}%)`);

      if (tweets.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      // Scroll to load more tweets
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
    }

    console.log('\n');

    // Convert to array and sort
    const results = Array.from(tweets.values())
      .sort((a, b) => (b.likes + b.retweets) - (a.likes + a.retweets));

    // Calculate and display stats
    const stats = {
      hashtag: CONFIG.hashtag,
      filter: CONFIG.filter,
      totalTweets: results.length,
      uniqueAuthors: new Set(results.map(t => t.author)).size,
      verifiedAuthors: results.filter(t => t.verified).length,
      totalLikes: results.reduce((sum, t) => sum + t.likes, 0),
      totalRetweets: results.reduce((sum, t) => sum + t.retweets, 0),
      totalReplies: results.reduce((sum, t) => sum + t.replies, 0),
      totalViews: results.reduce((sum, t) => sum + t.views, 0),
      averageLikes: Math.round(results.reduce((sum, t) => sum + t.likes, 0) / results.length) || 0,
      averageRetweets: Math.round(results.reduce((sum, t) => sum + t.retweets, 0) / results.length) || 0,
      tweetsWithMedia: results.filter(t => t.media.length > 0).length,
      originalTweets: results.filter(t => !t.isRetweet).length,
      scrapedAt: new Date().toISOString(),
    };

    console.log('✅ Scraping complete!');
    console.log('================================');
    console.log(`🏷️ Hashtag: ${stats.hashtag}`);
    console.log(`📊 Total tweets: ${stats.totalTweets}`);
    console.log(`👥 Unique authors: ${stats.uniqueAuthors}`);
    console.log(`✅ Verified accounts: ${stats.verifiedAuthors}`);
    console.log(`❤️ Total likes: ${stats.totalLikes.toLocaleString()}`);
    console.log(`🔄 Total retweets: ${stats.totalRetweets.toLocaleString()}`);
    console.log(`💬 Total replies: ${stats.totalReplies.toLocaleString()}`);
    console.log(`👀 Total views: ${stats.totalViews.toLocaleString()}`);
    console.log(`📸 Tweets with media: ${stats.tweetsWithMedia}`);
    console.log(`📝 Original tweets: ${stats.originalTweets}`);

    // Find top performers
    if (results.length > 0) {
      console.log('\n🏆 Top 3 Tweets by Engagement:');
      results.slice(0, 3).forEach((tweet, i) => {
        console.log(`   ${i + 1}. @${tweet.author} - ❤️ ${tweet.likes.toLocaleString()} | 🔄 ${tweet.retweets.toLocaleString()}`);
        console.log(`      "${tweet.text.substring(0, 60)}..."`);
      });
    }

    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const safeHashtag = CONFIG.hashtag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '_');

    // Save JSON
    const jsonPath = path.join(CONFIG.outputDir, `hashtag_${safeHashtag}_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ stats, tweets: results }, null, 2));
    console.log(`\n📁 JSON saved: ${jsonPath}`);

    // Save CSV
    const csvPath = path.join(CONFIG.outputDir, `hashtag_${safeHashtag}_${timestamp}.csv`);
    const headers = ['id', 'url', 'author', 'displayName', 'verified', 'text', 'timestamp', 
                     'likes', 'retweets', 'replies', 'views', 'hashtags', 'mentions', 'hasMedia', 'isRetweet'];
    const csvRows = [headers.join(',')];
    
    results.forEach(tweet => {
      const row = [
        tweet.id,
        tweet.url,
        tweet.author,
        `"${(tweet.displayName || '').replace(/"/g, '""')}"`,
        tweet.verified,
        `"${tweet.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        tweet.timestamp,
        tweet.likes,
        tweet.retweets,
        tweet.replies,
        tweet.views,
        `"${tweet.hashtags.join(', ')}"`,
        `"${tweet.mentions.join(', ')}"`,
        tweet.media.length > 0,
        tweet.isRetweet,
      ];
      csvRows.push(row.join(','));
    });
    
    fs.writeFileSync(csvPath, csvRows.join('\n'));
    console.log(`📁 CSV saved: ${csvPath}`);

    // Save stats summary
    const statsPath = path.join(CONFIG.outputDir, `hashtag_${safeHashtag}_${timestamp}_stats.json`);
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`📁 Stats saved: ${statsPath}`);

    return { stats, tweets: results };

  } catch (error) {
    console.error('\n❌ Error during scraping:', error.message);
    throw error;
  } finally {
    await browser.close();
    console.log('\n🔒 Browser closed');
  }
}

// Run the scraper
scrapeHashtag()
  .then(({ stats }) => {
    console.log(`\n✨ Successfully scraped ${stats.totalTweets} tweets for ${stats.hashtag}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed:', error.message);
    process.exit(1);
  });
```

### 🚀 Usage

```bash
# Basic usage (default: #AI, top tweets, 100 tweets)
node hashtag-scraper.js

# Scrape specific hashtag
node hashtag-scraper.js "#crypto"

# Scrape with filter (top or latest)
node hashtag-scraper.js "#bitcoin" latest

# Specify number of tweets
node hashtag-scraper.js "#ethereum" top 500

# Scrape latest tweets with custom count
node hashtag-scraper.js "#defi" latest 200
```

### 📂 Output Structure

```
output/
├── hashtag_AI_1735689600000.json          # Full data with stats
├── hashtag_AI_1735689600000.csv           # CSV export
└── hashtag_AI_1735689600000_stats.json    # Summary statistics
```

### 🔐 Using Cookies for Authentication

For better results and higher rate limits, export your Twitter cookies:

1. Login to X/Twitter in Chrome
2. Open DevTools (F12) → Application → Cookies
3. Right-click → Export to JSON (or use a cookie export extension)
4. Save as `cookies.json` in the script directory

```javascript
// Cookies file format (cookies.json)
[
  {
    "name": "auth_token",
    "value": "your_auth_token_here",
    "domain": ".x.com",
    "path": "/",
    "secure": true,
    "httpOnly": true
  },
  {
    "name": "ct0",
    "value": "your_ct0_token_here",
    "domain": ".x.com",
    "path": "/",
    "secure": true,
    "httpOnly": true
  }
]
```

---

## 🎯 Popular Hashtag Search Patterns

### 📈 Trend Monitoring

```bash
# Single trending hashtag
node hashtag-scraper.js "#trending" latest 200

# Tech trends
node hashtag-scraper.js "#AI" top 100
node hashtag-scraper.js "#crypto" latest 100
node hashtag-scraper.js "#Web3" top 100
```

### 🏢 Brand & Campaign Tracking

```bash
# Track branded hashtags
node hashtag-scraper.js "#YourBrandName" latest 500

# Product launch monitoring
node hashtag-scraper.js "#ProductLaunch2025" latest 200

# Event hashtags
node hashtag-scraper.js "#TechConference2025" latest 300
```

### 🔍 Competitive Analysis

```bash
# Monitor competitor campaigns
node hashtag-scraper.js "#CompetitorBrand" top 100

# Industry hashtags
node hashtag-scraper.js "#SaaS" latest 200
node hashtag-scraper.js "#StartupLife" top 100
```

---

## 📊 Advanced Analysis Examples

### JavaScript: Analyze Scraped Data

```javascript
// Load scraped data
const data = require('./output/hashtag_AI_1735689600000.json');
const tweets = data.tweets;

// Find most engaging tweets
const topByLikes = [...tweets].sort((a, b) => b.likes - a.likes).slice(0, 10);
console.log('Top 10 by likes:', topByLikes.map(t => ({ author: t.author, likes: t.likes })));

// Find most active authors
const authorCounts = tweets.reduce((acc, t) => {
  acc[t.author] = (acc[t.author] || 0) + 1;
  return acc;
}, {});
const topAuthors = Object.entries(authorCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
console.log('Most active authors:', topAuthors);

// Find co-occurring hashtags
const coHashtags = tweets.reduce((acc, t) => {
  t.hashtags.forEach(h => {
    if (h !== data.stats.hashtag.toLowerCase()) {
      acc[h] = (acc[h] || 0) + 1;
    }
  });
  return acc;
}, {});
const topCoHashtags = Object.entries(coHashtags)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
console.log('Related hashtags:', topCoHashtags);

// Engagement by time of day
const byHour = tweets.reduce((acc, t) => {
  const hour = new Date(t.timestamp).getHours();
  acc[hour] = acc[hour] || { count: 0, likes: 0 };
  acc[hour].count++;
  acc[hour].likes += t.likes;
  return acc;
}, {});
console.log('Engagement by hour:', byHour);

// Verified vs non-verified engagement
const verifiedLikes = tweets.filter(t => t.verified).reduce((s, t) => s + t.likes, 0);
const nonVerifiedLikes = tweets.filter(t => !t.verified).reduce((s, t) => s + t.likes, 0);
console.log('Verified account likes:', verifiedLikes);
console.log('Non-verified account likes:', nonVerifiedLikes);
```

### Python: Data Analysis

```python
import json
import pandas as pd
from collections import Counter

# Load data
with open('output/hashtag_AI_1735689600000.json', 'r') as f:
    data = json.load(f)

tweets = data['tweets']
df = pd.DataFrame(tweets)

# Basic stats
print(f"Total tweets: {len(df)}")
print(f"Unique authors: {df['author'].nunique()}")
print(f"Average likes: {df['likes'].mean():.2f}")
print(f"Average retweets: {df['retweets'].mean():.2f}")

# Top authors by tweet count
top_authors = df['author'].value_counts().head(10)
print("\nTop authors by tweet count:")
print(top_authors)

# Top tweets by engagement
df['engagement'] = df['likes'] + df['retweets'] + df['replies']
top_tweets = df.nlargest(10, 'engagement')[['author', 'text', 'engagement']]
print("\nTop tweets by engagement:")
print(top_tweets)

# Hashtag co-occurrence
all_hashtags = [h for hashtags in df['hashtags'] for h in hashtags]
hashtag_counts = Counter(all_hashtags)
print("\nMost common co-occurring hashtags:")
print(hashtag_counts.most_common(10))

# Verified account analysis
verified_df = df[df['verified'] == True]
print(f"\nVerified accounts: {len(verified_df)}")
print(f"Verified avg engagement: {verified_df['engagement'].mean():.2f}")
```

---

## 💡 Tips & Best Practices

### 🚀 Performance Tips

1. **Start with "Top" filter** - Gets most engaging content first
2. **Use Latest for real-time** - Monitor live events and breaking news
3. **Set realistic targets** - Start with 100-200 tweets, scale up gradually
4. **Add delays** - 2-3 seconds between scrolls to avoid rate limiting

### ⚠️ Rate Limiting & Anti-Detection

- Don't scrape too aggressively (use delays)
- Use authenticated sessions for higher limits
- Rotate user agents if doing large-scale scraping
- Consider proxy rotation for extensive monitoring
- Break large scrapes into smaller batches

### 🔐 Authentication Benefits

Using cookies/authentication provides:
- Higher rate limits
- Access to more tweets
- Better data quality
- Less chance of blocking

### 📊 Data Quality Tips

```javascript
// Filter out retweets for original content only
const originalTweets = tweets.filter(t => !t.isRetweet);

// Filter by minimum engagement
const qualityTweets = tweets.filter(t => t.likes >= 10);

// Get only verified accounts
const verifiedTweets = tweets.filter(t => t.verified);

// Get tweets with media
const mediaTweets = tweets.filter(t => t.media.length > 0);

// Get tweets from last 24 hours
const recentTweets = tweets.filter(t => {
  const tweetDate = new Date(t.timestamp);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return tweetDate > dayAgo;
});
```

---

## 🌐 Website Alternative

Don't want to run scripts? Use our web app:

### [xactions.app](https://xactions.app)

- ✅ No coding required
- ✅ Visual hashtag search interface
- ✅ Real-time hashtag monitoring
- ✅ One-click export to CSV/JSON
- ✅ Save hashtag tracking templates
- ✅ Schedule recurring hashtag scrapes
- ✅ Advanced filtering and analytics
- ✅ Trend visualization dashboard
- ✅ Compare multiple hashtags

---

## 📚 Related Examples

- [Search Tweets](search-tweets.md) - Advanced search with operators
- [Tweet Scraping](tweet-scraping.md) - Scrape tweets from profiles
- [Followers Scraping](followers-scraping.md) - Get follower lists
- [Profile Scraping](profile-scraping.md) - Extract profile data
- [Trend Analysis](detect-unfollowers.md) - Monitor account changes

---

## 🔗 Resources

- [Twitter Search Docs](https://help.twitter.com/en/using-x/x-advanced-search)
- [XActions Documentation](https://xactions.app/docs)
- [Puppeteer Setup Guide](../../PUPPETEER_SETUP.md)

---

**Author:** nich ([@nichxbt](https://x.com/nichxbt))

**License:** MIT
