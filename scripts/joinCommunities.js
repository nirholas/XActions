// scripts/joinCommunities.js
// Browser console script for discovering and joining X communities by keyword
// Paste in DevTools console on x.com/i/communities/suggested
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    keywords: [
      // 'javascript',
      // 'web3',
    ],
    maxJoins: 5,
    dryRun: true,               // SET FALSE TO EXECUTE
    delay: 3000,
    scrollDelay: 2000,
    maxScrollRetries: 10,
  };
  // =============================================

  let joined = 0;
  const processed = new Set();

  const run = async () => {
    console.log('🏘️ JOIN COMMUNITIES — XActions by nichxbt\n');

    if (CONFIG.dryRun) console.log('⚠️ DRY RUN — Set CONFIG.dryRun = false to actually join\n');
    if (CONFIG.keywords.length > 0) console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}\n`);

    let retries = 0;

    while (joined < CONFIG.maxJoins && retries < CONFIG.maxScrollRetries) {
      const cards = document.querySelectorAll('div[data-testid="communityCard"], a[href^="/i/communities/"]');
      let foundNew = false;

      for (const card of cards) {
        if (joined >= CONFIG.maxJoins) break;

        const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href^="/i/communities/"]');
        const communityId = linkEl?.href?.match(/communities\/(\d+)/)?.[1] || '';
        if (!communityId || processed.has(communityId)) continue;
        processed.add(communityId);
        foundNew = true;

        const name = card.textContent?.trim()?.substring(0, 80) || 'Unknown';

        // Filter by keywords
        if (CONFIG.keywords.length > 0) {
          const nameLC = name.toLowerCase();
          if (!CONFIG.keywords.some(kw => nameLC.includes(kw.toLowerCase()))) continue;
        }

        if (CONFIG.dryRun) {
          console.log(`   🏘️ Would join: ${name}`);
          joined++;
          continue;
        }

        try {
          const joinBtn = card.querySelector('button[data-testid="join"]') || card.querySelector('button');
          if (joinBtn && joinBtn.textContent.toLowerCase().includes('join')) {
            joinBtn.click();
            await sleep(CONFIG.delay);
            console.log(`   ✅ Joined: ${name}`);
            joined++;
          } else if (linkEl) {
            // Navigate to community page to find join button
            linkEl.click();
            await sleep(2000);
            const joinOnPage = document.querySelector('button[data-testid="join"]');
            if (joinOnPage) {
              joinOnPage.click();
              console.log(`   ✅ Joined: ${name}`);
              joined++;
              await sleep(1000);
            }
            window.history.back();
            await sleep(1500);
          }
        } catch (e) {
          console.warn(`   ⚠️ Failed to join: ${name}`);
        }
      }

      if (!foundNew) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ ${CONFIG.dryRun ? 'Would join' : 'Joined'} ${joined} communities`);
    console.log('🏁 Done!');
  };

  run();
})();
