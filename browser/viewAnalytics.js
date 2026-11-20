// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// View Analytics (Premium) — by nichxbt
// https://github.com/nirholas/XActions
// Navigate to analytics dashboard, scrape impressions/engagements/followers, and export data.
//
// HOW TO USE:
// 1. Go to https://x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    autoNavigate: true,              // Navigate to analytics page automatically
    scrapeOverview: true,            // Scrape overview metrics
    scrapePostAnalytics: true,       // Scrape individual post performance
    maxPostsToScan: 30,              // Max posts to scrape analytics for
    exportData: true,                // Auto-download JSON when done
    scrollDelay: 2000,               // ms between scroll actions
    delayBetweenActions: 1500,       // ms between UI actions
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_analytics';

  const SELECTORS = {
    analyticsLink: 'a[href="/i/account_analytics"]',
    impressions: '[data-testid="impressions"]',
    engagements: '[data-testid="engagements"]',
    followersChart: '[data-testid="followersChart"]',
    analyticsTab: '[data-testid="analyticsTab"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    viewCount: '[data-testid="app-text-transition-container"]',
    likeCount: '[data-testid="like"]',
    retweetCount: '[data-testid="retweet"]',
    replyCount: '[data-testid="reply"]',
    analyticsButton: '[data-testid="analyticsButton"]',
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

  const navigateToAnalytics = async () => {
    console.log('🚀 Navigating to analytics dashboard...');

    const analyticsLink = document.querySelector(SELECTORS.analyticsLink)
      || document.querySelector('a[href*="account_analytics"]')
      || document.querySelector('a[href*="analytics"]');

    if (analyticsLink) {
      analyticsLink.click();
      console.log('✅ Clicked analytics link.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Analytics link not found. Navigating directly...');
      window.location.href = 'https://x.com/i/account_analytics';
      await sleep(CONFIG.delayBetweenActions * 2);
    }

    await sleep(CONFIG.delayBetweenActions);

    const primaryColumn = document.querySelector(SELECTORS.primaryColumn);
    if (primaryColumn) {
      const text = primaryColumn.textContent;
      if (text.includes('Analytics') || text.includes('analytics') || text.includes('impressions')) {
        console.log('✅ Analytics dashboard loaded.');
      } else {
        console.log('ℹ️ Page loaded — analytics content may still be rendering.');
      }
    }
  };

  const scrapeOverviewMetrics = async () => {
    console.log('\n📊 Scraping overview metrics...');

    const metrics = {};

    // Try data-testid selectors first
    const impressionsEl = document.querySelector(SELECTORS.impressions);
    const engagementsEl = document.querySelector(SELECTORS.engagements);
    const followersEl = document.querySelector(SELECTORS.followersChart);

    if (impressionsEl) {
      metrics.impressions = impressionsEl.textContent.trim();
      console.log(`   👁️ Impressions: ${metrics.impressions}`);
    }

    if (engagementsEl) {
      metrics.engagements = engagementsEl.textContent.trim();
      console.log(`   💬 Engagements: ${metrics.engagements}`);
    }

    if (followersEl) {
      metrics.followersChart = 'Chart data detected';
      console.log(`   👥 Followers chart: detected`);
    }

    // Scan for generic metric cards on analytics page
    const metricCards = document.querySelectorAll(
      '[data-testid*="metric"], [class*="metric"], [class*="stat"], [class*="analytics-card"]'
    );

    if (metricCards.length > 0) {
      console.log('\n📋 Metrics found on page:');
      metricCards.forEach((card, i) => {
        const text = card.textContent.trim().replace(/\s+/g, ' ');
        if (text.length > 0 && text.length < 200) {
          console.log(`   ${i + 1}. ${text}`);
          metrics[`card_${i}`] = text;
        }
      });
    }

    // Try to find metrics in summary sections
    const headings = document.querySelectorAll('h2, h3, [role="heading"]');
    headings.forEach(heading => {
      const text = heading.textContent.toLowerCase();
      const parent = heading.parentElement;

      if (text.includes('impression') || text.includes('view')) {
        const value = parent?.querySelector('span, [dir="ltr"]')?.textContent?.trim();
        if (value) {
          metrics.impressions = metrics.impressions || value;
          console.log(`   👁️ Impressions (from heading): ${value}`);
        }
      }

      if (text.includes('engagement')) {
        const value = parent?.querySelector('span, [dir="ltr"]')?.textContent?.trim();
        if (value) {
          metrics.engagements = metrics.engagements || value;
          console.log(`   💬 Engagements (from heading): ${value}`);
        }
      }

      if (text.includes('follower')) {
        const value = parent?.querySelector('span, [dir="ltr"]')?.textContent?.trim();
        if (value) {
          metrics.followers = value;
          console.log(`   👥 Followers (from heading): ${value}`);
        }
      }
    });

    if (Object.keys(metrics).length === 0) {
      console.log('⚠️ No overview metrics found. This may require X Premium.');
      console.log('💡 Analytics dashboard: https://x.com/i/account_analytics');
    }

    return metrics;
  };

  const scrapePostAnalytics = async () => {
    console.log('\n📝 Scraping post-level analytics...');

    const posts = [];
    let previousCount = 0;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries && posts.length < CONFIG.maxPostsToScan) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);

      tweets.forEach(tweet => {
        const textEl = tweet.querySelector(SELECTORS.tweetText);
        const text = textEl?.textContent?.trim()?.substring(0, 100) || 'No text';

        // Skip if already collected
        if (posts.find(p => p.text === text)) return;

        const viewEl = tweet.querySelector(SELECTORS.viewCount);
        const likeEl = tweet.querySelector(SELECTORS.likeCount);
        const retweetEl = tweet.querySelector(SELECTORS.retweetCount);
        const replyEl = tweet.querySelector(SELECTORS.replyCount);

        const views = viewEl?.textContent?.trim() || '0';
        const likes = likeEl?.getAttribute('aria-label') || likeEl?.textContent?.trim() || '0';
        const retweets = retweetEl?.getAttribute('aria-label') || retweetEl?.textContent?.trim() || '0';
        const replies = replyEl?.getAttribute('aria-label') || replyEl?.textContent?.trim() || '0';

        const timeEl = tweet.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || '';

        posts.push({
          text,
          views: parseMetricText(views),
          likes: parseMetricText(likes),
          retweets: parseMetricText(retweets),
          replies: parseMetricText(replies),
          timestamp,
          engagement: parseMetricText(likes) + parseMetricText(retweets) + parseMetricText(replies),
        });
      });

      if (posts.length === previousCount) {
        retries++;
      } else {
        retries = 0;
        previousCount = posts.length;
      }

      console.log(`   🔄 Collected ${posts.length} posts...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (posts.length > 0) {
      // Sort by engagement
      posts.sort((a, b) => b.engagement - a.engagement);

      console.log(`\n📊 Post Analytics (${posts.length} posts, sorted by engagement):`);
      console.log('─'.repeat(70));

      posts.slice(0, 15).forEach((post, i) => {
        console.log(`\n   ${i + 1}. "${post.text.substring(0, 60)}${post.text.length > 60 ? '...' : ''}"`);
        console.log(`      👁️ ${post.views.toLocaleString()} views | ❤️ ${post.likes.toLocaleString()} likes | 🔄 ${post.retweets.toLocaleString()} RTs | 💬 ${post.replies.toLocaleString()} replies`);
        if (post.timestamp) {
          console.log(`      📅 ${new Date(post.timestamp).toLocaleDateString()}`);
        }
      });

      if (posts.length > 15) {
        console.log(`\n   ... and ${posts.length - 15} more posts`);
      }

      // Summary stats
      const totalViews = posts.reduce((s, p) => s + p.views, 0);
      const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
      const totalRetweets = posts.reduce((s, p) => s + p.retweets, 0);
      const totalReplies = posts.reduce((s, p) => s + p.replies, 0);
      const avgEngagement = posts.reduce((s, p) => s + p.engagement, 0) / posts.length;

      console.log('\n📈 Summary:');
      console.log('─'.repeat(40));
      console.log(`   Total Views:     ${totalViews.toLocaleString()}`);
      console.log(`   Total Likes:     ${totalLikes.toLocaleString()}`);
      console.log(`   Total Retweets:  ${totalRetweets.toLocaleString()}`);
      console.log(`   Total Replies:   ${totalReplies.toLocaleString()}`);
      console.log(`   Avg Engagement:  ${Math.round(avgEngagement).toLocaleString()} per post`);

      if (totalViews > 0) {
        const engagementRate = ((totalLikes + totalRetweets + totalReplies) / totalViews * 100).toFixed(2);
        console.log(`   Engagement Rate: ${engagementRate}%`);
      }
    } else {
      console.log('ℹ️ No posts found to analyze.');
    }

    return posts;
  };

  const exportAnalytics = (overview, posts) => {
    const data = {
      exportedAt: new Date().toISOString(),
      overview,
      posts,
      postCount: posts.length,
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('💾 Analytics saved to sessionStorage.');
    } catch (e) {
      // Silent fail
    }

    if (CONFIG.exportData && posts.length > 0) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions_analytics_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('📥 Analytics exported as JSON file.');
    }
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('📊 XActions — View Analytics');
    console.log('═══════════════════════════════════════════\n');

    console.log('💡 Note: Full analytics require X Premium subscription.\n');

    if (CONFIG.autoNavigate) {
      await navigateToAnalytics();
      await sleep(1000);
    }

    let overview = {};
    if (CONFIG.scrapeOverview) {
      overview = await scrapeOverviewMetrics();
      await sleep(1000);
    }

    let posts = [];
    if (CONFIG.scrapePostAnalytics) {
      posts = await scrapePostAnalytics();
    }

    exportAnalytics(overview, posts);

    console.log('\n✅ Analytics script complete.');
    console.log('💡 Dashboard: https://x.com/i/account_analytics');
    console.log('💡 For detailed analytics, visit analytics.x.com');
  };

  run();
})();
