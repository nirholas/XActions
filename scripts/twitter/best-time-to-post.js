// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * ⏰ Best Time To Post
 * ============================================================
 * 
 * @name        best-time-to-post.js
 * @description Analyze when your audience is most active
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your profile page: https://x.com/YOUR_USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Analyzes your posts to find optimal posting times
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // Number of posts to analyze
  maxPosts: 100,
  
  // Delay between scrolls (ms)
  scrollDelay: 1500,
  
  // Maximum scroll attempts
  maxScrolls: 50,
  
  // Retry when no new posts found
  maxRetries: 3
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function bestTimeToPost() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ⏰ XActions — Best Time To Post                             ║
║  Analyze when your audience is most active                   ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const username = window.location.pathname.match(/^\/([^\/]+)/)?.[1];
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  console.log(`📊 Analyzing posting patterns for @${username}\n`);
  console.log('🔄 Scrolling to collect posts...\n');

  const posts = new Map();
  let retries = 0;
  let scrollCount = 0;

  while (posts.size < CONFIG.maxPosts && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = posts.size;
    
    document.querySelectorAll($tweet).forEach(tweet => {
      // Get tweet ID
      const timeLink = tweet.querySelector('a[href*="/status/"] time')?.closest('a');
      const tweetUrl = timeLink?.getAttribute('href') || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
      
      if (!tweetId || posts.has(tweetId)) return;

      // Get timestamp
      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime');
      if (!timestamp) return;

      // Get engagement
      const likeBtn = tweet.querySelector($like);
      const retweetBtn = tweet.querySelector($retweet);
      const replyBtn = tweet.querySelector($reply);

      const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const retweets = parseCount(retweetBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');

      const date = new Date(timestamp);
      
      posts.set(tweetId, {
        id: tweetId,
        timestamp,
        hour: date.getHours(),
        dayOfWeek: date.getDay(),
        engagement: likes + retweets + replies,
        likes,
        retweets,
        replies
      });
    });

    if (posts.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${posts.size} posts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  const postsArray = Array.from(posts.values());
  
  if (postsArray.length < 10) {
    console.error('❌ Not enough posts to analyze. Need at least 10 posts.');
    return;
  }

  console.log(`\n✅ Analyzed ${postsArray.length} posts\n`);

  // Analyze by hour
  const hourStats = {};
  for (let h = 0; h < 24; h++) {
    hourStats[h] = { posts: 0, totalEngagement: 0 };
  }

  postsArray.forEach(p => {
    hourStats[p.hour].posts++;
    hourStats[p.hour].totalEngagement += p.engagement;
  });

  // Calculate average engagement per hour
  const hourlyAvg = Object.entries(hourStats)
    .filter(([_, data]) => data.posts > 0)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      posts: data.posts,
      avgEngagement: data.totalEngagement / data.posts
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Analyze by day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats = {};
  for (let d = 0; d < 7; d++) {
    dayStats[d] = { posts: 0, totalEngagement: 0 };
  }

  postsArray.forEach(p => {
    dayStats[p.dayOfWeek].posts++;
    dayStats[p.dayOfWeek].totalEngagement += p.engagement;
  });

  const dailyAvg = Object.entries(dayStats)
    .filter(([_, data]) => data.posts > 0)
    .map(([day, data]) => ({
      day: parseInt(day),
      dayName: dayNames[parseInt(day)],
      posts: data.posts,
      avgEngagement: data.totalEngagement / data.posts
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Format hour for display
  const formatHour = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  const formatNum = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  // Output results
  console.log('═'.repeat(60));
  console.log('⏰ BEST TIMES TO POST');
  console.log('═'.repeat(60));

  console.log('\n🕐 BY HOUR (Your Local Time):');
  console.log('─'.repeat(50));
  
  hourlyAvg.slice(0, 8).forEach((h, i) => {
    const bar = '█'.repeat(Math.round(h.avgEngagement / (hourlyAvg[0].avgEngagement || 1) * 20));
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${medal} ${formatHour(h.hour).padEnd(10)} ${bar} ${formatNum(h.avgEngagement)} avg (${h.posts} posts)`);
  });

  console.log('\n📅 BY DAY OF WEEK:');
  console.log('─'.repeat(50));
  
  dailyAvg.forEach((d, i) => {
    const bar = '█'.repeat(Math.round(d.avgEngagement / (dailyAvg[0].avgEngagement || 1) * 20));
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${medal} ${d.dayName.padEnd(12)} ${bar} ${formatNum(d.avgEngagement)} avg (${d.posts} posts)`);
  });

  // Create heatmap
  console.log('\n📊 ENGAGEMENT HEATMAP:');
  console.log('─'.repeat(50));
  console.log('        ' + ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'].join('  '));
  
  const heatmapData = {};
  postsArray.forEach(p => {
    const key = `${p.dayOfWeek}-${Math.floor(p.hour / 3)}`;
    if (!heatmapData[key]) heatmapData[key] = { count: 0, engagement: 0 };
    heatmapData[key].count++;
    heatmapData[key].engagement += p.engagement;
  });

  const heatValues = Object.values(heatmapData).map(d => d.engagement / d.count);
  const maxHeat = heatValues.length > 0 ? Math.max(...heatValues) : 0;
  const heatChars = [' ', '░', '▒', '▓', '█'];

  dayNames.forEach((day, d) => {
    let row = day.slice(0, 3).padEnd(4) + '    ';
    for (let h = 0; h < 8; h++) {
      const key = `${d}-${h}`;
      const data = heatmapData[key];
      if (data) {
        const intensity = maxHeat > 0
          ? Math.min(4, Math.floor((data.engagement / data.count) / maxHeat * 4))
          : 0;
        row += heatChars[intensity] + '    ';
      } else {
        row += '·    ';
      }
    }
    console.log(row);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('🎯 RECOMMENDATIONS');
  console.log('═'.repeat(60));

  const bestHour = hourlyAvg[0];
  const bestDay = dailyAvg[0];
  const worstHour = hourlyAvg[hourlyAvg.length - 1];

  console.log(`\n✅ BEST time to post: ${bestDay.dayName} at ${formatHour(bestHour.hour)}`);
  console.log(`   Average engagement: ${formatNum(bestHour.avgEngagement)}`);
  
  console.log(`\n❌ WORST time to post: ${formatHour(worstHour.hour)}`);
  console.log(`   Average engagement: ${formatNum(worstHour.avgEngagement)}`);

  // Top 3 time slots
  console.log('\n🏆 TOP 3 POSTING TIMES:');
  hourlyAvg.slice(0, 3).forEach((h, i) => {
    console.log(`   ${i + 1}. ${formatHour(h.hour)} — ${formatNum(h.avgEngagement)} avg engagement`);
  });

  // Save analysis
  const storageKey = `xactions_best_time_${username}`;
  localStorage.setItem(storageKey, JSON.stringify({
    username,
    timestamp: new Date().toISOString(),
    postCount: postsArray.length,
    hourlyAvg,
    dailyAvg
  }));

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Analysis saved to localStorage`);
  console.log('═'.repeat(60) + '\n');

})();
