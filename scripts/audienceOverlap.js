// GENERATED FILE: a copy of browser/audienceOverlap.js, written by scripts/build-script-manifest.mjs. Edit browser/audienceOverlap.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔀 Audience Overlap Analyzer — Production Grade
 * ============================================================
 *
 * @name        audienceOverlap.js
 * @title       Audience Overlap
 * @description Compare two accounts' followers, or two pasted handle lists, to find shared and unique audiences and the overlap percentage.
 * @category    analytics
 * @page        x.com/<username>/followers or x.com/*
 * @writes      false
 * @aliases     scripts/audienceOverlap.js, scripts/twitter/audience-overlap.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: x.com/ACCOUNT_A/followers
 * 2. Paste script — it will scrape Account A's followers
 * 3. Run: XActions.switchTo('ACCOUNT_B')
 *    → navigates to Account B's followers and scrapes
 * 4. Run: XActions.compare() → see overlap analysis
 *
 * Or use the quick method:
 *   XActions.analyze('accountA', 'accountB')
 *   (with no arguments it uses CONFIG.accounts)
 *
 * List mode (any x.com page, no scraping):
 *   Put two arrays of handles in CONFIG.listA / CONFIG.listB, or two
 *   localStorage keys holding JSON arrays of handles in
 *   CONFIG.storageKeyA / storageKeyB, then paste browser/audienceOverlap.js.
 *   The comparison runs at once. Or call
 *   XActions.compareLists(['alice','bob'], ['bob','dave']).
 *   Set CONFIG.promptForLists = true to be asked for two comma-separated
 *   lists when neither is configured. The report is kept on
 *   window.xactionsOverlap.
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    scrollRounds: 8,
    scrollDelay: 2000,
    maxFollowers: 300,   // Per account (browser limitation)
    exportResults: true,

    // Default accounts for XActions.analyze() called with no arguments
    accounts: [],

    // ── List mode ─────────────────────────────────────────────
    // Two arrays of handles (with or without @, profile URLs, or objects with
    // a username/handle/screen_name field). When both resolve, the
    // comparison runs as soon as the script is pasted.
    listA: [],
    listB: [],
    labelA: 'A',              // Labels used in the report and filename
    labelB: 'B',
    storageKeyA: '',          // localStorage keys used when listA / listB are empty
    storageKeyB: '',
    printLimit: 20,           // Handle examples printed per section
    promptForLists: false,    // Ask for comma-separated lists when none are configured
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const datasets = { a: null, b: null };

  // ── Scrape visible followers ───────────────────────────────
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

        const verified = !!cell.querySelector('[data-testid="icon-verified"]') || !!cell.querySelector('svg[aria-label="Verified"]');

        // Bio snippet
        const textEls = cell.querySelectorAll('[dir="auto"]');
        let bio = '';
        for (const el of textEls) {
          const text = el.textContent.trim();
          if (text.length > 20 && !text.startsWith('@')) { bio = text.slice(0, 150); break; }
        }

        followers.set(username, { username: match[1], displayName, verified, bio });
      }

      console.log(`   📜 ${label} — Round ${round + 1}: ${followers.size} followers`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return followers;
  };

  // ── Compare two datasets ───────────────────────────────────
  const compareDatasets = () => {
    if (!datasets.a || !datasets.b) {
      console.log('❌ Need both datasets. Use XActions.analyze("accountA", "accountB") or scrape each individually.');
      return;
    }

    const aSet = new Set(datasets.a.followers.keys());
    const bSet = new Set(datasets.b.followers.keys());

    const shared = [...aSet].filter(u => bSet.has(u));
    const onlyA = [...aSet].filter(u => !bSet.has(u));
    const onlyB = [...bSet].filter(u => !aSet.has(u));
    const union = new Set([...aSet, ...bSet]);

    const overlapPct = ((shared.length / union.size) * 100).toFixed(1);
    const overlapOfA = ((shared.length / aSet.size) * 100).toFixed(1);
    const overlapOfB = ((shared.length / bSet.size) * 100).toFixed(1);

    const W = 60;
    console.log('\n╔' + '═'.repeat(W) + '╗');
    console.log('║  🔀 AUDIENCE OVERLAP ANALYSIS' + ' '.repeat(W - 31) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 OVERVIEW');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Account A: @${datasets.a.account} (${aSet.size} followers scraped)`);
    console.log(`  Account B: @${datasets.b.account} (${bSet.size} followers scraped)`);
    console.log(`  Shared followers:    ${shared.length}`);
    console.log(`  Only in A:           ${onlyA.length}`);
    console.log(`  Only in B:           ${onlyB.length}`);
    console.log(`  Total unique:        ${union.size}`);

    // Venn diagram (ASCII)
    console.log('\n  ┌─ VENN DIAGRAM ────────────────────────────────┐');
    const aBarLen = Math.round((onlyA.length / union.size) * 30);
    const sharedBarLen = Math.round((shared.length / union.size) * 30);
    const bBarLen = Math.round((onlyB.length / union.size) * 30);
    console.log(`  │ A only  ${'░'.repeat(aBarLen)}${'█'.repeat(sharedBarLen)}${'▒'.repeat(bBarLen)}  B only │`);
    console.log(`  │ ${onlyA.length}${' '.repeat(Math.max(0, 7 - String(onlyA.length).length))}` +
                `${'░ A only'.padEnd(aBarLen + 9)}` +
                `${'█ shared '.padEnd(sharedBarLen + 9)}` +
                `${'▒ B only'.padEnd(bBarLen + 9).slice(0, bBarLen + 9)}│`);
    console.log('  └─────────────────────────────────────────────────┘');

    // Overlap percentages
    console.log('\n━━━ 📊 OVERLAP METRICS ━━━');
    console.log(`  Jaccard similarity:       ${overlapPct}% (shared / union)`);
    console.log(`  Overlap % of A's base:    ${overlapOfA}%`);
    console.log(`  Overlap % of B's base:    ${overlapOfB}%`);

    // ── Shared followers detail ─────────────────────────────
    if (shared.length > 0) {
      console.log(`\n━━━ 👥 SHARED FOLLOWERS (${shared.length}) ━━━`);
      const sharedDetails = shared.map(u => {
        const aData = datasets.a.followers.get(u);
        return { username: aData.username, displayName: aData.displayName, verified: aData.verified };
      });
      const verifiedShared = sharedDetails.filter(s => s.verified);
      if (verifiedShared.length > 0) {
        console.log(`  ✅ Verified shared followers (${verifiedShared.length}):`);
        for (const v of verifiedShared.slice(0, 10)) {
          console.log(`     ✅ @${v.username} (${v.displayName})`);
        }
      }
      console.log(`  All shared: ${sharedDetails.slice(0, 15).map(s => '@' + s.username).join(', ')}${shared.length > 15 ? '...' : ''}`);
    }

    // ── Unique to each ──────────────────────────────────────
    console.log(`\n━━━ 🅰️ UNIQUE TO @${datasets.a.account} (${onlyA.length}) ━━━`);
    console.log(`  ${onlyA.slice(0, 15).map(u => '@' + (datasets.a.followers.get(u)?.username || u)).join(', ')}${onlyA.length > 15 ? '...' : ''}`);

    console.log(`\n━━━ 🅱️ UNIQUE TO @${datasets.b.account} (${onlyB.length}) ━━━`);
    console.log(`  ${onlyB.slice(0, 15).map(u => '@' + (datasets.b.followers.get(u)?.username || u)).join(', ')}${onlyB.length > 15 ? '...' : ''}`);

    // ── Insights ────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  💡 INSIGHTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (parseFloat(overlapPct) > 50) {
      console.log('  🤝 HIGH OVERLAP: These accounts share most of their audience.');
      console.log('     → Great collaboration partners (co-threads, spaces).');
      console.log('     → Content differentiation is key to avoid redundancy.');
    } else if (parseFloat(overlapPct) > 20) {
      console.log('  📊 MODERATE OVERLAP: Decent shared audience.');
      console.log('     → Cross-promotion would reach new audiences for both.');
      console.log('     → Mutual engagement would be noticed by shared followers.');
    } else {
      console.log('  🔀 LOW OVERLAP: Very different audiences.');
      console.log('     → Great opportunity for cross-pollination!');
      console.log('     → Guest content/collabs would expose each to new audiences.');
    }

    if (onlyB.length > onlyA.length * 2) {
      console.log(`  🎯 @${datasets.b.account} has ${onlyB.length} followers you don't reach.`);
      console.log('     → Consider engaging with their content to attract their audience.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Export
    if (CONFIG.exportResults) {
      const data = {
        accountA: { account: datasets.a.account, followerCount: aSet.size },
        accountB: { account: datasets.b.account, followerCount: bSet.size },
        overlap: {
          shared: shared.length,
          onlyA: onlyA.length,
          onlyB: onlyB.length,
          jaccardPct: parseFloat(overlapPct),
          overlapOfA: parseFloat(overlapOfA),
          overlapOfB: parseFloat(overlapOfB),
        },
        sharedFollowers: shared.map(u => datasets.a.followers.get(u)?.username || u),
        uniqueToA: onlyA.slice(0, 100).map(u => datasets.a.followers.get(u)?.username || u),
        uniqueToB: onlyB.slice(0, 100).map(u => datasets.b.followers.get(u)?.username || u),
        analyzedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-overlap-${datasets.a.account}-vs-${datasets.b.account}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Overlap analysis exported.');
    }
  };

  // ── List mode helpers ──────────────────────────────────────
  // Turn any handle-ish value into a clean lowercase key. Accepts strings
  // ("@alice", "/alice", "https://x.com/alice") and objects from scrapers.
  const normalizeHandle = (raw) => {
    let value = raw;
    if (value && typeof value === 'object') {
      value = value.username || value.handle || value.screen_name || value.screenName || '';
    }
    if (typeof value !== 'string') return null;
    let handle = value.trim();
    if (!handle) return null;
    const urlMatch = handle.match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/i);
    if (urlMatch) handle = urlMatch[1];
    handle = handle.replace(/^\//, '').replace(/^@/, '').split(/[/?#]/)[0].trim();
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null;
    return handle.toLowerCase();
  };

  // Build a Map of normalizedKey -> original display handle, dropping dupes.
  const toHandleMap = (list) => {
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((raw) => {
      const key = normalizeHandle(raw);
      if (!key || map.has(key)) return;
      const display = (raw && typeof raw === 'object')
        ? (raw.username || raw.handle || raw.screen_name || raw.screenName || key)
        : key;
      map.set(key, String(display).replace(/^@/, ''));
    });
    return map;
  };

  const readStorageList = (key) => {
    if (!key) return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.followers)) return parsed.followers;
      if (parsed && Array.isArray(parsed.handles)) return parsed.handles;
      return null;
    } catch (e) {
      console.log(`⚠️ Could not read localStorage key "${key}": ${e.message}`);
      return null;
    }
  };

  // ── Compare two handle lists ───────────────────────────────
  const compareLists = (listA, listB, labelA = CONFIG.labelA, labelB = CONFIG.labelB) => {
    const mapA = toHandleMap(listA);
    const mapB = toHandleMap(listB);

    if (mapA.size === 0 || mapB.size === 0) {
      console.log('❌ Both sets need at least one valid handle.');
      console.log(`   Parsed: "${labelA}" = ${mapA.size} handles, "${labelB}" = ${mapB.size} handles.`);
      console.log('   Set CONFIG.listA and CONFIG.listB to arrays of handles and run again.');
      return null;
    }

    const keysA = new Set(mapA.keys());
    const keysB = new Set(mapB.keys());
    const shared = [...keysA].filter((k) => keysB.has(k));
    const onlyA = [...keysA].filter((k) => !keysB.has(k));
    const onlyB = [...keysB].filter((k) => !keysA.has(k));
    const union = new Set([...keysA, ...keysB]);

    const jaccardPct = Math.round((shared.length / union.size) * 1000) / 10;
    const sharedOfAPct = Math.round((shared.length / keysA.size) * 1000) / 10;
    const sharedOfBPct = Math.round((shared.length / keysB.size) * 1000) / 10;

    const displayA = (k) => '@' + (mapA.get(k) || k);
    const displayB = (k) => '@' + (mapB.get(k) || k);
    const preview = (keys, disp) => keys.slice(0, CONFIG.printLimit).map(disp).join(', ') +
      (keys.length > CONFIG.printLimit ? ` ... (+${keys.length - CONFIG.printLimit} more)` : '');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🔀 AUDIENCE OVERLAP (lists)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Set "${labelA}": ${keysA.size} unique handles`);
    console.log(`  Set "${labelB}": ${keysB.size} unique handles`);
    console.log(`  Shared:        ${shared.length}`);
    console.log(`  Only in ${labelA}:    ${onlyA.length}`);
    console.log(`  Only in ${labelB}:    ${onlyB.length}`);
    console.log(`  Overlap (Jaccard):       ${jaccardPct}%`);
    console.log(`  Shared as % of "${labelA}":   ${sharedOfAPct}%`);
    console.log(`  Shared as % of "${labelB}":   ${sharedOfBPct}%`);

    if (shared.length > 0) {
      console.log(`\n  👥 SHARED (${shared.length}):`);
      console.log('     ' + preview(shared, displayA));
    }
    console.log(`\n  🅰️ ONLY IN "${labelA}" (${onlyA.length}):`);
    console.log('     ' + (onlyA.length ? preview(onlyA, displayA) : '(none)'));
    console.log(`\n  🅱️ ONLY IN "${labelB}" (${onlyB.length}):`);
    console.log('     ' + (onlyB.length ? preview(onlyB, displayB) : '(none)'));

    if (jaccardPct > 50) console.log('\n  💡 HIGH overlap. These audiences are largely the same crowd.');
    else if (jaccardPct > 20) console.log('\n  💡 MODERATE overlap. Cross-promotion would reach some new people.');
    else console.log('\n  💡 LOW overlap. Big opportunity for cross-pollination.');

    const report = {
      labelA,
      labelB,
      analyzedAt: new Date().toISOString(),
      counts: {
        setA: keysA.size,
        setB: keysB.size,
        shared: shared.length,
        onlyA: onlyA.length,
        onlyB: onlyB.length,
        union: union.size,
      },
      overlap: { jaccardPct, sharedOfAPct, sharedOfBPct },
      sharedHandles: shared.map(displayA).map((h) => h.slice(1)),
      uniqueToA: onlyA.map(displayA).map((h) => h.slice(1)),
      uniqueToB: onlyB.map(displayB).map((h) => h.slice(1)),
    };

    if (CONFIG.exportResults) {
      const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '');
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-overlap-${safe(labelA)}-vs-${safe(labelB)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Overlap analysis exported.');
    }

    window.xactionsOverlap = report;
    console.log('  Full report object: window.xactionsOverlap\n');
    return report;
  };

  // ── Controls ───────────────────────────────────────────────
  window.XActions = window.XActions || {};

  window.XActions.analyze = async (accountA, accountB) => {
    accountA = accountA || CONFIG.accounts[0];
    accountB = accountB || CONFIG.accounts[1];
    if (!accountA || !accountB) {
      console.log('❌ Usage: XActions.analyze("accountA", "accountB") or set CONFIG.accounts');
      return;
    }

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🔀 AUDIENCE OVERLAP ANALYZER                 ║');
    console.log('╚════════════════════════════════════════════════╝');

    // Scrape A
    console.log(`\n📊 Step 1: Scraping @${accountA}'s followers...\n`);
    window.location.href = `https://x.com/${accountA}/followers`;
    await sleep(4000);
    datasets.a = { account: accountA, followers: await scrapeFollowers('A') };
    console.log(`  ✅ @${accountA}: ${datasets.a.followers.size} followers scraped.\n`);

    // Scrape B
    console.log(`📊 Step 2: Scraping @${accountB}'s followers...\n`);
    window.location.href = `https://x.com/${accountB}/followers`;
    await sleep(4000);
    datasets.b = { account: accountB, followers: await scrapeFollowers('B') };
    console.log(`  ✅ @${accountB}: ${datasets.b.followers.size} followers scraped.\n`);

    // Compare
    console.log('📊 Step 3: Comparing...\n');
    compareDatasets();
  };

  window.XActions.scrapeHere = async (label) => {
    if (label !== 'a' && label !== 'b') {
      console.log('❌ Usage: XActions.scrapeHere("a") or XActions.scrapeHere("b")');
      return;
    }
    const match = window.location.href.match(/x\.com\/([A-Za-z0-9_]+)\/followers/);
    const account = match ? match[1] : 'unknown';
    console.log(`📊 Scraping ${label.toUpperCase()} (@${account})...\n`);
    datasets[label] = { account, followers: await scrapeFollowers(label.toUpperCase()) };
    console.log(`  ✅ @${account}: ${datasets[label].followers.size} followers scraped.`);
    if (datasets.a && datasets.b) {
      console.log('  Both datasets ready! Run: XActions.compare()');
    }
  };

  window.XActions.compare = compareDatasets;
  window.XActions.compareLists = compareLists;

  // ── Init ───────────────────────────────────────────────────
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  🔀 AUDIENCE OVERLAP ANALYZER — Ready             ║');
  console.log('║  by nichxbt — v1.0                                ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n📋 Quick method:');
  console.log('  XActions.analyze("accountA", "accountB")');
  console.log('\n📋 Manual method:');
  console.log('  1. Go to x.com/accountA/followers → XActions.scrapeHere("a")');
  console.log('  2. Go to x.com/accountB/followers → XActions.scrapeHere("b")');
  console.log('  3. XActions.compare()');
  console.log('\n📋 List mode:');
  console.log('  XActions.compareLists(["alice","bob"], ["bob","dave"])');

  // ── List mode autorun ──────────────────────────────────────
  // Resolve the two source lists in priority order:
  // 1) CONFIG arrays  2) localStorage keys  3) prompt (promptForLists only).
  let rawA = Array.isArray(CONFIG.listA) && CONFIG.listA.length ? CONFIG.listA : null;
  let rawB = Array.isArray(CONFIG.listB) && CONFIG.listB.length ? CONFIG.listB : null;
  if (!rawA && CONFIG.storageKeyA) rawA = readStorageList(CONFIG.storageKeyA);
  if (!rawB && CONFIG.storageKeyB) rawB = readStorageList(CONFIG.storageKeyB);

  if ((!rawA || !rawB) && CONFIG.promptForLists) {
    if (!rawA) {
      const inputA = window.prompt(`Paste comma-separated handles for set "${CONFIG.labelA}":`, '');
      rawA = inputA ? inputA.split(/[\s,]+/) : [];
    }
    if (!rawB) {
      const inputB = window.prompt(`Paste comma-separated handles for set "${CONFIG.labelB}":`, '');
      rawB = inputB ? inputB.split(/[\s,]+/) : [];
    }
  }

  if (rawA || rawB) {
    if (rawA && rawB) compareLists(rawA, rawB);
    else console.log('⚠️ List mode needs both CONFIG.listA and CONFIG.listB (or both storage keys).');
  }
})();
