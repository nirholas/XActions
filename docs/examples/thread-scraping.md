# 🧵 Thread Scraping

Scrape complete tweet threads from X/Twitter with proper ordering and full metadata extraction.

## 📦 What You Get

- **Full thread extraction** - All tweets from the thread author in order
- Tweet text content with proper sequence
- Timestamps (posted date/time)
- Engagement metrics (likes, retweets, replies, views)
- Media URLs (images, videos, GIFs)
- Thread position/index
- Reply chain structure
- Quote tweet references
- Export to JSON or CSV

---

## 💡 Use Cases

- **Save viral threads** - Archive valuable thread content before deletion
- **Analyze thread structure** - Study how authors build engaging threads
- **Content repurposing** - Extract threads for newsletters or blogs
- **Research & archival** - Preserve important discussions and tutorials
- **Thread analytics** - Compare engagement across thread positions

---

## 📖 Example 1: Browser Console (Quick)

**Best for:** Quickly scraping a thread you're currently viewing

**Instructions:**
1. Navigate to any tweet in a thread (e.g., `x.com/username/status/123456789`)
2. Open browser console (F12 → Console tab)
3. Paste the code below and press Enter

```javascript
// ============================================
// XActions - Thread Scraper (Browser Console)
// Go to: x.com/USERNAME/status/TWEET_ID
// Open console (F12), paste this
// Author: nich (@nichxbt)
// ============================================

(async () => {
  const SCROLL_DELAY = 1500; // ms between scrolls
  const MAX_SCROLL_ATTEMPTS = 20; // Max scrolls to find all thread tweets
  
  console.log('🧵 Starting thread scrape...');
  
  // Get the main tweet author from the page
  const getThreadAuthor = () => {
    // Get author from the main/focused tweet
    const mainTweet = document.querySelector('[data-testid="tweet"][tabindex="-1"]') 
                   || document.querySelector('article[data-testid="tweet"]');
    if (!mainTweet) return null;
    
    const userLink = mainTweet.querySelector('a[href^="/"][role="link"][tabindex="-1"]');
    if (!userLink) return null;
    
    const href = userLink.getAttribute('href') || '';
    return href.split('/')[1] || null;
  };
  
  const threadAuthor = getThreadAuthor();
  
  if (!threadAuthor) {
    console.error('❌ Could not detect thread author. Make sure you are on a tweet page.');
    return;
  }
  
  console.log(`👤 Thread author: @${threadAuthor}`);
  
  // Helper to parse count strings like "1.2K", "45M"
  const parseCount = (str) => {
    if (!str) return 0;
    str = str.trim().replace(/,/g, '');
    if (str.endsWith('K')) return Math.round(parseFloat(str) * 1000);
    if (str.endsWith('M')) return Math.round(parseFloat(str) * 1000000);
    if (str.endsWith('B')) return Math.round(parseFloat(str) * 1000000000);
    return parseInt(str) || 0;
  };
  
  // Extract thread tweets from visible articles
  const extractThreadTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const threadTweets = [];
    
    articles.forEach(article => {
      try {
        // Get tweet ID from the tweet link
        const tweetLinks = article.querySelectorAll('a[href*="/status/"]');
        let tweetId = null;
        let tweetHref = null;
        
        for (const link of tweetLinks) {
          const href = link.getAttribute('href') || '';
          const match = href.match(/\/([^/]+)\/status\/(\d+)/);
          if (match && match[1].toLowerCase() === threadAuthor.toLowerCase()) {
            tweetId = match[2];
            tweetHref = href;
            break;
          }
        }
        
        if (!tweetId) return;
        
        // Get author info
        const userLink = article.querySelector('a[href^="/"][role="link"]');
        const authorHref = userLink?.getAttribute('href') || '';
        const author = authorHref.split('/')[1] || null;
        
        // Only include tweets from thread author
        if (author?.toLowerCase() !== threadAuthor.toLowerCase()) return;
        
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
        
        // Check for "Show this thread" indicator (confirms it's part of a thread)
        const isThreaded = !!article.querySelector('[data-testid="tweet-text-show-more-link"]') 
                        || document.querySelectorAll(`a[href*="/${threadAuthor}/status/"]`).length > 1;
        
        threadTweets.push({
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
          url: `https://x.com/${author}/status/${tweetId}`,
        });
      } catch (e) {
        // Skip malformed tweets
      }
    });
    
    return threadTweets;
  };
  
  // Sleep helper
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Scroll to top first to get the start of the thread
  console.log('⬆️ Scrolling to top of thread...');
  window.scrollTo(0, 0);
  await sleep(1000);
  
  // Collect all thread tweets
  const threadTweets = new Map();
  let scrollAttempts = 0;
  let lastCount = 0;
  let stableCount = 0;
  
  // First scroll up to find thread start
  let prevScrollTop = window.scrollY;
  while (scrollAttempts < 10) {
    window.scrollBy(0, -1000);
    await sleep(800);
    if (window.scrollY === prevScrollTop) break;
    prevScrollTop = window.scrollY;
    scrollAttempts++;
  }
  
  await sleep(1000);
  console.log('⬇️ Scrolling through thread...');
  
  // Now scroll down and collect all tweets
  scrollAttempts = 0;
  while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    const extracted = extractThreadTweets();
    
    extracted.forEach(tweet => {
      if (!threadTweets.has(tweet.id)) {
        threadTweets.set(tweet.id, tweet);
      }
    });
    
    console.log(`📈 Found: ${threadTweets.size} thread tweets`);
    
    // Check if we've stopped finding new tweets
    if (threadTweets.size === lastCount) {
      stableCount++;
      if (stableCount >= 3) {
        console.log('✓ No more thread tweets found');
        break;
      }
    } else {
      stableCount = 0;
      lastCount = threadTweets.size;
    }
    
    // Scroll down
    window.scrollBy(0, 600);
    await sleep(SCROLL_DELAY);
    scrollAttempts++;
  }
  
  // Convert to array and sort by timestamp (oldest first for thread order)
  const result = Array.from(threadTweets.values())
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((tweet, index) => ({
      ...tweet,
      threadPosition: index + 1,
      isFirstTweet: index === 0,
      isLastTweet: index === threadTweets.size - 1,
    }));
  
  // Build thread summary
  const threadText = result.map((t, i) => `[${i + 1}/${result.length}] ${t.text}`).join('\n\n');
  
  // Summary
  console.log('\n✅ Thread scraping complete!');
  console.log(`🧵 Thread length: ${result.length} tweets`);
  console.log(`👤 Author: @${threadAuthor}`);
  console.log(`❤️ Total likes: ${result.reduce((sum, t) => sum + t.likes, 0).toLocaleString()}`);
  console.log(`🔄 Total retweets: ${result.reduce((sum, t) => sum + t.retweets, 0).toLocaleString()}`);
  console.log(`👁️ Total views: ${result.reduce((sum, t) => sum + t.views, 0).toLocaleString()}`);
  console.log(`🖼️ Total media items: ${result.reduce((sum, t) => sum + t.media.length, 0)}`);
  
  // Copy to clipboard
  const output = {
    thread: {
      author: threadAuthor,
      tweetCount: result.length,
      scrapedAt: new Date().toISOString(),
      firstTweetUrl: result[0]?.url || null,
      totalLikes: result.reduce((sum, t) => sum + t.likes, 0),
      totalRetweets: result.reduce((sum, t) => sum + t.retweets, 0),
      totalViews: result.reduce((sum, t) => sum + t.views, 0),
    },
    tweets: result,
    threadText: threadText,
  };
  
  const json = JSON.stringify(output, null, 2);
  await navigator.clipboard.writeText(json);
  console.log('\n📋 Copied to clipboard!');
  
  // Also log for download
  console.log('\n💾 Data (right-click → Copy object):');
  console.log(output);
  
  // Create downloadable file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `thread-${threadAuthor}-${result[0]?.id || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  console.log('📥 Download started!');
  
  // Also create a plain text version of the thread
  const textBlob = new Blob([`Thread by @${threadAuthor}\n${'='.repeat(40)}\n\n${threadText}`], { type: 'text/plain' });
  const textUrl = URL.createObjectURL(textBlob);
  const textLink = document.createElement('a');
  textLink.href = textUrl;
  textLink.download = `thread-${threadAuthor}-${result[0]?.id || 'unknown'}.txt`;
  textLink.click();
  console.log('📝 Text version downloaded!');
  
  return output;
})();
```

**What happens:**
1. Detects the thread author from the current tweet
2. Scrolls up to find the thread start
3. Scrolls down to collect all thread tweets
4. Extracts only tweets from the thread author (filters out replies from others)
5. Sorts tweets in chronological order (thread sequence)
6. Downloads JSON file with full metadata
7. Downloads plain text version for easy reading

**Sample Output:**
```json
{
  "thread": {
    "author": "naval",
    "tweetCount": 39,
    "scrapedAt": "2026-01-01T12:00:00.000Z",
    "firstTweetUrl": "https://x.com/naval/status/1002103360646823936",
    "totalLikes": 245000,
    "totalRetweets": 89000,
    "totalViews": 12500000
  },
  "tweets": [
    {
      "id": "1002103360646823936",
      "author": "naval",
      "displayName": "Naval",
      "text": "How to Get Rich (without getting lucky):",
      "timestamp": "2018-05-31T18:09:08.000Z",
      "threadPosition": 1,
      "isFirstTweet": true,
      "isLastTweet": false,
      "replies": 1234,
      "retweets": 15000,
      "likes": 45000,
      "views": 2100000,
      "media": [],
      "url": "https://x.com/naval/status/1002103360646823936"
    },
    {
      "id": "1002103497725173760",
      "author": "naval",
      "text": "Seek wealth, not money or status...",
      "threadPosition": 2,
      "isFirstTweet": false,
      "isLastTweet": false
    }
  ],
  "threadText": "[1/39] How to Get Rich (without getting lucky):\n\n[2/39] Seek wealth, not money or status..."
}
```

---

## 🚀 Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Automated thread archiving, scheduled jobs, batch processing, building thread databases

**Prerequisites:**
```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

