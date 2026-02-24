// scripts/postComposer.js
// Browser console script to compose and post tweets, threads, and polls
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURE YOUR POST HERE
  // =============================================
  const MODE = 'tweet'; // 'tweet', 'thread', or 'poll'

  // For single tweet
  const TWEET_TEXT = 'Hello from XActions! 🚀';

  // For thread
  const THREAD_TWEETS = [
    '🧵 Thread: Why automation matters (1/3)',
    'Automation saves hours of manual work and lets you focus on what matters — creating great content. (2/3)',
    'Try XActions for free at github.com/nirholas/XActions ⚡ (3/3)',
  ];

  // For poll
  const POLL_QUESTION = 'What is your favorite programming language?';
  const POLL_OPTIONS = ['JavaScript', 'Python', 'TypeScript', 'Rust'];
  // =============================================

  const SELECTORS = {
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    addThread: '[data-testid="addButton"]',
    addPoll: '[aria-label="Add poll"]',
    pollOption: (i) => `[data-testid="pollOption_${i}"]`,
    addPollOption: '[data-testid="addPollOption"]',
  };

  const typeInTextarea = async (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.focus();
    await sleep(200);

    // Simulate typing for React
    for (const char of text) {
      el.dispatchEvent(new InputEvent('beforeinput', { data: char, inputType: 'insertText', bubbles: true }));
      document.execCommand('insertText', false, char);
      await sleep(10);
    }
    return true;
  };

  const postTweet = async () => {
    console.log('📝 Posting tweet...');

    // Navigate to compose if not already there
    if (!document.querySelector(SELECTORS.tweetTextarea)) {
      document.querySelector('a[data-testid="SideNav_NewTweet_Button"]')?.click();
      await sleep(2000);
    }

    await typeInTextarea(SELECTORS.tweetTextarea, TWEET_TEXT);
    await sleep(500);

    document.querySelector(SELECTORS.tweetButton)?.click();
    await sleep(3000);

    console.log('✅ Tweet posted!');
  };

  const postThread = async () => {
    console.log(`🧵 Posting thread (${THREAD_TWEETS.length} tweets)...`);

    // Navigate to compose
    if (!document.querySelector(SELECTORS.tweetTextarea)) {
      document.querySelector('a[data-testid="SideNav_NewTweet_Button"]')?.click();
      await sleep(2000);
    }

    for (let i = 0; i < THREAD_TWEETS.length; i++) {
      if (i > 0) {
        document.querySelector(SELECTORS.addThread)?.click();
        await sleep(1000);
      }

      const textareaSel = `[data-testid="tweetTextarea_${i}"]`;
      const textarea = document.querySelector(textareaSel) || document.querySelector(SELECTORS.tweetTextarea);
      if (textarea) {
        textarea.focus();
        await sleep(200);
        for (const char of THREAD_TWEETS[i]) {
          document.execCommand('insertText', false, char);
          await sleep(5);
        }
      }
      await sleep(500);
      console.log(`  ✅ Tweet ${i + 1}/${THREAD_TWEETS.length} composed`);
    }

    document.querySelector(SELECTORS.tweetButton)?.click();
    await sleep(3000);

    console.log('🎉 Thread posted!');
  };

  const postPoll = async () => {
    console.log('📊 Creating poll...');

    if (!document.querySelector(SELECTORS.tweetTextarea)) {
      document.querySelector('a[data-testid="SideNav_NewTweet_Button"]')?.click();
      await sleep(2000);
    }

    // Type question
    await typeInTextarea(SELECTORS.tweetTextarea, POLL_QUESTION);
    await sleep(500);

    // Open poll
    document.querySelector(SELECTORS.addPoll)?.click();
    await sleep(1500);

    // Fill options
    for (let i = 0; i < POLL_OPTIONS.length; i++) {
      if (i >= 2) {
        document.querySelector(SELECTORS.addPollOption)?.click();
        await sleep(500);
      }

      const optEl = document.querySelector(SELECTORS.pollOption(i));
      if (optEl) {
        optEl.focus();
        await sleep(200);
        for (const char of POLL_OPTIONS[i]) {
          document.execCommand('insertText', false, char);
          await sleep(10);
        }
      }
      await sleep(300);
    }

    document.querySelector(SELECTORS.tweetButton)?.click();
    await sleep(3000);

    console.log('✅ Poll posted!');
  };

  const run = async () => {
    console.log('⚡ XActions Post Composer');
    console.log('========================');

    switch (MODE) {
      case 'thread': return postThread();
      case 'poll': return postPoll();
      default: return postTweet();
    }
  };

  run();
})();
