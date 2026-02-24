// Engagement Analytics on X - by nichxbt
// https://github.com/nirholas/xactions
// Analyze engagement metrics across your recent posts
// 1. Go to https://x.com/YOUR_USERNAME
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    maxPosts: 50,
    scrollDelay: 1500,
    maxScrollAttempts: 30,
    maxRetries: 3,
    exportResults: true,
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
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const getUsername = () => {
    const match = window.location.pathname.match(/^\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const run = async () => {
    console.log('📊 ENGAGEMENT ANALYTICS - XActions by nichxbt');

    const username = getUsername();
    if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
      console.error('❌ Navigate to a profile page first! (x.com/YOUR_USERNAME)');
      return;
    }

    console.log(`📊 Analyzing @${username}'s engagement...\n`);

    const posts = new Map();
    let retries = 0;
    let scrollCount = 0;

    while (posts.size < CONFIG.maxPosts && scrollCount < CONFIG.maxScrollAttempts && retries < CONFIG.maxRetries) {
      const prevSize = posts.size;

      document.querySelectorAll($tweet).forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl) return;
        const tweetUrl = linkEl.href;
        if (posts.has(tweetUrl)) return;

        const textEl = tweet.querySelector($tweetText);
        const likeEl = tweet.querySelector($like);
        const rtEl = tweet.querySelector($retweet);
        const replyEl = tweet.querySelector($reply);
        const viewEl = tweet.querySelector($views);
        const timeEl = tweet.querySelector('time');

        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        const retweets = parseCount(rtEl?.getAttribute('aria-label') || '0');
        const replies = parseCount(replyEl?.getAttribute('aria-label') || '0');
        const views = parseCount(viewEl?.textContent || '0');

        posts.set(tweetUrl, {
          text: textEl?.textContent?.substring(0, 100) || '',
          url: tweetUrl,
          timestamp: timeEl?.dateTime || '',
          likes,
          retweets,
          replies,
          views,
          engagement: likes + retweets + replies,
          engagementRate: views > 0 ? ((likes + retweets + replies) / views * 100).toFixed(2) : '0',
        });
      });

      if (posts.size === prevSize) retries++;
      else retries = 0;

      scrollCount++;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    // Analysis
    const postsArray = [...posts.values()];
    const totalLikes = postsArray.reduce((s, p) => s + p.likes, 0);
    const totalRetweets = postsArray.reduce((s, p) => s + p.retweets, 0);
    const totalReplies = postsArray.reduce((s, p) => s + p.replies, 0);
    const totalViews = postsArray.reduce((s, p) => s + p.views, 0);
    const totalEngagement = totalLikes + totalRetweets + totalReplies;
    const avgEngRate = totalViews > 0 ? (totalEngagement / totalViews * 100).toFixed(2) : '0';

    const topByLikes = [...postsArray].sort((a, b) => b.likes - a.likes).slice(0, 5);
    const topByEngagement = [...postsArray].sort((a, b) => b.engagement - a.engagement).slice(0, 5);
    const topByViews = [...postsArray].sort((a, b) => b.views - a.views).slice(0, 5);

    // Best posting times analysis
    const hourCounts = {};
    const dayCounts = {};
    postsArray.forEach(p => {
      if (p.timestamp) {
        const d = new Date(p.timestamp);
        const hour = d.getHours();
        const day = d.toLocaleDateString('en-US', { weekday: 'long' });
        hourCounts[hour] = (hourCounts[hour] || 0) + p.engagement;
        dayCounts[day] = (dayCounts[day] || 0) + p.engagement;
      }
    });

    const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 ENGAGEMENT REPORT                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📈 OVERVIEW (${postsArray.length} posts analyzed)`);
    console.log(`   ❤️  Total likes:     ${totalLikes.toLocaleString()}`);
    console.log(`   🔄 Total retweets:  ${totalRetweets.toLocaleString()}`);
    console.log(`   💬 Total replies:   ${totalReplies.toLocaleString()}`);
    console.log(`   👁️  Total views:     ${totalViews.toLocaleString()}`);
    console.log(`   📊 Avg engagement:  ${avgEngRate}%`);
    console.log(`   📊 Avg likes/post:  ${(totalLikes / postsArray.length).toFixed(1)}`);

    if (bestHour) console.log(`\n⏰ Best posting hour: ${bestHour[0]}:00 (${bestHour[1]} total engagement)`);
    if (bestDay) console.log(`📅 Best posting day: ${bestDay[0]} (${bestDay[1]} total engagement)`);

    console.log('\n🏆 TOP 5 BY LIKES:');
    topByLikes.forEach((p, i) => {
      console.log(`   ${i + 1}. ❤️ ${p.likes} | "${p.text.substring(0, 50)}..."`);
    });

    console.log('\n🏆 TOP 5 BY ENGAGEMENT:');
    topByEngagement.forEach((p, i) => {
      console.log(`   ${i + 1}. 📊 ${p.engagement} | "${p.text.substring(0, 50)}..."`);
    });

    if (CONFIG.exportResults) {
      const report = {
        username,
        analyzedAt: new Date().toISOString(),
        summary: { totalLikes, totalRetweets, totalReplies, totalViews, avgEngRate, postsAnalyzed: postsArray.length },
        bestTimes: { bestHour: bestHour?.[0], bestDay: bestDay?.[0] },
        posts: postsArray,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-analytics-${username}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('\n📥 Full report downloaded as JSON');
    }
  };

  run();
})();
