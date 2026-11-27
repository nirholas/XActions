// GENERATED FILE: a copy of browser/autoLiker.js, written by scripts/build-script-manifest.mjs. Edit browser/autoLiker.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * ❤️ Auto Liker
 * ============================================================
 * 
 * @name        autoLiker.js
 * @title       Auto Liker
 * @description Like posts in your timeline or on a profile that match keywords or authors, with a per-run and a daily cap.
 * @category    engage
 * @page        x.com/home or x.com/<username>
 * @writes      true
 * @aliases     src/automation/autoLiker.js, scripts/twitter/auto-liker.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to:
 *    - Your home timeline: https://x.com/home
 *    - OR any user's profile: https://x.com/username
 * 
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Customize the CONFIG below
 * 5. Paste browser/autoLiker.js and press Enter
 * 
 * Stop early: window.stopAutoLiker()
 * If src/automation/core.js was pasted first, its storage and daily
 * rate limiter are used (same keys either way).
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // ---- TARGETING ----
  
  // Like ALL tweets (ignores keywords filter)
  // 💡 Set to false to only like tweets matching keywords
  likeAll: false,
  
  // Only like tweets containing these words (case-insensitive)
  // 💡 Leave empty [] and set likeAll: true to like everything
  keywords: ['web3', 'crypto', 'AI', 'startup'],
  
  // Only like tweets from these specific users (leave empty for any user)
  // 💡 Example: ['elonmusk', 'naval']
  fromUsers: [],
  
  // Only like posts that already have at least this many likes (0 = any)
  minLikesOnPost: 0,
  
  // ---- LIMITS ----
  
  // Maximum tweets to like
  maxLikes: 20,
  
  // Daily cap across runs, kept in localStorage (xactions_ratelimit_like_day)
  maxLikesPerDay: 200,
  
  // Maximum scroll depth
  maxScrolls: 50,
  
  // ---- BEHAVIOR ----
  
  // Also retweet liked posts
  alsoRetweet: false,
  
  // Skip replies (only like original tweets)
  skipReplies: true,
  
  // Skip promoted/ad tweets
  skipAds: true,
  
  // Remember liked post IDs across runs (localStorage xactions_liked_tweets)
  // so a second run continues where the last one left off
  rememberLiked: false,
  
  // ---- TIMING ----
  
  // Random delay between likes (milliseconds)
  minDelay: 2000,
  maxDelay: 5000,
  
  // Scroll delay
  scrollDelay: 2000
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function autoLiker() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  
  // Storage and daily rate limit: core.js when pasted first, otherwise the
  // same localStorage keys core.js uses (prefix xactions_).
  const Core = (window.XActions && window.XActions.Core) || {};
  const storage = Core.storage || {
    get: (key) => {
      try {
        const data = localStorage.getItem('xactions_' + key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.warn('⚠️ Storage read failed:', e.message);
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('xactions_' + key, JSON.stringify(value));
      } catch (e) {
        console.warn('⚠️ Storage write failed:', e.message);
      }
    },
  };
  const rateLimit = Core.rateLimit || {
    check: (action, limit, period = 'hour') => {
      const data = storage.get(`ratelimit_${action}_${period}`) || { count: 0, timestamp: Date.now() };
      const periodMs = period === 'hour' ? 3600000 : 86400000;
      if (Date.now() - data.timestamp > periodMs) {
        data.count = 0;
        data.timestamp = Date.now();
      }
      return data.count < limit;
    },
    increment: (action, period = 'hour') => {
      const key = `ratelimit_${action}_${period}`;
      const data = storage.get(key) || { count: 0, timestamp: Date.now() };
      data.count++;
      storage.set(key, data);
    },
  };
  
  // Stop switch: window.stopAutoLiker() halts after the current post.
  let stopped = false;
  window.stopAutoLiker = () => {
    stopped = true;
    console.log('🛑 Stopping...');
  };
  
  // DOM Selectors
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $likeButton = '[data-testid="like"]';
  const $unlikeButton = '[data-testid="unlike"]';
  const $retweetButton = '[data-testid="retweet"]';
  const $confirmRetweet = '[data-testid="retweetConfirm"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ❤️ AUTO LIKER                                              ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🎯 Mode: ${CONFIG.likeAll ? 'Like ALL tweets' : 'Keyword filter'}`);
  if (!CONFIG.likeAll && CONFIG.keywords.length > 0) {
    console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}`);
  }
  if (CONFIG.fromUsers.length > 0) {
    console.log(`👤 From users: ${CONFIG.fromUsers.join(', ')}`);
  }
  console.log(`📊 Max likes: ${CONFIG.maxLikes} (daily cap ${CONFIG.maxLikesPerDay})`);
  console.log('🛑 Stop early: window.stopAutoLiker()');
  console.log('');
  
  const likedTweets = new Set(CONFIG.rememberLiked ? (storage.get('liked_tweets') || []) : []);
  let totalLiked = 0;
  let totalRetweeted = 0;
  let scrolls = 0;
  
  /**
   * Check if tweet matches filters
   */
  function matchesFilters(tweetEl) {
    const textEl = tweetEl.querySelector($tweetText);
    const text = textEl ? textEl.innerText.toLowerCase() : '';
    
    // Check if from specific users (User-Name block is the author; the first
    // profile link in the article can be a reposter's socialContext link)
    if (CONFIG.fromUsers.length > 0) {
      const userLink = tweetEl.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
                       tweetEl.querySelector('a[href^="/"]');
      const username = userLink ? userLink.getAttribute('href').replace('/', '').toLowerCase() : '';
      if (!CONFIG.fromUsers.some(u => u.toLowerCase() === username)) {
        return false;
      }
    }
    
    // Check keywords
    if (!CONFIG.likeAll && CONFIG.keywords.length > 0) {
      if (!CONFIG.keywords.some(k => text.includes(k.toLowerCase()))) {
        return false;
      }
    }
    
    // Skip replies (structural marker first; English text as fallback)
    if (CONFIG.skipReplies) {
      const isReply = tweetEl.querySelector('[data-testid="in-reply-to"]') !== null ||
        Array.from(tweetEl.querySelectorAll('div[dir]')).some(el =>
          el.innerText.startsWith('Replying to'));
      if (isReply) return false;
    }

    // Minimum likes already on the post (count from the like button's aria-label)
    if (CONFIG.minLikesOnPost > 0) {
      const btn = tweetEl.querySelector($likeButton) || tweetEl.querySelector($unlikeButton);
      const match = (btn?.getAttribute('aria-label') || '').match(/(\d[\d,]*)/);
      const likes = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
      if (likes < CONFIG.minLikesOnPost) return false;
    }

    // Skip ads: placementTracking wraps promoted tweets; the label check needs
    // an exact span match ("Ad" as a substring hits words like "Advice")
    if (CONFIG.skipAds) {
      const isAd = tweetEl.querySelector('[data-testid="placementTracking"]') !== null ||
        Array.from(tweetEl.querySelectorAll('span')).some(s => {
          const t = s.innerText.trim();
          return t === 'Ad' || t === 'Promoted';
        });
      if (isAd) return false;
    }
    
    return true;
  }
  
  /**
   * Get tweet ID
   */
  function getTweetId(tweetEl) {
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const timeEl = tweetEl.querySelector('time');
    const link = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                 tweetEl.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  }
  
  console.log('🚀 Starting auto-liker...');
  console.log('');
  
  let dailyCapHit = false;
  while (totalLiked < CONFIG.maxLikes && scrolls < CONFIG.maxScrolls && !stopped && !dailyCapHit) {
    const tweets = document.querySelectorAll($tweet);
    
    for (const tweet of tweets) {
      if (totalLiked >= CONFIG.maxLikes || stopped) break;
      if (!rateLimit.check('like', CONFIG.maxLikesPerDay, 'day')) {
        console.warn(`⚠️ Daily like cap reached (${CONFIG.maxLikesPerDay}). Run again tomorrow.`);
        dailyCapHit = true;
        break;
      }
      
      const tweetId = getTweetId(tweet);
      if (!tweetId || likedTweets.has(tweetId)) continue;
      
      // Check if already liked
      const unlikeBtn = tweet.querySelector($unlikeButton);
      if (unlikeBtn) {
        likedTweets.add(tweetId);
        continue;
      }
      
      // Check filters
      if (!matchesFilters(tweet)) continue;
      
      // Find like button
      const likeBtn = tweet.querySelector($likeButton);
      if (!likeBtn) continue;
      
      try {
        // Like the tweet
        likeBtn.click();
        likedTweets.add(tweetId);
        totalLiked++;
        rateLimit.increment('like', 'day');
        if (CONFIG.rememberLiked) storage.set('liked_tweets', Array.from(likedTweets));
        
        const textEl = tweet.querySelector($tweetText);
        const preview = textEl ? textEl.innerText.substring(0, 40) + '...' : '[No text]';
        console.log(`❤️ Liked #${totalLiked}: "${preview}"`);
        
        // Also retweet if enabled
        if (CONFIG.alsoRetweet) {
          await sleep(1000);
          const rtBtn = tweet.querySelector($retweetButton);
          if (rtBtn) {
            rtBtn.click();
            await sleep(500);
            const confirmBtn = document.querySelector($confirmRetweet);
            if (confirmBtn) {
              confirmBtn.click();
              totalRetweeted++;
              console.log(`   🔄 Retweeted`);
            }
          }
        }
        
        await sleep(randomDelay());
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    if (stopped || dailyCapHit) break;
    
    // Scroll for more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
    
    if (scrolls % 10 === 0) {
      console.log(`📜 Scrolled ${scrolls} times, liked ${totalLiked}...`);
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ AUTO LIKER COMPLETE!                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`❤️ Total liked: ${totalLiked}`);
  if (CONFIG.alsoRetweet) {
    console.log(`🔄 Total retweeted: ${totalRetweeted}`);
  }
  if (CONFIG.rememberLiked) console.log('💾 Session saved. Run again to continue where you left off.');
  console.log('');
  
  return { liked: totalLiked, retweeted: totalRetweeted };
})();
