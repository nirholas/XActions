// Best Time to Post on X - by nichxbt
// https://github.com/nirholas/xactions
// Analyze your posting history to find optimal posting times
// 1. Go to https://x.com/YOUR_USERNAME
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    maxPosts: 100,
    scrollDelay: 1500,
    maxScrollAttempts: 40,
    exportResults: true,
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
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

    while (posts.size < CONFIG.maxPosts && retries < 3) {
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

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArray = [...posts.values()];
    console.log(`📊 Analyzed ${postsArray.length} posts\n`);

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
      console.log(`   ${i + 1}. ${h.hour.padEnd(8)} ${bar} ${h.avg.toFixed(1)} avg (${h.posts} posts)`);
    });

    console.log('\n🏆 BEST DAY+HOUR COMBOS:');
    combos.slice(0, 5).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.day} at ${c.hour} — ${c.avg.toFixed(1)} avg engagement (${c.posts} posts)`);
    });

    if (hourAvg[0]) {
      console.log(`\n💡 RECOMMENDATION: Post on ${dayAvg[0]?.day || 'any day'} around ${hourAvg[0].hour} for best engagement`);
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
      a.click();
      console.log('\n📥 Report downloaded as JSON');
    }
  };

  run();
})();
