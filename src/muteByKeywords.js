// Mute Users by Keywords on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to any X timeline or search page
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Mutes users whose posts contain specified keywords
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    keywords: [
      // Add keywords/phrases to match. Users posting these get muted.
      // 'spam',
      // 'giveaway',
      // 'follow for follow',
    ],
    maxMutes: 50,
    minDelay: 1500,
    maxDelay: 3000,
    scrollDelay: 2000,
    maxScrollAttempts: 20,
    caseSensitive: false,
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $moreButton = '[data-testid="caret"]'; // Three-dot on tweet
  const $muteOption = '[data-testid="muteLink"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const mutedUsers = new Set();
  const processedTweets = new Set();
  let scrollAttempts = 0;

  const matchesKeywords = (text) => {
    const t = CONFIG.caseSensitive ? text : text.toLowerCase();
    return CONFIG.keywords.some(kw => {
      const k = CONFIG.caseSensitive ? kw : kw.toLowerCase();
      return t.includes(k);
    });
  };

  const getUsernameFromTweet = (tweetEl) => {
    const link = tweetEl.querySelector('a[href^="/"][role="link"]');
    if (link) {
      const match = link.href.match(/x\.com\/([^\/]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const run = async () => {
    console.log('🔇 MUTE BY KEYWORDS - XActions by nichxbt');

    if (CONFIG.keywords.length === 0) {
      console.error('❌ No keywords configured! Edit CONFIG.keywords array.');
      return;
    }

    console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}`);
    console.log(`📊 Max mutes: ${CONFIG.maxMutes}`);

    while (mutedUsers.size < CONFIG.maxMutes && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll($tweet);
      let foundNew = false;

      for (const tweet of tweets) {
        const tweetId = tweet.querySelector('a[href*="/status/"]')?.href || '';
        if (processedTweets.has(tweetId)) continue;
        processedTweets.add(tweetId);
        foundNew = true;

        const textEl = tweet.querySelector($tweetText);
        if (!textEl) continue;

        const text = textEl.textContent;
        if (!matchesKeywords(text)) continue;

        const username = getUsernameFromTweet(tweet);
        if (!username || mutedUsers.has(username)) continue;

        try {
          // Click the three-dot menu on the tweet
          const caret = tweet.querySelector($moreButton);
          if (!caret) continue;

          caret.click();
          await sleep(800);

          // Find and click mute option
          const muteLink = document.querySelector($muteOption);
          if (muteLink) {
            muteLink.click();
            mutedUsers.add(username);
            console.log(`🔇 Muted @${username} (matched: "${text.substring(0, 50)}...")`);
            await sleep(randomDelay());
          } else {
            // Close menu if mute not found
            document.body.click();
            await sleep(300);
          }
        } catch (e) {
          document.body.click();
          await sleep(300);
        }
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Muted ${mutedUsers.size} users.`);
    console.log('Muted users:', [...mutedUsers].join(', '));
  };

  run();
})();
