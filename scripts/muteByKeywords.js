// scripts/muteByKeywords.js
// Browser console script for muting users by tweet keywords on X/Twitter
// Paste in DevTools console on x.com (any timeline or search page)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    keywords: [
      // 'spam',
      // 'giveaway',
      // 'follow for follow',
    ],
    maxMutes: 10,             // Max users to mute
    delay: 2000,              // ms between mutes
    scrollDelay: 2000,        // ms to wait after scroll
    caseSensitive: false,     // Case-sensitive keyword matching
    maxScrollAttempts: 15,    // Give up after N scrolls with no new tweets
  };
  // =============================================

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

  const getUsernameFromTweet = (tweet) => {
    const link = tweet.querySelector('a[href^="/"][role="link"]');
    if (!link) return null;
    const match = link.href.match(/x\.com\/([^/]+)/);
    return match ? match[1] : null;
  };

  const run = async () => {
    console.log('🔇 MUTE BY KEYWORDS — XActions by nichxbt');

    if (CONFIG.keywords.length === 0) {
      console.error('❌ No keywords configured! Edit CONFIG.keywords array.');
      return;
    }

    console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}`);
    console.log(`⚙️ Max mutes: ${CONFIG.maxMutes} | Case sensitive: ${CONFIG.caseSensitive}`);

    while (mutedUsers.size < CONFIG.maxMutes && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      let foundNew = false;

      for (const tweet of tweets) {
        if (mutedUsers.size >= CONFIG.maxMutes) break;

        const tweetId = tweet.querySelector('a[href*="/status/"]')?.href || '';
        if (processedTweets.has(tweetId)) continue;
        processedTweets.add(tweetId);
        foundNew = true;

        const textEl = tweet.querySelector('[data-testid="tweetText"]');
        if (!textEl) continue;

        const text = textEl.textContent;
        if (!matchesKeywords(text)) continue;

        const username = getUsernameFromTweet(tweet);
        if (!username || mutedUsers.has(username)) continue;

        try {
          const caret = tweet.querySelector('[data-testid="caret"]');
          if (!caret) continue;

          caret.click();
          await sleep(800);

          const muteLink = document.querySelector('[data-testid="muteLink"]');
          if (muteLink) {
            muteLink.click();
            mutedUsers.add(username);
            const snippet = text.length > 40 ? text.substring(0, 40) + '...' : text;
            console.log(`🔇 Muted @${username} (matched: "${snippet}")`);
            await sleep(CONFIG.delay);
          } else {
            document.body.click();
            await sleep(300);
          }
        } catch (e) {
          document.body.click();
          await sleep(300);
        }
      }

      if (!foundNew) scrollAttempts++; else scrollAttempts = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Muted ${mutedUsers.size} users.`);
    if (mutedUsers.size > 0) {
      console.log('🔇 Muted users:', [...mutedUsers].join(', '));
    }
  };

  run();
})();
