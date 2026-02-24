// scripts/scrapeExplore.js
// Browser console script to scrape Explore page trends and content
// Paste in DevTools console on x.com/explore
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const CONFIG = {
    maxTrends: 30,
    scrapeTweets: true,
    maxTweets: 50,
    outputFormat: 'json', // 'json' or 'csv'
  };

  const run = async () => {
    console.log('🔍 XActions Explore Scraper');
    console.log('===========================');

    // Scrape trends
    const trends = [];
    document.querySelectorAll('[data-testid="trend"]').forEach((el, i) => {
      if (i >= CONFIG.maxTrends) return;
      const spans = el.querySelectorAll('[dir="ltr"] span');
      const texts = Array.from(spans).map(s => s.textContent.trim()).filter(Boolean);
      trends.push({
        rank: i + 1,
        name: texts[0] || '',
        category: texts.length > 1 ? texts[1] : '',
        postCount: texts.length > 2 ? texts[2] : '',
      });
    });

    console.log(`\n📊 Found ${trends.length} trends:`);
    trends.forEach(t => {
      console.log(`  ${t.rank}. ${t.name} ${t.postCount ? `(${t.postCount})` : ''}`);
    });

    // Scrape tweets from explore
    const tweets = [];
    if (CONFIG.scrapeTweets) {
      let scrollAttempts = 0;
      
      while (tweets.length < CONFIG.maxTweets && scrollAttempts < 20) {
        document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
          const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
          const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
          const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
          const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
          const likes = tweet.querySelector('[data-testid="like"] span')?.textContent || '0';

          if (link && !tweets.find(t => t.link === link)) {
            tweets.push({ text, author, time, link, likes });
          }
        });

        window.scrollBy(0, 1000);
        await sleep(1500);
        scrollAttempts++;
      }

      console.log(`\n📰 Scraped ${tweets.length} tweets`);
    }

    // Output results
    const result = {
      trends,
      tweets: tweets.slice(0, CONFIG.maxTweets),
      scrapedAt: new Date().toISOString(),
      url: window.location.href,
    };

    if (CONFIG.outputFormat === 'csv') {
      const csvTrends = 'rank,name,category,postCount\n' +
        trends.map(t => `${t.rank},"${t.name}","${t.category}","${t.postCount}"`).join('\n');
      console.log('\n📋 Trends CSV:');
      console.log(csvTrends);
    }

    console.log('\n📦 Full JSON result:');
    console.log(JSON.stringify(result, null, 2));

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('\n✅ Results copied to clipboard!');
    } catch (e) {
      console.log('\n⚠️ Could not copy to clipboard. Use console output above.');
    }
  };

  run();
})();
