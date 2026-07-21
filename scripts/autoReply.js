// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/autoReply.js
// Browser console script for auto-replying to tweets matching keyword triggers
// Paste in DevTools console on x.com/home or any timeline/search
// by nichxbt

(() => {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────
  const CONFIG = {
    triggers: [
      { keywords: ['help', 'how to'], response: 'Check out XActions! 🚀' },
      // { keywords: ['keyword'], response: 'Your reply here' },
    ],
    maxReplies: 5,
    dryRun: true,
    delay: 5000,
    scrollRounds: 10,
    ignoreReplies: true,
    addRandomEmoji: true,
  };

  // ── HELPERS ───────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const emojis = ['🔥', '💯', '⚡', '🚀', '👏', '💡', '✨', '🙌', '💪', '🎯'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const matchTrigger = (text) => {
    const lower = text.toLowerCase();
    for (const t of CONFIG.triggers) {
      if (t.keywords.some(kw => lower.includes(kw.toLowerCase()))) return t;
    }
    return null;
  };

  // ── MAIN ──────────────────────────────────────────────────
  (async () => {
    console.log('🤖 AUTO-REPLY — XActions by nichxbt');
    console.log(`   Mode: ${CONFIG.dryRun ? '🔍 DRY RUN' : '⚡ LIVE'} | Max: ${CONFIG.maxReplies}`);
    console.log(`   Triggers: ${CONFIG.triggers.length} | Delay: ${CONFIG.delay}ms\n`);

    const replied = new Set(
      JSON.parse(localStorage.getItem('xactions_autoreplied') || '[]')
    );
    let count = 0;
    const t0 = Date.now();

    for (let round = 0; round < CONFIG.scrollRounds && count < CONFIG.maxReplies; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (count >= CONFIG.maxReplies) break;

        // Get tweet ID
        const link = article.querySelector('a[href*="/status/"]');
        const tweetId = link?.getAttribute('href')?.split('/status/')[1]?.split(/[?/]/)[0];
        if (!tweetId || replied.has(tweetId)) continue;

        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const authorEl = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
        const author = authorEl?.getAttribute('href')?.replace('/', '').split('/')[0] || '';

        // Skip threads/replies
        if (CONFIG.ignoreReplies && article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/replying/i)) continue;

        // Match trigger
        const trigger = matchTrigger(text);
        if (!trigger) continue;

        let replyText = trigger.response;
        if (CONFIG.addRandomEmoji) replyText += ' ' + pick(emojis);

        replied.add(tweetId);

        if (CONFIG.dryRun) {
          console.log(`🔍 [DRY] #${count + 1} Would reply to @${author}: "${text.slice(0, 50)}..."`);
          console.log(`   Reply: "${replyText}"`);
          count++;
          continue;
        }

        try {
          const replyBtn = article.querySelector('[data-testid="reply"]');
          if (!replyBtn) continue;

          replyBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
          await sleep(300);
          replyBtn.click();
          await sleep(1500);

          const textbox = document.querySelector('[data-testid="tweetTextarea_0"]');
          if (!textbox) { document.body.click(); await sleep(500); continue; }

          textbox.focus();
          await sleep(200);
          for (const ch of replyText) {
            document.execCommand('insertText', false, ch);
            await sleep(20 + Math.random() * 40);
          }
          await sleep(400);

          const sendBtn = document.querySelector('[data-testid="tweetButtonInline"]') ||
                          document.querySelector('[data-testid="tweetButton"]');
          if (sendBtn) {
            sendBtn.click();
            count++;
            console.log(`💬 #${count} Replied to @${author}: "${replyText.slice(0, 40)}..."`);
            localStorage.setItem('xactions_autoreplied', JSON.stringify([...replied]));
          } else {
            console.warn('⚠️ Send button not found');
            document.body.click();
          }
        } catch (e) {
          console.warn(`⚠️ Error: ${e.message}`);
          document.body.click();
        }

        await sleep(CONFIG.delay);
      }

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await sleep(2000);
    }

    // ── SUMMARY ─────────────────────────────────────────────
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  ✅ AUTO-REPLY COMPLETE               ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`   💬 Replied: ${count}`);
    console.log(`   ⏱️  Time: ${elapsed}s`);
    console.log(`   📝 Total tracked: ${replied.size}`);
    if (CONFIG.dryRun && count > 0) {
      console.log(`\n   ⚡ Set dryRun = false to send ${count} replies for real.\n`);
    }
  })();
})();
