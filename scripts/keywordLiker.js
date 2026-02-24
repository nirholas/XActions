// scripts/keywordLiker.js
// Like only posts containing specific keywords — with a prompt input box
// Paste in DevTools console on x.com/home or any feed/search page
// by nichxbt

(() => {
  'use strict';

  // =============================================
  // ⬇️ PROMPT: ask user for keywords
  // =============================================
  const input = prompt(
    '🔍 Enter keywords to match (comma-separated):\n\nExample: crypto, bitcoin, web3',
    'crypto'
  );
  if (!input) { console.log('❌ Cancelled.'); return; }

  const keywords = input.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  if (keywords.length === 0) { console.log('❌ No keywords provided.'); return; }

  // =============================================
  // CONFIG — adjust as needed
  // =============================================
  const CONFIG = {
    keywords,                 // From the prompt above
    maxLikes: 50,             // Stop after this many likes
    delayBetween: [2000, 5000], // Random delay between likes (ms)
    scrollRounds: 20,         // How many scroll cycles to do
    scrollDelay: 2500,        // Pause after each scroll (ms)
    dryRun: false,            // Set true to preview without actually liking
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));

  const SEL = {
    tweet:     'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeBtn:   '[data-testid="like"]',
    unlikeBtn: '[data-testid="unlike"]',
    toast:     '[data-testid="toast"]',
  };

  const matchesKeywords = (text) => {
    const lower = text.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  };

  const isRateLimited = () => {
    for (const el of document.querySelectorAll(`${SEL.toast}, [role="alert"]`)) {
      if (/rate limit|try again|too many|slow down/i.test(el.textContent)) return true;
    }
    return false;
  };

  let liked = 0;
  let skipped = 0;
  const seen = new Set();

  // ── Abort handle ───────────────────────────────────────────
  let aborted = false;
  window.XActions = window.XActions || {};
  window.XActions.stop = () => { aborted = true; console.log('🛑 Stopping after current tweet...'); };

  const run = async () => {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  🔑 KEYWORD LIKER                         ║');
    console.log('║  by nichxbt — XActions                     ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`   Keywords: ${keywords.join(', ')}`);
    console.log(`   Max likes: ${CONFIG.maxLikes}`);
    console.log(`   Dry run: ${CONFIG.dryRun}`);
    console.log(`   ℹ️ Type XActions.stop() to abort early\n`);

    for (let round = 0; round < CONFIG.scrollRounds && !aborted; round++) {
      const articles = document.querySelectorAll(SEL.tweet);

      for (const article of articles) {
        if (liked >= CONFIG.maxLikes || aborted) break;

        // Unique fingerprint
        const link = article.querySelector('a[href*="/status/"]')?.href || '';
        const textEl = article.querySelector(SEL.tweetText);
        const text = textEl ? textEl.textContent.trim() : '';
        const id = link || text.slice(0, 80);
        if (!id || seen.has(id)) continue;
        seen.add(id);

        // Already liked?
        if (article.querySelector(SEL.unlikeBtn)) continue;

        // Keyword filter
        if (!matchesKeywords(text)) { skipped++; continue; }

        // Rate limit check
        if (isRateLimited()) {
          console.log('🚨 Rate limited! Waiting 120s...');
          await sleep(120000);
          if (isRateLimited()) { console.log('🛑 Still limited. Stopping.'); aborted = true; break; }
        }

        // Scroll into view
        article.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const likeBtn = article.querySelector(SEL.likeBtn);
        if (!likeBtn) continue;

        if (CONFIG.dryRun) {
          console.log(`🏃 [DRY] Would like: "${text.slice(0, 60)}..."`);
        } else {
          likeBtn.click();
          await sleep(400);
          // Verify
          if (!article.querySelector(SEL.unlikeBtn)) {
            console.log(`   ⚠️ Like may not have registered.`);
          }
        }

        liked++;
        console.log(`❤️ (${liked}/${CONFIG.maxLikes}) "${text.slice(0, 50)}..."`);

        const delay = rand(CONFIG.delayBetween[0], CONFIG.delayBetween[1]);
        await sleep(delay);
      }

      if (liked >= CONFIG.maxLikes || aborted) break;

      // Scroll for more content
      window.scrollBy(0, 1200);
      console.log(`   📜 Scroll ${round + 1}/${CONFIG.scrollRounds} — ${liked} liked, ${skipped} skipped`);
      await sleep(CONFIG.scrollDelay);
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  🔑 KEYWORD LIKER RESULTS`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ❤️  Liked:   ${liked}`);
    console.log(`  ⏭️  Skipped: ${skipped} (no keyword match)`);
    console.log(`  🔍 Keywords: ${keywords.join(', ')}`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing was liked)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  };

  run();
})();
