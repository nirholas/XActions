// Join Communities on X - by nichxbt
// https://github.com/nirholas/xactions
// Discover and join X communities based on keywords
// 1. Go to https://x.com/i/communities/suggested
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Keywords to filter communities (leave empty to join all visible)
    keywords: [
      // 'crypto',
      // 'AI',
      // 'javascript',
    ],
    maxJoins: 20,
    actionDelay: 3000,
    scrollDelay: 2000,
    maxScrollAttempts: 15,
    dryRun: true, // Set to false to actually join
  };

  const $communityCard = 'div[data-testid="communityCard"], a[href^="/i/communities/"]';
  const $joinButton = 'button[data-testid="join"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let joined = 0;
  const processedCommunities = new Set();

  const run = async () => {
    console.log('🏘️ JOIN COMMUNITIES - XActions by nichxbt');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually join');
    }

    if (CONFIG.keywords.length > 0) {
      console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}`);
    }

    let scrollAttempts = 0;

    while (joined < CONFIG.maxJoins && scrollAttempts < CONFIG.maxScrollAttempts) {
      const cards = document.querySelectorAll($communityCard);
      let foundNew = false;

      for (const card of cards) {
        if (joined >= CONFIG.maxJoins) break;

        const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href^="/i/communities/"]');
        const communityId = linkEl?.href?.match(/communities\/(\d+)/)?.[1] || '';
        if (!communityId || processedCommunities.has(communityId)) continue;
        processedCommunities.add(communityId);
        foundNew = true;

        const name = card.textContent?.trim()?.substring(0, 80) || 'Unknown';

        // Filter by keywords
        if (CONFIG.keywords.length > 0) {
          const nameLC = name.toLowerCase();
          const matches = CONFIG.keywords.some(kw => nameLC.includes(kw.toLowerCase()));
          if (!matches) continue;
        }

        if (CONFIG.dryRun) {
          console.log(`   🏘️ Would join: ${name}`);
          joined++;
          continue;
        }

        try {
          // Navigate to community and join
          const joinBtn = card.querySelector($joinButton) || card.querySelector('button');
          if (joinBtn && joinBtn.textContent.toLowerCase().includes('join')) {
            joinBtn.click();
            await sleep(CONFIG.actionDelay);
            console.log(`✅ Joined: ${name}`);
            joined++;
          } else {
            // Navigate to community page to find join button
            if (linkEl) {
              linkEl.click();
              await sleep(2000);
              const joinOnPage = document.querySelector('button[data-testid="join"]');
              if (joinOnPage) {
                joinOnPage.click();
                console.log(`✅ Joined: ${name}`);
                joined++;
                await sleep(1000);
                window.history.back();
                await sleep(1500);
              }
            }
          }
        } catch (e) {
          console.warn(`⚠️ Failed to join: ${name}`);
        }
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Joined ${joined} communities.`);
  };

  run();
})();
