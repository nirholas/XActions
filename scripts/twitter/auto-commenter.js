/**
 * ============================================================
 * 💬 Auto Commenter
 * ============================================================
 * 
 * @name        auto-commenter.js
 * @description Automatically comment on tweets from a target user
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to the profile of the user you want to comment on:
 *    https://x.com/TARGET_USERNAME
 * 
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Customize the COMMENTS array with your messages
 * 4. Paste this script and press Enter
 * 
 * ⚠️ WARNING: Auto-commenting can get your account flagged!
 * Use responsibly with reasonable delays.
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // ---- COMMENTS TO POST ----
  // The script will randomly pick from these
  // 💡 Add variety to avoid looking like a bot!
  comments: [
    '🔥',
    'Great point!',
    'This is so true 👏',
    'Interesting perspective!',
    'Thanks for sharing this 🙏',
    '💯',
    'Well said!',
    'Couldn\'t agree more',
    '👀 interesting',
    'This is gold ✨'
  ],
  
  // ---- LIMITS ----
  
  // Maximum comments per session
  maxComments: 5,
  
  // Only comment on tweets posted within this window
  maxPostAgeMinutes: 60,
  
  // Minimum post age (to avoid commenting too fast)
  minPostAgeSeconds: 30,
  
  // ---- BEHAVIOR ----
  
  // Only comment on original tweets (skip replies)
  onlyOriginalTweets: true,
  
  // Only comment on tweets with media (images/videos)
  onlyWithMedia: false,
  
  // ---- TIMING ----
  
  // Delay between comments (milliseconds)
  minDelay: 30000,  // 30 seconds minimum!
  maxDelay: 60000,  // 60 seconds
  
  // Scroll delay
  scrollDelay: 2000
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function autoCommenter() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  const randomComment = () => CONFIG.comments[Math.floor(Math.random() * CONFIG.comments.length)];
  
  // DOM Selectors
  const $tweet = 'article[data-testid="tweet"]';
  const $replyButton = '[data-testid="reply"]';
  const $tweetTextarea = '[data-testid="tweetTextarea_0"]';
  const $tweetButton = '[data-testid="tweetButton"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💬 AUTO COMMENTER                                         ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Get target username from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const targetUser = pathMatch ? pathMatch[1] : null;
  
  if (!targetUser || ['home', 'explore', 'search', 'notifications', 'messages', 'i'].includes(targetUser)) {
    console.error('❌ ERROR: Must be on a user\'s profile page!');
    console.log('📍 Go to: https://x.com/TARGET_USERNAME');
    return;
  }
  
  console.log(`👤 Target: @${targetUser}`);
  console.log(`💬 Max comments: ${CONFIG.maxComments}`);
  console.log(`⏱️ Post age window: ${CONFIG.minPostAgeSeconds}s - ${CONFIG.maxPostAgeMinutes}min`);
  console.log('');
  
  const commentedTweets = new Set();
  
  // Load previously commented from storage
  const STORAGE_KEY = `xactions_commented_${targetUser}`;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      JSON.parse(saved).forEach(id => commentedTweets.add(id));
      console.log(`📚 Loaded ${commentedTweets.size} previously commented tweets`);
    }
  } catch (e) {}
  
  let totalCommented = 0;
  
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
  
  /**
   * Check tweet age
   */
  function getTweetAge(tweetEl) {
    const timeEl = tweetEl.querySelector('time');
    if (!timeEl) return null;
    const datetime = timeEl.getAttribute('datetime');
    if (!datetime) return null;
    return (Date.now() - new Date(datetime).getTime()) / 1000; // seconds
  }
  
  /**
   * Check if tweet matches criteria
   */
  function matchesCriteria(tweetEl) {
    const age = getTweetAge(tweetEl);
    if (!age) return false;
    
    // Check age window
    if (age < CONFIG.minPostAgeSeconds) return false;
    if (age > CONFIG.maxPostAgeMinutes * 60) return false;
    
    // Check if original tweet
    if (CONFIG.onlyOriginalTweets) {
      const socialContext = tweetEl.querySelector('[data-testid="socialContext"]');
      if (socialContext?.innerText?.includes('Replying')) return false;
    }
    
    // Check for media
    if (CONFIG.onlyWithMedia) {
      const hasMedia = tweetEl.querySelector('[data-testid="tweetPhoto"]') || 
                       tweetEl.querySelector('[data-testid="videoPlayer"]');
      if (!hasMedia) return false;
    }
    
    return true;
  }
  
  console.log('🚀 Looking for tweets to comment on...');
  console.log('');
  
  // Scroll through profile
  let scrolls = 0;
  const maxScrolls = 20;
  
  while (totalCommented < CONFIG.maxComments && scrolls < maxScrolls) {
    const tweets = document.querySelectorAll($tweet);
    
    for (const tweet of tweets) {
      if (totalCommented >= CONFIG.maxComments) break;
      
      const tweetId = getTweetId(tweet);
      if (!tweetId || commentedTweets.has(tweetId)) continue;
      
      if (!matchesCriteria(tweet)) continue;
      
      // Find reply button
      const replyBtn = tweet.querySelector($replyButton);
      if (!replyBtn) continue;
      
      try {
        console.log(`💬 Commenting on tweet ${tweetId}...`);
        
        // Click reply
        replyBtn.click();
        await sleep(1000);
        
        // Find textarea
        const textarea = document.querySelector($tweetTextarea);
        if (!textarea) {
          console.warn('⚠️ Could not find reply textarea');
          continue;
        }
        
        // Type comment
        const comment = randomComment();
        textarea.focus();
        document.execCommand('insertText', false, comment);
        await sleep(500);
        
        // Click tweet button
        const tweetBtn = document.querySelector($tweetButton);
        if (tweetBtn && !tweetBtn.disabled) {
          tweetBtn.click();
          
          commentedTweets.add(tweetId);
          totalCommented++;
          
          console.log(`✅ Posted: "${comment}"`);
          
          // Save to storage
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...commentedTweets]));
          
          // Wait before next comment
          const delay = randomDelay();
          console.log(`⏳ Waiting ${Math.round(delay/1000)}s before next comment...`);
          await sleep(delay);
        } else {
          console.warn('⚠️ Tweet button not available');
          // Close dialog
          const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
          if (closeBtn) closeBtn.click();
        }
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
        // Try to close any open dialogs
        const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
        if (closeBtn) closeBtn.click();
      }
    }
    
    if (totalCommented >= CONFIG.maxComments) break;
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ AUTO COMMENTER COMPLETE!                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`💬 Total comments posted: ${totalCommented}`);
  console.log('');
  
  return { commented: totalCommented };
})();
