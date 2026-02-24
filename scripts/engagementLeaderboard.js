// scripts/engagementLeaderboard.js
// Browser console script for tracking who engages most with your content
// Paste in DevTools console on x.com/YOUR_USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxPosts: 15,            // Max tweet threads to drill into
    scrollRounds: 10,        // Scroll rounds on profile
    scrollDelay: 2000,       // ms between scrolls
    topN: 20,                // Show top N per category
    vipThreshold: 3,         // Min interactions for VIP
    exportResults: true,     // Auto-download JSON
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

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const run = async () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🏆 ENGAGEMENT LEADERBOARD                     ║');
    console.log('║  by nichxbt — v1.0                            ║');
    console.log('╚════════════════════════════════════════════════╝');

    // Phase 1: Collect tweet data
    console.log('\n📊 Phase 1: Collecting your tweets...\n');
    const tweetData = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      for (const article of articles) {
        const timeEl = article.querySelector('time');
        if (!timeEl) continue;
        const dt = timeEl.getAttribute('datetime');
        const fp = dt + (article.textContent || '').slice(0, 40);
        if (seen.has(fp)) continue;
        seen.add(fp);

        const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
        const rtBtn = article.querySelector('[data-testid="retweet"] span');
        const replyBtn = article.querySelector('[data-testid="reply"] span');
        const likes = likeBtn ? parseNum(likeBtn.textContent) : 0;
        const rts = rtBtn ? parseNum(rtBtn.textContent) : 0;
        const replies = replyBtn ? parseNum(replyBtn.textContent) : 0;

        const tweetLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const href = tweetLink ? tweetLink.getAttribute('href') : null;
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent.trim().slice(0, 100) : '';

        tweetData.push({ datetime: dt, likes, rts, replies, href, text });
      }
      console.log(`   📜 Round ${round + 1}: ${tweetData.length} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (tweetData.length < 3) { console.error('❌ Need at least 3 tweets on your profile.'); return; }

    const totalLikes = tweetData.reduce((s, t) => s + t.likes, 0);
    const totalRts = tweetData.reduce((s, t) => s + t.rts, 0);
    const totalReplies = tweetData.reduce((s, t) => s + t.replies, 0);

    console.log('\n━━━ 📊 ENGAGEMENT OVERVIEW ━━━');
    console.log(`  Tweets: ${tweetData.length} | ❤️ ${totalLikes} | 🔁 ${totalRts} | 💬 ${totalReplies}`);
    console.log(`  Avg engagement: ${((totalLikes + totalRts + totalReplies) / tweetData.length).toFixed(1)} per tweet`);

    // Phase 2: Drill into tweet replies
    console.log('\n📊 Phase 2: Analyzing repliers...\n');
    const replierMap = {};
    const withReplies = tweetData.filter(t => t.replies > 0 && t.href).slice(0, CONFIG.maxPosts);

    for (let i = 0; i < withReplies.length; i++) {
      const tweet = withReplies[i];
      console.log(`   [${i + 1}/${withReplies.length}] "${tweet.text.slice(0, 40)}..."`);
      const origUrl = window.location.href;
      window.location.href = 'https://x.com' + tweet.href;
      await sleep(3000);

      const replyArticles = document.querySelectorAll('article[data-testid="tweet"]');
      let count = 0;
      for (const article of replyArticles) {
        if (count === 0) { count++; continue; } // skip original tweet
        const userLink = article.querySelector('a[href^="/"][role="link"]');
        if (!userLink) continue;
        const match = (userLink.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
        if (!match || ['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) continue;
        const username = match[1].toLowerCase();
        const nameSpan = article.querySelector('a[href^="/"] span');
        const displayName = nameSpan ? nameSpan.textContent.trim() : match[1];
        if (!replierMap[username]) replierMap[username] = { username: match[1], displayName, replies: 0 };
        replierMap[username].replies++;
        count++;
      }
      window.history.back();
      await sleep(2000);
    }

    const repliers = Object.values(replierMap).sort((a, b) => b.replies - a.replies);

    // Display leaderboard
    if (repliers.length > 0) {
      console.log('\n━━━ 💬 TOP REPLIERS ━━━');
      for (let i = 0; i < Math.min(CONFIG.topN, repliers.length); i++) {
        const r = repliers[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        console.log(`  ${medal} ${String(i + 1).padStart(2)}. @${r.username.padEnd(16)} ${r.replies} replies ${'█'.repeat(Math.min(20, r.replies))}`);
      }
    }

    // Tiers
    const superfans = repliers.filter(r => r.replies >= 5);
    const regulars = repliers.filter(r => r.replies >= 3 && r.replies < 5);
    const casual = repliers.filter(r => r.replies < 3);

    console.log('\n━━━ 🎖️ TIERS ━━━');
    console.log(`  ⭐ Superfans (5+): ${superfans.length} — ${superfans.slice(0, 5).map(s => '@' + s.username).join(', ')}`);
    console.log(`  🔥 Regulars (3-4): ${regulars.length} — ${regulars.slice(0, 5).map(r => '@' + r.username).join(', ')}`);
    console.log(`  👋 Casual (1-2):   ${casual.length}`);

    // Top tweets
    const byEng = [...tweetData].sort((a, b) => (b.likes + b.rts + b.replies) - (a.likes + a.rts + a.replies));
    console.log('\n━━━ 🔥 TOP TWEETS ━━━');
    byEng.slice(0, 5).forEach((t, i) => {
      console.log(`  #${i + 1} ${t.likes + t.rts + t.replies} eng (❤️${t.likes} 🔁${t.rts} 💬${t.replies}) "${t.text.slice(0, 50)}..."`);
    });

    // VIP list
    const vips = repliers.filter(r => r.replies >= CONFIG.vipThreshold);
    if (vips.length > 0) {
      console.log(`\n━━━ ⭐ VIP LIST (${vips.length}) ━━━`);
      vips.forEach(v => console.log(`  ⭐ @${v.username} — ${v.replies} replies`));
      console.log('  💡 Engage back with these people!');
    }

    console.log('');

    if (CONFIG.exportResults) {
      download({
        overview: { tweets: tweetData.length, totalLikes, totalRts, totalReplies },
        topRepliers: repliers.slice(0, 50),
        tiers: { superfans: superfans.map(s => s.username), regulars: regulars.map(r => r.username), casualCount: casual.length },
        vipList: vips.map(v => ({ username: v.username, replies: v.replies })),
        topTweets: byEng.slice(0, 10).map(t => ({ text: t.text, likes: t.likes, rts: t.rts, replies: t.replies })),
        analyzedAt: new Date().toISOString(),
      }, `xactions-leaderboard-${Date.now()}.json`);
    }
  };

  run();
})();
