import browserAutomation from '../../browserAutomation.js';

/**
 * Auto-comment on tweets using browser automation
 * @param {string} userId - User ID for the operation
 * @param {object} config - Configuration including sessionCookie, query/targetUsername, comments
 * @param {function} updateProgress - Callback to update job progress
 * @param {function} isCancelled - Function to check if job is cancelled
 */
async function autoCommentBrowser(userId, config, updateProgress, isCancelled = () => false) {
  const page = await browserAutomation.createPage(config.sessionCookie);
  
  try {
    await browserAutomation.navigateToTwitter(page);
    
    const isAuth = await browserAutomation.checkAuthentication(page);
    if (!isAuth) {
      throw new Error('Session expired - please reconnect your X account');
    }

    const { 
      query,              // Search query for tweets
      targetUsername,     // Or target a specific user's tweets
      comments = [],      // Array of comment templates to rotate
      comment,            // Or single comment
      maxComments = 20,
      dryRun = false 
    } = config;

    // Validate comments
    const commentList = comments.length > 0 ? comments : (comment ? [comment] : []);
    if (commentList.length === 0) {
      throw new Error('At least one comment text must be provided');
    }

    let tweets = [];
    
    if (targetUsername) {
      // Get tweets from user's timeline
      updateProgress(`Fetching tweets from @${targetUsername}...`);
      tweets = await getUserTweets(page, targetUsername, maxComments * 2);
    } else if (query) {
      // Search for tweets
      updateProgress(`Searching for tweets matching "${query}"...`);
      tweets = await browserAutomation.searchTweets(page, query, maxComments * 2);
    } else {
      throw new Error('Either query or targetUsername must be provided');
    }

    updateProgress(`Found ${tweets.length} tweets to comment on`);

    if (tweets.length === 0) {
      return {
        success: true,
        commented: [],
        message: 'No tweets found to comment on'
      };
    }

    const commented = [];
    const failed = [];
    const limit = Math.min(tweets.length, maxComments);

    for (let i = 0; i < limit; i++) {
      if (isCancelled()) {
        updateProgress('Job cancelled by user');
        break;
      }

      const tweet = tweets[i];
      
      // Rotate through comments
      const commentText = commentList[i % commentList.length];
      
      updateProgress(`Commenting on tweet ${i + 1}/${limit} from @${tweet.username}`);

      if (!dryRun && tweet.url) {
        const result = await browserAutomation.postComment(page, tweet.url, commentText);
        
        if (result.success) {
          commented.push({
            tweetUrl: tweet.url,
            username: tweet.username,
            tweetText: tweet.text?.substring(0, 100),
            comment: commentText
          });
        } else {
          failed.push({
            tweetUrl: tweet.url,
            username: tweet.username,
            error: result.error
          });
        }

        // Longer delays for comments - Twitter is very strict
        // Wait 30-60 seconds between comments
        updateProgress(`Waiting before next comment (rate limit safety)...`);
        await browserAutomation.randomDelay(30000, 60000);

        // Extra long pause every 5 comments
        if ((i + 1) % 5 === 0) {
          updateProgress(`Extended pause (${i + 1}/${limit} completed)...`);
          await browserAutomation.randomDelay(120000, 180000); // 2-3 minutes
        }
      } else if (dryRun) {
        commented.push({
          tweetUrl: tweet.url,
          username: tweet.username,
          tweetText: tweet.text?.substring(0, 100),
          comment: commentText,
          dryRun: true
        });
      }
    }

    return {
      success: true,
      commented,
      failed,
      totalProcessed: commented.length + failed.length,
      dryRun,
      cancelled: isCancelled()
    };

  } finally {
    await page.close();
  }
}

/**
 * Get tweets from a specific user's timeline
 */
async function getUserTweets(page, username, limit = 50) {
  const tweets = [];
  
  await page.goto(`https://x.com/${username}`, { 
    waitUntil: 'networkidle2' 
  });

  let scrollAttempts = 0;
  const maxScrolls = Math.ceil(limit / 10);

  while (tweets.length < limit && scrollAttempts < maxScrolls) {
    const newTweets = await page.evaluate((targetUsername) => {
      const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(tweetElements).map(tweet => {
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        const tweetUrl = tweetLink?.href;
        const tweetId = tweetUrl?.split('/status/')[1]?.split('?')[0];
        const tweetText = tweet.querySelector('[data-testid="tweetText"]')?.textContent;
        
        return {
          username: targetUsername,
          text: tweetText,
          url: tweetUrl,
          id: tweetId
        };
      }).filter(t => t.url);
    }, username);

    newTweets.forEach(tweet => {
      if (!tweets.find(t => t.id === tweet.id)) {
        tweets.push(tweet);
      }
    });

    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await browserAutomation.randomDelay(2000, 3000);
    scrollAttempts++;
  }

  return tweets.slice(0, limit);
}

export { autoCommentBrowser };
