// Competitor Analysis on X - by nichxbt
// https://github.com/nirholas/xactions
// Compare engagement, follower counts, and posting patterns of multiple accounts
// 1. Go to x.com (any page)
// 2. Open the Developer Console (F12)
// 3. Edit the accounts array below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    accounts: [
      // Add usernames to compare (without @)
      // 'elonmusk',
      // 'nichxbt',
      // 'openai',
    ],
    postsToAnalyze: 20,
    scrollDelay: 2000,
    exportResults: true,
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';

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

  const analyzeProfile = async (username) => {
    console.log(`\n📊 Analyzing @${username}...`);

    // Navigate to profile
    window.location.href = `https://x.com/${username}`;
    await sleep(3000);

    // Extract profile info
    const followingEl = document.querySelector(`a[href="/${username}/following"]`);
    const followersEl = document.querySelector(`a[href="/${username}/followers"]`);
    const bio = document.querySelector('[data-testid="UserDescription"]')?.textContent || '';
    const displayName = document.querySelector('[data-testid="UserName"]')?.textContent || '';

    const following = parseCount(followingEl?.textContent || '0');
    const followers = parseCount(followersEl?.textContent || '0');

    // Scroll and collect posts
    const posts = new Map();
    let noNewPosts = 0;

    while (posts.size < CONFIG.postsToAnalyze && noNewPosts < 3) {
      const prevSize = posts.size;

      document.querySelectorAll($tweet).forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || posts.has(linkEl.href)) return;

        const textEl = tweet.querySelector($tweetText);
        const likeEl = tweet.querySelector($like);
        const rtEl = tweet.querySelector($retweet);
        const replyEl = tweet.querySelector($reply);
        const timeEl = tweet.querySelector('time');

        posts.set(linkEl.href, {
          text: textEl?.textContent?.substring(0, 100) || '',
          likes: parseCount(likeEl?.getAttribute('aria-label') || '0'),
          retweets: parseCount(rtEl?.getAttribute('aria-label') || '0'),
          replies: parseCount(replyEl?.getAttribute('aria-label') || '0'),
          timestamp: timeEl?.dateTime || '',
        });
      });

      if (posts.size === prevSize) noNewPosts++;
      else noNewPosts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArray = [...posts.values()];
    const totalLikes = postsArray.reduce((s, p) => s + p.likes, 0);
    const totalRts = postsArray.reduce((s, p) => s + p.retweets, 0);
    const totalReplies = postsArray.reduce((s, p) => s + p.replies, 0);
    const totalEngagement = totalLikes + totalRts + totalReplies;

    return {
      username,
      displayName,
      bio: bio.substring(0, 200),
      followers,
      following,
      followRatio: following > 0 ? (followers / following).toFixed(2) : 'N/A',
      postsAnalyzed: postsArray.length,
      totalLikes,
      totalRetweets: totalRts,
      totalReplies,
      totalEngagement,
      avgLikesPerPost: postsArray.length > 0 ? (totalLikes / postsArray.length).toFixed(1) : 0,
      avgEngagementPerPost: postsArray.length > 0 ? (totalEngagement / postsArray.length).toFixed(1) : 0,
      engagementRate: followers > 0 ? ((totalEngagement / postsArray.length / followers) * 100).toFixed(3) : '0',
    };
  };

  const run = async () => {
    console.log('🏆 COMPETITOR ANALYSIS - XActions by nichxbt');

    if (CONFIG.accounts.length === 0) {
      console.error('❌ No accounts to analyze! Edit CONFIG.accounts array.');
      return;
    }

    console.log(`📋 Accounts to compare: ${CONFIG.accounts.join(', ')}`);

    const results = [];

    for (const account of CONFIG.accounts) {
      try {
        const data = await analyzeProfile(account);
        results.push(data);
        console.log(`   ✅ @${account}: ${data.followers.toLocaleString()} followers, ${data.avgLikesPerPost} avg likes`);
      } catch (e) {
        console.error(`   ❌ @${account}: ${e.message}`);
      }
    }

    // Sort by engagement
    results.sort((a, b) => parseFloat(b.avgEngagementPerPost) - parseFloat(a.avgEngagementPerPost));

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🏆 COMPETITOR COMPARISON                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    results.forEach((r, i) => {
      console.log(`${i + 1}. @${r.username}`);
      console.log(`   👥 Followers: ${r.followers.toLocaleString()} | Following: ${r.following.toLocaleString()} | Ratio: ${r.followRatio}`);
      console.log(`   📊 Avg likes: ${r.avgLikesPerPost} | Avg engagement: ${r.avgEngagementPerPost}`);
      console.log(`   📈 Engagement rate: ${r.engagementRate}%`);
      console.log('');
    });

    if (CONFIG.exportResults) {
      const report = {
        analyzedAt: new Date().toISOString(),
        accounts: results,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-competitor-analysis-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('📥 Full report downloaded as JSON');
    }
  };

  run();
})();
