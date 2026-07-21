// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/engagementBooster.js
// Browser console script for boosting engagement — like & reply to matching tweets
// Paste in DevTools console on x.com/home or any timeline/search
// by nichxbt

(() => {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────
  const CONFIG = {
    maxInteractions: 15,
    dryRun: true,
    actions: { like: true, reply: false },
    replyTemplates: [
      '🔥 Great point!',
      '💯 Couldn\'t agree more.',
      '📌 Bookmarking this.',
      'Really useful, thanks for sharing! 🙌',
    ],
    targetUsers: [],          // lowercase handles, empty = any
    onlyKeywords: [],         // tweet must contain one (empty = any)
    skipKeywords: ['promoted', 'ad'],
    delayBetween: 3000,
    scrollRounds: 5,
  };

  // ── HELPERS ───────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)([KMB])?/i);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()];
    return Math.round(n);
  };

  // ── MAIN ──────────────────────────────────────────────────
  (async () => {
    console.log('🚀 ENGAGEMENT BOOSTER — XActions by nichxbt');
    console.log(`   Mode: ${CONFIG.dryRun ? '🔍 DRY RUN' : '⚡ LIVE'} | Max: ${CONFIG.maxInteractions}`);
    console.log(`   Actions: ${CONFIG.actions.like ? '❤️ Like' : ''} ${CONFIG.actions.reply ? '💬 Reply' : ''}\n`);

    const processed = new Set();
    let interactions = 0;

    for (let round = 0; round < CONFIG.scrollRounds && interactions < CONFIG.maxInteractions; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      console.log(`📜 Round ${round + 1}/${CONFIG.scrollRounds} — ${articles.length} tweets visible`);

      for (const article of articles) {
        if (interactions >= CONFIG.maxInteractions) break;

        // Deduplicate
        const link = article.querySelector('a[href*="/status/"]');
        const href = link?.getAttribute('href') || '';
        if (!href || processed.has(href)) continue;
        processed.add(href);

        // Extract text & author
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl?.textContent || '';
        const authorEl = article.querySelector('a[href^="/"][role="link"]');
        const author = (authorEl?.href?.match(/x\.com\/([^/]+)/)?.[1] || '').toLowerCase();

        // Filters
        const lower = text.toLowerCase();
        if (CONFIG.skipKeywords.some(kw => lower.includes(kw.toLowerCase()))) continue;
        if (CONFIG.onlyKeywords.length > 0 && !CONFIG.onlyKeywords.some(kw => lower.includes(kw.toLowerCase()))) continue;
        if (CONFIG.targetUsers.length > 0 && !CONFIG.targetUsers.includes(author)) continue;

        // Already liked?
        if (article.querySelector('[data-testid="unlike"]')) continue;

        interactions++;
        const snippet = text.slice(0, 50);

        // ❤️ LIKE
        if (CONFIG.actions.like) {
          const likeBtn = article.querySelector('[data-testid="like"]');
          if (likeBtn) {
            if (CONFIG.dryRun) {
              console.log(`🔍 [DRY] #${interactions} Would like @${author}: "${snippet}..."`);
            } else {
              likeBtn.click();
              console.log(`❤️ #${interactions} Liked @${author}: "${snippet}..."`);
            }
          }
        }

        // 💬 REPLY
        if (CONFIG.actions.reply && CONFIG.replyTemplates.length > 0) {
          const replyText = pick(CONFIG.replyTemplates);
          if (CONFIG.dryRun) {
            console.log(`🔍 [DRY] Would reply: "${replyText}"`);
          } else {
            try {
              const replyBtn = article.querySelector('[data-testid="reply"]');
              if (replyBtn) {
                replyBtn.click();
                await sleep(1200);
                const textbox = document.querySelector('[data-testid="tweetTextarea_0"]');
                if (textbox) {
                  textbox.focus();
                  await sleep(200);
                  for (const ch of replyText) {
                    document.execCommand('insertText', false, ch);
                    await sleep(rand(20, 50));
                  }
                  await sleep(400);
                  const sendBtn = document.querySelector('[data-testid="tweetButton"]');
                  if (sendBtn) sendBtn.click();
                  console.log(`💬 #${interactions} Replied to @${author}: "${replyText}"`);
                }
              }
            } catch (e) {
              console.warn(`⚠️ Reply failed: ${e.message}`);
              document.body.click();
            }
          }
        }

        await sleep(CONFIG.delayBetween + rand(0, 1000));
      }

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await sleep(2000);
    }

    // ── SUMMARY ─────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  ✅ ENGAGEMENT BOOSTER COMPLETE       ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`   🎯 Interactions: ${interactions}`);
    console.log(`   📜 Tweets scanned: ${processed.size}`);
    if (CONFIG.dryRun && interactions > 0) {
      console.log(`\n   ⚡ Set dryRun = false to engage for real.\n`);
    }
  })();
})();
