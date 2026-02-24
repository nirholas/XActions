// Report Spam Accounts on X - by nichxbt
// https://github.com/nirholas/xactions
// Report multiple spam/bot accounts at once
// 1. Go to x.com (any page)
// 2. Edit the USERS_TO_REPORT array below
// 3. Open the Developer Console (F12)
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    usersToReport: [
      // 'spammer1',
      // 'spammer2',
    ],
    // Report reason: 'spam', 'abuse', 'fake'
    reason: 'spam',
    actionDelay: 4000,
    blockAfterReport: false,
    dryRun: true,
  };

  const $moreButton = '[data-testid="userActions"]';
  const $reportOption = '[data-testid="report"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const results = { reported: [], failed: [] };

  const reportUser = async (username) => {
    try {
      window.location.href = `https://x.com/${username}`;
      await sleep(3000);

      const moreBtn = document.querySelector($moreButton);
      if (!moreBtn) {
        console.warn(`⚠️ @${username}: Profile not found`);
        results.failed.push(username);
        return;
      }

      moreBtn.click();
      await sleep(1000);

      // Find report option
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      let reportItem = null;
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('report')) {
          reportItem = item;
          break;
        }
      }

      if (reportItem) {
        reportItem.click();
        await sleep(1500);

        // Navigate through the report flow
        // Select the spam reason
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

        // Click submit/next
        const submitBtn = document.querySelector('[data-testid="ChoiceSelectionNextButton"]');
        if (submitBtn) submitBtn.click();

        results.reported.push(username);
        console.log(`🚩 Reported @${username} for ${CONFIG.reason}`);
      } else {
        document.body.click();
        results.failed.push(username);
      }

      await sleep(1000);
    } catch (e) {
      results.failed.push(username);
    }
  };

  const run = async () => {
    console.log('🚩 REPORT SPAM - XActions by nichxbt');

    if (CONFIG.usersToReport.length === 0) {
      console.error('❌ No users to report! Edit CONFIG.usersToReport.');
      return;
    }

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually report');
      CONFIG.usersToReport.forEach((u, i) => console.log(`   ${i + 1}. @${u} (${CONFIG.reason})`));
      return;
    }

    console.log(`📋 Users to report: ${CONFIG.usersToReport.length} (reason: ${CONFIG.reason})`);

    for (const username of CONFIG.usersToReport) {
      console.log(`\n⏳ Processing @${username}...`);
      await reportUser(username);
      await sleep(CONFIG.actionDelay);
    }

    console.log('\n📊 RESULTS:');
    console.log(`   🚩 Reported: ${results.reported.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
  };

  run();
})();
