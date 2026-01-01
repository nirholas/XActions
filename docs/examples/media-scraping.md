# Media Scraping

Extract images and videos from any X/Twitter user's media tab with full resolution support.

## 📸 What You Get

- All images from user's media tab (photos, infographics, screenshots)
- Full resolution image URLs (`&name=large` or `&name=orig`)
- Video tweet URLs and thumbnail images
- GIF URLs and previews
- Media metadata (dimensions, tweet source)
- Export to JSON for archival or analysis
- Optional: Download images directly to disk

---

## 🖥️ Example 1: Browser Console (Quick)

**Best for:** Quick media extraction from any profile's media tab

```javascript
// ============================================
// XActions - Media Scraper (Browser Console)
// Go to: x.com/USERNAME/media
// Open console (F12), paste this, press Enter
// Author: nich (@nichxbt)
// ============================================

(async () => {
  const TARGET_COUNT = 100; // Number of media items to scrape
  const SCROLL_DELAY = 2000; // ms between scrolls
  
  console.log('📸 Starting media scrape...');
  console.log(`🎯 Target: ${TARGET_COUNT} media items`);
  
  // Verify we're on a media tab
  if (!window.location.pathname.includes('/media')) {
    console.warn('⚠️ Navigate to x.com/USERNAME/media first!');
    console.log('💡 Current URL:', window.location.href);
    return;
  }
  
  const username = window.location.pathname.split('/')[1];
  console.log(`👤 Scraping media from: @${username}`);
  
  const mediaItems = new Map();
  let retries = 0;
  const maxRetries = 15;
  
  // Helper: Get full resolution image URL
  const getFullResUrl = (url) => {
    if (!url) return null;
    // Replace any existing name parameter with 'large' or 'orig'
    if (url.includes('pbs.twimg.com/media')) {
      // Remove existing name param and add large
      return url.replace(/&name=\w+/, '') + '&name=large';
    }
    return url;
  };
  
  // Helper: Get original (highest) resolution
  const getOriginalUrl = (url) => {
    if (!url) return null;
    if (url.includes('pbs.twimg.com/media')) {
      return url.replace(/&name=\w+/, '') + '&name=orig';
    }
    return url;
  };
  
  // Extract media from visible tweets
  const extractMedia = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const extracted = [];
    
    articles.forEach(article => {
      try {
        // Get tweet ID from link
        const tweetLink = article.querySelector('a[href*="/status/"]');
        const href = tweetLink?.getAttribute('href') || '';
        const statusMatch = href.match(/\/status\/(\d+)/);
        const tweetId = statusMatch ? statusMatch[1] : null;
        
        if (!tweetId) return;
        
        // Get timestamp
        const timeEl = article.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || null;
        
        // Extract IMAGES
        const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
        images.forEach((img, index) => {
          const src = img.getAttribute('src');
          if (src && src.includes('pbs.twimg.com/media')) {
            const mediaId = `${tweetId}_img_${index}`;
            if (!mediaItems.has(mediaId)) {
              extracted.push({
                id: mediaId,
                type: 'image',
                tweetId,
                tweetUrl: `https://x.com/${username}/status/${tweetId}`,
                url: getFullResUrl(src),
                urlOriginal: getOriginalUrl(src),
                urlThumbnail: src.replace(/&name=\w+/, '&name=small'),
                timestamp,
                author: username,
              });
            }
          }
        });
        
        // Extract VIDEOS
        const videos = article.querySelectorAll('video');
        videos.forEach((video, index) => {
          const mediaId = `${tweetId}_vid_${index}`;
          if (!mediaItems.has(mediaId)) {
            const poster = video.getAttribute('poster');
            const source = video.querySelector('source');
            const videoSrc = source?.getAttribute('src') || null;
            
            // Determine if it's a GIF or video
            const isGif = !!article.querySelector('[data-testid="videoPlayer"] [aria-label*="GIF"]') ||
                          !!article.querySelector('[data-testid="tweetPhoto"]')?.closest('div')?.querySelector('[aria-label*="GIF"]');
            
            extracted.push({
              id: mediaId,
              type: isGif ? 'gif' : 'video',
              tweetId,
              tweetUrl: `https://x.com/${username}/status/${tweetId}`,
              url: videoSrc, // Direct video URL (may require auth)
              thumbnail: poster ? getFullResUrl(poster) : null,
              timestamp,
              author: username,
              note: 'For video downloads, visit the tweet URL directly',
            });
          }
        });
        
      } catch (e) {
        // Skip malformed elements
      }
    });
    
    return extracted;
  };
  
  // Sleep helper
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Main scraping loop
  while (mediaItems.size < TARGET_COUNT && retries < maxRetries) {
    const extracted = extractMedia();
    const prevSize = mediaItems.size;
    
    // Add new items to map (auto-dedupes)
    extracted.forEach(item => {
      if (!mediaItems.has(item.id)) {
        mediaItems.set(item.id, item);
      }
    });
    
    // Progress update
    console.log(`📈 Collected: ${mediaItems.size} media items`);
    
    // Check if stuck
    if (mediaItems.size === prevSize) {
      retries++;
      console.log(`⏳ No new media found (retry ${retries}/${maxRetries})`);
    } else {
      retries = 0;
    }
    
    // Scroll down for more content
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }
  
  // Convert to arrays by type
  const allMedia = Array.from(mediaItems.values());
  const images = allMedia.filter(m => m.type === 'image');
  const videos = allMedia.filter(m => m.type === 'video');
  const gifs = allMedia.filter(m => m.type === 'gif');
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MEDIA SCRAPE COMPLETE');
  console.log('='.repeat(50));
  console.log(`📸 Images: ${images.length}`);
  console.log(`🎬 Videos: ${videos.length}`);
  console.log(`🔄 GIFs:   ${gifs.length}`);
  console.log(`📦 Total:  ${allMedia.length}`);
  console.log('='.repeat(50));
  
  // Prepare result object
  const result = {
    username,
    scrapedAt: new Date().toISOString(),
    profileUrl: `https://x.com/${username}`,
    mediaTabUrl: `https://x.com/${username}/media`,
    stats: {
      total: allMedia.length,
      images: images.length,
      videos: videos.length,
      gifs: gifs.length,
    },
    media: allMedia,
  };
  
  // Copy to clipboard
  const json = JSON.stringify(result, null, 2);
  await navigator.clipboard.writeText(json);
  console.log('\n✅ Copied to clipboard!');
  
  // Log image URLs for quick access
  console.log('\n🖼️ IMAGE URLs (full resolution):');
  images.forEach((img, i) => console.log(`${i + 1}. ${img.url}`));
  
  if (videos.length > 0) {
    console.log('\n🎬 VIDEO TWEET URLs:');
    videos.forEach((vid, i) => console.log(`${i + 1}. ${vid.tweetUrl}`));
  }
  
  // Return for further use in console
  return result;
})();
```

**Sample Output:**
```json
{
  "username": "NASA",
  "scrapedAt": "2026-01-01T12:00:00.000Z",
  "profileUrl": "https://x.com/NASA",
  "mediaTabUrl": "https://x.com/NASA/media",
  "stats": {
    "total": 47,
    "images": 42,
    "videos": 4,
    "gifs": 1
  },
  "media": [
    {
      "id": "1874523697_img_0",
      "type": "image",
      "tweetId": "1874523697",
      "tweetUrl": "https://x.com/NASA/status/1874523697",
      "url": "https://pbs.twimg.com/media/GfXy123.jpg&name=large",
      "urlOriginal": "https://pbs.twimg.com/media/GfXy123.jpg&name=orig",
      "urlThumbnail": "https://pbs.twimg.com/media/GfXy123.jpg&name=small",
      "timestamp": "2026-01-01T10:30:00.000Z",
      "author": "NASA"
    }
  ]
}
```

---

## 🚀 Example 2: Node.js with Puppeteer (Production-Ready)

**Best for:** Automation, batch processing, scheduled archival, image downloading

```javascript
// ============================================
// XActions - Media Scraper (Node.js + Puppeteer)
// Save as: scrape-media.js
// Run: node scrape-media.js NASA
// Run: node scrape-media.js NASA --download
// Author: nich (@nichxbt)
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Download a file from URL
 */
