import browserAutomation from '../../browserAutomation.js';

/**
 * Follow users who engaged with specific tweets using browser automation
 * @param {string} userId - User ID for the operation
 * @param {object} config - Configuration including sessionCookie, tweetUrl, etc.
 * @param {function} updateProgress - Callback to update job progress
 * @param {function} isCancelled - Function to check if job is cancelled
 */
async function followEngagersBrowser(userId, config, updateProgress, isCancelled = () => false) {
  const page = await browserAutomation.createPage(config.sessionCookie);
  
  try {
    await browserAutomation.navigateToTwitter(page);
    
    const isAuth = await browserAutomation.checkAuthentication(page);
    if (!isAuth) {
      throw new Error('Session expired - please reconnect your X account');
    }

    const { 
      tweetUrl,
      engagementType = 'likes', // 'likes' or 'retweets'
      maxFollows = 50,
      dryRun = false,
      whitelist = []
    } = config;

    if (!tweetUrl) {
      throw new Error('tweetUrl must be provided');
    }

    // Get engagers
    updateProgress(`Fetching ${engagementType} from tweet...`);
    const engagers = await browserAutomation.getTweetEngagers(
      page, 
      tweetUrl, 
      engagementType, 
      maxFollows * 2 // Fetch extra in case some are filtered
    );

    updateProgress(`Found ${engagers.length} users who ${engagementType === 'likes' ? 'liked' : 'retweeted'} the tweet`);

    if (engagers.length === 0) {
      return {
        success: true,
        followed: [],
        message: 'No engagers found for this tweet'
      };
    }

    // Filter whitelist
    const whitelistLower = whitelist.map(u => u.toLowerCase());
    const filteredEngagers = engagers.filter(e => 
      !whitelistLower.includes(e.username.toLowerCase())
    );

    const followed = [];
    const failed = [];
    const limit = Math.min(filteredEngagers.length, maxFollows);

    for (let i = 0; i < limit; i++) {
      if (isCancelled()) {
        updateProgress('Job cancelled by user');
        break;
      }

      const user = filteredEngagers[i];
      
      updateProgress(`Following @${user.username} (${i + 1}/${limit})`);

      if (!dryRun) {
        const result = await browserAutomation.followUser(page, user.username);
        
        if (result.success) {
          followed.push({
            username: user.username,
            displayName: user.displayName,
            alreadyFollowing: result.alreadyFollowing || false
          });
        } else {
          failed.push({
            username: user.username,
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
          username: user.username,
          displayName: user.displayName,
          dryRun: true
        });
      }
    }

    return {
      success: true,
      followed,
      failed,
      totalEngagers: engagers.length,
      totalProcessed: followed.length + failed.length,
      dryRun,
      cancelled: isCancelled()
    };

  } finally {
    await page.close();
  }
}

export { followEngagersBrowser };
