// scripts/followerGrowthTracker.js
// Browser console script for tracking follower growth over time on X/Twitter
// Paste in DevTools console on x.com/USERNAME (any profile page)
// by nichxbt

(() => {
  // =============================================
  // No config needed — auto-detects profile
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

  const parseCount = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n);
  const sign = (n) => n > 0 ? `+${fmt(n)}` : n < 0 ? `-${fmt(Math.abs(n))}` : '0';

  const run = () => {
    console.log('📈 FOLLOWER GROWTH TRACKER — by nichxbt');

    // Detect profile
    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(pathMatch[1])) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      return;
    }
    const username = pathMatch[1];

    // Parse follower/following counts
    let followers = 0, following = 0;
    for (const link of document.querySelectorAll('a[href*="/followers"], a[href*="/following"]')) {
      const href = link.getAttribute('href') || '';
      const count = parseCount(link.textContent);
      if (href.includes('/following')) following = count;
      else if (href.includes('/followers') && !href.includes('/verified')) followers = count;
    }

    const snapshot = {
      username, followers, following,
      ratio: following > 0 ? (followers / following).toFixed(3) : '∞',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
    };

    console.log(`\n👤 @${username}`);
    console.log(`📊 ${fmt(followers)} followers | ${fmt(following)} following | ratio: ${snapshot.ratio}`);

    // Load/save history
    const storageKey = `xactions_growth_${username}`;
    let history = [];
    try { history = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}

    // Dedup (skip if last snapshot < 10 min ago)
    const last = history[history.length - 1];
    if (last && (snapshot.epoch - last.epoch) < 600000) {
      console.log('\nℹ️ Snapshot taken within last 10 min. Showing existing data.');
    } else {
      history.push(snapshot);
      localStorage.setItem(storageKey, JSON.stringify(history));
      console.log(`\n💾 Snapshot #${history.length} saved.`);
    }

    if (history.length < 2) {
      console.log('\n📋 First snapshot! Run again later to see growth data.');
      console.log('   Tip: Run daily for best trendline.\n');
      return;
    }

    // Analysis
    const first = history[0];
    const prev = history[history.length - 2];

    const sinceLast = snapshot.followers - prev.followers;
    const hoursSinceLast = ((snapshot.epoch - prev.epoch) / 3600000).toFixed(1);
    console.log(`\n🔄 Since last check (${hoursSinceLast}h ago):`);
    console.log(`   Followers: ${sign(sinceLast)}`);
    console.log(`   Following: ${sign(snapshot.following - prev.following)}`);

    const allTimeGrowth = snapshot.followers - first.followers;
    const totalDays = (snapshot.epoch - first.epoch) / 86400000;
    console.log(`\n📈 All-time (${totalDays.toFixed(1)} days, ${history.length} snapshots):`);
    console.log(`   Total growth: ${sign(allTimeGrowth)}`);

    if (totalDays > 0) {
      const dailyRate = allTimeGrowth / totalDays;
      console.log(`   Daily avg:   ${sign(Math.round(dailyRate))}/day`);
      console.log(`   Weekly avg:  ${sign(Math.round(dailyRate * 7))}/week`);
      console.log(`   Monthly avg: ${sign(Math.round(dailyRate * 30))}/month`);

      // Projections
      if (dailyRate > 0) {
        console.log('\n🎯 Projections:');
        const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
        for (const goal of milestones) {
          if (goal <= snapshot.followers) continue;
          const daysTo = (goal - snapshot.followers) / dailyRate;
          if (daysTo > 3650) break;
          const date = new Date(Date.now() + daysTo * 86400000);
          console.log(`   ${fmt(goal)}: ~${Math.round(daysTo)} days (${date.toLocaleDateString()})`);
          if (goal >= snapshot.followers * 10) break;
        }
      }
    }

    // Best/Worst periods
    if (history.length >= 3) {
      let bestGain = -Infinity, worstLoss = Infinity, bestIdx = 0, worstIdx = 0;
      for (let i = 1; i < history.length; i++) {
        const diff = history[i].followers - history[i - 1].followers;
        if (diff > bestGain) { bestGain = diff; bestIdx = i; }
        if (diff < worstLoss) { worstLoss = diff; worstIdx = i; }
      }
      console.log('\n🏆 Best/Worst:');
      console.log(`   📈 Best:  ${sign(bestGain)} (${new Date(history[bestIdx].timestamp).toLocaleString()})`);
      console.log(`   📉 Worst: ${sign(worstLoss)} (${new Date(history[worstIdx].timestamp).toLocaleString()})`);
    }

    // Export
    if (history.length > 1) {
      download(history, `xactions-growth-${username}-${new Date().toISOString().slice(0, 10)}.json`);
    }

    console.log('\n💡 Run again tomorrow to build your growth trendline.\n');
  };

  run();
})();
