/**
 * Hashtag Scraper
 * Get tweets by hashtag
 * 
 * HOW TO USE:
 * 1. Go to x.com/search?q=%23HASHTAG or x.com/hashtag/HASHTAG
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

      // Extract hashtags from text
      const hashtags = tweetText.match(/#\w+/g) || [];

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
        hashtags,
      };
    } catch (e) {
      return null;
    }
  };

  const getHashtag = () => {
    const urlMatch = window.location.href.match(/hashtag\/(\w+)/);
    if (urlMatch) return urlMatch[1];
    
    const searchMatch = window.location.href.match(/q=%23(\w+)/);
    if (searchMatch) return searchMatch[1];
    
    return 'unknown';
  };

  const run = async () => {
    const hashtag = getHashtag();
    console.log(`#️⃣ Scraping tweets for #${hashtag}...`);

    const tweets = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (tweets.size < CONFIG.MAX_TWEETS && noNewCount < 5) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const beforeCount = tweets.size;

      articles.forEach(article => {
        const tweet = extractTweet(article);
        if (tweet && tweet.tweetId && !tweets.has(tweet.tweetId)) {
          tweets.set(tweet.tweetId, tweet);
        }
      });

      const added = tweets.size - beforeCount;
      if (added > 0) {
        console.log(`#️⃣ Collected ${tweets.size} tweets...`);
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
    tweetList.sort((a, b) => b.likes - a.likes);

    console.log('\n' + '='.repeat(60));
    console.log(`#️⃣ SCRAPED ${tweetList.length} TWEETS FOR #${hashtag}`);
    console.log('='.repeat(60) + '\n');

    tweetList.slice(0, 5).forEach((t, i) => {
      console.log(`${i + 1}. @${t.handle} (${t.likes} ❤️): "${t.text.slice(0, 60)}..."`);
    });

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      download(JSON.stringify({ hashtag, tweets: tweetList }, null, 2), `hashtag_${hashtag}_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded hashtag tweets.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,Text,Likes,Retweets,Replies,Views,URL,Time',
        ...tweetList.map(t => 
          `"@${t.handle}","${t.text.replace(/"/g, '""').replace(/\n/g, ' ')}",${t.likes},${t.retweets},${t.replies},${t.views},"${t.url}","${t.time}"`
        )
      ].join('\n');
      download(csv, `hashtag_${hashtag}_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded hashtag tweets.csv');
    }

    window.scrapedHashtag = { hashtag, tweets: tweetList };
    console.log('\n✅ Done! Access data: window.scrapedHashtag');
  };

  run();
})();
