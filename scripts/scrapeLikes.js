/**
 * Likes Scraper
 * Export your liked tweets
 * 
 * HOW TO USE:
 * 1. Go to x.com/USERNAME/likes (your own likes page)
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_LIKES: 1000,
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

      const images = Array.from(article.querySelectorAll('img[src*="media"]'))
        .map(img => img.src)
        .filter(src => !src.includes('profile'));

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
        hasMedia: images.length > 0,
      };
    } catch (e) {
      return null;
    }
  };

  const run = async () => {
    if (!window.location.pathname.includes('/likes')) {
      console.error('❌ Please go to x.com/USERNAME/likes first!');
      return;
    }

    const username = window.location.pathname.split('/')[1];
    console.log(`❤️ Scraping liked tweets of @${username}...`);

    const likedTweets = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (likedTweets.size < CONFIG.MAX_LIKES && noNewCount < 5) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const beforeCount = likedTweets.size;

      articles.forEach(article => {
        const tweet = extractTweet(article);
        if (tweet && tweet.tweetId && !likedTweets.has(tweet.tweetId)) {
          likedTweets.set(tweet.tweetId, tweet);
        }
      });

      const added = likedTweets.size - beforeCount;
      if (added > 0) {
        console.log(`❤️ Collected ${likedTweets.size} liked tweets...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 150) break;
    }

    const likesList = Array.from(likedTweets.values());

    console.log('\n' + '='.repeat(60));
    console.log(`❤️ SCRAPED ${likesList.length} LIKED TWEETS`);
    console.log('='.repeat(60) + '\n');

    // Top liked accounts
    const accountCounts = {};
    likesList.forEach(t => {
      accountCounts[t.handle] = (accountCounts[t.handle] || 0) + 1;
    });
    const topAccounts = Object.entries(accountCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log('📊 Most liked accounts:');
    topAccounts.forEach(([handle, count]) => {
      console.log(`   @${handle}: ${count} likes`);
    });

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      download(JSON.stringify(likesList, null, 2), `${username}_likes_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded likes.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Text,URL,Time,Likes,Retweets,HasMedia',
        ...likesList.map(t => 
          `"@${t.handle}","${t.displayName.replace(/"/g, '""')}","${t.text.replace(/"/g, '""').replace(/\n/g, ' ')}","${t.url}","${t.time}",${t.likes},${t.retweets},${t.hasMedia}`
        )
      ].join('\n');
      download(csv, `${username}_likes_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded likes.csv');
    }

    window.scrapedLikes = likesList;
    console.log('\n✅ Done! Access data: window.scrapedLikes');
  };

  run();
})();
