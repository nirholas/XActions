import browserAutomation from '../../browserAutomation.js';

/**
 * Follow users who tweet about specific keywords using browser automation
 * @param {string} userId - User ID for the operation
 * @param {object} config - Configuration including sessionCookie, keywords, etc.
 * @param {function} updateProgress - Callback to update job progress
 * @param {function} isCancelled - Function to check if job is cancelled
 */
async function keywordFollowBrowser(userId, config, updateProgress, isCancelled = () => false) {
  const page = await browserAutomation.createPage(config.sessionCookie);
  
  try {
    await browserAutomation.navigateToTwitter(page);
    
    const isAuth = await browserAutomation.checkAuthentication(page);
    if (!isAuth) {
      throw new Error('Session expired - please reconnect your X account');
    }

    const { 
      keywords = [],    // Keywords/hashtags to search
      query,            // Or raw search query
      maxFollows = 50,
      dryRun = false,
      whitelist = []
    } = config;

    // Build search query
    const searchQuery = query || keywords.map(k => 
      k.startsWith('#') ? k : k
    ).join(' OR ');

    if (!searchQuery) {
      throw new Error('Either keywords or query must be provided');
    }

    // Search for tweets
    updateProgress(`Searching for tweets matching "${searchQuery}"...`);
    const tweets = await browserAutomation.searchTweets(page, searchQuery, maxFollows * 3);

    updateProgress(`Found ${tweets.length} tweets, extracting unique authors...`);

    // Get unique authors
    const uniqueAuthors = [];
    const seenAuthors = new Set();

    for (const tweet of tweets) {
      if (tweet.username && !seenAuthors.has(tweet.username.toLowerCase())) {
        seenAuthors.add(tweet.username.toLowerCase());
        uniqueAuthors.push({
          username: tweet.username,
          tweetText: tweet.text?.substring(0, 100)
        });
      }
    }

    // Filter whitelist
    const whitelistLower = whitelist.map(u => u.toLowerCase());
    const filteredAuthors = uniqueAuthors.filter(a => 
      !whitelistLower.includes(a.username.toLowerCase())
    );

    updateProgress(`Found ${filteredAuthors.length} unique authors to potentially follow`);

    if (filteredAuthors.length === 0) {
      return {
        success: true,
        followed: [],
        message: 'No authors found for the given keywords'
      };
    }

    const followed = [];
    const failed = [];
    const limit = Math.min(filteredAuthors.length, maxFollows);

    for (let i = 0; i < limit; i++) {
      if (isCancelled()) {
        updateProgress('Job cancelled by user');
        break;
      }

      const author = filteredAuthors[i];
      
      updateProgress(`Following @${author.username} (${i + 1}/${limit})`);

      if (!dryRun) {
        const result = await browserAutomation.followUser(page, author.username);
        
        if (result.success) {
          followed.push({
            username: author.username,
            alreadyFollowing: result.alreadyFollowing || false,
            matchedTweet: author.tweetText
          });
        } else {
          failed.push({
            username: author.username,
            error: result.error
          });
        }

        // Random delay to avoid rate limits (3-6 seconds)
        await browserAutomation.randomDelay(3000, 6000);

        // Longer pause every 10 follows
        if ((i + 1) % 10 === 0) {
          updateProgress(`Pausing for safety (${i + 1}/${limit} completed)...`);
          await browserAutomation.randomDelay(15000, 30000);
        }

        // Extended pause every 30 follows
        if ((i + 1) % 30 === 0) {
          updateProgress(`Extended pause (${i + 1}/${limit} completed)...`);
          await browserAutomation.randomDelay(60000, 90000);
        }
      } else {
        followed.push({
          username: author.username,
          matchedTweet: author.tweetText,
          dryRun: true
        });
      }
    }

    return {
      success: true,
      followed,
      failed,
      searchQuery,
      totalAuthorsFound: uniqueAuthors.length,
      totalProcessed: followed.length + failed.length,
      dryRun,
      cancelled: isCancelled()
    };

  } finally {
    await page.close();
  }
}

export { keywordFollowBrowser };
