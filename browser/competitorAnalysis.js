// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        competitorAnalysis.js
 * @title       Competitor Analysis
 * @description Compare engagement, follower counts and posting patterns of several accounts, or deep-analyze the profile you are on.
 * @category    analytics
 * @page        x.com/<username> or x.com/*
 * @writes      false
 * @aliases     scripts/competitorAnalysis.js, scripts/twitter/competitor-analysis.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * Usage:
 * Single profile (CONFIG.accounts left empty):
 * 1. Go to the competitor's profile: x.com/COMPETITOR
 * 2. Open the Developer Console (F12)
 * 3. Paste browser/competitorAnalysis.js and run it
 *    It reports posting frequency, engagement, content mix, hashtags and top posts,
 *    and saves the analysis to localStorage under xactions_competitor_<username>.
 *
 * Compare several accounts:
 * 1. Go to x.com (any page)
 * 2. Open the Developer Console (F12)
 * 3. Edit the accounts array below
 * 4. Paste browser/competitorAnalysis.js into the Developer Console and run it
 */
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
    // Single-profile mode (used when accounts is empty and you are on a profile page)
    profilePostsToAnalyze: 50, // Posts to analyze on the current profile
    maxScrolls: 30,            // Maximum scroll attempts in single-profile mode
    maxRetries: 3,             // Scrolls with no new posts before stopping
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
      engagementRate: followers > 0 && postsArray.length > 0 ? ((totalEngagement / postsArray.length / followers) * 100).toFixed(3) : '0',
    };
  };

  // ── Single-profile deep analysis (current page) ─────────────
  const analyzeCurrentProfile = async (username) => {
    const getProfileStats = () => {
      const stats = { followers: 0, following: 0, name: '', bio: '' };

      const nameEl = document.querySelector('[data-testid="UserName"]');
      stats.name = nameEl?.textContent?.split('@')[0]?.trim() || username;

      const bioEl = document.querySelector('[data-testid="UserDescription"]');
      stats.bio = bioEl?.textContent || '';

      document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent || '';

        if (href.includes('/followers') || href.includes('/verified_followers')) {
          const match = text.match(/([\d,.]+[KMB]?)/);
          if (match) stats.followers = parseCount(match[1]);
        }
        if (href.includes('/following')) {
          const match = text.match(/([\d,.]+[KMB]?)/);
          if (match) stats.following = parseCount(match[1]);
        }
      });

      return stats;
    };

    console.log(`🔎 Analyzing @${username}\n`);

    const profileStats = getProfileStats();
    console.log(`👤 ${profileStats.name}`);
    console.log(`📊 Followers: ${profileStats.followers.toLocaleString()} | Following: ${profileStats.following.toLocaleString()}`);
    console.log(`📝 Bio: ${profileStats.bio.slice(0, 100)}${profileStats.bio.length > 100 ? '...' : ''}\n`);

    console.log('🔄 Scrolling to analyze posts...\n');

    const posts = new Map();
    let retries = 0;
    let scrollCount = 0;

    while (posts.size < CONFIG.profilePostsToAnalyze && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
      const prevSize = posts.size;

      document.querySelectorAll($tweet).forEach(tweet => {
        const timeLink = tweet.querySelector('a[href*="/status/"] time')?.closest('a');
        const tweetUrl = timeLink?.getAttribute('href') || '';
        const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];

        if (!tweetId || posts.has(tweetId)) return;

        const textEl = tweet.querySelector($tweetText);
        const text = textEl?.textContent || '';

        const timeEl = tweet.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime');

        const likeBtn = tweet.querySelector($like);
        const retweetBtn = tweet.querySelector($retweet);
        const replyBtn = tweet.querySelector($reply);

        const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
        const retweets = parseCount(retweetBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
        const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');

        const hasImage = tweet.querySelector('[data-testid="tweetPhoto"]') !== null;
        const hasVideo = tweet.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]') !== null;
        const hasLink = tweet.querySelector('a[href*="t.co"]') !== null;

        const hashtags = (text.match(/#\w+/g) || []).map(h => h.toLowerCase());

        posts.set(tweetId, {
          id: tweetId,
          text,
          timestamp,
          likes,
          retweets,
          replies,
          engagement: likes + retweets + replies,
          hasImage,
          hasVideo,
          hasLink,
          hashtags,
          url: `https://x.com${tweetUrl}`,
        });
      });

      if (posts.size === prevSize) retries++;
      else retries = 0;

      console.log(`   Found ${posts.size} posts...`);

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollCount++;
    }

    const postsArray = Array.from(posts.values());

    if (postsArray.length === 0) {
      console.error('❌ No posts found.');
      return;
    }

    console.log(`\n✅ Analyzed ${postsArray.length} posts\n`);

    const formatNum = (n) => {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return Math.round(n).toString();
    };

    const totals = {
      likes: postsArray.reduce((sum, p) => sum + p.likes, 0),
      retweets: postsArray.reduce((sum, p) => sum + p.retweets, 0),
      replies: postsArray.reduce((sum, p) => sum + p.replies, 0),
    };

    const averages = {
      likes: totals.likes / postsArray.length,
      retweets: totals.retweets / postsArray.length,
      replies: totals.replies / postsArray.length,
      engagement: (totals.likes + totals.retweets + totals.replies) / postsArray.length,
    };

    // Posting frequency
    const postsWithTime = postsArray.filter(p => p.timestamp);
    let postsPerDay = 0;
    if (postsWithTime.length >= 2) {
      const oldest = new Date(postsWithTime[postsWithTime.length - 1].timestamp);
      const newest = new Date(postsWithTime[0].timestamp);
      const days = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
      postsPerDay = postsWithTime.length / days;
    }

    // Content mix
    const withImage = postsArray.filter(p => p.hasImage).length;
    const withVideo = postsArray.filter(p => p.hasVideo).length;
    const withLink = postsArray.filter(p => p.hasLink).length;
    const textOnly = postsArray.filter(p => !p.hasImage && !p.hasVideo && !p.hasLink).length;

    // Hashtags
    const hashtagCount = {};
    postsArray.forEach(p => {
      p.hashtags.forEach(h => {
        hashtagCount[h] = (hashtagCount[h] || 0) + 1;
      });
    });
    const topHashtags = Object.entries(hashtagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('═'.repeat(60));
    console.log(`📊 COMPETITOR ANALYSIS: @${username}`);
    console.log('═'.repeat(60));

    console.log('\n📈 ENGAGEMENT METRICS:');
    console.log('─'.repeat(50));
    console.log(`   Avg ❤️  Likes per post:    ${averages.likes.toFixed(1)}`);
    console.log(`   Avg 🔄 Retweets per post: ${averages.retweets.toFixed(1)}`);
    console.log(`   Avg 💬 Replies per post:  ${averages.replies.toFixed(1)}`);
    console.log(`   Avg Total Engagement:     ${averages.engagement.toFixed(1)}`);

    if (profileStats.followers > 0) {
      const engagementRate = (averages.engagement / profileStats.followers) * 100;
      console.log(`\n   📐 Engagement Rate: ${engagementRate.toFixed(3)}%`);
      console.log('      (avg engagement / followers)');
    }

    console.log('\n📅 POSTING FREQUENCY:');
    console.log('─'.repeat(50));
    console.log(`   Posts per day: ${postsPerDay.toFixed(1)}`);
    console.log(`   Posts per week: ${(postsPerDay * 7).toFixed(1)}`);

    console.log('\n📷 CONTENT MIX:');
    console.log('─'.repeat(50));
    const total = postsArray.length;
    console.log(`   📝 Text only:  ${textOnly} (${((textOnly / total) * 100).toFixed(0)}%)`);
    console.log(`   🖼️  With image: ${withImage} (${((withImage / total) * 100).toFixed(0)}%)`);
    console.log(`   🎥 With video: ${withVideo} (${((withVideo / total) * 100).toFixed(0)}%)`);
    console.log(`   🔗 With link:  ${withLink} (${((withLink / total) * 100).toFixed(0)}%)`);

    console.log('\n📊 ENGAGEMENT BY CONTENT TYPE:');
    console.log('─'.repeat(50));

    const typeStats = [
      { type: '📝 Text only', posts: postsArray.filter(p => !p.hasImage && !p.hasVideo) },
      { type: '🖼️  With image', posts: postsArray.filter(p => p.hasImage) },
      { type: '🎥 With video', posts: postsArray.filter(p => p.hasVideo) },
    ];

    typeStats.forEach(t => {
      if (t.posts.length > 0) {
        const avgEng = t.posts.reduce((sum, p) => sum + p.engagement, 0) / t.posts.length;
        console.log(`   ${t.type}: ${formatNum(avgEng)} avg (${t.posts.length} posts)`);
      }
    });

    if (topHashtags.length > 0) {
      console.log('\n#️⃣ TOP HASHTAGS:');
      console.log('─'.repeat(50));
      topHashtags.forEach(([tag, count], i) => {
        console.log(`   ${i + 1}. ${tag} (${count} times)`);
      });
    }

    console.log('\n🏆 TOP PERFORMING POSTS:');
    console.log('─'.repeat(50));
    const topPosts = [...postsArray].sort((a, b) => b.engagement - a.engagement).slice(0, 5);
    topPosts.forEach((p, i) => {
      console.log(`\n   ${i + 1}. ${formatNum(p.engagement)} total engagement`);
      console.log(`      ❤️ ${formatNum(p.likes)} | 🔄 ${formatNum(p.retweets)} | 💬 ${formatNum(p.replies)}`);
      console.log(`      "${p.text.slice(0, 80)}${p.text.length > 80 ? '...' : ''}"`);
      console.log(`      ${p.url}`);
    });

    const storageKey = `xactions_competitor_${username}`;
    const data = {
      username,
      timestamp: new Date().toISOString(),
      profileStats,
      postCount: postsArray.length,
      averages,
      postsPerDay,
      contentMix: { textOnly, withImage, withVideo, withLink },
      topHashtags,
      topPosts: topPosts.map(p => ({ text: p.text.slice(0, 200), engagement: p.engagement, url: p.url })),
    };
    localStorage.setItem(storageKey, JSON.stringify(data));

    console.log('\n' + '═'.repeat(60));
    console.log('💡 INSIGHTS TO APPLY:');
    console.log('═'.repeat(60));

    const bestType = typeStats.sort((a, b) => {
      const avgA = a.posts.length ? a.posts.reduce((sum, p) => sum + p.engagement, 0) / a.posts.length : 0;
      const avgB = b.posts.length ? b.posts.reduce((sum, p) => sum + p.engagement, 0) / b.posts.length : 0;
      return avgB - avgA;
    })[0];

    console.log(`\n1. Best content type: ${bestType.type}`);
    console.log(`2. Posting frequency: ${postsPerDay.toFixed(1)} posts/day`);
    if (topHashtags.length > 0) {
      console.log(`3. Key hashtags: ${topHashtags.slice(0, 5).map(h => h[0]).join(', ')}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`💾 Analysis saved! Export: copy(localStorage.getItem("${storageKey}"))`);
    console.log('═'.repeat(60) + '\n');
  };

  const run = async () => {
    console.log('🏆 COMPETITOR ANALYSIS - XActions by nichxbt');

    if (CONFIG.accounts.length === 0) {
      const username = window.location.pathname.match(/^\/([^/]+)/)?.[1];
      if (username && !['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose'].includes(username)) {
        await analyzeCurrentProfile(username);
        return;
      }
      console.error('❌ No accounts to analyze! Edit CONFIG.accounts array, or open a profile page to analyze it alone.');
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

    if (CONFIG.exportResults && results.length > 0) {
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
