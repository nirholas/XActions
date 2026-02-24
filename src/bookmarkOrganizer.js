// Bookmark Organizer on X - by nichxbt
// https://github.com/nirholas/xactions
// Organize bookmarks into folders (Premium feature)
// Also export all bookmarks with categorization
// 1. Go to https://x.com/i/bookmarks
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    maxBookmarks: 200,
    scrollDelay: 1500,
    exportFormat: 'json', // 'json' or 'csv'
    // Auto-categorize by keywords
    categories: {
      'Tech': ['javascript', 'python', 'coding', 'programming', 'dev', 'software', 'ai', 'ml'],
      'News': ['breaking', 'report', 'update', 'announced', 'confirmed'],
      'Crypto': ['bitcoin', 'btc', 'eth', 'crypto', 'defi', 'web3', 'blockchain'],
      'Funny': ['lmao', 'lol', '😂', '🤣', 'hilarious', 'meme'],
      'Business': ['startup', 'revenue', 'funding', 'investor', 'market', 'growth'],
    },
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2]) num *= { K: 1000, M: 1000000, B: 1000000000 }[match[2].toUpperCase()];
    return Math.round(num);
  };

  const categorize = (text) => {
    const textLC = text.toLowerCase();
    const matched = [];
    for (const [category, keywords] of Object.entries(CONFIG.categories)) {
      if (keywords.some(kw => textLC.includes(kw))) {
        matched.push(category);
      }
    }
    return matched.length > 0 ? matched : ['Uncategorized'];
  };

  const run = async () => {
    console.log('🔖 BOOKMARK ORGANIZER - XActions by nichxbt');

    if (!window.location.href.includes('/bookmarks')) {
      console.error('❌ Navigate to x.com/i/bookmarks first!');
      return;
    }

    console.log('📊 Scanning bookmarks...\n');

    const bookmarks = new Map();
    let retries = 0;

    while (bookmarks.size < CONFIG.maxBookmarks && retries < 5) {
      const prevSize = bookmarks.size;

      document.querySelectorAll($tweet).forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || bookmarks.has(linkEl.href)) return;

        const textEl = tweet.querySelector($tweetText);
        const likeEl = tweet.querySelector($like);
        const timeEl = tweet.querySelector('time');
        const userLink = tweet.querySelector('a[href^="/"][role="link"]');
        const username = userLink?.href?.match(/x\.com\/([^\/]+)/)?.[1] || '';
        const text = textEl?.textContent || '';

        bookmarks.set(linkEl.href, {
          text: text.substring(0, 300),
          url: linkEl.href,
          username,
          timestamp: timeEl?.dateTime || '',
          likes: parseCount(likeEl?.getAttribute('aria-label') || '0'),
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

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔖 BOOKMARK REPORT                                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Total bookmarks: ${all.length}\n`);

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
    if (CONFIG.exportFormat === 'csv') {
      const csvHeader = 'URL,Username,Text,Categories,Likes,Timestamp';
      const csvRows = all.map(b =>
        `"${b.url}","${b.username}","${b.text.replace(/"/g, '""')}","${b.categories.join(';')}",${b.likes},"${b.timestamp}"`
      );
      const csv = [csvHeader, ...csvRows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-bookmarks-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      console.log('\n📥 Bookmarks exported as CSV');
    } else {
      const report = {
        exportedAt: new Date().toISOString(),
        total: all.length,
        byCategory,
        bookmarks: all,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('\n📥 Bookmarks exported as JSON');
    }
  };

  run();
})();
