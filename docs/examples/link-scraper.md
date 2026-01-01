# Link Scraper

Extract all external links and URLs shared by any X/Twitter user with full context and engagement data.

## 🔗 What It Does

The Link Scraper automatically scrolls through a user's tweets and extracts all external URLs they've shared. This is perfect for:

- **Resource Discovery** - Find tools, articles, and websites someone recommends
- **Research** - Compile a list of all sources a journalist or researcher cites
- **Competitive Analysis** - See what tools and services competitors promote
- **Content Curation** - Collect recommended resources from industry experts
- **Link Building** - Find sites that influencers in your niche share

### What You Get

- All external URLs shared in tweets (excludes twitter.com/x.com links)
- Tweet text context for each link
- Engagement metrics (likes, retweets, replies, views)
- Share frequency (how many times same URL was shared)
- Deduplication of identical links
- Domain grouping for easy analysis
- Export to JSON with full metadata

---

## 🖥️ Example 1: Browser Console (Quick)

**Best for:** Quick link extraction from any profile, no setup required

```javascript
// ============================================
// XActions - Link Scraper (Browser Console)
// Go to: x.com/USERNAME (any profile page)
// Open console (F12), paste this, press Enter
// Author: nich (@nichxbt)
// ============================================

(async () => {
  const TARGET_TWEETS = 200;       // Number of tweets to process
  const SCROLL_DELAY = 2000;       // ms between scrolls
  const INCLUDE_TWITTER_LINKS = false; // Set true to include x.com/twitter.com links
  
  console.log('🔗 Starting Link Scraper...');
  console.log(`🎯 Target: ${TARGET_TWEETS} tweets`);
  
  // Verify we're on a profile page
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length === 0 || ['home', 'explore', 'search', 'notifications', 'messages'].includes(pathParts[0])) {
    console.error('❌ Please navigate to a user profile first!');
    console.log('💡 Example: x.com/elonmusk');
    return;
  }
  
  const username = pathParts[0];
  console.log(`👤 Scraping links from: @${username}`);
  
  const links = new Map(); // url -> { count, tweets, context, firstSeen }
  const processedTweetIds = new Set();
  let tweetsProcessed = 0;
  let retries = 0;
  const maxRetries = 15;
  
  // Helper: Parse count strings like "1.2K", "45M"
  const parseCount = (str) => {
    if (!str) return 0;
    str = str.trim().replace(/,/g, '');
    if (str.endsWith('K')) return Math.round(parseFloat(str) * 1000);
    if (str.endsWith('M')) return Math.round(parseFloat(str) * 1000000);
    if (str.endsWith('B')) return Math.round(parseFloat(str) * 1000000000);
    return parseInt(str) || 0;
  };
  
  // Helper: Check if URL is external (not Twitter/X)
  const isExternalLink = (url) => {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.replace('www.', '').toLowerCase();
      
      // Skip Twitter internal links
      const twitterDomains = ['twitter.com', 'x.com', 't.co', 'pic.twitter.com', 'pbs.twimg.com', 'video.twimg.com', 'abs.twimg.com'];
      
      if (!INCLUDE_TWITTER_LINKS && twitterDomains.some(d => domain.includes(d))) {
        return false;
      }
      
      // Skip common non-content links
      if (domain.includes('twimg.com')) return false;
      
      return true;
    } catch {
      return false;
    }
  };
  
  // Helper: Extract expanded URL from anchor
  const getExpandedUrl = (anchor) => {
    // Priority 1: title attribute (Twitter often puts expanded URL here)
    const title = anchor.getAttribute('title');
    if (title && title.startsWith('http')) return title;
    
    // Priority 2: Text content if it's a full URL
    const text = anchor.textContent.trim();
    if (text.startsWith('http') && !text.includes('…') && !text.includes('...')) {
      return text;
    }
    
    // Priority 3: href
    return anchor.href;
  };
  
  // Extract links and data from tweets
  const extractFromTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    let newTweets = 0;
    
    articles.forEach(article => {
      try {
        // Get tweet ID
        const tweetLink = article.querySelector('a[href*="/status/"]');
        const href = tweetLink?.getAttribute('href') || '';
        const statusMatch = href.match(/\/status\/(\d+)/);
        const tweetId = statusMatch ? statusMatch[1] : null;
        
        if (!tweetId || processedTweetIds.has(tweetId)) return;
        
        processedTweetIds.add(tweetId);
        tweetsProcessed++;
        newTweets++;
        
        // Get tweet text
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const tweetText = textEl?.textContent?.trim() || '';
        
        // Get timestamp
        const timeEl = article.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || null;
        
        // Get engagement metrics
        const replyBtn = article.querySelector('[data-testid="reply"]');
        const retweetBtn = article.querySelector('[data-testid="retweet"]');
        const likeBtn = article.querySelector('[data-testid="like"]');
        const viewsEl = article.querySelector('a[href*="/analytics"]');
        
        const engagement = {
          replies: parseCount(replyBtn?.textContent),
          retweets: parseCount(retweetBtn?.textContent),
          likes: parseCount(likeBtn?.textContent),
          views: parseCount(viewsEl?.textContent),
        };
        
        const tweetUrl = `https://x.com/${username}/status/${tweetId}`;
        
        // Extract all links from tweet
        const anchors = article.querySelectorAll('[data-testid="tweetText"] a[href]');
        
        anchors.forEach(anchor => {
          const url = getExpandedUrl(anchor);
          
          if (isExternalLink(url)) {
            // Normalize URL (remove tracking params, etc.)
            let normalizedUrl = url;
            try {
              const parsed = new URL(url);
              // Keep only essential parts (remove common tracking params)
              ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source'].forEach(param => {
                parsed.searchParams.delete(param);
              });
              normalizedUrl = parsed.toString();
            } catch {}
            
            if (links.has(normalizedUrl)) {
              // Update existing link
              const existing = links.get(normalizedUrl);
              existing.count++;
              existing.tweets.push({
                id: tweetId,
                url: tweetUrl,
                text: tweetText.slice(0, 280),
                timestamp,
                engagement,
              });
              // Update totals
              existing.totalLikes += engagement.likes;
              existing.totalRetweets += engagement.retweets;
            } else {
              // Add new link
              links.set(normalizedUrl, {
                url: normalizedUrl,
                count: 1,
                domain: new URL(normalizedUrl).hostname.replace('www.', ''),
                firstSeen: timestamp || new Date().toISOString(),
                tweets: [{
                  id: tweetId,
                  url: tweetUrl,
                  text: tweetText.slice(0, 280),
                  timestamp,
                  engagement,
                }],
                totalLikes: engagement.likes,
                totalRetweets: engagement.retweets,
              });
            }
          }
        });
      } catch (e) {
        // Skip malformed tweets
      }
    });
    
    return newTweets;
  };
  
  // Sleep helper
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Main scraping loop
  while (tweetsProcessed < TARGET_TWEETS && retries < maxRetries) {
    const newTweets = extractFromTweets();
    
    if (newTweets === 0) {
      retries++;
      console.log(`⏳ No new tweets (retry ${retries}/${maxRetries})`);
    } else {
      retries = 0;
    }
    
    console.log(`📊 Progress: ${tweetsProcessed} tweets processed, ${links.size} unique links found`);
    
    // Scroll to load more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  // Process results
  const sortedLinks = Array.from(links.values())
    .sort((a, b) => b.count - a.count || b.totalLikes - a.totalLikes);
  
  // Group by domain
  const byDomain = {};
  sortedLinks.forEach(link => {
    if (!byDomain[link.domain]) byDomain[link.domain] = [];
    byDomain[link.domain].push(link);
  });
  
  const sortedDomains = Object.entries(byDomain)
    .sort((a, b) => b[1].length - a[1].length);
  
  // Console summary
  console.log('\n' + '═'.repeat(60));
  console.log(`🔗 LINKS FROM @${username}`);
  console.log('═'.repeat(60));
  console.log(`📊 Total unique links: ${links.size}`);
  console.log(`📄 Tweets processed: ${tweetsProcessed}`);
  console.log(`🌐 Unique domains: ${sortedDomains.length}`);
  console.log('═'.repeat(60));
  
  // Show top domains
  console.log('\n📈 TOP DOMAINS:');
  sortedDomains.slice(0, 10).forEach(([domain, domainLinks], i) => {
    const totalEngagement = domainLinks.reduce((sum, l) => sum + l.totalLikes + l.totalRetweets, 0);
    console.log(`${i + 1}. ${domain} (${domainLinks.length} links, ${totalEngagement.toLocaleString()} engagement)`);
  });
  
  // Show most shared links
  console.log('\n🔥 MOST SHARED LINKS:');
  sortedLinks.slice(0, 10).forEach((link, i) => {
    console.log(`${i + 1}. ${link.url}`);
    console.log(`   ↳ Shared ${link.count}x | ❤️ ${link.totalLikes.toLocaleString()} | 🔄 ${link.totalRetweets.toLocaleString()}`);
  });
  
  // Prepare export data
  const exportData = {
    username,
    scrapedAt: new Date().toISOString(),
    summary: {
      totalLinks: links.size,
      tweetsProcessed,
      uniqueDomains: sortedDomains.length,
    },
    topDomains: sortedDomains.slice(0, 20).map(([domain, domainLinks]) => ({
      domain,
      linkCount: domainLinks.length,
      totalEngagement: domainLinks.reduce((sum, l) => sum + l.totalLikes + l.totalRetweets, 0),
    })),
    links: sortedLinks.map(link => ({
      url: link.url,
      domain: link.domain,
      timesShared: link.count,
      totalLikes: link.totalLikes,
      totalRetweets: link.totalRetweets,
      firstSeen: link.firstSeen,
      tweets: link.tweets,
    })),
  };
  
  // Copy to clipboard
  const json = JSON.stringify(exportData, null, 2);
  await navigator.clipboard.writeText(json);
  console.log('\n✅ Copied to clipboard!');
  
  // Download JSON file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${username}-links-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Also download plain text list
  const textContent = sortedLinks.map(l => l.url).join('\n');
  const textBlob = new Blob([textContent], { type: 'text/plain' });
  const textUrl = URL.createObjectURL(textBlob);
  const textLink = document.createElement('a');
  textLink.href = textUrl;
  textLink.download = `${username}-links-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(textLink);
  textLink.click();
  document.body.removeChild(textLink);
  URL.revokeObjectURL(textUrl);
  
  console.log('📥 Downloads started! (JSON + TXT)');
  console.log('\n💡 Tip: Check your Downloads folder for the files');
  
  return exportData;
})();
```

**What happens:**
1. Script scrolls through the user's timeline
2. Extracts all external links from each tweet
3. Captures tweet text context and engagement metrics
4. Deduplicates and tracks share frequency
5. Groups links by domain
6. Downloads JSON (with full metadata) and TXT (simple URL list)
7. Copies JSON to clipboard

**Sample Output:**
```json
{
  "username": "naval",
  "scrapedAt": "2026-01-01T12:00:00.000Z",
  "summary": {
    "totalLinks": 47,
    "tweetsProcessed": 200,
    "uniqueDomains": 23
  },
  "topDomains": [
    { "domain": "nav.al", "linkCount": 12, "totalEngagement": 45230 },
    { "domain": "youtube.com", "linkCount": 8, "totalEngagement": 32100 }
  ],
  "links": [
    {
      "url": "https://nav.al/how-to-get-rich",
      "domain": "nav.al",
      "timesShared": 5,
      "totalLikes": 12500,
      "totalRetweets": 3200,
      "firstSeen": "2025-06-15T10:30:00.000Z",
      "tweets": [
        {
          "id": "1234567890",
          "url": "https://x.com/naval/status/1234567890",
          "text": "Thread on how to get rich without getting lucky...",
          "timestamp": "2025-06-15T10:30:00.000Z",
          "engagement": { "replies": 234, "retweets": 1200, "likes": 5600, "views": 890000 }
        }
      ]
    }
  ]
}
```

---

## 🚀 Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Automation, scheduled scraping, large-scale extraction, API integration

### Prerequisites

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

### Full Script

```javascript
// ============================================
// XActions - Link Scraper (Node.js + Puppeteer)
// Save as: scrape-links.js
// Run: node scrape-links.js USERNAME [limit]
// Example: node scrape-links.js naval 500
// Author: nich (@nichxbt)
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

puppeteer.use(StealthPlugin());

/**
 * Link Scraper Configuration
 */
const CONFIG = {
  // Filtering
  includeTwitterLinks: false,     // Include x.com/twitter.com links
  includeMediaLinks: false,       // Include pic.twitter.com, pbs.twimg.com
  
  // Domains to exclude (beyond Twitter)
  excludeDomains: [
    't.co',                       // Twitter shortener (we expand these)
  ],
  
  // Only include these domains (empty = all domains)
  onlyDomains: [],
  
  // Remove tracking parameters from URLs
  removeTrackingParams: true,
  trackingParams: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source', 'fbclid', 'gclid'],
};

/**
 * Scrape all external links from a user's tweets
 * @param {string} username - Twitter/X username to scrape
 * @param {Object} options - Configuration options
 * @returns {Object} Scraped link data
 */
async function scrapeLinks(username, options = {}) {
  const {
    limit = 300,
    headless = true,
    authToken = null,
    scrollDelay = 2000,
    maxRetries = 15,
    outputDir = './output',
    onProgress = null,
  } = options;

  console.log('🔗 XActions Link Scraper');
  console.log('═'.repeat(50));
  console.log(`👤 Target: @${username}`);
  console.log(`📊 Tweet limit: ${limit}`);
  console.log(`📁 Output: ${outputDir}`);
  console.log('═'.repeat(50));

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
    ],
  });

  try {
    const page = await browser.newPage();

    // Randomize viewport slightly to appear more human
    await page.setViewport({
      width: 1280 + Math.floor(Math.random() * 200),
      height: 800 + Math.floor(Math.random() * 200),
    });

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set auth cookie if provided (for accessing protected content)
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

    // Navigate to user's profile
    console.log(`\n📍 Navigating to @${username}...`);
    await page.goto(`https://x.com/${username}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for tweets to load
    try {
      await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });
    } catch (e) {
      console.error('❌ Could not load tweets. Profile may be private or not exist.');
      return null;
    }

    // Small random delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));

    // State tracking
    const links = new Map();
    const processedTweetIds = new Set();
    let tweetsProcessed = 0;
    let retries = 0;

    console.log('\n🚀 Starting link extraction...\n');

    // Main scraping loop
    while (tweetsProcessed < limit && retries < maxRetries) {
      // Extract data from visible tweets
      const result = await page.evaluate((config) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        const extracted = [];

        const parseCount = (str) => {
          if (!str) return 0;
          str = str.trim().replace(/,/g, '');
          if (str.endsWith('K')) return Math.round(parseFloat(str) * 1000);
          if (str.endsWith('M')) return Math.round(parseFloat(str) * 1000000);
          if (str.endsWith('B')) return Math.round(parseFloat(str) * 1000000000);
          return parseInt(str) || 0;
        };

        const isExternalLink = (url) => {
          try {
            const parsed = new URL(url);
            const domain = parsed.hostname.replace('www.', '').toLowerCase();

            const twitterDomains = ['twitter.com', 'x.com', 't.co', 'pic.twitter.com', 'pbs.twimg.com', 'video.twimg.com', 'abs.twimg.com'];

            if (!config.includeTwitterLinks && twitterDomains.some(d => domain.includes(d))) {
              return false;
            }

            if (!config.includeMediaLinks && domain.includes('twimg.com')) {
              return false;
            }

            if (config.excludeDomains.some(d => domain.includes(d))) {
              return false;
            }

            if (config.onlyDomains.length > 0) {
              return config.onlyDomains.some(d => domain.includes(d));
            }

            return true;
          } catch {
            return false;
          }
        };

        const getExpandedUrl = (anchor) => {
          const title = anchor.getAttribute('title');
          if (title && title.startsWith('http')) return title;

          const text = anchor.textContent.trim();
          if (text.startsWith('http') && !text.includes('…') && !text.includes('...')) {
            return text;
          }

          return anchor.href;
        };

        articles.forEach(article => {
          try {
            // Get tweet ID
            const tweetLink = article.querySelector('a[href*="/status/"]');
            const href = tweetLink?.getAttribute('href') || '';
            const statusMatch = href.match(/\/status\/(\d+)/);
            const tweetId = statusMatch ? statusMatch[1] : null;

            if (!tweetId) return;

            // Get author
            const authorMatch = href.match(/\/([^/]+)\/status/);
            const author = authorMatch ? authorMatch[1] : null;

            // Get tweet text
            const textEl = article.querySelector('[data-testid="tweetText"]');
            const tweetText = textEl?.textContent?.trim() || '';

            // Get timestamp
            const timeEl = article.querySelector('time');
            const timestamp = timeEl?.getAttribute('datetime') || null;

            // Get engagement
            const replyBtn = article.querySelector('[data-testid="reply"]');
            const retweetBtn = article.querySelector('[data-testid="retweet"]');
            const likeBtn = article.querySelector('[data-testid="like"]');
            const viewsEl = article.querySelector('a[href*="/analytics"]');

            const engagement = {
              replies: parseCount(replyBtn?.textContent),
              retweets: parseCount(retweetBtn?.textContent),
              likes: parseCount(likeBtn?.textContent),
              views: parseCount(viewsEl?.textContent),
            };

            // Extract links
            const anchors = article.querySelectorAll('[data-testid="tweetText"] a[href]');
            const tweetLinks = [];

            anchors.forEach(anchor => {
              const url = getExpandedUrl(anchor);
              if (isExternalLink(url)) {
                tweetLinks.push(url);
              }
            });

            if (tweetLinks.length > 0) {
              extracted.push({
                tweetId,
                author,
                tweetText: tweetText.slice(0, 500),
                timestamp,
                engagement,
                links: [...new Set(tweetLinks)], // Dedupe within tweet
              });
            }
          } catch (e) {
            // Skip malformed tweets
          }
        });

        return extracted;
      }, CONFIG);

      // Process extracted data
      const prevTweetCount = tweetsProcessed;

      for (const tweet of result) {
        if (processedTweetIds.has(tweet.tweetId)) continue;

        processedTweetIds.add(tweet.tweetId);
        tweetsProcessed++;

        const tweetUrl = `https://x.com/${tweet.author}/status/${tweet.tweetId}`;

        for (let url of tweet.links) {
          // Clean URL (remove tracking params)
          if (CONFIG.removeTrackingParams) {
            try {
              const parsed = new URL(url);
              CONFIG.trackingParams.forEach(param => {
                parsed.searchParams.delete(param);
              });
              url = parsed.toString();
            } catch {}
          }

          if (links.has(url)) {
            const existing = links.get(url);
            existing.count++;
            existing.tweets.push({
              id: tweet.tweetId,
              url: tweetUrl,
              text: tweet.tweetText,
              timestamp: tweet.timestamp,
              engagement: tweet.engagement,
            });
            existing.totalLikes += tweet.engagement.likes;
            existing.totalRetweets += tweet.engagement.retweets;
          } else {
            let domain = 'unknown';
            try {
              domain = new URL(url).hostname.replace('www.', '');
            } catch {}

            links.set(url, {
              url,
              domain,
              count: 1,
              firstSeen: tweet.timestamp || new Date().toISOString(),
              tweets: [{
                id: tweet.tweetId,
                url: tweetUrl,
                text: tweet.tweetText,
                timestamp: tweet.timestamp,
                engagement: tweet.engagement,
              }],
              totalLikes: tweet.engagement.likes,
              totalRetweets: tweet.engagement.retweets,
            });
          }
        }
      }

      // Check progress
      if (tweetsProcessed === prevTweetCount) {
        retries++;
      } else {
        retries = 0;
      }

      // Progress callback
      if (onProgress) {
        onProgress({
          tweetsProcessed,
          linksFound: links.size,
          retries,
        });
      }

      // Console progress
      process.stdout.write(`\r📊 Tweets: ${tweetsProcessed}/${limit} | Links: ${links.size} | Retries: ${retries}/${maxRetries}`);

      // Scroll to load more tweets
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Random delay between scrolls
      await new Promise(r => setTimeout(r, scrollDelay + Math.random() * 1000));
    }

    console.log('\n\n✅ Scraping complete!\n');

    // Process final results
    const sortedLinks = Array.from(links.values())
      .sort((a, b) => b.count - a.count || b.totalLikes - a.totalLikes);

    // Group by domain
    const byDomain = {};
    sortedLinks.forEach(link => {
      if (!byDomain[link.domain]) byDomain[link.domain] = [];
      byDomain[link.domain].push(link);
    });

    const sortedDomains = Object.entries(byDomain)
      .sort((a, b) => b[1].length - a[1].length);

    // Create export object
    const exportData = {
      username,
      scrapedAt: new Date().toISOString(),
      summary: {
        totalLinks: links.size,
        tweetsProcessed,
        uniqueDomains: sortedDomains.length,
        topDomain: sortedDomains[0]?.[0] || null,
      },
      topDomains: sortedDomains.slice(0, 30).map(([domain, domainLinks]) => ({
        domain,
        linkCount: domainLinks.length,
        totalShares: domainLinks.reduce((sum, l) => sum + l.count, 0),
        totalEngagement: domainLinks.reduce((sum, l) => sum + l.totalLikes + l.totalRetweets, 0),
      })),
      links: sortedLinks.map(link => ({
        url: link.url,
        domain: link.domain,
        timesShared: link.count,
        totalLikes: link.totalLikes,
        totalRetweets: link.totalRetweets,
        firstSeen: link.firstSeen,
        tweets: link.tweets,
      })),
    };

    // Save JSON file
    const timestamp = new Date().toISOString().split('T')[0];
    const jsonPath = path.join(outputDir, `${username}-links-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(exportData, null, 2));
    console.log(`📄 Saved: ${jsonPath}`);

    // Save plain text URL list
    const txtPath = path.join(outputDir, `${username}-links-${timestamp}.txt`);
    const txtContent = sortedLinks.map(l => l.url).join('\n');
    await fs.writeFile(txtPath, txtContent);
    console.log(`📄 Saved: ${txtPath}`);

    // Save CSV for spreadsheet import
    const csvPath = path.join(outputDir, `${username}-links-${timestamp}.csv`);
    const csvHeader = 'URL,Domain,Times Shared,Total Likes,Total Retweets,First Seen\n';
    const csvContent = csvHeader + sortedLinks.map(l =>
      `"${l.url}","${l.domain}",${l.count},${l.totalLikes},${l.totalRetweets},"${l.firstSeen}"`
    ).join('\n');
    await fs.writeFile(csvPath, csvContent);
    console.log(`📄 Saved: ${csvPath}`);

    // Print summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Total unique links: ${links.size}`);
    console.log(`Tweets processed: ${tweetsProcessed}`);
    console.log(`Unique domains: ${sortedDomains.length}`);

    console.log('\n📈 TOP 10 DOMAINS:');
    sortedDomains.slice(0, 10).forEach(([domain, domainLinks], i) => {
      const totalEngagement = domainLinks.reduce((sum, l) => sum + l.totalLikes + l.totalRetweets, 0);
      console.log(`  ${i + 1}. ${domain} (${domainLinks.length} links, ${totalEngagement.toLocaleString()} engagement)`);
    });

    console.log('\n🔥 TOP 10 MOST SHARED LINKS:');
    sortedLinks.slice(0, 10).forEach((link, i) => {
      const shortUrl = link.url.length > 60 ? link.url.slice(0, 60) + '...' : link.url;
      console.log(`  ${i + 1}. ${shortUrl}`);
      console.log(`     ↳ Shared ${link.count}x | ❤️ ${link.totalLikes.toLocaleString()} | 🔄 ${link.totalRetweets.toLocaleString()}`);
    });

    return exportData;

  } finally {
    await browser.close();
  }
}