async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath).catch(() => {});
      reject(err);
    });
  });
}

/**
 * Get full resolution image URL
 */
function getFullResUrl(url) {
  if (!url) return null;
  if (url.includes('pbs.twimg.com/media')) {
    return url.replace(/&name=\w+/, '') + '&name=large';
  }
  return url;
}

/**
 * Get original (highest) resolution URL
 */
function getOriginalUrl(url) {
  if (!url) return null;
  if (url.includes('pbs.twimg.com/media')) {
    return url.replace(/&name=\w+/, '') + '&name=orig';
  }
  return url;
}

/**
 * Scrape media from a user's media tab
 */
async function scrapeMedia(username, options = {}) {
  const {
    headless = true,
    authToken = null,
    targetCount = 100,
    scrollDelay = 2000,
    timeout = 30000,
    downloadImages = false,
    outputDir = './downloads',
  } = options;

  console.log(`\n📸 Starting media scrape for @${username}`);
  console.log(`🎯 Target: ${targetCount} media items`);
  console.log(`📥 Download images: ${downloadImages ? 'Yes' : 'No'}\n`);

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
    ],
  });

  const mediaItems = new Map();

  try {
    const page = await browser.newPage();
    
    // Set realistic viewport
    await page.setViewport({ 
      width: 1280 + Math.floor(Math.random() * 100), 
      height: 900 + Math.floor(Math.random() * 100),
    });
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Optional: Set auth cookie for logged-in access
    if (authToken) {
      await page.setCookie({
        name: 'auth_token',
        value: authToken,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
      console.log('🔐 Using authentication token');
    }

    // Navigate to media tab
    const mediaUrl = `https://x.com/${username}/media`;
    console.log(`🌐 Navigating to ${mediaUrl}`);
    
    await page.goto(mediaUrl, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait for content to load
    await page.waitForSelector('article[data-testid="tweet"]', { 
      timeout: 15000 
    }).catch(() => {
      console.log('⚠️ No media found or profile may be private/protected');
    });

    // Add human-like delay
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));

    let retries = 0;
    const maxRetries = 15;

    // Main scraping loop
    while (mediaItems.size < targetCount && retries < maxRetries) {
      // Extract media from page
      const extracted = await page.evaluate((user) => {
        const items = [];
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
        articles.forEach(article => {
          try {
            // Get tweet ID
            const tweetLink = article.querySelector('a[href*="/status/"]');
            const href = tweetLink?.getAttribute('href') || '';
            const statusMatch = href.match(/\/status\/(\d+)/);
            const tweetId = statusMatch ? statusMatch[1] : null;
            
            if (!tweetId) return;
            
            // Timestamp
            const timeEl = article.querySelector('time');
            const timestamp = timeEl?.getAttribute('datetime') || null;
            
            // IMAGES
            const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
            images.forEach((img, idx) => {
              const src = img.getAttribute('src');
              if (src && src.includes('pbs.twimg.com/media')) {
                items.push({
                  id: `${tweetId}_img_${idx}`,
                  type: 'image',
                  tweetId,
                  rawUrl: src,
                  timestamp,
                  author: user,
                });
              }
            });
            
            // VIDEOS
            const videos = article.querySelectorAll('video');
            videos.forEach((video, idx) => {
              const poster = video.getAttribute('poster');
              const source = video.querySelector('source');
              const videoSrc = source?.getAttribute('src') || null;
              
              // Check if GIF
              const isGif = !!article.querySelector('[aria-label*="GIF"]');
              
              items.push({
                id: `${tweetId}_vid_${idx}`,
                type: isGif ? 'gif' : 'video',
                tweetId,
                rawUrl: videoSrc,
                thumbnail: poster,
                timestamp,
                author: user,
              });
            });
            
          } catch (e) {
            // Skip errors
          }
        });
        
        return items;
      }, username);

      const prevSize = mediaItems.size;

      // Add to collection
      extracted.forEach(item => {
        if (!mediaItems.has(item.id)) {
          // Process URLs
          if (item.type === 'image') {
            item.url = getFullResUrl(item.rawUrl);
            item.urlOriginal = getOriginalUrl(item.rawUrl);
            item.urlThumbnail = item.rawUrl.replace(/&name=\w+/, '&name=small');
          } else {
            item.url = item.rawUrl;
            if (item.thumbnail) {
              item.thumbnail = getFullResUrl(item.thumbnail);
            }
          }
          item.tweetUrl = `https://x.com/${username}/status/${item.tweetId}`;
          delete item.rawUrl;
          
          mediaItems.set(item.id, item);
        }
      });

      // Progress
      console.log(`📈 Collected: ${mediaItems.size} media items`);

      // Check if stuck
      if (mediaItems.size === prevSize) {
        retries++;
        console.log(`⏳ No new media (retry ${retries}/${maxRetries})`);
      } else {
        retries = 0;
      }

      // Scroll for more content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await new Promise(r => setTimeout(r, scrollDelay));
    }

  } finally {
    await browser.close();
  }

  // Convert to array
  const allMedia = Array.from(mediaItems.values());
  const images = allMedia.filter(m => m.type === 'image');
  const videos = allMedia.filter(m => m.type === 'video');
  const gifs = allMedia.filter(m => m.type === 'gif');

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MEDIA SCRAPE COMPLETE');
  console.log('='.repeat(50));
  console.log(`📸 Images: ${images.length}`);
  console.log(`🎬 Videos: ${videos.length}`);
  console.log(`🔄 GIFs:   ${gifs.length}`);
  console.log(`📦 Total:  ${allMedia.length}`);
  console.log('='.repeat(50));

  // Download images if requested
  if (downloadImages && images.length > 0) {
    console.log(`\n📥 Downloading ${images.length} images...`);
    
    // Create output directory
    const userDir = path.join(outputDir, username);
    await fs.mkdir(userDir, { recursive: true });
    
    let downloaded = 0;
    let failed = 0;
    
    for (const img of images) {
      try {
        // Extract filename from URL
        const urlMatch = img.url.match(/\/([^/?]+)\?/) || img.url.match(/\/([^/]+)$/);
        const filename = urlMatch ? urlMatch[1] : `${img.id}.jpg`;
        const filepath = path.join(userDir, filename);
        
        // Use original resolution for downloads
        const downloadUrl = img.urlOriginal || img.url;
        
        await downloadFile(downloadUrl, filepath);
        downloaded++;
        
        // Progress every 10 images
        if (downloaded % 10 === 0) {
          console.log(`   Downloaded: ${downloaded}/${images.length}`);
        }
        
        // Rate limit downloads
        await new Promise(r => setTimeout(r, 200));
        
      } catch (err) {
        failed++;
        console.error(`   ❌ Failed: ${img.id}`);
      }
    }
    
    console.log(`\n✅ Downloaded: ${downloaded} images`);
    if (failed > 0) {
      console.log(`⚠️ Failed: ${failed} images`);
    }
    console.log(`📁 Saved to: ${userDir}`);
  }

  // Prepare result
  const result = {
    username,
    scrapedAt: new Date().toISOString(),
    profileUrl: `https://x.com/${username}`,
    mediaTabUrl: `https://x.com/${username}/media`,
    stats: {
      total: allMedia.length,
      images: images.length,
      videos: videos.length,
      gifs: gifs.length,
    },
    media: allMedia,
  };

  return result;
}

