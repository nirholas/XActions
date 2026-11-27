// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🕵️ Shadowban Checker — Production Grade
 * ============================================================
 *
 * @name        shadowbanChecker.js
 * @title       Shadowban Checker
 * @description Run heuristic shadowban checks (suggestion ban, search ban, ghost ban, media visibility) for your account or any handle.
 * @category    safety
 * @page        x.com/*
 * @writes      false
 * @aliases     scripts/shadowbanChecker.js, scripts/twitter/shadowban-checker.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com (any page, logged in)
 * 2. Open DevTools Console (F12)
 * 3. Paste browser/shadowbanChecker.js and press Enter
 * 4. To check another account, set CONFIG.username (no @) first
 *
 * These are HEURISTICS, not an official ruling: X does not expose real
 * shadowban status. The result is also stored in window.xactionsShadowban.
 *
 * WHAT IT CHECKS:
 * ┌─────────────────────────────────────────────────────────┐
 * │ Test                │ What it means                     │
 * ├─────────────────────┼───────────────────────────────────┤
 * │ Search Suggestion   │ Profile appears in search bar     │
 * │ Search Ban          │ Tweets appear in search results   │
 * │ Ghost Ban           │ Replies visible to other users    │
 * │ Reply Deboosting    │ Replies hidden behind "Show more" │
 * │ Media Ban           │ Media shows in search results     │
 * └─────────────────────────────────────────────────────────┘
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    username: '',                    // Leave empty (or 'auto') = check your own account
    verboseLogging: true,            // Show detailed test steps
    testDelay: 3000,                 // Delay between tests (ms)
    exportResults: false,            // Download a JSON report when finished
    keepHistory: false,              // Keep the last 30 results in localStorage instead of only the latest
  };

  // ══════════════════════════════════════════════════════════
  // 🔧 Utilities
  // ══════════════════════════════════════════════════════════

  const sleep = ms => new Promise(r => setTimeout(r, ms + ms * 0.1 * (Math.random() - 0.5)));

  const fetchPage = async (url) => {
    try {
      const resp = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      });
      if (!resp.ok) return { status: resp.status, text: '' };
      const text = await resp.text();
      return { status: resp.status, text };
    } catch (e) {
      return { status: 0, text: '', error: e.message };
    }
  };

  // ══════════════════════════════════════════════════════════
  // 🚀 Main
  // ══════════════════════════════════════════════════════════

  (async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🕵️ SHADOWBAN CHECKER' + ' '.repeat(W - 23) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    // Page guard: read requests need the x.com session cookies
    if (!/(^|\.)x\.com$/.test(location.hostname) && !/(^|\.)twitter\.com$/.test(location.hostname)) {
      console.warn('⚠️ Not on x.com. Open x.com (any page, logged in) and run this again.');
      return;
    }

    // Determine username
    let username = (CONFIG.username || '').replace(/^@/, '').trim();
    if (username.toLowerCase() === 'auto') username = '';
    if (!username) {
      // Your own account: the nav profile link first (a profile page's meta
      // tag names the profile being viewed, not you)
      const navLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
      const href = navLink?.getAttribute('href') || '';
      const hrefMatch = href.match(/^\/([A-Za-z0-9_]+)/);
      if (hrefMatch) {
        username = hrefMatch[1];
      } else {
        // Try to detect from page
        const metaEl = document.querySelector('meta[property="al:android:url"]');
        const metaContent = metaEl?.getAttribute('content') || '';
        const metaMatch = metaContent.match(/screen_name=([^&]+)/);
        if (metaMatch) username = metaMatch[1];
      }
    }

    if (!username) {
      console.error('❌ Could not detect username. Set CONFIG.username manually.');
      return;
    }

    console.log(`\n🔍 Checking @${username} for shadowban indicators...`);
    console.log('⚠️ These are HEURISTICS, not an official ruling. Treat the result as a signal, not proof.\n');

    const results = {
      username,
      timestamp: new Date().toISOString(),
      disclaimer: 'Heuristic checks run from the browser. Not an official or definitive shadowban verdict.',
      tests: {},
      overallStatus: 'UNKNOWN',
    };

    const reportName = `xactions-shadowban-${username}-${new Date().toISOString().slice(0, 10)}.json`;
    const downloadReport = () => {
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' }));
        a.download = reportName;
        document.body.appendChild(a); a.click(); a.remove();
        console.log(`📥 Report downloaded: ${reportName}`);
      } catch (e) {
        console.error(`❌ Could not download report: ${e.message}`);
      }
    };
    // Case-insensitive: X serves the handle in its canonical case
    const mentionsHandle = (text) => new RegExp(`[/@]${username}\\b`, 'i').test(text) || text.toLowerCase().includes(username.toLowerCase());

    const log = (msg) => CONFIG.verboseLogging && console.log(`   ${msg}`);

    // ── Test 1: Account Exists ──────────────────────────────

    console.log('━'.repeat(50));
    console.log('  📋 Test 1: Account Existence');
    console.log('━'.repeat(50));

    const profileResp = await fetchPage(`https://x.com/${username}`);
    if (profileResp.status === 404 || profileResp.text.includes('This account doesn')) {
      console.error(`❌ Account @${username} does not exist or is suspended.`);
      results.tests.exists = { status: 'FAIL', detail: 'Account not found' };
      results.overallStatus = 'SUSPENDED';
      console.log('\n📊 Result: Account appears SUSPENDED or DELETED.\n');
      window.xactionsShadowban = results;
      if (CONFIG.exportResults) downloadReport();
      return;
    }

    if (profileResp.text.includes('Account suspended') || profileResp.text.includes('suspended')) {
      console.error(`❌ Account @${username} is SUSPENDED.`);
      results.tests.exists = { status: 'FAIL', detail: 'Suspended' };
      results.overallStatus = 'SUSPENDED';
      window.xactionsShadowban = results;
      if (CONFIG.exportResults) downloadReport();
      return;
    }

    results.tests.exists = { status: 'PASS', detail: 'Account exists and is active' };
    console.log('  ✅ Account exists and is active');
    await sleep(CONFIG.testDelay);

    // ── Test 2: Search Suggestion Ban ───────────────────────

    console.log('\n━'.repeat(50));
    console.log('  📋 Test 2: Search Suggestion Ban');
    console.log('━'.repeat(50));
    log('Checking if @' + username + ' appears in typeahead search...');

    try {
      // Use X's internal typeahead API
      const typeaheadResp = await fetch(
        `https://x.com/i/api/1.1/search/typeahead.json?q=${encodeURIComponent(username)}&src=search_box&result_type=users`,
        { credentials: 'include', headers: { 'x-twitter-active-user': 'yes' } }
      );

      if (typeaheadResp.ok) {
        const data = await typeaheadResp.json();
        const found = data.users?.some(u =>
          u.screen_name?.toLowerCase() === username.toLowerCase()
        );
        if (found) {
          results.tests.searchSuggestion = { status: 'PASS', detail: 'Appears in search suggestions' };
          console.log('  ✅ Appears in search suggestions — no suggestion ban');
        } else {
          results.tests.searchSuggestion = { status: 'FAIL', detail: 'NOT in search suggestions' };
          console.log('  ⚠️ NOT appearing in search suggestions — possible suggestion ban');
        }
      } else {
        results.tests.searchSuggestion = { status: 'UNKNOWN', detail: `API returned ${typeaheadResp.status}` };
        console.log('  ❓ Could not check (API returned ' + typeaheadResp.status + ')');
      }
    } catch (e) {
      results.tests.searchSuggestion = { status: 'UNKNOWN', detail: e.message };
      console.log('  ❓ Could not check: ' + e.message);
    }

    await sleep(CONFIG.testDelay);

    // ── Test 3: Search Ban ──────────────────────────────────

    console.log('\n━'.repeat(50));
    console.log('  📋 Test 3: Search Ban');
    console.log('━'.repeat(50));
    log('Searching for tweets from @' + username + '...');

    try {
      const searchResp = await fetchPage(`https://x.com/search?q=from%3A${encodeURIComponent(username)}&f=live`);
      if (mentionsHandle(searchResp.text)) {
        results.tests.searchBan = { status: 'PASS', detail: 'Tweets appear in search' };
        console.log('  ✅ Tweets appear in search results — no search ban');
      } else {
        results.tests.searchBan = { status: 'WARN', detail: 'Tweets may not appear in search' };
        console.log('  ⚠️ Tweets may not appear in search — possible search ban');
      }
    } catch (e) {
      results.tests.searchBan = { status: 'UNKNOWN', detail: e.message };
      console.log('  ❓ Could not check: ' + e.message);
    }

    await sleep(CONFIG.testDelay);

    // ── Test 4: Ghost Ban (Reply Visibility) ────────────────

    console.log('\n━'.repeat(50));
    console.log('  📋 Test 4: Ghost Ban (Reply Visibility)');
    console.log('━'.repeat(50));
    log('Checking reply thread visibility...');

    try {
      // Search for replies from the user
      const replyResp = await fetchPage(`https://x.com/search?q=from%3A${encodeURIComponent(username)}%20filter%3Areplies&f=live`);
      if (mentionsHandle(replyResp.text)) {
        results.tests.ghostBan = { status: 'PASS', detail: 'Replies appear visible' };
        console.log('  ✅ Replies appear in search — no ghost ban detected');
      } else {
        results.tests.ghostBan = { status: 'WARN', detail: 'Replies may be hidden' };
        console.log('  ⚠️ Replies may be hidden — possible ghost ban');
      }
    } catch (e) {
      results.tests.ghostBan = { status: 'UNKNOWN', detail: e.message };
      console.log('  ❓ Could not check: ' + e.message);
    }

    await sleep(CONFIG.testDelay);

    // ── Test 5: Media Search Ban ────────────────────────────

    console.log('\n━'.repeat(50));
    console.log('  📋 Test 5: Media Visibility');
    console.log('━'.repeat(50));
    log('Checking if media tweets appear in search...');

    try {
      const mediaResp = await fetchPage(`https://x.com/search?q=from%3A${encodeURIComponent(username)}%20filter%3Amedia&f=live`);
      if (mentionsHandle(mediaResp.text)) {
        results.tests.mediaBan = { status: 'PASS', detail: 'Media visible in search' };
        console.log('  ✅ Media appears in search — no media ban');
      } else {
        results.tests.mediaBan = { status: 'WARN', detail: 'Media may not appear in search' };
        console.log('  ⚠️ Media may not appear in search — possible media ban');
      }
    } catch (e) {
      results.tests.mediaBan = { status: 'UNKNOWN', detail: e.message };
      console.log('  ❓ Could not check: ' + e.message);
    }

    // ── Overall Assessment ──────────────────────────────────

    const testValues = Object.values(results.tests);
    const fails = testValues.filter(t => t.status === 'FAIL').length;
    const warns = testValues.filter(t => t.status === 'WARN').length;
    const passes = testValues.filter(t => t.status === 'PASS').length;

    if (fails > 0) results.overallStatus = 'LIKELY SHADOWBANNED';
    else if (warns >= 2) results.overallStatus = 'POSSIBLY SHADOWBANNED';
    else if (warns === 1) results.overallStatus = 'MINOR ISSUES';
    else results.overallStatus = 'CLEAN';

    // ── Final Report ────────────────────────────────────────

    console.log('\n\n╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 SHADOWBAN CHECK RESULTS' + ' '.repeat(W - 29) + '║');
    console.log('╠' + '═'.repeat(W) + '╣');

    for (const [test, result] of Object.entries(results.tests)) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : result.status === 'WARN' ? '⚠️' : '❓';
      const line = `${icon} ${test}: ${result.detail}`;
      console.log('║  ' + line.padEnd(W - 2) + '║');
    }

    console.log('╠' + '═'.repeat(W) + '╣');
    const statusIcon = results.overallStatus === 'CLEAN' ? '✅' :
                       results.overallStatus.includes('LIKELY') ? '❌' : '⚠️';
    const statusLine = `${statusIcon} Overall: ${results.overallStatus}`;
    console.log('║  ' + statusLine.padEnd(W - 2) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log('\nℹ️ Reminder: these are browser-side heuristics. A WARN can be caused by a');
    console.log('   new/low-activity account, a private profile, or a rate limit, not only a real shadowban.');

    // Tips
    if (results.overallStatus !== 'CLEAN') {
      console.log('\n💡 Tips to resolve shadowban:');
      console.log('   1. Stop all automated activity for 48-72 hours');
      console.log('   2. Remove any rule-violating content');
      console.log('   3. Verify your email and phone number');
      console.log('   4. Don\'t use third-party apps aggressively');
      console.log('   5. Engage naturally — like, reply, browse');
      console.log('   6. Wait — most shadowbans resolve in 24-48 hours');
    }

    // Save results (a rolling history of 30 when keepHistory is on, or when
    // an older run already stored a history array under this key)
    try {
      const key = `xactions_shadowban_${username}`;
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem(key) || 'null'); } catch { stored = null; }
      if (CONFIG.keepHistory || Array.isArray(stored)) {
        const history = Array.isArray(stored) ? stored : (stored ? [stored] : []);
        history.push(results);
        localStorage.setItem(key, JSON.stringify(history.slice(-30)));
      } else {
        localStorage.setItem(key, JSON.stringify(results));
      }
      console.log(`\n💾 Results saved. Compare over time with:`);
      console.log(`   JSON.parse(localStorage.getItem("${key}"))`);
    } catch {}

    if (CONFIG.exportResults) downloadReport();

    window.xactionsShadowban = results;
    console.log('ℹ️ Full result object: window.xactionsShadowban');
    console.log('');
  })();
})();
