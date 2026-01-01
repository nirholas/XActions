const browserAutomation = require('../../browserAutomation');

async function detectUnfollowersBrowser(userId, config, updateProgress) {
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

    updateProgress(`Analysis complete!`);

    return {
      success: true,
      nonFollowers: nonFollowers.map(u => ({
        username: u.username,
        displayName: u.displayName
      })),
      stats: {
        following: following.length,
        followers: followers.length,
        nonFollowers: nonFollowers.length,
        followBackRatio: ((followers.length / following.length) * 100).toFixed(1) + '%'
      }
    };

  } finally {
    await page.close();
  }
}

module.exports = { detectUnfollowersBrowser };
