// scripts/quoteTweetAutomation.js
// Browser console script for auto quote-tweeting matching tweets with templates
// Paste in DevTools console on x.com/home or any timeline/search
// by nichxbt

(() => {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────
  const CONFIG = {
    maxQuotes: 5,
    dryRun: true,
    templates: [
      'Great thread! 🧵',
      'Interesting perspective 🤔',
      '💯 This is so underrated.',
      '📌 Saving this — great insight.',
    ],
    onlyKeywords: [],         // tweet must contain one (empty = any)
    skipKeywords: ['ad', 'promoted', 'giveaway', 'dm me'],
    delay: 5000,
    scrollRounds: 3,
    scrollDelay: 2000,
  };

  // ── HELPERS ───────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)([KMB])?/i);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()];
    return Math.round(n);
  };

  // ── COLLECT TARGETS ───────────────────────────────────────
  const collectTargets = async () => {
    const targets = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl?.textContent?.trim() || '';
        if (!text) continue;

        const fp = text.slice(0, 80);
        if (seen.has(fp)) continue;
        seen.add(fp);

        const lower = text.toLowerCase();
        if (CONFIG.skipKeywords.some(kw => lower.includes(kw.toLowerCase()))) continue;
        if (CONFIG.onlyKeywords.length > 0 && !CONFIG.onlyKeywords.some(kw => lower.includes(kw.toLowerCase()))) continue;

        // Skip already retweeted
        if (article.querySelector('[data-testid="unretweet"]')) continue;

        const authorEl = article.querySelector('a[href^="/"][role="link"] span');
        const author = authorEl?.textContent?.trim() || 'unknown';

        targets.push({ article, text, author });
      }

      console.log(`   📜 Round ${round + 1}: ${targets.length} eligible tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return targets;
  };

  // ── QUOTE SINGLE TWEET ────────────────────────────────────
  const quoteTweet = async (target, template) => {
    const { article, author } = target;

    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(1000);

    // Click retweet to open menu
    const rtBtn = article.querySelector('[data-testid="retweet"]');
    if (!rtBtn) { console.log('   ⚠️ No retweet button'); return false; }

    rtBtn.click();
    await sleep(800);

    // Find "Quote" option in dropdown
    let quoteOpt = null;
    for (const el of document.querySelectorAll('[role="menuitem"]')) {
      if ((el.textContent || '').toLowerCase().includes('quote')) { quoteOpt = el; break; }
    }
    if (!quoteOpt) {
      console.log('   ⚠️ "Quote" option not found');
      document.body.click();
      await sleep(300);
      return false;
    }

    quoteOpt.click();
    await sleep(1500);

    // Type quote text
    const tweetBox = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!tweetBox) { console.log('   ⚠️ Compose box not found'); return false; }

    const quoteText = template.replace('{author}', author);
    tweetBox.focus();
    for (const ch of quoteText) {
      document.execCommand('insertText', false, ch);
      await sleep(rand(30, 80));
    }
    await sleep(600);

    if (CONFIG.dryRun) {
      console.log(`   🏃 DRY RUN — would post: "${quoteText}"`);
      const closeBtn = document.querySelector('[data-testid="app-bar-close"]') || document.querySelector('[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
      await sleep(500);
      const discardBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (discardBtn) { discardBtn.click(); await sleep(300); }
      return true;
    }

    const sendBtn = document.querySelector('[data-testid="tweetButton"]');
    if (!sendBtn) { console.log('   ⚠️ Tweet button not found'); return false; }
    sendBtn.click();
    await sleep(2000);
    return true;
  };

  // ── MAIN ──────────────────────────────────────────────────
  (async () => {
    console.log('🔁 QUOTE TWEET AUTOMATION — XActions by nichxbt');
    console.log(`   Mode: ${CONFIG.dryRun ? '🔍 DRY RUN' : '⚡ LIVE'} | Max: ${CONFIG.maxQuotes}\n`);

    console.log('🔍 Collecting target tweets...\n');
    const targets = await collectTargets();

    if (targets.length === 0) {
      console.error('❌ No eligible tweets found. Adjust keywords or scroll more.');
      return;
    }

    const toProcess = targets.slice(0, CONFIG.maxQuotes);
    console.log(`\n📊 Found ${targets.length} eligible. Processing ${toProcess.length}.\n`);

    let success = 0;
    let fail = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const target = toProcess[i];
      const template = CONFIG.templates[i % CONFIG.templates.length];

      console.log(`[${i + 1}/${toProcess.length}] 🔁 Quote-tweeting "${target.text.slice(0, 50)}..." (by ${target.author})`);

      const ok = await quoteTweet(target, template);
      if (ok) success++;
      else fail++;

      if (i < toProcess.length - 1) {
        const wait = CONFIG.delay + rand(0, 2000);
        console.log(`   ⏳ Waiting ${(wait / 1000).toFixed(0)}s...`);
        await sleep(wait);
      }
    }

    // ── SUMMARY ─────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  ✅ QUOTE TWEET COMPLETE              ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`   ✅ Quoted: ${success} | ❌ Failed: ${fail}`);
    if (CONFIG.dryRun) console.log('   🏃 (Dry run — nothing was posted)');
    if (CONFIG.dryRun && success > 0) {
      console.log(`\n   ⚡ Set dryRun = false to post ${success} quotes for real.\n`);
    }
  })();
})();
