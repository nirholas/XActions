// ContinuousMonitor.js — Auto-refresh monitoring for followers/following changes
// https://github.com/nirholas/XActions
//
// HOW TO USE:
// 1. Go to https://twitter.com/USERNAME/followers (or /following)
// 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
// 3. Paste this script and press Enter
// 4. Leave the tab open — it will check periodically and alert you!
//
// CONFIGURATION (edit these values):
const CONFIG = {
  CHECK_INTERVAL_MINUTES: 5,     // How often to check (default: 5 min)
  ENABLE_NOTIFICATIONS: true,    // Browser notifications (you'll be prompted)
  ENABLE_SOUND: true,           // Play sound on changes
  AUTO_SCROLL: true,            // Auto-scroll to load all users
};

(() => {
  const STORAGE_PREFIX = 'xactions_continuous_';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Parse page info
  const path = window.location.pathname;
  const isFollowersPage = path.includes('/followers');
  const isFollowingPage = path.includes('/following');

  if (!isFollowersPage && !isFollowingPage) {
    console.error('❌ Navigate to a followers or following page first!');
    return;
  }

  const pageType = isFollowersPage ? 'followers' : 'following';
  const targetUser = path.split('/')[1].toLowerCase();
  const storageKey = `${STORAGE_PREFIX}${targetUser}_${pageType}`;

  // Request notification permission
  if (CONFIG.ENABLE_NOTIFICATIONS && 'Notification' in window) {
    Notification.requestPermission();
  }

  const notify = (title, body) => {
    console.log(`🔔 ${title}: ${body}`);
    
    if (CONFIG.ENABLE_NOTIFICATIONS && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '🐦' });
    }
    
    if (CONFIG.ENABLE_SOUND) {
      // Play a simple beep using Web Audio API
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (e) {}
    }
  };

  const scrapeUsers = async () => {
    const users = new Set();
    let previousSize = 0;
    let retries = 0;

    if (CONFIG.AUTO_SCROLL) {
      while (retries < 3) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(1500);

        document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
          const link = cell.querySelector('a[href^="/"]');
          if (link) {
            const username = link.getAttribute('href').replace('/', '').split('/')[0].toLowerCase();
            if (username && username !== targetUser) {
              users.add(username);
            }
          }
        });

        if (users.size === previousSize) retries++;
        else { retries = 0; previousSize = users.size; }
      }
    } else {
      // Just scrape visible users
      document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
        const link = cell.querySelector('a[href^="/"]');
        if (link) {
          const username = link.getAttribute('href').replace('/', '').split('/')[0].toLowerCase();
          if (username && username !== targetUser) {
            users.add(username);
          }
        }
      });
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
    const prevSet = new Set(previous);
    const currSet = new Set(current);
    return {
      removed: previous.filter(u => !currSet.has(u)),
      added: current.filter(u => !prevSet.has(u))
    };
  };

  let checkCount = 0;

  const runCheck = async () => {
    checkCount++;
    const time = new Date().toLocaleTimeString();
    console.log(`\n⏰ [${time}] Check #${checkCount} — Scanning @${targetUser}'s ${pageType}...`);

    // Reload the page content
    window.scrollTo(0, 0);
    await sleep(500);

    const currentUsers = await scrapeUsers();
    const previous = loadPrevious();

    if (previous) {
      const { removed, added } = compare(previous.users, currentUsers);

      if (removed.length > 0 || added.length > 0) {
        console.log('');
        
        if (pageType === 'followers') {
          if (removed.length > 0) {
            notify('👋 Lost Followers', `${removed.length} accounts unfollowed @${targetUser}`);
            console.log(`🚨 UNFOLLOWED BY: ${removed.map(u => '@' + u).join(', ')}`);
          }
          if (added.length > 0) {
            notify('🎉 New Followers', `${added.length} new followers for @${targetUser}`);
            console.log(`✨ NEW FOLLOWERS: ${added.map(u => '@' + u).join(', ')}`);
          }
        } else {
          if (removed.length > 0) {
            notify('👋 Unfollowed', `@${targetUser} unfollowed ${removed.length} accounts`);
            console.log(`📤 UNFOLLOWED: ${removed.map(u => '@' + u).join(', ')}`);
          }
          if (added.length > 0) {
            notify('➕ New Follow', `@${targetUser} followed ${added.length} accounts`);
            console.log(`📥 FOLLOWED: ${added.map(u => '@' + u).join(', ')}`);
          }
        }
      } else {
        console.log('   No changes detected.');
      }
    }

    saveData(currentUsers);
    console.log(`   Total: ${currentUsers.length} | Next check in ${CONFIG.CHECK_INTERVAL_MINUTES} min`);
  };

  // Initial run
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔭 XActions Continuous Monitor                          ║
║                                                           ║
║  Target: @${targetUser.padEnd(20)}                        ║
║  Tracking: ${pageType.padEnd(18)}                         ║
║  Interval: Every ${CONFIG.CHECK_INTERVAL_MINUTES} minutes                          ║
║                                                           ║
║  Keep this tab open! Checking automatically...            ║
║  Press Ctrl+C in console to stop.                         ║
╚═══════════════════════════════════════════════════════════╝
  `);

  runCheck();

  // Set up interval
  const intervalMs = CONFIG.CHECK_INTERVAL_MINUTES * 60 * 1000;
  const intervalId = setInterval(runCheck, intervalMs);

  // Provide stop function
  window.stopXActionsMonitor = () => {
    clearInterval(intervalId);
    console.log('\n🛑 Monitoring stopped.');
  };

  console.log('💡 Tip: Run stopXActionsMonitor() to stop monitoring.\n');
})();
