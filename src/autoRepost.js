// Auto Repost (Retweet) on X - by nichxbt
// https://github.com/nirholas/xactions
// Automatically repost tweets matching keywords or from specific users
// 1. Go to x.com/home or x.com/search
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Filter criteria (at least one must match)
    keywords: [
      // 'AI agents',
      // 'open source',
    ],
    fromUsers: [
      // 'elonmusk',
      // 'nichxbt',
    ],
    maxReposts: 20,
    minDelay: 2000,
    maxDelay: 4000,
    scrollDelay: 2000,
    maxScrollAttempts: 20,
    // Safety
    skipReplies: true,
    skipSensitive: true,
    minLikes: 5, // Only repost tweets with at least this many likes
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $retweetButton = '[data-testid="retweet"]';
  const $retweetConfirm = '[data-testid="retweetConfirm"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2]) num *= { K: 1000, M: 1000000, B: 1000000000 }[match[2].toUpperCase()];
    return Math.round(num);
  };

  let reposted = 0;
  const processedTweets = new Set();

  const matchesCriteria = (tweetEl) => {
    const textEl = tweetEl.querySelector($tweetText);
    const text = textEl?.textContent?.toLowerCase() || '';

    // Check username
    const userLink = tweetEl.querySelector('a[href^="/"][role="link"]');
    const username = userLink?.href?.match(/x\.com\/([^\/]+)/)?.[1]?.toLowerCase() || '';

    const matchesKeyword = CONFIG.keywords.length === 0 || CONFIG.keywords.some(kw => text.includes(kw.toLowerCase()));
    const matchesUser = CONFIG.fromUsers.length === 0 || CONFIG.fromUsers.some(u => u.toLowerCase() === username);

    // Need at least one filter active and matching
    if (CONFIG.keywords.length > 0 && CONFIG.fromUsers.length > 0) {
      return matchesKeyword || matchesUser;
    }
    if (CONFIG.keywords.length > 0) return matchesKeyword;
    if (CONFIG.fromUsers.length > 0) return matchesUser;
    return true;
  };

  const run = async () => {
    console.log('🔄 AUTO REPOST - XActions by nichxbt');

    if (CONFIG.keywords.length === 0 && CONFIG.fromUsers.length === 0) {
      console.error('❌ No filters! Edit CONFIG.keywords or CONFIG.fromUsers');
      return;
    }

    console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ') || 'none'}`);
    console.log(`👤 Users: ${CONFIG.fromUsers.join(', ') || 'none'}`);
    console.log(`📊 Max reposts: ${CONFIG.maxReposts}\n`);

    let scrollAttempts = 0;

    while (reposted < CONFIG.maxReposts && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll($tweet);
      let foundNew = false;

      for (const tweet of tweets) {
        if (reposted >= CONFIG.maxReposts) break;

        const tweetLink = tweet.querySelector('a[href*="/status/"]')?.href || '';
        if (processedTweets.has(tweetLink)) continue;
        processedTweets.add(tweetLink);
        foundNew = true;

        // Skip if already retweeted
        if (tweet.querySelector('[data-testid="unretweet"]')) continue;

        // Check likes threshold
        const likeEl = tweet.querySelector($like);
        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        if (likes < CONFIG.minLikes) continue;

        if (!matchesCriteria(tweet)) continue;

        try {
          const rtBtn = tweet.querySelector($retweetButton);
          if (!rtBtn) continue;

          rtBtn.click();
          await sleep(800);

          const confirmBtn = document.querySelector($retweetConfirm);
          if (confirmBtn) {
            confirmBtn.click();
            reposted++;
            const text = tweet.querySelector($tweetText)?.textContent?.substring(0, 50) || '';
            console.log(`🔄 Reposted (${reposted}/${CONFIG.maxReposts}): "${text}..."`);
          } else {
            document.body.click(); // Close menu
          }

          await sleep(randomDelay());
        } catch (e) {
          document.body.click();
        }
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Reposted ${reposted} tweets.`);
  };

  run();
})();
