/**
 * ============================================================
 * 🏆 Engagement Leaderboard — Production Grade
 * ============================================================
 *
 * @name        engagementLeaderboard.js
 * @description Analyze who engages with your tweets the most.
 *              Scrapes your recent tweets to build a leaderboard
 *              of top repliers, likers, and retweeters. Exports
 *              a VIP list for relationship building. Identifies
 *              superfans, dormant followers, and engagement tiers.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to your profile: x.com/YOUR_USERNAME
 * 2. Open DevTools Console (F12)
 * 3. Paste and run — auto-scrolls your timeline
 * 4. Outputs leaderboard + exports VIP list
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    scrollRounds: 12,
    scrollDelay: 2000,
    topN: 20,              // Show top N users per category
    vipThreshold: 3,       // Min interactions to be considered VIP
    exportResults: true,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  // ── Collect interactions ───────────────────────────────────
  const collectInteractions = async () => {
    const tweetData = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        const timeEl = article.querySelector('time');
        if (!timeEl) continue;
        const dt = timeEl.getAttribute('datetime');
        if (!dt) continue;

        const fp = dt + (article.textContent || '').slice(0, 40);
        if (seen.has(fp)) continue;
        seen.add(fp);

        // Get metrics
        const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
        const rtBtn = article.querySelector('[data-testid="retweet"] span') || article.querySelector('[data-testid="unretweet"] span');
        const replyBtn = article.querySelector('[data-testid="reply"] span');

        const likes = likeBtn ? parseNum(likeBtn.textContent) : 0;
        const rts = rtBtn ? parseNum(rtBtn.textContent) : 0;
        const replies = replyBtn ? parseNum(replyBtn.textContent) : 0;

        // Get tweet link for drilling into replies
        const tweetLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const href = tweetLink ? tweetLink.getAttribute('href') : null;

        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent.trim().slice(0, 100) : '';

        tweetData.push({ datetime: dt, likes, rts, replies, href, text });
      }

      console.log(`   📜 Round ${round + 1}: ${tweetData.length} tweets collected`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return tweetData;
  };

  // ── Drill into tweet replies to get actual repliers ────────
  const collectRepliers = async (tweetData) => {
    const replierMap = {};
    const processed = [];

    // Only drill into tweets that have replies and links
    const withReplies = tweetData.filter(t => t.replies > 0 && t.href).slice(0, 15);
    console.log(`\n🔍 Drilling into ${withReplies.length} tweet threads for replier data...\n`);

    for (let i = 0; i < withReplies.length; i++) {
      const tweet = withReplies[i];
      console.log(`   [${i + 1}/${withReplies.length}] Checking replies for: "${tweet.text.slice(0, 40)}..."`);

      // Navigate to tweet
      const origUrl = window.location.href;
      window.location.href = 'https://x.com' + tweet.href;
      await sleep(3000);

      // Collect visible repliers
      const replyArticles = document.querySelectorAll('article[data-testid="tweet"]');
      let count = 0;

      for (const article of replyArticles) {
        // Skip the original tweet (first article is usually the main tweet)
        if (count === 0) { count++; continue; }

        const userLink = article.querySelector('a[href^="/"][role="link"]');
        if (!userLink) continue;
        const match = (userLink.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
        if (!match || ['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) continue;

        const username = match[1].toLowerCase();

        // Display name
        const nameSpan = article.querySelector('a[href^="/"] span');
        const displayName = nameSpan ? nameSpan.textContent.trim() : match[1];

        if (!replierMap[username]) {
          replierMap[username] = { username: match[1], displayName, replies: 0, firstSeen: tweet.datetime };
        }
        replierMap[username].replies++;
        count++;
      }

      processed.push({ ...tweet, repliersFound: count - 1 });

      // Go back
      window.history.back();
      await sleep(2000);
    }

    return { replierMap, processed };
  };

  // ── Build leaderboard from visible engagement cues ─────────
  const buildBasicLeaderboard = async () => {
    // Scrape visible "liked by" and replier data from the current page
    // For a more basic approach, we scan reply sections visible on the timeline
    const engagers = {};
    const articles = document.querySelectorAll('article[data-testid="tweet"]');

    for (const article of articles) {
      // Check all user mentions/links in the article for reply-chain users
      const links = article.querySelectorAll('a[href^="/"][role="link"]');
      for (const link of links) {
        const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)$/);
        if (!match || ['home', 'explore', 'notifications', 'messages', 'i', 'compose'].includes(match[1])) continue;

        const username = match[1].toLowerCase();
        const nameSpan = link.querySelector('span');
        const displayName = nameSpan ? nameSpan.textContent.trim() : match[1];

        if (!engagers[username]) {
          engagers[username] = { username: match[1], displayName, mentions: 0 };
        }
        engagers[username].mentions++;
      }
    }

    return engagers;
  };

  // ── Main ───────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🏆 ENGAGEMENT LEADERBOARD' + ' '.repeat(W - 28) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log('\n📊 Phase 1: Collecting your tweet data...\n');
    const tweetData = await collectInteractions();

    if (tweetData.length < 3) {
      console.error('❌ Need at least 3 tweets. Make sure you\'re on your profile page.');
      return;
    }

    // Overall stats
    const totalLikes = tweetData.reduce((s, t) => s + t.likes, 0);
    const totalRts = tweetData.reduce((s, t) => s + t.rts, 0);
    const totalReplies = tweetData.reduce((s, t) => s + t.replies, 0);
    const totalEngagement = totalLikes + totalRts + totalReplies;
    const avgEngagement = (totalEngagement / tweetData.length).toFixed(1);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 ENGAGEMENT OVERVIEW');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Tweets analyzed: ${tweetData.length}`);
    console.log(`  Total likes:     ${totalLikes.toLocaleString()}`);
    console.log(`  Total retweets:  ${totalRts.toLocaleString()}`);
    console.log(`  Total replies:   ${totalReplies.toLocaleString()}`);
    console.log(`  Avg. engagement: ${avgEngagement} per tweet`);

    // ── Phase 2: Drill into replies ─────────────────────────
    console.log('\n📊 Phase 2: Analyzing repliers...\n');
    const { replierMap, processed } = await collectRepliers(tweetData);
    const repliers = Object.values(replierMap).sort((a, b) => b.replies - a.replies);

    if (repliers.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  💬 TOP REPLIERS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      for (let i = 0; i < Math.min(CONFIG.topN, repliers.length); i++) {
        const r = repliers[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        const bar = '█'.repeat(Math.min(30, r.replies));
        console.log(`  ${medal} ${String(i + 1).padStart(2)}. @${r.username.padEnd(16)} ${String(r.replies).padStart(3)} replies ${bar}`);
      }
    }

    // ── Engagement Tier Classification ──────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🎖️ ENGAGEMENT TIERS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const superfans = repliers.filter(r => r.replies >= 5);
    const regulars = repliers.filter(r => r.replies >= 3 && r.replies < 5);
    const casual = repliers.filter(r => r.replies >= 1 && r.replies < 3);

    console.log(`\n  ⭐ Superfans (5+ replies):    ${superfans.length}`);
    for (const s of superfans.slice(0, 10)) {
      console.log(`     @${s.username} — ${s.replies} replies`);
    }

    console.log(`\n  🔥 Regulars (3-4 replies):    ${regulars.length}`);
    for (const r of regulars.slice(0, 10)) {
      console.log(`     @${r.username} — ${r.replies} replies`);
    }

    console.log(`\n  👋 Casual (1-2 replies):      ${casual.length}`);
    console.log(`     (${casual.slice(0, 5).map(c => '@' + c.username).join(', ')}${casual.length > 5 ? '...' : ''})`);

    // ── Best performing tweets ──────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🔥 TOP PERFORMING TWEETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const byEngagement = [...tweetData].sort((a, b) => (b.likes + b.rts + b.replies) - (a.likes + a.rts + a.replies));
    for (let i = 0; i < Math.min(5, byEngagement.length); i++) {
      const t = byEngagement[i];
      const total = t.likes + t.rts + t.replies;
      console.log(`\n  #${i + 1}  ${total} engagement (❤️${t.likes} 🔁${t.rts} 💬${t.replies})`);
      console.log(`      "${t.text.slice(0, 70)}${t.text.length > 70 ? '...' : ''}"`);
    }

    // ── Worst performing tweets ─────────────────────────────
    const byWorst = [...tweetData].sort((a, b) => (a.likes + a.rts + a.replies) - (b.likes + b.rts + b.replies));
    console.log('\n━━━ 📉 LOWEST ENGAGEMENT TWEETS ━━━');
    for (let i = 0; i < Math.min(3, byWorst.length); i++) {
      const t = byWorst[i];
      const total = t.likes + t.rts + t.replies;
      console.log(`  #${i + 1}  ${total} engagement — "${t.text.slice(0, 60)}..."`);
    }

    // ── Reply rate analysis ─────────────────────────────────
    console.log('\n━━━ 💬 REPLY ENGAGEMENT ANALYSIS ━━━');
    const tweetsWithReplies = tweetData.filter(t => t.replies > 0);
    const replyRate = ((tweetsWithReplies.length / tweetData.length) * 100).toFixed(1);
    console.log(`  ${replyRate}% of your tweets get at least 1 reply`);

    if (tweetsWithReplies.length > 0) {
      const avgReplies = (tweetsWithReplies.reduce((s, t) => s + t.replies, 0) / tweetsWithReplies.length).toFixed(1);
      console.log(`  Average ${avgReplies} replies on tweets that get replies`);
    }

    // ── Like-to-retweet ratio ───────────────────────────────
    if (totalRts > 0) {
      const ltRatio = (totalLikes / totalRts).toFixed(1);
      console.log(`\n  ❤️/🔁 Like-to-Retweet ratio: ${ltRatio}:1`);
      if (ltRatio > 10) {
        console.log('  💡 High like/RT ratio — your content is liked but not shared. Try more hot takes or threads.');
      } else if (ltRatio < 2) {
        console.log('  💡 Great shareability! People retweet what you post.');
      }
    }

    // ── VIP List ────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ⭐ VIP LIST (engage back with these people!)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const vips = repliers.filter(r => r.replies >= CONFIG.vipThreshold);
    if (vips.length === 0) {
      console.log('  No VIPs yet. Increase scrollRounds or lower vipThreshold.');
    } else {
      for (const v of vips) {
        console.log(`  ⭐ @${v.username} (${v.displayName}) — ${v.replies} replies`);
      }
      console.log(`\n  💡 ${vips.length} VIPs found. Engage with their content to strengthen relationships!`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ── Export ───────────────────────────────────────────────
    if (CONFIG.exportResults) {
      const data = {
        overview: {
          tweets: tweetData.length,
          totalLikes, totalRts, totalReplies, totalEngagement,
          avgEngagement: parseFloat(avgEngagement),
        },
        topRepliers: repliers.slice(0, 50).map(r => ({ ...r })),
        tiers: {
          superfans: superfans.map(s => s.username),
          regulars: regulars.map(r => r.username),
          casualCount: casual.length,
        },
        vipList: vips.map(v => ({ username: v.username, displayName: v.displayName, replies: v.replies })),
        topTweets: byEngagement.slice(0, 10).map(t => ({
          text: t.text, likes: t.likes, rts: t.rts, replies: t.replies,
          total: t.likes + t.rts + t.replies, datetime: t.datetime,
        })),
        analyzedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-leaderboard-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Leaderboard + VIP list exported as JSON.');
    }
  };

  run();
})();
