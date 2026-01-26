/**
 * Quote Retweets Scraper
 * Get all quote retweets of a specific tweet
 * 
 * HOW TO USE:
 * 1. Go to a tweet and click on the quote retweets count
 *    OR go to x.com/USERNAME/status/TWEETID/quotes
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_QUOTES: 500,
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

  const extractQuote = (article) => {
    try {
      const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';
      const displayName = userName.split('@')[0]?.trim() || '';
      const verified = !!article.querySelector('[data-testid="User-Name"] svg[aria-label*="Verified"]');
      
      const timeLink = article.querySelector('time')?.closest('a');
      const quoteUrl = timeLink?.href || '';
      const quoteId = quoteUrl.split('/status/')[1]?.split('?')[0] || '';
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
        quoteId,
        handle,
        displayName,
        verified,
        text: tweetText,
        url: quoteUrl,
        time,
        likes,
        retweets,
        replies,
        views,
      };
    } catch (e) {
      return null;
    }
  };

  const getTweetId = () => {
    const match = window.location.pathname.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const run = async () => {
    const tweetId = getTweetId();

    if (!tweetId) {
      console.error('❌ Please go to the quotes page of a tweet!');
      console.log('   Example: x.com/user/status/123456/quotes');
      return;
    }

    console.log(`🔁 Scraping quote retweets of tweet ${tweetId}...`);

    const quotes = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (quotes.size < CONFIG.MAX_QUOTES && noNewCount < 5) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const beforeCount = quotes.size;

      articles.forEach(article => {
        const quote = extractQuote(article);
        if (quote && quote.quoteId && quote.quoteId !== tweetId && !quotes.has(quote.quoteId)) {
          quotes.set(quote.quoteId, quote);
        }
      });

      const added = quotes.size - beforeCount;
      if (added > 0) {
        console.log(`🔁 Collected ${quotes.size} quote retweets...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 100) break;
    }

    const quoteList = Array.from(quotes.values());
    quoteList.sort((a, b) => b.likes - a.likes);

    console.log('\n' + '='.repeat(60));
    console.log(`🔁 SCRAPED ${quoteList.length} QUOTE RETWEETS`);
    console.log('='.repeat(60) + '\n');

    // Stats
    const verified = quoteList.filter(q => q.verified).length;
    const totalLikes = quoteList.reduce((sum, q) => sum + q.likes, 0);
    console.log(`📊 Stats: ${verified} verified accounts, ${totalLikes.toLocaleString()} total likes`);

    quoteList.slice(0, 5).forEach((q, i) => {
      console.log(`${i + 1}. @${q.handle}${q.verified ? ' ✓' : ''} (${q.likes} ❤️): "${q.text.slice(0, 50)}..."`);
    });

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      const data = { originalTweetId: tweetId, quoteCount: quoteList.length, quotes: quoteList };
      download(JSON.stringify(data, null, 2), `tweet_${tweetId}_quotes_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded quotes.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Verified,Text,Likes,Retweets,Views,URL,Time',
        ...quoteList.map(q => 
          `"@${q.handle}","${q.displayName.replace(/"/g, '""')}",${q.verified},"${q.text.replace(/"/g, '""').replace(/\n/g, ' ')}",${q.likes},${q.retweets},${q.views},"${q.url}","${q.time}"`
        )
      ].join('\n');
      download(csv, `tweet_${tweetId}_quotes_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded quotes.csv');
    }

    window.scrapedQuotes = { tweetId, quotes: quoteList };
    console.log('\n✅ Done! Access data: window.scrapedQuotes');
  };

  run();
})();
