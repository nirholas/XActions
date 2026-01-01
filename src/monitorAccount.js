// MonitorAccount.js — Track follows/unfollows on ANY public X (Twitter) account
// https://github.com/nirholas/XActions
//
// HOW TO USE:
// 1. Go to https://twitter.com/TARGET_USERNAME/followers (or /following)
// 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
// 3. Paste this script and press Enter
// 4. Run again later to see changes!
//
// Works on:
// - /followers — track who follows/unfollows this account
// - /following — track who this account follows/unfollows
//
// NOTE: Only works on PUBLIC accounts. Private accounts hide their lists.

(() => {
  const STORAGE_PREFIX = 'xactions_monitor_';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Detect page type
  const path = window.location.pathname;
  const isFollowersPage = path.includes('/followers');
  const isFollowingPage = path.includes('/following');

  if (!isFollowersPage && !isFollowingPage) {
    console.error('❌ Please navigate to a followers or following page!');
    console.log('👉 Example: https://twitter.com/elonmusk/followers');
    return;
  }

  const pageType = isFollowersPage ? 'followers' : 'following';
  const targetUser = path.split('/')[1].toLowerCase();
  const storageKey = `${STORAGE_PREFIX}${targetUser}_${pageType}`;

  const scrapeUsers = async () => {
    const users = new Set();
    let previousSize = 0;
    let retries = 0;
    const maxRetries = 5;

    console.log(`🔍 Scanning @${targetUser}'s ${pageType}...`);

    while (retries < maxRetries) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);

      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      userCells.forEach(cell => {
        // Get username from the link
        const links = cell.querySelectorAll('a[href^="/"]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('/') && !href.includes('/status/')) {
            const username = href.replace('/', '').split('/')[0].toLowerCase();
            if (username && username !== targetUser && !username.includes('?')) {
              users.add(username);
            }
          }
        });
      });

      console.log(`   Found ${users.size} accounts so far...`);

      if (users.size === previousSize) {
        retries++;
      } else {
        retries = 0;
        previousSize = users.size;
      }
    }

    return Array.from(users);
  };

  const loadPrevious = () => {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };

  const saveData = (users) => {
    const data = {
      target: targetUser,
      type: pageType,
      users,
      timestamp: new Date().toISOString(),
      count: users.length
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  };

  const compare = (previous, current) => {
    const prevSet = new Set(previous.map(u => u.toLowerCase()));
    const currSet = new Set(current.map(u => u.toLowerCase()));

    const removed = previous.filter(u => !currSet.has(u.toLowerCase()));
    const added = current.filter(u => !prevSet.has(u.toLowerCase()));

    return { removed, added };
  };

  const formatDate = (iso) => new Date(iso).toLocaleString();

  const downloadList = (list, filename) => {
    if (list.length === 0) return;
    const blob = new Blob([list.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const run = async () => {
    console.log(`\n🔭 XActions Monitor — Tracking @${targetUser}'s ${pageType}\n`);

    const currentUsers = await scrapeUsers();
    console.log(`\n✅ Found ${currentUsers.length} accounts\n`);

    const previous = loadPrevious();

    if (previous) {
      console.log(`📊 Comparing with snapshot from ${formatDate(previous.timestamp)}`);
      console.log(`   Previous: ${previous.count} | Current: ${currentUsers.length}`);
      console.log('');

      const { removed, added } = compare(previous.users, currentUsers);

      if (pageType === 'followers') {
        // Tracking who follows this account
        if (removed.length > 0) {
          console.log(`\n🚨 ${removed.length} ACCOUNTS UNFOLLOWED @${targetUser}:\n`);
          removed.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          downloadList(removed, `${targetUser}-lost-followers-${Date.now()}.txt`);
        }
        if (added.length > 0) {
          console.log(`\n🎉 ${added.length} NEW FOLLOWERS FOR @${targetUser}:\n`);
          added.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
        }
      } else {
        // Tracking who this account follows
        if (removed.length > 0) {
          console.log(`\n👋 @${targetUser} UNFOLLOWED ${removed.length} ACCOUNTS:\n`);
          removed.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          downloadList(removed, `${targetUser}-unfollowed-${Date.now()}.txt`);
        }
        if (added.length > 0) {
          console.log(`\n➕ @${targetUser} FOLLOWED ${added.length} NEW ACCOUNTS:\n`);
          added.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
        }
      }

      if (removed.length === 0 && added.length === 0) {
        console.log('✨ No changes detected since last check!');
      }
    } else {
      console.log('📸 First scan! Saving snapshot...');
      console.log('   Run again later to detect changes.');
    }

    const saved = saveData(currentUsers);
    console.log(`\n💾 Snapshot saved at ${formatDate(saved.timestamp)}`);
    console.log(`   Stored as: ${storageKey}`);
    console.log('   Run this script again to check for changes!\n');
  };

  run();
})();
