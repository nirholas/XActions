// GENERATED FILE: a copy of browser/bookmarkExporter.js, written by scripts/build-script-manifest.mjs. Edit browser/bookmarkExporter.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔖 Bookmark Exporter
 * ============================================================
 *
 * @name        bookmarkExporter.js
 * @title       Bookmark Exporter
 * @description Export all your bookmarks to JSON and CSV, with optional full metadata and a summary.
 * @category    scrape
 * @page        x.com/i/bookmarks
 * @writes      false
 * @aliases     scripts/bookmarkExporter.js, scripts/scrapeBookmarks.js, scripts/twitter/bookmark-exporter.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 *
 * 1. Go to your Bookmarks page: https://x.com/i/bookmarks
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste browser/bookmarkExporter.js and press Enter
 * 4. Wait for scrolling to complete
 * 5. JSON and CSV files will download automatically
 *
 * Data is also left on the page as window.exportedBookmarks (the full
 * result object) and window.scrapedBookmarks (the plain array).
 *
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
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
  copyToClipboard: true,

  // What goes on the clipboard: 'json' (the full result) or 'summary'
  // (one "@handle: text... - url" line per bookmark)
  clipboardFormat: 'json',

  // Collect image URLs and external links (set false to leave them out)
  includeMediaUrls: true,
  includeLinks: true,

  // Rewrite image URLs to their large size (&name=large)
  fullSizeImages: false,

  // Add verified flag, video posters, hashtags, mentions and numeric
  // reply/repost/like/view counts to each bookmark, and matching CSV columns
  fullMetadata: false
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

  // Parse an engagement count such as "1,234", "1.2K" or "3M" into a number
  const parseNumber = (str) => {
    if (!str) return 0;
    const num = parseFloat(str.replace(/,/g, ''));
    if (isNaN(num)) return 0;
    if (str.includes('K')) return num * 1000;
    if (str.includes('M')) return num * 1000000;
    return num;
  };

  // Numeric counts from the action bar's aria-labels (the views count is a
  // link to the post's analytics, the others are buttons)
  const getMetricCounts = (tweet) => {
    const counts = { replies: 0, retweets: 0, likes: 0, views: 0 };
    tweet.querySelectorAll('[role="group"] button, [role="group"] a[href*="/analytics"]').forEach(el => {
      const label = el.getAttribute('aria-label') || '';
      const num = parseNumber(label.match(/[\d,.]+[KM]?/)?.[0] || '0');
      if (label.includes('repl')) counts.replies = num;
      else if (label.includes('repost') || label.includes('Retweet')) counts.retweets = num;
      else if (label.includes('like')) counts.likes = num;
      else if (label.includes('view')) counts.views = num;
    });
    return counts;
  };

  /**
   * Extract bookmark data from tweet element
   */
  function extractBookmark(tweet) {
    try {
      // Get tweet ID: the timestamp's enclosing anchor is the tweet's own
      // permalink; the first /status/ link can belong to a quoted tweet
      const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
      const link = timeAnchor || tweet.querySelector('a[href*="/status/"]');
      if (!link) return null;

      const href = link.getAttribute('href');
      const match = href.match(/\/status\/(\d+)/);
      if (!match) return null;

      const tweetId = match[1];
      if (seenIds.has(tweetId)) return null;
      seenIds.add(tweetId);

      // Get author (User-Name block is the real author; a bare first link in
      // the article can belong to a reposter's socialContext or a quoted tweet)
      const authorLink = tweet.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
                         tweet.querySelector('a[href^="/"][role="link"]');
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
      const hasVideo = tweet.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]') !== null;

      // Get image URLs
      const images = [];
      if (CONFIG.includeMediaUrls) {
        tweet.querySelectorAll('[data-testid="tweetPhoto"] img').forEach(img => {
          if (img.src && img.src.includes('pbs.twimg.com')) {
            images.push(CONFIG.fullSizeImages ? img.src.replace(/&name=\w+/, '&name=large') : img.src);
          }
        });
      }

      // Extract URLs from text
      const urls = [];
      if (CONFIG.includeLinks) {
        tweet.querySelectorAll('a[href^="https://t.co"]').forEach(a => {
          const expandedUrl = a.getAttribute('title') || a.textContent;
          if (expandedUrl && expandedUrl.startsWith('http')) {
            urls.push(expandedUrl);
          }
        });
      }

      const bookmark = {
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

      if (CONFIG.fullMetadata) {
        bookmark.author.verified = !!tweet.querySelector('[data-testid="User-Name"] svg[aria-label*="Verified"], [data-testid="icon-verified"]');
        bookmark.media.videos = CONFIG.includeMediaUrls
          ? Array.from(tweet.querySelectorAll('video')).map(v => v.poster || v.src).filter(Boolean)
          : [];
        bookmark.hashtags = text.match(/#\w+/g) || [];
        bookmark.mentions = text.match(/@\w+/g) || [];
        bookmark.metricCounts = getMetricCounts(tweet);
      }

      return bookmark;

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

  // Preview the first few
  bookmarks.slice(0, 5).forEach((b, i) => {
    console.log(`${i + 1}. @${b.author.username}: "${b.text.slice(0, 60)}..."`);
  });
  if (bookmarks.length > 5) {
    console.log(`   ... and ${bookmarks.length - 5} more`);
  }

  // Stats
  const withMedia = bookmarks.filter(b => b.media.hasImage || b.media.hasVideo).length;
  const withLinks = bookmarks.filter(b => b.urls.length > 0).length;
  const uniqueAuthors = new Set(bookmarks.map(b => b.author.username)).size;
  console.log('');
  console.log('📊 Stats:');
  console.log(`   - ${uniqueAuthors} unique authors`);
  console.log(`   - ${withMedia} with media`);
  console.log(`   - ${withLinks} with external links`);
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
    if (CONFIG.fullMetadata) headers.push('Timestamp', 'Verified', 'Views', 'Hashtags', 'Mentions');
    const rows = bookmarks.map(b => {
      const cells = [
        b.id,
        `"${b.author.name.replace(/"/g, '""')}"`,
        b.author.username,
        `"${b.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${b.displayTime.replace(/"/g, '""')}"`,
        b.metrics.likes,
        b.metrics.retweets,
        b.metrics.replies,
        b.media.hasImage,
        b.media.hasVideo,
        b.url
      ];
      if (CONFIG.fullMetadata) {
        cells.push(
          b.timestamp || '',
          b.author.verified,
          b.metricCounts.views,
          `"${b.hashtags.join(' ')}"`,
          `"${b.mentions.join(' ')}"`
        );
      }
      return cells.join(',');
    });

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
      if (CONFIG.clipboardFormat === 'summary') {
        const summary = bookmarks.map(b => `@${b.author.username}: ${b.text.slice(0, 100)}... - ${b.url}`).join('\n');
        await navigator.clipboard.writeText(summary);
        console.log('📋 Summary copied to clipboard!');
      } else {
        await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        console.log('📋 JSON copied to clipboard!');
      }
    } catch (e) {
      console.warn(`⚠️ Could not copy to clipboard: ${e.message}`);
    }
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ EXPORT COMPLETE!                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📊 Total bookmarks: ${bookmarks.length}`);
  console.log('');

  window.exportedBookmarks = result;
  window.scrapedBookmarks = bookmarks;
  console.log('💡 Access data via: window.exportedBookmarks (or the plain array: window.scrapedBookmarks)');

  return result;
})();
