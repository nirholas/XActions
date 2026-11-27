// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Backup Account Data on X - by nichxbt
 * https://github.com/nirholas/xactions
 *
 * @name        backupAccount.js
 * @title       Backup Account
 * @description Back up your visible profile, tweets, likes, bookmarks, following and followers as a JSON download.
 * @category    scrape
 * @page        x.com/<you> or x.com/<you>/likes or x.com/i/bookmarks or x.com/<you>/following or x.com/<you>/followers
 * @writes      false
 * @aliases     scripts/backupAccount.js, scripts/twitter/backup-account.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.1.0
 * @date        2026-11-26
 *
 * Scrape and download your profile, tweets, likes, bookmarks, following/followers
 * 1. Go to https://x.com/YOUR_USERNAME
 * 2. Open the Developer Console (F12)
 * 3. Paste browser/backupAccount.js into the Developer Console and run it
 *
 * The run backs up the profile and tweets on the profile page and downloads them.
 * For the other sections, navigate and use the console commands:
 *   XActions.Backup.likes()      on x.com/YOUR_USERNAME/likes
 *   XActions.Backup.bookmarks()  on x.com/i/bookmarks
 *   XActions.Backup.following()  on x.com/YOUR_USERNAME/following
 *   XActions.Backup.followers()  on x.com/YOUR_USERNAME/followers
 *   XActions.Backup.download()   download everything collected so far
 *   XActions.Backup.help()       list every command
 * The last backup object is also kept on window.__xactions_backup.
 *
 * Last Updated: 26 November 2026
 */
