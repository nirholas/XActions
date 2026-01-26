/**
 * ============================================================
 * 🔄 Clear All Retweets
 * ============================================================
 * 
 * @name        clear-all-retweets.js
 * @description Undo all retweets from your X/Twitter account
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * ⚠️ WARNING: This will undo ALL your retweets!
 * ============================================================
 * 
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your profile: https://x.com/YOUR_USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Watch the console for progress
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Maximum retweets to undo (0 = unlimited)
  maxUndo: 0,
  
  // Delay between unretweets (ms)
  unretweetDelay: 2000,
  
  // Delay after scrolling (ms)
  scrollDelay: 2500,
  
  // Max retries when no retweets found
  maxRetries: 5,
  
  // Show confirmation prompt
  confirmStart: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function clearAllRetweets() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $retweetBtn = '[data-testid="retweet"]';
  const $unretweetBtn = '[data-testid="unretweet"]';
  const $unretweetConfirm = '[data-testid="unretweetConfirm"]';
  const $tweet = '[data-testid="tweet"]';
  const $retweetIndicator = 'span[data-testid="socialContext"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 CLEAR ALL RETWEETS                                     ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '⚠️ WARNING: This will undo ALL your retweets!\n\n' +
      'This removes retweets from your timeline.\n\n' +
      'Are you sure you want to continue?'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting to undo all retweets...');
  console.log('📍 Looking for retweets on your profile...');
  console.log('');
  
  let totalUndone = 0;
  let retries = 0;
  
  // Helper to check if tweet is a retweet
  const isRetweet = (tweet) => {
    // Check for "You reposted" indicator
    const socialContext = tweet.querySelector($retweetIndicator);
    if (socialContext?.textContent?.toLowerCase()?.includes('repost')) {
      return true;
    }
    
    // Check for unretweet button (green retweet icon)
    const unretweetBtn = tweet.querySelector($unretweetBtn);
    return !!unretweetBtn;
  };
  
  // Helper to undo a retweet
  const undoRetweet = async (tweet) => {
    // Find the unretweet button
    const unretweetBtn = tweet.querySelector($unretweetBtn);
    
    if (!unretweetBtn) {
      return false;
    }
    
    try {
      // Click unretweet
      unretweetBtn.click();
      await sleep(500);
      
      // Look for confirmation menu
      const confirmBtn = document.querySelector($unretweetConfirm);
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(300);
      }
      
      return true;
    } catch (e) {
      console.warn('⚠️ Error undoing retweet:', e.message);
      return false;
    }
  };
  
  const processRetweets = async () => {
    while (retries < CONFIG.maxRetries) {
      // Check limit
      if (CONFIG.maxUndo > 0 && totalUndone >= CONFIG.maxUndo) {
        console.log(`🛑 Reached limit of ${CONFIG.maxUndo} unretweets. Stopping.`);
        break;
      }
      
      // Find all tweets
      const tweets = document.querySelectorAll($tweet);
      let foundRetweet = false;
      
      for (const tweet of tweets) {
        if (isRetweet(tweet)) {
          foundRetweet = true;
          
          if (await undoRetweet(tweet)) {
            totalUndone++;
            retries = 0;
            console.log(`🔄 Undid retweet ${totalUndone}${CONFIG.maxUndo > 0 ? '/' + CONFIG.maxUndo : ''}`);
            await sleep(CONFIG.unretweetDelay);
            break; // Start over from top
          }
        }
      }
      
      if (!foundRetweet) {
        retries++;
        console.log(`🔍 No retweets found on screen. Scrolling... (attempt ${retries}/${CONFIG.maxRetries})`);
        
        // Scroll to load more
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
      }
    }
    
    // Done
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🎉 COMPLETE! Undid ${totalUndone} retweets                `);
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    if (retries >= CONFIG.maxRetries) {
      console.log('💡 No more retweets found on the visible timeline.');
      console.log('   If you have more retweets, scroll down and run again.');
    }
  };
  
  processRetweets();
})();
