// scripts/manageLists.js
// Browser console script to manage X/Twitter Lists
// Paste in DevTools console on x.com/i/lists
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const extractBio = (cell) => {
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    const text = autoDir?.textContent?.trim();
    if (text && text.length >= 10 && !text.startsWith('@')) return text;
    return '';
  };

  const CONFIG = {
    action: 'export', // 'export' or 'export_members'
    maxLists: 50,
    maxMembers: 100,
  };

  const exportLists = async () => {
    console.log('📋 Exporting lists...');

    const lists = [];
    let scrollAttempts = 0;

    while (lists.length < CONFIG.maxLists && scrollAttempts < 10) {
      document.querySelectorAll('[data-testid="listItem"], a[href*="/lists/"]').forEach(el => {
        const name = el.querySelector('[dir="ltr"]')?.textContent || el.textContent?.trim() || '';
        const link = el.href || el.querySelector('a')?.href || '';
        const description = el.querySelector('[data-testid="listDescription"]')?.textContent || '';
        const memberCount = el.querySelector('[data-testid="memberCount"]')?.textContent || '';

        if (name && link && !lists.find(l => l.link === link)) {
          lists.push({
            name: name.trim().substring(0, 100),
            link,
            description: description.trim(),
            memberCount,
          });
        }
      });

      window.scrollBy(0, 800);
      await sleep(1500);
      scrollAttempts++;
    }

    console.log(`  Found ${lists.length} lists`);
    lists.forEach((l, i) => {
      console.log(`  ${i + 1}. ${l.name} ${l.memberCount ? `(${l.memberCount} members)` : ''}`);
    });

    return lists;
  };

  const exportListMembers = async () => {
    console.log('👥 Exporting list members from current list...');
    console.log('   (Navigate to a specific list first)');

    const members = [];
    let scrollAttempts = 0;

    while (members.length < CONFIG.maxMembers && scrollAttempts < Math.ceil(CONFIG.maxMembers / 5)) {
      document.querySelectorAll('[data-testid="UserCell"]').forEach(user => {
        const name = user.querySelector('[dir="ltr"]')?.textContent || '';
        const handle = user.querySelector('a[role="link"]')?.href?.split('/').pop() || '';
        const bio = extractBio(user);
        const isVerified = !!user.querySelector('[data-testid="icon-verified"]');

        if (handle && !members.find(m => m.handle === handle)) {
          members.push({ name: name.trim(), handle, bio: bio.trim().substring(0, 200), isVerified });
        }
      });

      window.scrollBy(0, 800);
      await sleep(1500);
      scrollAttempts++;
    }

    console.log(`  Found ${members.length} members`);
    return members;
  };

  const run = async () => {
    console.log('📋 XActions List Manager');
    console.log('========================');

    let result = {};

    if (CONFIG.action === 'export_members') {
      result.members = await exportListMembers();
    } else {
      result.lists = await exportLists();
    }

    result.scrapedAt = new Date().toISOString();

    console.log('\n📦 Full JSON:');
    console.log(JSON.stringify(result, null, 2));

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('\n✅ Copied to clipboard!');
    } catch (e) {}
  };

  run();
})();
