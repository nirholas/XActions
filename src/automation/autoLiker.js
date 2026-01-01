// XActions Automation - Timeline Auto-Liker
// https://github.com/nirholas/XActions
//
// REQUIRES: Paste core.js first!
//
// HOW TO USE:
// 1. Go to your X home feed or any user's profile
// 2. Paste core.js, then paste this script
// 3. Configure options below and run!

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, rateLimit, storage, SELECTORS } = window.XActions.Core;

  // ============================================
  // CONFIGURATION
  // ============================================
  const OPTIONS = {
    // What to like
    LIKE_ALL: false,                    // Like everything (careful!)
    KEYWORDS: ['web3', 'crypto', 'AI'], // Only like posts containing these words
    FROM_USERS: [],                     // Only like posts from these users (empty = all)
    
    // Limits
    MAX_LIKES: 20,                      // Max likes per session
    MAX_SCROLL_DEPTH: 50,               // Max times to scroll down
    
    // Behavior
    ALSO_RETWEET: false,                // Also retweet liked posts
    MIN_DELAY: 2000,                    // Min delay between likes (ms)
    MAX_DELAY: 5000,                    // Max delay between likes (ms)
    
    // Filters
    SKIP_REPLIES: true,                 // Skip reply tweets
    SKIP_ADS: true,                     // Skip promoted tweets
    MIN_LIKES_ON_POST: 0,               // Only like posts with at least X likes
  };

  // ============================================
  // STATE
  // ============================================
  let likeCount = 0;
  let scrollCount = 0;
  const likedTweets = new Set(storage.get('liked_tweets') || []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  const matchesKeywords = (text) => {
    if (OPTIONS.LIKE_ALL) return true;
    if (OPTIONS.KEYWORDS.length === 0) return true;
    const lowerText = text.toLowerCase();
    return OPTIONS.KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
  };

  const matchesUser = (tweetElement) => {
    if (OPTIONS.FROM_USERS.length === 0) return true;
    const userLink = tweetElement.querySelector('a[href^="/"]');
    if (!userLink) return false;
    const username = userLink.getAttribute('href').replace('/', '').toLowerCase();
    return OPTIONS.FROM_USERS.some(u => u.toLowerCase() === username);
  };

  const isAlreadyLiked = (tweetElement) => {
    return !!tweetElement.querySelector(SELECTORS.unlikeButton);
  };

  const isReply = (tweetElement) => {
    return !!tweetElement.querySelector('[data-testid="Tweet-User-Avatar"]')?.closest('article')?.querySelector('span')?.textContent?.includes('Replying to');
  };

  const isAd = (tweetElement) => {
    return !!tweetElement.querySelector('[data-testid="placementTracking"]') || 
           !!tweetElement.textContent?.includes('Promoted');
  };

  const getTweetId = (tweetElement) => {
    const link = tweetElement.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  // ============================================
  // MAIN FUNCTIONS
  // ============================================
  
  const likeTweet = async (tweetElement) => {
    const likeBtn = tweetElement.querySelector(SELECTORS.likeButton);
    if (!likeBtn) return false;

    const clicked = await clickElement(likeBtn);
    if (clicked) {
      likeCount++;
      const tweetId = getTweetId(tweetElement);
      if (tweetId) {
        likedTweets.add(tweetId);
        storage.set('liked_tweets', Array.from(likedTweets));
      }
      rateLimit.increment('like', 'day');
      log(`Liked tweet #${likeCount}`, 'success');
      
      // Optional retweet
      if (OPTIONS.ALSO_RETWEET) {
        await sleep(1000);
        const rtBtn = tweetElement.querySelector(SELECTORS.retweetButton);
        if (rtBtn) {
          await clickElement(rtBtn);
          await sleep(500);
          const confirmRt = document.querySelector('[data-testid="retweetConfirm"]');
          if (confirmRt) await clickElement(confirmRt);
          log('Also retweeted', 'action');
        }
      }
      
      return true;
    }
    return false;
  };

  const processVisibleTweets = async () => {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    
    for (const tweet of tweets) {
      // Check limits
      if (likeCount >= OPTIONS.MAX_LIKES) {
        log(`Reached max likes (${OPTIONS.MAX_LIKES})`, 'warning');
        return false;
      }

      if (!rateLimit.check('like', 200, 'day')) {
        log('Daily rate limit reached', 'warning');
        return false;
      }

      // Skip conditions
      const tweetId = getTweetId(tweet);
      if (tweetId && likedTweets.has(tweetId)) continue;
      if (isAlreadyLiked(tweet)) continue;
      if (OPTIONS.SKIP_REPLIES && isReply(tweet)) continue;
      if (OPTIONS.SKIP_ADS && isAd(tweet)) continue;

      // Get tweet text
      const textEl = tweet.querySelector(SELECTORS.tweetText);
      const text = textEl?.textContent || '';

      // Check filters
      if (!matchesKeywords(text)) continue;
      if (!matchesUser(tweet)) continue;

      // Like it!
      log(`Found matching tweet: "${text.substring(0, 50)}..."`, 'info');
      await likeTweet(tweet);
      await randomDelay(OPTIONS.MIN_DELAY, OPTIONS.MAX_DELAY);
    }
    
    return true;
  };

  const run = async () => {
    log('🚀 Starting Auto-Liker...', 'info');
    log(`Keywords: ${OPTIONS.KEYWORDS.length ? OPTIONS.KEYWORDS.join(', ') : 'ALL'}`, 'info');
    log(`Max likes: ${OPTIONS.MAX_LIKES}`, 'info');

    while (scrollCount < OPTIONS.MAX_SCROLL_DEPTH && likeCount < OPTIONS.MAX_LIKES) {
      const shouldContinue = await processVisibleTweets();
      if (!shouldContinue) break;

      scrollBy(800);
      scrollCount++;
      await randomDelay(1500, 3000);
      
      if (scrollCount % 10 === 0) {
        log(`Progress: ${likeCount} likes, scrolled ${scrollCount}x`, 'info');
      }
    }

    log(`\n✅ Done! Liked ${likeCount} tweets.`, 'success');
    log(`Session saved. Run again to continue where you left off.`, 'info');
  };

  // Expose stop function
  window.stopAutoLiker = () => {
    OPTIONS.MAX_LIKES = 0;
    log('Stopping...', 'warning');
  };

  run();
})();
