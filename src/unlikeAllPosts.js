// Unlike All Posts on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to https://x.com/YOUR_USERNAME/likes
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const $unlikeButton = '[data-testid="unlike"]';
  const $tweet = 'article[data-testid="tweet"]';

  const CONFIG = {
    maxUnlikes: Infinity,
    minDelay: 800,
    maxDelay: 2000,
    scrollDelay: 1500,
    maxRetries: 5,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  let unliked = 0;
  let retries = 0;

  const run = async () => {
    console.log('💔 UNLIKE ALL POSTS - XActions by nichxbt');
    console.log(`📍 Page: ${window.location.href}`);

    if (!window.location.href.includes('/likes')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/likes first!');
      return;
    }

    while (unliked < CONFIG.maxUnlikes && retries < CONFIG.maxRetries) {
      const buttons = document.querySelectorAll($unlikeButton);

      if (buttons.length === 0) {
        retries++;
        console.log(`⏳ No unlike buttons found, scrolling... (retry ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }

      retries = 0;

      for (const btn of buttons) {
        if (unliked >= CONFIG.maxUnlikes) break;
        try {
          btn.click();
          unliked++;
          if (unliked % 10 === 0) {
            console.log(`💔 Unliked ${unliked} posts so far...`);
          }
          await sleep(randomDelay());
        } catch (e) {
          console.warn('⚠️ Failed to unlike a post, continuing...');
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Unliked ${unliked} posts total.`);
  };

  run();
})();