**Save as:** `scrape-thread.js`

```javascript
// ============================================
// XActions - Thread Scraper (Node.js + Puppeteer)
// Save as: scrape-thread.js
// Run: node scrape-thread.js https://x.com/naval/status/1002103360646823936
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
 * Extract username and tweet ID from a Twitter URL
 */
function parseTweetUrl(url) {
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/);
  if (!match) {
    throw new Error('Invalid tweet URL. Expected format: https://x.com/username/status/1234567890');
  }
  return { username: match[1], tweetId: match[2] };
}

/**
 * Scrape a complete thread from X/Twitter
 * @param {string} tweetUrl - URL to any tweet in the thread
 * @param {Object} options - Configuration options
 * @returns {Object} Thread data with all tweets
 */
async function scrapeThread(tweetUrl, options = {}) {
  const {
    headless = true,
    authToken = null,
    scrollDelay = 1500,
    maxScrollAttempts = 25,
    outputDir = './threads',
    onProgress = null,
  } = options;

  const { username, tweetId } = parseTweetUrl(tweetUrl);
  
  console.log(`🧵 Scraping thread from @${username}`);
  console.log(`🔗 Starting tweet: ${tweetId}`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
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

    // Optional: Set auth cookie for logged-in view (recommended for threads)
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

    // Navigate to the tweet
    console.log('📄 Loading tweet page...');
    await page.goto(tweetUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for tweets to load
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });
    
    // Random human-like delay
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

    // Get the thread author
    const threadAuthor = await page.evaluate(() => {
      const mainTweet = document.querySelector('[data-testid="tweet"][tabindex="-1"]') 
                     || document.querySelector('article[data-testid="tweet"]');
      if (!mainTweet) return null;
      
      const userLink = mainTweet.querySelector('a[href^="/"][role="link"][tabindex="-1"]');
      if (!userLink) return null;
      
      const href = userLink.getAttribute('href') || '';
      return href.split('/')[1] || null;
    });

    if (!threadAuthor) {
      throw new Error('Could not detect thread author');
    }

    console.log(`👤 Thread author: @${threadAuthor}`);

    // Function to extract thread tweets from the page
    const extractThreadTweets = async () => {
      return await page.evaluate((authorName) => {
        const parseCountInPage = (str) => {
          if (!str) return 0;
          str = str.trim().replace(/,/g, '');
          if (str.endsWith('K')) return Math.round(parseFloat(str) * 1000);
          if (str.endsWith('M')) return Math.round(parseFloat(str) * 1000000);
          if (str.endsWith('B')) return Math.round(parseFloat(str) * 1000000000);
          return parseInt(str) || 0;
        };

        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        const threadTweets = [];
        
        articles.forEach(article => {
          try {
            // Get tweet ID
            const tweetLinks = article.querySelectorAll('a[href*="/status/"]');
            let tweetId = null;
            
            for (const link of tweetLinks) {
              const href = link.getAttribute('href') || '';
              const match = href.match(/\/([^/]+)\/status\/(\d+)/);
              if (match) {
                tweetId = match[2];
                break;
              }
            }
            
            if (!tweetId) return;
            
            // Get author info
            const userLink = article.querySelector('a[href^="/"][role="link"]');
            const authorHref = userLink?.getAttribute('href') || '';
            const author = authorHref.split('/')[1] || null;
            
            // Only include tweets from thread author
            if (author?.toLowerCase() !== authorName.toLowerCase()) return;
            
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
            
            const replies = parseCountInPage(replyBtn?.textContent);
            const retweets = parseCountInPage(retweetBtn?.textContent);
            const likes = parseCountInPage(likeBtn?.textContent);
            const views = parseCountInPage(viewsEl?.textContent);
            
            // Get media
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
                type: video.closest('[data-testid="videoPlayer"]') ? 'video' : 'gif',
                url: src || null,
                thumbnail: poster,
              });
            });
            
            threadTweets.push({
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
              url: `https://x.com/${author}/status/${tweetId}`,
            });
          } catch (e) {
            // Skip malformed tweets
          }
        });
        
        return threadTweets;
      }, threadAuthor);
    };

    // Scroll to top first to get thread start
    console.log('⬆️ Finding thread start...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 1000));

    // Scroll up to find the beginning of the thread
    let scrollUpAttempts = 0;
    while (scrollUpAttempts < 10) {
      const prevPos = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => window.scrollBy(0, -800));
      await new Promise(r => setTimeout(r, 800));
      const newPos = await page.evaluate(() => window.scrollY);
      if (newPos === prevPos) break;
      scrollUpAttempts++;
    }

    await new Promise(r => setTimeout(r, 1000));
    console.log('⬇️ Collecting thread tweets...');

    // Collect all thread tweets
    const threadTweets = new Map();
    let scrollAttempts = 0;
    let lastCount = 0;
    let stableCount = 0;

    while (scrollAttempts < maxScrollAttempts) {
      const extracted = await extractThreadTweets();
      
      extracted.forEach(tweet => {
        if (!threadTweets.has(tweet.id)) {
          threadTweets.set(tweet.id, tweet);
        }
      });

      if (onProgress) {
        onProgress({ found: threadTweets.size, scrollAttempts });
      }

      console.log(`📈 Found: ${threadTweets.size} thread tweets`);

      // Check if we've stopped finding new tweets
      if (threadTweets.size === lastCount) {
        stableCount++;
        if (stableCount >= 4) {
          console.log('✓ Thread collection complete');
          break;
        }
      } else {
        stableCount = 0;
        lastCount = threadTweets.size;
      }

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 500));
      await new Promise(r => setTimeout(r, scrollDelay));
      scrollAttempts++;
    }

    // Sort by timestamp (oldest first = thread order)
    const tweets = Array.from(threadTweets.values())
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((tweet, index, arr) => ({
        ...tweet,
        threadPosition: index + 1,
        isFirstTweet: index === 0,
        isLastTweet: index === arr.length - 1,
      }));

    // Build thread text
    const threadText = tweets
      .map((t, i) => `[${i + 1}/${tweets.length}] ${t.text}`)
      .join('\n\n');

    // Build result
    const result = {
      thread: {
        author: threadAuthor,
        tweetCount: tweets.length,
        scrapedAt: new Date().toISOString(),
        sourceUrl: tweetUrl,
        firstTweetId: tweets[0]?.id || null,
        firstTweetUrl: tweets[0]?.url || null,
        lastTweetUrl: tweets[tweets.length - 1]?.url || null,
        totalLikes: tweets.reduce((sum, t) => sum + t.likes, 0),
        totalRetweets: tweets.reduce((sum, t) => sum + t.retweets, 0),
        totalReplies: tweets.reduce((sum, t) => sum + t.replies, 0),
        totalViews: tweets.reduce((sum, t) => sum + t.views, 0),
        totalMedia: tweets.reduce((sum, t) => sum + t.media.length, 0),
      },
      tweets,
      threadText,
    };

    // Save to files
    await fs.mkdir(outputDir, { recursive: true });
    
    const baseFilename = `thread-${threadAuthor}-${tweets[0]?.id || tweetId}`;
    
    // Save JSON
    const jsonPath = path.join(outputDir, `${baseFilename}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(result, null, 2));
    console.log(`💾 Saved JSON: ${jsonPath}`);
    
    // Save plain text
    const textContent = `Thread by @${threadAuthor}
${'='.repeat(50)}
Scraped: ${result.thread.scrapedAt}
Tweets: ${result.thread.tweetCount}
Total Likes: ${result.thread.totalLikes.toLocaleString()}
Total Retweets: ${result.thread.totalRetweets.toLocaleString()}
Total Views: ${result.thread.totalViews.toLocaleString()}
${'='.repeat(50)}

${threadText}

${'='.repeat(50)}
Source: ${tweetUrl}
`;
    
    const textPath = path.join(outputDir, `${baseFilename}.txt`);
    await fs.writeFile(textPath, textContent);
    console.log(`📝 Saved text: ${textPath}`);

    // Summary
    console.log('\n✅ Thread scraping complete!');
    console.log(`🧵 Thread length: ${tweets.length} tweets`);
    console.log(`👤 Author: @${threadAuthor}`);
    console.log(`❤️ Total likes: ${result.thread.totalLikes.toLocaleString()}`);
    console.log(`🔄 Total retweets: ${result.thread.totalRetweets.toLocaleString()}`);
    console.log(`👁️ Total views: ${result.thread.totalViews.toLocaleString()}`);

    return result;

  } finally {
    await browser.close();
  }
}

/**
 * Batch scrape multiple threads
 */
async function scrapeMultipleThreads(urls, options = {}) {
  const results = [];
  
  for (let i = 0; i < urls.length; i++) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Processing thread ${i + 1}/${urls.length}`);
    console.log(`${'='.repeat(50)}\n`);
    
    try {
      const result = await scrapeThread(urls[i], options);
      results.push({ url: urls[i], success: true, data: result });
    } catch (error) {
      console.error(`❌ Failed to scrape ${urls[i]}: ${error.message}`);
      results.push({ url: urls[i], success: false, error: error.message });
    }
    
    // Delay between threads to avoid rate limiting
    if (i < urls.length - 1) {
      const delay = 5000 + Math.random() * 3000;
      console.log(`⏳ Waiting ${Math.round(delay / 1000)}s before next thread...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  return results;
}

// ============================================
// CLI Usage
// ============================================

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🧵 XActions Thread Scraper
==========================

Usage:
  node scrape-thread.js <tweet-url> [options]

Examples:
  node scrape-thread.js https://x.com/naval/status/1002103360646823936
  node scrape-thread.js https://x.com/sahaboramanaz/status/1671589652076371968 --visible

Options:
  --visible     Run browser in visible mode (not headless)
  --auth=TOKEN  Use auth token for authenticated access
  --output=DIR  Output directory (default: ./threads)

Note: Any tweet in the thread works - the scraper finds the full thread automatically.
`);
  process.exit(0);
}

