// Delete All Reposts (Unretweet All) on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to https://x.com/YOUR_USERNAME
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const $unretweet = '[data-testid="unretweet"]';
  const $confirmUnretweet = '[data-testid="unretweetConfirm"]';
  const $tweet = 'article[data-testid="tweet"]';

  const CONFIG = {
    maxUnretweets: Infinity,
    minDelay: 1000,
    maxDelay: 2500,
    scrollDelay: 1500,
    maxRetries: 5,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  let removed = 0;
  let retries = 0;

  const run = async () => {
    console.log('🔄 CLEAR ALL REPOSTS - XActions by nichxbt');

    while (removed < CONFIG.maxUnretweets && retries < CONFIG.maxRetries) {
      const buttons = document.querySelectorAll($unretweet);

      if (buttons.length === 0) {
        retries++;
        console.log(`⏳ No repost buttons found, scrolling... (retry ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }

      retries = 0;

      for (const btn of buttons) {
        if (removed >= CONFIG.maxUnretweets) break;
        try {
          btn.click();
          await sleep(500);
          const confirmBtn = document.querySelector($confirmUnretweet);
          if (confirmBtn) confirmBtn.click();
          removed++;
          if (removed % 10 === 0) {
            console.log(`🔄 Removed ${removed} reposts so far...`);
          }
          await sleep(randomDelay());
        } catch (e) {
          console.warn('⚠️ Failed to remove a repost, continuing...');
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Removed ${removed} reposts total.`);
  };

  run();
})();
