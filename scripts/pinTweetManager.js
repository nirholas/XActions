// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/pinTweetManager.js
// Browser console script for pinning your best-performing tweet
// Paste in DevTools console on x.com/YOUR_USERNAME (your profile)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'pinBest',        // 'pinBest' | 'unpin'
    metric: 'likes',          // 'likes' | 'retweets' | 'engagement' | 'views'
    postsToScan: 20,
    dryRun: true,             // Preview without pinning
    scrollDelay: 1500,
    maxScrolls: 15,
  };
  // =============================================

  const parseCount = (str) => {
    if (!str) return 0;
    const m = str.replace(/,/g, '').match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  const run = async () => {
    console.log('📌 PIN TWEET MANAGER — XActions by nichxbt');

    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(pathMatch[1])) {
      console.error('❌ Navigate to your profile page first! (x.com/YOUR_USERNAME)');
      return;
    }
    const username = pathMatch[1];
    console.log(`👤 Profile: @${username}`);

    // ── Unpin action ──────────────────────────

    if (CONFIG.action === 'unpin') {
      console.log('🔓 Looking for pinned tweet...');
      const firstArticle = document.querySelector('article[data-testid="tweet"]');
      const ctx = firstArticle?.querySelector('[data-testid="socialContext"]');
      if (!ctx || !/pinned/i.test(ctx.textContent)) { console.log('ℹ️ No pinned tweet found.'); return; }

      const text = firstArticle.querySelector('[data-testid="tweetText"]')?.textContent || '';
      if (CONFIG.dryRun) {
        console.log(`🔍 Would unpin: "${text.slice(0, 60)}..."`);
        return;
      }

      const caret = firstArticle.querySelector('[data-testid="caret"]');
      if (!caret) { console.warn('⚠️ Menu button not found.'); return; }

      caret.click();
      await sleep(800);

      for (const item of document.querySelectorAll('[role="menuitem"]')) {
        if (/unpin/i.test(item.textContent)) {
          item.click();
          await sleep(800);
          const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirm) confirm.click();
          console.log('✅ Tweet unpinned!');
          return;
        }
      }
      document.body.click();
      console.warn('⚠️ Could not find Unpin option.');
      return;
    }

    // ── Pin best action ───────────────────────

    console.log(`📊 Scanning ${CONFIG.postsToScan} posts to find best by ${CONFIG.metric}...`);

    const posts = new Map();
    let stalls = 0;

    for (let i = 0; i < CONFIG.maxScrolls && posts.size < CONFIG.postsToScan; i++) {
      const prevSize = posts.size;

      for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
        const authorLink = article.querySelector(`a[href="/${username}" i]`);
        if (!authorLink) continue;

        const timeLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const tweetUrl = timeLink?.getAttribute('href') || '';
        const tweetId = tweetUrl.split('/status/')[1]?.split(/[?/]/)[0];
        if (!tweetId || posts.has(tweetId)) continue;

        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const likeBtn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtBtn = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyBtn = article.querySelector('[data-testid="reply"]');
        const viewsEl = article.querySelector('a[href*="/analytics"]');

        const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1]);
        const retweets = parseCount(rtBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1]);
        const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1]);
        const views = parseCount(viewsEl?.textContent);
        const isPinned = /pinned/i.test(article.querySelector('[data-testid="socialContext"]')?.textContent || '');

        posts.set(tweetId, {
          tweetId, text, likes, retweets, replies, views, tweetUrl, isPinned,
          engagement: likes + retweets + replies,
        });
      }

      if (posts.size === prevSize) { stalls++; if (stalls >= 3) break; }
      else stalls = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArray = [...posts.values()];
    if (postsArray.length === 0) {
      console.error('❌ No posts found.');
      return;
    }

    postsArray.sort((a, b) => b[CONFIG.metric] - a[CONFIG.metric]);
    const best = postsArray[0];

    console.log(`\n🏆 Best by ${CONFIG.metric}: ❤️${best.likes} 🔄${best.retweets} 💬${best.replies} 👁️${best.views}`);
    console.log(`   "${best.text.slice(0, 80)}..."`);

    if (best.isPinned) { console.log('✅ Already pinned!'); return; }
    if (CONFIG.dryRun) {
      console.log('\n🔍 [DRY RUN] Would pin this tweet. Top 5:');
      postsArray.slice(0, 5).forEach((p, i) => console.log(`   ${i + 1}. ${CONFIG.metric}: ${p[CONFIG.metric]} — "${p.text.slice(0, 50)}..."`));
      console.log(`⚡ Set dryRun = false to pin.`);
      return;
    }

    console.log('📌 Pinning best tweet...');
    window.scrollTo(0, 0);
    await sleep(1000);

    let targetArticle = null;
    for (let i = 0; i < 15 && !targetArticle; i++) {
      for (const a of document.querySelectorAll('article[data-testid="tweet"]')) {
        if (a.querySelector('a[href*="/status/"]')?.getAttribute('href')?.includes(best.tweetId)) { targetArticle = a; break; }
      }
      if (!targetArticle) { window.scrollTo(0, document.body.scrollHeight * (i / 15)); await sleep(800); }
    }

    if (!targetArticle) { console.warn(`⚠️ Could not re-find tweet. Go to: https://x.com${best.tweetUrl}`); return; }

    const caret = targetArticle.querySelector('[data-testid="caret"]');
    if (!caret) { console.warn('⚠️ Menu button not found.'); return; }
    caret.scrollIntoView({ block: 'center' });
    await sleep(300);
    caret.click();
    await sleep(800);

    for (const item of document.querySelectorAll('[role="menuitem"]')) {
      if (/pin/i.test(item.textContent) && !/unpin/i.test(item.textContent)) {
        item.click();
        await sleep(800);
        const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirm) confirm.click();
        console.log('✅ Tweet pinned!');
        return;
      }
    }
    document.body.click();
    console.warn('⚠️ "Pin" option not found in menu.');
  };

  run();
})();
