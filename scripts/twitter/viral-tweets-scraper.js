// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔥 Viral Tweets Scraper
 * ============================================================
 * 
 * @name        viral-tweets-scraper.js
 * @description Find top-performing viral tweets from search or any account
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to:
 *    - Any user's profile: https://x.com/username
 *    - OR search results: https://x.com/search?q=keyword
 * 
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Top viral tweets will be extracted and sorted
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // ---- MINIMUM THRESHOLDS ----
  // Only include tweets with at least this many:
  
  minLikes: 50,
  minRetweets: 5,
  minReplies: 0,
  
  // ---- LIMITS ----
  
  maxTweets: 100,
  maxScrolls: 50,
  
  // ---- SORTING ----
  // Options: 'likes', 'retweets', 'replies', 'engagement' (sum of all)
  sortBy: 'likes',
  
  // ---- TIMING ----
  
  scrollDelay: 1500,
  maxRetries: 5,
  
  // ---- EXPORT ----
  
  exportJSON: true,
  exportCSV: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function viralTweetsScraper() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔥 VIRAL TWEETS SCRAPER                                   ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log(`🎯 Min thresholds: ${CONFIG.minLikes} likes, ${CONFIG.minRetweets} RTs`);
  console.log(`📊 Sort by: ${CONFIG.sortBy}`);
  console.log(`📋 Max tweets: ${CONFIG.maxTweets}`);
  console.log('');
  
  const tweets = [];
  const seenIds = new Set();
  let scrolls = 0;
  let retries = 0;
  let lastCount = 0;
  
  /**
   * Parse engagement numbers (handles K, M suffixes)
   */
  function parseNumber(str) {
    if (!str || str === '') return 0;
    str = str.trim().toUpperCase();
    if (str.includes('K')) return parseFloat(str) * 1000;
    if (str.includes('M')) return parseFloat(str) * 1000000;
    if (str.includes('B')) return parseFloat(str) * 1000000000;
    return parseInt(str.replace(/,/g, '')) || 0;
  }
  
  /**
   * Extract tweet data
   */
  function extractTweet(tweetEl) {
    try {
      // Get ID from the timestamp's permalink anchor; the first /status/
      // link in the article can belong to a quoted tweet
      const timeAnchor = tweetEl.querySelector('time')?.closest('a[href*="/status/"]');
      const link = timeAnchor || tweetEl.querySelector('a[href*="/status/"]');
      if (!link) return null;

      const match = link.href.match(/\/status\/(\d+)/);
      if (!match) return null;

      const tweetId = match[1];
      if (seenIds.has(tweetId)) return null;
      seenIds.add(tweetId);

      // Get author (User-Name block, not the first profile link, which is
      // the reposter on retweets)
      const authorLink = tweetEl.querySelector('div[data-testid="User-Name"] a[href^="/"]') ||
                         tweetEl.querySelector('a[href^="/"][role="link"]');
      const username = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0] : 'unknown';
      
      // Get text
      const textEl = tweetEl.querySelector($tweetText);
      const text = textEl ? textEl.innerText : '';
      
      // Get timestamp
      const timeEl = tweetEl.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const displayTime = timeEl ? timeEl.innerText : '';
      
      // Get metrics
      const getMetric = (testId) => {
        const el = tweetEl.querySelector(`[data-testid="${testId}"]`);
        const span = el?.querySelector('span span');
        return span ? span.innerText : '0';
      };
      
      const likesStr = getMetric('like');
      const retweetsStr = getMetric('retweet');
      const repliesStr = getMetric('reply');
      
      const likes = parseNumber(likesStr);
      const retweets = parseNumber(retweetsStr);
      const replies = parseNumber(repliesStr);
      
      // Check thresholds
      if (likes < CONFIG.minLikes) return null;
      if (retweets < CONFIG.minRetweets) return null;
      if (replies < CONFIG.minReplies) return null;
      
      // Check for media
      const hasImage = tweetEl.querySelector('[data-testid="tweetPhoto"]') !== null;
      const hasVideo = tweetEl.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]') !== null;
      
      return {
        id: tweetId,
        url: `https://x.com/${username}/status/${tweetId}`,
        author: username,
        text,
        timestamp,
        displayTime,
        metrics: {
          likes,
          retweets,
          replies,
          engagement: likes + retweets + replies,
          likesDisplay: likesStr,
          retweetsDisplay: retweetsStr,
          repliesDisplay: repliesStr
        },
        hasImage,
        hasVideo
      };
      
    } catch (e) {
      return null;
    }
  }
  
  console.log('🚀 Scraping tweets...');
  console.log('');
  
  // Scroll and extract
  while (tweets.length < CONFIG.maxTweets && scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    document.querySelectorAll($tweet).forEach(el => {
      const tweet = extractTweet(el);
      if (tweet) tweets.push(tweet);
    });
    
    // Stall detection tracks all tweets seen, not just qualifying ones:
    // long stretches below the viral thresholds must not end the scan early
    if (seenIds.size === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = seenIds.size;
    }
    
    console.log(`📊 Found ${tweets.length} viral tweets...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  // Sort
  const sortKey = CONFIG.sortBy === 'engagement' ? 'engagement' : CONFIG.sortBy;
  tweets.sort((a, b) => {
    if (sortKey === 'engagement') {
      return b.metrics.engagement - a.metrics.engagement;
    }
    return b.metrics[sortKey] - a.metrics[sortKey];
  });
  
  console.log('');
  console.log(`✅ Found ${tweets.length} viral tweets`);
  console.log('');
  
  // Display top 10
  console.log('🏆 TOP 10 VIRAL TWEETS:');
  console.log('');
  tweets.slice(0, 10).forEach((t, i) => {
    console.log(`${i + 1}. [${t.metrics.likesDisplay} ❤️ | ${t.metrics.retweetsDisplay} 🔄] @${t.author}`);
    console.log(`   "${t.text.substring(0, 60)}..."`);
    console.log(`   ${t.url}`);
    console.log('');
  });
  
  // Build result
  const result = {
    scrapedAt: new Date().toISOString(),
    sortedBy: CONFIG.sortBy,
    totalTweets: tweets.length,
    tweets
  };
  
  const dateStr = new Date().toISOString().split('T')[0];
  
  // Download JSON
  if (CONFIG.exportJSON) {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viral_tweets_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 JSON downloaded!');
  }
  
  // Download CSV
  if (CONFIG.exportCSV) {
    const headers = ['Rank', 'Author', 'Likes', 'Retweets', 'Replies', 'Engagement', 'Text', 'Date', 'Has Image', 'Has Video', 'URL'];
    const rows = tweets.map((t, i) => [
      i + 1,
      t.author,
      t.metrics.likes,
      t.metrics.retweets,
      t.metrics.replies,
      t.metrics.engagement,
      `"${t.text.substring(0, 200).replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(t.displayTime || '').replace(/"/g, '""')}"`,
      t.hasImage,
      t.hasVideo,
      t.url
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viral_tweets_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 CSV downloaded!');
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ VIRAL TWEETS SCRAPER COMPLETE!                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🔥 Total viral tweets: ${tweets.length}`);
  console.log('');
  
  window.viralTweets = result;
  console.log('💡 Access via: window.viralTweets');
  
  return result;
})();
