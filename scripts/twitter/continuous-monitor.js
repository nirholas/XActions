// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * ============================================================
 * 🔄 Continuous Monitor
 * ============================================================
 * 
 * @name        continuous-monitor.js
 * @description Auto-refresh monitoring with browser notifications for follower changes
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to any user's Followers page: https://x.com/USER/followers
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. KEEP THE TAB OPEN - it will auto-check periodically
 * 5. You'll get browser notifications when changes occur
 * 
 * ⚠️ NOTE: You'll be asked to allow notifications
 * 
 * To stop monitoring: window.stopMonitor()
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`/`let`): DevTools keeps top-level lexical bindings alive
// across separate console pastes, so a `const` here throws "already been
// declared" the second time this script is pasted in the same tab -
// breaking the documented "run again to keep monitoring" workflow.
var CONFIG = {
  // How often to check (minutes)
  checkIntervalMinutes: 5,
  
  // Enable browser notifications
  enableNotifications: true,
  
  // Enable sound alert
  enableSound: true,
  
  // Scroll delay when scraping
  scrollDelay: 1500,
  
  // Max scrolls per check
  maxScrolls: 50,
  
  // Max retries when no new users
  maxRetries: 3
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function continuousMonitor() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Re-pasting the script must not stack a second timer on top of a still-running
  // one - that would double (then triple, ...) every check and every notification.
  if (typeof window.stopMonitor === 'function') {
    try { window.stopMonitor(); } catch (e) { /* ignore */ }
  }

  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 CONTINUOUS MONITOR                                     ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Detect page
  const url = window.location.href;
  const pathMatch = url.match(/x\.com\/([^\/]+)\/(followers|following)/);
  
  if (!pathMatch) {
    console.error('❌ ERROR: Must be on a followers or following page!');
    return;
  }
  
  const username = pathMatch[1];
  const pageType = pathMatch[2];
  const storageKey = `xactions_continuous_${username}_${pageType}`;
  
  console.log(`👤 Monitoring: @${username}/${pageType}`);
  console.log(`⏱️ Check interval: ${CONFIG.checkIntervalMinutes} minutes`);
  console.log('');
  
  // Request notification permission
  if (CONFIG.enableNotifications && 'Notification' in window) {
    if (Notification.permission === 'default') {
      console.log('🔔 Requesting notification permission...');
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      console.log('✅ Notifications enabled');
    } else {
      console.log('⚠️ Notifications denied - will only show in console');
    }
  }
  
  /**
   * Play notification sound
   */
  function playSound() {
    if (!CONFIG.enableSound) return;
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVUYKm2i4LuUZz8WHVmIpbGniFo5S3+FdWVxdZGdnIVcNjtjlbzOtINGGSl5q9rSmFkkBEKY2OmpaC0UQoHPtHtGFRxii8DDoJxZKS9VhKSahpBdM0FYanRoZmNnc3F3d3V1c3ZzdnFyb2xnaGlubnFwbm1xdXh9g4SFgoKAf4B/e3Z1dHR0dHRyc3N0dHV2d3l7fHx8fH1+f4CBgoKCgYGBgYGAf39+fX18fHt7enp5eXl5eXl5');
      audio.play().catch(() => {});
    } catch (e) {}
  }
  
  /**
   * Send notification
   */
  function notify(title, body) {
    if (CONFIG.enableNotifications && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'https://abs.twimg.com/favicons/twitter.3.ico' });
    }
    playSound();
  }
  
  /**
   * Get username from cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    return link ? link.getAttribute('href')?.replace('/', '').split('/')[0] : null;
  }
  
  /**
   * Scrape current users
   */
  async function scrapeUsers() {
    const users = new Set();
    let lastCount = 0;
    let retries = 0;
    let scrolls = 0;
    
    // Scroll to top first
    window.scrollTo(0, 0);
    await sleep(500);
    
    while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
      document.querySelectorAll($userCell).forEach(cell => {
        const u = getUsername(cell);
        if (u) users.add(u);
      });
      
      if (users.size === lastCount) {
        retries++;
      } else {
        retries = 0;
        lastCount = users.size;
      }
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;
    }
    
    // Scroll back to top
    window.scrollTo(0, 0);
    
    return users;
  }
  
  /**
   * Perform a check
   */
  let checkRunning = false;
  async function performCheck() {
    // A scrape can take longer than a short check interval; never let two
    // checks scroll the page at the same time
    if (checkRunning) return;
    checkRunning = true;
    try {
      await runCheck();
    } finally {
      checkRunning = false;
    }
  }

  async function runCheck() {
    const checkTime = new Date().toLocaleTimeString();
    console.log(`\n🔄 [${checkTime}] Checking for changes...`);
    
    const currentUsers = await scrapeUsers();
    console.log(`   Scraped ${currentUsers.size} users`);
    
    // Load previous
    let previous = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) previous = JSON.parse(saved);
    } catch (e) {}
    
    // Save current
    const snapshot = {
      savedAt: new Date().toISOString(),
      users: Array.from(currentUsers)
    };
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
    
    if (!previous) {
      console.log('   📸 First snapshot saved');
      return;
    }
    
    // Compare
    const prevSet = new Set(previous.users);
    
    const removed = [];
    prevSet.forEach(u => {
      if (!currentUsers.has(u)) removed.push(u);
    });
    
    const added = [];
    currentUsers.forEach(u => {
      if (!prevSet.has(u)) added.push(u);
    });
    
    if (removed.length === 0 && added.length === 0) {
      console.log('   ✅ No changes');
      return;
    }
    
    // Changes detected!
    console.log('');
    console.log('   ⚡ CHANGES DETECTED!');
    
    if (removed.length > 0) {
      console.log(`   🚫 Removed (${removed.length}): ${removed.join(', ')}`);
      notify(`🚫 ${removed.length} Unfollowers`, removed.slice(0, 3).map(u => '@' + u).join(', '));
    }
    
    if (added.length > 0) {
      console.log(`   🆕 Added (${added.length}): ${added.join(', ')}`);
      notify(`🆕 ${added.length} New Followers`, added.slice(0, 3).map(u => '@' + u).join(', '));
    }
  }
  
  // Initial check
  console.log('🚀 Running initial check...');
  await performCheck();
  
  // Schedule periodic checks
  const intervalMs = CONFIG.checkIntervalMinutes * 60 * 1000;
  const intervalId = setInterval(performCheck, intervalMs);
  
  // Store stop function
  window.stopMonitor = () => {
    clearInterval(intervalId);
    console.log('');
    console.log('🛑 Monitoring stopped');
    console.log('');
  };
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ MONITORING ACTIVE                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏱️ Next check in ${CONFIG.checkIntervalMinutes} minutes`);
  console.log('');
  console.log('💡 Keep this tab open!');
  console.log('💡 To stop: window.stopMonitor()');
  console.log('');
})();
