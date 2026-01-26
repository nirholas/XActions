/**
 * Likers Scraper
 * Get all users who liked a specific tweet
 * 
 * HOW TO USE:
 * 1. Go to a tweet and click on the likes count to open the likers list
 *    OR go directly to x.com/USERNAME/status/TWEETID/likes
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_LIKERS: 5000,
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

  const extractUser = (cell) => {
    try {
      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const handleEl = cell.querySelector('a[href^="/"]');
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const verified = !!cell.querySelector('svg[aria-label*="Verified"]');
      
      const href = handleEl?.getAttribute('href') || '';
      const handle = href.replace('/', '').split('/')[0];
      
      return {
        handle,
        displayName: nameEl?.textContent || '',
        bio: bioEl?.textContent || '',
        verified,
        profileUrl: `https://x.com/${handle}`,
      };
    } catch (e) {
      return null;
    }
  };

  const getTweetId = () => {
    const match = window.location.pathname.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const run = async () => {
    if (!window.location.pathname.includes('/likes')) {
      console.error('❌ Please go to the likes page of a tweet!');
      console.log('   Example: x.com/user/status/123456/likes');
      return;
    }

    const tweetId = getTweetId();
    console.log(`❤️ Scraping likers of tweet ${tweetId}...`);

    const likers = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (likers.size < CONFIG.MAX_LIKERS && noNewCount < 5) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      const beforeCount = likers.size;

      cells.forEach(cell => {
        const user = extractUser(cell);
        if (user && user.handle && !likers.has(user.handle)) {
          likers.set(user.handle, user);
        }
      });

      const added = likers.size - beforeCount;
      if (added > 0) {
        console.log(`❤️ Collected ${likers.size} likers...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 200) break;
    }

    const likerList = Array.from(likers.values());

    console.log('\n' + '='.repeat(60));
    console.log(`❤️ SCRAPED ${likerList.length} LIKERS`);
    console.log('='.repeat(60) + '\n');

    likerList.slice(0, 5).forEach((l, i) => {
      console.log(`${i + 1}. @${l.handle}${l.verified ? ' ✓' : ''} - ${l.displayName}`);
    });
    if (likerList.length > 5) {
      console.log(`   ... and ${likerList.length - 5} more\n`);
    }

    const verified = likerList.filter(l => l.verified).length;
    console.log(`📊 Stats: ${verified} verified accounts`);

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      download(JSON.stringify({ tweetId, likers: likerList }, null, 2), `tweet_${tweetId}_likers_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded likers.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Bio,Verified,ProfileURL',
        ...likerList.map(l => 
          `"@${l.handle}","${l.displayName.replace(/"/g, '""')}","${l.bio.replace(/"/g, '""').replace(/\n/g, ' ')}",${l.verified},"${l.profileUrl}"`
        )
      ].join('\n');
      download(csv, `tweet_${tweetId}_likers_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded likers.csv');
    }

    window.scrapedLikers = { tweetId, likers: likerList };
    console.log('\n✅ Done! Access data: window.scrapedLikers');
  };

  run();
})();
