// scripts/creatorStudio.js
// Browser console script for analyzing account analytics and content performance
// Paste in DevTools console on x.com/USERNAME (your profile)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxPosts: 30,
    scrollDelay: 1500,
    exportResults: true,
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

  const parseMetric = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const classifyPost = (article) => {
    if (article.querySelector('[data-testid="tweetPhoto"]')) return 'image';
    if (article.querySelector('video')) return 'video';
    if (article.querySelector('[data-testid="card.wrapper"]')) return 'link';
    if (article.querySelector('[data-testid="TextPoll"]')) return 'poll';
    return 'text';
  };

  const run = async () => {
    console.log('🎨 Creator Studio — Account Analytics');
    console.log('━'.repeat(50));

    // Extract profile stats
    const profileStats = (() => {
      const followersEl = document.querySelector('a[href$="/verified_followers"] span, a[href$="/followers"] span');
      const followingEl = document.querySelector('a[href$="/following"] span');
      const nameEl = document.querySelector('[data-testid="UserName"]');
      return {
        name: nameEl?.textContent?.trim() || 'Unknown',
        followers: followersEl?.textContent?.trim() || '0',
        following: followingEl?.textContent?.trim() || '0',
      };
    })();

    console.log(`👤 ${profileStats.name}`);
    console.log(`👥 Followers: ${profileStats.followers} | Following: ${profileStats.following}`);

    // Collect posts
    const posts = [];
    const seen = new Set();
    let scrollRounds = 0;
    const maxRounds = Math.ceil(CONFIG.maxPosts / 3) + 2;

    while (posts.length < CONFIG.maxPosts && scrollRounds < maxRounds) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (posts.length >= CONFIG.maxPosts) break;

        const linkEl = article.querySelector('a[href*="/status/"]');
        const href = linkEl?.href || '';
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const timeEl = article.querySelector('time');
        const datetime = timeEl?.getAttribute('datetime') || '';
        const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '';

        const likes = parseMetric(article.querySelector('[data-testid="like"] span')?.textContent);
        const reposts = parseMetric(article.querySelector('[data-testid="retweet"] span')?.textContent);
        const replies = parseMetric(article.querySelector('[data-testid="reply"] span')?.textContent);
        const bookmarks = parseMetric(article.querySelector('[data-testid="bookmark"] span')?.textContent);
        const views = parseMetric(article.querySelector('a[href*="/analytics"] span')?.textContent);

        const type = classifyPost(article);
        const totalEngagement = likes + reposts + replies + bookmarks;
        const engagementRate = views > 0 ? ((totalEngagement / views) * 100) : 0;

        posts.push({
          url: href,
          text: tweetText.slice(0, 120),
          datetime,
          type,
          likes,
          reposts,
          replies,
          bookmarks,
          views,
          totalEngagement,
          engagementRate,
        });
      }

      console.log(`📜 Scroll ${scrollRounds + 1}: ${posts.length}/${CONFIG.maxPosts} posts collected`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollRounds++;
    }

    if (posts.length === 0) {
      console.error('❌ No posts found. Make sure you are on a profile page with tweets.');
      return;
    }

    console.log(`\n✅ Collected ${posts.length} posts. Analyzing...\n`);

    // --- Compute Stats ---
    const avgEngRate = posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length;
    const avgLikes = posts.reduce((s, p) => s + p.likes, 0) / posts.length;
    const avgReposts = posts.reduce((s, p) => s + p.reposts, 0) / posts.length;
    const avgReplies = posts.reduce((s, p) => s + p.replies, 0) / posts.length;
    const totalViews = posts.reduce((s, p) => s + p.views, 0);

    console.log('━━━ 📊 ENGAGEMENT OVERVIEW ━━━');
    console.log(`  Avg engagement rate: ${avgEngRate.toFixed(2)}%`);
    console.log(`  Avg likes: ${avgLikes.toFixed(1)} | Avg reposts: ${avgReposts.toFixed(1)} | Avg replies: ${avgReplies.toFixed(1)}`);
    console.log(`  Total views across ${posts.length} posts: ${totalViews.toLocaleString()}`);

    // --- Best post type ---
    const typeMap = {};
    for (const p of posts) {
      if (!typeMap[p.type]) typeMap[p.type] = { count: 0, totalEng: 0, totalRate: 0 };
      typeMap[p.type].count++;
      typeMap[p.type].totalEng += p.totalEngagement;
      typeMap[p.type].totalRate += p.engagementRate;
    }

    console.log('\n━━━ 🏷️ PERFORMANCE BY POST TYPE ━━━');
    const typeEntries = Object.entries(typeMap).sort((a, b) => (b[1].totalRate / b[1].count) - (a[1].totalRate / a[1].count));
    for (const [type, data] of typeEntries) {
      const avg = (data.totalRate / data.count).toFixed(2);
      const avgEng = (data.totalEng / data.count).toFixed(1);
      const bar = '█'.repeat(Math.round(parseFloat(avg) * 5));
      console.log(`  ${type.padEnd(8)} — ${data.count} posts, avg rate: ${avg}%, avg engagement: ${avgEng} ${bar}`);
    }

    const bestType = typeEntries[0]?.[0] || 'text';
    console.log(`  🏆 Best performing type: ${bestType}`);

    // --- Posting frequency ---
    const dates = posts.filter(p => p.datetime).map(p => new Date(p.datetime));
    if (dates.length >= 2) {
      dates.sort((a, b) => a - b);
      const spanDays = (dates[dates.length - 1] - dates[0]) / 86400000;
      const postsPerDay = spanDays > 0 ? (dates.length / spanDays).toFixed(2) : dates.length;
      console.log(`\n━━━ 📅 POSTING FREQUENCY ━━━`);
      console.log(`  Period: ${spanDays.toFixed(0)} days`);
      console.log(`  Rate: ~${postsPerDay} posts/day`);
      if (postsPerDay < 1) console.log('  💡 Consider posting at least 1-2x daily for growth.');
      else if (postsPerDay > 8) console.log('  💡 Very active! Focus on quality over quantity.');
      else console.log('  ✅ Healthy posting cadence.');
    }

    // --- Top posts ---
    const topPosts = [...posts].sort((a, b) => b.totalEngagement - a.totalEngagement).slice(0, 5);
    console.log('\n━━━ 🔥 TOP 5 POSTS ━━━');
    for (const p of topPosts) {
      console.log(`  [${p.type}] ${p.totalEngagement} eng (${p.engagementRate.toFixed(2)}%) — "${p.text.slice(0, 60)}..."`);
    }

    // --- Growth indicator ---
    console.log('\n━━━ 📈 GROWTH INDICATORS ━━━');
    const growthMsg = avgEngRate > 5 ? '🚀 Excellent — strong growth' : avgEngRate > 2 ? '📈 Good — steady growth' : avgEngRate > 0.5 ? '📊 Average — focus on top types' : '⚠️ Low — experiment more';
    console.log(`  ${growthMsg}. Best type: "${bestType}" — post more of it!`);

    // --- Export ---
    if (CONFIG.exportResults) {
      const report = {
        profile: profileStats,
        summary: { totalPosts: posts.length, avgEngagementRate: avgEngRate.toFixed(2) + '%', avgLikes: avgLikes.toFixed(1), totalViews, bestPostType: bestType },
        topPosts: topPosts.map(p => ({ url: p.url, type: p.type, engagement: p.totalEngagement, rate: p.engagementRate.toFixed(2) + '%' })),
        posts,
        analyzedAt: new Date().toISOString(),
      };
      download(report, `xactions-creator-studio-${new Date().toISOString().slice(0, 10)}.json`);
    }

    console.log('\n✅ Creator Studio analysis complete.');
  };

  run();
})();
