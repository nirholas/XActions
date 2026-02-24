// scripts/notificationManager.js
// Browser console script for scraping and filtering notifications on X/Twitter
// Paste in DevTools console on x.com/notifications
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxNotifications: 50,
    filterType: 'all',          // 'all' | 'mentions' | 'verified'
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

  const classifyNotification = (text) => {
    const lc = text.toLowerCase();
    if (lc.includes('liked your') || lc.includes('likes')) return 'like';
    if (lc.includes('retweeted') || lc.includes('reposted')) return 'repost';
    if (lc.includes('followed you')) return 'follow';
    if (lc.includes('replied') || lc.includes('mentioned')) return 'mention';
    if (lc.includes('quoted')) return 'quote';
    return 'other';
  };

  const run = async () => {
    console.log('🔔 NOTIFICATION MANAGER — XActions by nichxbt\n');

    if (!window.location.href.includes('/notifications')) {
      console.error('❌ Navigate to x.com/notifications first!');
      return;
    }

    // Switch to mentions tab if needed
    if (CONFIG.filterType === 'mentions') {
      const mentionsTab = document.querySelector('a[href="/notifications/mentions"]');
      if (mentionsTab) { mentionsTab.click(); await sleep(2000); }
    }

    console.log(`📊 Scraping notifications (filter: ${CONFIG.filterType})...`);
    const notifications = new Map();
    let retries = 0;

    while (notifications.size < CONFIG.maxNotifications && retries < CONFIG.maxScrollRetries) {
      const prevSize = notifications.size;

      document.querySelectorAll('[data-testid="notification"], article[data-testid="tweet"]').forEach(notif => {
        const text = notif.textContent?.substring(0, 300) || '';
        const time = notif.querySelector('time')?.getAttribute('datetime') || '';
        const links = Array.from(notif.querySelectorAll('a[href^="/"]')).map(a => ({
          text: a.textContent,
          href: a.href,
        })).filter(l => l.href.includes('x.com/'));
        const isVerified = !!notif.querySelector('[data-testid="icon-verified"]');
        const type = classifyNotification(text);
        const key = text.substring(0, 80) + time;

        if (!notifications.has(key)) {
          // Apply filter
          if (CONFIG.filterType === 'mentions' && type !== 'mention') return;
          if (CONFIG.filterType === 'verified' && !isVerified) return;

          notifications.set(key, { text: text.substring(0, 200), type, time, isVerified, users: links.slice(0, 5) });
        }
      });

      if (notifications.size === prevSize) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const all = [...notifications.values()];

    // Group by type
    const byType = {};
    all.forEach(n => {
      if (!byType[n.type]) byType[n.type] = [];
      byType[n.type].push(n);
    });

    console.log(`\n🔔 Total notifications: ${all.length}\n`);
    console.log('📊 BY TYPE:');
    Object.entries(byType)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([type, items]) => {
        console.log(`   ${type}: ${items.length}`);
      });

    if (CONFIG.exportResults) {
      const date = new Date().toISOString().slice(0, 10);
      download(
        { exportedAt: new Date().toISOString(), filter: CONFIG.filterType, total: all.length, byType, notifications: all },
        `xactions-notifications-${date}.json`
      );
    }

    console.log('\n🏁 Done!');
  };

  run();
})();
