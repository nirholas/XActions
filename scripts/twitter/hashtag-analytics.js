// GENERATED FILE: a copy of browser/hashtagAnalytics.js, written by scripts/build-script-manifest.mjs. Edit browser/hashtagAnalytics.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Hashtag Analytics on X - by nichxbt
 * https://github.com/nirholas/xactions
 *
 * @name        hashtagAnalytics.js
 * @title       Hashtag Analytics
 * @description Analyze a hashtag search, your own posts or any timeline: totals, top posts and contributors, peak hour, and which hashtags drive engagement.
 * @category    analytics
 * @page        x.com/search?q=<query> or x.com/<you> or x.com/home
 * @writes      false
 * @aliases     scripts/hashtagAnalytics.js, scripts/twitter/hashtag-analytics.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 *
 * Analyze performance and trends for specific hashtags
 * 1. Go to x.com/search?q=%23YOUR_HASHTAG (one hashtag),
 *    your profile x.com/YOUR_USERNAME (which of your hashtags work),
 *    or any other timeline
 * 2. Open the Developer Console (F12)
 * 3. Paste browser/hashtagAnalytics.js into the Developer Console and run it
 *
 * On a profile or timeline the per-hashtag breakdown (most used,
 * best performing, impact, combinations, recommendations) is shown;
 * on a search page set hashtagBreakdown: true to see it too.
 */
