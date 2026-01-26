/**
 * List Members Scraper
 * Get all members of a Twitter list
 * 
 * HOW TO USE:
 * 1. Go to a Twitter list: x.com/i/lists/LISTID/members
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_MEMBERS: 5000,
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

  const getListId = () => {
    const match = window.location.pathname.match(/lists\/(\d+)/);
    return match ? match[1] : null;
  };

  const getListName = () => {
    const header = document.querySelector('h2[role="heading"]');
    return header?.textContent || 'unknown_list';
  };

  const run = async () => {
    if (!window.location.pathname.includes('/lists/')) {
      console.error('❌ Please go to a Twitter list first!');
      console.log('   Example: x.com/i/lists/123456/members');
      return;
    }

    const listId = getListId();
    const listName = getListName();
    console.log(`📋 Scraping list: ${listName} (ID: ${listId})...`);

    const members = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (members.size < CONFIG.MAX_MEMBERS && noNewCount < 5) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      const beforeCount = members.size;

      cells.forEach(cell => {
        const user = extractUser(cell);
        if (user && user.handle && !members.has(user.handle)) {
          members.set(user.handle, user);
        }
      });

      const added = members.size - beforeCount;
      if (added > 0) {
        console.log(`📋 Collected ${members.size} members...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 200) break;
    }

    const memberList = Array.from(members.values());

    console.log('\n' + '='.repeat(60));
    console.log(`📋 SCRAPED ${memberList.length} MEMBERS FROM "${listName}"`);
    console.log('='.repeat(60) + '\n');

    const verified = memberList.filter(m => m.verified).length;
    console.log(`📊 Stats: ${verified} verified accounts`);

    memberList.slice(0, 5).forEach((m, i) => {
      console.log(`${i + 1}. @${m.handle}${m.verified ? ' ✓' : ''} - ${m.displayName}`);
    });
    if (memberList.length > 5) {
      console.log(`   ... and ${memberList.length - 5} more\n`);
    }

    const safeListName = listName.replace(/[^a-z0-9]/gi, '_').slice(0, 30);

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      const data = { listId, listName, members: memberList };
      download(JSON.stringify(data, null, 2), `list_${safeListName}_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded list_members.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Bio,Verified,ProfileURL',
        ...memberList.map(m => 
          `"@${m.handle}","${m.displayName.replace(/"/g, '""')}","${m.bio.replace(/"/g, '""').replace(/\n/g, ' ')}",${m.verified},"${m.profileUrl}"`
        )
      ].join('\n');
      download(csv, `list_${safeListName}_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded list_members.csv');
    }

    window.scrapedList = { listId, listName, members: memberList };
    console.log('\n✅ Done! Access data: window.scrapedList');
  };

  run();
})();
