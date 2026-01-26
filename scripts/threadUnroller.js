/**
 * Thread Unroller
 * Save any Twitter/X thread as clean text or markdown
 * 
 * HOW TO USE:
 * 1. Go to ANY tweet in a thread: x.com/user/status/123456
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    FORMAT: 'markdown',     // 'text', 'markdown', 'json'
    INCLUDE_MEDIA: true,    // Include image/video URLs
    INCLUDE_STATS: true,    // Include engagement stats
    MAX_TWEETS: 50,         // Max tweets in thread
    SCROLL_DELAY: 1000,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Get thread author from URL
  const getAuthor = () => {
    const match = window.location.pathname.match(/\/(\w+)\/status/);
    return match ? match[1] : null;
  };

  // Extract tweet content
  const extractTweet = (article) => {
    try {
      const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const time = article.querySelector('time')?.getAttribute('datetime') || '';
      const timeLink = article.querySelector('time')?.closest('a');
      const url = timeLink?.href || '';
      
      // Get media
      const images = Array.from(article.querySelectorAll('img[src*="media"]'))
        .map(img => img.src)
        .filter(src => !src.includes('profile'));
      
      const videos = Array.from(article.querySelectorAll('video'))
        .map(v => v.src || v.poster);

      // Get handle
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';

      return { text, time, url, images, videos, handle };
    } catch (e) {
      return null;
    }
  };

  // Main function
  const run = async () => {
    const author = getAuthor();
    if (!author) {
      console.error('❌ Please navigate to a tweet first!');
      return;
    }

    console.log(`🧵 Unrolling thread by @${author}...`);

    const tweets = [];
    let lastCount = 0;
    let attempts = 0;

    // Scroll to load full thread
    while (attempts < 10) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      
      articles.forEach(article => {
        const tweet = extractTweet(article);
        // Only get tweets from the thread author
        if (tweet && tweet.handle.toLowerCase() === author.toLowerCase()) {
          const exists = tweets.find(t => t.url === tweet.url);
          if (!exists && tweet.text) {
            tweets.push(tweet);
            console.log(`📝 Tweet ${tweets.length}: "${tweet.text.slice(0, 50)}..."`);
          }
        }
      });

      if (tweets.length === lastCount) {
        attempts++;
      } else {
        attempts = 0;
      }
      lastCount = tweets.length;

      if (tweets.length >= CONFIG.MAX_TWEETS) break;

      window.scrollBy(0, 500);
      await sleep(CONFIG.SCROLL_DELAY);
    }

    // Sort by time (oldest first for reading order)
    tweets.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Format output
    let output = '';
    
    if (CONFIG.FORMAT === 'markdown') {
      output = `# Thread by @${author}\n\n`;
      output += `> ${tweets.length} tweets | ${new Date(tweets[0]?.time).toLocaleDateString()}\n\n`;
      output += `---\n\n`;
      
      tweets.forEach((t, i) => {
        output += `**${i + 1}/${tweets.length}**\n\n`;
        output += `${t.text}\n\n`;
        
        if (CONFIG.INCLUDE_MEDIA) {
          t.images.forEach(img => {
            output += `![Image](${img})\n\n`;
          });
        }
        
        output += `---\n\n`;
      });
      
      output += `\n[Original Thread](${tweets[0]?.url})\n`;
      
    } else if (CONFIG.FORMAT === 'json') {
      output = JSON.stringify({ author, tweets }, null, 2);
      
    } else {
      // Plain text
      output = `Thread by @${author}\n`;
      output += `${'='.repeat(40)}\n\n`;
      
      tweets.forEach((t, i) => {
        output += `[${i + 1}/${tweets.length}]\n`;
        output += `${t.text}\n\n`;
      });
    }

    // Display
    console.log('\n' + '='.repeat(60));
    console.log(`🧵 THREAD UNROLLED: ${tweets.length} tweets`);
    console.log('='.repeat(60) + '\n');
    console.log(output);

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(output);
      console.log('📋 Thread copied to clipboard!');
    } catch (e) {
      console.log('📋 Copy manually from window.unrolledThread');
    }

    // Store globally
    window.unrolledThread = { author, tweets, formatted: output };

    // Download
    const ext = CONFIG.FORMAT === 'json' ? 'json' : CONFIG.FORMAT === 'markdown' ? 'md' : 'txt';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thread_${author}_${Date.now()}.${ext}`;
    a.click();

    console.log(`💾 Downloaded as ${ext.toUpperCase()}!`);
    console.log('\n✅ Done! Access data: window.unrolledThread');
  };

  run();
})();
