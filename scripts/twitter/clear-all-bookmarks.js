/**
 * ============================================================
 * 🗑️ Clear All Bookmarks
 * ============================================================
 * 
 * @name        clear-all-bookmarks.js
 * @description Remove all bookmarks from your X/Twitter account
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * ⚠️ WARNING: This will remove ALL your bookmarks!
 * ============================================================
 * 
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to Bookmarks: https://x.com/i/bookmarks
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Watch the console for progress
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Maximum bookmarks to remove (0 = unlimited)
  maxRemove: 0,
  
  // Delay between removals (ms)
  removeDelay: 1500,
  
  // Delay after scrolling (ms)
  scrollDelay: 2000,
  
  // Max retries when no bookmarks found
  maxRetries: 5,
  
  // Show confirmation prompt
  confirmStart: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function clearAllBookmarks() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $removeBookmarkBtn = '[data-testid="removeBookmark"]';
  const $bookmarkBtn = '[data-testid="bookmark"]'; // Filled bookmark = already bookmarked
  const $tweet = '[data-testid="tweet"]';
  const $moreBtn = '[data-testid="caret"]';
  const $removeFromBookmarks = '[data-testid="removeBookmark"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🗑️ CLEAR ALL BOOKMARKS                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on the right page
  if (!window.location.href.includes('/bookmarks')) {
    console.error('❌ ERROR: You must be on your Bookmarks page!');
    console.log('📍 Go to: https://x.com/i/bookmarks');
    return;
  }
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '⚠️ WARNING: This will remove ALL your bookmarks!\n\n' +
      'This action cannot be undone.\n\n' +
      'Are you sure you want to continue?'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting to clear all bookmarks...');
  console.log('');
  
  let totalRemoved = 0;
  let retries = 0;
  
  // Method 1: Try direct bookmark buttons on tweets
  const removeViaBookmarkBtn = async () => {
    // Look for filled bookmark icons (indicating bookmarked)
    const tweets = document.querySelectorAll($tweet);
    
    for (const tweet of tweets) {
      if (CONFIG.maxRemove > 0 && totalRemoved >= CONFIG.maxRemove) {
        return true; // Limit reached
      }
      
      // Look for bookmark button that indicates "already bookmarked"
      const bookmarkBtn = tweet.querySelector($removeBookmarkBtn) || 
                          tweet.querySelector('[aria-label*="Remove"]');
      
      if (bookmarkBtn) {
        try {
          bookmarkBtn.click();
          totalRemoved++;
          console.log(`🗑️ Removed bookmark ${totalRemoved}${CONFIG.maxRemove > 0 ? '/' + CONFIG.maxRemove : ''}`);
          await sleep(CONFIG.removeDelay);
          return false; // Continue
        } catch (e) {
          console.warn('⚠️ Error removing bookmark:', e.message);
        }
      }
    }
    
    return null; // No bookmarks found
  };
  
  // Method 2: Use the share menu
  const removeViaMenu = async (tweet) => {
    const moreBtn = tweet.querySelector($moreBtn);
    if (!moreBtn) return false;
    
    moreBtn.click();
    await sleep(500);
    
    const removeBtn = document.querySelector($removeFromBookmarks) ||
                      document.querySelector('[data-testid="Dropdown"]')?.querySelector('[role="menuitem"]');
    
    if (removeBtn) {
      removeBtn.click();
      await sleep(300);
      return true;
    }
    
    // Close menu if no remove option
    document.body.click();
    return false;
  };
  
  const processBookmarks = async () => {
    while (retries < CONFIG.maxRetries) {
      // Check limit
      if (CONFIG.maxRemove > 0 && totalRemoved >= CONFIG.maxRemove) {
        console.log(`🛑 Reached limit of ${CONFIG.maxRemove} removals. Stopping.`);
        break;
      }
      
      // Check for empty bookmarks
      const emptyState = document.querySelector('[data-testid="emptyState"]');
      if (emptyState) {
        console.log('📭 Bookmarks page is empty!');
        break;
      }
      
      // Try to remove a bookmark
      const tweets = document.querySelectorAll($tweet);
      
      if (tweets.length === 0) {
        retries++;
        console.log(`🔄 No tweets found. Scrolling... (attempt ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }
      
      // Try first tweet
      const tweet = tweets[0];
      
      // Method 1: Look for remove bookmark button
      const removeBtn = tweet.querySelector($removeBookmarkBtn);
      if (removeBtn) {
        try {
          removeBtn.click();
          totalRemoved++;
          retries = 0;
          console.log(`🗑️ Removed bookmark ${totalRemoved}${CONFIG.maxRemove > 0 ? '/' + CONFIG.maxRemove : ''}`);
          await sleep(CONFIG.removeDelay);
          continue;
        } catch (e) {
          // Try next method
        }
      }
      
      // Method 2: Use tweet menu
      if (await removeViaMenu(tweet)) {
        totalRemoved++;
        retries = 0;
        console.log(`🗑️ Removed bookmark ${totalRemoved} (via menu)`);
        await sleep(CONFIG.removeDelay);
        continue;
      }
      
      // No remove option found, scroll
      retries++;
      console.log(`🔄 Couldn't find remove option. Scrolling... (attempt ${retries}/${CONFIG.maxRetries})`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    
    // Done
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🎉 COMPLETE! Removed ${totalRemoved} bookmarks            `);
    console.log('╚════════════════════════════════════════════════════════════╝');
  };
  
  processBookmarks();
})();
