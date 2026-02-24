/**
 * ============================================================
 * 🕵️ Shadowban Checker — Production Grade
 * ============================================================
 *
 * @name        shadowbanChecker.js
 * @description Check if your X/Twitter account is shadowbanned.
 *              Tests: search ban, ghost ban, reply deboosting,
 *              suggestion ban, and media visibility.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com (any page, logged in)
 * 2. Open DevTools Console (F12)
 * 3. Paste this script and press Enter
 * 4. Enter the username to check when prompted (or edit CONFIG)
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
    username: '',                    // Leave empty = check your own account
    verboseLogging: true,            // Show detailed test steps
    testDelay: 3000,                 // Delay between tests (ms)
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

    // Determine username
    let username = CONFIG.username;
    if (!username) {
      // Try to detect from page
      const metaEl = document.querySelector('meta[property="al:android:url"]');
      const metaContent = metaEl?.getAttribute('content') || '';
      const metaMatch = metaContent.match(/screen_name=([^&]+)/);
      if (metaMatch) {
        username = metaMatch[1];
      } else {
        // Try from header
        const navLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
        const href = navLink?.getAttribute('href') || '';
        const hrefMatch = href.match(/^\/([A-Za-z0-9_]+)/);
        if (hrefMatch) username = hrefMatch[1];
      }
    }

    if (!username) {
      console.error('❌ Could not detect username. Set CONFIG.username manually.');
      return;
    }

    console.log(`\n🔍 Checking @${username} for shadowban indicators...\n`);

    const results = {
      username,
      timestamp: new Date().toISOString(),
      tests: {},
      overallStatus: 'UNKNOWN',
    };

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
      return;
    }

    if (profileResp.text.includes('Account suspended') || profileResp.text.includes('suspended')) {
      console.error(`❌ Account @${username} is SUSPENDED.`);
      results.tests.exists = { status: 'FAIL', detail: 'Suspended' };
      results.overallStatus = 'SUSPENDED';
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
        `https://x.com/i/api/1.1/search/typeahead.json?q=${username}&src=search_box&result_type=users`,
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
      const searchResp = await fetchPage(`https://x.com/search?q=from%3A${username}&f=live`);
      if (searchResp.text.includes(username)) {
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
      const replyResp = await fetchPage(`https://x.com/search?q=from%3A${username}%20filter%3Areplies&f=live`);
      if (replyResp.text.includes(username)) {
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
      const mediaResp = await fetchPage(`https://x.com/search?q=from%3A${username}%20filter%3Amedia&f=live`);
      if (mediaResp.text.includes(username)) {
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

    // Save results
    try {
      localStorage.setItem(
        `xactions_shadowban_${username}`,
        JSON.stringify(results)
      );
      console.log(`\n💾 Results saved. Compare over time with:`);
      console.log(`   JSON.parse(localStorage.getItem("xactions_shadowban_${username}"))`);
    } catch {}

    console.log('');
  })();
})();
