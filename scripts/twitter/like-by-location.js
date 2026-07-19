// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * ============================================
 * 📍 Like By Location - XActions
 * ============================================
 * 
 * @name         like-by-location
 * @description  Automatically like tweets from specific geographic locations
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-01-26
 * @website      https://xactions.app
 * 
 * Usage:
 *   1. Go to x.com and log in
 *   2. Configure the location and options below
 *   3. Open browser console (F12 or Cmd+Shift+J)
 *   4. Paste this entire script and press Enter
 * 
 * Note: Uses X/Twitter's near: search operator
 *       Format: "near:city" or "near:city,state"
 * 
 * ============================================
 */

(async function likeByLocation() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Location to search tweets from
    // Examples: "New York", "San Francisco, CA", "London", "Tokyo"
    location: 'San Francisco',
    
    // Search radius in miles (optional, appended to search)
    radiusMiles: 25,
    
    // Optional keyword to combine with location search
    // Leave empty to search all tweets from location
    keyword: '',
    
    // Maximum number of tweets to like
    maxLikes: 30,
    
    // Minimum delay between actions (ms)
    minDelay: 2000,
    
    // Maximum delay between actions (ms)
    maxDelay: 4000,
    
    // Skip retweets
    skipRetweets: true,
    
    // Skip replies
    skipReplies: false,
    
    // Maximum scroll attempts
    maxScrollAttempts: 15,
    
    // Search type: 'live' (recent) or 'top'
    searchType: 'live'
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweetText: '[data-testid="tweetText"]',
    retweetIndicator: '[data-testid="socialContext"]',
    searchResults: '[data-testid="primaryColumn"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => {
    window.scrollBy(0, window.innerHeight * 0.75);
  };

  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script before it can continue.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) {}
    window.location.href = url;
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} tweets liked`)
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    liked: 0,
    skippedRetweets: 0,
    skippedReplies: 0,
    alreadyLiked: 0,
    errors: 0,
    tweetsProcessed: 0
  };

  const processedTweets = new Set();

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📍 LIKE BY LOCATION - XActions                          ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  log.info(`Location: ${CONFIG.location}`);
  log.info(`Radius: ${CONFIG.radiusMiles} miles`);
  log.info(`Max likes: ${CONFIG.maxLikes}`);

  // Build the search query
  const buildSearchQuery = () => {
    let query = '';
    
    if (CONFIG.keyword) {
      query += CONFIG.keyword + ' ';
    }
    
    query += `near:"${CONFIG.location}"`;
    
    if (CONFIG.radiusMiles) {
      query += ` within:${CONFIG.radiusMiles}mi`;
    }
    
    return query;
  };

  const navigateToSearch = async () => {
    const query = buildSearchQuery();
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query&f=${CONFIG.searchType}`;
    
    log.info(`Search query: ${query}`);
    log.info(`Navigating to search...`);

    spaNavigate(searchUrl);

    // Wait for page to load
    await sleep(3000);
    
    // Wait for tweets to appear
    let attempts = 0;
    while (!document.querySelector(SELECTORS.tweet) && attempts < 15) {
      await sleep(1000);
      attempts++;
    }
    
    if (attempts >= 15) {
      log.error('No tweets found for this location. Try a different location or check spelling.');
      return false;
    }
    
    return true;
  };

  const isReply = (tweet) => {
    // Structural marker first (locale-independent), then the English UI text
    if (tweet.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
      el.innerText.startsWith('Replying to'));
  };

  const isRetweet = (tweet) => {
    // Reposts render socialContext inside an <a>; pinned posts render it as a
    // plain element. Checking the tag keeps pinned posts from matching.
    const socialContext = tweet.querySelector(SELECTORS.retweetIndicator);
    return !!socialContext && socialContext.closest('a') !== null;
  };

  const getTweetIdentifier = (tweet) => {
    // Prefer the permalink around the timestamp: the first /status/ link in
    // the article can belong to a quoted tweet and give the wrong ID
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    // Text fallback. Do NOT append Date.now(): a changing ID makes the same
    // tweet look new on every pass, defeating deduplication entirely.
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100);
  };

  const likeTweets = async () => {
    let scrollAttempts = 0;
    let noNewTweetsCount = 0;

    while (stats.liked < CONFIG.maxLikes && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      let foundNewTweet = false;

      for (const tweet of tweets) {
        if (stats.liked >= CONFIG.maxLikes) break;

        const tweetId = getTweetIdentifier(tweet);
        
        if (processedTweets.has(tweetId)) continue;
        processedTweets.add(tweetId);
        foundNewTweet = true;
        stats.tweetsProcessed++;

        try {
          // Skip retweets if configured
          if (CONFIG.skipRetweets && isRetweet(tweet)) {
            stats.skippedRetweets++;
            continue;
          }

          // Skip replies if configured
          if (CONFIG.skipReplies && isReply(tweet)) {
            stats.skippedReplies++;
            continue;
          }

          // Check if already liked
          const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
          if (unlikeButton) {
            stats.alreadyLiked++;
            continue;
          }

          // Find and click like button
          const likeButton = tweet.querySelector(SELECTORS.likeButton);
          if (likeButton) {
            tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(400);

            likeButton.click();
            stats.liked++;

            const preview = tweet.querySelector(SELECTORS.tweetText)?.textContent?.substring(0, 40) || 'No text';
            log.success(`Liked tweet #${stats.liked} from ${CONFIG.location}: "${preview}..."`);
            log.progress(stats.liked, CONFIG.maxLikes);

            await randomDelay();
          }
        } catch (error) {
          log.error(`Error processing tweet: ${error.message}`);
          stats.errors++;
        }
      }

      if (!foundNewTweet) {
        noNewTweetsCount++;
        if (noNewTweetsCount >= 4) {
          log.warning('No new tweets found. Location may have limited activity.');
          break;
        }
      } else {
        noNewTweetsCount = 0;
      }

      scrollDown();
      scrollAttempts++;
      log.info(`Scrolling... (${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
      await sleep(1500);
    }
  };

  // Execute
  const pageLoaded = await navigateToSearch();
  
  if (pageLoaded) {
    await sleep(2000);
    await likeTweets();
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE BY LOCATION - COMPLETE                          ║
╠══════════════════════════════════════════════════════════╣
║  📍 Location:          ${String(CONFIG.location).padEnd(32)}║
║  🔍 Radius:            ${String(CONFIG.radiusMiles + ' miles').padEnd(32)}║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:       ${String(stats.liked).padEnd(32)}║
║  📄 Tweets Processed:  ${String(stats.tweetsProcessed).padEnd(32)}║
║  ⏭️  Skipped Retweets:  ${String(stats.skippedRetweets).padEnd(32)}║
║  ⏭️  Skipped Replies:   ${String(stats.skippedReplies).padEnd(32)}║
║  💗 Already Liked:     ${String(stats.alreadyLiked).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();
