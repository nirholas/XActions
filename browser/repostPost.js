// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Repost (Retweet) Posts on X - by nichxbt
// https://github.com/nirholas/xactions
// Repost specific posts by URL or bulk repost from search/timeline
// 1. Go to x.com (timeline, search results, or profile)
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below
// 4. Paste and run
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── Mode: 'urls', 'keywords', or 'unrepost' ──
    mode: 'keywords',           // 'urls' = repost specific posts
                                // 'keywords' = repost matching posts on page
                                // 'unrepost' = remove reposts by URL

    // ── URL Mode Settings ──
    postUrls: [
      // 'https://x.com/nichxbt/status/123456789',
    ],

    // ── Keyword Mode Settings ──
    keywords: [
      // 'AI agents',
      // 'open source',
    ],
    matchAll: false,            // true = must contain ALL keywords

    // ── Limits ──
    maxReposts: 10,             // Max reposts per run
    maxScrollAttempts: 15,      // Max scrolls for keyword mode

    // ── Safety ──
    skipAlreadyReposted: true,  // Skip posts you already reposted
    skipReplies: true,          // Skip reply tweets
    minLikes: 5,                // Only repost tweets with at least this many likes

    // ── Timing ──
    minDelay: 2000,
    maxDelay: 4000,
    scrollDelay: 2000,
    navigationDelay: 3000,

    // ── Tracking ──
    trackReposts: true,         // Save reposted posts to sessionStorage
  };

  // ── Selectors ──
  const SEL = {
    tweet:           'article[data-testid="tweet"]',
    tweetText:       '[data-testid="tweetText"]',
    retweet:         '[data-testid="retweet"]',
    retweetConfirm:  '[data-testid="retweetConfirm"]',
    unretweet:       '[data-testid="unretweet"]',
    unretweetConfirm:'[data-testid="unretweetConfirm"]',
    like:            '[data-testid="like"], [data-testid="unlike"]',
  };

  // ── Utilities ──
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const waitForElement = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

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
  const repostedPosts = [];

  // ── Get Tweet Identifier ──
  const getTweetId = (tweetEl) => {
    const timeLink = tweetEl.querySelector('a[href*="/status/"] time')?.closest('a');
    return timeLink?.getAttribute('href') || null;
  };

  // ── Check Keyword Match ──
  const matchesKeywords = (tweetEl) => {
    if (CONFIG.keywords.length === 0) return true;

    const textEl = tweetEl.querySelector(SEL.tweetText);
    const text = textEl?.textContent?.toLowerCase() || '';

    if (CONFIG.matchAll) {
      return CONFIG.keywords.every(kw => text.includes(kw.toLowerCase()));
    }
    return CONFIG.keywords.some(kw => text.includes(kw.toLowerCase()));
  };

  // ── Check if Reply ──
  const isReply = (tweetEl) => {
    const el = tweetEl.querySelector('div[id^="id__"]');
    return el?.textContent?.includes('Replying to') || false;
  };

  // ── Repost a Single Tweet ──
  const repostTweet = async (tweetEl) => {
    const retweetBtn = tweetEl.querySelector(SEL.retweet);
    if (!retweetBtn) {
      const unretweetBtn = tweetEl.querySelector(SEL.unretweet);
      if (unretweetBtn && CONFIG.skipAlreadyReposted) {
        return 'already_reposted';
      }
      return 'no_button';
    }

    // Check like count for min threshold
    const likeEl = tweetEl.querySelector(SEL.like);
    const likeCountEl = likeEl?.querySelector('[data-testid="app-text-transition-container"]');
    const currentLikes = parseCount(likeCountEl?.textContent);
    if (currentLikes < CONFIG.minLikes) {
      return 'below_min';
    }

    // Click repost button
    retweetBtn.click();
    await sleep(800);

    // Click "Repost" in the confirmation menu
    const confirmBtn = await waitForElement(SEL.retweetConfirm, 3000);
    if (!confirmBtn) {
      console.warn('⚠️  Repost confirmation menu not found.');
      return 'no_confirm';
    }

    confirmBtn.click();
    await sleep(randomDelay());

    // Verify repost
    const unretweetBtn = tweetEl.querySelector(SEL.unretweet);
    if (unretweetBtn) {
      return 'success';
    }
    return 'failed';
  };

  // ── Unrepost a Single Tweet ──
  const unrepostTweet = async (tweetEl) => {
    const unretweetBtn = tweetEl.querySelector(SEL.unretweet);
    if (!unretweetBtn) {
      return 'not_reposted';
    }

    unretweetBtn.click();
    await sleep(800);

    // Click confirm in menu
    const confirmBtn = await waitForElement(SEL.unretweetConfirm, 3000);
    if (confirmBtn) {
      confirmBtn.click();
    }
    await sleep(randomDelay());

    return 'success';
  };

  // ── Mode: Repost by URLs ──
  const repostByUrls = async () => {
    if (CONFIG.postUrls.length === 0) {
      console.error('❌ Please add post URLs to CONFIG.postUrls.');
      return;
    }

    console.log(`🔄 Reposting ${CONFIG.postUrls.length} specific posts...`);

    for (const url of CONFIG.postUrls) {
      if (reposted >= CONFIG.maxReposts) {
        console.log(`🛑 Reached max reposts limit (${CONFIG.maxReposts}).`);
        break;
      }

      console.log(`\n🔄 Navigating to: ${url}`);
      window.location.href = url;
      await sleep(CONFIG.navigationDelay);

      const tweet = await waitForElement(SEL.tweet);
      if (!tweet) {
        console.warn(`⚠️  Could not find tweet at ${url}`);
        continue;
      }

      const result = await repostTweet(tweet);
      if (result === 'success') {
        reposted++;
        repostedPosts.push(url);
        console.log(`✅ Reposted! (${reposted}/${CONFIG.maxReposts})`);
      } else if (result === 'already_reposted') {
        console.log(`⏭️  Already reposted: ${url}`);
      } else {
        console.warn(`⚠️  Could not repost: ${url} (${result})`);
      }
    }
  };

  // ── Mode: Repost by Keywords ──
  const repostByKeywords = async () => {
    console.log(`🔄 Reposting posts matching: ${CONFIG.keywords.length > 0 ? CONFIG.keywords.join(', ') : '(all visible)'}...`);
    let scrollAttempts = 0;

    while (reposted < CONFIG.maxReposts && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll(SEL.tweet);

      for (const tweet of tweets) {
        if (reposted >= CONFIG.maxReposts) break;

        const tweetId = getTweetId(tweet);
        if (!tweetId || processedTweets.has(tweetId)) continue;
        processedTweets.add(tweetId);

        // Skip replies
        if (CONFIG.skipReplies && isReply(tweet)) continue;

        // Check keyword match
        if (!matchesKeywords(tweet)) continue;

        const result = await repostTweet(tweet);
        if (result === 'success') {
          reposted++;
          const textEl = tweet.querySelector(SEL.tweetText);
          const preview = textEl?.textContent?.substring(0, 60) || '(no text)';
          repostedPosts.push({ url: `https://x.com${tweetId}`, preview });
          console.log(`✅ Reposted (${reposted}/${CONFIG.maxReposts}): "${preview}..."`);
        }
      }

      // Scroll for more
      const prevReposted = reposted;
      window.scrollBy(0, window.innerHeight * 2);
      await sleep(CONFIG.scrollDelay);

      if (reposted === prevReposted) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0;
      }
    }
  };

  // ── Mode: Unrepost by URLs ──
  const unrepostByUrls = async () => {
    if (CONFIG.postUrls.length === 0) {
      console.error('❌ Please add post URLs to CONFIG.postUrls.');
      return;
    }

    console.log(`🔄 Removing reposts for ${CONFIG.postUrls.length} posts...`);
    let removed = 0;

    for (const url of CONFIG.postUrls) {
      console.log(`\n🔄 Navigating to: ${url}`);
      window.location.href = url;
      await sleep(CONFIG.navigationDelay);

      const tweet = await waitForElement(SEL.tweet);
      if (!tweet) {
        console.warn(`⚠️  Could not find tweet at ${url}`);
        continue;
      }

      const result = await unrepostTweet(tweet);
      if (result === 'success') {
        removed++;
        console.log(`✅ Unreposted: ${url}`);
      } else {
        console.log(`⏭️  Not reposted: ${url}`);
      }
    }

    console.log(`\n✅ Removed ${removed} reposts.`);
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('🔁 XActions — Repost / Unrepost Posts');
    console.log('═══════════════════════════════════════');

    switch (CONFIG.mode) {
      case 'urls':
        await repostByUrls();
        break;
      case 'keywords':
        await repostByKeywords();
        break;
      case 'unrepost':
        await unrepostByUrls();
        break;
      default:
        console.error(`❌ Invalid mode: "${CONFIG.mode}". Use 'urls', 'keywords', or 'unrepost'.`);
        return;
    }

    // ── Summary ──
    console.log('');
    console.log('═══════════════════════════════════════');
    if (CONFIG.mode !== 'unrepost') {
      console.log(`✅ Reposted ${reposted} posts.`);
    }

    // Save tracking data
    if (CONFIG.trackReposts && repostedPosts.length > 0) {
      const history = JSON.parse(sessionStorage.getItem('xactions_reposts') || '[]');
      history.push({
        timestamp: new Date().toISOString(),
        mode: CONFIG.mode,
        count: reposted,
        posts: repostedPosts,
      });
      sessionStorage.setItem('xactions_reposts', JSON.stringify(history));
      console.log('💾 Saved to sessionStorage (key: "xactions_reposts")');
    }

    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');
  };

  run();
})();
