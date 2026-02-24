// scripts/spacesManager.js
// Browser console script for scraping live and scheduled Spaces on X/Twitter
// Paste in DevTools console on x.com/i/spaces or x.com/explore
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxSpaces: 20,
    exportResults: true,
    scrollDelay: 2000,
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

  const run = async () => {
    console.log('🎙️ SPACES MANAGER — XActions by nichxbt\n');
    console.log(`📊 Scraping up to ${CONFIG.maxSpaces} Spaces...\n`);

    const spaces = new Map();
    let retries = 0;

    while (spaces.size < CONFIG.maxSpaces && retries < CONFIG.maxScrollRetries) {
      const prevSize = spaces.size;

      // Scrape Space cards from timeline or explore
      document.querySelectorAll('[data-testid="SpaceCard"], [data-testid="space"], [data-testid="card.layoutLarge.media"]').forEach(card => {
        const title = card.querySelector('[data-testid="spaceTitle"]')?.textContent
          || card.querySelector('[dir="auto"] span')?.textContent || '';
        const host = card.querySelector('[data-testid="spaceHost"]')?.textContent
          || card.querySelector('a[role="link"]')?.textContent || '';
        const listeners = card.querySelector('[data-testid="spaceListeners"]')?.textContent || '';
        const speakers = card.querySelector('[data-testid="spaceSpeakers"]')?.textContent || '';
        const topic = card.querySelector('[data-testid="spaceTopic"]')?.textContent || '';
        const link = card.querySelector('a')?.href || '';
        const scheduled = card.querySelector('time')?.getAttribute('datetime') || '';
        const key = title + host;

        if (title && !spaces.has(key)) {
          spaces.set(key, {
            title: title.substring(0, 200),
            host,
            listeners,
            speakers,
            topic,
            link,
            scheduledFor: scheduled || null,
            isLive: !scheduled,
          });
        }
      });

      // Also check for inline Space cards in tweets
      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const spaceLink = tweet.querySelector('a[href*="/spaces/"]');
        if (!spaceLink) return;
        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const key = spaceLink.href;
        if (!spaces.has(key)) {
          spaces.set(key, {
            title: text.substring(0, 200),
            host: tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '',
            listeners: '',
            speakers: '',
            topic: '',
            link: spaceLink.href,
            scheduledFor: null,
            isLive: text.toLowerCase().includes('live'),
          });
        }
      });

      if (spaces.size === prevSize) retries++;
      else retries = 0;

      console.log(`   🎙️ Found ${spaces.size} Spaces...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const all = [...spaces.values()];
    const live = all.filter(s => s.isLive);
    const scheduled = all.filter(s => !s.isLive);

    console.log(`\n🎙️ Total Spaces: ${all.length}`);
    console.log(`   🔴 Live: ${live.length}`);
    console.log(`   📅 Scheduled: ${scheduled.length}\n`);

    all.forEach(s => {
      const status = s.isLive ? '🔴 LIVE' : '📅 Scheduled';
      console.log(`   ${status} | ${s.title.substring(0, 50)} | Host: ${s.host} | ${s.listeners ? s.listeners + ' listening' : ''}`);
    });

    if (CONFIG.exportResults) {
      const date = new Date().toISOString().slice(0, 10);
      download(
        { exportedAt: new Date().toISOString(), total: all.length, live: live.length, scheduled: scheduled.length, spaces: all },
        `xactions-spaces-${date}.json`
      );
    }

    console.log('\n🏁 Done!');
  };

  run();
})();
