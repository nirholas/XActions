/**
 * ============================================================
 * 🔖 Bookmark Exporter
 * ============================================================
 * 
 * @name        bookmark-exporter.js
 * @description Export all your X/Twitter bookmarks to JSON and CSV
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your Bookmarks page: https://x.com/i/bookmarks
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Wait for scrolling to complete
 * 5. JSON and CSV files will download automatically
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Maximum bookmarks to export
  maxBookmarks: 1000,
  
  // Scroll delay (increase if bookmarks aren't loading)
  scrollDelay: 1500,
  
  // Max scroll attempts
  maxScrolls: 200,
  
  // Retry when no new bookmarks
  maxRetries: 5,
  
  // Export formats
  exportJSON: true,
  exportCSV: true,
  
  // Copy to clipboard
  copyToClipboard: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function bookmarkExporter() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔖 BOOKMARK EXPORTER                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/bookmarks')) {
    console.error('❌ ERROR: Must be on the Bookmarks page!');
    console.log('📍 Go to: https://x.com/i/bookmarks');
    return;
  }
  
  console.log('🚀 Exporting bookmarks...');
  console.log('📜 Auto-scrolling to load all bookmarks...');
  console.log('');
  
  const bookmarks = [];
  const seenIds = new Set();
  let scrolls = 0;
  let retries = 0;
  let lastCount = 0;
  
  /**
   * Extract bookmark data from tweet element
   */
  function extractBookmark(tweet) {
    try {
      // Get tweet ID
      const link = tweet.querySelector('a[href*="/status/"]');
      if (!link) return null;
      
      const href = link.getAttribute('href');
      const match = href.match(/\/status\/(\d+)/);
      if (!match) return null;
      
      const tweetId = match[1];
      if (seenIds.has(tweetId)) return null;
      seenIds.add(tweetId);
      
      // Get author
      const authorLink = tweet.querySelector('a[href^="/"][role="link"]');
      const authorUsername = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0] : 'unknown';
      
      // Get display name
      const nameSpan = tweet.querySelector('[dir="ltr"] span');
      const authorName = nameSpan ? nameSpan.textContent : authorUsername;
      
      // Get text
      const textEl = tweet.querySelector($tweetText);
      const text = textEl ? textEl.innerText : '';
      
      // Get timestamp
      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const displayTime = timeEl ? timeEl.innerText : '';
      
      // Get engagement metrics
      const getMetric = (testId) => {
        const el = tweet.querySelector(`[data-testid="${testId}"]`);
        const span = el?.querySelector('span span');
        return span ? span.innerText : '0';
      };
      
      // Check for media
      const hasImage = tweet.querySelector('[data-testid="tweetPhoto"]') !== null;
      const hasVideo = tweet.querySelector('[data-testid="videoPlayer"]') !== null;
      
      // Get image URLs
      const images = [];
      tweet.querySelectorAll('[data-testid="tweetPhoto"] img').forEach(img => {
        if (img.src && img.src.includes('pbs.twimg.com')) {
          images.push(img.src);
        }
      });
      
      // Extract URLs from text
      const urls = [];
      tweet.querySelectorAll('a[href^="https://t.co"]').forEach(a => {
        const expandedUrl = a.getAttribute('title') || a.textContent;
        if (expandedUrl && expandedUrl.startsWith('http')) {
          urls.push(expandedUrl);
        }
      });
      
      return {
        id: tweetId,
        url: `https://x.com/${authorUsername}/status/${tweetId}`,
        author: {
          username: authorUsername,
          name: authorName
        },
        text,
        timestamp,
        displayTime,
        metrics: {
          replies: getMetric('reply'),
          retweets: getMetric('retweet'),
          likes: getMetric('like')
        },
        media: {
          hasImage,
          hasVideo,
          images
        },
        urls,
        exportedAt: new Date().toISOString()
      };
      
    } catch (e) {
      return null;
    }
  }
  
  // Scroll and extract
  while (bookmarks.length < CONFIG.maxBookmarks && scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const tweets = document.querySelectorAll($tweet);
    
    tweets.forEach(tweet => {
      const bookmark = extractBookmark(tweet);
      if (bookmark) {
        bookmarks.push(bookmark);
      }
    });
    
    if (bookmarks.length === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = bookmarks.length;
    }
    
    console.log(`📊 Exported ${bookmarks.length} bookmarks...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log(`✅ Finished exporting: ${bookmarks.length} bookmarks`);
  console.log('');
  
  // Build result
  const result = {
    exportedAt: new Date().toISOString(),
    totalBookmarks: bookmarks.length,
    bookmarks
  };
  
  // Download JSON
  if (CONFIG.exportJSON) {
    const jsonBlob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `bookmarks_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);
    console.log('💾 JSON downloaded!');
  }
  
  // Download CSV
  if (CONFIG.exportCSV) {
    const headers = ['ID', 'Author', 'Username', 'Text', 'Date', 'Likes', 'Retweets', 'Replies', 'Has Image', 'Has Video', 'URL'];
    const rows = bookmarks.map(b => [
      b.id,
      `"${b.author.name.replace(/"/g, '""')}"`,
      b.author.username,
      `"${b.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      b.displayTime,
      b.metrics.likes,
      b.metrics.retweets,
      b.metrics.replies,
      b.media.hasImage,
      b.media.hasVideo,
      b.url
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const csvBlob = new Blob([csv], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `bookmarks_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);
    console.log('💾 CSV downloaded!');
  }
  
  // Copy to clipboard
  if (CONFIG.copyToClipboard) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('📋 JSON copied to clipboard!');
    } catch (e) {}
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ EXPORT COMPLETE!                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📊 Total bookmarks: ${bookmarks.length}`);
  console.log('');
  
  window.exportedBookmarks = result;
  console.log('💡 Access data via: window.exportedBookmarks');
  
  return result;
})();
