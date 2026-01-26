/**
 * ============================================================
 * 📝 Unfollow Non-Followers With Log
 * ============================================================
 * 
 * @name        unfollow-with-log.js
 * @description Unfollow non-followers and download a log of who was unfollowed
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your Following page: https://x.com/YOUR_USERNAME/following
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Paste this ENTIRE script and press Enter
 * 5. When complete, a .txt file will download with all unfollowed usernames
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Maximum retry attempts
  maxRetries: 5,
  
  // Delay between unfollows (milliseconds)
  unfollowDelay: 1500,
  
  // Delay after clicking confirm
  confirmDelay: 1000,
  
  // Delay for scrolling
  scrollDelay: 2000,
  
  // Stop after this many unfollows (0 = unlimited)
  maxUnfollows: 0,
  
  // Auto-download log file when complete
  autoDownload: true,
  
  // Include timestamp in log
  includeTimestamp: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function unfollowWithLog() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  const $followsYou = '[data-testid="userFollowIndicator"]';
  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📝 UNFOLLOW NON-FOLLOWERS WITH LOG                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/following')) {
    console.error('❌ ERROR: You must be on your Following page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/following');
    return;
  }
  
  const confirmed = confirm(
    '📝 UNFOLLOW WITH LOG\n\n' +
    'This will unfollow non-followers and save a log file.\n\n' +
    'Click OK to start.'
  );
  if (!confirmed) {
    console.log('❌ Cancelled by user.');
    return;
  }
  
  console.log('🚀 Starting...');
  console.log('');
  
  const unfollowedList = [];
  const keptList = [];
  let retries = 0;
  const startTime = new Date();
  
  /**
   * Extract username from user cell
   */
  function getUsername(userCell) {
    if (!userCell) return null;
    const link = userCell.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      return href ? href.replace('/', '') : null;
    }
    return null;
  }
  
  /**
   * Extract display name from user cell
   */
  function getDisplayName(userCell) {
    if (!userCell) return 'Unknown';
    const nameSpan = userCell.querySelector('[dir="ltr"] span');
    return nameSpan ? nameSpan.textContent : 'Unknown';
  }
  
  while (retries < CONFIG.maxRetries) {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    
    const buttons = document.querySelectorAll($unfollowBtn);
    
    if (buttons.length === 0) {
      retries++;
      console.log(`⏳ No buttons found. Retry ${retries}/${CONFIG.maxRetries}...`);
      await sleep(CONFIG.scrollDelay);
      continue;
    }
    
    retries = 0;
    
    for (const btn of buttons) {
      if (CONFIG.maxUnfollows > 0 && unfollowedList.length >= CONFIG.maxUnfollows) {
        console.log(`\n✅ Reached limit of ${CONFIG.maxUnfollows} unfollows!`);
        await downloadLog();
        return;
      }
      
      try {
        const userCell = btn.closest($userCell);
        const username = getUsername(userCell);
        const displayName = getDisplayName(userCell);
        
        // Check if follows you
        if (userCell?.querySelector($followsYou)) {
          keptList.push({ username, displayName });
          console.log(`💚 Keeping: @${username} (${displayName})`);
          continue;
        }
        
        // Unfollow
        btn.click();
        await sleep(500);
        
        const confirmBtn = document.querySelector($confirmBtn);
        if (confirmBtn) {
          confirmBtn.click();
          
          const timestamp = new Date().toISOString();
          unfollowedList.push({
            username,
            displayName,
            timestamp
          });
          
          console.log(`🚫 Unfollowed #${unfollowedList.length}: @${username} (${displayName})`);
          await sleep(CONFIG.confirmDelay);
        }
        
        await sleep(CONFIG.unfollowDelay);
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
  }
  
  await downloadLog();
  
  /**
   * Download the log file
   */
  async function downloadLog() {
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000 / 60);
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ COMPLETE!                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`🚫 Unfollowed: ${unfollowedList.length}`);
    console.log(`💚 Kept (mutual): ${keptList.length}`);
    console.log(`⏱️ Duration: ${duration} minutes`);
    console.log('');
    
    if (CONFIG.autoDownload && unfollowedList.length > 0) {
      // Create log content
      let logContent = `UNFOLLOW LOG\n`;
      logContent += `${'='.repeat(50)}\n`;
      logContent += `Date: ${startTime.toISOString()}\n`;
      logContent += `Total Unfollowed: ${unfollowedList.length}\n`;
      logContent += `Total Kept (Mutual): ${keptList.length}\n`;
      logContent += `Duration: ${duration} minutes\n`;
      logContent += `${'='.repeat(50)}\n\n`;
      
      logContent += `UNFOLLOWED ACCOUNTS:\n`;
      logContent += `${'-'.repeat(30)}\n`;
      unfollowedList.forEach((u, i) => {
        let line = `${i + 1}. @${u.username} (${u.displayName})`;
        if (CONFIG.includeTimestamp) {
          line += ` - ${u.timestamp}`;
        }
        logContent += line + '\n';
      });
      
      logContent += `\n\nKEPT ACCOUNTS (MUTUAL FOLLOWERS):\n`;
      logContent += `${'-'.repeat(30)}\n`;
      keptList.forEach((u, i) => {
        logContent += `${i + 1}. @${u.username} (${u.displayName})\n`;
      });
      
      // Download
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unfollowed_${startTime.toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('💾 Log file downloaded!');
    }
    
    // Store in window for access
    window.unfollowLog = { unfollowed: unfollowedList, kept: keptList };
    console.log('💡 Access data via: window.unfollowLog');
  }
  
  return { unfollowed: unfollowedList, kept: keptList };
})();
