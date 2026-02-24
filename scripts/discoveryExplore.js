// scripts/discoveryExplore.js
// Browser console script for scraping trending topics and search results on X/Twitter
// Paste in DevTools console on x.com/explore
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'trends',           // 'trends' | 'search'
    searchQuery: '',            // Query for 'search' action
    maxResults: 20,
    exportResults: true,
    scrollDelay: 1500,
    maxScrollRetries: 5,
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const scrapeTrends = async () => {
    console.log('📈 Scraping trending topics...');

    // Navigate to trending tab if not already there
    if (!window.location.href.includes('/explore/tabs/trending')) {
      const trendingTab = document.querySelector('a[href="/explore/tabs/trending"]');
      if (trendingTab) { trendingTab.click(); await sleep(2000); }
    }

    const trends = [];
    let retries = 0;

    while (trends.length < CONFIG.maxResults && retries < CONFIG.maxScrollRetries) {
      const prevSize = trends.length;

      document.querySelectorAll('[data-testid="trend"]').forEach((trend, idx) => {
        const spans = trend.querySelectorAll('[dir="ltr"] span');
        const texts = Array.from(spans).map(s => s.textContent).filter(Boolean);
        const name = texts.find(t => t.startsWith('#') || t.length > 3) || texts[0] || '';
        const category = texts.find(t => t.includes('·') || t.includes('Trending')) || '';
        const count = texts.find(t => /\d+[KMB]?\s*(posts|tweets)/i.test(t)) || '';

        if (name && !trends.find(t => t.name === name)) {
          trends.push({ rank: trends.length + 1, name, category: category.trim(), tweetCount: count.trim() });
        }
      });

      if (trends.length === prevSize) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n📈 Found ${trends.length} trends:\n`);
    trends.slice(0, 20).forEach(t => {
      console.log(`   #${t.rank} ${t.name} ${t.tweetCount ? '(' + t.tweetCount + ')' : ''}`);
    });

    return { type: 'trends', trends };
  };

  const searchTweets = async () => {
    if (!CONFIG.searchQuery) {
      console.error('❌ Set CONFIG.searchQuery first!');
      return null;
    }

    console.log(`🔍 Searching: "${CONFIG.searchQuery}"...`);

    // Type in search box
    const searchInput = document.querySelector('[data-testid="SearchBox_Search_Input"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.value = '';
      document.execCommand('insertText', false, CONFIG.searchQuery);
      await sleep(500);
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      await sleep(3000);
    } else {
      // Navigate directly
      window.location.href = `https://x.com/search?q=${encodeURIComponent(CONFIG.searchQuery)}&f=live`;
      await sleep(4000);
    }

    const results = new Map();
    let retries = 0;

    while (results.size < CONFIG.maxResults && retries < CONFIG.maxScrollRetries) {
      const prevSize = results.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || results.has(linkEl.href)) return;

        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const likes = tweet.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent || '0';
        const reposts = tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0';

        results.set(linkEl.href, { text: text.substring(0, 300), author, time, url: linkEl.href, likes, reposts });
      });

      if (results.size === prevSize) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const all = [...results.values()];
    console.log(`\n🔍 Found ${all.length} results`);

    return { type: 'search', query: CONFIG.searchQuery, results: all };
  };

  const run = async () => {
    console.log('🔍 DISCOVERY & EXPLORE — XActions by nichxbt\n');

    let data;
    if (CONFIG.action === 'trends') data = await scrapeTrends();
    else if (CONFIG.action === 'search') data = await searchTweets();
    else { console.error(`❌ Unknown action: ${CONFIG.action}`); return; }

    if (data && CONFIG.exportResults) {
      const date = new Date().toISOString().slice(0, 10);
      download(
        { exportedAt: new Date().toISOString(), ...data },
        `xactions-explore-${CONFIG.action}-${date}.json`
      );
    }

    console.log('\n🏁 Done!');
  };

  run();
})();