(() => {
  const CONFIG = {
    maxTweets: 100,
    maxLikes: 100,
    maxBookmarks: 100,
    maxFollowing: 200,
    maxFollowers: 200,
    scrollDelay: 2000,
    autoDownload: true,
    // Which sections to backup
    sections: {
      profile: true,
      tweets: true,
      likes: true,
      bookmarks: true,
      following: true,
      followers: true,
    },
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $userCell = '[data-testid="UserCell"]';
  const $userName = '[data-testid="User-Name"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const RESERVED_PATHS = ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'];

  const backupData = {
    meta: {
      createdAt: new Date().toISOString(),
      source: 'XActions Backup Tool',
      version: '2.1.0',
      url: window.location.href,
    },
    username: null,
    profile: null,
    tweets: [],
    likes: [],
    bookmarks: [],
    following: [],
    followers: [],
  };

  const parseCount = (text) => {
    if (!text) return 0;
    const clean = text.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    if (clean.includes('K')) return Math.round(num * 1000);
    if (clean.includes('M')) return Math.round(num * 1000000);
    return isNaN(num) ? 0 : num;
  };

  const extractTweet = (el) => {
    const textEl = el.querySelector($tweetText);
    const timeEl = el.querySelector('time');
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const linkEl = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                   el.querySelector('a[href*="/status/"]');
    const userLink = el.querySelector('[data-testid="User-Name"] a[href^="/"]');
    const images = [...el.querySelectorAll('[data-testid="tweetPhoto"] img')].map(img => img.src);
    return {
      text: textEl?.textContent || '',
      url: linkEl?.href || '',
      tweetId: linkEl?.href?.match(/status\/(\d+)/)?.[1] || '',
      timestamp: timeEl?.dateTime || '',
      username: userLink?.getAttribute('href')?.replace('/', '')?.split('/')[0] || '',
      likes: el.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent || '0',
      reposts: el.querySelector('[data-testid="retweet"] span, [data-testid="unretweet"] span')?.textContent || '0',
      replies: el.querySelector('[data-testid="reply"] span')?.textContent || '0',
      media: {
        images,
        hasVideo: !!el.querySelector('video'),
      },
    };
  };

  const extractUser = (el) => {
    const nameEl = el.querySelector($userName);
    const linkEl = el.querySelector('a[href^="/"]');
    const bioEl = el.querySelector('[dir="auto"]:not([data-testid])');
    return {
      name: nameEl?.textContent?.split('@')[0]?.trim() || '',
      username: linkEl?.href?.replace(/^.*x\.com\//, '').split('/')[0] || '',
      bio: bioEl?.textContent || '',
      url: linkEl?.href || '',
    };
  };

  const scrollAndCollect = async (selector, extractor, maxItems, label) => {
    const items = new Map();
    let noNewItems = 0;

    console.log(`📥 Collecting ${label}...`);

    while (items.size < maxItems && noNewItems < 5) {
      const els = document.querySelectorAll(selector);
      const prevSize = items.size;

      els.forEach(el => {
        try {
          const data = extractor(el);
          const key = data.tweetId || data.username || data.url || JSON.stringify(data);
          if (key && !items.has(key)) items.set(key, data);
        } catch {}
      });

      if (items.size === prevSize) noNewItems++;
      else noNewItems = 0;

      if (items.size > prevSize && Math.floor(items.size / 20) > Math.floor(prevSize / 20)) {
        console.log(`   📊 ${items.size} ${label} collected...`);
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`   ✅ Collected ${items.size} ${label}`);
    return [...items.values()];
  };

  const scrapeProfile = () => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
    const displayName = document.querySelector('[data-testid="UserName"]')?.textContent || '';
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    const headerImg = document.querySelector('a[href$="/header_photo"] img')?.src || '';
    const avatarImg = document.querySelector('[data-testid="UserAvatar-Container"] img')?.src || '';

    // Extract follower/following counts (handles 1.2K / 3.4M)
    let followers = 0, following = 0;
    const followersLink = document.querySelector('a[href$="/followers"], a[href$="/verified_followers"]');
    const followingLink = document.querySelector('a[href$="/following"]');
    if (followersLink) followers = parseCount(followersLink.querySelector('span')?.textContent || followersLink.textContent);
    if (followingLink) following = parseCount(followingLink.querySelector('span')?.textContent || followingLink.textContent);

    return {
      displayName,
      bio: bioEl?.textContent || '',
      location: getText('[data-testid="UserLocation"]'),
      website: getText('[data-testid="UserUrl"]'),
      joinDate: getText('[data-testid="UserJoinDate"]'),
      isVerified: !!document.querySelector('[data-testid="UserName"] [data-testid="icon-verified"]'),
      headerImage: headerImg,
      avatarImage: avatarImg,
      followers,
      following,
      url: window.location.href,
      capturedAt: new Date().toISOString(),
    };
  };

  const currentUsername = () => {
    const m = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    const name = m ? m[1] : null;
    return name && !RESERVED_PATHS.includes(name) ? name : null;
  };

  const downloadBackup = () => {
    backupData.meta.downloadedAt = new Date().toISOString();
    backupData.stats = {
      tweetCount: backupData.tweets.length,
      likeCount: backupData.likes.length,
      bookmarkCount: backupData.bookmarks.length,
      followingCount: backupData.following.length,
      followerCount: backupData.followers.length,
      hasProfile: !!backupData.profile?.displayName,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions-backup-${backupData.username || 'account'}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.__xactions_backup = backupData;
    console.log('\n📥 Backup downloaded as JSON');
  };

  const summary = () => {
    console.log(`   📊 Profile: ${backupData.profile ? 'Yes' : 'No'}`);
    console.log(`   📊 Tweets: ${backupData.tweets.length}`);
    console.log(`   📊 Likes: ${backupData.likes.length}`);
    console.log(`   📊 Bookmarks: ${backupData.bookmarks.length}`);
    console.log(`   📊 Following: ${backupData.following.length}`);
    console.log(`   📊 Followers: ${backupData.followers.length}`);
  };

  const collectSection = async (key, selector, extractor, max, hint) => {
    console.log(`📍 ${hint}`);
    await sleep(1000);
    backupData[key] = await scrollAndCollect(selector, extractor, max, key);
    if (!backupData.username) backupData.username = currentUsername();
    window.__xactions_backup = backupData;
    return backupData[key];
  };

  const help = () => {
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
  };

  // Console API for the sections that need page navigation
  window.XActions = window.XActions || {};
  window.XActions.Backup = {
    data: backupData,
    tweets: () => collectSection('tweets', $tweet, extractTweet, CONFIG.maxTweets, 'Make sure you are on your profile page (Posts tab)'),
    likes: () => collectSection('likes', $tweet, extractTweet, CONFIG.maxLikes, 'Navigate to your Likes tab first: https://x.com/YOUR_USERNAME/likes'),
    bookmarks: () => collectSection('bookmarks', $tweet, extractTweet, CONFIG.maxBookmarks, 'Navigate to Bookmarks: https://x.com/i/bookmarks'),
    following: () => collectSection('following', $userCell, extractUser, CONFIG.maxFollowing, 'Navigate to Following: https://x.com/YOUR_USERNAME/following'),
    followers: () => collectSection('followers', $userCell, extractUser, CONFIG.maxFollowers, 'Navigate to Followers: https://x.com/YOUR_USERNAME/followers'),
    profile: () => {
      backupData.profile = scrapeProfile();
      if (!backupData.username) backupData.username = currentUsername();
      console.log('📋 Profile info captured:', backupData.profile);
      return backupData.profile;
    },
    download: downloadBackup,
    summary: () => {
      console.log('');
      console.log('📊 BACKUP SUMMARY:');
      summary();
      console.log('');
    },
    full: async () => {
      console.log('🚀 Starting full backup...');
      console.log('⚠️ This is a guided process. Follow the instructions.');
      window.XActions.Backup.profile();
      console.log('');
      console.log('📋 NEXT STEPS (run each command after navigating):');
      console.log('');
      console.log('1. Stay on profile: XActions.Backup.tweets()');
      console.log('2. Go to Likes tab: XActions.Backup.likes()');
      console.log('3. Go to Bookmarks: XActions.Backup.bookmarks()');
      console.log('4. Go to Following: XActions.Backup.following()');
      console.log('5. Go to Followers: XActions.Backup.followers()');
      console.log('6. When done: XActions.Backup.download()');
      console.log('');
    },
    help,
  };

  const run = async () => {
    console.log('💾 BACKUP ACCOUNT - XActions by nichxbt');
    console.log('ℹ️ This backs up visible data from the browser.\n');

    const username = currentUsername();
    if (!username) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      console.log('💡 On other pages use the console commands instead:');
      help();
      return;
    }
    backupData.username = username;

    if (CONFIG.sections.profile) {
      console.log('📋 Backing up profile...');
      backupData.profile = scrapeProfile();
      console.log(`   ✅ Profile saved`);
    }

    if (CONFIG.sections.tweets) {
      backupData.tweets = await scrollAndCollect($tweet, extractTweet, CONFIG.maxTweets, 'tweets');
    }

    // For other sections, we need to navigate
    const backupSections = [];
    if (CONFIG.sections.likes) backupSections.push({ path: `/${username}/likes`, key: 'likes', cmd: 'XActions.Backup.likes()' });
    if (CONFIG.sections.bookmarks) backupSections.push({ path: '/i/bookmarks', key: 'bookmarks', cmd: 'XActions.Backup.bookmarks()' });
    if (CONFIG.sections.following) backupSections.push({ path: `/${username}/following`, key: 'following', cmd: 'XActions.Backup.following()' });
    if (CONFIG.sections.followers) backupSections.push({ path: `/${username}/followers`, key: 'followers', cmd: 'XActions.Backup.followers()' });

    if (backupSections.length > 0) {
      console.log('\n⚠️ Remaining sections require page navigation.');
      console.log('💡 Click through to each page in this tab (a reload clears this script) and run its command, then XActions.Backup.download():');
      backupSections.forEach(s => {
        console.log(`   📍 ${s.key}: x.com${s.path}  ->  ${s.cmd}`);
      });
    }

    window.__xactions_backup = backupData;

    // Download what we have
    if (CONFIG.autoDownload) {
      downloadBackup();
    }

    console.log('\n✅ Backup complete!');
    summary();
    console.log('💡 Access data: window.__xactions_backup');
  };

  run();
})();
