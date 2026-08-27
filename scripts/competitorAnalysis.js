// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
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

  // ⚠️ IMPORTANT: window.location.href navigation destroys the JS context,
  // so progress is tracked in sessionStorage and the script resumes on re-paste.
  const STATE_KEY = 'xactions_competitor_analysis';

  const getState = () => {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY)); }
    catch { return null; }
  };

  const setState = (state) => {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  };

  const clearState = () => {
    sessionStorage.removeItem(STATE_KEY);
  };

  const scrapeProfile = async (username) => {
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

  const printResults = (results) => {
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

  // ── Resume-aware runner ────────────────────────────────────
  // Because window.location.href kills the script, we analyze one
  // account, save state, navigate, then the user re-runs the script
  // to continue with the next account.
  const runWithResume = async () => {
    let state = getState();
    if (!state) {
      state = { currentIndex: 0, results: [], startedAt: new Date().toISOString() };
    }

    console.log('🏆 COMPETITOR ANALYSIS — by nichxbt');

    if (CONFIG.accounts.length === 0 || (CONFIG.accounts.length === 2 && CONFIG.accounts[0] === 'user1')) {
      console.error('❌ Edit CONFIG.accounts with real usernames first!');
      clearState();
      return;
    }

    console.log(`📋 Accounts: ${CONFIG.accounts.map(a => '@' + a).join(', ')}`);
    console.log(`   Progress: ${state.currentIndex}/${CONFIG.accounts.length} accounts done\n`);

    if (state.currentIndex >= CONFIG.accounts.length) {
      printResults(state.results);
      clearState();
      return;
    }

    const username = CONFIG.accounts[state.currentIndex];
    const currentPath = window.location.pathname.toLowerCase();

    if (!currentPath.startsWith(`/${username.toLowerCase()}`)) {
      console.log(`\n🔗 Navigate to https://x.com/${username} and re-run this script.`);
      console.log(`   (Or we'll navigate now — re-paste the script after the page loads)\n`);
      setState(state);
      window.location.href = `https://x.com/${username}`;
      return;
    }

    console.log(`\n📊 Analyzing @${username}...`);
    await sleep(3000);

    try {
      const data = await scrapeProfile(username);
      state.results.push(data);
      console.log(`   ✅ @${username}: ${data.followers.toLocaleString()} followers, ${data.avgLikes} avg likes`);
    } catch (e) {
      console.error(`   ❌ @${username}: ${e.message}`);
    }
    state.currentIndex++;
    setState(state);

    if (state.currentIndex < CONFIG.accounts.length) {
      const next = CONFIG.accounts[state.currentIndex];
      console.log(`\n➡️ Next: @${next}`);
      window.location.href = `https://x.com/${next}`;
      console.log('\n   📋 Re-paste this script after the page loads to continue!\n');
    } else {
      printResults(state.results);
      clearState();
    }
  };

  runWithResume();
})();
