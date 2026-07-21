// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/audienceOverlap.js
// Browser console script for analyzing shared followers between X accounts
// Paste in DevTools console on x.com/ACCOUNT/followers
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    accounts: ['accountA', 'accountB'],  // Two accounts to compare
    maxFollowers: 300,       // Max followers to scrape per account
    scrollRounds: 8,         // Scroll rounds per account
    scrollDelay: 2000,       // ms between scrolls
    exportResults: true,     // Auto-download JSON
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

  const datasets = {};

  const scrapeFollowers = async (label) => {
    const followers = new Map();
    for (let round = 0; round < CONFIG.scrollRounds && followers.size < CONFIG.maxFollowers; round++) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      for (const cell of cells) {
        if (followers.size >= CONFIG.maxFollowers) break;
        const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
        if (!link) continue;
        const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
        if (!match || ['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) continue;
        const username = match[1].toLowerCase();
        if (followers.has(username)) continue;
        const nameSpans = cell.querySelectorAll('a[href^="/"] span');
        const displayName = nameSpans.length > 0 ? nameSpans[0].textContent.trim() : match[1];
        followers.set(username, { username: match[1], displayName });
      }
      console.log(`   📜 ${label} — Round ${round + 1}: ${followers.size} followers`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    return followers;
  };

  const compare = () => {
    const [keyA, keyB] = Object.keys(datasets);
    if (!keyA || !keyB) {
      console.log('❌ Need both datasets. Run analyze() with two accounts.');
      return;
    }
    const a = datasets[keyA];
    const b = datasets[keyB];
    const aSet = new Set(a.keys());
    const bSet = new Set(b.keys());
    const shared = [...aSet].filter(u => bSet.has(u));
    const onlyA = [...aSet].filter(u => !bSet.has(u));
    const onlyB = [...bSet].filter(u => !aSet.has(u));
    const union = new Set([...aSet, ...bSet]);
    const overlapPct = ((shared.length / union.size) * 100).toFixed(1);

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  🔀 AUDIENCE OVERLAP ANALYSIS                  ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`\n  Account A: @${keyA} (${aSet.size} followers)`);
    console.log(`  Account B: @${keyB} (${bSet.size} followers)`);
    console.log(`  Shared:    ${shared.length}`);
    console.log(`  Only A:    ${onlyA.length}`);
    console.log(`  Only B:    ${onlyB.length}`);
    console.log(`  Overlap:   ${overlapPct}% (Jaccard)\n`);

    if (shared.length > 0) {
      console.log(`  👥 SHARED (${shared.length}): ${shared.slice(0, 15).map(u => '@' + (a.get(u)?.username || u)).join(', ')}${shared.length > 15 ? '...' : ''}`);
    }
    console.log(`  🅰️ ONLY @${keyA} (${onlyA.length}): ${onlyA.slice(0, 10).map(u => '@' + (a.get(u)?.username || u)).join(', ')}${onlyA.length > 10 ? '...' : ''}`);
    console.log(`  🅱️ ONLY @${keyB} (${onlyB.length}): ${onlyB.slice(0, 10).map(u => '@' + (b.get(u)?.username || u)).join(', ')}${onlyB.length > 10 ? '...' : ''}`);

    if (parseFloat(overlapPct) > 50) console.log('\n  💡 HIGH overlap — great collab partners.');
    else if (parseFloat(overlapPct) > 20) console.log('\n  💡 MODERATE overlap — cross-promo would help.');
    else console.log('\n  💡 LOW overlap — big opportunity for cross-pollination!');

    if (CONFIG.exportResults) {
      download({
        accountA: keyA, accountB: keyB,
        overlap: { shared: shared.length, onlyA: onlyA.length, onlyB: onlyB.length, jaccardPct: parseFloat(overlapPct) },
        sharedFollowers: shared.map(u => a.get(u)?.username || u),
        uniqueToA: onlyA.slice(0, 100).map(u => a.get(u)?.username || u),
        uniqueToB: onlyB.slice(0, 100).map(u => b.get(u)?.username || u),
        analyzedAt: new Date().toISOString(),
      }, `xactions-overlap-${keyA}-vs-${keyB}.json`);
    }
  };

  const analyze = async (accountA, accountB) => {
    const acctA = accountA || CONFIG.accounts[0];
    const acctB = accountB || CONFIG.accounts[1];
    if (acctA === 'accountA' || acctB === 'accountB') {
      console.log('❌ Set real account names in CONFIG or pass to analyze("acctA","acctB")');
      return;
    }

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🔀 AUDIENCE OVERLAP ANALYZER                  ║');
    console.log('║  by nichxbt — v1.0                            ║');
    console.log('╚════════════════════════════════════════════════╝');

    console.log(`\n📊 Scraping @${acctA}'s followers...`);
    window.location.href = `https://x.com/${acctA}/followers`;
    await sleep(4000);
    datasets[acctA] = await scrapeFollowers(acctA);
    console.log(`  ✅ @${acctA}: ${datasets[acctA].size} followers\n`);

    console.log(`📊 Scraping @${acctB}'s followers...`);
    window.location.href = `https://x.com/${acctB}/followers`;
    await sleep(4000);
    datasets[acctB] = await scrapeFollowers(acctB);
    console.log(`  ✅ @${acctB}: ${datasets[acctB].size} followers\n`);

    compare();
  };

  window.XActions = window.XActions || {};
  window.XActions.analyze = analyze;
  window.XActions.compare = compare;

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  🔀 AUDIENCE OVERLAP ANALYZER — Ready          ║');
  console.log('║  by nichxbt — v1.0                            ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n📋 Usage: XActions.analyze("accountA", "accountB")');
})();
