/**
 * ============================================
 * 👤 Like By User - XActions
 * ============================================
 * 
 * @name         like-by-user
 * @description  Automatically like all tweets from a specific user's profile
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-01-26
 * @website      https://xactions.app
 * 
 * Usage:
 *   1. Go to the user's profile page (x.com/username)
 *   2. Configure the options below
 *   3. Open browser console (F12 or Cmd+Shift+J)
 *   4. Paste this entire script and press Enter
 * 
 * ============================================
 */

(async function likeByUser() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of tweets to like
    maxLikes: 50,
    
    // Skip replies by this user
    skipReplies: false,
    
    // Skip retweets by this user
    skipRetweets: true,
    
    // Skip quote tweets
    skipQuoteTweets: false,
    
    // Only like tweets with images/videos
    onlyWithMedia: false,
    
    // Only like tweets with minimum engagement
    minLikes: 0,
    minRetweets: 0,
    
    // Minimum delay between actions (ms)
    minDelay: 1500,
    
    // Maximum delay between actions (ms)
    maxDelay: 3500,
    
    // Maximum scroll attempts
    maxScrollAttempts: 25,
    
    // Stop after this many consecutive already-liked tweets
    stopAfterAlreadyLiked: 10
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
    tweetMedia: '[data-testid="tweetPhoto"], [data-testid="videoPlayer"]',
    quoteTweet: '[data-testid="tweet"] [data-testid="tweet"]',
    userAvatar: '[data-testid="Tweet-User-Avatar"]',
    likeCount: '[data-testid="like"] span, [data-testid="unlike"] span',
    retweetCount: '[data-testid="retweet"] span'
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

  const parseCount = (text) => {
    if (!text) return 0;
    const cleaned = text.replace(/,/g, '').trim();
    if (cleaned.endsWith('K')) {
      return parseFloat(cleaned) * 1000;
    }
    if (cleaned.endsWith('M')) {
      return parseFloat(cleaned) * 1000000;
    }
    return parseInt(cleaned) || 0;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    liked: 0,
    skippedReplies: 0,
    skippedRetweets: 0,
    skippedQuotes: 0,
    skippedNoMedia: 0,
    skippedLowEngagement: 0,
    alreadyLiked: 0,
    errors: 0,
    tweetsProcessed: 0
  };

  const processedTweets = new Set();

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  👤 LIKE BY USER - XActions                              ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Get current username from URL
  const currentUrl = window.location.href;
  const usernameMatch = currentUrl.match(/x\.com\/([^\/\?]+)|twitter\.com\/([^\/\?]+)/);
  const username = usernameMatch ? (usernameMatch[1] || usernameMatch[2]) : 'Unknown';

  // Verify we're on a profile page
  if (username === 'home' || username === 'explore' || username === 'search' || username === 'notifications') {
    log.error('Please navigate to a user profile page first (x.com/username)');
    log.info('Example: Go to x.com/elonmusk to like their tweets');
    return;
  }

  log.info(`Target user: @${username}`);
  log.info(`Max likes: ${CONFIG.maxLikes}`);
  log.info(`Skip replies: ${CONFIG.skipReplies}`);
  log.info(`Skip retweets: ${CONFIG.skipRetweets}`);

  const isReply = (tweet) => {
    const tweetContent = tweet.textContent || '';
    return tweetContent.includes('Replying to');
  };

  const isRetweet = (tweet) => {
    const socialContext = tweet.querySelector(SELECTORS.retweetIndicator);
    if (socialContext) {
      const text = socialContext.textContent || '';
      return text.includes('reposted') || text.includes('Retweeted');
    }
    return false;
  };

  const isQuoteTweet = (tweet) => {
    return tweet.querySelector(SELECTORS.quoteTweet) !== null;
  };

  const hasMedia = (tweet) => {
    return tweet.querySelector(SELECTORS.tweetMedia) !== null;
  };

  const getEngagement = (tweet) => {
    const likeSpan = tweet.querySelector(SELECTORS.likeCount);
    const retweetSpan = tweet.querySelector(SELECTORS.retweetCount);
    return {
      likes: parseCount(likeSpan?.textContent),
      retweets: parseCount(retweetSpan?.textContent)
    };
  };

  const getTweetIdentifier = (tweet) => {
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100) + Date.now();
  };

  let scrollAttempts = 0;
  let noNewTweetsCount = 0;
  let consecutiveAlreadyLiked = 0;

  while (stats.liked < CONFIG.maxLikes && 
         scrollAttempts < CONFIG.maxScrollAttempts &&
         consecutiveAlreadyLiked < CONFIG.stopAfterAlreadyLiked) {
    
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewTweet = false;

    for (const tweet of tweets) {
      if (stats.liked >= CONFIG.maxLikes) break;
      if (consecutiveAlreadyLiked >= CONFIG.stopAfterAlreadyLiked) break;

      const tweetId = getTweetIdentifier(tweet);
      
      if (processedTweets.has(tweetId)) continue;
      processedTweets.add(tweetId);
      foundNewTweet = true;
      stats.tweetsProcessed++;

      try {
        // Skip replies if configured
        if (CONFIG.skipReplies && isReply(tweet)) {
          stats.skippedReplies++;
          log.info('Skipped reply');
          continue;
        }

        // Skip retweets if configured
        if (CONFIG.skipRetweets && isRetweet(tweet)) {
          stats.skippedRetweets++;
          log.info('Skipped retweet');
          continue;
        }

        // Skip quote tweets if configured
        if (CONFIG.skipQuoteTweets && isQuoteTweet(tweet)) {
          stats.skippedQuotes++;
          log.info('Skipped quote tweet');
          continue;
        }

        // Only with media check
        if (CONFIG.onlyWithMedia && !hasMedia(tweet)) {
          stats.skippedNoMedia++;
          continue;
        }

        // Engagement check
        if (CONFIG.minLikes > 0 || CONFIG.minRetweets > 0) {
          const engagement = getEngagement(tweet);
          if (engagement.likes < CONFIG.minLikes || engagement.retweets < CONFIG.minRetweets) {
            stats.skippedLowEngagement++;
            continue;
          }
        }

        // Check if already liked
        const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
        if (unlikeButton) {
          stats.alreadyLiked++;
          consecutiveAlreadyLiked++;
          if (consecutiveAlreadyLiked >= CONFIG.stopAfterAlreadyLiked) {
            log.warning(`Found ${consecutiveAlreadyLiked} consecutive already-liked tweets. Stopping to avoid duplicates.`);
          }
          continue;
        }

        // Reset consecutive counter when we find an unliked tweet
        consecutiveAlreadyLiked = 0;

        // Find and click like button
        const likeButton = tweet.querySelector(SELECTORS.likeButton);
        if (likeButton) {
          tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(400);

          likeButton.click();
          stats.liked++;

          const preview = tweet.querySelector(SELECTORS.tweetText)?.textContent?.substring(0, 45) || 'Media/No text';
          log.success(`Liked @${username}'s tweet #${stats.liked}: "${preview}..."`);
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
      if (noNewTweetsCount >= 5) {
        log.warning('No new tweets found. User may have limited content.');
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

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE BY USER - COMPLETE                              ║
╠══════════════════════════════════════════════════════════╣
║  👤 Target User:       @${String(username).padEnd(31)}║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:       ${String(stats.liked).padEnd(32)}║
║  📄 Tweets Processed:  ${String(stats.tweetsProcessed).padEnd(32)}║
║  ⏭️  Skipped Replies:   ${String(stats.skippedReplies).padEnd(32)}║
║  ⏭️  Skipped Retweets:  ${String(stats.skippedRetweets).padEnd(32)}║
║  ⏭️  Skipped Quotes:    ${String(stats.skippedQuotes).padEnd(32)}║
║  ⏭️  Low Engagement:    ${String(stats.skippedLowEngagement).padEnd(32)}║
║  💗 Already Liked:     ${String(stats.alreadyLiked).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();
