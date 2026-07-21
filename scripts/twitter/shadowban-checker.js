// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🕵️ Shadowban Checker - XActions
 * ============================================
 *
 * @name         shadowban-checker
 * @description  Run heuristic shadowban checks (suggestion ban, search ban, reply deboost) for an X handle from your own logged-in session.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to any x.com page while logged in (x.com/home works fine)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) set CONFIG.username to the handle you want to check
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Leave CONFIG.username as 'auto' to check your own account, or set
 *   username: 'jack' to check @jack. The script prints PASS/WARN/FAIL for
 *   each heuristic and an overall read like "POSSIBLY SHADOWBANNED", then
 *   downloads a JSON report. These are heuristics, not an official verdict.
 *
 * ============================================
 */

(async function shadowbanChecker() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Handle to check. 'auto' detects the logged-in account from the page.
    // Set to a bare handle (no @) to check any public account.
    username: 'auto',

    // Delay between the individual checks (ms). Keep this polite so X does
    // not rate-limit the read requests.
    testDelay: 2500,

    // Auto-download a JSON report of the results when finished.
    exportResults: true
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    unknown: (msg) => console.log(`❓ ${msg}`)
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

  // Fetch a page's HTML in the current session. Used for search-visibility
  // heuristics: we cannot see X's internal ranking, only whether the handle
  // shows up in the returned markup.
  const fetchPage = async (url) => {
    try {
      const resp = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'text/html,application/xhtml+xml' }
      });
      if (!resp.ok) return { status: resp.status, text: '' };
      return { status: resp.status, text: await resp.text() };
    } catch (e) {
      return { status: 0, text: '', error: e.message };
    }
  };

  // Detect the logged-in handle from the nav profile link or a meta tag.
  const detectUsername = () => {
    const navLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    const href = navLink?.getAttribute('href') || '';
    const navMatch = href.match(/^\/([A-Za-z0-9_]+)/);
    if (navMatch) return navMatch[1];

    const meta = document.querySelector('meta[property="al:android:url"]');
    const metaMatch = meta?.getAttribute('content')?.match(/screen_name=([^&]+)/);
    if (metaMatch) return metaMatch[1];

    return null;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🕵️ SHADOWBAN CHECKER - XActions                        ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: any x.com / twitter.com page works because we only issue
  // read requests, but we do need to be on the site for session cookies.
  if (!/(^|\.)x\.com$/.test(location.hostname) && !/(^|\.)twitter\.com$/.test(location.hostname)) {
    log.warning('Not on x.com. Open x.com (any page, logged in) and run this again.');
    return;
  }

  const username = CONFIG.username === 'auto' ? detectUsername() : CONFIG.username.replace(/^@/, '').trim();
  if (!username) {
    log.error('Could not detect your username. Set CONFIG.username manually (without the @).');
    return;
  }

  log.info(`Checking @${username} for shadowban indicators`);
  log.warning('These are HEURISTICS, not an official ruling. X does not expose real');
  log.warning('shadowban status. Treat the result as a signal, not proof.');
  console.log('');

  const results = {
    username,
    timestamp: new Date().toISOString(),
    disclaimer: 'Heuristic checks run from the browser. Not an official or definitive shadowban verdict.',
    tests: {},
    overallStatus: 'UNKNOWN'
  };

  // ── Test 1: Account existence ────────────────
  log.info('Test 1: Account existence');
  const profileResp = await fetchPage(`https://x.com/${username}`);
  if (profileResp.status === 404 || /Account suspended/i.test(profileResp.text)) {
    results.tests.exists = { status: 'FAIL', detail: 'Account not found or suspended' };
    results.overallStatus = 'SUSPENDED / NOT FOUND';
    log.error('Account not found or suspended. Stopping.');
    if (CONFIG.exportResults) download(results, `xactions-shadowban-${username}-${new Date().toISOString().slice(0, 10)}.json`);
    return;
  }
  results.tests.exists = { status: 'PASS', detail: 'Account exists and is active' };
  log.success('Account exists and is active');
  await sleep(CONFIG.testDelay);

  // ── Test 2: Search suggestion ban ────────────
  // Heuristic: query the typeahead for the handle and see whether it comes
  // back. A missing handle can mean a suggestion ban, but can also just be a
  // low-signal or brand-new account.
  console.log('');
  log.info('Test 2: Search suggestion ban (typeahead)');
  try {
    const resp = await fetch(
      `https://x.com/i/api/1.1/search/typeahead.json?q=${encodeURIComponent(username)}&src=search_box&result_type=users`,
      { credentials: 'include', headers: { 'x-twitter-active-user': 'yes' } }
    );
    if (resp.ok) {
      const data = await resp.json();
      const found = Array.isArray(data.users) && data.users.some(
        (u) => u.screen_name?.toLowerCase() === username.toLowerCase()
      );
      results.tests.suggestion = {
        status: found ? 'PASS' : 'WARN',
        detail: found ? 'Appears in search suggestions' : 'Not appearing in suggestions (possible suggestion ban)'
      };
      if (found) log.success('Appears in search suggestions');
      else log.warning('Not appearing in suggestions. Possible suggestion ban (or just low signal).');
    } else {
      results.tests.suggestion = { status: 'UNKNOWN', detail: `Typeahead API returned ${resp.status}` };
      log.unknown(`Could not check (typeahead API ${resp.status})`);
    }
  } catch (e) {
    results.tests.suggestion = { status: 'UNKNOWN', detail: e.message };
    log.unknown(`Could not check: ${e.message}`);
  }
  await sleep(CONFIG.testDelay);

  // ── Test 3: Search ban ───────────────────────
  // Heuristic: request the live search for from:<handle> and check whether
  // the handle shows up in the returned HTML. The rendered search page is
  // JS-driven, so this is a coarse signal only.
  console.log('');
  log.info('Test 3: Search ban (tweet visibility in from: search)');
  try {
    const resp = await fetchPage(`https://x.com/search?q=${encodeURIComponent('from:' + username)}&f=live`);
    const found = new RegExp(`[/@]${username}\\b`, 'i').test(resp.text) || resp.text.toLowerCase().includes(username.toLowerCase());
    results.tests.searchBan = {
      status: found ? 'PASS' : 'WARN',
      detail: found ? 'Handle appears in its own from: search markup' : 'Handle may not appear in search (possible search ban)'
    };
    if (found) log.success('Handle appears in its own from: search');
    else log.warning('Handle may not appear in search. Possible search ban.');
  } catch (e) {
    results.tests.searchBan = { status: 'UNKNOWN', detail: e.message };
    log.unknown(`Could not check: ${e.message}`);
  }
  await sleep(CONFIG.testDelay);

  // ── Test 4: Reply deboost hint ───────────────
  // Heuristic: check whether the account's replies show up in a replies-only
  // search. A miss hints at reply deboosting but is far from conclusive.
  console.log('');
  log.info('Test 4: Reply deboost hint (replies in search)');
  try {
    const resp = await fetchPage(`https://x.com/search?q=${encodeURIComponent('from:' + username + ' filter:replies')}&f=live`);
    const found = resp.text.toLowerCase().includes(username.toLowerCase());
    results.tests.replyDeboost = {
      status: found ? 'PASS' : 'WARN',
      detail: found ? 'Replies appear visible in search' : 'Replies may be hidden (possible reply deboost)'
    };
    if (found) log.success('Replies appear visible in search');
    else log.warning('Replies may be hidden. Possible reply deboost.');
  } catch (e) {
    results.tests.replyDeboost = { status: 'UNKNOWN', detail: e.message };
    log.unknown(`Could not check: ${e.message}`);
  }

  // ── Overall assessment ───────────────────────
  const testList = Object.values(results.tests);
  const fails = testList.filter((t) => t.status === 'FAIL').length;
  const warns = testList.filter((t) => t.status === 'WARN').length;

  if (fails > 0) results.overallStatus = 'LIKELY SHADOWBANNED';
  else if (warns >= 2) results.overallStatus = 'POSSIBLY SHADOWBANNED';
  else if (warns === 1) results.overallStatus = 'MINOR SIGNALS';
  else results.overallStatus = 'CLEAN (no signals detected)';

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log('');
  console.log('━'.repeat(60));
  console.log(`📊 SHADOWBAN HEURISTIC REPORT: @${username}`);
  console.log('━'.repeat(60));
  for (const [name, result] of Object.entries(results.tests)) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : result.status === 'WARN' ? '⚠️' : '❓';
    console.log(`   ${icon} ${name.padEnd(14)} ${result.detail}`);
  }
  const statusIcon = results.overallStatus.startsWith('CLEAN') ? '✅'
    : results.overallStatus.includes('LIKELY') ? '❌' : '⚠️';
  console.log('');
  console.log(`   ${statusIcon} Overall: ${results.overallStatus}`);
  console.log('');
  console.log('   ℹ️ Reminder: these are browser-side heuristics. A WARN can be caused');
  console.log('      by a new/low-activity account, a private profile, or a rate limit,');
  console.log('      not only by a real shadowban.');

  if (!results.overallStatus.startsWith('CLEAN')) {
    console.log('');
    console.log('💡 If you see repeated signals:');
    console.log('   1. Pause automated activity for 48-72 hours.');
    console.log('   2. Remove content that may violate the rules.');
    console.log('   3. Verify your email and phone number.');
    console.log('   4. Engage naturally: like, reply, browse.');
  }

  // Save a rolling history in localStorage for later comparison.
  try {
    const key = `xactions_shadowban_${username}`;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.push(results);
    localStorage.setItem(key, JSON.stringify(history.slice(-30)));
    console.log('');
    log.info(`Snapshot saved. Retrieve: JSON.parse(localStorage.getItem("${key}"))`);
  } catch (e) {
    log.warning(`Could not save snapshot: ${e.message}`);
  }

  if (CONFIG.exportResults) {
    console.log('');
    download(results, `xactions-shadowban-${username}-${new Date().toISOString().slice(0, 10)}.json`);
  }

  window.xactionsShadowban = results;
  console.log('');
  log.info('Full result object: window.xactionsShadowban');

  return results;
})();
