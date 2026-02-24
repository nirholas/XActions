// scripts/engagementAnalytics.js
// Browser console script for scraping engagement metrics from a profile
// Paste in DevTools console on x.com/USERNAME
// by nichxbt

(() => {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────
  const CONFIG = {
    maxPosts: 20,
    scrollDelay: 1500,
    exportResults: true,
  };

  // ── HELPERS ───────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)([KMB])?/i);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()];
    return Math.round(n);
  };

  const download = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  // ── MAIN ──────────────────────────────────────────────────
  (async () => {
    console.log('📊 ENGAGEMENT ANALYTICS — XActions by nichxbt');

    const username = window.location.pathname.match(/^\/([^/]+)/)?.[1];
    if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      return;
    }
    console.log(`📊 Analyzing @${username}'s engagement...\n`);

    const posts = new Map();
    let staleRounds = 0;
    let scrollCount = 0;

    while (posts.size < CONFIG.maxPosts && scrollCount < 30 && staleRounds < 3) {
      const prev = posts.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl) return;
        const url = linkEl.href;
        if (posts.has(url)) return;

        const textEl = tweet.querySelector('[data-testid="tweetText"]');
        const likeEl = tweet.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtEl = tweet.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyEl = tweet.querySelector('[data-testid="reply"]');
        const viewEl = tweet.querySelector('a[href*="/analytics"]');
        const timeEl = tweet.querySelector('time');

        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        const retweets = parseCount(rtEl?.getAttribute('aria-label') || '0');
        const replies = parseCount(replyEl?.getAttribute('aria-label') || '0');
        const views = parseCount(viewEl?.textContent || '0');

        posts.set(url, {
          text: textEl?.textContent?.substring(0, 100) || '',
          url,
          timestamp: timeEl?.dateTime || '',
          likes, retweets, replies, views,
          engagement: likes + retweets + replies,
          engagementRate: views > 0 ? ((likes + retweets + replies) / views * 100).toFixed(2) : '0',
        });
      });

      staleRounds = posts.size === prev ? staleRounds + 1 : 0;
      scrollCount++;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    // ── ANALYSIS ────────────────────────────────────────────
    const arr = [...posts.values()];
    if (arr.length === 0) { console.error('❌ No posts found.'); return; }

    const totals = arr.reduce((s, p) => ({
      likes: s.likes + p.likes,
      retweets: s.retweets + p.retweets,
      replies: s.replies + p.replies,
      views: s.views + p.views,
    }), { likes: 0, retweets: 0, replies: 0, views: 0 });

    const totalEng = totals.likes + totals.retweets + totals.replies;
    const avgRate = totals.views > 0 ? (totalEng / totals.views * 100).toFixed(2) : '0';
    const topByLikes = [...arr].sort((a, b) => b.likes - a.likes).slice(0, 5);
    const worstByLikes = [...arr].sort((a, b) => a.likes - b.likes).slice(0, 3);

    // Best posting times
    const hourEng = {};
    arr.forEach(p => {
      if (p.timestamp) {
        const h = new Date(p.timestamp).getHours();
        hourEng[h] = (hourEng[h] || 0) + p.engagement;
      }
    });
    const bestHour = Object.entries(hourEng).sort((a, b) => b[1] - a[1])[0];

    // ── REPORT ──────────────────────────────────────────────
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  📊 ENGAGEMENT REPORT                     ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`\n📈 OVERVIEW (${arr.length} posts analyzed)`);
    console.log(`   ❤️  Likes:       ${totals.likes.toLocaleString()}`);
    console.log(`   🔄 Retweets:    ${totals.retweets.toLocaleString()}`);
    console.log(`   💬 Replies:     ${totals.replies.toLocaleString()}`);
    console.log(`   👁️  Views:       ${totals.views.toLocaleString()}`);
    console.log(`   📊 Avg eng rate: ${avgRate}%`);
    console.log(`   📊 Avg likes:    ${(totals.likes / arr.length).toFixed(1)}/post`);
    if (bestHour) console.log(`   ⏰ Best hour:    ${bestHour[0]}:00`);

    console.log('\n🏆 TOP 5 BY LIKES:');
    topByLikes.forEach((p, i) => console.log(`   ${i + 1}. ❤️ ${p.likes} | "${p.text.slice(0, 50)}..."`));

    console.log('\n📉 WORST 3 BY LIKES:');
    worstByLikes.forEach((p, i) => console.log(`   ${i + 1}. ❤️ ${p.likes} | "${p.text.slice(0, 50)}..."`));

    if (CONFIG.exportResults) {
      const report = {
        username,
        analyzedAt: new Date().toISOString(),
        summary: { ...totals, avgRate, postsAnalyzed: arr.length },
        bestHour: bestHour?.[0],
        posts: arr,
      };
      download(report, `xactions-analytics-${username}-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('\n📥 Full report downloaded as JSON');
    }
  })();
})();
