// scripts/monitorAccount.js
// Browser console script for tracking follows/unfollows on any public account
// Paste in DevTools console on x.com/USERNAME/followers or /following
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxUsers: 1000,
    scrollDelay: 1500,
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const path = window.location.pathname;
  const isFollowers = path.includes('/followers');
  const isFollowing = path.includes('/following');

  if (!isFollowers && !isFollowing) {
    console.error('❌ Navigate to a /followers or /following page first!');
    console.log('👉 Example: x.com/elonmusk/followers');
    return;
  }

  const pageType = isFollowers ? 'followers' : 'following';
  const targetUser = path.split('/')[1].toLowerCase();
  const storageKey = `xactions_monitor_${targetUser}_${pageType}`;

  const scrapeUsers = async () => {
    const users = new Set();
    let prevSize = 0;
    let retries = 0;

    console.log(`🔍 Scanning @${targetUser}'s ${pageType}...`);

    while (retries < 5 && users.size < CONFIG.maxUsers) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);

      document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
        const links = cell.querySelectorAll('a[href^="/"]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && !href.includes('/status/')) {
            const username = href.replace('/', '').split('/')[0].toLowerCase();
            if (username && username !== targetUser && !username.includes('?')) {
              users.add(username);
            }
          }
        });
      });

      console.log(`   Found ${users.size} accounts...`);
      if (users.size === prevSize) retries++;
      else { retries = 0; prevSize = users.size; }
    }

    return [...users];
  };

  const run = async () => {
    console.log(`\n🔭 MONITOR ACCOUNT — Tracking @${targetUser}'s ${pageType} — by nichxbt\n`);

    const currentUsers = await scrapeUsers();
    console.log(`\n✅ Found ${currentUsers.length} accounts\n`);

    const previous = (() => {
      try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; }
    })();

    if (previous) {
      console.log(`📊 Comparing with snapshot from ${new Date(previous.timestamp).toLocaleString()}`);
      console.log(`   Previous: ${previous.count} | Current: ${currentUsers.length}\n`);

      const prevSet = new Set(previous.users.map(u => u.toLowerCase()));
      const currSet = new Set(currentUsers.map(u => u.toLowerCase()));
      const removed = previous.users.filter(u => !currSet.has(u.toLowerCase()));
      const added = currentUsers.filter(u => !prevSet.has(u.toLowerCase()));

      if (pageType === 'followers') {
        if (removed.length > 0) {
          console.log(`🚨 ${removed.length} UNFOLLOWED @${targetUser}:`);
          removed.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          download(removed.join('\n'), `${targetUser}-lost-followers-${Date.now()}.txt`);
        }
        if (added.length > 0) {
          console.log(`🎉 ${added.length} NEW FOLLOWERS:`);
          added.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
        }
      } else {
        if (removed.length > 0) {
          console.log(`👋 @${targetUser} UNFOLLOWED ${removed.length}:`);
          removed.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
          download(removed.join('\n'), `${targetUser}-unfollowed-${Date.now()}.txt`);
        }
        if (added.length > 0) {
          console.log(`➕ @${targetUser} FOLLOWED ${added.length} NEW:`);
          added.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
        }
      }

      if (removed.length === 0 && added.length === 0) {
        console.log('✨ No changes since last check!');
      }
    } else {
      console.log('📸 First scan! Saving snapshot. Run again later to detect changes.');
    }

    const saved = { target: targetUser, type: pageType, users: currentUsers, timestamp: new Date().toISOString(), count: currentUsers.length };
    localStorage.setItem(storageKey, JSON.stringify(saved));
    console.log(`\n💾 Snapshot saved at ${new Date().toLocaleString()}`);
    console.log(`   Key: ${storageKey}`);
    console.log('   Run this script again to check for changes!\n');
  };

  run();
})();
