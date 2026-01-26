/**
 * =============================================================================
 * XActions - Comment By Hashtag
 * =============================================================================
 * 
 * @name        Comment By Hashtag
 * @description Search for tweets with specific hashtags and automatically 
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

(async function commentByHashtag() {
  'use strict';

  // ===========================================================================
  // CONFIGURATION - Customize these settings
  // ===========================================================================
  const CONFIG = {
    // Hashtags to search for (without #)
    hashtags: ['web3', 'crypto', 'NFT'],
    
    // Comments to randomly pick from
    comments: [
      'Great point! 🔥',
      'This is so true! 💯',
      'Interesting perspective!',
      'Thanks for sharing this! 🙌',
      'Couldn\'t agree more!'
    ],
    
    // Maximum number of comments to post
    maxComments: 10,
    
    // Delay between actions (milliseconds)
    minDelay: 3000,
    maxDelay: 6000,
    
    // Skip tweets from these usernames
    skipUsernames: [],
    
    // Only comment on tweets with minimum engagement
    minLikes: 0,
    minRetweets: 0
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
    timeline: '[data-testid="primaryColumn"]'
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
      return JSON.parse(sessionStorage.getItem('xactions_commented_tweets') || '[]');
    } catch {
      return [];
    }
  };

  const markTweetProcessed = (tweetId) => {
    const tweets = getProcessedTweets();
    if (!tweets.includes(tweetId)) {
      tweets.push(tweetId);
      sessionStorage.setItem('xactions_commented_tweets', JSON.stringify(tweets));
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

  // ===========================================================================
  // MAIN FUNCTIONS
  // ===========================================================================
  const searchHashtag = async (hashtag) => {
    log(`🔍 Searching for #${hashtag}...`);
    const searchUrl = `https://x.com/search?q=%23${encodeURIComponent(hashtag)}&src=typed_query&f=live`;
    window.location.href = searchUrl;
    await sleep(3000);
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
        // Close modal if open
        document.querySelector('[data-testid="app-bar-close"]')?.click();
        return false;
      }
      
      // Focus and type
      textarea.focus();
      await sleep(300);
      
      // Use execCommand for better compatibility
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

  const processHashtag = async (hashtag, stats) => {
    await searchHashtag(hashtag);
    await sleep(2000);
    
    const processedTweets = getProcessedTweets();
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;
    
    while (stats.commented < CONFIG.maxComments && scrollAttempts < maxScrollAttempts) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      
      for (const tweet of tweets) {
        if (stats.commented >= CONFIG.maxComments) break;
        
        const tweetId = getTweetId(tweet);
        if (!tweetId || processedTweets.includes(tweetId)) continue;
        
        // Get tweet text
        const textEl = tweet.querySelector(SELECTORS.tweetText);
        const tweetText = textEl?.textContent || '';
        
        // Check if tweet contains hashtag
        if (!tweetText.toLowerCase().includes(`#${hashtag.toLowerCase()}`)) continue;
        
        // Skip certain usernames
        const usernameEl = tweet.querySelector('[data-testid="User-Name"] a');
        const username = usernameEl?.href?.split('/').pop();
        if (CONFIG.skipUsernames.includes(username)) {
          log(`⏭️ Skipping @${username}`, 'warn');
          continue;
        }
        
        stats.processed++;
        
        // Scroll tweet into view
        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(1000);
        
        // Pick random comment
        const comment = randomItem(CONFIG.comments);
        
        log(`💬 Commenting on tweet ${tweetId.slice(-6)}...`);
        const success = await postComment(tweet, comment);
        
        if (success) {
          stats.commented++;
          markTweetProcessed(tweetId);
          log(`✅ Comment ${stats.commented}/${CONFIG.maxComments} posted!`, 'success');
        } else {
          stats.failed++;
        }
        
        await randomDelay();
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
║   🏷️  XACTIONS - COMMENT BY HASHTAG                          ║
║                                                               ║
║   Automatically comment on tweets with specific hashtags      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  log('🚀 Starting Comment By Hashtag...', 'info');
  log(`📋 Hashtags: ${CONFIG.hashtags.map(h => '#' + h).join(', ')}`);
  log(`💬 Max comments: ${CONFIG.maxComments}`);
  
  const stats = {
    processed: 0,
    commented: 0,
    failed: 0,
    startTime: Date.now()
  };
  
  try {
    for (const hashtag of CONFIG.hashtags) {
      if (stats.commented >= CONFIG.maxComments) break;
      await processHashtag(hashtag, stats);
    }
  } catch (err) {
    log(`Fatal error: ${err.message}`, 'error');
  }
  
  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     📊 COMPLETION SUMMARY                     ║
╠═══════════════════════════════════════════════════════════════╣
║  ✅ Comments posted:  ${String(stats.commented).padEnd(38)}║
║  ❌ Failed:           ${String(stats.failed).padEnd(38)}║
║  📝 Tweets processed: ${String(stats.processed).padEnd(38)}║
║  ⏱️  Duration:         ${String(duration + ' minutes').padEnd(38)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  log('🎉 Comment By Hashtag completed!', 'success');
  
})();