/**
 * Save results to JSON file
 */
async function saveResults(data, filename) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filename, json);
  console.log(`💾 Saved JSON to: ${filename}`);
}

// ============================================
// CLI Interface
// ============================================

const args = process.argv.slice(2);
const username = args[0];
const shouldDownload = args.includes('--download') || args.includes('-d');
const targetCount = (() => {
  const countIdx = args.indexOf('--count');
  if (countIdx !== -1 && args[countIdx + 1]) {
    return parseInt(args[countIdx + 1]) || 100;
  }
  return 100;
})();

if (!username) {
  console.log(`
📸 XActions Media Scraper
========================

Usage: node scrape-media.js <username> [options]

Options:
  --download, -d     Download images to ./downloads/<username>/
  --count <number>   Number of media items to scrape (default: 100)

Examples:
  node scrape-media.js NASA
  node scrape-media.js elonmusk --download
  node scrape-media.js SpaceX --count 500 --download

Output:
  - Prints media URLs to console
  - Saves JSON to <username>-media.json
  - If --download: saves images to ./downloads/<username>/
`);
  process.exit(1);
}

// Run the scraper
scrapeMedia(username, {
  targetCount,
  downloadImages: shouldDownload,
  headless: true,
})
  .then(async (result) => {
    // Save to JSON
    await saveResults(result, `${username}-media.json`);
    
    // Print URLs for quick access
    console.log('\n🖼️ Image URLs (showing first 10):');
    result.media
      .filter(m => m.type === 'image')
      .slice(0, 10)
      .forEach((img, i) => console.log(`${i + 1}. ${img.url}`));
    
    if (result.stats.videos > 0) {
      console.log('\n🎬 Video Tweet URLs:');
      result.media
        .filter(m => m.type === 'video')
        .forEach((vid, i) => console.log(`${i + 1}. ${vid.tweetUrl}`));
    }
    
    console.log('\n✅ Done!');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
```

**Install dependencies:**
```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

**Run it:**
```bash
# Basic: scrape and export JSON
node scrape-media.js NASA

# Download images to disk
node scrape-media.js NASA --download

# Scrape 500 items with downloads
node scrape-media.js SpaceX --count 500 --download
```

**Output files:**
```
./NASA-media.json          # Full JSON export
./downloads/NASA/          # Downloaded images (if --download)
  ├── GfXy123.jpg
  ├── GfXy456.jpg
  └── ...
```

---

## 🔍 Tips: Getting Full Resolution Images

X/Twitter images support multiple resolution parameters:

| Parameter | Resolution | Use Case |
|-----------|------------|----------|
| `&name=thumb` | 150x150 | Thumbnails |
| `&name=small` | 680px width | Quick preview |
| `&name=medium` | 1200px width | Standard quality |
| `&name=large` | 2048px width | High quality |
| `&name=orig` | Original upload | Maximum quality |

### URL Examples

```
# Thumbnail
https://pbs.twimg.com/media/GfXy123.jpg?format=jpg&name=thumb

# Standard (what you see by default)
https://pbs.twimg.com/media/GfXy123.jpg?format=jpg&name=medium

# High resolution
https://pbs.twimg.com/media/GfXy123.jpg?format=jpg&name=large

# Original (highest available)
https://pbs.twimg.com/media/GfXy123.jpg?format=jpg&name=orig
```

### Quick URL Transformation

```javascript
// Get any image URL and convert to full resolution
const getHighRes = (url) => url.replace(/&name=\w+/, '&name=large');
const getOriginal = (url) => url.replace(/&name=\w+/, '&name=orig');

// Example
const thumb = 'https://pbs.twimg.com/media/GfXy123.jpg?format=jpg&name=small';
console.log(getOriginal(thumb));
// → https://pbs.twimg.com/media/GfXy123.jpg?format=jpg&name=orig
```

### Note on Video Downloads

Videos on X require different handling:
- The `video` tag source URLs often require authentication
- For videos, save the **tweet URL** and use a dedicated video downloader
- Third-party tools like `yt-dlp` work well: `yt-dlp https://x.com/user/status/123`

---

## ⚠️ Best Practices

### Rate Limiting
- Add 2-3 second delays between scroll operations
- Don't scrape thousands of images too quickly
- Consider running in non-headless mode to debug issues

### Authentication (Optional)
For private accounts you follow, pass your `auth_token`:
```javascript
const result = await scrapeMedia('private_user', {
  authToken: 'your_auth_token_here'
});
```

### Error Handling
```javascript
try {
  const result = await scrapeMedia(username);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Page took too long to load');
  } else if (error.message.includes('tweet')) {
    console.log('No media found - profile may be private or empty');
  }
}
```

### Storage Considerations
- Original resolution images can be 5-20MB each
- Estimate storage needs before bulk downloads
- Consider using `&name=large` instead of `&name=orig` for balance

---

## 🌐 Website Alternative

Don't want to code? Use [xactions.app](https://xactions.app):

1. 🔐 Login with your X account
2. 👤 Enter any username
3. 📸 Click "Scrape Media"
4. 📥 Download all images as ZIP or export URLs to JSON
5. 🎬 Get direct links to video tweets

**Features:**
- One-click media extraction
- Bulk image downloads
- Full resolution support
- No coding required
- Works with any public profile

---

## 📚 Related Examples

- [Tweet Scraping](tweet-scraping.md) - Extract tweets with full metadata
- [Profile Scraping](profile-scraping.md) - Get user profile information
- [Followers Scraping](followers-scraping.md) - Extract follower lists
- [Hashtag Scraping](hashtag-scraping.md) - Search hashtag content

---

*Author: nich ([@nichxbt](https://x.com/nichxbt))*
