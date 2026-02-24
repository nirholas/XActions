// scripts/scrapeSpaces.js
// Browser console script to scrape X/Twitter Spaces data
// Paste in DevTools console on x.com/i/spaces or a Space page
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const CONFIG = {
    maxSpaces: 20,
    scrapeParticipants: true,
  };

  const run = async () => {
    console.log('🎙️ XActions Spaces Scraper');
    console.log('=========================');

    const isInSpace = !!document.querySelector('[data-testid="SpaceButton"], [data-testid="spaceSpeakers"]');

    if (isInSpace) {
      // Scrape current Space metadata
      console.log('📡 Scraping current Space...');

      const metadata = {
        title: document.querySelector('[data-testid="spaceTitle"]')?.textContent || 
               document.querySelector('h1, [role="heading"]')?.textContent || '',
        topic: document.querySelector('[data-testid="spaceTopic"]')?.textContent || '',
        listeners: document.querySelector('[data-testid="spaceListeners"]')?.textContent || '',
        speakers: [],
        participants: [],
      };

      // Get speakers
      document.querySelectorAll('[data-testid="spaceSpeaker"], [data-testid="UserCell"]').forEach(el => {
        const name = el.querySelector('[dir="ltr"]')?.textContent || '';
        const handle = el.querySelector('a[role="link"]')?.href?.split('/').pop() || '';
        if (name || handle) {
          metadata.speakers.push({ name: name.trim(), handle });
        }
      });

      console.log(`  📋 Title: ${metadata.title}`);
      console.log(`  👥 Listeners: ${metadata.listeners}`);
      console.log(`  🎤 Speakers: ${metadata.speakers.length}`);

      metadata.scrapedAt = new Date().toISOString();
      console.log('\n📦 Space data:');
      console.log(JSON.stringify(metadata, null, 2));

      try {
        await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
        console.log('\n✅ Copied to clipboard!');
      } catch (e) {}
    } else {
      // Scrape Spaces listing
      console.log('🔍 Scraping Spaces listing...');

      const spaces = [];
      document.querySelectorAll('[data-testid="SpaceCard"], [data-testid="space"], a[href*="/spaces/"]').forEach(card => {
        const title = card.querySelector('[data-testid="spaceTitle"]')?.textContent || 
                      card.textContent?.trim()?.substring(0, 100) || '';
        const host = card.querySelector('[data-testid="spaceHost"]')?.textContent || '';
        const listeners = card.querySelector('[data-testid="spaceListeners"]')?.textContent || '';
        const link = card.href || card.querySelector('a')?.href || '';
        const isLive = !!card.querySelector('[data-testid="spaceLive"]') || 
                       card.textContent?.toLowerCase().includes('live');

        if (title && !spaces.find(s => s.link === link)) {
          spaces.push({ title: title.trim(), host, listeners, link, isLive });
        }
      });

      console.log(`  Found ${spaces.length} Spaces`);
      spaces.forEach((s, i) => {
        console.log(`  ${s.isLive ? '🔴' : '⏳'} ${i + 1}. ${s.title} — ${s.listeners} listeners`);
      });

      const result = { spaces, scrapedAt: new Date().toISOString() };
      console.log('\n📦 Full JSON:');
      console.log(JSON.stringify(result, null, 2));

      try {
        await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        console.log('\n✅ Copied to clipboard!');
      } catch (e) {}
    }
  };

  run();
})();