(() => {
  const CONFIG = {
    maxPosts: 100,
    scrollDelay: 1500,
    maxScrollAttempts: 30,
    maxRetries: 3,              // Stop after this many scrolls with no new posts
    exportResults: true,
    hashtagBreakdown: 'auto',   // true | false | 'auto' (on except on a search page)
    saveToLocalStorage: true,   // Profile pages: keep the breakdown under xactions_hashtags_<username>
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';
  const $views = 'a[href*="/analytics"]';

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

  const formatNum = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  const RESERVED_PATHS = ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose'];

  // Per-hashtag breakdown: which hashtags appear and how they perform.
  const analyzeHashtags = (postsArray) => {
    const hashtagStats = {};
    let postsWithHashtags = 0;
    let postsWithoutHashtags = 0;

    postsArray.forEach(p => {
      if (p.hashtags.length > 0) {
        postsWithHashtags++;
        p.hashtags.forEach(tag => {
          if (!hashtagStats[tag]) hashtagStats[tag] = { tag, count: 0, totalEngagement: 0, totalViews: 0 };
          hashtagStats[tag].count++;
          hashtagStats[tag].totalEngagement += p.engagement;
          hashtagStats[tag].totalViews += p.views;
        });
      } else {
        postsWithoutHashtags++;
      }
    });

    Object.values(hashtagStats).forEach(stat => {
      stat.avgEngagement = stat.totalEngagement / stat.count;
    });

    const byCount = Object.values(hashtagStats).sort((a, b) => b.count - a.count);
    const byEngagement = Object.values(hashtagStats).filter(h => h.count >= 2).sort((a, b) => b.avgEngagement - a.avgEngagement);
    const byTotal = Object.values(hashtagStats).sort((a, b) => b.totalEngagement - a.totalEngagement);

    console.log('\n' + '═'.repeat(60));
    console.log('#️⃣ HASHTAG BREAKDOWN');
    console.log('═'.repeat(60));

    console.log(`\n   Posts with hashtags: ${postsWithHashtags} (${((postsWithHashtags / postsArray.length) * 100).toFixed(0)}%)`);
    console.log(`   Posts without hashtags: ${postsWithoutHashtags}`);
    console.log(`   Unique hashtags used: ${byCount.length}`);

    if (byCount.length === 0) {
      console.log('\n⚠️ No hashtags found in collected posts.');
      return { postsWithHashtags, postsWithoutHashtags, byCount, byEngagement, topCombos: [], avgWithHashtags: 0, avgWithoutHashtags: 0 };
    }

    const withHashtags = postsArray.filter(p => p.hashtags.length > 0);
    const withoutHashtags = postsArray.filter(p => p.hashtags.length === 0);
    const avgWithHashtags = withHashtags.length > 0
      ? withHashtags.reduce((s, p) => s + p.engagement, 0) / withHashtags.length
      : 0;
    const avgWithoutHashtags = withoutHashtags.length > 0
      ? withoutHashtags.reduce((s, p) => s + p.engagement, 0) / withoutHashtags.length
      : 0;

    console.log('\n📈 HASHTAG IMPACT:');
    console.log('─'.repeat(50));
    console.log(`   Avg engagement WITH hashtags:    ${formatNum(avgWithHashtags)}`);
    console.log(`   Avg engagement WITHOUT hashtags: ${formatNum(avgWithoutHashtags)}`);
    if (avgWithHashtags > avgWithoutHashtags && avgWithoutHashtags > 0) {
      const improvement = ((avgWithHashtags - avgWithoutHashtags) / avgWithoutHashtags * 100).toFixed(0);
      console.log(`   📈 Hashtags improve engagement by ${improvement}%`);
    } else if (avgWithoutHashtags > avgWithHashtags) {
      const decrease = ((avgWithoutHashtags - avgWithHashtags) / avgWithoutHashtags * 100).toFixed(0);
      console.log(`   📉 Posts without hashtags perform ${decrease}% better`);
    }

    console.log('\n🔢 MOST USED HASHTAGS:');
    console.log('─'.repeat(50));
    byCount.slice(0, 15).forEach((h, i) => {
      const bar = '█'.repeat(Math.min(20, Math.round(h.count / byCount[0].count * 20)));
      console.log(`   ${(i + 1).toString().padStart(2)}. ${h.tag.padEnd(20)} ${bar} ${h.count}x | avg ${h.avgEngagement.toFixed(1)} engagement`);
    });

    if (byEngagement.length > 0) {
      console.log('\n🏆 HIGHEST PERFORMING HASHTAGS (min 2 uses):');
      console.log('─'.repeat(50));
      byEngagement.slice(0, 10).forEach((h, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        console.log(`   ${medal} ${h.tag.padEnd(20)} ${formatNum(h.avgEngagement)} avg (${h.count} posts)`);
      });
    }

    console.log('\n💰 HASHTAGS BY TOTAL ENGAGEMENT:');
    console.log('─'.repeat(50));
    byTotal.slice(0, 10).forEach((h, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${h.tag.padEnd(20)} ${formatNum(h.totalEngagement)} total`);
    });

    console.log('\n🔗 HASHTAG COMBINATIONS:');
    console.log('─'.repeat(50));
    const combos = {};
    postsArray.filter(p => p.hashtags.length >= 2).forEach(p => {
      const sorted = [...new Set(p.hashtags)].sort();
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const key = `${sorted[i]} + ${sorted[j]}`;
          if (!combos[key]) combos[key] = { count: 0, totalEngagement: 0 };
          combos[key].count++;
          combos[key].totalEngagement += p.engagement;
        }
      }
    });
    const topCombos = Object.entries(combos)
      .filter(([, data]) => data.count >= 2)
      .map(([combo, data]) => ({ combo, ...data, avg: data.totalEngagement / data.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
    if (topCombos.length > 0) {
      topCombos.forEach((c, i) => console.log(`   ${i + 1}. ${c.combo} — ${formatNum(c.avg)} avg (${c.count}x)`));
    } else {
      console.log('   Not enough data on hashtag combinations.');
    }

    console.log('\n💡 RECOMMENDATIONS');
    console.log('─'.repeat(50));
    if (byEngagement.length > 0) {
      console.log('✅ Best performing hashtags to keep using:');
      byEngagement.slice(0, 5).forEach(h => console.log(`   ${h.tag}`));
    }
    const lowPerformers = Object.values(hashtagStats)
      .filter(h => h.count >= 3 && h.avgEngagement < avgWithHashtags * 0.5)
      .sort((a, b) => a.avgEngagement - b.avgEngagement);
    if (lowPerformers.length > 0) {
      console.log('❌ Consider dropping these underperforming hashtags:');
      lowPerformers.slice(0, 5).forEach(h => {
        console.log(`   ${h.tag} (${formatNum(h.avgEngagement)} avg vs ${formatNum(avgWithHashtags)} overall)`);
      });
    }

    return { postsWithHashtags, postsWithoutHashtags, byCount, byEngagement, topCombos, avgWithHashtags, avgWithoutHashtags };
  };

  const run = async () => {
    console.log('📊 HASHTAG ANALYTICS - XActions by nichxbt');

    // Extract hashtag from URL; without a search query, analyze the
    // profile or timeline that is open instead.
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    const hashtag = query.match(/#(\w+)/)?.[1] || query;
    const firstSegment = window.location.pathname.match(/^\/([^/]+)/)?.[1] || '';
    const profile = !hashtag && firstSegment && !RESERVED_PATHS.includes(firstSegment) ? firstSegment : '';
    const scope = hashtag ? 'search' : profile ? 'profile' : 'timeline';
    const label = scope === 'search' ? `#${hashtag}` : scope === 'profile' ? `@${profile}` : 'this timeline';
    const breakdown = CONFIG.hashtagBreakdown === 'auto' ? scope !== 'search' : !!CONFIG.hashtagBreakdown;

    console.log(`📊 Analyzing ${label}...\n`);

    const posts = new Map();
    const users = new Map();
    let retries = 0;
    let scrollCount = 0;

    while (posts.size < CONFIG.maxPosts && retries < CONFIG.maxRetries && scrollCount < CONFIG.maxScrollAttempts) {
      const prevSize = posts.size;

      document.querySelectorAll($tweet).forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || posts.has(linkEl.href)) return;

        const textEl = tweet.querySelector($tweetText);
        const likeEl = tweet.querySelector($like);
        const rtEl = tweet.querySelector($retweet);
        const replyEl = tweet.querySelector($reply);
        const viewEl = tweet.querySelector($views);
        const timeEl = tweet.querySelector('time');
        const userLink = tweet.querySelector('a[href^="/"][role="link"]');
        const username = userLink?.href?.match(/x\.com\/([^\/]+)/)?.[1] || '';
        const fullText = textEl?.textContent || '';

        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        const retweets = parseCount(rtEl?.getAttribute('aria-label') || '0');
        const replies = parseCount(replyEl?.getAttribute('aria-label') || '0');
        const views = parseCount(viewEl?.textContent || '0');

        posts.set(linkEl.href, {
          text: fullText.substring(0, 200),
          hashtags: (fullText.match(/#\w+/g) || []).map(h => h.toLowerCase()),
          url: linkEl.href,
          username,
          timestamp: timeEl?.dateTime || '',
          likes,
          retweets,
          replies,
          views,
          engagement: likes + retweets + replies,
        });

        // Track users
        if (username) {
          const userData = users.get(username) || { username, posts: 0, totalEngagement: 0 };
          userData.posts++;
          userData.totalEngagement += likes + retweets + replies;
          users.set(username, userData);
        }
      });

      if (posts.size === prevSize) retries++;
      else retries = 0;

      console.log(`   Found ${posts.size} posts...`);

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollCount++;
    }

    const postsArray = [...posts.values()];
    if (postsArray.length === 0) {
      console.error('❌ No posts found.');
      if (scope === 'timeline') console.log('📍 Go to: x.com/search?q=%23yourhashtag or your profile');
      return;
    }

    const usersArray = [...users.values()].sort((a, b) => b.totalEngagement - a.totalEngagement);

    const totalLikes = postsArray.reduce((s, p) => s + p.likes, 0);
    const totalRts = postsArray.reduce((s, p) => s + p.retweets, 0);
    const totalReplies = postsArray.reduce((s, p) => s + p.replies, 0);
    const totalViews = postsArray.reduce((s, p) => s + p.views, 0);

    const topPosts = [...postsArray].sort((a, b) => b.engagement - a.engagement).slice(0, 5);

    // Posting frequency by hour
    const hourCounts = {};
    postsArray.forEach(p => {
      if (p.timestamp) {
        const h = new Date(p.timestamp).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    });

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  📊 ${scope === 'search' ? `#${hashtag}` : label} ANALYTICS                                    `);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📈 OVERVIEW (${postsArray.length} posts analyzed)`);
    console.log(`   ❤️  Total likes:     ${totalLikes.toLocaleString()}`);
    console.log(`   🔄 Total retweets:  ${totalRts.toLocaleString()}`);
    console.log(`   💬 Total replies:   ${totalReplies.toLocaleString()}`);
    console.log(`   👁️  Total views:     ${totalViews.toLocaleString()}`);
    console.log(`   👤 Unique users:    ${usersArray.length}`);

    console.log('\n🏆 TOP POSTS:');
    topPosts.forEach((p, i) => {
      console.log(`   ${i + 1}. @${p.username}: "${p.text.substring(0, 60)}..." (❤️ ${p.likes} 🔄 ${p.retweets})`);
    });

    console.log('\n👤 TOP CONTRIBUTORS:');
    usersArray.slice(0, 10).forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username}: ${u.posts} posts, ${u.totalEngagement} total engagement`);
    });

    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      console.log(`\n⏰ Peak posting hour: ${peakHour[0]}:00 (${peakHour[1]} posts)`);
    }

    const tags = breakdown ? analyzeHashtags(postsArray) : null;

    if (tags && scope === 'profile' && CONFIG.saveToLocalStorage) {
      const storageKey = `xactions_hashtags_${profile}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          username: profile,
          timestamp: new Date().toISOString(),
          postCount: postsArray.length,
          postsWithHashtags: tags.postsWithHashtags,
          uniqueHashtags: tags.byCount.length,
          avgWithHashtags: tags.avgWithHashtags,
          avgWithoutHashtags: tags.avgWithoutHashtags,
          topByEngagement: tags.byEngagement.slice(0, 20).map(h => ({ tag: h.tag, count: h.count, avg: h.avgEngagement })),
          topByCount: tags.byCount.slice(0, 20).map(h => ({ tag: h.tag, count: h.count })),
        }));
        console.log(`\n💾 Analysis saved! Export: copy(localStorage.getItem("${storageKey}"))`);
      } catch (e) {
        console.warn(`⚠️ Could not save to localStorage: ${e.message}`);
      }
    }

    if (CONFIG.exportResults) {
      const report = {
        hashtag: scope === 'search' ? hashtag : null,
        scope,
        profile: profile || null,
        analyzedAt: new Date().toISOString(),
        summary: { posts: postsArray.length, uniqueUsers: usersArray.length, totalLikes, totalRetweets: totalRts, totalReplies, totalViews },
        topPosts: topPosts.slice(0, 10),
        topContributors: usersArray.slice(0, 20),
        hourlyDistribution: hourCounts,
        allPosts: postsArray,
      };
      if (tags) {
        report.summary.uniqueHashtags = tags.byCount.length;
        report.summary.postsWithHashtags = tags.postsWithHashtags;
        report.summary.avgWithHashtags = tags.avgWithHashtags;
        report.summary.avgWithoutHashtags = tags.avgWithoutHashtags;
        report.hashtags = tags.byCount.slice(0, 50);
        report.topByEngagement = tags.byEngagement.slice(0, 20);
        report.topCombinations = tags.topCombos;
      }
      const fileLabel = scope === 'search' ? hashtag : scope === 'profile' ? `analytics-${profile}` : 'analytics';
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-hashtag-${fileLabel}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('\n📥 Report downloaded as JSON');
    }
  };

  run();
})();
