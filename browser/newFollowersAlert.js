// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        newFollowersAlert.js
 * @title       New Followers Alert
 * @description Compare your followers with the last snapshot to list new followers and unfollowers, with welcome message templates.
 * @category    monitor
 * @page        x.com/<you>/followers
 * @writes      false
 * @aliases     scripts/newFollowersAlert.js, scripts/twitter/new-followers-alert.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 */
// NewFollowersAlert.js — Get notified when you gain new followers
// https://github.com/nirholas/XActions
//
// HOW TO USE:
// 1. Go to https://x.com/YOUR_USERNAME/followers
// 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
// 3. Paste browser/newFollowersAlert.js and press Enter
// 4. Run periodically to see your new followers!
// 5. The last result is available as window.newFollowersResult

(() => {
  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    scrollDelay: 1500,    // ms between scrolls
    maxRetries: 5,        // Empty scrolls before stopping
    maxScrolls: 0,        // Hard cap on scrolls, 0 = no cap
    maxFollowers: 0,      // Stop after this many followers, 0 = no cap
    // Welcome message templates, rotated per new follower. {name} = first name,
    // {username} = handle. Empty = the short "thanks for the follow" template.
    welcomeMessages: [
      // "Hey {name}! Thanks for the follow! 🙏 Glad to connect!",
      // "Welcome {name}! 👋 Thanks for following! What brings you here?",
      // "Hey {name}! Appreciate the follow! Looking forward to connecting! 🚀",
      // "Thanks for following {name}! Always great to meet new people! ✨",
    ],
    autoDownload: false,     // Download a .txt report when there are new followers
    copyToClipboard: false,  // Copy the welcome messages to the clipboard
  };
  // =============================================

  const STORAGE_KEY = 'xactions_new_followers';
  // Snapshot key used by the old scripts/twitter/new-followers-alert.js, read as a fallback
  const LEGACY_STORAGE_KEY = 'xactions_followers_snapshot';
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
    let scrolls = 0;

    console.log('🔍 Scanning followers...');

    while (retries < CONFIG.maxRetries
      && (!CONFIG.maxScrolls || scrolls < CONFIG.maxScrolls)
      && (!CONFIG.maxFollowers || followers.size < CONFIG.maxFollowers)) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;

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
      if (data) return JSON.parse(data);
      // Fall back to a snapshot saved by the old standalone variant
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacy) return null;
      const parsed = JSON.parse(legacy);
      const legacyFollowers = {};
      Object.entries(parsed.followers || {}).forEach(([u, name]) => { legacyFollowers[u.toLowerCase()] = name; });
      return {
        username,
        followers: legacyFollowers,
        timestamp: parsed.savedAt,
        count: parsed.count ?? Object.keys(legacyFollowers).length,
      };
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

  const welcomeFor = (f, i) => {
    if (CONFIG.welcomeMessages.length === 0) return `Hey @${f.user}, thanks for the follow! 🙏`;
    const template = CONFIG.welcomeMessages[i % CONFIG.welcomeMessages.length];
    return template
      .replace('{name}', (f.displayName || f.user).split(' ')[0])
      .replace('{username}', f.user);
  };

  const downloadReport = (timestamp, since, newFollowers, lostFollowers, previousNames) => {
    let report = `NEW FOLLOWERS REPORT\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Since: ${since}\n`;
    report += `New followers: ${newFollowers.length}\n`;
    report += `${'='.repeat(50)}\n\n`;

    report += `NEW FOLLOWERS:\n`;
    report += `${'-'.repeat(30)}\n\n`;

    newFollowers.forEach((f, i) => {
      report += `${i + 1}. ${f.displayName} (@${f.user})\n`;
      report += `   Profile: https://x.com/${f.user}\n`;
      report += `   Welcome Message: ${welcomeFor(f, i)}\n`;
      report += '\n';
    });

    if (lostFollowers.length > 0) {
      report += `\nUNFOLLOWERS (${lostFollowers.length}):\n`;
      report += `${'-'.repeat(30)}\n`;
      lostFollowers.forEach((u, i) => {
        report += `${i + 1}. ${previousNames[u] || u} (@${u})\n`;
      });
    }

    const blob = new Blob([report], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `new_followers_${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    console.log('💾 Report downloaded!');
  };

  const run = async () => {
    console.log(`\n🎉 XActions — New Followers Tracker for @${username}\n`);

    const currentFollowers = await scrapeFollowers();
    console.log(`\n✅ Total followers: ${currentFollowers.size}\n`);

    const previous = loadPrevious();
    const timestamp = new Date().toISOString();
    const result = { timestamp, newFollowers: [], unfollowers: [] };

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
          console.log(`      https://x.com/${f.user}`);
          if (CONFIG.welcomeMessages.length > 0) console.log(`      💬 "${welcomeFor(f, i)}"`);
        });

        if (CONFIG.welcomeMessages.length === 0) {
          // Create welcome message template
          console.log('\n📝 Quick welcome template (copy & customize):');
          console.log('─'.repeat(50));
          newFollowers.slice(0, 5).forEach((f, i) => {
            console.log(welcomeFor(f, i));
          });
          if (newFollowers.length > 5) {
            console.log(`... and ${newFollowers.length - 5} more!`);
          }
          console.log('─'.repeat(50));
        }
      } else {
        console.log('📭 No new followers since last check.');
      }

      // Check for unfollowers too
      const currentUsers = new Set(currentFollowers.keys());
      const lostFollowers = Object.keys(previous.followers).filter(u => !currentUsers.has(u));

      if (lostFollowers.length > 0) {
        console.log(`\n👋 ${lostFollowers.length} people unfollowed you:`);
        lostFollowers.forEach(u => {
          const name = previous.followers[u];
          console.log(`   ${name && name !== u ? `${name} ` : ''}@${u}`);
        });
      }

      result.newFollowers = newFollowers;
      result.unfollowers = lostFollowers.map(u => ({ user: u, displayName: previous.followers[u] || u }));

      if (CONFIG.autoDownload && newFollowers.length > 0) {
        downloadReport(timestamp, previous.timestamp, newFollowers, lostFollowers, previous.followers);
      }

      if (CONFIG.copyToClipboard && newFollowers.length > 0) {
        const messages = newFollowers.map((f, i) => `@${f.user}: ${welcomeFor(f, i)}`).join('\n\n');
        try {
          await navigator.clipboard.writeText(messages);
          console.log('📋 Welcome messages copied to clipboard!');
        } catch (e) {
          console.warn('⚠️ Could not copy to clipboard (click the page first, then run again).');
        }
      }
    } else {
      console.log('📸 First scan! Saving your current followers...');
      console.log('   Run this script again later to see new followers!');
    }

    saveFollowers(currentFollowers);
    console.log('\n💾 Snapshot saved! Run again anytime to track changes.\n');

    window.newFollowersResult = result;
    console.log('💡 Access via: window.newFollowersResult');
  };

  run();
})();
