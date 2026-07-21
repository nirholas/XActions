// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🏷️ Like By Hashtag - XActions
 * ============================================
 * 
 * @name         like-by-hashtag
 * @description  Automatically like tweets containing specific hashtags
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-01-26
 * @website      https://xactions.app
 * 
 * Usage:
 *   1. Go to x.com and log in
 *   2. Navigate to search page or any page
 *   3. Configure the hashtags and options below
 *   4. Open browser console (F12 or Cmd+Shift+J)
 *   5. Paste this entire script and press Enter
 * 
 * ============================================
 */

(async function likeByHashtag() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Hashtags to search for (without the # symbol)
    hashtags: ['javascript', 'webdev', 'coding'],
    
    // Maximum number of tweets to like per hashtag
    maxLikesPerHashtag: 10,
    
    // Total maximum likes across all hashtags
    maxTotalLikes: 30,
    
    // Minimum delay between actions (ms)
    minDelay: 2000,
    
    // Maximum delay between actions (ms)
    maxDelay: 4000,
    
    // Skip retweets
    skipRetweets: true,
    
    // Skip tweets with media only (no text)
    skipMediaOnly: false,
    
    // Scroll attempts before moving to next hashtag
    maxScrollAttempts: 5
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
    searchBox: '[data-testid="SearchBox_Search_Input"]'
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
    window.scrollBy(0, window.innerHeight * 0.8);
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
    totalLiked: 0,
    skipped: 0,
    alreadyLiked: 0,
    errors: 0,
    byHashtag: {}
  };

  const processedTweets = new Set();

  // Stop switch: run window.stopLikeByHashtag() from the console to abort
  // the loop after the tweet currently being processed.
  let stopped = false;
  window.stopLikeByHashtag = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current tweet, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🏷️  LIKE BY HASHTAG - XActions                          ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  log.info(`Starting hashtag liker for: #${CONFIG.hashtags.join(', #')}`);
  log.info(`Max likes per hashtag: ${CONFIG.maxLikesPerHashtag}`);
  log.info(`Max total likes: ${CONFIG.maxTotalLikes}`);
  log.info(`To stop early: window.stopLikeByHashtag()`);

  const likeTweetsOnPage = async (hashtag) => {
    let hashtagLikes = 0;
    let scrollAttempts = 0;
    let noNewTweetsCount = 0;

    while (!stopped && hashtagLikes < CONFIG.maxLikesPerHashtag &&
           stats.totalLiked < CONFIG.maxTotalLikes &&
           scrollAttempts < CONFIG.maxScrollAttempts) {

      const tweets = document.querySelectorAll(SELECTORS.tweet);
      let foundNewTweet = false;

      for (const tweet of tweets) {
        if (stopped || hashtagLikes >= CONFIG.maxLikesPerHashtag || stats.totalLiked >= CONFIG.maxTotalLikes) {
          break;
        }

        // Unique tweet ID from the permalink around the timestamp (the first
        // /status/ link can belong to a quoted tweet); text is the fallback
        const tweetText = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
        const idMatch = timeAnchor?.href.match(/\/status\/(\d+)/);
        const tweetId = idMatch ? idMatch[1] : tweetText.substring(0, 100);

        if (processedTweets.has(tweetId)) {
          continue;
        }
        processedTweets.add(tweetId);
        foundNewTweet = true;

        try {
          // Skip retweets if configured (socialContext inside an <a> = repost;
          // a plain socialContext is a pinned post, not a repost)
          const socialContext = tweet.querySelector(SELECTORS.retweetIndicator);
          if (CONFIG.skipRetweets && socialContext && socialContext.closest('a') !== null) {
            stats.skipped++;
            continue;
          }

          // Skip media-only tweets if configured
          if (CONFIG.skipMediaOnly && !tweetText.trim()) {
            stats.skipped++;
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
            likeButton.click();
            hashtagLikes++;
            stats.totalLiked++;
            
            if (!stats.byHashtag[hashtag]) {
              stats.byHashtag[hashtag] = 0;
            }
            stats.byHashtag[hashtag]++;

            log.success(`Liked tweet #${stats.totalLiked} for #${hashtag}`);
            log.progress(stats.totalLiked, CONFIG.maxTotalLikes);

            await randomDelay();
          }
        } catch (error) {
          log.error(`Error processing tweet: ${error.message}`);
          stats.errors++;
        }
      }

      if (!foundNewTweet) {
        noNewTweetsCount++;
        if (noNewTweetsCount >= 3) {
          log.warning('No new tweets found after multiple scrolls');
          break;
        }
      } else {
        noNewTweetsCount = 0;
      }

      // Scroll for more tweets
      scrollDown();
      scrollAttempts++;
      await sleep(1500);
    }

    return hashtagLikes;
  };

  const navigateToHashtag = async (hashtag) => {
    const searchUrl = `https://x.com/search?q=%23${encodeURIComponent(hashtag)}&src=typed_query&f=live`;
    spaNavigate(searchUrl);

    // Wait for page to load
    await sleep(3000);
    
    // Wait for tweets to appear
    let attempts = 0;
    while (!document.querySelector(SELECTORS.tweet) && attempts < 10) {
      await sleep(1000);
      attempts++;
    }
    
    return attempts < 10;
  };

  // Process each hashtag
  for (const hashtag of CONFIG.hashtags) {
    if (stopped) break;
    if (stats.totalLiked >= CONFIG.maxTotalLikes) {
      log.warning('Reached maximum total likes limit');
      break;
    }

    log.info(`\n🔍 Searching for #${hashtag}...`);
    
    const navigated = await navigateToHashtag(hashtag);
    if (!navigated) {
      log.error(`Failed to load tweets for #${hashtag}`);
      continue;
    }

    await sleep(2000);
    await likeTweetsOnPage(hashtag);
    
    log.info(`Finished processing #${hashtag}`);
    await sleep(2000);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE BY HASHTAG - COMPLETE                           ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:     ${String(stats.totalLiked).padEnd(34)}║
║  ⏭️  Skipped:         ${String(stats.skipped).padEnd(34)}║
║  💗 Already Liked:   ${String(stats.alreadyLiked).padEnd(34)}║
║  ❌ Errors:          ${String(stats.errors).padEnd(34)}║
╠══════════════════════════════════════════════════════════╣
║  📈 Likes by Hashtag:                                    ║
${Object.entries(stats.byHashtag).map(([tag, count]) => 
  `║    #${tag}: ${count}`.padEnd(59) + '║'
).join('\n')}
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();
