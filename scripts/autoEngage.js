// scripts/autoEngage.js
// Browser console script for automated engagement on X/Twitter
// Auto-like, auto-reply, bookmark management
// Paste in DevTools console on x.com/home or any feed
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    mode: 'like',      // 'like', 'bookmark', or 'like+bookmark'
    keywords: [],       // Filter by keywords (empty = like all visible)
    maxActions: 20,     // Maximum number of actions
    delay: 2000,        // Delay between actions (ms)
    scrollAfter: 5,     // Scroll after N actions
  };
  // =============================================

  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    bookmarkButton: '[data-testid="bookmark"]',
    shareButton: '[data-testid="share"]',
  };

  let actionCount = 0;
  let processed = new Set();

  const matchesKeywords = (text) => {
    if (CONFIG.keywords.length === 0) return true;
    return CONFIG.keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  };

  const likeTweet = async (tweet) => {
    const likeBtn = tweet.querySelector(SELECTORS.likeButton);
    if (likeBtn) {
      likeBtn.click();
      return true;
    }
    return false;
  };

  const bookmarkTweet = async (tweet) => {
    const shareBtn = tweet.querySelector(SELECTORS.shareButton);
    if (shareBtn) {
      shareBtn.click();
      await sleep(500);
      const bookmarkBtn = document.querySelector('[data-testid="bookmark"], [role="menuitem"]');
      if (bookmarkBtn && bookmarkBtn.textContent.toLowerCase().includes('bookmark')) {
        bookmarkBtn.click();
        return true;
      }
    }
    return false;
  };

  const run = async () => {
    console.log('⚡ XActions Auto-Engager');
    console.log('========================');
    console.log(`Mode: ${CONFIG.mode}`);
    console.log(`Max: ${CONFIG.maxActions} actions`);
    console.log(`Keywords: ${CONFIG.keywords.length ? CONFIG.keywords.join(', ') : 'all'}`);
    console.log('');

    while (actionCount < CONFIG.maxActions) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);

      for (const tweet of tweets) {
        if (actionCount >= CONFIG.maxActions) break;

        // Create unique ID for tweet
        const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        const id = link || text.substring(0, 50);

        if (processed.has(id)) continue;
        processed.add(id);

        if (!matchesKeywords(text)) continue;

        // Already liked?
        if (tweet.querySelector(SELECTORS.unlikeButton)) continue;

        let success = false;

        if (CONFIG.mode === 'like' || CONFIG.mode === 'like+bookmark') {
          success = await likeTweet(tweet);
        }

        if (CONFIG.mode === 'bookmark' || CONFIG.mode === 'like+bookmark') {
          await sleep(500);
          success = await bookmarkTweet(tweet) || success;
        }

        if (success) {
          actionCount++;
          const preview = text.substring(0, 40);
          console.log(`${CONFIG.mode === 'bookmark' ? '🔖' : '❤️'} (${actionCount}/${CONFIG.maxActions}) ${preview}...`);
          await sleep(CONFIG.delay);
        }

        // Scroll periodically
        if (actionCount > 0 && actionCount % CONFIG.scrollAfter === 0) {
          window.scrollBy(0, 800);
          await sleep(1500);
        }
      }

      // Scroll for more tweets
      window.scrollBy(0, 1000);
      await sleep(2000);

      // Safety check
      if (document.querySelectorAll(SELECTORS.tweet).length === 0) {
        console.log('⚠️ No more tweets found');
        break;
      }
    }

    console.log(`\n🎉 Done! ${actionCount} actions completed.`);
  };

  run();
})();