// Parse CLI arguments
const tweetUrl = args.find(arg => arg.startsWith('http'));
const isVisible = args.includes('--visible');
const authArg = args.find(arg => arg.startsWith('--auth='));
const authToken = authArg ? authArg.split('=')[1] : null;
const outputArg = args.find(arg => arg.startsWith('--output='));
const outputDir = outputArg ? outputArg.split('=')[1] : './threads';

if (!tweetUrl) {
  console.error('❌ Please provide a tweet URL');
  process.exit(1);
}

// Run the scraper
scrapeThread(tweetUrl, {
  headless: !isVisible,
  authToken,
  outputDir,
})
  .then(result => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

// Export for use as module
export { scrapeThread, scrapeMultipleThreads, parseTweetUrl };
```

**Run the scraper:**
```bash
# Scrape a thread
node scrape-thread.js https://x.com/naval/status/1002103360646823936

# Run with visible browser (for debugging)
node scrape-thread.js https://x.com/sahil/status/1234567890 --visible

# Specify output directory
node scrape-thread.js https://x.com/naval/status/1002103360646823936 --output=./my-threads

# With authentication (optional, for better access)
node scrape-thread.js https://x.com/naval/status/1002103360646823936 --auth=YOUR_AUTH_TOKEN
```

**What happens:**
1. Opens browser and navigates to the tweet URL
2. Detects the thread author automatically
3. Scrolls up to find the thread start
4. Scrolls down collecting all author tweets
5. Filters out replies from other users
6. Sorts tweets in chronological order
7. Saves JSON with full metadata
8. Saves plain text version for easy reading
9. Reports engagement statistics

---

## 📊 Output Files

The scraper generates two files:

### JSON File (`thread-username-tweetid.json`)
Complete structured data with:
- Thread metadata (author, total engagement, tweet count)
- Array of all tweets with full details
- Plain text version of the thread

### Text File (`thread-username-tweetid.txt`)
Human-readable format:
```
Thread by @naval
==================================================
Scraped: 2026-01-01T12:00:00.000Z
Tweets: 39
Total Likes: 245,000
Total Retweets: 89,000
Total Views: 12,500,000
==================================================

[1/39] How to Get Rich (without getting lucky):

[2/39] Seek wealth, not money or status. Wealth is having assets that earn while you sleep...

[3/39] Understand that ethical wealth creation is possible...

...
```

---

## 🎯 Tips & Best Practices

### 1. Finding the Thread Start
You can paste the URL of **any tweet in a thread** - the scraper automatically finds and collects the full thread.

### 2. Authentication (Recommended)
For better reliability and access to sensitive content:
```javascript
// Get your auth_token from browser cookies
// In Chrome: DevTools → Application → Cookies → x.com → auth_token

const result = await scrapeThread(url, {
  authToken: 'your_auth_token_here'
});
```

### 3. Rate Limiting
When scraping multiple threads:
- Add delays between requests (5-10 seconds)
- Don't scrape more than 50 threads per hour
- Use the batch function with built-in delays

### 4. Long Threads
For very long threads (100+ tweets):
```javascript
await scrapeThread(url, {
  maxScrollAttempts: 50, // Increase scroll attempts
  scrollDelay: 2000,     // Slower scrolling
});
```

### 5. Handling Errors
Common issues and solutions:
- **"Could not detect thread author"** - Page may not have loaded. Try increasing timeout.
- **Empty results** - Account may be private or suspended.
- **Incomplete thread** - Increase `maxScrollAttempts`.

---

## 🌐 Website Alternative: XActions.app

Don't want to run code? Use our web interface:

**[xactions.app](https://xactions.app)**

1. Visit [xactions.app](https://xactions.app)
2. Paste any tweet URL from a thread
3. Click "Scrape Thread"
4. Download JSON or copy to clipboard
5. No code required!

**Features:**
- ✅ No installation required
- ✅ Works on any device
- ✅ Export to JSON, CSV, or plain text
- ✅ Thread analytics dashboard
- ✅ Bookmark threads for later

---

## 📚 Related Examples

- [Tweet Scraping](tweet-scraping.md) - Scrape individual tweets from profiles
- [Profile Scraping](profile-scraping.md) - Get user profile information
- [Search Tweets](search-tweets.md) - Search and scrape tweets by keyword
- [Followers Scraping](followers-scraping.md) - Scrape follower lists

---

## ⚠️ Important Notes

- Respect X/Twitter's Terms of Service
- Don't scrape private accounts without permission
- Use reasonable delays to avoid rate limiting
- Consider API alternatives for high-volume needs
- Thread data is point-in-time (engagement metrics may change)

---

*Author: nich ([@nichxbt](https://x.com/nichxbt))*  
*Part of the [XActions](https://xactions.app) toolkit*
