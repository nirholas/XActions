// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/autoRepost.js
// Browser console script for auto-reposting tweets matching keywords or users
// Paste in DevTools console on x.com/home or any timeline/search
// by nichxbt

(() => {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────
  const CONFIG = {
    keywords: [],             // e.g. ['AI agents', 'open source']
    fromUsers: [],            // e.g. ['nichxbt', 'elonmusk']
    maxReposts: 5,
    dryRun: true,
    delay: 3000,
    scrollRounds: 10,
    minLikes: 0,
  };

  // ── HELPERS ───────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)([KMB])?/i);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()];
    return Math.round(n);
  };

  const matchesCriteria = (text, username) => {
    const lower = text.toLowerCase();
    const hasKeyword = CONFIG.keywords.length === 0 ||
      CONFIG.keywords.some(kw => lower.includes(kw.toLowerCase()));
    const hasUser = CONFIG.fromUsers.length === 0 ||
      CONFIG.fromUsers.some(u => u.toLowerCase() === username.toLowerCase());

    if (CONFIG.keywords.length > 0 && CONFIG.fromUsers.length > 0) return hasKeyword || hasUser;
    if (CONFIG.keywords.length > 0) return hasKeyword;
    if (CONFIG.fromUsers.length > 0) return hasUser;
    return false;
  };

  // ── MAIN ──────────────────────────────────────────────────
  (async () => {
    console.log('🔄 AUTO REPOST — XActions by nichxbt');
    console.log(`   Mode: ${CONFIG.dryRun ? '🔍 DRY RUN' : '⚡ LIVE'} | Max: ${CONFIG.maxReposts}`);
    console.log(`   Keywords: ${CONFIG.keywords.join(', ') || 'none'}`);
    console.log(`   Users: ${CONFIG.fromUsers.join(', ') || 'none'}\n`);

    if (CONFIG.keywords.length === 0 && CONFIG.fromUsers.length === 0) {
      console.error('❌ Set at least one filter: CONFIG.keywords or CONFIG.fromUsers');
      return;
    }

    const processed = new Set();
    let reposted = 0;

    for (let round = 0; round < CONFIG.scrollRounds && reposted < CONFIG.maxReposts; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (reposted >= CONFIG.maxReposts) break;

        const link = article.querySelector('a[href*="/status/"]');
        const href = link?.href || '';
        if (!href || processed.has(href)) continue;
        processed.add(href);

        // Skip already retweeted
        if (article.querySelector('[data-testid="unretweet"]')) continue;

        // Engagement filter
        const likeEl = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        if (likes < CONFIG.minLikes) continue;

        // Extract text & author
        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const userLink = article.querySelector('a[href^="/"][role="link"]');
        const username = userLink?.href?.match(/x\.com\/([^/]+)/)?.[1] || '';

        if (!matchesCriteria(text, username)) continue;

        const snippet = text.slice(0, 50);

        if (CONFIG.dryRun) {
          reposted++;
          console.log(`🔍 [DRY] #${reposted} Would repost @${username}: "${snippet}..."`);
          continue;
        }

        try {
          const rtBtn = article.querySelector('[data-testid="retweet"]');
          if (!rtBtn) continue;

          rtBtn.click();
          await sleep(800);

          const confirmBtn = document.querySelector('[data-testid="retweetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
            reposted++;
            console.log(`🔄 #${reposted}/${CONFIG.maxReposts} Reposted @${username}: "${snippet}..."`);
          } else {
            document.body.click();
          }
        } catch (e) {
          console.warn(`⚠️ Error: ${e.message}`);
          document.body.click();
        }

        await sleep(CONFIG.delay + Math.random() * 1000);
      }

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await sleep(2000);
    }

    // ── SUMMARY ─────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  ✅ AUTO REPOST COMPLETE              ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`   🔄 Reposted: ${reposted}`);
    console.log(`   📜 Scanned: ${processed.size}`);
    if (CONFIG.dryRun && reposted > 0) {
      console.log(`\n   ⚡ Set dryRun = false to repost ${reposted} tweets for real.\n`);
    }
  })();
})();
