// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        bestTimeToPost.js
 * @title       Best Time to Post
 * @description Analyze a profile's posting history and engagement to find the best days and hours to post.
 * @category    analytics
 * @page        x.com/<you> or x.com/<username>
 * @writes      false
 * @aliases     scripts/bestTimeToPost.js, scripts/twitter/best-time-to-post.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * Usage (browser/bestTimeToPost.js):
 * 1. Go to https://x.com/YOUR_USERNAME
 * 2. Open the Developer Console (F12)
 * 3. Paste this into the Developer Console and run it
 */
(() => {
  const CONFIG = {
    maxPosts: 100,
    scrollDelay: 1500,
    maxScrollAttempts: 40,  // Hard cap on scrolls, even while new posts keep loading
    maxRetries: 3,          // Stop after this many scrolls in a row that load no new posts
    minPosts: 0,            // Refuse to report with fewer posts than this (0 = always report)
    exportResults: true,
    showHeatmap: false,     // Also print a day x 3-hour engagement heatmap
    showWorstTime: false,   // Also print the hour with the lowest average engagement
    use12HourClock: false,  // Print hours as "3:00 PM" instead of "15:00"
    saveToLocalStorage: false, // Save the analysis under localStorage key xactions_best_time_<username>
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2]) num *= { K: 1000, M: 1000000, B: 1000000000 }[match[2].toUpperCase()];
    return Math.round(num);
  };

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const formatHour = (hourLabel) => {
    if (!CONFIG.use12HourClock) return hourLabel;
    const h = parseInt(hourLabel, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:00 ${ampm}`;
  };

  const run = async () => {
    console.log('⏰ BEST TIME TO POST - XActions by nichxbt');

    const username = window.location.pathname.replace('/', '').split('/')[0];
    if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
      console.error('❌ Navigate to a profile page first! (x.com/YOUR_USERNAME)');
      return;
    }

    console.log(`📊 Analyzing @${username}'s posting patterns...\n`);

    const posts = new Map();
    let retries = 0;
    let scrollCount = 0;

    while (posts.size < CONFIG.maxPosts && retries < CONFIG.maxRetries && scrollCount < CONFIG.maxScrollAttempts) {
      const prevSize = posts.size;

      document.querySelectorAll($tweet).forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || posts.has(linkEl.href)) return;

        const timeEl = tweet.querySelector('time');
        if (!timeEl?.dateTime) return;

        const likeEl = tweet.querySelector($like);
        const rtEl = tweet.querySelector($retweet);
        const replyEl = tweet.querySelector($reply);

        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        const retweets = parseCount(rtEl?.getAttribute('aria-label') || '0');
        const replies = parseCount(replyEl?.getAttribute('aria-label') || '0');

        posts.set(linkEl.href, {
          timestamp: timeEl.dateTime,
          likes,
          retweets,
          replies,
          engagement: likes + retweets + replies,
        });
      });

      if (posts.size === prevSize) retries++;
      else retries = 0;

      console.log(`   Found ${posts.size} posts...`);

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollCount++;
    }

    const postsArray = [...posts.values()];
    console.log(`📊 Analyzed ${postsArray.length} posts\n`);

    if (postsArray.length < CONFIG.minPosts) {
      console.error(`❌ Not enough posts to analyze. Need at least ${CONFIG.minPosts}, found ${postsArray.length}. Try scrolling more.`);
      return;
    }

    // Build hour x day engagement matrix
    const hourEngagement = {};
    const dayEngagement = {};
    const hourDayMatrix = {};

    HOURS.forEach(h => { hourEngagement[h] = { total: 0, count: 0 }; });
    DAYS.forEach(d => { dayEngagement[d] = { total: 0, count: 0 }; });
    DAYS.forEach(d => { hourDayMatrix[d] = {}; HOURS.forEach(h => { hourDayMatrix[d][h] = { total: 0, count: 0 }; }); });

    postsArray.forEach(p => {
      const date = new Date(p.timestamp);
      const hour = HOURS[date.getHours()];
      const day = DAYS[date.getDay()];

      hourEngagement[hour].total += p.engagement;
      hourEngagement[hour].count++;
      dayEngagement[day].total += p.engagement;
      dayEngagement[day].count++;
      hourDayMatrix[day][hour].total += p.engagement;
      hourDayMatrix[day][hour].count++;
    });

    // Calculate averages
    const hourAvg = Object.entries(hourEngagement)
      .map(([hour, data]) => ({ hour, avg: data.count > 0 ? data.total / data.count : 0, posts: data.count }))
      .filter(h => h.posts > 0)
      .sort((a, b) => b.avg - a.avg);

    const dayAvg = Object.entries(dayEngagement)
      .map(([day, data]) => ({ day, avg: data.count > 0 ? data.total / data.count : 0, posts: data.count }))
      .filter(d => d.posts > 0)
      .sort((a, b) => b.avg - a.avg);

    // Find best combinations
    const combos = [];
    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        const data = hourDayMatrix[day][hour];
        if (data.count > 0) {
          combos.push({ day, hour, avg: data.total / data.count, posts: data.count });
        }
      });
    });
    combos.sort((a, b) => b.avg - a.avg);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ⏰ BEST TIME TO POST REPORT                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    console.log('\n📅 BEST DAYS (by avg engagement):');
    dayAvg.slice(0, 5).forEach((d, i) => {
      const bar = '█'.repeat(Math.min(20, Math.round(d.avg / (dayAvg[0]?.avg || 1) * 20)));
      console.log(`   ${i + 1}. ${d.day.padEnd(12)} ${bar} ${d.avg.toFixed(1)} avg (${d.posts} posts)`);
    });

    console.log('\n⏰ BEST HOURS (by avg engagement):');
    hourAvg.slice(0, 8).forEach((h, i) => {
      const bar = '█'.repeat(Math.min(20, Math.round(h.avg / (hourAvg[0]?.avg || 1) * 20)));
      console.log(`   ${i + 1}. ${formatHour(h.hour).padEnd(8)} ${bar} ${h.avg.toFixed(1)} avg (${h.posts} posts)`);
    });

    console.log('\n🏆 BEST DAY+HOUR COMBOS:');
    combos.slice(0, 5).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.day} at ${formatHour(c.hour)} - ${c.avg.toFixed(1)} avg engagement (${c.posts} posts)`);
    });

    if (CONFIG.showHeatmap && postsArray.length > 0) {
      console.log('\n📊 ENGAGEMENT HEATMAP (3-hour blocks, your local time):');
      console.log('        ' + ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'].join('  '));

      const heatmapData = {};
      postsArray.forEach(p => {
        const date = new Date(p.timestamp);
        const key = `${date.getDay()}-${Math.floor(date.getHours() / 3)}`;
        if (!heatmapData[key]) heatmapData[key] = { count: 0, engagement: 0 };
        heatmapData[key].count++;
        heatmapData[key].engagement += p.engagement;
      });

      const heatValues = Object.values(heatmapData).map(d => d.engagement / d.count);
      const maxHeat = heatValues.length > 0 ? Math.max(...heatValues) : 0;
      const heatChars = [' ', '░', '▒', '▓', '█'];

      DAYS.forEach((day, d) => {
        let row = day.slice(0, 3).padEnd(4) + '    ';
        for (let block = 0; block < 8; block++) {
          const data = heatmapData[`${d}-${block}`];
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
    }

    if (hourAvg[0]) {
      console.log(`\n💡 RECOMMENDATION: Post on ${dayAvg[0]?.day || 'any day'} around ${formatHour(hourAvg[0].hour)} for best engagement`);
    }

    if (CONFIG.showWorstTime && hourAvg.length > 0) {
      const worst = hourAvg[hourAvg.length - 1];
      console.log(`\n❌ WORST time to post: ${formatHour(worst.hour)} (${worst.avg.toFixed(1)} avg engagement)`);
    }

    if (CONFIG.saveToLocalStorage) {
      try {
        localStorage.setItem(`xactions_best_time_${username}`, JSON.stringify({
          username,
          timestamp: new Date().toISOString(),
          postCount: postsArray.length,
          bestDays: dayAvg,
          bestHours: hourAvg,
          bestCombos: combos.slice(0, 10),
        }));
        console.log(`\n💾 Analysis saved to localStorage (xactions_best_time_${username})`);
      } catch (e) {
        console.warn('⚠️ Could not save to localStorage:', e.message);
      }
    }

    if (CONFIG.exportResults) {
      const report = {
        username,
        analyzedAt: new Date().toISOString(),
        postsAnalyzed: postsArray.length,
        bestDays: dayAvg,
        bestHours: hourAvg,
        bestCombos: combos.slice(0, 10),
        recommendation: { day: dayAvg[0]?.day, hour: hourAvg[0]?.hour },
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-best-time-${username}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      console.log('\n📥 Report downloaded as JSON');
    }
  };

  run();
})();
