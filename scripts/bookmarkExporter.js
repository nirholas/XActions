/**
 * Bookmark Exporter
 * Export all your X/Twitter bookmarks to JSON/CSV
 * 
 * HOW TO USE:
 * 1. Go to x.com/i/bookmarks
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_BOOKMARKS: 1000,    // Max bookmarks to export
    SCROLL_DELAY: 1500,     // Delay between scrolls (ms)
    FORMAT: 'both',         // 'json', 'csv', 'both'
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Parse engagement numbers
  const parseNumber = (str) => {
    if (!str) return 0;
    const num = parseFloat(str.replace(/,/g, ''));
    if (str.includes('K')) return num * 1000;
    if (str.includes('M')) return num * 1000000;
    return num;
  };

  // Extract bookmark data
  const extractBookmark = (article) => {
    try {
      const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';
      const displayName = userName.split('@')[0]?.trim() || '';
      
      // Get tweet link
      const timeLink = article.querySelector('time')?.closest('a');
      const tweetUrl = timeLink?.href || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0] || '';
      
      // Get time
      const time = article.querySelector('time')?.getAttribute('datetime') || '';
      
      // Get engagement
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

      // Get images
      const images = Array.from(article.querySelectorAll('img[src*="media"]'))
        .map(img => img.src)
        .filter(src => !src.includes('profile'));

      // Get links
      const links = Array.from(article.querySelectorAll('a[href^="http"]'))
        .map(a => a.href)
        .filter(href => !href.includes('x.com') && !href.includes('twitter.com'));

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
        images,
        links,
      };
    } catch (e) {
      return null;
    }
  };

  // Main function
  const run = async () => {
    // Check if on bookmarks page
    if (!window.location.pathname.includes('/bookmarks')) {
      console.error('❌ Please go to x.com/i/bookmarks first!');
      return;
    }

    console.log('📚 Exporting Bookmarks...');
    console.log(`📊 Will export up to ${CONFIG.MAX_BOOKMARKS} bookmarks\n`);

    const bookmarks = new Map();
    let scrolls = 0;
    let lastHeight = 0;
    let noNewCount = 0;

    while (bookmarks.size < CONFIG.MAX_BOOKMARKS && noNewCount < 5) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const beforeCount = bookmarks.size;

      articles.forEach(article => {
        const bookmark = extractBookmark(article);
        if (bookmark && bookmark.tweetId && !bookmarks.has(bookmark.tweetId)) {
          bookmarks.set(bookmark.tweetId, bookmark);
        }
      });

      const added = bookmarks.size - beforeCount;
      if (added > 0) {
        console.log(`📖 Collected ${bookmarks.size} bookmarks...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      // Scroll
      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);

      scrolls++;
      if (scrolls > 100) break;
    }

    const bookmarkList = Array.from(bookmarks.values());

    // Results
    console.log('\n' + '='.repeat(60));
    console.log(`📚 EXPORTED ${bookmarkList.length} BOOKMARKS`);
    console.log('='.repeat(60) + '\n');

    // Show preview
    bookmarkList.slice(0, 5).forEach((b, i) => {
      console.log(`${i + 1}. @${b.handle}: "${b.text.slice(0, 60)}..."`);
    });
    if (bookmarkList.length > 5) {
      console.log(`   ... and ${bookmarkList.length - 5} more\n`);
    }

    // Generate JSON
    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      const json = JSON.stringify(bookmarkList, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks_${Date.now()}.json`;
      a.click();
      console.log('💾 Downloaded bookmarks.json');
    }

    // Generate CSV
    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Text,URL,Time,Likes,Retweets,Replies,Views',
        ...bookmarkList.map(b => 
          `"@${b.handle}","${b.displayName.replace(/"/g, '""')}","${b.text.replace(/"/g, '""').replace(/\n/g, ' ')}","${b.url}","${b.time}",${b.likes},${b.retweets},${b.replies},${b.views}`
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks_${Date.now()}.csv`;
      a.click();
      console.log('💾 Downloaded bookmarks.csv');
    }

    // Copy summary to clipboard
    try {
      const summary = bookmarkList.map(b => `@${b.handle}: ${b.text.slice(0, 100)}... - ${b.url}`).join('\n');
      await navigator.clipboard.writeText(summary);
      console.log('📋 Summary copied to clipboard!');
    } catch (e) {}

    // Store globally
    window.exportedBookmarks = bookmarkList;

    console.log('\n✅ Done! Access data: window.exportedBookmarks');
    console.log(`📊 Total: ${bookmarkList.length} bookmarks exported`);
  };

  run();
})();
