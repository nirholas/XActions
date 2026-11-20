// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Like Posts on X - by nichxbt
// https://github.com/nirholas/xactions
// Like specific posts by URL or like visible posts matching keywords
// 1. Go to x.com (timeline, search, or profile page)
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below
// 4. Paste and run
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── Mode: 'urls' or 'keywords' ──
    mode: 'keywords',           // 'urls' = like specific posts, 'keywords' = like matching posts on page

    // ── URL Mode Settings ──
    postUrls: [
      // 'https://x.com/nichxbt/status/123456789',
    ],

    // ── Keyword Mode Settings ──
    keywords: [
      // 'AI agents',
      // 'open source',
    ],
    matchAll: false,            // true = post must contain ALL keywords, false = any keyword

    // ── Limits ──
    maxLikes: 20,               // Max posts to like per run
    maxScrollAttempts: 15,      // Max scrolls to find more posts (keyword mode)

    // ── Safety Filters ──
    skipAlreadyLiked: true,     // Skip posts you already liked
    minLikes: 0,                // Only like posts with at least this many existing likes
    skipReplies: false,         // Skip reply tweets

    // ── Timing ──
    minDelay: 1500,
    maxDelay: 3000,
    scrollDelay: 2000,
    navigationDelay: 3000,

    // ── Tracking ──
    trackLiked: true,           // Save liked posts to sessionStorage
  };

  // ── Selectors ──
  const SEL = {
    tweet:       'article[data-testid="tweet"]',
    tweetText:   '[data-testid="tweetText"]',
    like:        '[data-testid="like"]',
    unlike:      '[data-testid="unlike"]',
    reply:       '[data-testid="reply"]',
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

  let liked = 0;
  const processedTweets = new Set();
  const likedPosts = [];

  // ── Check if Post Matches Keywords ──
  const matchesKeywords = (tweetEl) => {
    if (CONFIG.keywords.length === 0) return true;

    const textEl = tweetEl.querySelector(SEL.tweetText);
    const text = textEl?.textContent?.toLowerCase() || '';

    if (CONFIG.matchAll) {
      return CONFIG.keywords.every(kw => text.includes(kw.toLowerCase()));
    }
    return CONFIG.keywords.some(kw => text.includes(kw.toLowerCase()));
  };

  // ── Get Tweet Identifier ──
  const getTweetId = (tweetEl) => {
    const timeLink = tweetEl.querySelector('a[href*="/status/"] time')?.closest('a');
    return timeLink?.getAttribute('href') || null;
  };

  // ── Check if Tweet is a Reply ──
  const isReply = (tweetEl) => {
    // Replies typically have "Replying to" text
    const replyingTo = tweetEl.querySelector('div[id^="id__"]');
    return replyingTo?.textContent?.includes('Replying to') || false;
  };

  // ── Like a Single Tweet Element ──
  const likeTweet = async (tweetEl) => {
    const likeBtn = tweetEl.querySelector(SEL.like);
    if (!likeBtn) {
      // Check if already liked
      const unlikeBtn = tweetEl.querySelector(SEL.unlike);
      if (unlikeBtn && CONFIG.skipAlreadyLiked) {
        return 'already_liked';
      }
      return 'no_button';
    }

    // Get like count for min check
    const likeCountEl = likeBtn.querySelector('[data-testid="app-text-transition-container"]');
    const currentLikes = parseCount(likeCountEl?.textContent);
    if (currentLikes < CONFIG.minLikes) {
      return 'below_min';
    }

    likeBtn.click();
    await sleep(randomDelay());

    // Verify like was registered
    const unlikeBtn = tweetEl.querySelector(SEL.unlike);
    if (unlikeBtn) {
      return 'success';
    }
    return 'failed';
  };

  // ── Mode: Like by URLs ──
  const likeByUrls = async () => {
    if (CONFIG.postUrls.length === 0) {
      console.error('❌ Please add post URLs to CONFIG.postUrls.');
      return;
    }

    console.log(`🔄 Liking ${CONFIG.postUrls.length} specific posts...`);

    for (const url of CONFIG.postUrls) {
      if (liked >= CONFIG.maxLikes) {
        console.log(`🛑 Reached max likes limit (${CONFIG.maxLikes}).`);
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

      const result = await likeTweet(tweet);
      if (result === 'success') {
        liked++;
        likedPosts.push(url);
        console.log(`✅ Liked! (${liked}/${CONFIG.maxLikes})`);
      } else if (result === 'already_liked') {
        console.log(`⏭️  Already liked: ${url}`);
      } else {
        console.warn(`⚠️  Could not like: ${url} (${result})`);
      }
    }
  };

  // ── Mode: Like by Keywords ──
  const likeByKeywords = async () => {
    console.log(`🔄 Liking posts matching: ${CONFIG.keywords.length > 0 ? CONFIG.keywords.join(', ') : '(all visible posts)'}...`);
    let scrollAttempts = 0;

    while (liked < CONFIG.maxLikes && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll(SEL.tweet);

      for (const tweet of tweets) {
        if (liked >= CONFIG.maxLikes) break;

        const tweetId = getTweetId(tweet);
        if (!tweetId || processedTweets.has(tweetId)) continue;
        processedTweets.add(tweetId);

        // Skip replies if configured
        if (CONFIG.skipReplies && isReply(tweet)) {
          continue;
        }

        // Check keyword match
        if (!matchesKeywords(tweet)) {
          continue;
        }

        const result = await likeTweet(tweet);
        if (result === 'success') {
          liked++;
          const textEl = tweet.querySelector(SEL.tweetText);
          const preview = textEl?.textContent?.substring(0, 60) || '(no text)';
          likedPosts.push({ url: `https://x.com${tweetId}`, preview });
          console.log(`✅ Liked (${liked}/${CONFIG.maxLikes}): "${preview}..."`);
        } else if (result === 'already_liked') {
          // Silently skip
        } else if (result === 'below_min') {
          // Silently skip low-engagement posts
        }
      }

      // Scroll for more
      const prevLiked = liked;
      window.scrollBy(0, window.innerHeight * 2);
      await sleep(CONFIG.scrollDelay);

      if (liked === prevLiked) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0;
      }
    }
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('❤️  XActions — Like Posts');
    console.log('═══════════════════════════════════════');

    if (CONFIG.mode === 'urls') {
      await likeByUrls();
    } else if (CONFIG.mode === 'keywords') {
      await likeByKeywords();
    } else {
      console.error(`❌ Invalid mode: "${CONFIG.mode}". Use 'urls' or 'keywords'.`);
      return;
    }

    // ── Summary ──
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Liked ${liked} posts.`);

    // Save tracking data
    if (CONFIG.trackLiked) {
      const history = JSON.parse(sessionStorage.getItem('xactions_liked') || '[]');
      history.push({
        timestamp: new Date().toISOString(),
        mode: CONFIG.mode,
        count: liked,
        posts: likedPosts,
      });
      sessionStorage.setItem('xactions_liked', JSON.stringify(history));
      console.log('💾 Saved to sessionStorage (key: "xactions_liked")');
    }

    if (likedPosts.length > 0) {
      console.log('\n📋 Liked Posts:');
      likedPosts.forEach((p, i) => {
        if (typeof p === 'string') {
          console.log(`   ${i + 1}. ${p}`);
        } else {
          console.log(`   ${i + 1}. ${p.preview}`);
        }
      });
    }

    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');
  };

  run();
})();
