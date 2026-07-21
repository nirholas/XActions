// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 💾 Full Account Backup
 * ============================================================
 * 
 * @name        backup-account.js
 * @description Comprehensive backup of your X/Twitter account data
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 WHAT THIS BACKS UP:
 * ============================================================
 * 
 * • Your tweets (from visible timeline)
 * • Your likes (from visible likes page)
 * • Your bookmarks
 * • Your following/followers lists
 * • Profile information
 * 
 * ⚠️ NOTE: This can only backup what's visible in the browser.
 *    For complete historical data, use Twitter's data export.
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Go to your profile: https://x.com/YOUR_USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Use the backup commands shown
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // How many items to collect per category
  maxTweets: 100,
  maxLikes: 100,
  maxBookmarks: 100,
  maxFollowing: 500,
  maxFollowers: 500,
  
  // Delay between scroll actions (ms)
  scrollDelay: 2000,
  
  // Auto-download backup when complete
  autoDownload: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function backupAccount() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $tweet = '[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $userCell = '[data-testid="UserCell"]';
  const $userName = '[data-testid="User-Name"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💾 FULL ACCOUNT BACKUP                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage for backup data
  const backupData = {
    meta: {
      createdAt: new Date().toISOString(),
      source: 'XActions Backup Tool',
      version: '1.0.0'
    },
    profile: null,
    tweets: [],
    likes: [],
    bookmarks: [],
    following: [],
    followers: []
  };
  
  // Helper to extract tweet data
  const extractTweetData = (tweetEl) => {
    const textEl = tweetEl.querySelector($tweetText);
    const timeEl = tweetEl.querySelector('time');
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const linkEl = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                   tweetEl.querySelector('a[href*="/status/"]');
    const userLink = tweetEl.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
                     tweetEl.querySelector('a[href^="/"]');

    return {
      text: textEl?.textContent || '',
      url: linkEl?.href || '',
      tweetId: linkEl?.href?.match(/status\/(\d+)/)?.[1] || '',
      timestamp: timeEl?.dateTime || '',
      username: userLink?.getAttribute('href')?.replace('/', '')?.split('/')[0] || ''
    };
  };
  
  // Helper to extract user data
  const extractUserData = (userEl) => {
    const nameEl = userEl.querySelector($userName);
    const linkEl = userEl.querySelector('a[href^="/"]');
    const bioEl = userEl.querySelector('[dir="auto"]:not([data-testid])');
    
    return {
      name: nameEl?.textContent?.split('@')[0]?.trim() || '',
      username: linkEl?.getAttribute('href')?.replace('/', '')?.split('/')[0] || '',
      bio: bioEl?.textContent || '',
      url: linkEl?.href || ''
    };
  };
  
  // Scroll and collect items
  const scrollAndCollect = async (selector, extractor, maxItems, itemName) => {
    const items = new Map();
    let lastCount = 0;
    let noNewItems = 0;
    
    console.log(`📥 Collecting ${itemName}...`);
    
    while (items.size < maxItems && noNewItems < 5) {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(el => {
        try {
          const data = extractor(el);
          const key = data.tweetId || data.username || data.url || JSON.stringify(data);
          if (key && !items.has(key)) {
            items.set(key, data);
          }
        } catch (e) {
          // Skip invalid elements
        }
      });
      
      if (items.size === lastCount) {
        noNewItems++;
      } else {
        noNewItems = 0;
        lastCount = items.size;
      }
      
      console.log(`   📊 ${items.size} ${itemName} collected...`);
      
      window.scrollBy(0, window.innerHeight);
      await sleep(CONFIG.scrollDelay);
    }
    
    return Array.from(items.values());
  };
  
  // Download backup file
  const downloadBackup = (data) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('📁 Backup file downloaded!');
  };
  
  // Create XActions backup interface
  window.XActions = window.XActions || {};
  window.XActions.Backup = {
    data: backupData,
    
    // Backup tweets from current page
    tweets: async () => {
      console.log('🐦 Backing up tweets...');
      console.log('📍 Make sure you are on your profile page (Posts tab)');
      await sleep(1000);
      backupData.tweets = await scrollAndCollect($tweet, extractTweetData, CONFIG.maxTweets, 'tweets');
      console.log(`✅ Collected ${backupData.tweets.length} tweets`);
      return backupData.tweets;
    },
    
    // Backup likes
    likes: async () => {
      console.log('❤️ Backing up likes...');
      console.log('📍 Navigate to your Likes tab first: https://x.com/YOUR_USERNAME/likes');
      await sleep(1000);
      backupData.likes = await scrollAndCollect($tweet, extractTweetData, CONFIG.maxLikes, 'likes');
      console.log(`✅ Collected ${backupData.likes.length} likes`);
      return backupData.likes;
    },
    
    // Backup bookmarks
    bookmarks: async () => {
      console.log('🔖 Backing up bookmarks...');
      console.log('📍 Navigate to Bookmarks: https://x.com/i/bookmarks');
      await sleep(1000);
      backupData.bookmarks = await scrollAndCollect($tweet, extractTweetData, CONFIG.maxBookmarks, 'bookmarks');
      console.log(`✅ Collected ${backupData.bookmarks.length} bookmarks`);
      return backupData.bookmarks;
    },
    
    // Backup following list
    following: async () => {
      console.log('👥 Backing up following list...');
      console.log('📍 Navigate to Following: https://x.com/YOUR_USERNAME/following');
      await sleep(1000);
      backupData.following = await scrollAndCollect($userCell, extractUserData, CONFIG.maxFollowing, 'following');
      console.log(`✅ Collected ${backupData.following.length} following`);
      return backupData.following;
    },
    
    // Backup followers list
    followers: async () => {
      console.log('👥 Backing up followers list...');
      console.log('📍 Navigate to Followers: https://x.com/YOUR_USERNAME/followers');
      await sleep(1000);
      backupData.followers = await scrollAndCollect($userCell, extractUserData, CONFIG.maxFollowers, 'followers');
      console.log(`✅ Collected ${backupData.followers.length} followers`);
      return backupData.followers;
    },
    
    // Get current profile info
    profile: () => {
      const name = document.querySelector('[data-testid="UserName"]')?.textContent || '';
      const bio = document.querySelector('[data-testid="UserDescription"]')?.textContent || '';
      const location = document.querySelector('[data-testid="UserLocation"]')?.textContent || '';
      const website = document.querySelector('[data-testid="UserUrl"]')?.textContent || '';
      const joinDate = document.querySelector('[data-testid="UserJoinDate"]')?.textContent || '';
      
      backupData.profile = {
        name,
        bio,
        location,
        website,
        joinDate,
        capturedAt: new Date().toISOString()
      };
      
      console.log('📋 Profile info captured:', backupData.profile);
      return backupData.profile;
    },
    
    // Download current backup
    download: () => {
      backupData.meta.downloadedAt = new Date().toISOString();
      downloadBackup(backupData);
    },
    
    // Show summary
    summary: () => {
      console.log('');
      console.log('📊 BACKUP SUMMARY:');
      console.log(`   🐦 Tweets: ${backupData.tweets.length}`);
      console.log(`   ❤️ Likes: ${backupData.likes.length}`);
      console.log(`   🔖 Bookmarks: ${backupData.bookmarks.length}`);
      console.log(`   👥 Following: ${backupData.following.length}`);
      console.log(`   👥 Followers: ${backupData.followers.length}`);
      console.log(`   📋 Profile: ${backupData.profile ? 'Yes' : 'No'}`);
      console.log('');
    },
    
    // Full backup (run all)
    full: async () => {
      console.log('🚀 Starting full backup...');
      console.log('');
      console.log('⚠️ This is a guided process. Follow the instructions.');
      console.log('');
      
      // Profile
      window.XActions.Backup.profile();
      
      console.log('');
      console.log('📋 NEXT STEPS (run each command after navigating):');
      console.log('');
      console.log('1. Stay on profile → XActions.Backup.tweets()');
      console.log('2. Go to Likes tab → XActions.Backup.likes()');
      console.log('3. Go to Bookmarks → XActions.Backup.bookmarks()');
      console.log('4. Go to Following → XActions.Backup.following()');
      console.log('5. Go to Followers → XActions.Backup.followers()');
      console.log('6. When done → XActions.Backup.download()');
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 BACKUP COMMANDS:');
      console.log('');
      console.log('   XActions.Backup.full()      - Start guided backup');
      console.log('   XActions.Backup.tweets()    - Backup tweets');
      console.log('   XActions.Backup.likes()     - Backup likes');
      console.log('   XActions.Backup.bookmarks() - Backup bookmarks');
      console.log('   XActions.Backup.following() - Backup following');
      console.log('   XActions.Backup.followers() - Backup followers');
      console.log('   XActions.Backup.profile()   - Capture profile info');
      console.log('   XActions.Backup.summary()   - Show backup summary');
      console.log('   XActions.Backup.download()  - Download backup file');
      console.log('');
    }
  };
  
  console.log('✅ Account Backup Tool loaded!');
  console.log('');
  console.log('📋 QUICK START:');
  console.log('   Run XActions.Backup.full() for guided backup');
  console.log('   Run XActions.Backup.help() for all commands');
  console.log('');
})();
