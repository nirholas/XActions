/**
 * ============================================================
 * ❤️ Auto Liker
 * ============================================================
 * 
 * @name        auto-liker.js
 * @description Automatically like tweets in your timeline or on a profile
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
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
 * 5. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
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
  
  // ---- LIMITS ----
  
  // Maximum tweets to like
  maxLikes: 20,
  
  // Maximum scroll depth
  maxScrolls: 50,
  
  // ---- BEHAVIOR ----
  
  // Also retweet liked posts
  alsoRetweet: false,
  
  // Skip replies (only like original tweets)
  skipReplies: true,
  
  // Skip promoted/ad tweets
  skipAds: true,
  
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
  console.log(`📊 Max likes: ${CONFIG.maxLikes}`);
  console.log('');
  
  const likedTweets = new Set();
  let totalLiked = 0;
  let totalRetweeted = 0;
  let scrolls = 0;
  
  /**
   * Check if tweet matches filters
   */
  function matchesFilters(tweetEl) {
    const textEl = tweetEl.querySelector($tweetText);
    const text = textEl ? textEl.innerText.toLowerCase() : '';
    
    // Check if from specific users
    if (CONFIG.fromUsers.length > 0) {
      const userLink = tweetEl.querySelector('a[href^="/"]');
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
    
    // Skip replies
    if (CONFIG.skipReplies) {
      const isReply = tweetEl.querySelector('[data-testid="socialContext"]')?.innerText?.includes('Replying');
      if (isReply) return false;
    }
    
    // Skip ads
    if (CONFIG.skipAds) {
      const isAd = tweetEl.innerText.includes('Promoted') || tweetEl.innerText.includes('Ad');
      if (isAd) return false;
    }
    
    return true;
  }
  
  /**
   * Get tweet ID
   */
  function getTweetId(tweetEl) {
    const link = tweetEl.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  }
  
  console.log('🚀 Starting auto-liker...');
  console.log('');
  
  while (totalLiked < CONFIG.maxLikes && scrolls < CONFIG.maxScrolls) {
    const tweets = document.querySelectorAll($tweet);
    
    for (const tweet of tweets) {
      if (totalLiked >= CONFIG.maxLikes) break;
      
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
        
        const textEl = tweet.querySelector($tweetText);
        const preview = textEl ? textEl.innerText.substring(0, 40) + '...' : '[No text]';
        console.log(`❤️ Liked #${totalLiked}: "${preview}"`);
        
        // Also retweet if enabled
        if (CONFIG.alsoRetweet) {
          await sleep(500);
          const rtBtn = tweet.querySelector($retweetButton);
          if (rtBtn) {
            rtBtn.click();
            await sleep(300);
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
  console.log('');
  
  return { liked: totalLiked, retweeted: totalRetweeted };
})();
