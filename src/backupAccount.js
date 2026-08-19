// Copyright (c) 2024-2026 nich (@nichxbt). MIT License.
// Backup Account Data on X - by nichxbt
// https://github.com/nirholas/xactions
// Scrape and download your profile, tweets, likes, bookmarks, following/followers
// 1. Go to https://x.com/YOUR_USERNAME
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
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

  const backupData = {
    meta: {
      createdAt: new Date().toISOString(),
      source: 'XActions Backup Tool',
      version: '2.0.0',
      url: window.location.href,
    },
    profile: null,
    tweets: [],
    likes: [],
    bookmarks: [],
    following: [],
    followers: [],
  };

  const extractTweet = (el) => {
    const textEl = el.querySelector($tweetText);
    const linkEl = el.querySelector('a[href*="/status/"]');
    const timeEl = el.querySelector('time');
    return {
      text: textEl?.textContent || '',
      url: linkEl?.href || '',
      tweetId: linkEl?.href?.match(/status\/(\d+)/)?.[1] || '',
      timestamp: timeEl?.dateTime || '',
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

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`   ✅ Collected ${items.size} ${label}`);
    return [...items.values()];
  };

  const scrapeProfile = () => {
    const displayName = document.querySelector('[data-testid="UserName"]')?.textContent || '';
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    const headerImg = document.querySelector('a[href$="/header_photo"] img')?.src || '';
    const avatarImg = document.querySelector('[data-testid="UserAvatar-Container"] img')?.src || '';

    // Extract follower/following counts
    const links = document.querySelectorAll('a[href*="/follow"]');
    let followers = 0, following = 0;
    links.forEach(link => {
      const text = link.textContent;
      const count = parseInt(text.replace(/[^\d]/g, '')) || 0;
      if (link.href.includes('/followers')) followers = count;
      if (link.href.includes('/following')) following = count;
    });

    return {
      displayName,
      bio: bioEl?.textContent || '',
      headerImage: headerImg,
      avatarImage: avatarImg,
      followers,
      following,
      url: window.location.href,
    };
  };

  const run = async () => {
    console.log('💾 BACKUP ACCOUNT - XActions by nichxbt');
    console.log('ℹ️ This backs up visible data from the browser.\n');

    const pathname = window.location.pathname;
    const rawPathUsername = pathname.replace(/^\//, '').split('/')[0];
    const pathUsername = ['home', 'explore', 'notifications', 'messages', 'i'].includes(rawPathUsername) ? '' : rawPathUsername;
    // /i/bookmarks has no username in the URL — fall back to the nav bar's
    // own-profile link so the download filename and other-page guidance
    // below still resolve to the real handle.
    const navHandle = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href')?.replace(/^\//, '') || '';
    const username = pathUsername || navHandle;

    // Detect which section (if any) the CURRENT page matches, so a paste on
    // that page collects into the matching backupData key instead of always
    // falling through to the generic tweets collector regardless of page.
    const pageSection = pathname === '/i/bookmarks' ? 'bookmarks'
      : (username && pathname === `/${username}/likes`) ? 'likes'
      : (username && pathname === `/${username}/following`) ? 'following'
      : (username && pathname === `/${username}/followers`) ? 'followers'
      : null;

    if (CONFIG.sections.profile && !pageSection) {
      console.log('📋 Backing up profile...');
      backupData.profile = scrapeProfile();
      console.log(`   ✅ Profile saved`);
    }

    if (pageSection === 'bookmarks' && CONFIG.sections.bookmarks) {
      backupData.bookmarks = await scrollAndCollect($tweet, extractTweet, CONFIG.maxBookmarks, 'bookmarks');
    } else if (pageSection === 'likes' && CONFIG.sections.likes) {
      backupData.likes = await scrollAndCollect($tweet, extractTweet, CONFIG.maxLikes, 'likes');
    } else if (pageSection === 'following' && CONFIG.sections.following) {
      backupData.following = await scrollAndCollect($userCell, extractUser, CONFIG.maxFollowing, 'following');
    } else if (pageSection === 'followers' && CONFIG.sections.followers) {
      backupData.followers = await scrollAndCollect($userCell, extractUser, CONFIG.maxFollowers, 'followers');
    } else if (CONFIG.sections.tweets) {
      backupData.tweets = await scrollAndCollect($tweet, extractTweet, CONFIG.maxTweets, 'tweets');
    }

    // For sections this run didn't cover, tell the user where to run the
    // script next — each run downloads its own JSON, so backing up every
    // section means pasting the script once per page below.
    const remaining = [];
    if (CONFIG.sections.likes && pageSection !== 'likes') remaining.push({ path: `/${username}/likes`, key: 'likes' });
    if (CONFIG.sections.bookmarks && pageSection !== 'bookmarks') remaining.push({ path: `/i/bookmarks`, key: 'bookmarks' });
    if (CONFIG.sections.following && pageSection !== 'following') remaining.push({ path: `/${username}/following`, key: 'following' });
    if (CONFIG.sections.followers && pageSection !== 'followers') remaining.push({ path: `/${username}/followers`, key: 'followers' });

    if (remaining.length > 0) {
      console.log('\n⚠️ Remaining sections require page navigation.');
      console.log('💡 To backup the rest, run this script on each page:');
      remaining.forEach(s => {
        console.log(`   📍 ${s.key}: x.com${s.path}`);
      });
    }

    // Download what we have
    if (CONFIG.autoDownload) {
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-backup-${username}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('\n📥 Backup downloaded as JSON');
    }

    console.log('\n✅ Backup complete!');
    console.log(`   📊 Profile: ${backupData.profile ? 'Yes' : 'No'}`);
    console.log(`   📊 Tweets: ${backupData.tweets.length}`);
    console.log(`   📊 Likes: ${backupData.likes.length}`);
    console.log(`   📊 Bookmarks: ${backupData.bookmarks.length}`);
    console.log(`   📊 Following: ${backupData.following.length}`);
    console.log(`   📊 Followers: ${backupData.followers.length}`);
  };

  run();
})();
