// scripts/leaveAllCommunities.js
// Browser console script for leaving all X communities
// Paste in DevTools console on x.com/USERNAME/communities
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    whitelist: [],              // Community IDs to keep (from URL)
    maxLeaves: 50,
    dryRun: true,               // SET FALSE TO EXECUTE
    delay: 2000,
    scrollDelay: 2000,
    maxScrollRetries: 5,
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const whitelistSet = new Set(CONFIG.whitelist.map(String));
  const leftIds = new Set();
  const leftLog = [];
  let left = 0;
  let errors = 0;

  const leaveCommunity = async (communityId) => {
    // Find "Joined" button and click to open leave dropdown
    const joinedBtn = document.querySelector('button[aria-label^="Joined"]') || document.querySelector('button[aria-label*="Joined"]');
    if (!joinedBtn) return false;

    joinedBtn.click();
    await sleep(800);

    // Find "Leave" in dropdown
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    let leaveBtn = null;
    for (const item of menuItems) {
      if (/leave|exit/i.test(item.textContent)) { leaveBtn = item; break; }
    }

    if (leaveBtn) {
      leaveBtn.click();
      await sleep(600);
    }

    // Confirm
    const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (confirmBtn) { confirmBtn.click(); await sleep(800); }

    return true;
  };

  const run = async () => {
    console.log('🏠 LEAVE ALL COMMUNITIES — XActions by nichxbt\n');

    if (CONFIG.dryRun) console.log('⚠️ DRY RUN — Set CONFIG.dryRun = false to actually leave\n');
    if (CONFIG.whitelist.length > 0) console.log(`🛡️ Whitelist: ${CONFIG.whitelist.length} communities\n`);

    let retries = 0;

    while (left < CONFIG.maxLeaves && retries < CONFIG.maxScrollRetries) {
      // Find community links
      const links = document.querySelectorAll('a[href^="/i/communities/"], a[href*="/communities/"]');
      let foundNew = false;

      for (const link of links) {
        if (left >= CONFIG.maxLeaves) break;

        const match = (link.href || '').match(/\/i\/communities\/(\d+)/);
        if (!match) continue;
        const id = match[1];
        if (leftIds.has(id) || whitelistSet.has(id)) continue;
        foundNew = true;

        const name = link.textContent?.trim()?.substring(0, 60) || `Community ${id}`;

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would leave: ${name} (${id})`);
          leftIds.add(id);
          leftLog.push({ id, name, dryRun: true });
          left++;
          continue;
        }

        // Navigate into community
        console.log(`   🏠 Entering ${name}...`);
        link.click();
        await sleep(CONFIG.delay + 1000);

        const success = await leaveCommunity(id);
        if (success) {
          left++;
          leftIds.add(id);
          leftLog.push({ id, name, timestamp: new Date().toISOString() });
          console.log(`   ✅ Left: ${name} [${left} total]`);
        } else {
          errors++;
          console.warn(`   ⚠️ Failed to leave: ${name}`);
        }

        // Navigate back
        window.history.back();
        await sleep(CONFIG.delay);
      }

      if (!foundNew) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    // Summary
    console.log('\n📊 RESULTS:');
    console.log(`   ✅ Left: ${left}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   🛡️ Whitelisted: ${CONFIG.whitelist.length}`);

    if (leftLog.length > 0) {
      download(
        { summary: { left, errors, whitelisted: CONFIG.whitelist.length }, communities: leftLog },
        `xactions-communities-left-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    console.log('\n🏁 Done!');
  };

  run();
})();
