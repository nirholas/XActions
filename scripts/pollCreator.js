// scripts/pollCreator.js
// Browser console script to create polls on X/Twitter
// Paste in DevTools console on x.com/compose/tweet
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURE YOUR POLL HERE
  // =============================================
  const POLL = {
    question: 'What is the best programming language in 2026?',
    options: ['TypeScript', 'Python', 'Rust', 'Go'], // 2-4 options
    // Duration defaults: 1 day. Customize below if needed.
    // durationDays: 1, durationHours: 0, durationMinutes: 0,
  };
  // =============================================

  const SELECTORS = {
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    addPoll: '[aria-label="Add poll"]',
    pollOption: (i) => `[data-testid="pollOption_${i}"]`,
    addPollOption: '[data-testid="addPollOption"]',
  };

  const typeText = async (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.focus();
    await sleep(200);
    for (const char of text) {
      document.execCommand('insertText', false, char);
      await sleep(10);
    }
    return true;
  };

  const run = async () => {
    console.log('📊 XActions Poll Creator');
    console.log('========================');

    if (POLL.options.length < 2 || POLL.options.length > 4) {
      console.log('❌ Polls require 2-4 options');
      return;
    }

    // Navigate to compose if needed
    if (!document.querySelector(SELECTORS.tweetTextarea)) {
      document.querySelector('a[data-testid="SideNav_NewTweet_Button"]')?.click();
      await sleep(2000);
    }

    // Type question
    console.log(`📝 Question: "${POLL.question}"`);
    await typeText(SELECTORS.tweetTextarea, POLL.question);
    await sleep(500);

    // Open poll interface
    const pollBtn = document.querySelector(SELECTORS.addPoll);
    if (!pollBtn) {
      console.log('❌ Poll button not found. Make sure you\'re on the compose page.');
      return;
    }
    pollBtn.click();
    await sleep(1500);
    console.log('✅ Poll interface opened');

    // Fill in options
    for (let i = 0; i < POLL.options.length; i++) {
      if (i >= 2) {
        // Add extra option slots
        const addBtn = document.querySelector(SELECTORS.addPollOption);
        if (addBtn) {
          addBtn.click();
          await sleep(500);
        }
      }

      const success = await typeText(SELECTORS.pollOption(i), POLL.options[i]);
      if (success) {
        console.log(`  ✅ Option ${i + 1}: "${POLL.options[i]}"`);
      } else {
        console.log(`  ⚠️ Option ${i + 1}: Could not fill`);
      }
      await sleep(300);
    }

    console.log('\n📊 Poll ready to post!');
    console.log('   Click "Post" or run:');
    console.log('   document.querySelector(\'[data-testid="tweetButton"]\')?.click()');
  };

  run();
})();
