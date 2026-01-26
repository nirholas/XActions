/**
 * ============================================================
 * 📜 Thread Unroller
 * ============================================================
 * 
 * @name        thread-unroller.js
 * @description Save any Twitter thread as clean text, markdown, or JSON
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to any tweet in a thread:
 *    https://x.com/user/status/TWEET_ID
 * 
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Thread will be extracted and downloaded
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Output format: 'markdown', 'text', 'json'
  format: 'markdown',
  
  // Include media URLs
  includeMedia: true,
  
  // Include engagement stats
  includeStats: true,
  
  // Maximum tweets to extract
  maxTweets: 50,
  
  // Scroll delay
  scrollDelay: 1500,
  
  // Auto-download
  autoDownload: true,
  
  // Copy to clipboard
  copyToClipboard: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function threadUnroller() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📜 THREAD UNROLLER                                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/status/')) {
    console.error('❌ ERROR: Must be on a tweet page!');
    console.log('📍 Go to any tweet in a thread');
    return;
  }
  
  // Get thread author from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)\/status/);
  const threadAuthor = pathMatch ? pathMatch[1].toLowerCase() : null;
  
  if (!threadAuthor) {
    console.error('❌ Could not determine thread author');
    return;
  }
  
  console.log(`👤 Thread author: @${threadAuthor}`);
  console.log(`📋 Format: ${CONFIG.format}`);
  console.log('');
  console.log('🚀 Unrolling thread...');
  console.log('');
  
  const tweets = [];
  const seenIds = new Set();
  let scrolls = 0;
  const maxScrolls = 30;
  
  /**
   * Extract tweet data
   */
  function extractTweet(tweetEl) {
    try {
      // Get tweet ID
      const link = tweetEl.querySelector('a[href*="/status/"]');
      if (!link) return null;
      
      const match = link.href.match(/\/status\/(\d+)/);
      if (!match) return null;
      
      const tweetId = match[1];
      if (seenIds.has(tweetId)) return null;
      
      // Check if from thread author
      const authorLink = tweetEl.querySelector('a[href^="/"][role="link"]');
      const tweetAuthor = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0].toLowerCase() : null;
      
      if (tweetAuthor !== threadAuthor) return null;
      
      seenIds.add(tweetId);
      
      // Get text
      const textEl = tweetEl.querySelector($tweetText);
      const text = textEl ? textEl.innerText : '';
      
      // Get timestamp
      const timeEl = tweetEl.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const displayTime = timeEl ? timeEl.innerText : '';
      
      // Get engagement
      const getMetric = (testId) => {
        const el = tweetEl.querySelector(`[data-testid="${testId}"]`);
        const span = el?.querySelector('span span');
        return span ? span.innerText : '0';
      };
      
      // Get images
      const images = [];
      tweetEl.querySelectorAll('[data-testid="tweetPhoto"] img').forEach(img => {
        if (img.src && img.src.includes('pbs.twimg.com')) {
          images.push(img.src);
        }
      });
      
      return {
        id: tweetId,
        url: `https://x.com/${threadAuthor}/status/${tweetId}`,
        text,
        timestamp,
        displayTime,
        metrics: {
          replies: getMetric('reply'),
          retweets: getMetric('retweet'),
          likes: getMetric('like')
        },
        images
      };
      
    } catch (e) {
      return null;
    }
  }
  
  // Scroll and extract
  while (tweets.length < CONFIG.maxTweets && scrolls < maxScrolls) {
    document.querySelectorAll($tweet).forEach(el => {
      const tweet = extractTweet(el);
      if (tweet) tweets.push(tweet);
    });
    
    console.log(`📊 Extracted ${tweets.length} tweets from thread...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  // Sort chronologically (oldest first)
  tweets.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  console.log('');
  console.log(`✅ Extracted ${tweets.length} tweets from @${threadAuthor}'s thread`);
  console.log('');
  
  // Format output
  let output;
  let filename;
  let mimeType;
  
  if (CONFIG.format === 'markdown') {
    let md = `# Thread by @${threadAuthor}\n\n`;
    md += `> Unrolled on ${new Date().toISOString()}\n`;
    md += `> ${tweets.length} tweets\n\n`;
    md += `---\n\n`;
    
    tweets.forEach((t, i) => {
      md += `## ${i + 1}/${tweets.length}\n\n`;
      md += `${t.text}\n\n`;
      
      if (CONFIG.includeMedia && t.images.length > 0) {
        t.images.forEach(img => {
          md += `![Image](${img})\n`;
        });
        md += '\n';
      }
      
      if (CONFIG.includeStats) {
        md += `*${t.displayTime} • ❤️ ${t.metrics.likes} • 🔄 ${t.metrics.retweets} • 💬 ${t.metrics.replies}*\n\n`;
      }
      
      md += `[View tweet](${t.url})\n\n`;
      md += `---\n\n`;
    });
    
    output = md;
    filename = `thread_${threadAuthor}_${Date.now()}.md`;
    mimeType = 'text/markdown';
    
  } else if (CONFIG.format === 'text') {
    let txt = `THREAD BY @${threadAuthor.toUpperCase()}\n`;
    txt += `${'='.repeat(50)}\n`;
    txt += `Unrolled: ${new Date().toISOString()}\n`;
    txt += `Total tweets: ${tweets.length}\n`;
    txt += `${'='.repeat(50)}\n\n`;
    
    tweets.forEach((t, i) => {
      txt += `[${i + 1}/${tweets.length}]\n`;
      txt += `${'-'.repeat(30)}\n`;
      txt += `${t.text}\n\n`;
      
      if (CONFIG.includeStats) {
        txt += `${t.displayTime}\n`;
        txt += `Likes: ${t.metrics.likes} | RTs: ${t.metrics.retweets} | Replies: ${t.metrics.replies}\n`;
      }
      
      txt += `${t.url}\n`;
      txt += `\n${'='.repeat(50)}\n\n`;
    });
    
    output = txt;
    filename = `thread_${threadAuthor}_${Date.now()}.txt`;
    mimeType = 'text/plain';
    
  } else {
    output = JSON.stringify({
      author: threadAuthor,
      unrolledAt: new Date().toISOString(),
      tweetCount: tweets.length,
      tweets
    }, null, 2);
    filename = `thread_${threadAuthor}_${Date.now()}.json`;
    mimeType = 'application/json';
  }
  
  // Download
  if (CONFIG.autoDownload) {
    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`💾 Downloaded: ${filename}`);
  }
  
  // Copy to clipboard
  if (CONFIG.copyToClipboard) {
    try {
      await navigator.clipboard.writeText(output);
      console.log('📋 Copied to clipboard!');
    } catch (e) {}
  }
  
  // Display preview
  console.log('');
  console.log('📖 Thread preview:');
  tweets.slice(0, 3).forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.text.substring(0, 80)}...`);
  });
  if (tweets.length > 3) {
    console.log(`   ... and ${tweets.length - 3} more tweets`);
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ THREAD UNROLLED!                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  window.unrolledThread = { author: threadAuthor, tweets };
  console.log('💡 Access via: window.unrolledThread');
  
  return { author: threadAuthor, tweets };
})();
