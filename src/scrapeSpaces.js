// Scrape Spaces (Audio/Video Broadcasts) on X - by nichxbt
// https://github.com/nirholas/xactions
// Find and collect metadata about X Spaces
// 1. Go to x.com/search?q=your-topic&f=live or any timeline
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    maxSpaces: 50,
    scrollDelay: 2000,
    maxScrollAttempts: 20,
    exportResults: true,
  };

  const $spaceCard = '[data-testid="card.layoutLarge.media"], a[href*="/i/spaces/"]';
  const $tweet = 'article[data-testid="tweet"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const run = async () => {
    console.log('🎙️ SCRAPE SPACES - XActions by nichxbt');
    console.log('📊 Scanning for X Spaces...\n');

    const spaces = new Map();
    let scrollAttempts = 0;

    while (spaces.size < CONFIG.maxSpaces && scrollAttempts < CONFIG.maxScrollAttempts) {
      const prevSize = spaces.size;

      // Find space links
      const spaceLinks = document.querySelectorAll('a[href*="/i/spaces/"]');
      spaceLinks.forEach(link => {
        const spaceId = link.href.match(/spaces\/([^?\/]+)/)?.[1] || '';
        if (!spaceId || spaces.has(spaceId)) return;

        // Try to extract metadata from surrounding context
        const card = link.closest('[data-testid]') || link.closest('div');
        const title = card?.querySelector('[dir="auto"]')?.textContent || 'Untitled Space';
        const host = card?.querySelector('a[href^="/"]')?.href?.match(/x\.com\/([^\/]+)/)?.[1] || '';

        // Check if it's live or scheduled
        const text = card?.textContent?.toLowerCase() || '';
        const isLive = text.includes('live') || text.includes('listening');
        const isScheduled = text.includes('scheduled') || text.includes('upcoming');

        spaces.set(spaceId, {
          spaceId,
          url: `https://x.com/i/spaces/${spaceId}`,
          title: title.substring(0, 200),
          host,
          status: isLive ? 'live' : isScheduled ? 'scheduled' : 'ended',
          foundAt: new Date().toISOString(),
        });
      });

      // Also check tweets that might embed spaces
      document.querySelectorAll($tweet).forEach(tweet => {
        const spaceLink = tweet.querySelector('a[href*="/i/spaces/"]');
        if (!spaceLink) return;
        // Already handled above
      });

      if (spaces.size === prevSize) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const all = [...spaces.values()];
    const live = all.filter(s => s.status === 'live');
    const scheduled = all.filter(s => s.status === 'scheduled');
    const ended = all.filter(s => s.status === 'ended');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🎙️ X SPACES REPORT                                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Found ${all.length} spaces`);
    console.log(`   🔴 Live: ${live.length}`);
    console.log(`   📅 Scheduled: ${scheduled.length}`);
    console.log(`   ⏹️ Ended: ${ended.length}`);

    if (live.length > 0) {
      console.log('\n🔴 LIVE NOW:');
      live.forEach((s, i) => {
        console.log(`   ${i + 1}. "${s.title}" by @${s.host}`);
        console.log(`      ${s.url}`);
      });
    }

    if (scheduled.length > 0) {
      console.log('\n📅 UPCOMING:');
      scheduled.forEach((s, i) => {
        console.log(`   ${i + 1}. "${s.title}" by @${s.host}`);
        console.log(`      ${s.url}`);
      });
    }

    if (CONFIG.exportResults) {
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-spaces-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('\n📥 Spaces data exported as JSON');
    }
  };

  run();
})();
