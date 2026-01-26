/**
 * Replies Scraper
 * Get all replies to a specific tweet
 * 
 * HOW TO USE:
 * 1. Go to any tweet: x.com/USERNAME/status/TWEETID
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_REPLIES: 500,
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

  const extractReply = (article) => {
    try {
      const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';
      const displayName = userName.split('@')[0]?.trim() || '';
      const verified = !!article.querySelector('[data-testid="User-Name"] svg[aria-label*="Verified"]');
      
      const timeLink = article.querySelector('time')?.closest('a');
      const replyUrl = timeLink?.href || '';
      const replyId = replyUrl.split('/status/')[1]?.split('?')[0] || '';
      const time = article.querySelector('time')?.getAttribute('datetime') || '';

      const buttons = article.querySelectorAll('[role="group"] button');
      let replies = 0, retweets = 0, likes = 0;
      
      buttons.forEach(btn => {
        const label = btn.getAttribute('aria-label') || '';
        const num = parseNumber(label.match(/[\d,.]+[KM]?/)?.[0] || '0');
        
        if (label.includes('repl')) replies = num;
        else if (label.includes('repost') || label.includes('Retweet')) retweets = num;
        else if (label.includes('like')) likes = num;
      });

      return {
        replyId,
        handle,
        displayName,
        verified,
        text: tweetText,
        url: replyUrl,
        time,
        likes,
        retweets,
        replies,
      };
    } catch (e) {
      return null;
    }
  };

  const getTweetId = () => {
    const match = window.location.pathname.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const getOriginalAuthor = () => {
    const match = window.location.pathname.match(/\/(\w+)\/status/);
    return match ? match[1] : null;
  };

  const run = async () => {
    const tweetId = getTweetId();
    const originalAuthor = getOriginalAuthor();

    if (!tweetId) {
      console.error('❌ Please go to a tweet first!');
      console.log('   Example: x.com/user/status/123456');
      return;
    }

    console.log(`💬 Scraping replies to @${originalAuthor}'s tweet...`);

    const replies = new Map();
    let scrolls = 0;
    let noNewCount = 0;
    let isFirstTweet = true;

    while (replies.size < CONFIG.MAX_REPLIES && noNewCount < 5) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const beforeCount = replies.size;

      articles.forEach(article => {
        const reply = extractReply(article);
        
        // Skip the original tweet (first one)
        if (reply && reply.replyId) {
          if (reply.replyId === tweetId) {
            isFirstTweet = false;
            return; // Skip original tweet
          }
          
          if (!replies.has(reply.replyId)) {
            replies.set(reply.replyId, reply);
          }
        }
      });

      const added = replies.size - beforeCount;
      if (added > 0) {
        console.log(`💬 Collected ${replies.size} replies...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 100) break;
    }

    const replyList = Array.from(replies.values());
    replyList.sort((a, b) => b.likes - a.likes);

    console.log('\n' + '='.repeat(60));
    console.log(`💬 SCRAPED ${replyList.length} REPLIES`);
    console.log('='.repeat(60) + '\n');

    // Stats
    const verifiedReplies = replyList.filter(r => r.verified).length;
    const uniqueUsers = new Set(replyList.map(r => r.handle)).size;
    console.log(`📊 Stats: ${uniqueUsers} unique users, ${verifiedReplies} verified accounts`);

    replyList.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. @${r.handle}${r.verified ? ' ✓' : ''} (${r.likes} ❤️): "${r.text.slice(0, 50)}..."`);
    });

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      const data = { 
        originalTweetId: tweetId, 
        originalAuthor,
        replyCount: replyList.length,
        replies: replyList 
      };
      download(JSON.stringify(data, null, 2), `tweet_${tweetId}_replies_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded replies.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Verified,Text,Likes,Retweets,URL,Time',
        ...replyList.map(r => 
          `"@${r.handle}","${r.displayName.replace(/"/g, '""')}",${r.verified},"${r.text.replace(/"/g, '""').replace(/\n/g, ' ')}",${r.likes},${r.retweets},"${r.url}","${r.time}"`
        )
      ].join('\n');
      download(csv, `tweet_${tweetId}_replies_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded replies.csv');
    }

    window.scrapedReplies = { tweetId, originalAuthor, replies: replyList };
    console.log('\n✅ Done! Access data: window.scrapedReplies');
  };

  run();
})();
