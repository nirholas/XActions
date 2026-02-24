// scripts/unfollowWDFBLog.js
// Browser console script for unfollowing non-followers with detailed logging
// Paste in DevTools console on x.com/USERNAME/following
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxUnfollows: Infinity,   // Cap total unfollows
    whitelist: [],            // Usernames to never unfollow (without @)
    dryRun: true,             // Preview without acting — SET FALSE TO RUN
    delay: 2000,              // ms between unfollows
    scrollDelay: 2000,        // ms to wait after scroll
    maxEmptyScrolls: 6,       // Give up after N scrolls with no new users
    exportFormat: 'both',     // 'json' | 'csv' | 'both'
  };
  // =============================================

  const download = (content, filename, type = 'application/json') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const extractUserData = (cell) => {
    const data = { username: null, displayName: null, bio: null, hasAvatar: true, followerCount: 0 };

    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (link) {
      const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (m && !['home', 'explore', 'notifications', 'messages', 'i'].includes(m[1])) data.username = m[1];
    }
    if (!data.username) {
      for (const span of cell.querySelectorAll('span')) {
        const m = span.textContent.match(/^@([A-Za-z0-9_]+)$/);
        if (m) { data.username = m[1]; break; }
      }
    }

    // Display name
    const nameSpans = cell.querySelectorAll('a[href^="/"] span');
    if (nameSpans.length > 0) data.displayName = nameSpans[0].textContent.trim();

    // Bio
    const bioEl = cell.querySelector('[data-testid="UserDescription"]') || cell.querySelector('[dir="auto"]:not(a [dir="auto"])');
    if (bioEl && bioEl.textContent.trim().length > 5) data.bio = bioEl.textContent.trim().slice(0, 300);

    // Avatar check
    const avatar = cell.querySelector('img[src*="default_profile"]');
    data.hasAvatar = !avatar;

    return data;
  };

  const exportResults = (log) => {
    if (log.length === 0) { console.log('📭 Nothing to export.'); return; }
    const ts = new Date().toISOString().slice(0, 10);
    const tag = CONFIG.dryRun ? 'preview' : 'results';

    if (CONFIG.exportFormat === 'json' || CONFIG.exportFormat === 'both') {
      const data = { summary: { total: log.length, dryRun: CONFIG.dryRun, exportedAt: new Date().toISOString() }, accounts: log };
      download(JSON.stringify(data, null, 2), `xactions-unfollowlog-${tag}-${ts}.json`);
    }

    if (CONFIG.exportFormat === 'csv' || CONFIG.exportFormat === 'both') {
      const header = 'username,displayName,bio,hasAvatar,followerCount,timestamp\n';
      const rows = log.map(r =>
        `"${r.username}","${(r.displayName || '').replace(/"/g, '""')}","${(r.bio || '').replace(/"/g, '""').replace(/\n/g, ' ')}",${r.hasAvatar},${r.followerCount || 0},"${r.timestamp}"`
      ).join('\n');
      download(header + rows, `xactions-unfollowlog-${tag}-${ts}.csv`, 'text/csv');
    }
  };

  const run = async () => {
    console.log('📝 UNFOLLOW NON-FOLLOWERS WITH LOG — by nichxbt');

    if (!window.location.href.includes('/following')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/following first!');
      return;
    }

    const whiteSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));
    const processed = new Set();
    const log = [];
    let unfollowed = 0, scanned = 0, emptyScrolls = 0;

    console.log(`⚙️ Dry run: ${CONFIG.dryRun} | Whitelist: ${whiteSet.size} | Export: ${CONFIG.exportFormat}`);
    if (CONFIG.dryRun) console.log('⚠️ Preview only. Set dryRun=false to execute.\n');

    while (unfollowed < CONFIG.maxUnfollows && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let foundNew = false;

      for (const cell of cells) {
        if (unfollowed >= CONFIG.maxUnfollows) break;

        const userData = extractUserData(cell);
        if (!userData.username) continue;
        const uLower = userData.username.toLowerCase();
        if (processed.has(uLower)) continue;
        processed.add(uLower);
        foundNew = true;
        scanned++;

        // Skip if follows back
        if (cell.querySelector('[data-testid="userFollowIndicator"]')) continue;

        // Whitelist
        if (whiteSet.has(uLower)) {
          console.log(`🛡️ Whitelisted: @${userData.username}`);
          continue;
        }

        const entry = { ...userData, timestamp: new Date().toISOString(), dryRun: CONFIG.dryRun };

        if (CONFIG.dryRun) {
          console.log(`🔍 Would unfollow: @${userData.username}${userData.displayName ? ` (${userData.displayName})` : ''}${userData.bio ? ` — "${userData.bio.slice(0, 60)}…"` : ''}`);
          log.push(entry);
          unfollowed++;
          continue;
        }

        const btn = cell.querySelector('[data-testid$="-unfollow"]');
        if (!btn) continue;

        try {
          btn.click();
          await sleep(500);
          const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirm) confirm.click();
          await sleep(400);

          unfollowed++;
          log.push(entry);
          console.log(`🔙 #${unfollowed} @${userData.username}${userData.displayName ? ` (${userData.displayName})` : ''} | bio: ${userData.bio ? 'yes' : 'no'} | avatar: ${userData.hasAvatar ? 'yes' : 'no'}`);
          await sleep(CONFIG.delay);
        } catch (e) {
          console.warn(`⚠️ Error unfollowing @${userData.username}: ${e.message}`);
        }
      }

      if (!foundNew) emptyScrolls++;
      else emptyScrolls = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    // Summary
    console.log('\n📊 RESULTS');
    console.log(`   Scanned:    ${scanned}`);
    console.log(`   Unfollowed: ${unfollowed}`);
    console.log(`   Mode:       ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);

    exportResults(log);
    console.log('✅ Done!\n');
  };

  run();
})();
