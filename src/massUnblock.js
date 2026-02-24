// Mass Unblock Users on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to https://x.com/settings/blocked/all
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const $blockedUser = '[data-testid="UserCell"]';
  const $unblockButton = '[data-testid$="-unblock"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';

  const CONFIG = {
    maxUnblocks: Infinity,
    minDelay: 1000,
    maxDelay: 2500,
    scrollDelay: 1500,
    maxRetries: 5,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  let unblocked = 0;
  let retries = 0;

  const run = async () => {
    console.log('🔓 MASS UNBLOCK - XActions by nichxbt');

    if (!window.location.href.includes('/blocked')) {
      console.error('❌ Navigate to x.com/settings/blocked/all first!');
      return;
    }

    while (unblocked < CONFIG.maxUnblocks && retries < CONFIG.maxRetries) {
      const buttons = document.querySelectorAll($unblockButton);

      if (buttons.length === 0) {
        retries++;
        console.log(`⏳ No unblock buttons found, scrolling... (retry ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }

      retries = 0;

      for (const btn of buttons) {
        if (unblocked >= CONFIG.maxUnblocks) break;
        try {
          btn.click();
          await sleep(500);
          const confirmBtn = document.querySelector($confirmButton);
          if (confirmBtn) confirmBtn.click();
          unblocked++;
          if (unblocked % 10 === 0) {
            console.log(`🔓 Unblocked ${unblocked} users so far...`);
          }
          await sleep(randomDelay());
        } catch (e) {
          console.warn('⚠️ Failed to unblock a user, continuing...');
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Unblocked ${unblocked} users total.`);
  };

  run();
})();
