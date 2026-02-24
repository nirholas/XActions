// Hashtag Analytics on X - by nichxbt
// https://github.com/nirholas/xactions
// Analyze performance and trends for specific hashtags
// 1. Go to x.com/search?q=%23YOUR_HASHTAG
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    maxPosts: 100,
    scrollDelay: 1500,
    maxScrollAttempts: 30,
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
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2]) num *= { K: 1000, M: 1000000, B: 1000000000 }[match[2].toUpperCase()];
    return Math.round(num);
  };

  const run = async () => {
    console.log('📊 HASHTAG ANALYTICS - XActions by nichxbt');

    // Extract hashtag from URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    const hashtag = query.match(/#(\w+)/)?.[1] || query;

    if (!hashtag) {
      console.error('❌ Navigate to a hashtag search page first!');
      console.log('📍 Go to: x.com/search?q=%23yourhashtag');
      return;
    }

    console.log(`📊 Analyzing #${hashtag}...\n`);

    const posts = new Map();
    const users = new Map();
    let retries = 0;

    while (posts.size < CONFIG.maxPosts && retries < 3) {
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

        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        const retweets = parseCount(rtEl?.getAttribute('aria-label') || '0');
        const replies = parseCount(replyEl?.getAttribute('aria-label') || '0');
        const views = parseCount(viewEl?.textContent || '0');

        posts.set(linkEl.href, {
          text: textEl?.textContent?.substring(0, 200) || '',
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

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArray = [...posts.values()];
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
    console.log(`║  📊 #${hashtag} ANALYTICS                                    `);
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

    if (CONFIG.exportResults) {
      const report = {
        hashtag,
        analyzedAt: new Date().toISOString(),
        summary: { posts: postsArray.length, uniqueUsers: usersArray.length, totalLikes, totalRetweets: totalRts, totalReplies, totalViews },
        topPosts: topPosts.slice(0, 10),
        topContributors: usersArray.slice(0, 20),
        hourlyDistribution: hourCounts,
        allPosts: postsArray,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-hashtag-${hashtag}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('\n📥 Report downloaded as JSON');
    }
  };

  run();
})();
