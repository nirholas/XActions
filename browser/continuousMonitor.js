// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        continuousMonitor.js
 * @title       Continuous Monitor
 * @description Re-check a followers or following list on a timer and alert you to every follow and unfollow.
 * @category    monitor
 * @page        x.com/<username>/followers or x.com/<username>/following
 * @writes      false
 * @aliases     scripts/continuousMonitor.js, scripts/twitter/continuous-monitor.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * HOW TO USE:
 * 1. Go to https://x.com/USERNAME/followers (or /following)
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste browser/continuousMonitor.js and press Enter
 * 4. Leave the tab open: it will check periodically and alert you!
 *
 * To stop: stopXActionsMonitor() (or window.stopMonitor()). Pasting the
 * script again replaces the running monitor instead of stacking a second one.
 */

// CONFIGURATION (edit these values):
// `var` (not `const`): DevTools keeps top-level lexical bindings alive across
// separate console pastes, so a `const` here throws "already been declared"
// the second time this script is pasted in the same tab.
var CONFIG = {
  CHECK_INTERVAL_MINUTES: 30,    // How often to check (each check scrolls the whole list)
  ENABLE_NOTIFICATIONS: true,    // Browser notifications (you'll be prompted)
  ENABLE_SOUND: true,           // Play sound on changes
  AUTO_SCROLL: true,            // Auto-scroll to load all users
  SCROLL_DELAY: 1500,           // Wait after each scroll while loading users (ms)
  MAX_SCROLLS: 0,               // Max scrolls per check (0 = until the list stops growing)
  MAX_RETRIES: 3,               // Stop scrolling after this many scrolls with no new users
};

(() => {
  const STORAGE_PREFIX = 'xactions_continuous_';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Re-pasting the script must not stack a second timer on top of a still-running
  // one: that would double (then triple, ...) every check and every notification.
  if (typeof window.stopXActionsMonitor === 'function') {
    try { window.stopXActionsMonitor(); } catch (e) { /* ignore */ }
  } else if (typeof window.stopMonitor === 'function') {
    try { window.stopMonitor(); } catch (e) { /* ignore */ }
  }

  // Parse page info
  const path = window.location.pathname;
  const isFollowersPage = path.includes('/followers');
  const isFollowingPage = path.includes('/following');

  if (!isFollowersPage && !isFollowingPage) {
    console.error('❌ Navigate to a followers or following page first!');
    return;
  }

  const pageType = isFollowersPage ? 'followers' : 'following';
  const rawTargetUser = path.split('/')[1];
  const targetUser = rawTargetUser.toLowerCase();
  const storageKey = `${STORAGE_PREFIX}${targetUser}_${pageType}`;
  // Older versions keyed the snapshot by the handle as typed in the URL.
  const legacyStorageKey = `${STORAGE_PREFIX}${rawTargetUser}_${pageType}`;

  // Request notification permission
  if (CONFIG.ENABLE_NOTIFICATIONS && 'Notification' in window) {
    if (Notification.permission === 'default') {
      console.log('🔔 Requesting notification permission...');
    }
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') console.log('✅ Notifications enabled');
      else console.log('⚠️ Notifications denied: changes will only show in the console');
    }).catch(() => {});
  }

  const notify = (title, body) => {
    console.log(`🔔 ${title}: ${body}`);
    
    if (CONFIG.ENABLE_NOTIFICATIONS && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'https://abs.twimg.com/favicons/twitter.3.ico' });
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
      let scrolls = 0;
      while (retries < CONFIG.MAX_RETRIES && (!CONFIG.MAX_SCROLLS || scrolls < CONFIG.MAX_SCROLLS)) {
        scrolls++;
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.SCROLL_DELAY);

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
      const data = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
      const parsed = data ? JSON.parse(data) : null;
      if (!parsed || !Array.isArray(parsed.users)) return null;
      // Snapshots from older versions kept the handle's original case.
      parsed.users = parsed.users.map(u => String(u).toLowerCase());
      return parsed;
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

  // First few handles of a change, for the notification body.
  const names = (list) => list.slice(0, 3).map(u => '@' + u).join(', ') + (list.length > 3 ? ', ...' : '');

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
            notify('👋 Lost Followers', `${removed.length} accounts unfollowed @${targetUser}: ${names(removed)}`);
            console.log(`🚨 UNFOLLOWED BY: ${removed.map(u => '@' + u).join(', ')}`);
          }
          if (added.length > 0) {
            notify('🎉 New Followers', `${added.length} new followers for @${targetUser}: ${names(added)}`);
            console.log(`✨ NEW FOLLOWERS: ${added.map(u => '@' + u).join(', ')}`);
          }
        } else {
          if (removed.length > 0) {
            notify('👋 Unfollowed', `@${targetUser} unfollowed ${removed.length} accounts: ${names(removed)}`);
            console.log(`📤 UNFOLLOWED: ${removed.map(u => '@' + u).join(', ')}`);
          }
          if (added.length > 0) {
            notify('➕ New Follow', `@${targetUser} followed ${added.length} accounts: ${names(added)}`);
            console.log(`📥 FOLLOWED: ${added.map(u => '@' + u).join(', ')}`);
          }
        }
      } else {
        console.log('   No changes detected.');
      }
    } else {
      console.log('   📸 First snapshot saved');
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

  // A scrape can take longer than a short check interval; never let two
  // checks scroll the page at the same time.
  let checkRunning = false;
  const performCheck = async () => {
    if (checkRunning) return;
    checkRunning = true;
    try {
      await runCheck();
    } finally {
      checkRunning = false;
    }
  };

  performCheck();

  // Set up interval
  const intervalMs = CONFIG.CHECK_INTERVAL_MINUTES * 60 * 1000;
  const intervalId = setInterval(performCheck, intervalMs);

  // Provide stop function (stopMonitor is the name older versions used)
  window.stopXActionsMonitor = () => {
    clearInterval(intervalId);
    console.log('\n🛑 Monitoring stopped.');
  };
  window.stopMonitor = window.stopXActionsMonitor;

  console.log('💡 Tip: Run stopXActionsMonitor() to stop monitoring.\n');
})();
