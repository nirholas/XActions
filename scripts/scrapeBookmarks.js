/**
 * Bookmarks Scraper (Enhanced)
 * Scrape all bookmarks with full metadata
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
    MAX_BOOKMARKS: 2000,
    SCROLL_DELAY: 1500,
    FORMAT: 'both', // 'json', 'csv', 'both'
    INCLUDE_MEDIA_URLS: true,
    INCLUDE_LINKS: true,
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

  const extractBookmark = (article) => {
    try {
      const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';
      const displayName = userName.split('@')[0]?.trim() || '';
      const verified = !!article.querySelector('[data-testid="User-Name"] svg[aria-label*="Verified"]');
      
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

      // Media URLs
      let images = [];
      let videos = [];
      if (CONFIG.INCLUDE_MEDIA_URLS) {
        images = Array.from(article.querySelectorAll('img[src*="media"]'))
          .map(img => img.src.replace(/&name=\w+/, '&name=large'))
          .filter(src => !src.includes('profile'));
        videos = Array.from(article.querySelectorAll('video'))
          .map(v => v.poster || v.src);
      }

      // External links
      let links = [];
      if (CONFIG.INCLUDE_LINKS) {
        links = Array.from(article.querySelectorAll('a[href^="http"]'))
          .map(a => a.getAttribute('title') || a.href)
          .filter(href => !href.includes('x.com') && !href.includes('twitter.com') && !href.includes('t.co'));
      }

      // Hashtags
      const hashtags = tweetText.match(/#\w+/g) || [];

      // Mentions
      const mentions = tweetText.match(/@\w+/g) || [];

      return {
        tweetId,
        handle,
        displayName,
        verified,
        text: tweetText,
        url: tweetUrl,
        time,
        likes,
        retweets,
        replies,
        views,
        images,
        videos,
        links,
        hashtags,
        mentions,
        hasMedia: images.length > 0 || videos.length > 0,
      };
    } catch (e) {
      return null;
    }
  };

  const run = async () => {
    if (!window.location.pathname.includes('/bookmarks')) {
      console.error('❌ Please go to x.com/i/bookmarks first!');
      return;
    }

    console.log('📚 Scraping bookmarks with full metadata...');

    const bookmarks = new Map();
    let scrolls = 0;
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
        console.log(`📚 Collected ${bookmarks.size} bookmarks...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 200) break;
    }

    const bookmarkList = Array.from(bookmarks.values());

    console.log('\n' + '='.repeat(60));
    console.log(`📚 SCRAPED ${bookmarkList.length} BOOKMARKS`);
    console.log('='.repeat(60) + '\n');

    // Stats
    const withMedia = bookmarkList.filter(b => b.hasMedia).length;
    const withLinks = bookmarkList.filter(b => b.links.length > 0).length;
    const uniqueAuthors = new Set(bookmarkList.map(b => b.handle)).size;
    console.log(`📊 Stats:`);
    console.log(`   - ${uniqueAuthors} unique authors`);
    console.log(`   - ${withMedia} with media`);
    console.log(`   - ${withLinks} with external links`);

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      const data = {
        exportedAt: new Date().toISOString(),
        count: bookmarkList.length,
        bookmarks: bookmarkList,
      };
      download(JSON.stringify(data, null, 2), `bookmarks_full_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded bookmarks_full.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Verified,Text,Likes,Retweets,Views,HasMedia,URL,Time',
        ...bookmarkList.map(b => 
          `"@${b.handle}","${b.displayName.replace(/"/g, '""')}",${b.verified},"${b.text.replace(/"/g, '""').replace(/\n/g, ' ')}",${b.likes},${b.retweets},${b.views},${b.hasMedia},"${b.url}","${b.time}"`
        )
      ].join('\n');
      download(csv, `bookmarks_full_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded bookmarks_full.csv');
    }

    window.scrapedBookmarks = bookmarkList;
    console.log('\n✅ Done! Access data: window.scrapedBookmarks');
  };

  run();
})();
