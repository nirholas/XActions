// scripts/competitorAnalysis.js
// Browser console script for comparing competitor account stats and engagement
// Paste in DevTools console on x.com (any page)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    accounts: ['user1', 'user2'],   // Edit: add usernames without @
    postsToAnalyze: 10,
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

  const analyzeProfile = async (username) => {
    console.log(`\n📊 Analyzing @${username}...`);
    window.location.href = `https://x.com/${username}`;
    await sleep(3000);

    const followingEl = document.querySelector(`a[href="/${username}/following"]`);
    const followersEl = document.querySelector(`a[href="/${username}/followers"]`);
    const bio = document.querySelector('[data-testid="UserDescription"]')?.textContent || '';

    const following = parseCount(followingEl?.textContent || '0');
    const followers = parseCount(followersEl?.textContent || '0');

    // Collect posts
    const posts = new Map();
    let retries = 0;

    while (posts.size < CONFIG.postsToAnalyze && retries < 3) {
      const prevSize = posts.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || posts.has(linkEl.href)) return;

        const likeEl = tweet.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtEl = tweet.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyEl = tweet.querySelector('[data-testid="reply"]');
        const timeEl = tweet.querySelector('time');
        const textEl = tweet.querySelector('[data-testid="tweetText"]');

        posts.set(linkEl.href, {
          text: textEl?.textContent?.slice(0, 100) || '',
          likes: parseCount(likeEl?.getAttribute('aria-label') || '0'),
          retweets: parseCount(rtEl?.getAttribute('aria-label') || '0'),
          replies: parseCount(replyEl?.getAttribute('aria-label') || '0'),
          timestamp: timeEl?.dateTime || '',
        });
      });

      if (posts.size === prevSize) retries++;
      else retries = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(2000);
    }

    const postsArr = [...posts.values()];
    const totalLikes = postsArr.reduce((s, p) => s + p.likes, 0);
    const totalRts = postsArr.reduce((s, p) => s + p.retweets, 0);
    const totalReplies = postsArr.reduce((s, p) => s + p.replies, 0);
    const totalEng = totalLikes + totalRts + totalReplies;

    return {
      username, bio: bio.slice(0, 200), followers, following,
      followRatio: following > 0 ? (followers / following).toFixed(2) : 'N/A',
      postsAnalyzed: postsArr.length,
      totalLikes, totalRetweets: totalRts, totalReplies, totalEngagement: totalEng,
      avgLikes: postsArr.length > 0 ? (totalLikes / postsArr.length).toFixed(1) : 0,
      avgEngagement: postsArr.length > 0 ? (totalEng / postsArr.length).toFixed(1) : 0,
      engagementRate: followers > 0 && postsArr.length > 0 ? ((totalEng / postsArr.length / followers) * 100).toFixed(3) : '0',
    };
  };

  const run = async () => {
    console.log('🏆 COMPETITOR ANALYSIS — by nichxbt');

    if (CONFIG.accounts.length === 0 || (CONFIG.accounts.length === 2 && CONFIG.accounts[0] === 'user1')) {
      console.error('❌ Edit CONFIG.accounts with real usernames first!');
      return;
    }

    console.log(`📋 Accounts: ${CONFIG.accounts.map(a => '@' + a).join(', ')}\n`);

    const results = [];
    for (const account of CONFIG.accounts) {
      try {
        const data = await analyzeProfile(account);
        results.push(data);
        console.log(`   ✅ @${account}: ${data.followers.toLocaleString()} followers, ${data.avgLikes} avg likes`);
      } catch (e) {
        console.error(`   ❌ @${account}: ${e.message}`);
      }
    }

    results.sort((a, b) => parseFloat(b.avgEngagement) - parseFloat(a.avgEngagement));

    console.log('\n🏆 COMPETITOR COMPARISON:\n');
    results.forEach((r, i) => {
      console.log(`${i + 1}. @${r.username}`);
      console.log(`   👥 Followers: ${r.followers.toLocaleString()} | Following: ${r.following.toLocaleString()} | Ratio: ${r.followRatio}`);
      console.log(`   📊 Avg likes: ${r.avgLikes} | Avg engagement: ${r.avgEngagement}`);
      console.log(`   📈 Engagement rate: ${r.engagementRate}%`);
      console.log('');
    });

    if (CONFIG.exportResults && results.length > 0) {
      download({ analyzedAt: new Date().toISOString(), accounts: results },
        `xactions-competitor-analysis-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('📥 Report exported as JSON.');
    }
  };

  run();
})();
