/**
 * ============================================================
 * 🔍 Detect Unfollowers
 * ============================================================
 * 
 * @name        detect-unfollowers.js
 * @description Compare your followers to a saved snapshot to detect who unfollowed you
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * FIRST RUN (creates snapshot):
 * 1. Go to your Followers page: https://x.com/YOUR_USERNAME/followers
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Wait for it to scroll and save your followers
 * 
 * LATER RUNS (detect changes):
 * 1. Run the script again on your followers page
 * 2. It will compare with the saved snapshot
 * 3. Shows who unfollowed and who's new
 * 4. Downloads a report file
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Delay between scrolls
  scrollDelay: 2000,
  
  // Maximum scroll attempts
  maxScrolls: 100,
  
  // Retry when no new users found
  maxRetries: 5,
  
  // Auto-download report
  autoDownload: true,
  
  // Storage key for snapshot
  storageKey: 'xactions_my_followers'
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function detectUnfollowers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 DETECT UNFOLLOWERS                                     ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/followers')) {
    console.error('❌ ERROR: You must be on your Followers page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }
  
  console.log('🚀 Scraping current followers...');
  console.log('📜 Auto-scrolling to load all followers...');
  console.log('');
  
  /**
   * Extract username from user cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      return href ? href.replace('/', '').split('/')[0] : null;
    }
    return null;
  }
  
  /**
   * Extract display name from user cell
   */
  function getDisplayName(cell) {
    const span = cell.querySelector('[dir="ltr"] span');
    return span ? span.textContent : null;
  }
  
  // Scrape all followers
  const currentFollowers = new Map(); // username -> displayName
  let lastCount = 0;
  let retries = 0;
  let scrolls = 0;
  
  while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const cells = document.querySelectorAll($userCell);
    
    cells.forEach(cell => {
      const username = getUsername(cell);
      const displayName = getDisplayName(cell);
      if (username && !currentFollowers.has(username)) {
        currentFollowers.set(username, displayName || username);
      }
    });
    
    if (currentFollowers.size === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = currentFollowers.size;
    }
    
    console.log(`📊 Scraped ${currentFollowers.size} followers...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log(`✅ Finished scraping: ${currentFollowers.size} followers`);
  
  // Load previous snapshot
  let previousSnapshot = null;
  try {
    const saved = localStorage.getItem(CONFIG.storageKey);
    if (saved) {
      previousSnapshot = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('⚠️ Could not load previous snapshot');
  }
  
  const timestamp = new Date().toISOString();
  
  // Save current snapshot
  const snapshot = {
    savedAt: timestamp,
    count: currentFollowers.size,
    followers: Object.fromEntries(currentFollowers)
  };
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(snapshot));
  console.log('💾 Saved new snapshot to localStorage');
  console.log('');
  
  // Compare if we have previous data
  if (!previousSnapshot) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📸 FIRST SNAPSHOT SAVED!                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Followers saved: ${currentFollowers.size}`);
    console.log('');
    console.log('💡 Run this script again later to detect unfollowers!');
    
    window.followerSnapshot = snapshot;
    return snapshot;
  }
  
  // Compare snapshots
  console.log('🔄 Comparing with previous snapshot...');
  console.log(`   Previous: ${previousSnapshot.count} followers (${previousSnapshot.savedAt})`);
  console.log(`   Current: ${currentFollowers.size} followers`);
  console.log('');
  
  const previousUsernames = new Set(Object.keys(previousSnapshot.followers));
  const currentUsernames = new Set(currentFollowers.keys());
  
  // Find unfollowers (in previous but not current)
  const unfollowers = [];
  previousUsernames.forEach(username => {
    if (!currentUsernames.has(username)) {
      unfollowers.push({
        username,
        displayName: previousSnapshot.followers[username]
      });
    }
  });
  
  // Find new followers (in current but not previous)
  const newFollowers = [];
  currentUsernames.forEach(username => {
    if (!previousUsernames.has(username)) {
      newFollowers.push({
        username,
        displayName: currentFollowers.get(username)
      });
    }
  });
  
  // Display results
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📊 RESULTS                                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (unfollowers.length > 0) {
    console.log(`🚫 UNFOLLOWERS (${unfollowers.length}):`);
    unfollowers.forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username} (${u.displayName})`);
      console.log(`      https://x.com/${u.username}`);
    });
    console.log('');
  } else {
    console.log('✅ No unfollowers detected!');
    console.log('');
  }
  
  if (newFollowers.length > 0) {
    console.log(`🆕 NEW FOLLOWERS (${newFollowers.length}):`);
    newFollowers.forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username} (${u.displayName})`);
    });
    console.log('');
  } else {
    console.log('📭 No new followers since last check.');
    console.log('');
  }
  
  // Download report
  if (CONFIG.autoDownload && (unfollowers.length > 0 || newFollowers.length > 0)) {
    let report = `UNFOLLOWER DETECTION REPORT\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Previous snapshot: ${previousSnapshot.savedAt}\n`;
    report += `Previous count: ${previousSnapshot.count}\n`;
    report += `Current count: ${currentFollowers.size}\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    if (unfollowers.length > 0) {
      report += `UNFOLLOWERS (${unfollowers.length}):\n`;
      report += `${'-'.repeat(30)}\n`;
      unfollowers.forEach((u, i) => {
        report += `${i + 1}. @${u.username} (${u.displayName})\n`;
        report += `   https://x.com/${u.username}\n`;
      });
      report += '\n';
    }
    
    if (newFollowers.length > 0) {
      report += `NEW FOLLOWERS (${newFollowers.length}):\n`;
      report += `${'-'.repeat(30)}\n`;
      newFollowers.forEach((u, i) => {
        report += `${i + 1}. @${u.username} (${u.displayName})\n`;
      });
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unfollowers_${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('💾 Report downloaded!');
  }
  
  const result = {
    timestamp,
    previous: previousSnapshot.count,
    current: currentFollowers.size,
    unfollowers,
    newFollowers
  };
  
  window.unfollowerReport = result;
  console.log('');
  console.log('💡 Access data via: window.unfollowerReport');
  
  return result;
})();
