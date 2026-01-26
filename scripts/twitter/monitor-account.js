/**
 * ============================================================
 * 👁️ Monitor Account
 * ============================================================
 * 
 * @name        monitor-account.js
 * @description Track followers/following changes on ANY public account
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to any user's Followers or Following page:
 *    - https://x.com/ANYUSER/followers
 *    - https://x.com/ANYUSER/following
 * 
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Run again later to detect changes
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
  autoDownload: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function monitorAccount() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👁️ MONITOR ACCOUNT                                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Detect page type and user
  const url = window.location.href;
  const pathMatch = url.match(/x\.com\/([^\/]+)\/(followers|following)/);
  
  if (!pathMatch) {
    console.error('❌ ERROR: Must be on a followers or following page!');
    console.log('📍 Example: https://x.com/elonmusk/followers');
    return;
  }
  
  const username = pathMatch[1];
  const pageType = pathMatch[2]; // 'followers' or 'following'
  const storageKey = `xactions_monitor_${username}_${pageType}`;
  
  console.log(`👤 Monitoring: @${username}`);
  console.log(`📋 Page type: ${pageType}`);
  console.log('');
  console.log('🚀 Scraping current list...');
  
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
  
  function getDisplayName(cell) {
    const span = cell.querySelector('[dir="ltr"] span');
    return span ? span.textContent : null;
  }
  
  // Scrape users
  const currentUsers = new Map();
  let lastCount = 0;
  let retries = 0;
  let scrolls = 0;
  
  while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const cells = document.querySelectorAll($userCell);
    
    cells.forEach(cell => {
      const user = getUsername(cell);
      const name = getDisplayName(cell);
      if (user && !currentUsers.has(user)) {
        currentUsers.set(user, name || user);
      }
    });
    
    if (currentUsers.size === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = currentUsers.size;
    }
    
    console.log(`📊 Scraped ${currentUsers.size} accounts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log(`✅ Finished: ${currentUsers.size} accounts`);
  console.log('');
  
  // Load previous
  let previous = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) previous = JSON.parse(saved);
  } catch (e) {}
  
  const timestamp = new Date().toISOString();
  
  // Save current
  const snapshot = {
    savedAt: timestamp,
    username,
    pageType,
    count: currentUsers.size,
    users: Object.fromEntries(currentUsers)
  };
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
  console.log('💾 Snapshot saved');
  
  if (!previous) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📸 FIRST SNAPSHOT SAVED!                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 @${username}'s ${pageType}: ${currentUsers.size}`);
    console.log('');
    console.log('💡 Run again later to detect changes!');
    
    window.accountSnapshot = snapshot;
    return snapshot;
  }
  
  // Compare
  console.log('🔄 Comparing with previous snapshot...');
  console.log(`   Previous: ${previous.count} (${previous.savedAt})`);
  console.log(`   Current: ${currentUsers.size}`);
  console.log('');
  
  const prevSet = new Set(Object.keys(previous.users));
  const currSet = new Set(currentUsers.keys());
  
  // Removed
  const removed = [];
  prevSet.forEach(u => {
    if (!currSet.has(u)) {
      removed.push({ username: u, displayName: previous.users[u] });
    }
  });
  
  // Added
  const added = [];
  currSet.forEach(u => {
    if (!prevSet.has(u)) {
      added.push({ username: u, displayName: currentUsers.get(u) });
    }
  });
  
  // Results
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📊 CHANGES DETECTED                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (removed.length > 0) {
    const label = pageType === 'followers' ? 'UNFOLLOWED' : 'STOPPED FOLLOWING';
    console.log(`🚫 ${label} (${removed.length}):`);
    removed.forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username}`);
    });
    console.log('');
  }
  
  if (added.length > 0) {
    const label = pageType === 'followers' ? 'NEW FOLLOWERS' : 'NOW FOLLOWING';
    console.log(`🆕 ${label} (${added.length}):`);
    added.forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username}`);
    });
    console.log('');
  }
  
  if (removed.length === 0 && added.length === 0) {
    console.log('✅ No changes detected!');
  }
  
  // Download report
  if (CONFIG.autoDownload && (removed.length > 0 || added.length > 0)) {
    let report = `ACCOUNT MONITOR REPORT\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Account: @${username}\n`;
    report += `Type: ${pageType}\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Previous: ${previous.count} (${previous.savedAt})\n`;
    report += `Current: ${currentUsers.size}\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    if (removed.length > 0) {
      report += `REMOVED (${removed.length}):\n`;
      removed.forEach((u, i) => {
        report += `${i + 1}. @${u.username}\n`;
      });
      report += '\n';
    }
    
    if (added.length > 0) {
      report += `ADDED (${added.length}):\n`;
      added.forEach((u, i) => {
        report += `${i + 1}. @${u.username}\n`;
      });
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${username}_${pageType}_changes_${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log('💾 Report downloaded!');
  }
  
  const result = { username, pageType, removed, added, timestamp };
  window.accountChanges = result;
  console.log('💡 Access via: window.accountChanges');
  
  return result;
})();
