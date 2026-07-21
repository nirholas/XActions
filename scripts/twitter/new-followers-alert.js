// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🆕 New Followers Alert
 * ============================================================
 * 
 * @name        new-followers-alert.js
 * @description Track new followers with welcome message templates
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your Followers page: https://x.com/YOUR_USERNAME/followers
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. New followers since last check will be displayed
 * 5. Welcome message templates are generated for easy DMs
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Scroll settings
  scrollDelay: 2000,
  maxScrolls: 100,
  maxRetries: 5,
  
  // Welcome message templates (customize these!)
  welcomeMessages: [
    "Hey {name}! Thanks for the follow! 🙏 Glad to connect!",
    "Welcome {name}! 👋 Thanks for following! What brings you here?",
    "Hey {name}! Appreciate the follow! Looking forward to connecting! 🚀",
    "Thanks for following {name}! Always great to meet new people! ✨"
  ],
  
  // Auto-download new followers list
  autoDownload: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function newFollowersAlert() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $userCell = '[data-testid="UserCell"]';
  const STORAGE_KEY = 'xactions_followers_snapshot';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🆕 NEW FOLLOWERS ALERT                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/followers')) {
    console.error('❌ ERROR: Must be on your Followers page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }
  
  console.log('🚀 Scanning followers...');
  console.log('');
  
  /**
   * Get user info from cell
   */
  function getUserInfo(cell) {
    const link = cell.querySelector('a[href^="/"]');
    const username = link ? link.getAttribute('href')?.replace('/', '').split('/')[0] : null;
    
    const nameSpan = cell.querySelector('[dir="ltr"] span');
    const displayName = nameSpan ? nameSpan.textContent : username;
    
    return { username, displayName };
  }
  
  // Scrape followers
  const followers = new Map(); // username -> displayName
  let lastCount = 0;
  let retries = 0;
  let scrolls = 0;
  
  while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    document.querySelectorAll($userCell).forEach(cell => {
      const { username, displayName } = getUserInfo(cell);
      if (username && !followers.has(username)) {
        followers.set(username, displayName);
      }
    });
    
    if (followers.size === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = followers.size;
    }
    
    console.log(`📊 Found ${followers.size} followers...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log(`✅ Total followers: ${followers.size}`);
  console.log('');
  
  // Load previous snapshot
  let previous = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) previous = JSON.parse(saved);
  } catch (e) {}
  
  const timestamp = new Date().toISOString();
  
  // Save current
  const snapshot = {
    savedAt: timestamp,
    count: followers.size,
    followers: Object.fromEntries(followers)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  
  if (!previous) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📸 FIRST SNAPSHOT SAVED!                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 ${followers.size} followers saved`);
    console.log('');
    console.log('💡 Run again later to see new followers!');
    return;
  }
  
  // Find new followers
  const prevSet = new Set(Object.keys(previous.followers));
  const newFollowers = [];
  const unfollowers = [];
  
  followers.forEach((displayName, username) => {
    if (!prevSet.has(username)) {
      newFollowers.push({ username, displayName });
    }
  });
  
  prevSet.forEach(username => {
    if (!followers.has(username)) {
      unfollowers.push({ username, displayName: previous.followers[username] });
    }
  });
  
  // Display results
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📊 FOLLOWER CHANGES                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📅 Since: ${previous.savedAt}`);
  console.log(`📈 Previous: ${previous.count} → Current: ${followers.size}`);
  console.log('');
  
  if (newFollowers.length > 0) {
    console.log(`🆕 NEW FOLLOWERS (${newFollowers.length}):`);
    console.log('');
    
    newFollowers.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.displayName} (@${f.username})`);
      console.log(`      🔗 https://x.com/${f.username}`);
      
      // Generate welcome message
      const template = CONFIG.welcomeMessages[i % CONFIG.welcomeMessages.length];
      const message = template.replace('{name}', f.displayName.split(' ')[0]);
      console.log(`      💬 "${message}"`);
      console.log('');
    });
  } else {
    console.log('📭 No new followers since last check.');
    console.log('');
  }
  
  if (unfollowers.length > 0) {
    console.log(`🚫 UNFOLLOWED (${unfollowers.length}):`);
    unfollowers.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.displayName} (@${f.username})`);
    });
    console.log('');
  }
  
  // Download report
  if (CONFIG.autoDownload && newFollowers.length > 0) {
    let report = `NEW FOLLOWERS REPORT\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Since: ${previous.savedAt}\n`;
    report += `New followers: ${newFollowers.length}\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    report += `NEW FOLLOWERS:\n`;
    report += `${'-'.repeat(30)}\n\n`;
    
    newFollowers.forEach((f, i) => {
      report += `${i + 1}. ${f.displayName} (@${f.username})\n`;
      report += `   Profile: https://x.com/${f.username}\n`;
      
      const template = CONFIG.welcomeMessages[i % CONFIG.welcomeMessages.length];
      const message = template.replace('{name}', f.displayName.split(' ')[0]);
      report += `   Welcome Message: ${message}\n`;
      report += '\n';
    });
    
    if (unfollowers.length > 0) {
      report += `\nUNFOLLOWERS (${unfollowers.length}):\n`;
      report += `${'-'.repeat(30)}\n`;
      unfollowers.forEach((f, i) => {
        report += `${i + 1}. ${f.displayName} (@${f.username})\n`;
      });
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `new_followers_${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    console.log('💾 Report downloaded!');
  }
  
  // Copy welcome messages for easy pasting
  if (newFollowers.length > 0) {
    const messages = newFollowers.map((f, i) => {
      const template = CONFIG.welcomeMessages[i % CONFIG.welcomeMessages.length];
      return `@${f.username}: ${template.replace('{name}', f.displayName.split(' ')[0])}`;
    }).join('\n\n');
    
    try {
      await navigator.clipboard.writeText(messages);
      console.log('📋 Welcome messages copied to clipboard!');
    } catch (e) {}
  }
  
  const result = { timestamp, newFollowers, unfollowers };
  window.newFollowersResult = result;
  console.log('');
  console.log('💡 Access via: window.newFollowersResult');
  
  return result;
})();
