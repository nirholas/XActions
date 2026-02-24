// scripts/continuousMonitor.js
// Browser console script for continuous auto-refresh monitoring of followers/following
// Paste in DevTools console on x.com/USERNAME/followers or /following
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    checkIntervalMinutes: 30,
    enableNotifications: true,
    autoScroll: true,
  };
  // =============================================

  const path = window.location.pathname;
  const isFollowers = path.includes('/followers');
  const isFollowing = path.includes('/following');

  if (!isFollowers && !isFollowing) {
    console.error('❌ Navigate to a /followers or /following page first!');
    return;
  }

  const pageType = isFollowers ? 'followers' : 'following';
  const targetUser = path.split('/')[1].toLowerCase();
  const storageKey = `xactions_continuous_${targetUser}_${pageType}`;

  if (CONFIG.enableNotifications && 'Notification' in window) {
    Notification.requestPermission();
  }

  const notify = (title, body) => {
    console.log(`🔔 ${title}: ${body}`);
    if (CONFIG.enableNotifications && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  const scrapeUsers = async () => {
    const users = new Set();
    let prevSize = 0;
    let retries = 0;

    if (CONFIG.autoScroll) {
      while (retries < 3) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(1500);
        document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
          const link = cell.querySelector('a[href^="/"]');
          if (link) {
            const username = link.getAttribute('href').replace('/', '').split('/')[0].toLowerCase();
            if (username && username !== targetUser) users.add(username);
          }
        });
        if (users.size === prevSize) retries++;
        else { retries = 0; prevSize = users.size; }
      }
    } else {
      document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
        const link = cell.querySelector('a[href^="/"]');
        if (link) {
          const username = link.getAttribute('href').replace('/', '').split('/')[0].toLowerCase();
          if (username && username !== targetUser) users.add(username);
        }
      });
    }
    return [...users];
  };

  const loadPrevious = () => {
    try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; }
  };

  const saveData = (users) => {
    const data = { target: targetUser, type: pageType, users, timestamp: new Date().toISOString(), count: users.length };
    localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  };

  let checkCount = 0;

  const runCheck = async () => {
    checkCount++;
    const time = new Date().toLocaleTimeString();
    console.log(`\n⏰ [${time}] Check #${checkCount} — Scanning @${targetUser}'s ${pageType}...`);

    window.scrollTo(0, 0);
    await sleep(500);

    const currentUsers = await scrapeUsers();
    const previous = loadPrevious();

    if (previous) {
      const prevSet = new Set(previous.users);
      const currSet = new Set(currentUsers);
      const removed = previous.users.filter(u => !currSet.has(u));
      const added = currentUsers.filter(u => !prevSet.has(u));

      if (removed.length > 0 || added.length > 0) {
        if (pageType === 'followers') {
          if (removed.length > 0) {
            notify('👋 Lost Followers', `${removed.length} unfollowed @${targetUser}`);
            console.log(`🚨 UNFOLLOWED BY: ${removed.map(u => '@' + u).join(', ')}`);
          }
          if (added.length > 0) {
            notify('🎉 New Followers', `${added.length} new for @${targetUser}`);
            console.log(`✨ NEW FOLLOWERS: ${added.map(u => '@' + u).join(', ')}`);
          }
        } else {
          if (removed.length > 0) {
            notify('👋 Unfollowed', `@${targetUser} unfollowed ${removed.length}`);
            console.log(`📤 UNFOLLOWED: ${removed.map(u => '@' + u).join(', ')}`);
          }
          if (added.length > 0) {
            notify('➕ New Follow', `@${targetUser} followed ${added.length}`);
            console.log(`📥 FOLLOWED: ${added.map(u => '@' + u).join(', ')}`);
          }
        }
      } else {
        console.log('   No changes detected.');
      }
    }

    saveData(currentUsers);
    console.log(`   Total: ${currentUsers.length} | Next check in ${CONFIG.checkIntervalMinutes} min`);
  };

  console.log(`\n🔭 CONTINUOUS MONITOR — @${targetUser}'s ${pageType} — by nichxbt`);
  console.log(`   Interval: every ${CONFIG.checkIntervalMinutes} min | Keep this tab open!`);
  console.log('   Run stopXActionsMonitor() to stop.\n');

  runCheck();

  const intervalId = setInterval(runCheck, CONFIG.checkIntervalMinutes * 60 * 1000);

  window.stopXActionsMonitor = () => {
    clearInterval(intervalId);
    console.log('\n🛑 Monitoring stopped.');
  };
})();
