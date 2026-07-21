// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔀 Audience Overlap - XActions
 * ============================================
 *
 * @name         audience-overlap
 * @description  Compare two follower/handle sets to find shared accounts, unique accounts, and overlap percentage.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Get two lists of handles (from the scrape-followers tool, a CSV, or by hand)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console) on any x.com page
 *   3. Paste your two handle lists into CONFIG.listA and CONFIG.listB
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   CONFIG.listA = ['alice','bob','carol']; CONFIG.listB = ['bob','carol','dave'];
 *   The report shows 2 shared (@bob, @carol), 1 unique to A (@alice), 1 unique
 *   to B (@dave), and a 50% Jaccard overlap, then downloads a JSON file.
 *
 *   You can also leave the lists empty and set CONFIG.storageKeyA /
 *   storageKeyB to two localStorage keys that hold JSON arrays of handles
 *   (the scrape-followers tool saves data this way). If both lists and keys
 *   are empty, the script prompts you to paste two comma-separated lists.
 *
 * ============================================
 */

(async function audienceOverlap() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // PRIMARY MODE: paste two arrays of handles here (with or without the @).
    // Example: ['alice', 'bob', '@carol']
    listA: [],
    listB: [],

    // Friendly labels for the two sets (used in the report and filename).
    labelA: 'A',
    labelB: 'B',

    // OPTIONAL MODE: if the arrays above are empty, read handles from these
    // localStorage keys instead. Each key must hold a JSON array of handles
    // or an array of objects with a `username`/`handle`/`screen_name` field.
    storageKeyA: '',
    storageKeyB: '',

    // How many handle examples to print per section.
    printLimit: 20,

    // Auto-download a JSON report when finished.
    exportResults: true
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  const download = (data, filename) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log.success(`Report downloaded: ${filename}`);
    } catch (e) {
      log.error(`Could not download report: ${e.message}`);
    }
  };

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
      log.warning(`Could not read localStorage key "${key}": ${e.message}`);
      return null;
    }
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔀 AUDIENCE OVERLAP - XActions                         ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Resolve the two source lists in priority order:
  // 1) CONFIG arrays  2) localStorage keys  3) interactive prompt.
  let rawA = Array.isArray(CONFIG.listA) && CONFIG.listA.length ? CONFIG.listA : null;
  let rawB = Array.isArray(CONFIG.listB) && CONFIG.listB.length ? CONFIG.listB : null;

  if (!rawA && CONFIG.storageKeyA) rawA = readStorageList(CONFIG.storageKeyA);
  if (!rawB && CONFIG.storageKeyB) rawB = readStorageList(CONFIG.storageKeyB);

  if (!rawA || !rawB) {
    log.warning('No lists in CONFIG and no usable localStorage keys. Falling back to a prompt.');
    if (!rawA) {
      const inputA = window.prompt(`Paste comma-separated handles for set "${CONFIG.labelA}":`, '');
      rawA = inputA ? inputA.split(/[\s,]+/) : [];
    }
    if (!rawB) {
      const inputB = window.prompt(`Paste comma-separated handles for set "${CONFIG.labelB}":`, '');
      rawB = inputB ? inputB.split(/[\s,]+/) : [];
    }
  }

  const mapA = toHandleMap(rawA);
  const mapB = toHandleMap(rawB);

  if (mapA.size === 0 || mapB.size === 0) {
    log.error('Both sets need at least one valid handle.');
    log.info(`Parsed: "${CONFIG.labelA}" = ${mapA.size} handles, "${CONFIG.labelB}" = ${mapB.size} handles.`);
    log.info('Set CONFIG.listA and CONFIG.listB to arrays of handles and run again.');
    return;
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

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log('');
  console.log('━'.repeat(60));
  console.log('🔀 AUDIENCE OVERLAP');
  console.log('━'.repeat(60));
  console.log(`   Set "${CONFIG.labelA}": ${keysA.size} unique handles`);
  console.log(`   Set "${CONFIG.labelB}": ${keysB.size} unique handles`);
  console.log('');
  console.log(`   Shared:        ${shared.length}`);
  console.log(`   Only in ${CONFIG.labelA}:    ${onlyA.length}`);
  console.log(`   Only in ${CONFIG.labelB}:    ${onlyB.length}`);
  console.log('');
  console.log(`   Overlap (Jaccard):       ${jaccardPct}%`);
  console.log(`   Shared as % of "${CONFIG.labelA}":   ${sharedOfAPct}%`);
  console.log(`   Shared as % of "${CONFIG.labelB}":   ${sharedOfBPct}%`);

  const preview = (keys, disp) => keys.slice(0, CONFIG.printLimit).map(disp).join(', ') + (keys.length > CONFIG.printLimit ? ` ... (+${keys.length - CONFIG.printLimit} more)` : '');

  if (shared.length > 0) {
    console.log('');
    console.log(`👥 SHARED (${shared.length}):`);
    console.log('   ' + preview(shared, displayA));
  }
  console.log('');
  console.log(`🅰️ ONLY IN "${CONFIG.labelA}" (${onlyA.length}):`);
  console.log('   ' + (onlyA.length ? preview(onlyA, displayA) : '(none)'));
  console.log('');
  console.log(`🅱️ ONLY IN "${CONFIG.labelB}" (${onlyB.length}):`);
  console.log('   ' + (onlyB.length ? preview(onlyB, displayB) : '(none)'));

  console.log('');
  if (jaccardPct > 50) log.info('HIGH overlap. These audiences are largely the same crowd.');
  else if (jaccardPct > 20) log.info('MODERATE overlap. Cross-promotion would reach some new people.');
  else log.info('LOW overlap. Big opportunity for cross-pollination.');

  const report = {
    labelA: CONFIG.labelA,
    labelB: CONFIG.labelB,
    analyzedAt: new Date().toISOString(),
    counts: {
      setA: keysA.size,
      setB: keysB.size,
      shared: shared.length,
      onlyA: onlyA.length,
      onlyB: onlyB.length,
      union: union.size
    },
    overlap: { jaccardPct, sharedOfAPct, sharedOfBPct },
    sharedHandles: shared.map(displayA).map((h) => h.slice(1)),
    uniqueToA: onlyA.map(displayA).map((h) => h.slice(1)),
    uniqueToB: onlyB.map(displayB).map((h) => h.slice(1))
  };

  if (CONFIG.exportResults) {
    console.log('');
    const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '');
    download(report, `xactions-overlap-${safe(CONFIG.labelA)}-vs-${safe(CONFIG.labelB)}.json`);
  }

  window.xactionsOverlap = report;
  console.log('');
  log.info('Full report object: window.xactionsOverlap');
  log.success('Done.');

  return report;
})();
