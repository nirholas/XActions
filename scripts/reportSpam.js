// scripts/reportSpam.js
// Browser console script for reporting spam accounts on X/Twitter
// Paste in DevTools console on x.com (any page)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    usersToReport: [
      // 'spammer1',
      // 'spammer2',
    ],
    reason: 'spam',           // 'spam', 'abuse', 'fake'
    blockAfterReport: true,   // Also block the user after reporting
    dryRun: true,             // SET FALSE TO EXECUTE
    delay: 5000,              // ms between reports (keep high to avoid issues)
  };
  // =============================================

  const results = { reported: [], failed: [] };

  const reportUser = async (username) => {
    try {
      window.location.href = `https://x.com/${username}`;
      await sleep(3500);

      // Wait for profile to load
      let attempts = 0;
      while (!document.querySelector('[data-testid="userActions"]') && attempts < 10) {
        await sleep(500);
        attempts++;
      }

      const moreBtn = document.querySelector('[data-testid="userActions"]');
      if (!moreBtn) {
        console.warn(`⚠️ @${username}: Profile not found`);
        results.failed.push(username);
        return;
      }

      moreBtn.click();
      await sleep(1000);

      // Find "Report" in menu
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      let reportItem = null;
      for (const item of menuItems) {
        if (/report/i.test(item.textContent)) { reportItem = item; break; }
      }

      if (!reportItem) {
        document.body.click();
        await sleep(300);
        results.failed.push(username);
        console.warn(`⚠️ @${username}: Report option not found`);
        return;
      }

      reportItem.click();
      await sleep(1500);

      // Select reason in report flow
      const reasonOptions = document.querySelectorAll('[role="radio"], [role="option"], button');
      for (const opt of reasonOptions) {
        const text = opt.textContent.toLowerCase();
        if (
          (CONFIG.reason === 'spam' && text.includes('spam')) ||
          (CONFIG.reason === 'abuse' && (text.includes('abuse') || text.includes('harass'))) ||
          (CONFIG.reason === 'fake' && (text.includes('fake') || text.includes('impersonat')))
        ) {
          opt.click();
          await sleep(800);
          break;
        }
      }

      // Click next/submit
      const submitBtn = document.querySelector('[data-testid="ChoiceSelectionNextButton"]');
      if (submitBtn) {
        submitBtn.click();
        await sleep(1000);
      }

      results.reported.push(username);
      console.log(`🚩 Reported @${username} for ${CONFIG.reason}`);

      // Optionally block after reporting
      if (CONFIG.blockAfterReport) {
        await sleep(1000);
        // Check if there's a block option in the post-report flow
        const blockOptions = document.querySelectorAll('button, [role="button"]');
        for (const opt of blockOptions) {
          if (/block/i.test(opt.textContent) && !/unblock/i.test(opt.textContent)) {
            opt.click();
            await sleep(600);
            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
              confirmBtn.click();
              await sleep(500);
            }
            console.log(`🚫 Also blocked @${username}`);
            break;
          }
        }
      }
    } catch (e) {
      results.failed.push(username);
      console.warn(`⚠️ Error reporting @${username}`);
    }
  };

  const run = async () => {
    console.log('🚩 REPORT SPAM — XActions by nichxbt');

    if (CONFIG.usersToReport.length === 0) {
      console.error('❌ No users to report! Edit CONFIG.usersToReport array.');
      return;
    }

    console.log(`📋 Users to report: ${CONFIG.usersToReport.length} | Reason: ${CONFIG.reason}`);
    console.log(`⚙️ Block after: ${CONFIG.blockAfterReport} | Dry run: ${CONFIG.dryRun}`);

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN — Set CONFIG.dryRun = false to actually report.');
      CONFIG.usersToReport.forEach((u, i) => console.log(`   ${i + 1}. @${u} (${CONFIG.reason})`));
      return;
    }

    for (const username of CONFIG.usersToReport) {
      console.log(`\n⏳ Processing @${username}...`);
      await reportUser(username);
      await sleep(CONFIG.delay);
    }

    console.log(`\n✅ Done! Reported: ${results.reported.length} | Failed: ${results.failed.length}`);
  };

  run();
})();
