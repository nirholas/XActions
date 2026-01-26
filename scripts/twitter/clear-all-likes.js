/**
 * ============================================================
 * 💔 Clear All Likes
 * ============================================================
 * 
 * @name        clear-all-likes.js
 * @description Remove all likes from your X/Twitter account
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * ⚠️ WARNING: This will unlike ALL your liked tweets!
 * ============================================================
 * 
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your Likes page: https://x.com/YOUR_USERNAME/likes
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Watch the console for progress
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Maximum likes to remove (0 = unlimited)
  maxUnlikes: 0,
  
  // Delay between unlikes (ms) - higher = safer from rate limits
  unlikeDelay: 1500,
  
  // Delay after scrolling (ms)
  scrollDelay: 2000,
  
  // Max retries when no likes found
  maxRetries: 5,
  
  // Show confirmation prompt
  confirmStart: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function clearAllLikes() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $unlikeButton = '[data-testid="unlike"]';
  const $tweet = '[data-testid="tweet"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💔 CLEAR ALL LIKES                                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on the right page
  if (!window.location.href.includes('/likes')) {
    console.error('❌ ERROR: You must be on your Likes page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/likes');
    return;
  }
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '⚠️ WARNING: This will unlike ALL your liked tweets!\n\n' +
      'This action cannot be undone.\n\n' +
      'Are you sure you want to continue?'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting to clear all likes...');
  console.log('');
  
  let totalUnliked = 0;
  let retries = 0;
  
  const processLikes = async () => {
    while (retries < CONFIG.maxRetries) {
      // Check limit
      if (CONFIG.maxUnlikes > 0 && totalUnliked >= CONFIG.maxUnlikes) {
        console.log(`🛑 Reached limit of ${CONFIG.maxUnlikes} unlikes. Stopping.`);
        break;
      }
      
      // Find unlike buttons
      const unlikeButtons = document.querySelectorAll($unlikeButton);
      
      if (unlikeButtons.length === 0) {
        retries++;
        console.log(`🔄 No likes found on screen. Scrolling... (attempt ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }
      
      retries = 0; // Reset retries on success
      
      // Click first unlike button
      const btn = unlikeButtons[0];
      
      try {
        btn.click();
        totalUnliked++;
        console.log(`💔 Unliked tweet ${totalUnliked}${CONFIG.maxUnlikes > 0 ? '/' + CONFIG.maxUnlikes : ''}`);
        await sleep(CONFIG.unlikeDelay);
      } catch (e) {
        console.warn('⚠️ Error clicking unlike button:', e.message);
        await sleep(CONFIG.unlikeDelay);
      }
      
      // Scroll periodically to load more
      if (totalUnliked % 10 === 0) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
      }
    }
    
    // Done
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🎉 COMPLETE! Unliked ${totalUnliked} tweets               `);
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    if (retries >= CONFIG.maxRetries) {
      console.log('💡 No more likes found. Your likes page should be empty!');
    }
  };
  
  processLikes();
})();
