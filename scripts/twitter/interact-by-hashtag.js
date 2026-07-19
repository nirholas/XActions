// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * ============================================================
 * #️⃣ Interact By Hashtag
 * ============================================================
 * 
 * @name        interact-by-hashtag.js
 * @description Interact with posts containing specific hashtags
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 FEATURES:
 * ============================================================
 * 
 * • Search for hashtags
 * • Like matching tweets
 * • Retweet relevant content
 * • Follow users posting with hashtags
 * • Filter by engagement metrics
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Configure hashtags below
 * 2. Open Chrome DevTools (F12)
 * 3. Paste this script and press Enter
 * 4. Run XActions.Hashtag.search() and interact!
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Hashtags to target (without #)
  hashtags: [
    'crypto',
    'web3',
    'bitcoin',
  ],
  
  // Actions to perform
  actions: {
    like: true,
    retweet: false,
    follow: true,
  },
  
  // Limits per session
  limits: {
    likes: 20,
    retweets: 5,
    follows: 10,
    tweetsPerHashtag: 10,
  },
  
  // Filters
  filters: {
    minLikes: 5,           // Minimum likes on tweet
    minRetweets: 0,        // Minimum retweets
    skipReplies: true,     // Skip reply tweets
    skipRetweets: true,    // Skip retweets
    requireMedia: false,   // Only posts with images/video
  },
  
  // Timing
  delayBetweenActions: 2000,
  scrollDelay: 2000,
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function interactByHashtag() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  
  // DOM Selectors
  const SELECTORS = {
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    followButton: '[data-testid$="-follow"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    userCell: '[data-testid="UserCell"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  #️⃣ INTERACT BY HASHTAG                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // State
  const state = {
    isRunning: false,
    currentHashtag: null,
    stats: { likes: 0, retweets: 0, follows: 0 },
    processedTweets: new Set(),
  };
  
  // Parse counts like "1,234" / "5.2K" from button aria-labels
  const parseCount = (str) => {
    if (!str) return 0;
    const match = str.replace(/,/g, '').match(/([\d.]+)([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
    if (match[2]) num *= multipliers[match[2].toUpperCase()];
    return Math.round(num) || 0;
  };

  // Helper to check if tweet passes filters
  const passesFilters = (tweet) => {
    // Check if already liked
    if (tweet.querySelector(SELECTORS.unlikeButton)) return false;

    // Check for replies (structural marker first; text only works on English UIs)
    if (CONFIG.filters.skipReplies) {
      const isReply = tweet.querySelector('[data-testid="in-reply-to"]') !== null ||
        Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
          el.innerText.startsWith('Replying to'));
      if (isReply) return false;
    }

    // Check for retweets: socialContext inside an <a> = repost (locale-independent);
    // a plain socialContext is a pinned post
    if (CONFIG.filters.skipRetweets) {
      const socialContext = tweet.querySelector('[data-testid="socialContext"]');
      if (socialContext && socialContext.closest('a')) return false;
    }

    // Check for media
    if (CONFIG.filters.requireMedia) {
      const hasMedia = tweet.querySelector('[data-testid="tweetPhoto"]') ||
                       tweet.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
      if (!hasMedia) return false;
    }

    // Check engagement minimums
    if (CONFIG.filters.minLikes > 0) {
      const likeEl = tweet.querySelector(`${SELECTORS.likeButton}, ${SELECTORS.unlikeButton}`);
      if (parseCount(likeEl?.getAttribute('aria-label')) < CONFIG.filters.minLikes) return false;
    }
    if (CONFIG.filters.minRetweets > 0) {
      const rtEl = tweet.querySelector(`${SELECTORS.retweetButton}, [data-testid="unretweet"]`);
      if (parseCount(rtEl?.getAttribute('aria-label')) < CONFIG.filters.minRetweets) return false;
    }

    return true;
  };

  // Get tweet ID: the anchor around the timestamp is the tweet's own permalink;
  // the first /status/ link can belong to a quoted tweet
  const getTweetId = (tweet) => {
    const timeEl = tweet.querySelector('time');
    const link = (timeEl && timeEl.closest('a[href*="/status/"]')) || tweet.querySelector('a[href*="/status/"]');
    return link?.href?.match(/status\/(\d+)/)?.[1];
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Hashtag = {
    config: CONFIG,
    state,
    
    // Search for a specific hashtag
    search: async (hashtag) => {
      const tag = hashtag?.replace('#', '') || CONFIG.hashtags[0];
      if (!tag) {
        console.error('❌ No hashtag specified!');
        return;
      }
      
      console.log(`🔍 Searching for #${tag}...`);
      
      // Navigate to search
      window.location.href = `https://x.com/search?q=%23${tag}&src=typed_query&f=live`;
    },
    
    // Interact with current search results
    interact: async () => {
      console.log('🚀 Starting hashtag interaction...');
      state.isRunning = true;
      
      let processed = 0;
      let stalledScrolls = 0;
      let lastProcessedCount = state.processedTweets.size;
      let warnedAboutVolume = false;

      while (state.isRunning && state.stats.likes < CONFIG.limits.likes) {
        const tweets = document.querySelectorAll(SELECTORS.tweet);
        
        for (const tweet of tweets) {
          if (!state.isRunning) break;
          if (state.stats.likes >= CONFIG.limits.likes) break;
          
          const tweetId = getTweetId(tweet);
          if (!tweetId || state.processedTweets.has(tweetId)) continue;
          
          state.processedTweets.add(tweetId);
          
          if (!passesFilters(tweet)) continue;
          
          // Like
          if (CONFIG.actions.like && state.stats.likes < CONFIG.limits.likes) {
            const likeBtn = tweet.querySelector(SELECTORS.likeButton);
            if (likeBtn) {
              likeBtn.click();
              state.stats.likes++;
              console.log(`❤️ Liked tweet (${state.stats.likes}/${CONFIG.limits.likes})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          // Retweet
          if (CONFIG.actions.retweet && state.stats.retweets < CONFIG.limits.retweets) {
            const rtBtn = tweet.querySelector(SELECTORS.retweetButton);
            if (rtBtn) {
              rtBtn.click();
              await sleep(500);
              const confirmBtn = document.querySelector('[data-testid="retweetConfirm"]');
              if (confirmBtn) confirmBtn.click();
              
              state.stats.retweets++;
              console.log(`🔄 Retweeted (${state.stats.retweets}/${CONFIG.limits.retweets})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          // Follow user
          if (CONFIG.actions.follow && state.stats.follows < CONFIG.limits.follows) {
            const followBtn = tweet.querySelector(SELECTORS.followButton);
            if (followBtn) {
              followBtn.click();
              state.stats.follows++;
              console.log(`👥 Followed user (${state.stats.follows}/${CONFIG.limits.follows})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          processed++;
        }
        
        // Scroll for more
        window.scrollBy(0, window.innerHeight);
        await sleep(CONFIG.scrollDelay);

        // End-of-results detection so the loop cannot scroll forever
        if (state.processedTweets.size === lastProcessedCount) {
          stalledScrolls++;
          if (stalledScrolls >= 10) {
            console.log('⚠️ No new tweets after 10 scrolls. Stopping.');
            break;
          }
        } else {
          stalledScrolls = 0;
          lastProcessedCount = state.processedTweets.size;
        }

        if (processed > 50 && !warnedAboutVolume) {
          warnedAboutVolume = true;
          console.log('⚠️ Processed many tweets. Consider stopping to avoid rate limits.');
        }
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 HASHTAG INTERACTION COMPLETE!                          ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.Hashtag.stats();
    },
    
    // Search and interact with all configured hashtags
    interactAll: async () => {
      if (CONFIG.hashtags.length === 0) {
        console.error('❌ No hashtags configured!');
        return;
      }
      
      console.log(`🚀 Processing ${CONFIG.hashtags.length} hashtags...`);
      console.log('');
      console.log('📋 Run these commands in sequence:');
      
      CONFIG.hashtags.forEach((tag, i) => {
        console.log(`   ${i + 1}. XActions.Hashtag.search("${tag}")`);
        console.log(`      Then: XActions.Hashtag.interact()`);
      });
      console.log('');
    },
    
    // Add hashtag
    addHashtag: (tag) => {
      const clean = tag.replace('#', '').toLowerCase();
      if (!CONFIG.hashtags.includes(clean)) {
        CONFIG.hashtags.push(clean);
        console.log(`✅ Added #${clean}`);
      }
    },
    
    // Remove hashtag
    removeHashtag: (tag) => {
      const clean = tag.replace('#', '').toLowerCase();
      const idx = CONFIG.hashtags.indexOf(clean);
      if (idx > -1) {
        CONFIG.hashtags.splice(idx, 1);
        console.log(`✅ Removed #${clean}`);
      }
    },
    
    // Stop
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Stopped.');
    },
    
    // Stats
    stats: () => {
      console.log('');
      console.log('📊 HASHTAG INTERACTION STATS:');
      console.log(`   ❤️ Likes: ${state.stats.likes}/${CONFIG.limits.likes}`);
      console.log(`   🔄 Retweets: ${state.stats.retweets}/${CONFIG.limits.retweets}`);
      console.log(`   👥 Follows: ${state.stats.follows}/${CONFIG.limits.follows}`);
      console.log(`   📝 Tweets processed: ${state.processedTweets.size}`);
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 HASHTAG INTERACTION COMMANDS:');
      console.log('');
      console.log('   XActions.Hashtag.search("crypto")   - Search hashtag');
      console.log('   XActions.Hashtag.interact()         - Interact with results');
      console.log('   XActions.Hashtag.addHashtag("tag")  - Add hashtag');
      console.log('   XActions.Hashtag.removeHashtag("t") - Remove hashtag');
      console.log('   XActions.Hashtag.interactAll()      - Show guide for all');
      console.log('   XActions.Hashtag.stop()             - Stop interaction');
      console.log('   XActions.Hashtag.stats()            - Show statistics');
      console.log('');
    }
  };
  
  console.log('✅ Interact By Hashtag loaded!');
  console.log(`📋 Configured hashtags: ${CONFIG.hashtags.map(t => '#' + t).join(', ')}`);
  console.log('   Run XActions.Hashtag.help() for commands.');
  console.log('');
})();
