// scripts/tweetScheduleOptimizer.js
// Browser console script for generating an optimal weekly posting schedule
// Paste in DevTools console on x.com/USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    scrollRounds: 5,
    scrollDelay: 1500,
    topSlots: 7,
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
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const collectTweets = async () => {
    const tweets = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
        const timeEl = article.querySelector('time');
        if (!timeEl) return;
        const datetime = timeEl.getAttribute('datetime');
        if (!datetime) return;
        const fingerprint = `${datetime}-${(article.textContent || '').slice(0, 30)}`;
        if (seen.has(fingerprint)) return;
        seen.add(fingerprint);

        const date = new Date(datetime);
        if (isNaN(date.getTime())) return;

        const likeSpan = article.querySelector('[data-testid="like"] span, [data-testid="unlike"] span');
        const rtSpan = article.querySelector('[data-testid="retweet"] span');
        const replySpan = article.querySelector('[data-testid="reply"] span');
        const viewSpan = article.querySelector('a[href*="/analytics"] span');

        const likes = parseCount(likeSpan?.textContent);
        const retweets = parseCount(rtSpan?.textContent);
        const replies = parseCount(replySpan?.textContent);
        const views = parseCount(viewSpan?.textContent);
        const totalEng = likes + retweets + replies;

        const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
        const hasVideo = !!article.querySelector('video');
        const mediaType = hasVideo ? 'video' : hasImage ? 'image' : 'text';

        tweets.push({
          dayOfWeek: date.getDay(), hour: date.getHours(), day: DAY_SHORT[date.getDay()],
          likes, retweets, replies, views, totalEng, mediaType,
        });
      });

      console.log(`   📜 Round ${round + 1}: ${tweets.length} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    return tweets;
  };

  const run = async () => {
    console.log('⏱️ TWEET SCHEDULE OPTIMIZER — by nichxbt\n');

    console.log('📊 Collecting tweet data...\n');
    const tweets = await collectTweets();

    if (tweets.length < 10) { console.error(`❌ Only ${tweets.length} tweets. Need 10+.`); return; }
    console.log(`\n✅ Analyzing ${tweets.length} tweets...\n`);

    // Score time slots
    const slotMap = {};
    tweets.forEach(t => {
      const key = `${t.dayOfWeek}-${t.hour}`;
      if (!slotMap[key]) slotMap[key] = { dayOfWeek: t.dayOfWeek, hour: t.hour, tweets: [] };
      slotMap[key].tweets.push(t);
    });

    const slots = Object.values(slotMap).filter(s => s.tweets.length >= 2);
    if (slots.length === 0) { console.error('❌ Not enough data per slot.'); return; }

    const maxEng = Math.max(...slots.map(s => s.tweets.reduce((a, t) => a + t.totalEng, 0) / s.tweets.length), 1);

    slots.forEach(s => {
      const n = s.tweets.length;
      s.avgEng = s.tweets.reduce((a, t) => a + t.totalEng, 0) / n;
      s.avgReplies = s.tweets.reduce((a, t) => a + t.replies, 0) / n;
      s.avgRts = s.tweets.reduce((a, t) => a + t.retweets, 0) / n;
      s.avgViews = s.tweets.reduce((a, t) => a + t.views, 0) / n;
      s.score = s.avgEng / maxEng;
      s.adjustedScore = s.score * Math.min(1, 0.5 + (n / 10) * 0.5);
      s.count = n;
    });

    slots.sort((a, b) => b.adjustedScore - a.adjustedScore);

    // Top slots
    console.log('🏆 OPTIMAL POSTING SCHEDULE:');
    slots.slice(0, CONFIG.topSlots).forEach((s, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      const timeStr = `${DAYS[s.dayOfWeek]} ${String(s.hour).padStart(2, '0')}:00`;
      const scoreBar = '█'.repeat(Math.round(s.adjustedScore * 20));
      console.log(`\n  ${medal} #${i + 1} ${timeStr}`);
      console.log(`     Score: ${(s.adjustedScore * 100).toFixed(0)}/100 ${scoreBar}`);
      console.log(`     Avg eng: ${s.avgEng.toFixed(0)} | Replies: ${s.avgReplies.toFixed(0)} | RTs: ${s.avgRts.toFixed(0)} (${s.count} tweets)`);
    });

    // Worst times
    console.log('\n\n❌ WORST TIMES:');
    slots.slice(-3).reverse().forEach(s => {
      console.log(`  ${DAYS[s.dayOfWeek]} ${String(s.hour).padStart(2, '0')}:00 — score ${(s.adjustedScore * 100).toFixed(0)} (avg eng: ${s.avgEng.toFixed(0)})`);
    });

    // Day ranking
    console.log('\n📅 DAY RANKING:');
    const dayScores = {};
    tweets.forEach(t => {
      if (!dayScores[t.dayOfWeek]) dayScores[t.dayOfWeek] = { total: 0, count: 0 };
      dayScores[t.dayOfWeek].total += t.totalEng;
      dayScores[t.dayOfWeek].count++;
    });
    const dayRank = Object.entries(dayScores)
      .map(([d, v]) => ({ day: DAYS[d], avg: v.total / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg);
    const maxDayAvg = Math.max(...dayRank.map(d => d.avg), 1);
    dayRank.forEach(d => {
      const bar = '█'.repeat(Math.round(d.avg / maxDayAvg * 20));
      console.log(`  ${d.day.padEnd(10)} avg ${String(d.avg.toFixed(0)).padStart(5)} eng (${d.count} tweets) ${bar}`);
    });

    // Media performance
    console.log('\n🖼️ CONTENT FORMAT:');
    const mediaGroups = {};
    tweets.forEach(t => { mediaGroups[t.mediaType] = mediaGroups[t.mediaType] || []; mediaGroups[t.mediaType].push(t); });
    Object.entries(mediaGroups)
      .map(([type, arr]) => ({ type, count: arr.length, avgEng: arr.reduce((s, t) => s + t.totalEng, 0) / arr.length }))
      .sort((a, b) => b.avgEng - a.avgEng)
      .forEach(m => console.log(`  ${m.type.padEnd(8)} avg ${m.avgEng.toFixed(0)} eng (${m.count} tweets)`));

    // Weekly schedule
    console.log('\n📋 SUGGESTED WEEKLY SCHEDULE:');
    const bestPerDay = {};
    slots.forEach(s => {
      const d = s.dayOfWeek;
      if (!bestPerDay[d] || s.adjustedScore > bestPerDay[d].adjustedScore) bestPerDay[d] = s;
    });
    for (let d = 0; d < 7; d++) {
      const s = bestPerDay[d];
      console.log(s ? `  ${DAY_SHORT[d]} → ${String(s.hour).padStart(2, '0')}:00 (score: ${(s.adjustedScore * 100).toFixed(0)})` : `  ${DAY_SHORT[d]} → No data`);
    }

    if (CONFIG.exportResults) {
      download({
        optimalSlots: slots.slice(0, CONFIG.topSlots).map(s => ({ day: DAYS[s.dayOfWeek], hour: s.hour, score: Math.round(s.adjustedScore * 100), avgEng: Math.round(s.avgEng), tweets: s.count })),
        dayRanking: dayRank.map(d => ({ day: d.day, avgEng: Math.round(d.avg), tweets: d.count })),
        totalTweets: tweets.length, analyzedAt: new Date().toISOString(),
      }, `xactions-schedule-optimizer-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('\n📥 Schedule exported as JSON.');
    }
  };

  run();
})();
