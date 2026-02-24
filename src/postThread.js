// Post Thread on X - by nichxbt
// https://github.com/nirholas/xactions
// Compose and post a thread of connected tweets
// 1. Go to x.com
// 2. Open the Developer Console (F12)
// 3. Edit the THREAD array below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    thread: [
      // Add your thread posts here (in order)
      // 'First tweet in the thread 🧵',
      // 'Second tweet continues the thought...',
      // 'Final tweet wraps it up!',
    ],
    delayBetweenTweets: 2000,
    dryRun: true, // Set to false to actually post
  };

  const $composeButton = '[data-testid="SideNav_NewTweet_Button"]';
  const $tweetInput = '[data-testid="tweetTextarea_0"]';
  const $addThreadButton = '[data-testid="addButton"]'; // The "+" button to add another tweet
  const $tweetButton = '[data-testid="tweetButtonInline"]';
  const $tweetAllButton = '[data-testid="tweetButton"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const typeIntoInput = async (input, text) => {
    input.focus();
    await sleep(100);
    document.execCommand('insertText', false, text);
    await sleep(200);
  };

  const run = async () => {
    console.log('🧵 POST THREAD - XActions by nichxbt');

    if (CONFIG.thread.length === 0) {
      console.log('❌ No thread content! Edit CONFIG.thread array.');
      console.log('\nExample:');
      console.log('  thread: [');
      console.log('    "First tweet in the thread 🧵",');
      console.log('    "Second tweet continues...",');
      console.log('    "Final tweet! 🎉",');
      console.log('  ]');
      return;
    }

    // Validate character counts
    const invalid = CONFIG.thread.filter((t, i) => {
      if (t.length > 280) {
        console.error(`❌ Tweet ${i + 1} exceeds 280 chars (${t.length})`);
        return true;
      }
      return false;
    });

    if (invalid.length > 0) {
      console.error('Fix the above tweets before posting.');
      return;
    }

    console.log(`📋 Thread: ${CONFIG.thread.length} tweets`);
    CONFIG.thread.forEach((t, i) => {
      console.log(`   ${i + 1}. (${t.length}/280) ${t.substring(0, 60)}${t.length > 60 ? '...' : ''}`);
    });

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually post');
      return;
    }

    // Open compose
    const composeBtn = document.querySelector($composeButton);
    if (composeBtn) {
      composeBtn.click();
      await sleep(1500);
    }

    // Type first tweet
    const firstInput = document.querySelector($tweetInput);
    if (!firstInput) {
      console.error('❌ Compose box not found! Try clicking the compose button manually.');
      return;
    }

    await typeIntoInput(firstInput, CONFIG.thread[0]);
    console.log(`✅ Tweet 1/${CONFIG.thread.length} typed`);

    // Add remaining tweets
    for (let i = 1; i < CONFIG.thread.length; i++) {
      await sleep(CONFIG.delayBetweenTweets);

      // Click the "+" button to add next tweet in thread
      const addBtn = document.querySelector($addThreadButton);
      if (!addBtn) {
        console.error(`❌ Could not find add-tweet button for tweet ${i + 1}`);
        break;
      }

      addBtn.click();
      await sleep(1000);

      // Find the new (latest) input field
      const inputs = document.querySelectorAll('[data-testid^="tweetTextarea_"]');
      const newInput = inputs[inputs.length - 1];

      if (!newInput) {
        console.error(`❌ Input field for tweet ${i + 1} not found`);
        break;
      }

      await typeIntoInput(newInput, CONFIG.thread[i]);
      console.log(`✅ Tweet ${i + 1}/${CONFIG.thread.length} typed`);
    }

    // Post the thread
    await sleep(1000);
    const postBtn = document.querySelector($tweetAllButton) || document.querySelector($tweetButton);
    if (postBtn) {
      postBtn.click();
      console.log(`\n🧵 Thread posted! ${CONFIG.thread.length} tweets.`);
    } else {
      console.error('❌ Post button not found. Thread is typed but not posted.');
      console.log('💡 Click "Post all" manually to publish.');
    }
  };

  run();
})();
