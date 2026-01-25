import browserAutomation from '../../browserAutomation.js';

/**
 * Auto-like tweets using browser automation
 * @param {string} userId - User ID for the operation
 * @param {object} config - Configuration including sessionCookie, query/targetUsername, etc.
 * @param {function} updateProgress - Callback to update job progress
 * @param {function} isCancelled - Function to check if job is cancelled
 */
async function autoLikeBrowser(userId, config, updateProgress, isCancelled = () => false) {
  const page = await browserAutomation.createPage(config.sessionCookie);
  
  try {
    await browserAutomation.navigateToTwitter(page);
    
    const isAuth = await browserAutomation.checkAuthentication(page);
    if (!isAuth) {
      throw new Error('Session expired - please reconnect your X account');
    }

    const { 
      query,           // Search query for tweets
      targetUsername,  // Or target a specific user's tweets
      maxLikes = 50,
      dryRun = false 
    } = config;

    let tweets = [];
    
    if (targetUsername) {
      // Navigate to user's profile and get their tweets
      updateProgress(`Fetching tweets from @${targetUsername}...`);
      tweets = await getUserTweets(page, targetUsername, maxLikes);
    } else if (query) {
      // Search for tweets
      updateProgress(`Searching for tweets matching "${query}"...`);
      tweets = await browserAutomation.searchTweets(page, query, maxLikes);
    } else {
      throw new Error('Either query or targetUsername must be provided');
    }

    updateProgress(`Found ${tweets.length} tweets to like`);

    if (tweets.length === 0) {
      return {
        success: true,
        liked: [],
        message: 'No tweets found to like'
      };
    }

    const liked = [];
    const failed = [];
    const limit = Math.min(tweets.length, maxLikes);

    for (let i = 0; i < limit; i++) {
      if (isCancelled()) {
        updateProgress('Job cancelled by user');
        break;
      }

      const tweet = tweets[i];
      
      updateProgress(`Liking tweet ${i + 1}/${limit} from @${tweet.username}`);

      if (!dryRun && tweet.url) {
        const result = await browserAutomation.likePost(page, tweet.url);
        
        if (result.success) {
          liked.push({
            url: tweet.url,
            username: tweet.username,
            alreadyLiked: result.alreadyLiked || false
          });
        } else {
          failed.push({
            url: tweet.url,
            username: tweet.username,
            error: result.error
          });
        }

        // Random delay to avoid rate limits (2-5 seconds)
        await browserAutomation.randomDelay(2000, 5000);

        // Longer pause every 10 likes
        if ((i + 1) % 10 === 0) {
          updateProgress(`Pausing for safety (${i + 1}/${limit} completed)...`);
          await browserAutomation.randomDelay(10000, 20000);
        }
      } else if (dryRun) {
        liked.push({
          url: tweet.url,
          username: tweet.username,
          dryRun: true
        });
      }
    }

    return {
      success: true,
      liked,
      failed,
      totalProcessed: liked.length + failed.length,
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

export { autoLikeBrowser };
