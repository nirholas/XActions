// UnfollowX Automation - Auto Commenter
// https://github.com/nirholas/UnfollowX
//
// REQUIRES: Paste core.js first!
//
// Monitors a user's profile for new posts and auto-comments.
// Great for engagement, building relationships, never missing a post.
//
// HOW TO USE:
// 1. Go to the user's profile: twitter.com/USERNAME
// 2. Paste core.js, then paste this script
// 3. Configure your comments and let it run!
//
// ⚠️ WARNING: Use responsibly! Spammy comments can get you limited.

(() => {
  if (!window.UnfollowX?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollToTop, clickElement, waitForElement, storage, SELECTORS } = window.UnfollowX.Core;

  // ============================================
  // CONFIGURATION
  // ============================================
  const OPTIONS = {
    // Comments to randomly choose from
    COMMENTS: [
      '🔥',
      'Great point!',
      'This is so true 👏',
      'Interesting take!',
      'Love this perspective',
      '💯',
      'Facts!',
    ],
    
    // Monitoring settings
    CHECK_INTERVAL_SECONDS: 60,   // How often to check for new posts
    MAX_COMMENTS_PER_SESSION: 5,  // Stop after this many comments
    
    // Behavior
    ONLY_ORIGINAL_TWEETS: true,   // Skip replies and retweets
    REQUIRE_KEYWORD: false,       // Only comment if post contains keyword
    KEYWORDS: [],                 // Keywords to match (if REQUIRE_KEYWORD is true)
    
    // Safety
    MIN_POST_AGE_SECONDS: 30,     // Don't comment on posts younger than this
    MAX_POST_AGE_MINUTES: 30,     // Don't comment on posts older than this
  };

  // ============================================
  // STATE
  // ============================================
  let commentCount = 0;
  let checkCount = 0;
  let isRunning = true;
  const commentedTweets = new Set(storage.get('commented_tweets') || []);

  // ============================================
  // HELPERS
  // ============================================
  const getUsername = () => {
    const match = window.location.pathname.match(/^\/([^/]+)/);
    return match ? match[1] : 'unknown';
  };

  const getRandomComment = () => {
    return OPTIONS.COMMENTS[Math.floor(Math.random() * OPTIONS.COMMENTS.length)];
  };

  const getTweetId = (tweetElement) => {
    const link = tweetElement.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const getTweetAge = (tweetElement) => {
    // Try to find the time element
    const timeEl = tweetElement.querySelector('time');
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) {
        return Date.now() - new Date(datetime).getTime();
      }
    }
    return null;
  };

  const isReply = (tweetElement) => {
    return !!tweetElement.textContent?.includes('Replying to');
  };

  const isRetweet = (tweetElement) => {
    return !!tweetElement.closest('article')?.textContent?.includes('reposted');
  };

  const matchesKeywords = (text) => {
    if (!OPTIONS.REQUIRE_KEYWORD) return true;
    if (OPTIONS.KEYWORDS.length === 0) return true;
    const lowerText = text.toLowerCase();
    return OPTIONS.KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
  };

  // ============================================
  // COMMENT ACTION
  // ============================================
  const postComment = async (tweetElement) => {
    const tweetId = getTweetId(tweetElement);
    if (!tweetId) return false;

    // Click reply button
    const replyBtn = tweetElement.querySelector(SELECTORS.replyButton);
    if (!replyBtn) {
      log('Reply button not found', 'warning');
      return false;
    }

    await clickElement(replyBtn);
    await sleep(1000);

    // Wait for reply modal/input
    const replyInput = await waitForElement('[data-testid="tweetTextarea_0"]', 5000);
    if (!replyInput) {
      log('Reply input not found', 'warning');
      // Press Escape to close any modal
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return false;
    }

    // Type the comment
    const comment = getRandomComment();
    
    // Focus and type
    replyInput.focus();
    await sleep(300);
    
    // Use execCommand for contenteditable
    document.execCommand('insertText', false, comment);
    await sleep(500);

    // Find and click the Reply/Post button
    const postBtn = await waitForElement('[data-testid="tweetButton"]', 3000);
    if (!postBtn) {
      log('Post button not found', 'warning');
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return false;
    }

    // Check if button is enabled
    if (postBtn.disabled || postBtn.getAttribute('aria-disabled') === 'true') {
      log('Post button is disabled', 'warning');
      await sleep(500);
    }

    await clickElement(postBtn);
    await sleep(1000);

    // Save that we commented
    commentedTweets.add(tweetId);
    storage.set('commented_tweets', Array.from(commentedTweets));
    commentCount++;

    log(`💬 Commented "${comment}" on tweet ${tweetId}`, 'success');
    return true;
  };

  // ============================================
  // FIND NEW TWEETS
  // ============================================
  const findNewTweets = () => {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    const newTweets = [];

    for (const tweet of tweets) {
      const tweetId = getTweetId(tweet);
      if (!tweetId) continue;
      
      // Skip if already commented
      if (commentedTweets.has(tweetId)) continue;

      // Skip replies/retweets if configured
      if (OPTIONS.ONLY_ORIGINAL_TWEETS) {
        if (isReply(tweet) || isRetweet(tweet)) continue;
      }

      // Check age
      const ageMs = getTweetAge(tweet);
      if (ageMs !== null) {
        const ageSeconds = ageMs / 1000;
        const ageMinutes = ageSeconds / 60;
        
        if (ageSeconds < OPTIONS.MIN_POST_AGE_SECONDS) continue;
        if (ageMinutes > OPTIONS.MAX_POST_AGE_MINUTES) continue;
      }

      // Check keywords
      const textEl = tweet.querySelector(SELECTORS.tweetText);
      const text = textEl?.textContent || '';
      if (!matchesKeywords(text)) continue;

      newTweets.push({ element: tweet, tweetId, text: text.substring(0, 50) });
    }

    return newTweets;
  };

  // ============================================
  // MAIN LOOP
  // ============================================
  const check = async () => {
    if (!isRunning) return;
    if (commentCount >= OPTIONS.MAX_COMMENTS_PER_SESSION) {
      log(`Reached max comments (${OPTIONS.MAX_COMMENTS_PER_SESSION}). Stopping.`, 'warning');
      return;
    }

    checkCount++;
    const time = new Date().toLocaleTimeString();
    log(`[${time}] Check #${checkCount}...`, 'info');

    // Refresh the page content
    scrollToTop();
    await sleep(2000);

    // Find new tweets
    const newTweets = findNewTweets();

    if (newTweets.length > 0) {
      log(`Found ${newTweets.length} new tweets to comment on!`, 'success');
      
      for (const { element, tweetId, text } of newTweets) {
        if (commentCount >= OPTIONS.MAX_COMMENTS_PER_SESSION) break;
        
        log(`Commenting on: "${text}..."`, 'action');
        await postComment(element);
        await randomDelay(3000, 6000);
      }
    } else {
      log('No new tweets found', 'info');
    }

    // Schedule next check
    if (isRunning && commentCount < OPTIONS.MAX_COMMENTS_PER_SESSION) {
      log(`Next check in ${OPTIONS.CHECK_INTERVAL_SECONDS} seconds...`, 'info');
      setTimeout(check, OPTIONS.CHECK_INTERVAL_SECONDS * 1000);
    }
  };

  // ============================================
  // START
  // ============================================
  const run = async () => {
    const username = getUsername();
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  💬 UnfollowX Auto Commenter                              ║
║                                                           ║
║  Watching: @${username.padEnd(20)}                        ║
║  Interval: Every ${OPTIONS.CHECK_INTERVAL_SECONDS} seconds                         ║
║  Max comments: ${OPTIONS.MAX_COMMENTS_PER_SESSION}                                    ║
║                                                           ║
║  Keep this tab open!                                      ║
║  Run stopAutoComment() to stop.                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

    log('Starting auto-commenter...', 'info');
    log(`Comments pool: ${OPTIONS.COMMENTS.join(', ')}`, 'info');
    log(`Previously commented on ${commentedTweets.size} tweets`, 'info');

    await check();
  };

  run();

  // Stop function
  window.stopAutoComment = () => {
    isRunning = false;
    log('Stopping auto-commenter...', 'warning');
  };
})();
