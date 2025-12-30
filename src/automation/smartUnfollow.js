// UnfollowX Automation - Smart Unfollow (Time-Based)
// https://github.com/nirholas/UnfollowX
//
// REQUIRES: Paste core.js first!
//
// Unfollows users who didn't follow you back within X days.
// Works with the keywordFollow.js tracking data.
//
// HOW TO USE:
// 1. Go to twitter.com/YOUR_USERNAME/following
// 2. Paste core.js, then paste this script
// 3. Configure options below and run!

(() => {
  if (!window.UnfollowX?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, rateLimit, SELECTORS } = window.UnfollowX.Core;

  // ============================================
  // CONFIGURATION
  // ============================================
  const OPTIONS = {
    // Time settings
    DAYS_TO_WAIT: 3,              // Unfollow if not followed back within X days
    
    // Limits
    MAX_UNFOLLOWS: 50,            // Max unfollows per session
    
    // Whitelist (never unfollow these)
    WHITELIST: [
      // 'username1',
      // 'username2',
    ],
    
    // Behavior
    DRY_RUN: false,               // Set to true to preview without actually unfollowing
    ONLY_TRACKED: true,           // Only unfollow users we previously tracked from keywordFollow
    
    // Timing
    DELAY_BETWEEN_UNFOLLOWS: 2000,
  };

  // ============================================
  // STATE
  // ============================================
  let unfollowCount = 0;
  const followedUsers = new Map(Object.entries(storage.get('followed_users') || {}));
  const unfollowedLog = [];

  // ============================================
  // HELPERS
  // ============================================
  const isExpired = (followedAt) => {
    const daysAgo = (Date.now() - followedAt) / (1000 * 60 * 60 * 24);
    return daysAgo >= OPTIONS.DAYS_TO_WAIT;
  };

  const isWhitelisted = (username) => {
    return OPTIONS.WHITELIST.some(w => w.toLowerCase() === username.toLowerCase());
  };

  const updateUserRecord = (username, updates) => {
    const user = followedUsers.get(username.toLowerCase()) || {};
    Object.assign(user, updates);
    followedUsers.set(username.toLowerCase(), user);
    storage.set('followed_users', Object.fromEntries(followedUsers));
  };

  // ============================================
  // SCRAPE CURRENT FOLLOWERS
  // ============================================
  const scrapeFollowers = async () => {
    log('Scraping your current followers to check who follows back...', 'action');
    
    // Navigate to followers if not there
    const username = window.location.pathname.split('/')[1];
    const followersUrl = `https://twitter.com/${username}/followers`;
    
    if (!window.location.href.includes('/followers')) {
      window.open(followersUrl, '_blank');
      log('Opened followers page in new tab. Run the scraper there, then come back.', 'warning');
      return new Set();
    }

    const followers = new Set();
    let prevSize = 0;
    let retries = 0;

    while (retries < 5) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);

      document.querySelectorAll(SELECTORS.userCell).forEach(cell => {
        const link = cell.querySelector('a[href^="/"]');
        if (link) {
          const user = link.getAttribute('href').replace('/', '').toLowerCase();
          if (user) followers.add(user);
        }
      });

      if (followers.size === prevSize) retries++;
      else { retries = 0; prevSize = followers.size; }
    }

    log(`Found ${followers.size} followers`, 'success');
    return followers;
  };

  // ============================================
  // FIND NON-FOLLOWERS
  // ============================================
  const findNonFollowers = (currentFollowers) => {
    const nonFollowers = [];

    for (const [username, data] of followedUsers) {
      // Skip if whitelisted
      if (isWhitelisted(username)) {
        log(`Skipping whitelisted: @${username}`, 'info');
        continue;
      }

      // Skip if not expired yet
      if (!isExpired(data.followedAt)) {
        const daysLeft = OPTIONS.DAYS_TO_WAIT - ((Date.now() - data.followedAt) / (1000 * 60 * 60 * 24));
        log(`@${username} - ${daysLeft.toFixed(1)} days left to follow back`, 'info');
        continue;
      }

      // Check if they followed back
      if (currentFollowers.has(username)) {
        updateUserRecord(username, { followedBack: true, checkedAt: Date.now() });
        log(`@${username} followed back! ✅`, 'success');
        continue;
      }

      // They didn't follow back in time
      nonFollowers.push(username);
    }

    return nonFollowers;
  };

  // ============================================
  // UNFOLLOW ON FOLLOWING PAGE
  // ============================================
  const unfollowFromPage = async (targetUsers) => {
    log(`Looking for ${targetUsers.length} users to unfollow...`, 'action');
    
    const targetSet = new Set(targetUsers.map(u => u.toLowerCase()));
    let scrolls = 0;
    const maxScrolls = 100;

    while (unfollowCount < OPTIONS.MAX_UNFOLLOWS && 
           unfollowCount < targetUsers.length &&
           scrolls < maxScrolls) {
      
      const userCells = document.querySelectorAll(SELECTORS.userCell);
      
      for (const cell of userCells) {
        if (unfollowCount >= OPTIONS.MAX_UNFOLLOWS) break;

        const link = cell.querySelector('a[href^="/"]');
        if (!link) continue;
        
        const username = link.getAttribute('href').replace('/', '').toLowerCase();
        if (!targetSet.has(username)) continue;
        if (unfollowedLog.includes(username)) continue;

        const unfollowBtn = cell.querySelector(SELECTORS.unfollowButton);
        if (!unfollowBtn) continue;

        log(`Unfollowing @${username} (didn't follow back in ${OPTIONS.DAYS_TO_WAIT} days)`, 'action');

        if (!OPTIONS.DRY_RUN) {
          await clickElement(unfollowBtn);
          await sleep(500);
          
          const confirmBtn = await waitForElement(SELECTORS.confirmButton, 3000);
          if (confirmBtn) {
            await clickElement(confirmBtn);
          }
          
          // Remove from tracked
          followedUsers.delete(username);
          storage.set('followed_users', Object.fromEntries(followedUsers));
        }

        unfollowCount++;
        unfollowedLog.push(username);
        rateLimit.increment('unfollow', 'day');
        
        await randomDelay(OPTIONS.DELAY_BETWEEN_UNFOLLOWS, OPTIONS.DELAY_BETWEEN_UNFOLLOWS * 1.5);
      }

      scrollBy(600);
      scrolls++;
      await sleep(1500);
    }
  };

  // ============================================
  // MAIN RUN
  // ============================================
  const run = async () => {
    log('🧹 Starting Smart Unfollow...', 'info');
    log(`Wait period: ${OPTIONS.DAYS_TO_WAIT} days`, 'info');
    log(`Tracking ${followedUsers.size} previously followed users`, 'info');
    log(`Dry run: ${OPTIONS.DRY_RUN}`, 'info');

    if (followedUsers.size === 0 && OPTIONS.ONLY_TRACKED) {
      log('No tracked users found. Run keywordFollow.js first to track who you follow.', 'warning');
      log('Or set ONLY_TRACKED: false to unfollow any non-follower.', 'info');
      return;
    }

    // First, get current followers to see who followed back
    const path = window.location.pathname;
    
    if (path.includes('/followers')) {
      // We're on followers page - scrape and store
      const followers = await scrapeFollowers();
      storage.set('my_followers', Array.from(followers));
      log('Followers scraped and saved! Now go to your /following page and run again.', 'success');
      return;
    }
    
    if (path.includes('/following')) {
      // We're on following page - do the unfollowing
      const savedFollowers = new Set(storage.get('my_followers') || []);
      
      if (savedFollowers.size === 0) {
        log('No followers data. Go to your /followers page first and run this script to scrape.', 'warning');
        return;
      }

      log(`Loaded ${savedFollowers.size} followers from previous scrape`, 'info');
      
      const nonFollowers = findNonFollowers(savedFollowers);
      log(`Found ${nonFollowers.length} non-followers past the ${OPTIONS.DAYS_TO_WAIT}-day threshold`, 'info');

      if (nonFollowers.length === 0) {
        log('No one to unfollow! Everyone either followed back or is still in grace period.', 'success');
        return;
      }

      await unfollowFromPage(nonFollowers);
      
      log(`\n✅ Done! Unfollowed ${unfollowCount} users.`, 'success');
      if (OPTIONS.DRY_RUN) {
        log('(Dry run - no actual unfollows performed)', 'warning');
      }
    } else {
      log('Please navigate to either:', 'warning');
      log('  1. /followers - to scrape who follows you', 'info');
      log('  2. /following - to unfollow non-followers', 'info');
    }
  };

  run();

  window.stopSmartUnfollow = () => {
    OPTIONS.MAX_UNFOLLOWS = 0;
    log('Stopping...', 'warning');
  };
})();
