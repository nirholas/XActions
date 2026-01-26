/**
 * ============================================
 * 💬 Like User Replies - XActions
 * ============================================
 * 
 * @name         like-user-replies
 * @description  Automatically like replies/comments on a specific tweet
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-01-26
 * @website      https://xactions.app
 * 
 * Usage:
 *   1. Go to a specific tweet page (x.com/username/status/xxx)
 *   2. Configure the options below
 *   3. Open browser console (F12 or Cmd+Shift+J)
 *   4. Paste this entire script and press Enter
 * 
 * ============================================
 */

(async function likeUserReplies() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of replies to like
    maxLikes: 30,
    
    // Skip nested replies (replies to replies)
    skipNestedReplies: false,
    
    // Only like replies from verified users
    onlyVerified: false,
    
    // Skip replies from accounts with fewer followers than this
    minFollowers: 0,
    
    // Only like replies with images/videos
    onlyWithMedia: false,
    
    // Skip replies that contain specific words
    skipContaining: [],
    
    // Only like replies containing specific words (empty = all)
    onlyContaining: [],
    
    // Minimum delay between actions (ms)
    minDelay: 1500,
    
    // Maximum delay between actions (ms)
    maxDelay: 3500,
    
    // Maximum scroll attempts
    maxScrollAttempts: 20,
    
    // Skip the original tweet (only like replies)
    skipOriginalTweet: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweetText: '[data-testid="tweetText"]',
    userCell: '[data-testid="User-Name"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    tweetMedia: '[data-testid="tweetPhoto"], [data-testid="videoPlayer"]',
    conversationThread: '[data-testid="cellInnerDiv"]',
    replyingTo: 'div[dir="ltr"]'
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
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} replies liked`)
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    liked: 0,
    skippedOriginal: 0,
    skippedNested: 0,
    skippedNotVerified: 0,
    skippedNoMedia: 0,
    skippedFiltered: 0,
    alreadyLiked: 0,
    errors: 0,
    repliesProcessed: 0
  };

  const processedTweets = new Set();

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  💬 LIKE USER REPLIES - XActions                         ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Verify we're on a tweet page
  const currentUrl = window.location.href;
  if (!currentUrl.includes('/status/')) {
    log.error('Please navigate to a tweet page first (x.com/username/status/xxx)');
    log.info('Example: Go to a specific tweet to like its replies');
    return;
  }

  // Extract tweet info from URL
  const urlMatch = currentUrl.match(/\/([^\/]+)\/status\/(\d+)/);
  const tweetAuthor = urlMatch ? urlMatch[1] : 'Unknown';
  const tweetId = urlMatch ? urlMatch[2] : 'Unknown';

  log.info(`Tweet by: @${tweetAuthor}`);
  log.info(`Tweet ID: ${tweetId}`);
  log.info(`Max likes: ${CONFIG.maxLikes}`);
  log.info(`Skip original tweet: ${CONFIG.skipOriginalTweet}`);

  const isVerified = (tweet) => {
    return tweet.querySelector(SELECTORS.verifiedBadge) !== null;
  };

  const hasMedia = (tweet) => {
    return tweet.querySelector(SELECTORS.tweetMedia) !== null;
  };

  const getTweetText = (tweet) => {
    const textElement = tweet.querySelector(SELECTORS.tweetText);
    return textElement ? textElement.textContent.toLowerCase() : '';
  };

  const containsFilteredWords = (text) => {
    if (CONFIG.skipContaining.length === 0) return false;
    return CONFIG.skipContaining.some(word => text.includes(word.toLowerCase()));
  };

  const containsRequiredWords = (text) => {
    if (CONFIG.onlyContaining.length === 0) return true;
    return CONFIG.onlyContaining.some(word => text.includes(word.toLowerCase()));
  };

  const isOriginalTweet = (tweet, index) => {
    // The original tweet is usually the first one on the page
    // and doesn't have "Replying to" text
    if (index === 0) return true;
    const tweetContent = tweet.textContent || '';
    // Check if it's NOT a reply (original tweets don't show "Replying to")
    const hasReplyingTo = tweetContent.includes('Replying to');
    return !hasReplyingTo && index < 2;
  };

  const isNestedReply = (tweet) => {
    // Check if this reply is replying to another reply (not the original tweet)
    const tweetContent = tweet.textContent || '';
    if (!tweetContent.includes('Replying to')) return false;
    
    // This is a simple heuristic - if replying to multiple users, it's likely nested
    const matches = tweetContent.match(/Replying to/g);
    return matches && matches.length > 1;
  };

  const getReplyIdentifier = (tweet) => {
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100) + Date.now();
  };

  const getUsername = (tweet) => {
    const userCell = tweet.querySelector(SELECTORS.userCell);
    if (!userCell) return 'Unknown';
    const link = userCell.querySelector('a[href^="/"]');
    if (!link) return 'Unknown';
    return link.getAttribute('href')?.replace('/', '') || 'Unknown';
  };

  let scrollAttempts = 0;
  let noNewRepliesCount = 0;
  let isFirstBatch = true;

  // Initial scroll to load replies
  await sleep(2000);

  while (stats.liked < CONFIG.maxLikes && scrollAttempts < CONFIG.maxScrollAttempts) {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewReply = false;
    let tweetIndex = 0;

    for (const tweet of tweets) {
      if (stats.liked >= CONFIG.maxLikes) break;

      const replyId = getReplyIdentifier(tweet);
      
      if (processedTweets.has(replyId)) {
        tweetIndex++;
        continue;
      }
      processedTweets.add(replyId);
      foundNewReply = true;

      try {
        // Skip original tweet if configured
        if (CONFIG.skipOriginalTweet && isFirstBatch && isOriginalTweet(tweet, tweetIndex)) {
          stats.skippedOriginal++;
          log.info('Skipped original tweet');
          tweetIndex++;
          continue;
        }

        stats.repliesProcessed++;

        // Skip nested replies if configured
        if (CONFIG.skipNestedReplies && isNestedReply(tweet)) {
          stats.skippedNested++;
          log.info('Skipped nested reply');
          tweetIndex++;
          continue;
        }

        // Only verified check
        if (CONFIG.onlyVerified && !isVerified(tweet)) {
          stats.skippedNotVerified++;
          tweetIndex++;
          continue;
        }

        // Only with media check
        if (CONFIG.onlyWithMedia && !hasMedia(tweet)) {
          stats.skippedNoMedia++;
          tweetIndex++;
          continue;
        }

        // Word filter check
        const tweetText = getTweetText(tweet);
        if (containsFilteredWords(tweetText)) {
          stats.skippedFiltered++;
          log.info('Skipped reply (contains filtered word)');
          tweetIndex++;
          continue;
        }

        if (!containsRequiredWords(tweetText)) {
          stats.skippedFiltered++;
          tweetIndex++;
          continue;
        }

        // Check if already liked
        const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
        if (unlikeButton) {
          stats.alreadyLiked++;
          tweetIndex++;
          continue;
        }

        // Find and click like button
        const likeButton = tweet.querySelector(SELECTORS.likeButton);
        if (likeButton) {
          tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(400);

          likeButton.click();
          stats.liked++;

          const username = getUsername(tweet);
          const preview = tweetText.substring(0, 40) || 'Media/No text';
          log.success(`Liked reply #${stats.liked} by @${username}: "${preview}..."`);
          log.progress(stats.liked, CONFIG.maxLikes);

          await randomDelay();
        }

        tweetIndex++;
      } catch (error) {
        log.error(`Error processing reply: ${error.message}`);
        stats.errors++;
        tweetIndex++;
      }
    }

    isFirstBatch = false;

    if (!foundNewReply) {
      noNewRepliesCount++;
      if (noNewRepliesCount >= 5) {
        log.warning('No new replies found. May have reached the end of thread.');
        break;
      }
    } else {
      noNewRepliesCount = 0;
    }

    scrollDown();
    scrollAttempts++;
    log.info(`Loading more replies... (${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
    await sleep(1500);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const totalSkipped = stats.skippedOriginal + stats.skippedNested + stats.skippedNotVerified + 
                       stats.skippedNoMedia + stats.skippedFiltered;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE USER REPLIES - COMPLETE                         ║
╠══════════════════════════════════════════════════════════╣
║  👤 Tweet Author:      @${String(tweetAuthor).padEnd(31)}║
║  🔗 Tweet ID:          ${String(tweetId).padEnd(32)}║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:       ${String(stats.liked).padEnd(32)}║
║  💬 Replies Processed: ${String(stats.repliesProcessed).padEnd(32)}║
║  ⏭️  Total Skipped:     ${String(totalSkipped).padEnd(32)}║
║     └─ Original:       ${String(stats.skippedOriginal).padEnd(32)}║
║     └─ Nested:         ${String(stats.skippedNested).padEnd(32)}║
║     └─ Not Verified:   ${String(stats.skippedNotVerified).padEnd(32)}║
║     └─ No Media:       ${String(stats.skippedNoMedia).padEnd(32)}║
║     └─ Filtered:       ${String(stats.skippedFiltered).padEnd(32)}║
║  💗 Already Liked:     ${String(stats.alreadyLiked).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();
