// scripts/contentCalendar.js
// Browser console script for analyzing posting patterns and schedule visualization
// Paste in DevTools console on x.com/USERNAME (your profile)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxTweets: 50,
    scrollRounds: 5,
    scrollDelay: 1500,
    exportResults: true,
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const parseRelativeTime = (text) => {
    if (!text) return null;
    const now = Date.now();
    text = text.toLowerCase().trim();
    const abs = Date.parse(text);
    if (!isNaN(abs) && abs < now && abs > now - 365 * 86400000) return abs;
    const m = text.match(/(\d+)\s*m/); if (m) return now - parseInt(m[1]) * 60000;
    const h = text.match(/(\d+)\s*h/); if (h) return now - parseInt(h[1]) * 3600000;
    const d = text.match(/(\d+)\s*d/); if (d) return now - parseInt(d[1]) * 86400000;
    if (text.includes('just now') || text === 'now') return now;
    const md = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d+)/i);
    if (md) {
      const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const dt = new Date(); dt.setMonth(months[md[1].toLowerCase()], parseInt(md[2])); dt.setHours(12, 0, 0, 0);
      if (dt.getTime() > now) dt.setFullYear(dt.getFullYear() - 1);
      return dt.getTime();
    }
    return null;
  };

  const run = async () => {
    console.log('📅 Content Calendar — Posting Pattern Analyzer');
    console.log('━'.repeat(50));

    // Collect tweets
    const tweets = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (tweets.length >= CONFIG.maxTweets) break;
        const timeEl = article.querySelector('time');
        if (!timeEl) continue;

        const datetime = timeEl.getAttribute('datetime');
        const timestamp = datetime ? new Date(datetime).getTime() : parseRelativeTime(timeEl.textContent);
        if (!timestamp || isNaN(timestamp)) continue;

        const key = `${timestamp}-${(article.textContent || '').slice(0, 40)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const hasMedia = !!(article.querySelector('[data-testid="tweetPhoto"]') || article.querySelector('video'));
        const engBtns = article.querySelectorAll('[data-testid="like"] span, [data-testid="reply"] span, [data-testid="retweet"] span');
        let engagement = 0;
        for (const btn of engBtns) {
          const n = parseInt((btn.textContent || '').replace(/[,K]/g, ''));
          if (!isNaN(n)) engagement += n;
        }

        tweets.push({
          timestamp,
          date: new Date(timestamp),
          dayOfWeek: new Date(timestamp).getDay(),
          hour: new Date(timestamp).getHours(),
          hasMedia,
          engagement,
        });
      }

      console.log(`📜 Round ${round + 1}: ${tweets.length} tweets collected`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    tweets.sort((a, b) => a.timestamp - b.timestamp);

    if (tweets.length < 3) {
      console.error('❌ Need at least 3 tweets. Increase scrollRounds or scroll down first.');
      return;
    }

    console.log(`\n✅ Collected ${tweets.length} tweets. Analyzing...\n`);

    // --- Day-of-week distribution ---
    const dayCounts = Array(7).fill(0);
    const dayEng = Array(7).fill(0);
    for (const t of tweets) { dayCounts[t.dayOfWeek]++; dayEng[t.dayOfWeek] += t.engagement; }

    console.log('━━━ 📅 DAY-OF-WEEK DISTRIBUTION ━━━');
    const maxDay = Math.max(...dayCounts, 1);
    for (let i = 0; i < 7; i++) {
      const bar = '█'.repeat(Math.round((dayCounts[i] / maxDay) * 20));
      const avgE = dayCounts[i] > 0 ? (dayEng[i] / dayCounts[i]).toFixed(1) : '0';
      console.log(`  ${DAYS[i]}  ${bar.padEnd(20)} ${dayCounts[i]} tweets (avg eng: ${avgE})`);
    }

    // --- Time-of-day distribution ---
    const hourCounts = Array(24).fill(0);
    const hourEng = Array(24).fill(0);
    for (const t of tweets) { hourCounts[t.hour]++; hourEng[t.hour] += t.engagement; }

    console.log('\n━━━ ⏰ TIME-OF-DAY DISTRIBUTION ━━━');
    const maxHour = Math.max(...hourCounts, 1);
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] === 0) continue;
      const bar = '█'.repeat(Math.round((hourCounts[h] / maxHour) * 15));
      console.log(`  ${String(h).padStart(2, '0')}:00  ${bar.padEnd(15)} ${hourCounts[h]}`);
    }

    // --- Heatmap ---
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const t of tweets) grid[t.dayOfWeek][t.hour]++;

    console.log('\n━━━ 🗓️ POSTING HEATMAP (day × hour) ━━━');
    console.log('       ' + Array.from({ length: 24 }, (_, i) => String(i).padStart(2)).join(''));
    const chars = ['·', '░', '▒', '▓', '█'];
    const maxGrid = Math.max(...grid.flat(), 1);
    for (let d = 0; d < 7; d++) {
      let row = DAYS[d] + '   ';
      for (let h = 0; h < 24; h++) {
        const idx = Math.min(Math.floor((grid[d][h] / maxGrid) * (chars.length - 1)), chars.length - 1);
        row += chars[idx] + ' ';
      }
      console.log(row);
    }
    console.log('  Legend: · none, ░ few, ▒ some, ▓ many, █ peak');

    // --- Posting gaps ---
    console.log('\n━━━ 🕳️ POSTING GAPS ━━━');
    const gaps = [];
    for (let i = 1; i < tweets.length; i++) {
      gaps.push({ hours: (tweets[i].timestamp - tweets[i - 1].timestamp) / 3600000, after: tweets[i - 1].date.toLocaleDateString() });
    }
    gaps.sort((a, b) => b.hours - a.hours);
    const avgGap = gaps.reduce((s, g) => s + g.hours, 0) / gaps.length;
    console.log(`  Avg gap: ${avgGap.toFixed(1)}h | Longest: ${gaps[0]?.hours.toFixed(1) || 0}h`);
    const variance = gaps.reduce((s, g) => s + (g.hours - avgGap) ** 2, 0) / gaps.length;
    const consistency = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / avgGap) * 50));
    console.log(`  Consistency: ${consistency.toFixed(0)}%${consistency < 40 ? ' ⚠️ Irregular' : consistency > 75 ? ' ✅ Great!' : ''}`);

    // --- Streak analysis ---
    console.log('\n━━━ 🔥 STREAK ANALYSIS ━━━');
    const postDays = new Set(tweets.map(t => t.date.toISOString().slice(0, 10)));
    const sortedDays = [...postDays].sort();
    let currentStreak = 1, maxStreak = 1, bestStart = sortedDays[0], streakStart = sortedDays[0];
    for (let i = 1; i < sortedDays.length; i++) {
      if ((new Date(sortedDays[i]) - new Date(sortedDays[i - 1])) / 86400000 <= 1) {
        currentStreak++;
        if (currentStreak > maxStreak) { maxStreak = currentStreak; bestStart = streakStart; }
      } else { currentStreak = 1; streakStart = sortedDays[i]; }
    }
    console.log(`  Posting days: ${sortedDays.length} | Longest streak: ${maxStreak} days (from ${bestStart})`);

    // --- Summary ---
    const spanDays = (tweets[tweets.length - 1].timestamp - tweets[0].timestamp) / 86400000;
    const tweetsPerDay = spanDays > 0 ? (tweets.length / spanDays).toFixed(2) : tweets.length;
    console.log(`\n━━━ 📊 SUMMARY ━━━`);
    console.log(`  Period: ${spanDays.toFixed(0)} days | Posts/day: ~${tweetsPerDay}`);
    const hourlyAvg = hourEng.map((eng, i) => ({ hour: i, avg: hourCounts[i] > 0 ? eng / hourCounts[i] : 0 })).sort((a, b) => b.avg - a.avg);
    const top3 = hourlyAvg.filter(h => h.avg > 0).slice(0, 3);
    if (top3.length) console.log(`  Best hours: ${top3.map(h => `${String(h.hour).padStart(2, '0')}:00`).join(', ')}`);
    const dayAvg = dayEng.map((eng, i) => ({ day: DAYS[i], avg: dayCounts[i] > 0 ? eng / dayCounts[i] : 0 })).sort((a, b) => b.avg - a.avg);
    if (dayAvg[0]?.avg > 0) console.log(`  Best day: ${dayAvg[0].day}`);

    // --- Export ---
    if (CONFIG.exportResults) {
      const report = {
        stats: { totalTweets: tweets.length, spanDays: spanDays.toFixed(0), tweetsPerDay, consistency: consistency.toFixed(0) + '%', longestStreak: maxStreak },
        dayDistribution: Object.fromEntries(DAYS.map((d, i) => [d, dayCounts[i]])),
        gaps: gaps.slice(0, 5).map(g => ({ hours: g.hours.toFixed(1), after: g.after })),
        tweets: tweets.map(t => ({ date: t.date.toISOString(), day: DAYS[t.dayOfWeek], hour: t.hour, engagement: t.engagement })),
        analyzedAt: new Date().toISOString(),
      };
      download(report, `xactions-content-calendar-${new Date().toISOString().slice(0, 10)}.json`);
    }

    console.log('\n✅ Content calendar analysis complete.');
  };

  run();
})();
