// scripts/scrapeAnalytics.js
// Browser console script to scrape X/Twitter analytics data
// Paste in DevTools console on x.com/i/account_analytics or any post
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const CONFIG = {
    mode: 'account', // 'account' or 'post'
    // For post mode, navigate to a specific tweet first
    scrapeRecentPosts: true,
    maxPosts: 20,
  };

  const scrapeAccountAnalytics = async () => {
    console.log('📊 Scraping account analytics...');

    // Try to extract analytics from the analytics page
    const metrics = {};

    // Generic metric extraction
    document.querySelectorAll('[role="listitem"], [data-testid*="stat"], [data-testid*="metric"]').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) {
        const parts = text.split('\n').filter(Boolean);
        if (parts.length >= 2) {
          metrics[parts[0].trim()] = parts[1].trim();
        }
      }
    });

    // Try specific selectors
    const specificMetrics = {
      impressions: document.querySelector('[data-testid="impressions"]')?.textContent,
      engagements: document.querySelector('[data-testid="engagements"]')?.textContent,
      followers: document.querySelector('a[href$="/followers"] span')?.textContent,
      following: document.querySelector('a[href$="/following"] span')?.textContent,
    };

    Object.entries(specificMetrics).forEach(([k, v]) => {
      if (v) metrics[k] = v.trim();
    });

    return metrics;
  };

  const scrapePostAnalytics = async () => {
    console.log('📈 Scraping post analytics...');

    const tweet = document.querySelector('article[data-testid="tweet"]');
    if (!tweet) return { error: 'No tweet found on this page' };

    return {
      text: tweet.querySelector('[data-testid="tweetText"]')?.textContent || '',
      likes: tweet.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent || '0',
      reposts: tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0',
      replies: tweet.querySelector('[data-testid="reply"] span')?.textContent || '0',
      views: tweet.querySelector('[data-testid="analyticsButton"] span')?.textContent || '0',
      bookmarks: tweet.querySelector('[data-testid="bookmark"] span')?.textContent || '0',
      time: tweet.querySelector('time')?.getAttribute('datetime') || '',
    };
  };

  const scrapeRecentPosts = async () => {
    console.log('📝 Scraping recent posts analytics...');

    const posts = [];
    let scrollAttempts = 0;

    while (posts.length < CONFIG.maxPosts && scrollAttempts < CONFIG.maxPosts) {
      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        if (!link || posts.find(p => p.link === link)) return;

        posts.push({
          text: (tweet.querySelector('[data-testid="tweetText"]')?.textContent || '').substring(0, 200),
          likes: tweet.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent || '0',
          reposts: tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0',
          replies: tweet.querySelector('[data-testid="reply"] span')?.textContent || '0',
          views: tweet.querySelector('[data-testid="analyticsButton"] span')?.textContent || '',
          time: tweet.querySelector('time')?.getAttribute('datetime') || '',
          link,
        });
      });

      window.scrollBy(0, 800);
      await sleep(1500);
      scrollAttempts++;
    }

    return posts.slice(0, CONFIG.maxPosts);
  };

  const run = async () => {
    console.log('📊 XActions Analytics Scraper');
    console.log('============================');

    let result = {};

    if (CONFIG.mode === 'post') {
      result.postAnalytics = await scrapePostAnalytics();
    } else {
      result.accountMetrics = await scrapeAccountAnalytics();
    }

    if (CONFIG.scrapeRecentPosts) {
      result.recentPosts = await scrapeRecentPosts();

      // Calculate engagement summary
      const totalLikes = result.recentPosts.reduce((sum, p) => sum + parseInt(p.likes.replace(/[,K]/g, '')) || 0, 0);
      const totalReposts = result.recentPosts.reduce((sum, p) => sum + parseInt(p.reposts.replace(/[,K]/g, '')) || 0, 0);

      result.summary = {
        totalPosts: result.recentPosts.length,
        totalLikes,
        totalReposts,
        avgLikes: Math.round(totalLikes / result.recentPosts.length),
        avgReposts: Math.round(totalReposts / result.recentPosts.length),
        topPost: result.recentPosts.sort((a, b) => 
          (parseInt(b.likes.replace(/[,K]/g, '')) || 0) - (parseInt(a.likes.replace(/[,K]/g, '')) || 0)
        )[0],
      };

      console.log(`\n📈 Summary (${result.recentPosts.length} posts):`);
      console.log(`  ❤️ Total likes: ${totalLikes}`);
      console.log(`  🔁 Total reposts: ${totalReposts}`);
      console.log(`  📊 Avg likes/post: ${result.summary.avgLikes}`);
    }

    result.scrapedAt = new Date().toISOString();

    console.log('\n📦 Full JSON:');
    console.log(JSON.stringify(result, null, 2));

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('\n✅ Copied to clipboard!');
    } catch (e) {}
  };

  run();
})();
