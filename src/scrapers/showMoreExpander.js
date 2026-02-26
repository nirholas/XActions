/**
 * Show More Expander & Text Scraper
 * Clicks all "Show more" buttons on tweets to reveal full text, then extracts it
 *
 * HOW TO USE:
 * 1. Go to any X/Twitter page with tweets (timeline, profile, thread, search results)
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 4. The script will scroll down, click every "Show more" button, and collect full text
 *
 * OUTPUT: Full text is logged, copied to clipboard, and stored in window.expandedTweets
 *
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    FORMAT: 'markdown',       // 'text', 'markdown', 'json'
    MAX_TWEETS: 200,          // Max tweets to process
    SCROLL_DELAY: 1500,       // Delay between scrolls (ms)
    CLICK_DELAY: 800,         // Delay after clicking "Show more" (ms)
    INCLUDE_HANDLE: true,     // Include @handle in output
    INCLUDE_STATS: true,      // Include engagement stats
    INCLUDE_TIMESTAMP: true,  // Include tweet timestamp
    ONLY_EXPANDED: false,     // true = only collect tweets that had "Show more"
    AUTO_DOWNLOAD: true,      // Auto-download results as file
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

  // Click a single "Show more" button and wait for text to expand
  const expandShowMore = async (button) => {
    try {
      button.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await sleep(300);
      button.click();
      await sleep(CONFIG.CLICK_DELAY);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Extract full tweet data from an article element
  const extractTweet = (article) => {
    try {
      // Get all text content from the tweet (may span multiple tweetText elements in quote tweets)
      const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
      const text = tweetTextEl?.innerText || '';

      if (!text.trim()) return null;

      // User info
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';
      const displayName = userName.split('@')[0]?.trim() || '';

      // Tweet URL from timestamp link
      const timeLink = article.querySelector('time')?.closest('a');
      const url = timeLink?.href || '';
      const tweetId = url.split('/status/')[1]?.split('?')[0] || '';

      // Timestamp
      const time = article.querySelector('time')?.getAttribute('datetime') || '';
      const timeDisplay = article.querySelector('time')?.textContent || '';

      // Engagement metrics
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
        text,
        url,
        time,
        timeDisplay,
        replies,
        retweets,
        likes,
        views,
        wasExpanded: false, // will be set by caller
      };
    } catch (e) {
      return null;
    }
  };

  // Main
  const run = async () => {
    console.log('🔍 Show More Expander — scanning page for truncated tweets...');
    console.log(`⚙️  Config: max ${CONFIG.MAX_TWEETS} tweets, format: ${CONFIG.FORMAT}`);
    console.log('');

    const collected = new Map(); // tweetId/url -> tweet data
    let expandedCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 15;

    while (scrollAttempts < maxScrollAttempts && collected.size < CONFIG.MAX_TWEETS) {
      // Find all "Show more" buttons that haven't been clicked yet
      const showMoreButtons = document.querySelectorAll(
        'button[data-testid="tweet-text-show-more-link"]'
      );

      if (showMoreButtons.length > 0) {
        console.log(`📖 Found ${showMoreButtons.length} "Show more" button(s) — expanding...`);

        for (const btn of showMoreButtons) {
          const article = btn.closest('article[data-testid="tweet"]');
          if (!article) continue;

          const success = await expandShowMore(btn);
          if (success) {
            expandedCount++;
            console.log(`  ✅ Expanded tweet #${expandedCount}`);
          }
        }

        // After expanding, wait for DOM to update
        await sleep(500);
      }

      // Now collect all tweets on the page (expanded or not)
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (collected.size >= CONFIG.MAX_TWEETS) break;

        const tweet = extractTweet(article);
        if (!tweet) continue;

        // Use URL or tweetId as key to deduplicate
        const key = tweet.url || tweet.tweetId || tweet.text.slice(0, 100);
        if (collected.has(key)) continue;

        // Check if this tweet had a "Show more" button (now expanded)
        // After clicking, the button disappears, so we check if the text is long
        // or if we just expanded it in this round
        const hadShowMore = tweet.text.length > 280;
        tweet.wasExpanded = hadShowMore;

        if (CONFIG.ONLY_EXPANDED && !hadShowMore) continue;

        collected.set(key, tweet);
      }

      // Scroll to load more tweets
      const prevSize = collected.size;
      window.scrollBy(0, 600);
      await sleep(CONFIG.SCROLL_DELAY);

      // Check if we got new content
      const newArticles = document.querySelectorAll('article[data-testid="tweet"]');
      const newShowMore = document.querySelectorAll('button[data-testid="tweet-text-show-more-link"]');

      if (newArticles.length === 0 && newShowMore.length === 0) {
        scrollAttempts++;
      } else if (collected.size === prevSize && newShowMore.length === 0) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0;
      }

      console.log(`📊 Collected: ${collected.size} tweets | Expanded: ${expandedCount} | Scroll: ${scrollAttempts}/${maxScrollAttempts}`);
    }

    // Convert map to sorted array
    const tweets = Array.from(collected.values()).sort(
      (a, b) => new Date(a.time || 0) - new Date(b.time || 0)
    );

    if (tweets.length === 0) {
      console.log('❌ No tweets found. Make sure you are on an X/Twitter page with tweets.');
      return;
    }

    // Format output
    let output = '';

    if (CONFIG.FORMAT === 'markdown') {
      output = `# Expanded Tweets\n\n`;
      output += `> ${tweets.length} tweets collected (${expandedCount} expanded) | ${new Date().toLocaleString()}\n\n`;
      output += `---\n\n`;

      tweets.forEach((t, i) => {
        if (CONFIG.INCLUDE_HANDLE) {
          output += `### ${t.displayName} (@${t.handle})`;
          if (t.wasExpanded) output += ' 📖';
          output += '\n\n';
        }

        output += `${t.text}\n\n`;

        if (CONFIG.INCLUDE_STATS && (t.likes || t.retweets || t.views)) {
          output += `> 💬 ${t.replies} · 🔁 ${t.retweets} · ❤️ ${t.likes} · 👁️ ${t.views}\n\n`;
        }

        if (CONFIG.INCLUDE_TIMESTAMP && t.timeDisplay) {
          output += `> ${t.timeDisplay}`;
          if (t.url) output += ` | [Link](${t.url})`;
          output += '\n\n';
        }

        output += `---\n\n`;
      });

    } else if (CONFIG.FORMAT === 'json') {
      output = JSON.stringify({ 
        meta: { 
          total: tweets.length, 
          expanded: expandedCount, 
          scraped: new Date().toISOString(),
          page: window.location.href,
        },
        tweets 
      }, null, 2);

    } else {
      // Plain text
      output = `Expanded Tweets (${tweets.length} total, ${expandedCount} expanded)\n`;
      output += `${'='.repeat(60)}\n\n`;

      tweets.forEach((t, i) => {
        if (CONFIG.INCLUDE_HANDLE) {
          output += `@${t.handle}${t.wasExpanded ? ' [expanded]' : ''}:\n`;
        }
        output += `${t.text}\n`;
        if (CONFIG.INCLUDE_STATS) {
          output += `  💬 ${t.replies} | 🔁 ${t.retweets} | ❤️ ${t.likes} | 👁️ ${t.views}\n`;
        }
        if (t.url) output += `  ${t.url}\n`;
        output += '\n';
      });
    }

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log(`📖 SHOW MORE EXPANDER — COMPLETE`);
    console.log(`   ${tweets.length} tweets collected, ${expandedCount} "Show more" expanded`);
    console.log('='.repeat(60) + '\n');
    console.log(output);

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(output);
      console.log('📋 Results copied to clipboard!');
    } catch (e) {
      console.log('📋 Copy manually: window.expandedTweets.formatted');
    }

    // Store globally
    window.expandedTweets = { tweets, formatted: output, meta: { expandedCount, total: tweets.length } };

    // Auto-download
    if (CONFIG.AUTO_DOWNLOAD) {
      const ext = CONFIG.FORMAT === 'json' ? 'json' : CONFIG.FORMAT === 'markdown' ? 'md' : 'txt';
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expanded_tweets_${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      console.log(`💾 Downloaded as .${ext}!`);
    }

    console.log('\n✅ Done! Access data: window.expandedTweets');
    console.log('   window.expandedTweets.tweets — array of tweet objects');
    console.log('   window.expandedTweets.formatted — formatted text output');
  };

  run();
})();
