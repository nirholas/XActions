// scripts/manageNotifications.js
// Browser console script to scrape and manage X/Twitter notifications
// Paste in DevTools console on x.com/notifications
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const CONFIG = {
    maxNotifications: 100,
    exportFormat: 'json', // 'json' or 'csv'
  };

  const run = async () => {
    console.log('🔔 XActions Notification Scraper');
    console.log('================================');

    const notifications = [];
    let scrollAttempts = 0;

    while (notifications.length < CONFIG.maxNotifications && scrollAttempts < 30) {
      document.querySelectorAll('[data-testid="cellInnerDiv"]').forEach(cell => {
        const text = cell.textContent?.trim() || '';
        if (!text || text.length < 5) return;

        const links = Array.from(cell.querySelectorAll('a')).map(a => ({
          text: a.textContent?.trim(),
          href: a.href,
        }));
        const time = cell.querySelector('time')?.getAttribute('datetime') || '';

        // Classify notification type
        let type = 'other';
        const lower = text.toLowerCase();
        if (lower.includes('liked your')) type = 'like';
        else if (lower.includes('replied')) type = 'reply';
        else if (lower.includes('mentioned')) type = 'mention';
        else if (lower.includes('followed you')) type = 'follow';
        else if (lower.includes('retweeted') || lower.includes('reposted')) type = 'repost';
        else if (lower.includes('quote')) type = 'quote';

        const id = text.substring(0, 80) + time;
        if (!notifications.find(n => (n.text.substring(0, 80) + n.time) === id)) {
          notifications.push({
            type,
            text: text.substring(0, 200),
            time,
            links: links.slice(0, 3),
          });
        }
      });

      window.scrollBy(0, 800);
      await sleep(1500);
      scrollAttempts++;

      if (scrollAttempts % 5 === 0) {
        console.log(`  📥 Scraped ${notifications.length} notifications...`);
      }
    }

    // Summary
    const typeCounts = {};
    notifications.forEach(n => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    console.log(`\n📊 Notification summary (${notifications.length} total):`);
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      const emoji = { like: '❤️', reply: '💬', mention: '@', follow: '👤', repost: '🔁', quote: '💭', other: '📌' };
      console.log(`  ${emoji[type] || '📌'} ${type}: ${count}`);
    });

    const result = {
      notifications: notifications.slice(0, CONFIG.maxNotifications),
      summary: typeCounts,
      scrapedAt: new Date().toISOString(),
    };

    console.log('\n📦 Full JSON:');
    console.log(JSON.stringify(result, null, 2));

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('\n✅ Copied to clipboard!');
    } catch (e) {
      console.log('\n⚠️ Could not copy to clipboard.');
    }
  };

  run();
})();
