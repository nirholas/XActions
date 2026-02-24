// scripts/bookmarkOrganizer.js
// Browser console script for categorizing bookmarks by keywords on X/Twitter
// Paste in DevTools console on x.com/i/bookmarks
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxBookmarks: 100,
    categories: {
      tech: ['code', 'programming', 'dev', 'javascript', 'python', 'software', 'ai', 'ml'],
      crypto: ['bitcoin', 'eth', 'web3', 'crypto', 'defi', 'blockchain', 'btc'],
      news: ['breaking', 'report', 'update', 'announced', 'confirmed'],
      business: ['startup', 'revenue', 'funding', 'investor', 'market', 'growth'],
    },
    exportFormat: 'json',       // 'json' | 'csv'
    scrollDelay: 1500,
    maxScrollRetries: 5,
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: typeof data === 'string' ? 'text/csv' : 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const categorize = (text) => {
    const lc = text.toLowerCase();
    const matched = [];
    for (const [cat, keywords] of Object.entries(CONFIG.categories)) {
      if (keywords.some(kw => lc.includes(kw))) matched.push(cat);
    }
    return matched.length > 0 ? matched : ['uncategorized'];
  };

  const run = async () => {
    console.log('🔖 BOOKMARK ORGANIZER — XActions by nichxbt\n');

    if (!window.location.href.includes('/bookmarks')) {
      console.error('❌ Navigate to x.com/i/bookmarks first!');
      return;
    }

    console.log('📊 Scanning bookmarks...');
    const bookmarks = new Map();
    let retries = 0;

    while (bookmarks.size < CONFIG.maxBookmarks && retries < CONFIG.maxScrollRetries) {
      const prevSize = bookmarks.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || bookmarks.has(linkEl.href)) return;

        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const userLink = tweet.querySelector('a[href^="/"][role="link"]');
        const username = userLink?.href?.match(/x\.com\/([^/]+)/)?.[1] || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';

        bookmarks.set(linkEl.href, {
          text: text.substring(0, 300),
          url: linkEl.href,
          username,
          time,
          categories: categorize(text),
        });
      });

      if (bookmarks.size === prevSize) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const all = [...bookmarks.values()];

    // Group by category
    const byCategory = {};
    all.forEach(b => {
      b.categories.forEach(cat => {
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(b);
      });
    });

    // Print report
    console.log(`\n📚 Total bookmarks: ${all.length}\n`);
    console.log('📁 BY CATEGORY:');
    Object.entries(byCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([cat, items]) => {
        console.log(`\n   📂 ${cat} (${items.length})`);
        items.slice(0, 3).forEach(item => {
          console.log(`      • @${item.username}: "${item.text.substring(0, 50)}..."`);
        });
        if (items.length > 3) console.log(`      ... and ${items.length - 3} more`);
      });

    // Export
    const date = new Date().toISOString().slice(0, 10);

    if (CONFIG.exportFormat === 'csv') {
      const header = 'URL,Username,Text,Categories,Time';
      const rows = all.map(b =>
        `"${b.url}","${b.username}","${b.text.replace(/"/g, '""')}","${b.categories.join(';')}","${b.time}"`
      );
      download([header, ...rows].join('\n'), `xactions-bookmarks-organized-${date}.csv`);
    } else {
      download({ exportedAt: new Date().toISOString(), total: all.length, byCategory, bookmarks: all }, `xactions-bookmarks-organized-${date}.json`);
    }

    console.log('\n🏁 Done!');
  };

  run();
})();
