const browserAutomation = require('../../browserAutomation');

async function unfollowEveryoneBrowser(userId, config, updateProgress) {
  const page = await browserAutomation.createPage(config.sessionCookie);
  
  try {
    await browserAutomation.navigateToTwitter(page);
    
    const isAuth = await browserAutomation.checkAuthentication(page);
    if (!isAuth) {
      throw new Error('Session expired - please reconnect your X account');
    }

    updateProgress('Fetching your following list...');
    const following = await browserAutomation.getFollowing(
      page, 
      config.username, 
      config.maxUsers || 5000
    );

    updateProgress(`Found ${following.length} accounts to unfollow`);

    if (following.length === 0) {
      return {
        success: true,
        unfollowed: [],
        message: 'You are not following anyone!'
      };
    }

    const unfollowed = [];
    const failed = [];
    const limit = config.limit || following.length;

    for (let i = 0; i < Math.min(following.length, limit); i++) {
      const user = following[i];
      
      updateProgress(`Unfollowing ${user.username} (${i + 1}/${Math.min(following.length, limit)})`);

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
        updateProgress(`Pausing for safety (${i + 1}/${Math.min(following.length, limit)} completed)...`);
        await browserAutomation.randomDelay(15000, 30000);
      }

      // Very long pause every 50 unfollows
      if ((i + 1) % 50 === 0) {
        updateProgress(`Extended pause (${i + 1}/${Math.min(following.length, limit)} completed)...`);
        await browserAutomation.randomDelay(60000, 120000); // 1-2 minutes
      }
    }

    return {
      success: true,
      unfollowed,
      failed,
      totalProcessed: unfollowed.length + failed.length
    };

  } finally {
    await page.close();
  }
}

module.exports = { unfollowEveryoneBrowser };
