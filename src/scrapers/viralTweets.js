/**
 * Viral Tweet Scraper
 * Find top performing tweets by keyword or from any account
 * 
 * HOW TO USE:
 * 1. Go to x.com/search?q=YOUR_KEYWORD or x.com/USERNAME
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  // Configuration
  const CONFIG = {
    MIN_LIKES: 100,           // Minimum likes to be considered "viral"
    MIN_RETWEETS: 10,         // Minimum retweets
    MAX_TWEETS: 100,          // How many tweets to scan
    SCROLL_DELAY: 1500,       // Delay between scrolls (ms)
    SORT_BY: 'likes',         // 'likes', 'retweets', 'replies', 'views'
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Parse engagement numbers (handles "1.2K", "5M", etc.)
  const parseNumber = (str) => {
    if (!str) return 0;
    const num = parseFloat(str.replace(/,/g, ''));
    if (str.includes('K')) return num * 1000;
    if (str.includes('M')) return num * 1000000;
    return num;
  };

  // Extract tweet data
  const extractTweet = (article) => {
    try {
      const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';
      const displayName = userName.split('@')[0]?.trim() || '';
      
      // Get tweet link
      const timeLink = article.querySelector('time')?.closest('a');
      const tweetUrl = timeLink?.href || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0] || '';
      
      // Get engagement metrics
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

      // Get time
      const time = article.querySelector('time')?.getAttribute('datetime') || '';

      return {
        tweetId,
        handle,
        displayName,
        text: tweetText.slice(0, 280),
        url: tweetUrl,
        likes,
        retweets,
        replies,
        views,
        time,
        engagement: likes + retweets + replies,
      };
    } catch (e) {
      return null;
    }
  };

  // Main function
  const run = async () => {
    console.log('🔥 Viral Tweet Scraper Starting...');
    console.log(`📊 Looking for tweets with ${CONFIG.MIN_LIKES}+ likes`);
    
    const tweets = new Map();
    let scrolls = 0;
    let lastHeight = 0;

    while (tweets.size < CONFIG.MAX_TWEETS && scrolls < 50) {
      // Get all tweet articles
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      
      articles.forEach(article => {
        const tweet = extractTweet(article);
        if (tweet && tweet.tweetId && !tweets.has(tweet.tweetId)) {
          // Filter by minimum engagement
          if (tweet.likes >= CONFIG.MIN_LIKES || tweet.retweets >= CONFIG.MIN_RETWEETS) {
            tweets.set(tweet.tweetId, tweet);
            console.log(`🔥 Found: ${tweet.likes} likes | @${tweet.handle}`);
          }
        }
      });

      // Scroll
      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      
      // Check if we've hit the bottom
      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) {
        scrolls++;
        if (scrolls > 3) break;
      } else {
        scrolls = 0;
      }
      lastHeight = newHeight;
    }

    // Sort tweets
    const sortedTweets = Array.from(tweets.values()).sort((a, b) => {
      switch (CONFIG.SORT_BY) {
        case 'retweets': return b.retweets - a.retweets;
        case 'replies': return b.replies - a.replies;
        case 'views': return b.views - a.views;
        case 'engagement': return b.engagement - a.engagement;
        default: return b.likes - a.likes;
      }
    });

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log(`🔥 FOUND ${sortedTweets.length} VIRAL TWEETS`);
    console.log('='.repeat(60) + '\n');

    sortedTweets.slice(0, 20).forEach((t, i) => {
      console.log(`${i + 1}. @${t.handle} (${t.likes.toLocaleString()} ❤️ | ${t.retweets.toLocaleString()} 🔁)`);
      console.log(`   "${t.text.slice(0, 100)}..."`);
      console.log(`   ${t.url}\n`);
    });

    // Copy to clipboard
    const csv = [
      'Handle,Likes,Retweets,Replies,Views,Text,URL',
      ...sortedTweets.map(t => 
        `"@${t.handle}",${t.likes},${t.retweets},${t.replies},${t.views},"${t.text.replace(/"/g, '""')}","${t.url}"`
      )
    ].join('\n');

    try {
      await navigator.clipboard.writeText(csv);
      console.log('📋 Results copied to clipboard as CSV!');
    } catch (e) {
      console.log('📋 Copy manually from window.viralTweets');
    }

    // Store globally for access
    window.viralTweets = sortedTweets;

    // Download option
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viral_tweets_${Date.now()}.csv`;
    a.click();
    
    console.log('💾 CSV downloaded!');
    console.log('\n✅ Done! Access data: window.viralTweets');
  };

  run();
})();