// ============================================
// CLI Interface
// ============================================
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🔗 XActions Link Scraper
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage: node scrape-links.js <username> [options]

Arguments:
  username         Twitter/X username to scrape

Options:
  --limit=N        Max tweets to process (default: 300)
  --output=DIR     Output directory (default: ./output)
  --auth=TOKEN     Auth token for accessing protected content
  --no-headless    Run browser in visible mode

Examples:
  node scrape-links.js naval
  node scrape-links.js naval --limit=500
  node scrape-links.js naval --output=./data --limit=1000

Author: nich (@nichxbt)
    `);
    process.exit(0);
  }

  const username = args[0].replace('@', '');

  // Parse options
  const options = {
    limit: 300,
    outputDir: './output',
    headless: true,
    authToken: null,
  };

  args.slice(1).forEach(arg => {
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]) || 300;
    } else if (arg.startsWith('--output=')) {
      options.outputDir = arg.split('=')[1];
    } else if (arg.startsWith('--auth=')) {
      options.authToken = arg.split('=')[1];
    } else if (arg === '--no-headless') {
      options.headless = false;
    }
  });

  try {
    const result = await scrapeLinks(username, options);
    if (result) {
      console.log('\n✨ Done! Check the output folder for your files.\n');
    } else {
      console.log('\n❌ Scraping failed. Please check the username and try again.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
```

