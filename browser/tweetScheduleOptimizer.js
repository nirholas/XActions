// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * ⏱️ Tweet Schedule Optimizer — Production Grade
 * ============================================================
 *
 * @name        tweetScheduleOptimizer.js
 * @description Analyzes your historical tweet performance by
 *              time of day and day of week, then generates a
 *              personalized optimal posting schedule. Uses
 *              weighted scoring across engagement rate, reply
 *              ratio, and retweet ratio to surface the best
 *              time slots for maximum reach.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to your profile (x.com/YOUR_USERNAME)
 * 2. Open DevTools Console (F12)
 * 3. Paste and run — auto-scrolls and collects data
 * 4. Outputs your personalized optimal schedule
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    scrollRounds: 12,        // More rounds = more data = better accuracy
    scrollDelay: 1800,
    minTweetsForSlot: 2,     // Minimum tweets in a slot to be considered
    topSlots: 7,             // Show top N time slots
    weights: {
      engagement: 0.5,       // Weight for total engagement score
      replies: 0.25,         // Weight for reply-to-engagement ratio (conversation quality)
      retweets: 0.25,        // Weight for retweet ratio (shareability)
    },
    exportResults: true,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ── Parse engagement metrics from a tweet article ──────────
  const parseMetrics = (article) => {
    const metrics = { likes: 0, retweets: 0, replies: 0, views: 0 };

    // Like count
    const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
    if (likeBtn) metrics.likes = parseNum(likeBtn.textContent);

    // Retweet count
    const rtBtn = article.querySelector('[data-testid="retweet"] span');
    if (rtBtn) metrics.retweets = parseNum(rtBtn.textContent);

    // Reply count
    const replyBtn = article.querySelector('[data-testid="reply"] span');
    if (replyBtn) metrics.replies = parseNum(replyBtn.textContent);

    // Views (analytics link)
    const viewEl = article.querySelector('a[href*="/analytics"] span');
    if (viewEl) metrics.views = parseNum(viewEl.textContent);

    return metrics;
  };

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  // ── Collect tweet data ─────────────────────────────────────
  const collectTweets = async () => {
    const tweets = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        const timeEl = article.querySelector('time');
        if (!timeEl) continue;

        const datetime = timeEl.getAttribute('datetime');
        if (!datetime) continue;

        const ts = new Date(datetime).getTime();
        if (isNaN(ts)) continue;

        const fingerprint = `${datetime}-${(article.textContent || '').slice(0, 30)}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);

        const date = new Date(ts);
        const metrics = parseMetrics(article);
        const totalEng = metrics.likes + metrics.retweets + metrics.replies;

        // Detect media type
        const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
        const hasVideo = !!article.querySelector('video');
        const hasLink = !!article.querySelector('[data-testid="card.wrapper"]');
        const mediaType = hasVideo ? 'video' : hasImage ? 'image' : hasLink ? 'link' : 'text';

        // Tweet text
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent.trim().slice(0, 120) : '';
        const isThread = text.includes('🧵') || !!article.querySelector('a[href*="/status/"][dir="auto"]');

        tweets.push({
          timestamp: ts,
          dayOfWeek: date.getDay(),
          hour: date.getHours(),
          day: DAY_SHORT[date.getDay()],
          ...metrics,
          totalEng,
          engRate: metrics.views > 0 ? totalEng / metrics.views : 0,
          mediaType,
          isThread,
          text,
        });
      }

      console.log(`   📜 Round ${round + 1}: ${tweets.length} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return tweets;
  };

  // ── Score time slots ───────────────────────────────────────
  const scoreSlots = (tweets) => {
    const slotMap = {};

    for (const t of tweets) {
      const key = `${t.dayOfWeek}-${t.hour}`;
      if (!slotMap[key]) {
        slotMap[key] = { dayOfWeek: t.dayOfWeek, hour: t.hour, tweets: [] };
      }
      slotMap[key].tweets.push(t);
    }

    // Calculate slot scores
    const slots = Object.values(slotMap).filter(s => s.tweets.length >= CONFIG.minTweetsForSlot);

    if (slots.length === 0) return [];

    // Normalize each dimension
    const maxEng = Math.max(...slots.map(s => s.tweets.reduce((a, t) => a + t.totalEng, 0) / s.tweets.length), 1);
    const maxReplies = Math.max(...slots.map(s => s.tweets.reduce((a, t) => a + t.replies, 0) / s.tweets.length), 1);
    const maxRts = Math.max(...slots.map(s => s.tweets.reduce((a, t) => a + t.retweets, 0) / s.tweets.length), 1);

    for (const slot of slots) {
      const n = slot.tweets.length;
      const avgEng = slot.tweets.reduce((a, t) => a + t.totalEng, 0) / n;
      const avgReplies = slot.tweets.reduce((a, t) => a + t.replies, 0) / n;
      const avgRts = slot.tweets.reduce((a, t) => a + t.retweets, 0) / n;
      const avgViews = slot.tweets.reduce((a, t) => a + t.views, 0) / n;

      const engNorm = avgEng / maxEng;
      const replyNorm = avgReplies / maxReplies;
      const rtNorm = avgRts / maxRts;

      slot.score = (
        CONFIG.weights.engagement * engNorm +
        CONFIG.weights.replies * replyNorm +
        CONFIG.weights.retweets * rtNorm
      );

      // Confidence bonus: more data = more reliable
      const confidenceMultiplier = Math.min(1, 0.5 + (n / 10) * 0.5);
      slot.adjustedScore = slot.score * confidenceMultiplier;

      slot.avgEng = avgEng;
      slot.avgReplies = avgReplies;
      slot.avgRts = avgRts;
      slot.avgViews = avgViews;
      slot.count = n;
    }

    return slots.sort((a, b) => b.adjustedScore - a.adjustedScore);
  };

  // ── Main ───────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  ⏱️  TWEET SCHEDULE OPTIMIZER' + ' '.repeat(W - 31) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log('\n📊 Collecting your tweet data...\n');
    const tweets = await collectTweets();

    if (tweets.length < 10) {
      console.error(`❌ Only ${tweets.length} tweets found. Need at least 10. Try more scrollRounds or ensure you're on your profile.`);
      return;
    }

    console.log(`\n✅ Analyzing ${tweets.length} tweets...\n`);

    const slots = scoreSlots(tweets);

    if (slots.length === 0) {
      console.error('❌ Not enough data in any time slot. Increase scrollRounds or minTweetsForSlot.');
      return;
    }

    // ── Top Time Slots ──────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🏆 YOUR OPTIMAL POSTING SCHEDULE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const topN = slots.slice(0, CONFIG.topSlots);
    for (let i = 0; i < topN.length; i++) {
      const s = topN[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      const timeStr = `${DAYS[s.dayOfWeek]} ${String(s.hour).padStart(2, '0')}:00`;
      const scoreBar = '█'.repeat(Math.round(s.adjustedScore * 20));

      console.log(`\n  ${medal} #${i + 1}  ${timeStr}`);
      console.log(`     Score: ${(s.adjustedScore * 100).toFixed(0)}/100 ${scoreBar}`);
      console.log(`     Avg engagement: ${s.avgEng.toFixed(0)} (${s.count} tweets)`);
      console.log(`     Avg replies: ${s.avgReplies.toFixed(0)} | Avg RTs: ${s.avgRts.toFixed(0)} | Avg views: ${s.avgViews.toFixed(0)}`);
    }

    // ── Worst times ─────────────────────────────────────────
    console.log('\n━━━ ❌ WORST TIMES (avoid these) ━━━');
    const worstN = slots.slice(-3).reverse();
    for (const s of worstN) {
      console.log(`  ${DAYS[s.dayOfWeek]} ${String(s.hour).padStart(2, '0')}:00 — score ${(s.adjustedScore * 100).toFixed(0)}/100 (avg eng: ${s.avgEng.toFixed(0)})`);
    }

    // ── Day-of-week ranking ─────────────────────────────────
    console.log('\n━━━ 📅 DAY RANKING ━━━');
    const dayScores = {};
    for (const t of tweets) {
      if (!dayScores[t.dayOfWeek]) dayScores[t.dayOfWeek] = { total: 0, count: 0 };
      dayScores[t.dayOfWeek].total += t.totalEng;
      dayScores[t.dayOfWeek].count++;
    }

    const dayRanking = Object.entries(dayScores)
      .map(([d, v]) => ({ day: DAYS[d], avg: v.total / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg);

    for (const d of dayRanking) {
      const bar = '█'.repeat(Math.round(d.avg / Math.max(...dayRanking.map(x => x.avg), 1) * 20));
      console.log(`  ${d.day.padEnd(10)} avg ${String(d.avg.toFixed(0)).padStart(5)} eng (${d.count} tweets) ${bar}`);
    }

    // ── Media type analysis ─────────────────────────────────
    console.log('\n━━━ 🖼️ CONTENT FORMAT PERFORMANCE ━━━');
    const mediaGroups = {};
    for (const t of tweets) {
      if (!mediaGroups[t.mediaType]) mediaGroups[t.mediaType] = [];
      mediaGroups[t.mediaType].push(t);
    }

    const mediaRanking = Object.entries(mediaGroups)
      .map(([type, arr]) => ({
        type,
        count: arr.length,
        avgEng: arr.reduce((s, t) => s + t.totalEng, 0) / arr.length,
      }))
      .sort((a, b) => b.avgEng - a.avgEng);

    for (const m of mediaRanking) {
      console.log(`  ${m.type.padEnd(8)} avg ${m.avgEng.toFixed(0)} engagement (${m.count} tweets)`);
    }

    // Thread performance
    const threads = tweets.filter(t => t.isThread);
    const nonThreads = tweets.filter(t => !t.isThread);
    if (threads.length > 0 && nonThreads.length > 0) {
      const threadAvg = threads.reduce((s, t) => s + t.totalEng, 0) / threads.length;
      const nonThreadAvg = nonThreads.reduce((s, t) => s + t.totalEng, 0) / nonThreads.length;
      console.log(`\n  🧵 Threads: avg ${threadAvg.toFixed(0)} eng (${threads.length} threads)`);
      console.log(`  📝 Singles: avg ${nonThreadAvg.toFixed(0)} eng (${nonThreads.length} tweets)`);
      if (threadAvg > nonThreadAvg * 1.2) {
        console.log('  💡 Threads significantly outperform singles — post more threads!');
      }
    }

    // ── Weekly schedule ─────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📋 SUGGESTED WEEKLY SCHEDULE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Pick best slot per day
    const bestPerDay = {};
    for (const s of slots) {
      const d = s.dayOfWeek;
      if (!bestPerDay[d] || s.adjustedScore > bestPerDay[d].adjustedScore) {
        bestPerDay[d] = s;
      }
    }

    for (let d = 0; d < 7; d++) {
      const s = bestPerDay[d];
      if (s) {
        console.log(`  ${DAY_SHORT[d]}  →  ${String(s.hour).padStart(2, '0')}:00  (score: ${(s.adjustedScore * 100).toFixed(0)})`);
      } else {
        console.log(`  ${DAY_SHORT[d]}  →  No data — try posting at varied times`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults) {
      const data = {
        optimalSlots: topN.map(s => ({
          day: DAYS[s.dayOfWeek], hour: s.hour,
          score: Math.round(s.adjustedScore * 100),
          avgEng: Math.round(s.avgEng), tweets: s.count,
        })),
        dayRanking: dayRanking.map(d => ({ day: d.day, avgEng: Math.round(d.avg), tweets: d.count })),
        mediaPerformance: mediaRanking,
        weeklySchedule: Object.entries(bestPerDay).map(([d, s]) => ({
          day: DAYS[d], hour: s.hour, score: Math.round(s.adjustedScore * 100),
        })),
        totalTweetsAnalyzed: tweets.length,
        analyzedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-schedule-optimizer-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Schedule optimization exported.');
    }
  };

  run();
})();
