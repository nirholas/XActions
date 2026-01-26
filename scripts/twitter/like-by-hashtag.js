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

  const likeTweetsOnPage = async (hashtag) => {
    let hashtagLikes = 0;
    let scrollAttempts = 0;
    let noNewTweetsCount = 0;

    while (hashtagLikes < CONFIG.maxLikesPerHashtag && 
           stats.totalLiked < CONFIG.maxTotalLikes && 
           scrollAttempts < CONFIG.maxScrollAttempts) {
      
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      let foundNewTweet = false;

      for (const tweet of tweets) {
        if (hashtagLikes >= CONFIG.maxLikesPerHashtag || stats.totalLiked >= CONFIG.maxTotalLikes) {
          break;
        }

        // Generate unique tweet ID based on text content
        const tweetText = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        const tweetId = tweetText.substring(0, 100);
        
        if (processedTweets.has(tweetId)) {
          continue;
        }
        processedTweets.add(tweetId);
        foundNewTweet = true;

        try {
          // Skip retweets if configured
          if (CONFIG.skipRetweets && tweet.querySelector(SELECTORS.retweetIndicator)) {
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
    window.location.href = searchUrl;
    
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
