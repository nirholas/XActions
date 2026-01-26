/**
 * Notifications Scraper
 * Export notification history
 * 
 * HOW TO USE:
 * 1. Go to x.com/notifications
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_NOTIFICATIONS: 500,
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

  const extractNotification = (item, index) => {
    try {
      const text = item.textContent || '';
      
      // Get notification type
      let type = 'unknown';
      if (text.includes('liked')) type = 'like';
      else if (text.includes('retweeted') || text.includes('reposted')) type = 'retweet';
      else if (text.includes('followed')) type = 'follow';
      else if (text.includes('replied')) type = 'reply';
      else if (text.includes('mentioned')) type = 'mention';
      else if (text.includes('quoted')) type = 'quote';

      // Get users involved
      const userLinks = item.querySelectorAll('a[href^="/"]');
      const users = [];
      userLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('/') && !href.includes('/status/') && href.length < 20) {
          const handle = href.replace('/', '');
          if (handle && !users.includes(handle)) {
            users.push(handle);
          }
        }
      });

      // Get related tweet if any
      const tweetLink = item.querySelector('a[href*="/status/"]');
      const tweetUrl = tweetLink?.href || '';

      // Get time
      const timeEl = item.querySelector('time');
      const time = timeEl?.getAttribute('datetime') || timeEl?.textContent || '';

      return {
        id: index,
        type,
        text: text.slice(0, 280),
        users: users.slice(0, 10),
        tweetUrl,
        time,
      };
    } catch (e) {
      return null;
    }
  };

  const run = async () => {
    if (!window.location.pathname.includes('/notifications')) {
      console.error('❌ Please go to x.com/notifications first!');
      return;
    }

    console.log('🔔 Scraping notifications...');

    const notifications = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (notifications.size < CONFIG.MAX_NOTIFICATIONS && noNewCount < 5) {
      // Find notification items (they're usually in cells or articles)
      const items = document.querySelectorAll('[data-testid="cellInnerDiv"], article');
      const beforeCount = notifications.size;

      items.forEach((item, index) => {
        const notification = extractNotification(item, notifications.size + index);
        if (notification && notification.text.length > 5) {
          const key = `${notification.type}_${notification.text.slice(0, 50)}`;
          if (!notifications.has(key)) {
            notifications.set(key, notification);
          }
        }
      });

      const added = notifications.size - beforeCount;
      if (added > 0) {
        console.log(`🔔 Collected ${notifications.size} notifications...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 100) break;
    }

    const notificationList = Array.from(notifications.values());

    console.log('\n' + '='.repeat(60));
    console.log(`🔔 SCRAPED ${notificationList.length} NOTIFICATIONS`);
    console.log('='.repeat(60) + '\n');

    // Stats by type
    const byType = {};
    notificationList.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });
    
    console.log('📊 By type:');
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Top interactors
    const userCounts = {};
    notificationList.forEach(n => {
      n.users.forEach(user => {
        userCounts[user] = (userCounts[user] || 0) + 1;
      });
    });
    
    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (topUsers.length > 0) {
      console.log('\n👥 Top interactors:');
      topUsers.forEach(([user, count]) => {
        console.log(`   @${user}: ${count} interactions`);
      });
    }

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      const data = {
        exportedAt: new Date().toISOString(),
        count: notificationList.length,
        byType,
        notifications: notificationList,
      };
      download(JSON.stringify(data, null, 2), `notifications_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded notifications.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Type,Text,Users,TweetURL,Time',
        ...notificationList.map(n => 
          `"${n.type}","${n.text.replace(/"/g, '""').replace(/\n/g, ' ')}","${n.users.join(', ')}","${n.tweetUrl}","${n.time}"`
        )
      ].join('\n');
      download(csv, `notifications_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded notifications.csv');
    }

    window.scrapedNotifications = notificationList;
    console.log('\n✅ Done! Access data: window.scrapedNotifications');
  };

  run();
})();
