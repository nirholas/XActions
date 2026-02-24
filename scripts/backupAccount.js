// scripts/backupAccount.js
// Browser console script for backing up your X/Twitter profile and tweets as JSON
// Paste in DevTools console on x.com/YOUR_USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxTweets: 100,           // Max tweets to scrape
    scrollDelay: 1500,        // Delay between scrolls (ms)
    autoDownload: true,       // Download backup JSON automatically
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const parseCount = (text) => {
    if (!text) return 0;
    const clean = text.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    if (clean.includes('K')) return Math.round(num * 1000);
    if (clean.includes('M')) return Math.round(num * 1000000);
    return isNaN(num) ? 0 : num;
  };

  const scrapeProfile = () => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    return {
      displayName: document.querySelector('[data-testid="UserName"]')?.querySelector('span')?.textContent?.trim() || null,
      bio: getText('[data-testid="UserDescription"]'),
      location: getText('[data-testid="UserLocation"]'),
      website: getText('[data-testid="UserUrl"]'),
      joinDate: getText('[data-testid="UserJoinDate"]'),
      isVerified: !!document.querySelector('[data-testid="icon-verified"]'),
      followers: parseCount(document.querySelector('a[href$="/followers"] span')?.textContent),
      following: parseCount(document.querySelector('a[href$="/following"] span')?.textContent),
      avatarUrl: document.querySelector('[data-testid="UserAvatar-Container"] img')?.src || null,
      headerUrl: document.querySelector('a[href$="/header_photo"] img')?.src || null,
    };
  };

  const extractTweet = (el) => {
    const textEl = el.querySelector('[data-testid="tweetText"]');
    const linkEl = el.querySelector('a[href*="/status/"]');
    const timeEl = el.querySelector('time');
    const images = [...el.querySelectorAll('[data-testid="tweetPhoto"] img')].map(img => img.src);
    const videoEl = el.querySelector('video');

    return {
      text: textEl?.textContent || '',
      url: linkEl?.href || '',
      tweetId: linkEl?.href?.match(/status\/(\d+)/)?.[1] || '',
      timestamp: timeEl?.dateTime || '',
      likes: el.querySelector('[data-testid="like"] span')?.textContent || '0',
      reposts: el.querySelector('[data-testid="retweet"] span')?.textContent || '0',
      replies: el.querySelector('[data-testid="reply"] span')?.textContent || '0',
      media: {
        images,
        hasVideo: !!videoEl,
      },
    };
  };

  const run = async () => {
    console.log('💾 BACKUP ACCOUNT — XActions by nichxbt');
    console.log('━'.repeat(45));

    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    const username = pathMatch ? pathMatch[1] : null;

    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(username)) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      return;
    }

    console.log(`\n👤 Backing up @${username}...\n`);

    // Scrape profile info
    console.log('📋 Scraping profile...');
    const profile = scrapeProfile();
    console.log('   ✅ Profile scraped');

    // Scroll and collect tweets
    console.log(`📥 Collecting tweets (max ${CONFIG.maxTweets})...`);
    const tweets = new Map();
    let noNewCount = 0;

    while (tweets.size < CONFIG.maxTweets && noNewCount < 5) {
      const els = document.querySelectorAll('article[data-testid="tweet"]');
      const prevSize = tweets.size;

      els.forEach(el => {
        try {
          const tweet = extractTweet(el);
          if (tweet.tweetId && !tweets.has(tweet.tweetId)) {
            tweets.set(tweet.tweetId, tweet);
          }
        } catch {}
      });

      if (tweets.size === prevSize) noNewCount++;
      else noNewCount = 0;

      if (tweets.size < CONFIG.maxTweets) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
      }

      if (tweets.size % 20 === 0 && tweets.size > 0) {
        console.log(`   📊 ${tweets.size} tweets collected...`);
      }
    }

    console.log(`   ✅ ${tweets.size} tweets collected`);

    // Build backup object
    const backup = {
      meta: {
        tool: 'XActions Backup',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        url: window.location.href,
      },
      username,
      profile,
      tweets: [...tweets.values()],
      stats: {
        tweetCount: tweets.size,
        hasProfile: !!profile.displayName,
      },
    };

    console.log('\n' + '━'.repeat(45));
    console.log('✅ Backup complete!');
    console.log(`   📊 Profile: ${backup.stats.hasProfile ? 'Yes' : 'No'}`);
    console.log(`   📊 Tweets: ${backup.stats.tweetCount}`);

    if (CONFIG.autoDownload) {
      download(backup, `xactions-backup-${username}-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('📥 Backup downloaded as JSON');
    }

    window.__xactions_backup = backup;
    console.log('💡 Access data: window.__xactions_backup');
    console.log('');
  };

  run();
})();
