// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/tweetABTester.js
// Browser console script for A/B testing tweet variants and comparing engagement
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    variants: [
      'Check out our new tool! 🔥',
      'We just launched something amazing → [link]',
    ],
    checkAfterMinutes: 60,   // Wait before measuring
    dryRun: true,            // SET FALSE TO EXECUTE
  };
  // =============================================

  const STORAGE_KEY = 'xactions_ab_tests';

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const loadTests = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } };
  const saveTests = (t) => localStorage.setItem(STORAGE_KEY, JSON.stringify(t));

  const postTweet = async (text) => {
    if (CONFIG.dryRun) {
      console.log(`  🏃 [DRY RUN] Would post: "${text.slice(0, 60)}..."`);
      return true;
    }
    const tweetBox = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!tweetBox) { console.log('  ⚠️ Tweet box not found. Navigate to x.com/compose/tweet'); return false; }
    tweetBox.focus();
    await sleep(300);
    document.execCommand('insertText', false, text);
    await sleep(2000);
    const btn = document.querySelector('[data-testid="tweetButton"]');
    if (!btn) { console.log('  ⚠️ Post button not found.'); return false; }
    btn.click();
    await sleep(3000);
    return true;
  };

  const measureTweet = async (url) => {
    const origUrl = window.location.href;
    window.location.href = url;
    await sleep(4000);

    const article = document.querySelector('article[data-testid="tweet"]');
    if (!article) { console.log('  ⚠️ Could not load tweet.'); window.location.href = origUrl; await sleep(2000); return null; }

    const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
    const rtBtn = article.querySelector('[data-testid="retweet"] span') || article.querySelector('[data-testid="unretweet"] span');
    const replyBtn = article.querySelector('[data-testid="reply"] span');
    const viewEl = article.querySelector('a[href*="/analytics"] span');

    const m = {
      likes: likeBtn ? parseNum(likeBtn.textContent) : 0,
      retweets: rtBtn ? parseNum(rtBtn.textContent) : 0,
      replies: replyBtn ? parseNum(replyBtn.textContent) : 0,
      views: viewEl ? parseNum(viewEl.textContent) : 0,
      measuredAt: new Date().toISOString(),
    };
    m.totalEngagement = m.likes + m.retweets + m.replies;
    m.engagementRate = m.views > 0 ? (m.totalEngagement / m.views * 100) : 0;

    window.location.href = origUrl;
    await sleep(2000);
    return m;
  };

  window.XActions = window.XActions || {};

  window.XActions.createTest = (opts) => {
    if (!opts?.name || !opts?.variantA || !opts?.variantB) {
      console.log('❌ Usage: XActions.createTest({ name, variantA, variantB })');
      return;
    }
    const tests = loadTests();
    if (tests[opts.name]) { console.log(`⚠️ Test "${opts.name}" exists. Delete first.`); return; }
    tests[opts.name] = {
      name: opts.name,
      variantA: { text: opts.variantA, tweetUrl: null, metrics: [] },
      variantB: { text: opts.variantB, tweetUrl: null, metrics: [] },
      createdAt: new Date().toISOString(), winner: null, status: 'created',
    };
    saveTests(tests);
    console.log(`\n🧪 Test "${opts.name}" created.`);
    console.log(`  A: "${opts.variantA.slice(0, 60)}..."`);
    console.log(`  B: "${opts.variantB.slice(0, 60)}..."`);
    console.log(`\n📋 Next: Post both, then XActions.setUrl("${opts.name}", "A", url) + setUrl B`);
    console.log(`   Then: XActions.measure("${opts.name}")`);
  };

  window.XActions.setUrl = (name, variant, url) => {
    const tests = loadTests();
    if (!tests[name]) { console.log(`❌ Test "${name}" not found.`); return; }
    const key = variant === 'A' ? 'variantA' : 'variantB';
    tests[name][key].tweetUrl = url;
    tests[name].status = 'running';
    saveTests(tests);
    console.log(`✅ ${variant} URL set for "${name}".`);
  };

  window.XActions.measure = async (name) => {
    const tests = loadTests();
    if (!tests[name]) { console.log(`❌ Test "${name}" not found.`); return; }
    const test = tests[name];
    if (!test.variantA.tweetUrl || !test.variantB.tweetUrl) { console.log('❌ Set both URLs first.'); return; }

    console.log('\n⏳ Measuring A...');
    const mA = await measureTweet(test.variantA.tweetUrl);
    if (mA) { test.variantA.metrics.push(mA); console.log(`  ✅ A: ❤️${mA.likes} 🔁${mA.retweets} 💬${mA.replies} 👁️${mA.views}`); }
    await sleep(2000);

    console.log('⏳ Measuring B...');
    const mB = await measureTweet(test.variantB.tweetUrl);
    if (mB) { test.variantB.metrics.push(mB); console.log(`  ✅ B: ❤️${mB.likes} 🔁${mB.retweets} 💬${mB.replies} 👁️${mB.views}`); }

    if (mA && mB) {
      const sA = mA.engagementRate || (mA.totalEngagement / Math.max(mA.views, 1));
      const sB = mB.engagementRate || (mB.totalEngagement / Math.max(mB.views, 1));
      const diff = Math.abs(sA - sB);
      const avg = (sA + sB) / 2;
      const pct = avg > 0 ? (diff / avg * 100) : 0;

      if (pct < 5) { test.winner = 'inconclusive'; console.log('\n🤷 INCONCLUSIVE (< 5% diff). Measure again later.'); }
      else if (sA > sB) { test.winner = 'A'; console.log(`\n🏆 WINNER: A (+${pct.toFixed(1)}% better)`); }
      else { test.winner = 'B'; console.log(`\n🏆 WINNER: B (+${pct.toFixed(1)}% better)`); }
    }
    saveTests(tests);
  };

  window.XActions.results = (name) => {
    const tests = loadTests();
    if (!tests[name]) { console.log(`❌ Test "${name}" not found.`); return; }
    const t = tests[name];
    console.log(`\n🧪 "${name}" — Winner: ${t.winner || 'pending'}`);
    for (const v of ['variantA', 'variantB']) {
      const d = t[v];
      const label = v === 'variantA' ? 'A' : 'B';
      const isW = t.winner === label ? ' 🏆' : '';
      console.log(`  ${label}${isW}: "${d.text.slice(0, 60)}..."`);
      if (d.metrics.length > 0) {
        const m = d.metrics[d.metrics.length - 1];
        console.log(`     ❤️${m.likes} 🔁${m.retweets} 💬${m.replies} 👁️${m.views} | Rate: ${m.engagementRate.toFixed(2)}%`);
      }
    }
  };

  window.XActions.listTests = () => {
    const tests = loadTests();
    const names = Object.keys(tests);
    if (names.length === 0) { console.log('📭 No tests.'); return; }
    names.forEach(n => { const t = tests[n]; console.log(`  🧪 "${n}" — ${t.winner ? 'Winner: ' + t.winner : t.status}`); });
  };

  window.XActions.deleteTest = (name) => { const t = loadTests(); delete t[name]; saveTests(t); console.log(`🗑️ Deleted "${name}".`); };

  window.XActions.exportTests = () => {
    download(loadTests(), `xactions-ab-tests-${new Date().toISOString().slice(0, 10)}.json`);
  };

  // Init
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  🧪 TWEET A/B TESTER                            ║');
  console.log('║  by nichxbt — v1.0                            ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n📋 XActions.createTest({ name, variantA, variantB })');
  console.log('   XActions.setUrl(name, "A"|"B", url)');
  console.log('   XActions.measure(name) → XActions.results(name)');
  console.log('   XActions.listTests() / .deleteTest(name) / .exportTests()');

  const count = Object.keys(loadTests()).length;
  if (count > 0) console.log(`\n📊 ${count} existing test(s) loaded.`);
})();
