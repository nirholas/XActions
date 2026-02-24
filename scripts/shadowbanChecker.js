// scripts/shadowbanChecker.js
// Browser console script for checking if your X/Twitter account is shadowbanned
// Paste in DevTools console on x.com (any page, logged in)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    username: 'auto',         // 'auto' to detect from page, or set manually
    testDelay: 2500,          // Delay between tests (ms)
  };
  // =============================================

  const fetchPage = async (url) => {
    try {
      const resp = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'text/html,application/xhtml+xml' },
      });
      if (!resp.ok) return { status: resp.status, text: '' };
      return { status: resp.status, text: await resp.text() };
    } catch (e) {
      return { status: 0, text: '', error: e.message };
    }
  };

  const detectUsername = () => {
    // Try nav bar profile link
    const navLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    const href = navLink?.getAttribute('href') || '';
    const match = href.match(/^\/([A-Za-z0-9_]+)/);
    if (match) return match[1];
    // Try meta tag
    const meta = document.querySelector('meta[property="al:android:url"]');
    const metaMatch = meta?.content?.match(/screen_name=([^&]+)/);
    if (metaMatch) return metaMatch[1];
    return null;
  };

  const run = async () => {
    console.log('🕵️ SHADOWBAN CHECKER — XActions by nichxbt');
    console.log('━'.repeat(50));

    // Determine username
    const username = CONFIG.username === 'auto' ? detectUsername() : CONFIG.username;
    if (!username) {
      console.error('❌ Could not detect username. Set CONFIG.username manually.');
      return;
    }

    console.log(`\n🔍 Checking @${username} for shadowban indicators...\n`);

    const results = {
      username,
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // ── Test 1: Account Existence ───────────────
    console.log('📋 Test 1: Account Existence');
    const profileResp = await fetchPage(`https://x.com/${username}`);
    if (profileResp.status === 404 || profileResp.text.includes('Account suspended')) {
      console.error('❌ Account not found or suspended.');
      results.tests.exists = { status: 'FAIL', detail: 'Account not found / suspended' };
      results.overallStatus = 'SUSPENDED';
      return;
    }
    results.tests.exists = { status: 'PASS', detail: 'Account exists and is active' };
    console.log('   ✅ Account exists and is active');
    await sleep(CONFIG.testDelay);

    // ── Test 2: Search Suggestion Ban ────────────
    console.log('\n📋 Test 2: Search Suggestion Ban');
    try {
      const resp = await fetch(
        `https://x.com/i/api/1.1/search/typeahead.json?q=${username}&src=search_box&result_type=users`,
        { credentials: 'include', headers: { 'x-twitter-active-user': 'yes' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        const found = data.users?.some(u => u.screen_name?.toLowerCase() === username.toLowerCase());
        results.tests.suggestion = { status: found ? 'PASS' : 'FAIL', detail: found ? 'Appears in suggestions' : 'NOT in suggestions' };
        console.log(found ? '   ✅ Appears in search suggestions' : '   ⚠️ NOT appearing in suggestions — possible suggestion ban');
      } else {
        results.tests.suggestion = { status: 'UNKNOWN', detail: `API ${resp.status}` };
        console.log(`   ❓ Could not check (API ${resp.status})`);
      }
    } catch (e) {
      results.tests.suggestion = { status: 'UNKNOWN', detail: e.message };
      console.log('   ❓ Could not check: ' + e.message);
    }
    await sleep(CONFIG.testDelay);

    // ── Test 3: Search Ban ──────────────────────
    console.log('\n📋 Test 3: Search Ban (Tweet Visibility)');
    try {
      const resp = await fetchPage(`https://x.com/search?q=from%3A${username}&f=live`);
      const found = resp.text.includes(username);
      results.tests.searchBan = { status: found ? 'PASS' : 'WARN', detail: found ? 'Tweets appear in search' : 'Tweets may not appear' };
      console.log(found ? '   ✅ Tweets appear in search results' : '   ⚠️ Tweets may not appear — possible search ban');
    } catch (e) {
      results.tests.searchBan = { status: 'UNKNOWN', detail: e.message };
      console.log('   ❓ Could not check: ' + e.message);
    }
    await sleep(CONFIG.testDelay);

    // ── Test 4: Reply Deboosting ─────────────────
    console.log('\n📋 Test 4: Reply Deboosting');
    try {
      const resp = await fetchPage(`https://x.com/search?q=from%3A${username}%20filter%3Areplies&f=live`);
      const found = resp.text.includes(username);
      results.tests.replyDeboosting = { status: found ? 'PASS' : 'WARN', detail: found ? 'Replies visible' : 'Replies may be hidden' };
      console.log(found ? '   ✅ Replies appear visible' : '   ⚠️ Replies may be hidden — possible reply deboosting');
    } catch (e) {
      results.tests.replyDeboosting = { status: 'UNKNOWN', detail: e.message };
      console.log('   ❓ Could not check: ' + e.message);
    }

    // ── Overall Assessment ──────────────────────
    const tests = Object.values(results.tests);
    const fails = tests.filter(t => t.status === 'FAIL').length;
    const warns = tests.filter(t => t.status === 'WARN').length;

    if (fails > 0) results.overallStatus = 'LIKELY SHADOWBANNED';
    else if (warns >= 2) results.overallStatus = 'POSSIBLY SHADOWBANNED';
    else if (warns === 1) results.overallStatus = 'MINOR ISSUES';
    else results.overallStatus = 'CLEAN';

    // ── Report ──────────────────────────────────
    console.log('\n' + '━'.repeat(50));
    console.log('📊 RESULTS');
    console.log('━'.repeat(50));
    for (const [test, result] of Object.entries(results.tests)) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : result.status === 'WARN' ? '⚠️' : '❓';
      console.log(`   ${icon} ${test}: ${result.detail}`);
    }
    const statusIcon = results.overallStatus === 'CLEAN' ? '✅' : results.overallStatus.includes('LIKELY') ? '❌' : '⚠️';
    console.log(`\n   ${statusIcon} Overall: ${results.overallStatus}`);

    if (results.overallStatus !== 'CLEAN') {
      console.log('\n💡 Tips to resolve:');
      console.log('   1. Stop automated activity for 48-72 hours');
      console.log('   2. Remove rule-violating content');
      console.log('   3. Verify your email and phone number');
      console.log('   4. Engage naturally — like, reply, browse');
    }

    // Save results
    try {
      localStorage.setItem(`xactions_shadowban_${username}`, JSON.stringify(results));
      console.log(`\n💾 Saved. Retrieve: JSON.parse(localStorage.getItem("xactions_shadowban_${username}"))`);
    } catch {}

    console.log('');
  };

  run();
})();
