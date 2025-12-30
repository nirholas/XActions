// NewFollowersAlert.js — Get notified when you gain new followers
// https://github.com/nirholas/UnfollowX
//
// HOW TO USE:
// 1. Go to https://twitter.com/YOUR_USERNAME/followers
// 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
// 3. Paste this script and press Enter
// 4. Run periodically to see your new followers!

(() => {
  const STORAGE_KEY = 'unfollowx_new_followers';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please go to your FOLLOWERS page first!');
    return;
  }

  const username = window.location.pathname.split('/')[1];

  const scrapeFollowers = async () => {
    const followers = new Map(); // username -> display name
    let previousSize = 0;
    let retries = 0;

    console.log('🔍 Scanning followers...');

    while (retries < 5) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);

      document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
        const link = cell.querySelector('a[href^="/"]');
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        
        if (link) {
          const user = link.getAttribute('href').replace('/', '').split('/')[0].toLowerCase();
          const displayName = nameEl?.textContent || user;
          if (user && user !== username.toLowerCase()) {
            followers.set(user, displayName);
          }
        }
      });

      if (followers.size === previousSize) retries++;
      else { retries = 0; previousSize = followers.size; }
      
      console.log(`   Found ${followers.size} followers...`);
    }

    return followers;
  };

  const loadPrevious = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };

  const saveFollowers = (followersMap) => {
    const data = {
      username,
      followers: Object.fromEntries(followersMap),
      timestamp: new Date().toISOString(),
      count: followersMap.size
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  };

  const run = async () => {
    console.log(`\n🎉 UnfollowX — New Followers Tracker for @${username}\n`);

    const currentFollowers = await scrapeFollowers();
    console.log(`\n✅ Total followers: ${currentFollowers.size}\n`);

    const previous = loadPrevious();

    if (previous && previous.username.toLowerCase() === username.toLowerCase()) {
      const prevUsers = new Set(Object.keys(previous.followers));
      const newFollowers = [];

      currentFollowers.forEach((displayName, user) => {
        if (!prevUsers.has(user)) {
          newFollowers.push({ user, displayName });
        }
      });

      const prevDate = new Date(previous.timestamp).toLocaleString();
      console.log(`📊 Comparing with snapshot from ${prevDate}`);
      console.log(`   Previous: ${previous.count} | Current: ${currentFollowers.size}`);
      console.log(`   Net change: ${currentFollowers.size - previous.count > 0 ? '+' : ''}${currentFollowers.size - previous.count}\n`);

      if (newFollowers.length > 0) {
        console.log(`🎉 ${newFollowers.length} NEW FOLLOWERS:\n`);
        newFollowers.forEach((f, i) => {
          console.log(`   ${i + 1}. ${f.displayName} (@${f.user})`);
          console.log(`      https://twitter.com/${f.user}`);
        });

        // Create welcome message template
        console.log('\n📝 Quick welcome template (copy & customize):');
        console.log('─'.repeat(50));
        newFollowers.slice(0, 5).forEach(f => {
          console.log(`Hey @${f.user}, thanks for the follow! 🙏`);
        });
        if (newFollowers.length > 5) {
          console.log(`... and ${newFollowers.length - 5} more!`);
        }
        console.log('─'.repeat(50));
      } else {
        console.log('📭 No new followers since last check.');
      }

      // Check for unfollowers too
      const currentUsers = new Set(currentFollowers.keys());
      const lostFollowers = Object.keys(previous.followers).filter(u => !currentUsers.has(u));
      
      if (lostFollowers.length > 0) {
        console.log(`\n👋 ${lostFollowers.length} people unfollowed you:`);
        lostFollowers.forEach(u => console.log(`   @${u}`));
      }
    } else {
      console.log('📸 First scan! Saving your current followers...');
      console.log('   Run this script again later to see new followers!');
    }

    saveFollowers(currentFollowers);
    console.log('\n💾 Snapshot saved! Run again anytime to track changes.\n');
  };

  run();
})();
