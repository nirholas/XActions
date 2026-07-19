// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * ============================================
 * 🏠 Like By Feed - XActions
 * ============================================
 * 
 * @name         like-by-feed
 * @description  Automatically like tweets from your home timeline/feed
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-01-26
 * @website      https://xactions.app
 * 
 * Usage:
 *   1. Go to x.com/home
 *   2. Open browser console (F12 or Cmd+Shift+J)
 *   3. Configure the options below
 *   4. Paste this entire script and press Enter
 * 
 * ============================================
 */

(async function likeByFeed() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of tweets to like
    maxLikes: 50,
    
    // Skip reply tweets
    skipReplies: true,
    
    // Skip promoted/ad tweets
    skipAds: true,
    
    // Skip retweets
    skipRetweets: true,
    
    // Only like tweets with images/videos
    onlyWithMedia: false,
    
    // Minimum delay between actions (ms)
    minDelay: 1500,
    
    // Maximum delay between actions (ms)
    maxDelay: 3500,
    
    // Maximum scroll attempts to find new tweets
    maxScrollAttempts: 20,
    
    // Stop if no new tweets found after this many scrolls
    noNewTweetsThreshold: 5
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
    replyIndicator: 'div[data-testid="Tweet-User-Avatar"] + div a[href*="/status/"]',
    promotedLabel: '[data-testid="placementTracking"]',
    tweetMedia: '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"]'
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
    window.scrollBy(0, window.innerHeight * 0.7);
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
    skippedReplies: 0,
    skippedAds: 0,
    skippedRetweets: 0,
    skippedNoMedia: 0,
    alreadyLiked: 0,
    errors: 0
  };

  const processedTweets = new Set();

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🏠 LIKE BY FEED - XActions                              ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Verify we're on the home page
  if (!window.location.href.includes('x.com/home') && !window.location.href.includes('twitter.com/home')) {
    log.warning('Not on home timeline. Redirecting...');
    window.location.href = 'https://x.com/home';
    return;
  }

  log.info(`Starting feed liker`);
  log.info(`Max likes: ${CONFIG.maxLikes}`);
  log.info(`Skip replies: ${CONFIG.skipReplies}`);
  log.info(`Skip ads: ${CONFIG.skipAds}`);
  log.info(`Skip retweets: ${CONFIG.skipRetweets}`);

  let scrollAttempts = 0;
  let noNewTweetsCount = 0;

  const isReply = (tweet) => {
    // Structural marker first (locale-independent), then the English UI text
    if (tweet.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
      el.innerText.startsWith('Replying to'));
  };

  const isAd = (tweet) => {
    // Check for promoted/ad indicators. Only match exact "Ad"/"Promoted" label
    // spans; a substring check on the whole tweet also hits words like "Advice".
    if (tweet.querySelector(SELECTORS.promotedLabel) !== null) return true;
    return Array.from(tweet.querySelectorAll('span')).some(el => {
      const t = el.textContent.trim();
      return t === 'Ad' || t === 'Promoted';
    });
  };

  const isRetweet = (tweet) => {
    // Reposts render socialContext inside an <a>; pinned posts render it as a
    // plain element. Checking the tag keeps pinned posts from matching.
    const socialContext = tweet.querySelector(SELECTORS.retweetIndicator);
    return !!socialContext && socialContext.closest('a') !== null;
  };

  const hasMedia = (tweet) => {
    return tweet.querySelector(SELECTORS.tweetMedia) !== null;
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
    // Fallback to text content hash
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100);
  };

  while (stats.liked < CONFIG.maxLikes && scrollAttempts < CONFIG.maxScrollAttempts) {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewTweet = false;

    for (const tweet of tweets) {
      if (stats.liked >= CONFIG.maxLikes) break;

      const tweetId = getTweetIdentifier(tweet);
      
      if (processedTweets.has(tweetId)) continue;
      processedTweets.add(tweetId);
      foundNewTweet = true;

      try {
        // Skip replies if configured
        if (CONFIG.skipReplies && isReply(tweet)) {
          stats.skippedReplies++;
          log.info('Skipped reply tweet');
          continue;
        }

        // Skip ads if configured
        if (CONFIG.skipAds && isAd(tweet)) {
          stats.skippedAds++;
          log.info('Skipped promoted/ad tweet');
          continue;
        }

        // Skip retweets if configured
        if (CONFIG.skipRetweets && isRetweet(tweet)) {
          stats.skippedRetweets++;
          log.info('Skipped retweet');
          continue;
        }

        // Only with media check
        if (CONFIG.onlyWithMedia && !hasMedia(tweet)) {
          stats.skippedNoMedia++;
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
          // Scroll tweet into view
          tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(500);

          likeButton.click();
          stats.liked++;

          const preview = tweet.querySelector(SELECTORS.tweetText)?.textContent?.substring(0, 50) || 'No text';
          log.success(`Liked tweet #${stats.liked}: "${preview}..."`);
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
      if (noNewTweetsCount >= CONFIG.noNewTweetsThreshold) {
        log.warning('No new tweets found after multiple scrolls. Stopping.');
        break;
      }
    } else {
      noNewTweetsCount = 0;
    }

    // Scroll for more tweets
    scrollDown();
    scrollAttempts++;
    log.info(`Scrolling for more tweets... (attempt ${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
    await sleep(1500);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const totalSkipped = stats.skippedReplies + stats.skippedAds + stats.skippedRetweets + stats.skippedNoMedia;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE BY FEED - COMPLETE                              ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:       ${String(stats.liked).padEnd(32)}║
║  ⏭️  Total Skipped:     ${String(totalSkipped).padEnd(32)}║
║     └─ Replies:        ${String(stats.skippedReplies).padEnd(32)}║
║     └─ Ads:            ${String(stats.skippedAds).padEnd(32)}║
║     └─ Retweets:       ${String(stats.skippedRetweets).padEnd(32)}║
║     └─ No Media:       ${String(stats.skippedNoMedia).padEnd(32)}║
║  💗 Already Liked:     ${String(stats.alreadyLiked).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
║  📜 Scroll Attempts:   ${String(scrollAttempts).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();
