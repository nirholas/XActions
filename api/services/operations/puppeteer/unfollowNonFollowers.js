const browserAutomation = require('../../browserAutomation');

async function unfollowNonFollowersBrowser(userId, config, updateProgress) {
  const page = await browserAutomation.createPage(config.sessionCookie);
  
  try {
    // Navigate and authenticate
    await browserAutomation.navigateToTwitter(page);
    
    const isAuth = await browserAutomation.checkAuthentication(page);
    if (!isAuth) {
      throw new Error('Session expired - please reconnect your X account');
    }

    updateProgress('Fetching your following list...');
    const following = await browserAutomation.getFollowing(
      page, 
      config.username, 
      config.maxUsers || 1000
    );

    updateProgress(`Found ${following.length} accounts you follow`);
    
    updateProgress('Fetching your followers list...');
    const followers = await browserAutomation.getFollowers(
      page, 
      config.username, 
      config.maxUsers || 1000
    );

    updateProgress(`Found ${followers.length} followers`);

    // Find non-followers
    const followerUsernames = new Set(followers.map(f => f.username));
    const nonFollowers = following.filter(f => !followerUsernames.has(f.username));

    updateProgress(`Identified ${nonFollowers.length} accounts that don't follow you back`);

    if (nonFollowers.length === 0) {
      return {
        success: true,
        unfollowed: [],
        message: 'Everyone you follow also follows you back!'
      };
    }

    // Unfollow non-followers with rate limiting
    const unfollowed = [];
    const failed = [];
    const limit = config.limit || nonFollowers.length;

    for (let i = 0; i < Math.min(nonFollowers.length, limit); i++) {
      const user = nonFollowers[i];
      
      updateProgress(`Unfollowing ${user.username} (${i + 1}/${Math.min(nonFollowers.length, limit)})`);

      const result = await browserAutomation.unfollowUser(page, user.username);
      
      if (result.success) {
        unfollowed.push(user.username);
      } else {
        failed.push({ username: user.username, error: result.error });
      }

      // Random delay to avoid rate limits (3-7 seconds)
      await browserAutomation.randomDelay(3000, 7000);

      // Longer pause every 10 unfollows
      if ((i + 1) % 10 === 0) {
        updateProgress(`Pausing for safety (${i + 1}/${Math.min(nonFollowers.length, limit)} completed)...`);
        await browserAutomation.randomDelay(15000, 30000);
      }
    }

    return {
      success: true,
      unfollowed,
      failed,
      nonFollowers: nonFollowers.map(u => u.username),
      totalProcessed: unfollowed.length + failed.length
    };

  } finally {
    await page.close();
  }
}

module.exports = { unfollowNonFollowersBrowser };
