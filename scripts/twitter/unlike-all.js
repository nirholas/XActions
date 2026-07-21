// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================================
 * 💔 Unlike All Tweets - XActions
 * ============================================================================
 * 
 * @name        unlike-all.js
 * @description Unlikes all liked tweets from your likes page (x.com/USERNAME/likes)
 * @author      nichxbt
 * @version     1.0.0
 * @date        2026-01-26
 * @usage       Go to x.com/YOUR_USERNAME/likes, open console, paste & run
 * 
 * ============================================================================
 */

(async function unlikeAllTweets() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎛️ CONFIGURATION - Customize these settings
  // ═══════════════════════════════════════════════════════════════════════════
  const CONFIG = {
    maxUnlikes: 1000,          // Maximum number of tweets to unlike (set to Infinity for all)
    minDelay: 1000,            // Minimum delay between unlikes (ms)
    maxDelay: 2500,            // Maximum delay between unlikes (ms)
    scrollDelay: 1500,         // Delay after scrolling to load more tweets (ms)
    confirmBeforeStart: true,  // Show confirmation dialog before starting
    maxScrollAttempts: 5,      // Max scroll attempts when no new tweets load
    logProgress: true          // Log progress every N unlikes
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 SELECTORS
  // ═══════════════════════════════════════════════════════════════════════════
  const SELECTORS = {
    unlikeButton: '[data-testid="unlike"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛠️ HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    return Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
  };

  const getUnlikeButtons = () => {
    return document.querySelectorAll(SELECTORS.unlikeButton);
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚀 MAIN SCRIPT
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  💔 UNLIKE ALL TWEETS - XActions                             ║
║  by nichxbt                                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Verify we're on the likes page
  if (!window.location.href.includes('/likes')) {
    console.error('❌ Error: Please navigate to your likes page first!');
    console.log('📍 Go to: x.com/YOUR_USERNAME/likes');
    return;
  }

  console.log('📋 Configuration:');
  console.log(`   • Max unlikes: ${CONFIG.maxUnlikes === Infinity ? 'Unlimited' : CONFIG.maxUnlikes}`);
  console.log(`   • Delay range: ${CONFIG.minDelay}ms - ${CONFIG.maxDelay}ms`);
  console.log('');

  // Confirmation dialog
  if (CONFIG.confirmBeforeStart) {
    const confirmed = confirm(
      `💔 Unlike All Tweets\n\n` +
      `This will unlike up to ${CONFIG.maxUnlikes === Infinity ? 'ALL' : CONFIG.maxUnlikes} tweets.\n\n` +
      `⚠️ This action cannot be easily undone!\n\n` +
      `Click OK to proceed or Cancel to abort.`
    );
    
    if (!confirmed) {
      console.log('🛑 Operation cancelled by user.');
      return;
    }
  }

  console.log('🚀 Starting unlike process...');
  console.log('💡 To stop early: window.stopUnlike()');
  console.log('');

  // Stats tracking
  const stats = {
    unliked: 0,
    errors: 0,
    startTime: Date.now()
  };

  let scrollAttempts = 0;
  let lastButtonCount = 0;
  let stopped = false;
  window.stopUnlike = () => {
    stopped = true;
    console.log('🛑 Stopping after the current unlike...');
  };

  // Main loop
  while (stats.unliked < CONFIG.maxUnlikes && !stopped) {
    const unlikeButtons = getUnlikeButtons();
    
    if (unlikeButtons.length === 0) {
      // No unlike buttons found, try scrolling to load more
      if (scrollAttempts >= CONFIG.maxScrollAttempts) {
        console.log('📭 No more liked tweets found after multiple scroll attempts.');
        break;
      }
      
      console.log(`📜 Scrolling to load more tweets... (attempt ${scrollAttempts + 1}/${CONFIG.maxScrollAttempts})`);
      scrollToBottom();
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
      continue;
    }

    // Reset scroll attempts if we found new buttons
    if (unlikeButtons.length !== lastButtonCount) {
      scrollAttempts = 0;
      lastButtonCount = unlikeButtons.length;
    }

    // Get the first unlike button
    const button = unlikeButtons[0];
    
    try {
      // Scroll button into view
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);
      
      // Click the unlike button
      button.click();
      stats.unliked++;
      
      // Log progress
      if (CONFIG.logProgress && stats.unliked % 10 === 0) {
        const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
        console.log(`💔 Progress: ${stats.unliked} unliked | ⏱️ ${formatTime(elapsed)} elapsed`);
      } else if (stats.unliked % 5 === 0) {
        console.log(`💔 Unliked: ${stats.unliked}`);
      }
      
      // Random delay before next action
      await sleep(randomDelay());
      
    } catch (error) {
      stats.errors++;
      console.warn(`⚠️ Error unliking tweet: ${error.message}`);
      await sleep(1000);
    }

    // Check if we've hit the limit
    if (stats.unliked >= CONFIG.maxUnlikes) {
      console.log(`🎯 Reached maximum unlike limit (${CONFIG.maxUnlikes})`);
      break;
    }
  }

  delete window.stopUnlike;

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 COMPLETION SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const totalTime = Math.floor((Date.now() - stats.startTime) / 1000);
  const avgTime = stats.unliked > 0 ? (totalTime / stats.unliked).toFixed(2) : 0;

  console.log('');
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ UNLIKE ALL COMPLETE                                      ║
╠══════════════════════════════════════════════════════════════╣
║  📊 Results:                                                 ║
║     💔 Tweets unliked: ${String(stats.unliked).padEnd(37)}║
║     ❌ Errors: ${String(stats.errors).padEnd(45)}║
║     ⏱️  Total time: ${formatTime(totalTime).padEnd(40)}║
║     📈 Avg time/unlike: ${String(avgTime + 's').padEnd(36)}║
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log('👋 Thanks for using XActions! Follow @nichxbt for updates.');
  
  return stats;
})();
