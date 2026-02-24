// scripts/bestTimeToPost.js
// Browser console script for finding optimal posting times via engagement heatmap
// Paste in DevTools console on x.com/USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxPosts: 50,
    scrollDelay: 1500,
    exportResults: true,
  };
  // =============================================

  const parseCount = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const run = async () => {
    console.log('⏰ BEST TIME TO POST — by nichxbt\n');

    const username = window.location.pathname.replace('/', '').split('/')[0];
    if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      return;
    }

    console.log(`📊 Analyzing @${username}'s posting patterns...\n`);

    const posts = new Map();
    let retries = 0;

    while (posts.size < CONFIG.maxPosts && retries < 3) {
      const prevSize = posts.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || posts.has(linkEl.href)) return;
        const timeEl = tweet.querySelector('time');
        if (!timeEl?.dateTime) return;

        const likeEl = tweet.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtEl = tweet.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyEl = tweet.querySelector('[data-testid="reply"]');

        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        const retweets = parseCount(rtEl?.getAttribute('aria-label') || '0');
        const replies = parseCount(replyEl?.getAttribute('aria-label') || '0');

        posts.set(linkEl.href, {
          timestamp: timeEl.dateTime,
          likes, retweets, replies,
          engagement: likes + retweets + replies,
        });
      });

      if (posts.size === prevSize) retries++;
      else retries = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArr = [...posts.values()];
    console.log(`📊 Analyzed ${postsArr.length} posts\n`);

    if (postsArr.length < 5) { console.error('❌ Not enough posts. Try scrolling more.'); return; }

    // Build heatmap: day × hour
    const hourEng = {};
    const dayEng = {};
    const matrix = {};

    HOURS.forEach(h => { hourEng[h] = { total: 0, count: 0 }; });
    DAYS.forEach(d => { dayEng[d] = { total: 0, count: 0 }; });
    DAYS.forEach(d => { matrix[d] = {}; HOURS.forEach(h => { matrix[d][h] = { total: 0, count: 0 }; }); });

    postsArr.forEach(p => {
      const date = new Date(p.timestamp);
      const hour = HOURS[date.getHours()];
      const day = DAYS[date.getDay()];
      hourEng[hour].total += p.engagement; hourEng[hour].count++;
      dayEng[day].total += p.engagement; dayEng[day].count++;
      matrix[day][hour].total += p.engagement; matrix[day][hour].count++;
    });

    const hourAvg = Object.entries(hourEng)
      .map(([h, d]) => ({ hour: h, avg: d.count > 0 ? d.total / d.count : 0, posts: d.count }))
      .filter(h => h.posts > 0).sort((a, b) => b.avg - a.avg);

    const dayAvg = Object.entries(dayEng)
      .map(([d, v]) => ({ day: d, avg: v.count > 0 ? v.total / v.count : 0, posts: v.count }))
      .filter(d => d.posts > 0).sort((a, b) => b.avg - a.avg);

    const combos = [];
    DAYS.forEach(day => HOURS.forEach(hour => {
      const d = matrix[day][hour];
      if (d.count > 0) combos.push({ day, hour, avg: d.total / d.count, posts: d.count });
    }));
    combos.sort((a, b) => b.avg - a.avg);

    // Display
    console.log('📅 BEST DAYS:');
    dayAvg.slice(0, 5).forEach((d, i) => {
      const bar = '█'.repeat(Math.round(d.avg / (dayAvg[0]?.avg || 1) * 20));
      console.log(`  ${i + 1}. ${d.day.padEnd(12)} ${bar} ${d.avg.toFixed(1)} avg (${d.posts} posts)`);
    });

    console.log('\n⏰ BEST HOURS:');
    hourAvg.slice(0, 8).forEach((h, i) => {
      const bar = '█'.repeat(Math.round(h.avg / (hourAvg[0]?.avg || 1) * 20));
      console.log(`  ${i + 1}. ${h.hour.padEnd(8)} ${bar} ${h.avg.toFixed(1)} avg (${h.posts} posts)`);
    });

    console.log('\n🏆 TOP 5 DAY+HOUR COMBOS:');
    combos.slice(0, 5).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.day} at ${c.hour} — ${c.avg.toFixed(1)} avg engagement (${c.posts} posts)`);
    });

    if (hourAvg[0]) {
      console.log(`\n💡 RECOMMENDATION: Post on ${dayAvg[0]?.day || 'any day'} around ${hourAvg[0].hour}`);
    }

    if (CONFIG.exportResults) {
      download({
        username, analyzedAt: new Date().toISOString(),
        postsAnalyzed: postsArr.length,
        bestDays: dayAvg, bestHours: hourAvg,
        bestCombos: combos.slice(0, 10),
        recommendation: { day: dayAvg[0]?.day, hour: hourAvg[0]?.hour },
      }, `xactions-best-time-${username}-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('\n📥 Report exported as JSON.');
    }
  };

  run();
})();
