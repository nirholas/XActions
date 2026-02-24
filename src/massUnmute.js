// Mass Unmute All Users on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to https://x.com/settings/muted/all
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const $mutedUser = '[data-testid="UserCell"]';
  const $unmuteButton = '[data-testid$="-unmute"]';

  const CONFIG = {
    maxUnmutes: Infinity,
    minDelay: 800,
    maxDelay: 2000,
    scrollDelay: 1500,
    maxRetries: 5,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  let unmuted = 0;
  let retries = 0;

  const run = async () => {
    console.log('🔊 MASS UNMUTE - XActions by nichxbt');

    if (!window.location.href.includes('/muted')) {
      console.error('❌ Navigate to x.com/settings/muted/all first!');
      return;
    }

    while (unmuted < CONFIG.maxUnmutes && retries < CONFIG.maxRetries) {
      const buttons = document.querySelectorAll($unmuteButton);

      if (buttons.length === 0) {
        retries++;
        console.log(`⏳ No unmute buttons found, scrolling... (retry ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }

      retries = 0;

      for (const btn of buttons) {
        if (unmuted >= CONFIG.maxUnmutes) break;
        try {
          btn.click();
          unmuted++;
          if (unmuted % 10 === 0) {
            console.log(`🔊 Unmuted ${unmuted} users so far...`);
          }
          await sleep(randomDelay());
        } catch (e) {
          console.warn('⚠️ Failed to unmute a user, continuing...');
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Unmuted ${unmuted} users total.`);
  };

  run();
})();