### Running the Script

```bash
# Basic usage
node scrape-links.js naval

# Scrape more tweets
node scrape-links.js paulg --limit=500

# Custom output directory
node scrape-links.js elonmusk --output=./scraped-data --limit=1000

# With authentication (for accessing your own protected follows)
node scrape-links.js username --auth=YOUR_AUTH_TOKEN

# Watch the browser (debugging)
node scrape-links.js naval --no-headless
```

### Output Files

The script generates three files:

1. **JSON** (`username-links-2026-01-01.json`) - Full data with metadata
2. **TXT** (`username-links-2026-01-01.txt`) - Plain URL list
3. **CSV** (`username-links-2026-01-01.csv`) - Spreadsheet-compatible

---

## 💡 Use Cases

### 🔍 Find Someone's Favorite Resources

Discover what tools, articles, and websites an expert recommends:

```javascript
// Scrape links from a tech influencer
node scrape-links.js levelsio --limit=500

// Output shows their most-shared links:
// 1. nomadlist.com (15 links)
// 2. remoteok.com (12 links)
// 3. makebook.io (8 links)
```

### 📚 Research & Content Curation

Compile reading lists from thought leaders:

```javascript
// Get all articles a writer has shared
node scrape-links.js naval --limit=1000

// Filter for specific domains in CONFIG:
const CONFIG = {
  onlyDomains: ['medium.com', 'substack.com', 'blog'],
};
```

