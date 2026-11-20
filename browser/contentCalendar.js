// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📅 Content Calendar & Tweet Scheduler — Production Grade
 * ============================================================
 *
 * @name        contentCalendar.js
 * @description Plan and visualize your posting schedule. Tracks
 *              tweet frequency by day/hour, identifies posting
 *              gaps, suggests optimal posting times based on
 *              historical engagement, and manages a localStorage-
 *              persisted content queue.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * MODE 1 — Analyze posting patterns:
 *   1. Go to your profile (x.com/YOUR_USERNAME)
 *   2. Paste and run → analyzes visible timeline
 *
 * MODE 2 — Manage content queue:
 *   window.XActions.addTweet({ text: '...', scheduledFor: '2026-02-25T14:00' })
 *   window.XActions.viewQueue()
 *   window.XActions.clearQueue()
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    mode: 'analyze',   // 'analyze' | 'queue'
    scrollRounds: 8,
    scrollDelay: 2000,
  };

  const STORAGE_KEY = 'xactions_content_calendar';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ── Parse relative time strings ────────────────────────────
  const parseRelativeTime = (text) => {
    if (!text) return null;
    const now = Date.now();
    text = text.toLowerCase().trim();

    // Try absolute date first
    const absolute = Date.parse(text);
    if (!isNaN(absolute) && absolute < now && absolute > now - 365 * 86400000) return absolute;

    // Relative patterns
    const mins = text.match(/(\d+)\s*m/); if (mins) return now - parseInt(mins[1]) * 60000;
    const hrs = text.match(/(\d+)\s*h/); if (hrs) return now - parseInt(hrs[1]) * 3600000;
    const days = text.match(/(\d+)\s*d/); if (days) return now - parseInt(days[1]) * 86400000;

    // "Just now"
    if (text.includes('just now') || text === 'now') return now;

    // Month day format: "Feb 24"
    const monthDay = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d+)/i);
    if (monthDay) {
      const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const d = new Date();
      d.setMonth(months[monthDay[1].toLowerCase()], parseInt(monthDay[2]));
      d.setHours(12, 0, 0, 0);
      if (d.getTime() > now) d.setFullYear(d.getFullYear() - 1);
      return d.getTime();
    }

    return null;
  };

  // ── Collect tweets with timestamps ─────────────────────────
  const collectTweets = async () => {
    const tweets = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        const timeEl = article.querySelector('time');
        if (!timeEl) continue;

        const datetime = timeEl.getAttribute('datetime');
        const textContent = timeEl.textContent;

        let timestamp;
        if (datetime) {
          timestamp = new Date(datetime).getTime();
        } else {
          timestamp = parseRelativeTime(textContent);
        }
        if (!timestamp || isNaN(timestamp)) continue;

        const key = `${timestamp}-${(article.textContent || '').slice(0, 50)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Engagement metrics
        const engagementBtns = article.querySelectorAll('[data-testid$="-count"], [data-testid="like"] span, [data-testid="reply"] span, [data-testid="retweet"] span');
        let totalEng = 0;
        for (const btn of engagementBtns) {
          const num = parseInt((btn.textContent || '').replace(/[,K]/g, ''));
          if (!isNaN(num)) totalEng += num;
        }

        // Tweet text
        const tweetText = article.querySelector('[data-testid="tweetText"]');
        const text = tweetText ? tweetText.textContent.trim().slice(0, 100) : '';

        // Media
        const hasMedia = !!(article.querySelector('[data-testid="tweetPhoto"]') || article.querySelector('video') || article.querySelector('[data-testid="card.wrapper"]'));

        tweets.push({
          timestamp,
          date: new Date(timestamp),
          dayOfWeek: new Date(timestamp).getDay(),
          hour: new Date(timestamp).getHours(),
          text,
          hasMedia,
          engagement: totalEng,
        });
      }

      console.log(`   📜 Round ${round + 1}: ${tweets.length} tweets collected`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return tweets.sort((a, b) => a.timestamp - b.timestamp);
  };

  // ── Generate heatmap ───────────────────────────────────────
  const generateHeatmap = (tweets) => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    const engGrid = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const t of tweets) {
      grid[t.dayOfWeek][t.hour]++;
      engGrid[t.dayOfWeek][t.hour] += t.engagement;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 POSTING FREQUENCY HEATMAP (24h × 7 days)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('      ' + Array.from({ length: 24 }, (_, i) => String(i).padStart(2)).join(''));

    const maxVal = Math.max(...grid.flat(), 1);
    const chars = ['·', '░', '▒', '▓', '█'];

    for (let day = 0; day < 7; day++) {
      let row = DAYS[day] + '  ';
      for (let hr = 0; hr < 24; hr++) {
        const val = grid[day][hr];
        const idx = Math.min(Math.floor((val / maxVal) * (chars.length - 1)), chars.length - 1);
        row += chars[idx] + ' ';
      }
      console.log(row);
    }
    console.log('  Legend: · = none, ░ = few, ▒ = some, ▓ = many, █ = peak');

    return { grid, engGrid };
  };

  // ── Find optimal posting times ─────────────────────────────
  const findOptimalTimes = (tweets) => {
    const hourlyEng = Array(24).fill(0);
    const hourlyCnt = Array(24).fill(0);
    const dayEng = Array(7).fill(0);
    const dayCnt = Array(7).fill(0);

    for (const t of tweets) {
      hourlyEng[t.hour] += t.engagement;
      hourlyCnt[t.hour]++;
      dayEng[t.dayOfWeek] += t.engagement;
      dayCnt[t.dayOfWeek]++;
    }

    // Average engagement per hour
    const hourlyAvg = hourlyEng.map((eng, i) => ({
      hour: i,
      avg: hourlyCnt[i] > 0 ? eng / hourlyCnt[i] : 0,
      count: hourlyCnt[i],
    })).sort((a, b) => b.avg - a.avg);

    console.log('\n━━━ ⏰ BEST POSTING HOURS (by avg engagement) ━━━');
    for (const h of hourlyAvg.slice(0, 5)) {
      if (h.count === 0) continue;
      const label = `${String(h.hour).padStart(2, '0')}:00`;
      console.log(`  ${label} — avg ${h.avg.toFixed(1)} engagement (${h.count} tweets)`);
    }

    // Average engagement per day
    const dayAvg = dayEng.map((eng, i) => ({
      day: DAYS[i],
      avg: dayCnt[i] > 0 ? eng / dayCnt[i] : 0,
      count: dayCnt[i],
    })).sort((a, b) => b.avg - a.avg);

    console.log('\n━━━ 📅 BEST POSTING DAYS ━━━');
    for (const d of dayAvg) {
      if (d.count === 0) continue;
      const bar = '█'.repeat(Math.round(d.avg / Math.max(...dayAvg.map(x => x.avg), 1) * 15));
      console.log(`  ${d.day} — avg ${d.avg.toFixed(1)} (${d.count} tweets) ${bar}`);
    }

    return { hourlyAvg, dayAvg };
  };

  // ── Posting gaps ───────────────────────────────────────────
  const analyzeGaps = (tweets) => {
    if (tweets.length < 2) return;

    console.log('\n━━━ 🕳️ POSTING GAPS ━━━');

    const gaps = [];
    for (let i = 1; i < tweets.length; i++) {
      const gapHrs = (tweets[i].timestamp - tweets[i - 1].timestamp) / 3600000;
      gaps.push({ hours: gapHrs, after: tweets[i - 1].date.toLocaleDateString() });
    }

    gaps.sort((a, b) => b.hours - a.hours);

    const avgGap = gaps.reduce((s, g) => s + g.hours, 0) / gaps.length;
    console.log(`  Average gap between tweets: ${avgGap.toFixed(1)}h`);

    if (gaps.length > 0) {
      console.log(`  Longest gap: ${gaps[0].hours.toFixed(1)}h (after ${gaps[0].after})`);
    }
    if (gaps.length > 1) {
      console.log(`  2nd longest: ${gaps[1].hours.toFixed(1)}h (after ${gaps[1].after})`);
    }

    // Consistency score (lower stddev = more consistent)
    const mean = avgGap;
    const variance = gaps.reduce((s, g) => s + (g.hours - mean) ** 2, 0) / gaps.length;
    const stddev = Math.sqrt(variance);
    const consistencyPct = Math.max(0, Math.min(100, 100 - (stddev / mean) * 50));

    console.log(`  Consistency score: ${consistencyPct.toFixed(0)}% (higher = more regular)`);

    if (consistencyPct < 40) {
      console.log('  ⚠️ Your posting is very irregular. Consistent schedules grow faster.');
    } else if (consistencyPct > 75) {
      console.log('  ✅ Great consistency! Keep it up.');
    }
  };

  // ── Media Impact ───────────────────────────────────────────
  const analyzeMediaImpact = (tweets) => {
    const withMedia = tweets.filter(t => t.hasMedia);
    const withoutMedia = tweets.filter(t => !t.hasMedia);

    if (withMedia.length === 0 || withoutMedia.length === 0) return;

    const avgMedia = withMedia.reduce((s, t) => s + t.engagement, 0) / withMedia.length;
    const avgText = withoutMedia.reduce((s, t) => s + t.engagement, 0) / withoutMedia.length;

    console.log('\n━━━ 🖼️ MEDIA IMPACT ━━━');
    console.log(`  Media tweets:    avg ${avgMedia.toFixed(1)} engagement (${withMedia.length} tweets)`);
    console.log(`  Text-only tweets: avg ${avgText.toFixed(1)} engagement (${withoutMedia.length} tweets)`);

    if (avgMedia > avgText) {
      console.log(`  📈 Media tweets get ${((avgMedia / avgText - 1) * 100).toFixed(0)}% more engagement!`);
    } else {
      console.log(`  📉 Text tweets actually outperform media by ${((avgText / avgMedia - 1) * 100).toFixed(0)}%.`);
    }
  };

  // ── Content Queue Manager ──────────────────────────────────
  const loadQueue = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  };

  const saveQueue = (queue) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  };

  // ── Controls ───────────────────────────────────────────────
  window.XActions = window.XActions || {};

  window.XActions.addTweet = (item) => {
    if (!item || !item.text) {
      console.log('❌ Usage: XActions.addTweet({ text: "...", scheduledFor: "2026-02-25T14:00", tags: ["thread"] })');
      return;
    }
    const queue = loadQueue();
    queue.push({
      id: Date.now(),
      text: item.text.slice(0, 280),
      scheduledFor: item.scheduledFor || null,
      tags: item.tags || [],
      createdAt: new Date().toISOString(),
      posted: false,
    });
    saveQueue(queue);
    console.log(`✅ Added to queue (${queue.length} total). Scheduled: ${item.scheduledFor || 'unscheduled'}`);
  };

  window.XActions.viewQueue = () => {
    const queue = loadQueue();
    if (queue.length === 0) {
      console.log('📭 Queue is empty. Use XActions.addTweet({ text: "..." }) to add.');
      return;
    }

    console.log(`\n📅 CONTENT QUEUE (${queue.length} items):\n`);
    const sorted = [...queue].sort((a, b) => {
      if (!a.scheduledFor) return 1;
      if (!b.scheduledFor) return -1;
      return new Date(a.scheduledFor) - new Date(b.scheduledFor);
    });

    for (const item of sorted) {
      const status = item.posted ? '✅' : '⏳';
      const sched = item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : 'unscheduled';
      const tags = item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : '';
      console.log(`  ${status} ${sched}${tags}`);
      console.log(`     "${item.text.slice(0, 80)}${item.text.length > 80 ? '...' : ''}"`);
    }
  };

  window.XActions.clearQueue = () => {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Queue cleared.');
  };

  window.XActions.exportQueue = () => {
    const queue = loadQueue();
    const blob = new Blob([JSON.stringify(queue, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `xactions-content-queue-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    console.log(`📥 Exported ${queue.length} items.`);
  };

  // ── Main ───────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📅 CONTENT CALENDAR ANALYZER' + ' '.repeat(W - 31) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.mode === 'queue') {
      window.XActions.viewQueue();
      return;
    }

    console.log('\n📊 Collecting tweet timestamps...\n');
    const tweets = await collectTweets();

    if (tweets.length < 3) {
      console.error('❌ Need at least 3 tweets to analyze. Scroll down to load more or increase scrollRounds.');
      return;
    }

    console.log(`\n✅ Collected ${tweets.length} tweets for analysis.\n`);

    generateHeatmap(tweets);
    findOptimalTimes(tweets);
    analyzeGaps(tweets);
    analyzeMediaImpact(tweets);

    // Suggested schedule
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📝 RECOMMENDED POSTING SCHEDULE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Tweets per day currently
    const daySpan = (tweets[tweets.length - 1].timestamp - tweets[0].timestamp) / 86400000;
    const tweetsPerDay = daySpan > 0 ? (tweets.length / daySpan).toFixed(1) : tweets.length;
    console.log(`  Current rate: ~${tweetsPerDay} tweets/day`);

    if (tweetsPerDay < 1) {
      console.log('  💡 Consider posting at least 1-2 tweets/day for steady growth.');
    } else if (tweetsPerDay > 10) {
      console.log('  💡 You\'re posting a LOT. Quality > quantity — focus on high-engagement times.');
    }

    console.log('  💡 Use XActions.addTweet({ text: "...", scheduledFor: "..." }) to plan ahead.');
    console.log('  💡 Use XActions.viewQueue() to see your content queue.\n');

    // Export
    const data = {
      tweets: tweets.map(t => ({
        date: t.date.toISOString(),
        dayOfWeek: DAYS[t.dayOfWeek],
        hour: t.hour,
        hasMedia: t.hasMedia,
        engagement: t.engagement,
        text: t.text,
      })),
      stats: { totalTweets: tweets.length, daySpan: daySpan.toFixed(1), tweetsPerDay },
      analyzedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `xactions-content-calendar-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    console.log('📥 Analysis exported.');
  };

  run();
})();
