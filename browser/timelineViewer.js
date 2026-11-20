// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Timeline Viewer — by nichxbt
// https://github.com/nirholas/XActions
// Switch between For You / Following timelines, auto-scroll and collect posts, and export data.
//
// HOW TO USE:
// 1. Go to https://x.com/home
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    timeline: 'for-you',             // 'for-you' or 'following'
    autoSwitch: true,                // Automatically switch to selected timeline
    collectPosts: true,              // Scroll and collect posts
    maxPosts: 100,                   // Max posts to collect
    exportData: true,                // Auto-download JSON when done
    scrollDelay: 2000,               // ms between scroll actions
    delayBetweenActions: 1500,       // ms between UI actions
    maxScrollRetries: 8,             // Empty scrolls before stopping
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_timeline';

  const SELECTORS = {
    tabList: '[data-testid="ScrollSnap-List"] a',
    homeLink: 'a[href="/home"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    viewCount: '[data-testid="app-text-transition-container"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    replyButton: '[data-testid="reply"]',
    userLink: '[data-testid="User-Name"] a',
    primaryColumn: '[data-testid="primaryColumn"]',
    timelineHeader: '[data-testid="primaryColumn"] [role="heading"]',
  };

  const parseMetricText = (text) => {
    if (!text) return 0;
    const cleaned = text.replace(/,/g, '').trim();
    const match = cleaned.match(/([\d.]+)\s*([KMB]?)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const suffix = match[2].toUpperCase();
    const multipliers = { K: 1000, M: 1000000, B: 1000000000 };
    return Math.round(num * (multipliers[suffix] || 1));
  };

  const getCurrentTimeline = () => {
    const tabs = document.querySelectorAll(SELECTORS.tabList);
    let current = 'unknown';

    tabs.forEach(tab => {
      const text = tab.textContent.trim().toLowerCase();
      const isActive = tab.getAttribute('aria-selected') === 'true'
        || tab.classList.contains('r-1habvwh')
        || tab.querySelector('[style*="font-weight: 700"]')
        || tab.closest('[aria-selected="true"]');

      if (isActive) {
        if (text.includes('for you')) current = 'for-you';
        else if (text.includes('following')) current = 'following';
      }
    });

    return current;
  };

  const switchTimeline = async (target) => {
    console.log(`🔄 Switching to "${target}" timeline...`);

    const tabs = document.querySelectorAll(SELECTORS.tabList);
    let switched = false;

    for (const tab of tabs) {
      const text = tab.textContent.trim().toLowerCase();

      if (
        (target === 'for-you' && text.includes('for you')) ||
        (target === 'following' && text.includes('following'))
      ) {
        tab.click();
        switched = true;
        console.log(`✅ Clicked "${tab.textContent.trim()}" tab.`);
        break;
      }
    }

    if (!switched) {
      console.log(`⚠️ Could not find "${target}" tab. Available tabs:`);
      tabs.forEach((tab, i) => {
        console.log(`   ${i + 1}. ${tab.textContent.trim()}`);
      });
    }

    await sleep(CONFIG.delayBetweenActions);
    return switched;
  };

  const extractPostData = (tweet) => {
    const textEl = tweet.querySelector(SELECTORS.tweetText);
    const text = textEl?.textContent?.trim() || '';

    // Extract username
    const userLinks = tweet.querySelectorAll(SELECTORS.userLink);
    let username = '';
    let displayName = '';
    userLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('/') && !href.includes('/status/')) {
        if (!username) username = href.replace('/', '');
        if (!displayName) displayName = link.textContent.trim();
      }
    });

    // Extract metrics
    const viewEl = tweet.querySelector(SELECTORS.viewCount);
    const views = viewEl?.textContent?.trim() || '0';

    const likeEl = tweet.querySelector(SELECTORS.likeButton)
      || tweet.querySelector(SELECTORS.unlikeButton);
    const likes = likeEl?.getAttribute('aria-label') || '0';

    const retweetEl = tweet.querySelector(SELECTORS.retweetButton);
    const retweets = retweetEl?.getAttribute('aria-label') || '0';

    const replyEl = tweet.querySelector(SELECTORS.replyButton);
    const replies = replyEl?.getAttribute('aria-label') || '0';

    // Extract timestamp
    const timeEl = tweet.querySelector('time');
    const timestamp = timeEl?.getAttribute('datetime') || '';

    // Extract post URL
    const statusLink = tweet.querySelector('a[href*="/status/"]');
    const postUrl = statusLink ? `https://x.com${statusLink.getAttribute('href')}` : '';

    // Check for media
    const hasImage = !!tweet.querySelector('[data-testid="tweetPhoto"]');
    const hasVideo = !!tweet.querySelector('[data-testid="videoPlayer"]');
    const isRepost = !!tweet.querySelector('[data-testid="socialContext"]');

    // Check if liked
    const isLiked = !!tweet.querySelector(SELECTORS.unlikeButton);

    return {
      username,
      displayName,
      text: text.substring(0, 280),
      views: parseMetricText(views),
      likes: parseMetricText(likes),
      retweets: parseMetricText(retweets),
      replies: parseMetricText(replies),
      timestamp,
      postUrl,
      hasImage,
      hasVideo,
      isRepost,
      isLiked,
    };
  };

  const collectPosts = async () => {
    const currentTimeline = getCurrentTimeline();
    console.log(`\n📥 Collecting posts from "${currentTimeline}" timeline...`);
    console.log(`   Target: ${CONFIG.maxPosts} posts\n`);

    const collectedPosts = new Map();
    let retries = 0;

    while (retries < CONFIG.maxScrollRetries && collectedPosts.size < CONFIG.maxPosts) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      let newPostsFound = 0;

      tweets.forEach(tweet => {
        const data = extractPostData(tweet);
        const key = data.postUrl || `${data.username}:${data.text.substring(0, 50)}`;

        if (key && !collectedPosts.has(key)) {
          collectedPosts.set(key, data);
          newPostsFound++;
        }
      });

      if (newPostsFound === 0) {
        retries++;
      } else {
        retries = 0;
      }

      console.log(`   🔄 Collected ${collectedPosts.size}/${CONFIG.maxPosts} posts (${newPostsFound} new)...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const posts = [...collectedPosts.values()];
    return posts;
  };

  const displaySummary = (posts) => {
    if (posts.length === 0) {
      console.log('⚠️ No posts collected.');
      return;
    }

    console.log(`\n══════════════════════════════════════════════════`);
    console.log(`📊 TIMELINE SUMMARY (${posts.length} posts)`);
    console.log(`══════════════════════════════════════════════════\n`);

    // Top posts by views
    const byViews = [...posts].sort((a, b) => b.views - a.views);
    console.log('🏆 Top 5 by views:');
    byViews.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. @${p.username}: "${p.text.substring(0, 50)}..." (${p.views.toLocaleString()} views)`);
    });

    // Most active accounts
    const accountCounts = {};
    posts.forEach(p => {
      accountCounts[p.username] = (accountCounts[p.username] || 0) + 1;
    });
    const topAccounts = Object.entries(accountCounts).sort((a, b) => b[1] - a[1]);

    console.log('\n👥 Most frequent accounts in timeline:');
    topAccounts.slice(0, 10).forEach(([username, count], i) => {
      console.log(`   ${i + 1}. @${username} (${count} posts)`);
    });

    // Content breakdown
    const withImages = posts.filter(p => p.hasImage).length;
    const withVideos = posts.filter(p => p.hasVideo).length;
    const reposts = posts.filter(p => p.isRepost).length;
    const textOnly = posts.filter(p => !p.hasImage && !p.hasVideo).length;

    console.log('\n📋 Content breakdown:');
    console.log(`   📝 Text only:  ${textOnly}`);
    console.log(`   🖼️  With image: ${withImages}`);
    console.log(`   🎥 With video: ${withVideos}`);
    console.log(`   🔄 Reposts:    ${reposts}`);

    // Aggregate metrics
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const avgViews = Math.round(totalViews / posts.length);
    const likedByYou = posts.filter(p => p.isLiked).length;

    console.log('\n📈 Aggregate metrics:');
    console.log(`   Total views:     ${totalViews.toLocaleString()}`);
    console.log(`   Total likes:     ${totalLikes.toLocaleString()}`);
    console.log(`   Avg views/post:  ${avgViews.toLocaleString()}`);
    console.log(`   Liked by you:    ${likedByYou}`);

    console.log('\n══════════════════════════════════════════════════\n');
  };

  const exportTimeline = (posts, timeline) => {
    const data = {
      exportedAt: new Date().toISOString(),
      timeline,
      postCount: posts.length,
      posts,
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('💾 Timeline data saved to sessionStorage.');
    } catch (e) {
      // Silent fail
    }

    if (CONFIG.exportData && posts.length > 0) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions_timeline_${timeline}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('📥 Timeline data exported as JSON file.');
    }
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('📰 XActions — Timeline Viewer');
    console.log('═══════════════════════════════════════════\n');

    // Check we're on the home page
    const isHome = window.location.pathname === '/home' || window.location.pathname === '/';
    if (!isHome) {
      console.log('⚠️ Not on the home timeline.');
      console.log('💡 Navigate to https://x.com/home first.');
      console.log('🔄 Navigating now...');
      window.location.href = 'https://x.com/home';
      return;
    }

    const currentTimeline = getCurrentTimeline();
    console.log(`📍 Current timeline: ${currentTimeline || 'unknown'}`);
    console.log(`🎯 Target timeline: ${CONFIG.timeline}\n`);

    if (CONFIG.autoSwitch && currentTimeline !== CONFIG.timeline) {
      await switchTimeline(CONFIG.timeline);
      await sleep(CONFIG.delayBetweenActions);
    }

    const activeTimeline = getCurrentTimeline() || CONFIG.timeline;

    if (CONFIG.collectPosts) {
      const posts = await collectPosts();
      displaySummary(posts);
      exportTimeline(posts, activeTimeline);
    } else {
      console.log('ℹ️ Post collection disabled. Set CONFIG.collectPosts = true to collect posts.');
    }

    console.log('✅ Timeline Viewer script complete.');
    console.log('💡 Tip: Change CONFIG.timeline to "following" to view your Following feed.');
    console.log('💡 Tip: Increase CONFIG.maxPosts for a larger sample.');
  };

  run();
})();
