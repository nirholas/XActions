// DetectUnfollowers.js — Find out who unfollowed you on X (Twitter)
// https://github.com/nirholas/UnfollowX
//
// HOW TO USE:
// 1. Go to https://twitter.com/YOUR_USERNAME/followers
// 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
// 3. Paste this script and press Enter
// 4. The script will scan your followers and save them
// 5. Run again later to see who unfollowed you!
//
// Data is stored in your browser's localStorage, so it persists between sessions.

(() => {
  const STORAGE_KEY = 'unfollowx_my_followers';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Check we're on the right page
  const isFollowersPage = window.location.pathname.includes('/followers');
  if (!isFollowersPage) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: https://twitter.com/YOUR_USERNAME/followers');
    return;
  }

  const getCurrentUsername = () => {
    const match = window.location.pathname.match(/^\/([^/]+)\/followers/);
    return match ? match[1] : 'unknown';
  };

  const scrapeFollowers = async () => {
    const followers = new Set();
    let previousSize = 0;
    let retries = 0;
    const maxRetries = 5;

    console.log('🔍 Scanning your followers...');

    while (retries < maxRetries) {
      // Scroll to load more
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);

      // Find all user cells and extract usernames
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      userCells.forEach(cell => {
        const usernameEl = cell.querySelector('a[href^="/"]');
        if (usernameEl) {
          const href = usernameEl.getAttribute('href');
          const username = href.replace('/', '').toLowerCase();
          if (username && !username.includes('/')) {
            followers.add(username);
          }
        }
      });

      console.log(`   Found ${followers.size} followers so far...`);

      if (followers.size === previousSize) {
        retries++;
      } else {
        retries = 0;
        previousSize = followers.size;
      }
    }

    return Array.from(followers);
  };

  const loadPreviousFollowers = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not load previous data:', e);
    }
    return null;
  };

  const saveFollowers = (followers, username) => {
    const data = {
      username,
      followers,
      timestamp: new Date().toISOString(),
      count: followers.length
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  };

  const compareFollowers = (previous, current) => {
    const prevSet = new Set(previous.map(f => f.toLowerCase()));
    const currSet = new Set(current.map(f => f.toLowerCase()));

    const unfollowed = previous.filter(f => !currSet.has(f.toLowerCase()));
    const newFollowers = current.filter(f => !prevSet.has(f.toLowerCase()));

    return { unfollowed, newFollowers };
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  const run = async () => {
    const username = getCurrentUsername();
    console.log(`\n🐦 UnfollowX Detector — Monitoring @${username}\n`);

    // Scrape current followers
    const currentFollowers = await scrapeFollowers();
    console.log(`\n✅ Found ${currentFollowers.length} total followers\n`);

    // Check for previous data
    const previousData = loadPreviousFollowers();

    if (previousData && previousData.username === username) {
      console.log(`📊 Comparing with snapshot from ${formatDate(previousData.timestamp)}`);
      console.log(`   Previous count: ${previousData.count}`);
      console.log(`   Current count: ${currentFollowers.length}`);
      console.log('');

      const { unfollowed, newFollowers } = compareFollowers(previousData.followers, currentFollowers);

      if (unfollowed.length > 0) {
        console.log(`\n🚨 ${unfollowed.length} PEOPLE UNFOLLOWED YOU:\n`);
        unfollowed.forEach((u, i) => {
          console.log(`   ${i + 1}. @${u} — https://twitter.com/${u}`);
        });
      } else {
        console.log('✨ No one unfollowed you since last check!');
      }

      if (newFollowers.length > 0) {
        console.log(`\n🎉 ${newFollowers.length} NEW FOLLOWERS:\n`);
        newFollowers.forEach((u, i) => {
          console.log(`   ${i + 1}. @${u} — https://twitter.com/${u}`);
        });
      }

      // Offer download of unfollowers
      if (unfollowed.length > 0) {
        const blob = new Blob([unfollowed.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unfollowers-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('\n📥 Downloaded list of unfollowers!');
      }
    } else {
      console.log('📸 First scan! Saving snapshot of your followers...');
      console.log('   Run this script again later to detect changes.');
    }

    // Save current state
    const saved = saveFollowers(currentFollowers, username);
    console.log(`\n💾 Snapshot saved at ${formatDate(saved.timestamp)}`);
    console.log('   Run this script again anytime to check for changes!\n');
  };

  run();
})();