### 🛠️ Tool Discovery

Find what software and services people in your industry use:

```javascript
// Filter for SaaS domains
const CONFIG = {
  onlyDomains: ['github.com', 'notion.so', 'figma.com', 'airtable.com'],
};
```

### 📊 Competitive Analysis

See what content your competitors share:

```javascript
// Scrape multiple competitor accounts
const competitors = ['competitor1', 'competitor2', 'competitor3'];

for (const username of competitors) {
  await scrapeLinks(username, { 
    limit: 300, 
    outputDir: `./competitive-intel/${username}` 
  });
}
```

### 🔗 Link Building Research

Find websites that influencers frequently link to:

```javascript
// After scraping, analyze the topDomains array
// to find potential link building opportunities
```

---

## 🌐 Web Alternative

Don't want to run code? Use **[xactions.app](https://xactions.app)** for a visual interface:

1. Go to [xactions.app](https://xactions.app)
2. Enter the username you want to analyze
3. Select "Link Scraper" from the tools menu
4. Click "Extract Links"
5. Download your results as JSON or CSV

**Benefits of xactions.app:**
- ✅ No coding required
- ✅ Works on any device
- ✅ Automatic rate limiting
- ✅ Cloud processing
- ✅ Export to multiple formats
- ✅ Save and compare multiple profiles

---

## 💡 Pro Tips

### Handling Rate Limits

```javascript
// Increase delays if you get blocked
const options = {
  scrollDelay: 3000,  // Slower scrolling
  maxRetries: 20,     // More patience
};
```

### Filtering Specific Domains

```javascript
// Only get YouTube links
const CONFIG = {
  onlyDomains: ['youtube.com', 'youtu.be'],
};

// Exclude certain domains
const CONFIG = {
  excludeDomains: ['instagram.com', 'facebook.com'],
};
```

### Finding Most Engaged Links

```javascript
// After scraping, sort by engagement instead of share count
const byEngagement = sortedLinks.sort((a, b) => 
  (b.totalLikes + b.totalRetweets) - (a.totalLikes + a.totalRetweets)
);
```

### Combining with Other Scrapers

```javascript
// First scrape followers, then extract links from each
const followers = await scrapeFollowers('targetUser', { limit: 100 });

for (const follower of followers) {
  await scrapeLinks(follower.username, { limit: 50 });
}
```

---

## ⚠️ Important Notes

- **Rate Limits**: X/Twitter may temporarily block if you scrape too aggressively
- **Public Only**: Only works on public accounts unless authenticated
- **Respect ToS**: Use responsibly and respect Twitter's Terms of Service
- **Data Privacy**: Don't use scraped data for spam or harassment

---

## 📖 Related Examples

- [Tweet Scraping](tweet-scraping.md) - Scrape full tweet content
- [Profile Scraping](profile-scraping.md) - Get user profile data
- [Followers Scraping](followers-scraping.md) - Extract follower lists
- [Following Scraping](following-scraping.md) - Get who someone follows

---

*Author: nich ([@nichxbt](https://x.com/nichxbt))*
