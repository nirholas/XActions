// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================================
 * 📅 Unlike Old Tweets - XActions
 * ============================================================================
 * 
 * @name        unlike-old.js
 * @description Unlikes tweets older than a specified number of days from your likes page
 * @author      nichxbt
 * @version     1.0.0
 * @date        2026-01-26
 * @usage       Go to x.com/YOUR_USERNAME/likes, open console, paste & run
 * 
 * ============================================================================
 */

(async function unlikeOldTweets() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎛️ CONFIGURATION - Customize these settings
  // ═══════════════════════════════════════════════════════════════════════════
  const CONFIG = {
    daysOld: 30,               // Only unlike tweets older than this many days
    maxUnlikes: 500,           // Maximum number of tweets to unlike (set to Infinity for all)
    minDelay: 1000,            // Minimum delay between unlikes (ms)
    maxDelay: 2500,            // Maximum delay between unlikes (ms)
    scrollDelay: 1500,         // Delay after scrolling to load more tweets (ms)
    maxScrollAttempts: 10,     // Max scroll attempts when no new old tweets found
    logProgress: true          // Log progress updates
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 SELECTORS
  // ═══════════════════════════════════════════════════════════════════════════
  const SELECTORS = {
    unlikeButton: '[data-testid="unlike"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    timestamp: 'time[datetime]'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛠️ HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    return Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  const getTweetAge = (tweetElement) => {
    const timeElement = tweetElement.querySelector(SELECTORS.timestamp);
    if (!timeElement) return null;
    
    const tweetDate = new Date(timeElement.getAttribute('datetime'));
    const now = new Date();
    const diffMs = now - tweetDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return {
      days: diffDays,
      date: tweetDate,
      isOld: diffDays >= CONFIG.daysOld
    };
  };

  const findOldTweetsWithUnlike = () => {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    const oldTweets = [];
    
    tweets.forEach(tweet => {
      const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
      if (!unlikeButton) return;
      
      const age = getTweetAge(tweet);
      if (age && age.isOld) {
        oldTweets.push({
          element: tweet,
          button: unlikeButton,
          age: age
        });
      }
    });
    
    return oldTweets;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚀 MAIN SCRIPT
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📅 UNLIKE OLD TWEETS - XActions                             ║
║  by nichxbt                                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Verify we're on the likes page
  if (!window.location.href.includes('/likes')) {
    console.error('❌ Error: Please navigate to your likes page first!');
    console.log('📍 Go to: x.com/YOUR_USERNAME/likes');
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.daysOld);

  console.log('📋 Configuration:');
  console.log(`   • Unlike tweets older than: ${CONFIG.daysOld} days`);
  console.log(`   • Cutoff date: ${cutoffDate.toLocaleDateString()}`);
  console.log(`   • Max unlikes: ${CONFIG.maxUnlikes === Infinity ? 'Unlimited' : CONFIG.maxUnlikes}`);
  console.log(`   • Delay range: ${CONFIG.minDelay}ms - ${CONFIG.maxDelay}ms`);
  console.log('');

  console.log('🚀 Starting unlike process for old tweets...');
  console.log('💡 To stop early: window.stopUnlike()');
  console.log('');

  // Stats tracking
  const stats = {
    unliked: 0,
    skipped: 0,
    errors: 0,
    startTime: Date.now(),
    processedTweets: new Set()
  };

  let scrollAttempts = 0;
  let consecutiveNoOldTweets = 0;
  let stopped = false;
  window.stopUnlike = () => {
    stopped = true;
    console.log('🛑 Stopping after the current unlike...');
  };

  // Main loop
  while (stats.unliked < CONFIG.maxUnlikes && !stopped) {
    // Find old tweets with unlike buttons
    const oldTweets = findOldTweetsWithUnlike();
    
    // Filter out already processed tweets
    const newOldTweets = oldTweets.filter(t => {
      const tweetId = t.element.getAttribute('aria-labelledby') || 
                      t.element.textContent.substring(0, 50);
      return !stats.processedTweets.has(tweetId);
    });

    if (newOldTweets.length === 0) {
      consecutiveNoOldTweets++;

      // Scroll to load more tweets. The Likes feed is sorted by like-recency,
      // not tweet age, so a long run of not-yet-old tweets is expected and
      // must not be treated as "reached the end" - only a feed that has
      // truly stopped growing (no new tweet articles after scrolling) means
      // there's nothing left to find.
      const tweetCountBefore = document.querySelectorAll(SELECTORS.tweet).length;

      // Check if we've been scrolling with no results
      if (consecutiveNoOldTweets >= 3) {
        console.log(`📜 Scrolling to find older tweets... (attempt ${scrollAttempts + 1}/${CONFIG.maxScrollAttempts})`);
      }

      scrollToBottom();
      await sleep(CONFIG.scrollDelay);

      const tweetCountAfter = document.querySelectorAll(SELECTORS.tweet).length;
      if (tweetCountAfter > tweetCountBefore) {
        // Feed is still growing - real progress, even though none of the
        // newly-loaded tweets qualified as "old" yet.
        scrollAttempts = 0;
      } else {
        scrollAttempts++;
        if (scrollAttempts >= CONFIG.maxScrollAttempts) {
          console.log('📭 Reached the end of the Likes feed. No more old tweets found.');
          break;
        }
      }
      continue;
    }

    // Reset counters when we find old tweets
    scrollAttempts = 0;
    consecutiveNoOldTweets = 0;

    // Process the first old tweet
    const { element, button, age } = newOldTweets[0];
    const tweetId = element.getAttribute('aria-labelledby') || 
                    element.textContent.substring(0, 50);
    
    stats.processedTweets.add(tweetId);

    try {
      // Scroll tweet into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(400);
      
      // Click the unlike button
      button.click();
      stats.unliked++;
      
      // Log progress with age info
      if (CONFIG.logProgress && stats.unliked % 5 === 0) {
        const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
        console.log(`📅 Progress: ${stats.unliked} unliked | ⏱️ ${formatTime(elapsed)} elapsed`);
      } else {
        console.log(`💔 Unliked tweet from ${age.days} days ago (${age.date.toLocaleDateString()})`);
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
║  ✅ UNLIKE OLD TWEETS COMPLETE                               ║
╠══════════════════════════════════════════════════════════════╣
║  📋 Criteria: Tweets older than ${String(CONFIG.daysOld + ' days').padEnd(25)}║
║  📊 Results:                                                 ║
║     📅 Old tweets unliked: ${String(stats.unliked).padEnd(33)}║
║     ❌ Errors: ${String(stats.errors).padEnd(45)}║
║     ⏱️  Total time: ${formatTime(totalTime).padEnd(40)}║
║     📈 Avg time/unlike: ${String(avgTime + 's').padEnd(36)}║
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log('👋 Thanks for using XActions! Follow @nichxbt for updates.');
  
  return stats;
})();
