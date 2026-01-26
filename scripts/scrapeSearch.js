/**
 * Search Scraper
 * Search and export tweets by keyword
 * 
 * HOW TO USE:
 * 1. Go to x.com/search?q=YOUR_SEARCH_TERM
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_TWEETS: 500,
    SCROLL_DELAY: 1500,
    FORMAT: 'both', // 'json', 'csv', 'both'
    MIN_LIKES: 0,   // Filter: minimum likes (0 = no filter)
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseNumber = (str) => {
    if (!str) return 0;
    const num = parseFloat(str.replace(/,/g, ''));
    if (str.includes('K')) return num * 1000;
    if (str.includes('M')) return num * 1000000;
    return num;
  };

  const extractTweet = (article) => {
    try {
      const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';
      const displayName = userName.split('@')[0]?.trim() || '';
      
      const timeLink = article.querySelector('time')?.closest('a');
      const tweetUrl = timeLink?.href || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0] || '';
      const time = article.querySelector('time')?.getAttribute('datetime') || '';

      const buttons = article.querySelectorAll('[role="group"] button');
      let replies = 0, retweets = 0, likes = 0, views = 0;
      
      buttons.forEach(btn => {
        const label = btn.getAttribute('aria-label') || '';
        const num = parseNumber(label.match(/[\d,.]+[KM]?/)?.[0] || '0');
        
        if (label.includes('repl')) replies = num;
        else if (label.includes('repost') || label.includes('Retweet')) retweets = num;
        else if (label.includes('like')) likes = num;
        else if (label.includes('view')) views = num;
      });

      return {
        tweetId,
        handle,
        displayName,
        text: tweetText,
        url: tweetUrl,
        time,
        likes,
        retweets,
        replies,
        views,
        engagement: likes + retweets + replies,
      };
    } catch (e) {
      return null;
    }
  };

  const getSearchQuery = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || 'unknown';
  };

  const run = async () => {
    if (!window.location.pathname.includes('/search')) {
      console.error('❌ Please go to Twitter search first!');
      console.log('   Example: x.com/search?q=your+search+term');
      return;
    }

    const query = getSearchQuery();
    console.log(`🔍 Scraping search results for: "${query}"...`);

    const tweets = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (tweets.size < CONFIG.MAX_TWEETS && noNewCount < 5) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const beforeCount = tweets.size;

      articles.forEach(article => {
        const tweet = extractTweet(article);
        if (tweet && tweet.tweetId && !tweets.has(tweet.tweetId)) {
          if (tweet.likes >= CONFIG.MIN_LIKES) {
            tweets.set(tweet.tweetId, tweet);
          }
        }
      });

      const added = tweets.size - beforeCount;
      if (added > 0) {
        console.log(`🔍 Collected ${tweets.size} tweets...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 100) break;
    }

    const tweetList = Array.from(tweets.values());
    tweetList.sort((a, b) => b.engagement - a.engagement);

    console.log('\n' + '='.repeat(60));
    console.log(`🔍 SCRAPED ${tweetList.length} TWEETS FOR "${query}"`);
    console.log('='.repeat(60) + '\n');

    // Stats
    const totalLikes = tweetList.reduce((sum, t) => sum + t.likes, 0);
    const totalRetweets = tweetList.reduce((sum, t) => sum + t.retweets, 0);
    console.log(`📊 Total engagement: ${totalLikes.toLocaleString()} likes, ${totalRetweets.toLocaleString()} retweets`);

    tweetList.slice(0, 5).forEach((t, i) => {
      console.log(`${i + 1}. @${t.handle} (${t.likes} ❤️): "${t.text.slice(0, 50)}..."`);
    });

    const safeQuery = query.replace(/[^a-z0-9]/gi, '_').slice(0, 30);

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      const data = { query, scrapedAt: new Date().toISOString(), tweets: tweetList };
      download(JSON.stringify(data, null, 2), `search_${safeQuery}_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded search_results.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,Text,Likes,Retweets,Replies,Views,URL,Time',
        ...tweetList.map(t => 
          `"@${t.handle}","${t.text.replace(/"/g, '""').replace(/\n/g, ' ')}",${t.likes},${t.retweets},${t.replies},${t.views},"${t.url}","${t.time}"`
        )
      ].join('\n');
      download(csv, `search_${safeQuery}_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded search_results.csv');
    }

    window.scrapedSearch = { query, tweets: tweetList };
    console.log('\n✅ Done! Access data: window.scrapedSearch');
  };

  run();
})();
