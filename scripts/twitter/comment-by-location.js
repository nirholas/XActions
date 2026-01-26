/**
 * =============================================================================
 * XActions - Comment By Location
 * =============================================================================
 * 
 * @name        Comment By Location
 * @description Search for tweets from specific locations and automatically
 *              comment on them with customizable messages
 * @author      nichxbt
 * @version     1.0.0
 * @date        2026-01-26
 * @website     https://xactions.app
 * 
 * Usage:
 *   1. Go to x.com and make sure you're logged in
 *   2. Open browser console (F12 -> Console)
 *   3. Configure the CONFIG object below
 *   4. Paste and run the script
 * 
 * =============================================================================
 */

(async function commentByLocation() {
  'use strict';

  // ===========================================================================
  // CONFIGURATION - Customize these settings
  // ===========================================================================
  const CONFIG = {
    // Location to search for (city, country, or place)
    location: 'New York',
    
    // Optional: geocode for precise location (lat,long,radius)
    // Get coordinates from: https://www.latlong.net/
    geocode: null, // e.g., '40.7128,-74.0060,25mi'
    
    // Search query to combine with location (optional)
    searchQuery: '',
    
    // Comments to randomly pick from
    comments: [
      'Love seeing posts from this area! 🌍',
      'Great content from a great place! 🔥',
      'Thanks for sharing! 💯',
      'Awesome post! 🙌',
      'This is amazing! ✨'
    ],
    
    // Maximum number of comments to post
    maxComments: 10,
    
    // Delay between actions (milliseconds)
    minDelay: 3000,
    maxDelay: 7000,
    
    // Skip tweets from these usernames
    skipUsernames: [],
    
    // Only comment on recent tweets (hours)
    maxTweetAge: 24,
    
    // Skip retweets
    skipRetweets: true
  };

  // ===========================================================================
  // SELECTORS
  // ===========================================================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    replyButton: '[data-testid="reply"]',
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    retweet: '[data-testid="socialContext"]',
    timestamp: 'time'
  };

  // ===========================================================================
  // HELPERS
  // ===========================================================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
    return sleep(delay);
  };
  
  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  const log = (msg, type = 'info') => {
    const styles = {
      info: 'color: #1DA1F2; font-weight: bold;',
      success: 'color: #17BF63; font-weight: bold;',
      error: 'color: #E0245E; font-weight: bold;',
      warn: 'color: #FFAD1F; font-weight: bold;'
    };
    console.log(`%c[XActions] ${msg}`, styles[type] || styles.info);
  };

  const getProcessedTweets = () => {
    try {
      return JSON.parse(sessionStorage.getItem('xactions_location_commented') || '[]');
    } catch {
      return [];
    }
  };

  const markTweetProcessed = (tweetId) => {
    const tweets = getProcessedTweets();
    if (!tweets.includes(tweetId)) {
      tweets.push(tweetId);
      sessionStorage.setItem('xactions_location_commented', JSON.stringify(tweets));
    }
  };

  const getTweetId = (tweet) => {
    const link = tweet.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const isTweetRecent = (tweet) => {
    const timeEl = tweet.querySelector(SELECTORS.timestamp);
    if (!timeEl) return true;
    
    const tweetTime = new Date(timeEl.getAttribute('datetime'));
    const hoursAgo = (Date.now() - tweetTime.getTime()) / (1000 * 60 * 60);
    
    return hoursAgo <= CONFIG.maxTweetAge;
  };

  const isRetweet = (tweet) => {
    const socialContext = tweet.querySelector(SELECTORS.retweet);
    return socialContext?.textContent?.toLowerCase().includes('reposted') || false;
  };

  // ===========================================================================
  // MAIN FUNCTIONS
  // ===========================================================================
  const buildSearchUrl = () => {
    let query = CONFIG.searchQuery;
    
    if (CONFIG.geocode) {
      query += ` geocode:${CONFIG.geocode}`;
    } else if (CONFIG.location) {
      query += ` near:"${CONFIG.location}"`;
    }
    
    const encodedQuery = encodeURIComponent(query.trim());
    return `https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`;
  };

  const navigateToSearch = async () => {
    log(`🔍 Searching for tweets near "${CONFIG.location}"...`);
    const searchUrl = buildSearchUrl();
    window.location.href = searchUrl;
    await sleep(4000);
  };

  const postComment = async (tweet, comment) => {
    try {
      // Click reply button
      const replyBtn = tweet.querySelector(SELECTORS.replyButton);
      if (!replyBtn) {
        log('Reply button not found', 'warn');
        return false;
      }
      
      replyBtn.click();
      await sleep(1500);
      
      // Find and fill textarea
      const textarea = document.querySelector(SELECTORS.tweetTextarea);
      if (!textarea) {
        log('Tweet textarea not found', 'warn');
        document.querySelector('[data-testid="app-bar-close"]')?.click();
        return false;
      }
      
      // Focus and type
      textarea.focus();
      await sleep(300);
      
      document.execCommand('insertText', false, comment);
      await sleep(500);
      
      // Click reply/tweet button
      const tweetBtn = document.querySelector(SELECTORS.tweetButton);
      if (!tweetBtn || tweetBtn.disabled) {
        log('Tweet button not found or disabled', 'warn');
        document.querySelector('[data-testid="app-bar-close"]')?.click();
        return false;
      }
      
      tweetBtn.click();
      await sleep(2000);
      
      return true;
    } catch (err) {
      log(`Error posting comment: ${err.message}`, 'error');
      return false;
    }
  };

  const processTweets = async (stats) => {
    const processedTweets = getProcessedTweets();
    let scrollAttempts = 0;
    const maxScrollAttempts = 30;
    let noNewTweetsCount = 0;
    
    while (stats.commented < CONFIG.maxComments && scrollAttempts < maxScrollAttempts) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      let foundNew = false;
      
      for (const tweet of tweets) {
        if (stats.commented >= CONFIG.maxComments) break;
        
        const tweetId = getTweetId(tweet);
        if (!tweetId || processedTweets.includes(tweetId)) continue;
        
        foundNew = true;
        
        // Skip retweets if configured
        if (CONFIG.skipRetweets && isRetweet(tweet)) {
          log(`⏭️ Skipping retweet`, 'warn');
          markTweetProcessed(tweetId);
          continue;
        }
        
        // Check tweet age
        if (!isTweetRecent(tweet)) {
          log(`⏭️ Skipping old tweet`, 'warn');
          markTweetProcessed(tweetId);
          continue;
        }
        
        // Skip certain usernames
        const usernameEl = tweet.querySelector('[data-testid="User-Name"] a');
        const username = usernameEl?.href?.split('/').pop();
        if (CONFIG.skipUsernames.includes(username)) {
          log(`⏭️ Skipping @${username}`, 'warn');
          markTweetProcessed(tweetId);
          continue;
        }
        
        stats.processed++;
        
        // Scroll tweet into view
        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(1000);
        
        // Pick random comment
        const comment = randomItem(CONFIG.comments);
        
        log(`💬 Commenting on tweet from ${username || 'user'}...`);
        const success = await postComment(tweet, comment);
        
        if (success) {
          stats.commented++;
          markTweetProcessed(tweetId);
          log(`✅ Comment ${stats.commented}/${CONFIG.maxComments} posted!`, 'success');
        } else {
          stats.failed++;
          markTweetProcessed(tweetId);
        }
        
        await randomDelay();
      }
      
      if (!foundNew) {
        noNewTweetsCount++;
        if (noNewTweetsCount >= 3) {
          log('No more new tweets found', 'warn');
          break;
        }
      } else {
        noNewTweetsCount = 0;
      }
      
      // Scroll for more tweets
      window.scrollBy(0, 800);
      await sleep(1500);
      scrollAttempts++;
    }
  };

  // ===========================================================================
  // EXECUTION
  // ===========================================================================
  console.clear();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   📍 XACTIONS - COMMENT BY LOCATION                          ║
║                                                               ║
║   Automatically comment on tweets from specific locations     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  log('🚀 Starting Comment By Location...', 'info');
  log(`📍 Location: ${CONFIG.location}`);
  log(`💬 Max comments: ${CONFIG.maxComments}`);
  if (CONFIG.geocode) {
    log(`🌐 Using geocode: ${CONFIG.geocode}`);
  }
  
  const stats = {
    processed: 0,
    commented: 0,
    failed: 0,
    startTime: Date.now()
  };
  
  try {
    await navigateToSearch();
    await processTweets(stats);
  } catch (err) {
    log(`Fatal error: ${err.message}`, 'error');
    console.error(err);
  }
  
  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     📊 COMPLETION SUMMARY                     ║
╠═══════════════════════════════════════════════════════════════╣
║  📍 Location:         ${String(CONFIG.location).padEnd(38)}║
║  ✅ Comments posted:  ${String(stats.commented).padEnd(38)}║
║  ❌ Failed:           ${String(stats.failed).padEnd(38)}║
║  📝 Tweets processed: ${String(stats.processed).padEnd(38)}║
║  ⏱️  Duration:         ${String(duration + ' minutes').padEnd(38)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  log('🎉 Comment By Location completed!', 'success');
  
})();
