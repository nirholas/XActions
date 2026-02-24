// scripts/hashtagAnalytics.js
// Browser console script for analyzing hashtag frequency and engagement
// Paste in DevTools console on x.com/search or any timeline
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxPosts: 50,
    scrollDelay: 1500,
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

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const run = async () => {
    console.log('📊 HASHTAG ANALYTICS — by nichxbt\n');

    const posts = new Map();
    let retries = 0;

    while (posts.size < CONFIG.maxPosts && retries < 3) {
      const prevSize = posts.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || posts.has(linkEl.href)) return;

        const textEl = tweet.querySelector('[data-testid="tweetText"]');
        const text = textEl?.textContent || '';
        const hashtags = text.match(/#\w+/g) || [];

        const likeEl = tweet.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtEl = tweet.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyEl = tweet.querySelector('[data-testid="reply"]');
        const viewEl = tweet.querySelector('a[href*="/analytics"]');
        const timeEl = tweet.querySelector('time');
        const userLink = tweet.querySelector('a[href^="/"][role="link"]');

        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        const retweets = parseCount(rtEl?.getAttribute('aria-label') || '0');
        const replies = parseCount(replyEl?.getAttribute('aria-label') || '0');
        const views = parseCount(viewEl?.textContent || '0');

        posts.set(linkEl.href, {
          text: text.slice(0, 200),
          hashtags,
          username: userLink?.href?.match(/x\.com\/([^/]+)/)?.[1] || '',
          timestamp: timeEl?.dateTime || '',
          likes, retweets, replies, views,
          engagement: likes + retweets + replies,
        });
      });

      if (posts.size === prevSize) retries++;
      else retries = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArr = [...posts.values()];
    console.log(`📝 Collected ${postsArr.length} posts\n`);

    // Hashtag stats
    const hashtagMap = {};
    postsArr.forEach(p => {
      p.hashtags.forEach(tag => {
        const key = tag.toLowerCase();
        if (!hashtagMap[key]) hashtagMap[key] = { tag: key, count: 0, totalEng: 0, totalViews: 0 };
        hashtagMap[key].count++;
        hashtagMap[key].totalEng += p.engagement;
        hashtagMap[key].totalViews += p.views;
      });
    });

    const hashtags = Object.values(hashtagMap).sort((a, b) => b.count - a.count);

    if (hashtags.length === 0) {
      console.log('⚠️ No hashtags found in collected posts.');
      return;
    }

    // Overview
    const totalEng = postsArr.reduce((s, p) => s + p.engagement, 0);
    const totalViews = postsArr.reduce((s, p) => s + p.views, 0);

    console.log(`📈 OVERVIEW (${postsArr.length} posts)`);
    console.log(`   ❤️ Total engagement: ${totalEng.toLocaleString()}`);
    console.log(`   👁️ Total views: ${totalViews.toLocaleString()}`);
    console.log(`   #️⃣ Unique hashtags: ${hashtags.length}`);

    console.log('\n🏆 TOP HASHTAGS BY FREQUENCY:');
    hashtags.slice(0, 15).forEach((h, i) => {
      const avgEng = (h.totalEng / h.count).toFixed(1);
      console.log(`  ${i + 1}. ${h.tag} — ${h.count}x | avg ${avgEng} engagement`);
    });

    console.log('\n📊 TOP HASHTAGS BY AVG ENGAGEMENT:');
    const byAvgEng = [...hashtags].filter(h => h.count >= 2).sort((a, b) => (b.totalEng / b.count) - (a.totalEng / a.count));
    byAvgEng.slice(0, 10).forEach((h, i) => {
      console.log(`  ${i + 1}. ${h.tag} — avg ${(h.totalEng / h.count).toFixed(1)} engagement (${h.count} uses)`);
    });

    // Posting frequency by hour
    const hourCounts = {};
    postsArr.forEach(p => {
      if (p.timestamp) {
        const h = new Date(p.timestamp).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) console.log(`\n⏰ Peak posting hour: ${peakHour[0]}:00 (${peakHour[1]} posts)`);

    // Top contributors
    const users = {};
    postsArr.forEach(p => {
      if (p.username) {
        users[p.username] = users[p.username] || { posts: 0, totalEng: 0 };
        users[p.username].posts++;
        users[p.username].totalEng += p.engagement;
      }
    });
    const topUsers = Object.entries(users).sort((a, b) => b[1].totalEng - a[1].totalEng).slice(0, 5);
    if (topUsers.length > 0) {
      console.log('\n👤 TOP CONTRIBUTORS:');
      topUsers.forEach(([u, d], i) => console.log(`  ${i + 1}. @${u} — ${d.posts} posts, ${d.totalEng} engagement`));
    }

    if (CONFIG.exportResults) {
      download({
        analyzedAt: new Date().toISOString(),
        summary: { posts: postsArr.length, uniqueHashtags: hashtags.length, totalEng, totalViews },
        hashtags: hashtags.slice(0, 50),
        topByEngagement: byAvgEng.slice(0, 20),
        allPosts: postsArr,
      }, `xactions-hashtag-analytics-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('\n📥 Report exported as JSON.');
    }
  };

  run();
})();
