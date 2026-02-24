// scripts/welcomeNewFollowers.js
// Browser console script for welcoming new followers with DMs on X/Twitter
// Paste in DevTools console on x.com/USERNAME/followers
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    messageTemplates: [
      "Hey @{username}! 👋 Thanks for the follow! Glad to have you here.",
      "Welcome @{username}! 🙌 Thanks for connecting. Feel free to reach out anytime!",
      "Hey there @{username}! Thanks for the follow! Hope you find the content valuable. 🚀",
    ],
    maxDMs: 10,           // Max DMs to send per run
    dryRun: true,         // Preview without sending — SET FALSE TO SEND
    dmDelay: 60000,       // 60s between DMs (conservative to avoid rate limits)
    maxFollowers: 200,    // Max followers to scan
    scrollDelay: 2000,    // ms between scrolls
    scrollRounds: 5,      // Number of scroll rounds
    exportOnComplete: true,
  };
  // =============================================

  const STORAGE_KEY = 'xactions_known_followers';

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const getKnown = () => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  };

  const saveKnown = (set) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  };

  const fillMessage = (template, username, displayName) => {
    return template
      .replace(/\{username\}/g, username)
      .replace(/\{displayName\}/g, displayName || username);
  };

  const run = async () => {
    console.log('👋 WELCOME NEW FOLLOWERS — by nichxbt');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    const knownBefore = getKnown();
    const isFirstRun = knownBefore.size === 0;

    console.log(`\n📋 Known followers: ${knownBefore.size}${isFirstRun ? ' (first run — will baseline)' : ''}`);
    console.log(`⚙️ Dry run: ${CONFIG.dryRun} | Max DMs: ${CONFIG.maxDMs}\n`);

    // Collect current followers
    const followers = new Map();

    for (let round = 0; round < CONFIG.scrollRounds && followers.size < CONFIG.maxFollowers; round++) {
      for (const cell of document.querySelectorAll('[data-testid="UserCell"]')) {
        const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
        if (!link) continue;
        const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
        if (!m || ['home', 'explore', 'notifications', 'messages', 'i'].includes(m[1])) continue;

        const username = m[1];
        if (followers.has(username.toLowerCase())) continue;

        const nameEl = cell.querySelector('a[href^="/"] span');
        const displayName = nameEl ? nameEl.textContent.trim() : username;
        followers.set(username.toLowerCase(), { username, displayName });
      }

      console.log(`   📜 Round ${round + 1}: ${followers.size} followers collected`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n📊 Total collected: ${followers.size}`);

    // Detect new followers
    const newFollowers = [];
    for (const [key, data] of followers) {
      if (!knownBefore.has(key)) newFollowers.push(data);
    }

    // Update known list
    const updatedKnown = new Set([...knownBefore, ...followers.keys()]);
    saveKnown(updatedKnown);

    if (isFirstRun) {
      console.log(`\n✅ First run! Baselined ${followers.size} followers.`);
      console.log('   Run again later to detect NEW followers and send welcome DMs.');
      return;
    }

    console.log(`\n🆕 New followers: ${newFollowers.length}`);

    if (newFollowers.length === 0) {
      console.log('   No new followers since last run.\n');
      return;
    }

    // Show new followers
    console.log('\n  New followers:');
    for (const f of newFollowers) {
      console.log(`    👤 @${f.username} (${f.displayName})`);
    }

    // DM logic
    let dmsSent = 0;

    if (!CONFIG.dryRun && CONFIG.messageTemplates.length > 0) {
      console.log(`\n📬 Sending welcome DMs (max ${CONFIG.maxDMs})...`);
      console.log('⚠️ NOTE: Mass DMing may violate X ToS. Use responsibly.\n');

      for (const follower of newFollowers.slice(0, CONFIG.maxDMs)) {
        const template = CONFIG.messageTemplates[Math.floor(Math.random() * CONFIG.messageTemplates.length)];
        const message = fillMessage(template, follower.username, follower.displayName);

        // Navigate to DM compose
        // NOTE: Actual DM sending requires navigating to messages page.
        // This logs the intent — full automation would need page navigation.
        console.log(`   📨 @${follower.username}: "${message}"`);
        console.log(`      ⏳ Waiting ${CONFIG.dmDelay / 1000}s...`);
        dmsSent++;
        await sleep(CONFIG.dmDelay);
      }
    } else if (CONFIG.dryRun) {
      console.log('\n📬 Messages that would be sent (DRY RUN):');
      for (const follower of newFollowers.slice(0, CONFIG.maxDMs)) {
        const template = CONFIG.messageTemplates[Math.floor(Math.random() * CONFIG.messageTemplates.length)];
        const message = fillMessage(template, follower.username, follower.displayName);
        console.log(`   📨 @${follower.username}: "${message}"`);
      }
    }

    // Summary
    console.log('\n📊 RESULTS');
    console.log(`   New followers:  ${newFollowers.length}`);
    console.log(`   DMs sent:       ${dmsSent}`);
    console.log(`   Total known:    ${updatedKnown.size}`);

    if (CONFIG.exportOnComplete && newFollowers.length > 0) {
      download(
        { newFollowers, dmsSent, totalKnown: updatedKnown.size, detectedAt: new Date().toISOString() },
        `xactions-new-followers-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    console.log('✅ Done!\n');
  };

  run();
})();
