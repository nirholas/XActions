// scripts/postThread.js
// Browser console script for posting a thread of connected tweets on X/Twitter
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    thread: [
      'Tweet 1 🧵',
      'Tweet 2',
      'Final tweet!',
    ],
    dryRun: true,              // SET FALSE TO ACTUALLY POST
    delayBetweenTweets: 2000,  // ms between adding each tweet
  };
  // =============================================

  const typeIntoInput = async (input, text) => {
    input.focus();
    await sleep(100);
    document.execCommand('insertText', false, text);
    await sleep(200);
  };

  const run = async () => {
    console.log('🧵 POST THREAD — XActions by nichxbt');

    if (CONFIG.thread.length === 0) {
      console.log('❌ No thread content! Edit CONFIG.thread array.');
      return;
    }

    // Validate character counts
    const overLimit = CONFIG.thread.filter((t, i) => {
      if (t.length > 280) {
        console.error(`❌ Tweet ${i + 1} exceeds 280 chars (${t.length})`);
        return true;
      }
      return false;
    });

    if (overLimit.length > 0) {
      console.error('🛑 Fix the above tweets before posting.');
      return;
    }

    console.log(`📋 Thread: ${CONFIG.thread.length} tweets`);
    CONFIG.thread.forEach((t, i) => {
      console.log(`   ${i + 1}. (${t.length}/280) ${t.substring(0, 60)}${t.length > 60 ? '...' : ''}`);
    });

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE — Set CONFIG.dryRun = false to actually post');
      return;
    }

    // Open compose dialog
    const composeBtn = document.querySelector('a[data-testid="SideNav_NewTweet_Button"]');
    if (composeBtn) {
      composeBtn.click();
      await sleep(1500);
    }

    // Type first tweet
    const firstInput = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!firstInput) {
      console.error('❌ Compose box not found! Try clicking the compose button manually.');
      return;
    }

    await typeIntoInput(firstInput, CONFIG.thread[0]);
    console.log(`✅ Tweet 1/${CONFIG.thread.length} typed`);

    // Add remaining tweets via the "+" button
    for (let i = 1; i < CONFIG.thread.length; i++) {
      await sleep(CONFIG.delayBetweenTweets);

      const addBtn = document.querySelector('[data-testid="addButton"]');
      if (!addBtn) {
        console.error(`❌ Add-tweet button not found for tweet ${i + 1}`);
        break;
      }

      addBtn.click();
      await sleep(1000);

      // Grab the newest textarea
      const inputs = document.querySelectorAll('[data-testid^="tweetTextarea_"]');
      const newInput = inputs[inputs.length - 1];

      if (!newInput) {
        console.error(`❌ Input field for tweet ${i + 1} not found`);
        break;
      }

      await typeIntoInput(newInput, CONFIG.thread[i]);
      console.log(`✅ Tweet ${i + 1}/${CONFIG.thread.length} typed`);
    }

    // Post the entire thread
    await sleep(1000);
    const postBtn = document.querySelector('[data-testid="tweetButton"]') ||
                    document.querySelector('[data-testid="tweetButtonInline"]');
    if (postBtn) {
      postBtn.click();
      console.log(`\n🧵 Thread posted! ${CONFIG.thread.length} tweets sent.`);
    } else {
      console.error('❌ Post button not found. Thread is typed — click "Post all" manually.');
    }
  };

  run();
})();
