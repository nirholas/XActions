/**
 * Following Scraper
 * Export your following list to JSON/CSV
 * 
 * HOW TO USE:
 * 1. Go to x.com/USERNAME/following
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_FOLLOWING: 5000,
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

  const extractBio = (cell) => {
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    const text = autoDir?.textContent?.trim();
    if (text && text.length >= 10 && !text.startsWith('@')) return text;
    return '';
  };

  const extractUser = (cell) => {
    try {
      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const handleEl = cell.querySelector('a[href^="/"]');
      const followsYou = !!cell.querySelector('[data-testid="userFollowIndicator"]');
      
      const href = handleEl?.getAttribute('href') || '';
      const handle = href.replace('/', '').split('/')[0];
      
      return {
        handle,
        displayName: nameEl?.textContent || '',
        bio: extractBio(cell),
        followsYou,
        profileUrl: `https://x.com/${handle}`,
      };
    } catch (e) {
      return null;
    }
  };

  const run = async () => {
    if (!window.location.pathname.includes('/following')) {
      console.error('❌ Please go to x.com/USERNAME/following first!');
      return;
    }

    const username = window.location.pathname.split('/')[1];
    console.log(`👥 Scraping following list of @${username}...`);

    const following = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (following.size < CONFIG.MAX_FOLLOWING && noNewCount < 5) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      const beforeCount = following.size;

      cells.forEach(cell => {
        const user = extractUser(cell);
        if (user && user.handle && !following.has(user.handle)) {
          following.set(user.handle, user);
        }
      });

      const added = following.size - beforeCount;
      if (added > 0) {
        console.log(`👥 Collected ${following.size} following...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 200) break;
    }

    const followingList = Array.from(following.values());

    console.log('\n' + '='.repeat(60));
    console.log(`👥 SCRAPED ${followingList.length} FOLLOWING`);
    console.log('='.repeat(60) + '\n');

    followingList.slice(0, 5).forEach((f, i) => {
      console.log(`${i + 1}. @${f.handle} - ${f.displayName}${f.followsYou ? ' (follows you)' : ''}`);
    });
    if (followingList.length > 5) {
      console.log(`   ... and ${followingList.length - 5} more\n`);
    }

    // Stats
    const mutuals = followingList.filter(f => f.followsYou).length;
    console.log(`📊 Stats: ${mutuals} mutuals, ${followingList.length - mutuals} non-followers`);

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      download(JSON.stringify(followingList, null, 2), `${username}_following_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded following.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Bio,FollowsYou,ProfileURL',
        ...followingList.map(f => 
          `"@${f.handle}","${f.displayName.replace(/"/g, '""')}","${f.bio.replace(/"/g, '""').replace(/\n/g, ' ')}",${f.followsYou},"${f.profileUrl}"`
        )
      ].join('\n');
      download(csv, `${username}_following_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded following.csv');
    }

    window.scrapedFollowing = followingList;
    console.log('\n✅ Done! Access data: window.scrapedFollowing');
  };

  run();
})();
