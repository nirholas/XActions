// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📌 Pin Tweet Manager — Production Grade
 * ============================================================
 *
 * @name        pinTweetManager.js
 * @title       Pin Tweet Manager
 * @description Pin your best-performing post, pin a post by URL or status id, or unpin your pinned post, with a dry run.
 * @category    profile
 * @page        x.com/<you> or x.com/<you>/status/<id>
 * @writes      true
 * @aliases     scripts/pinTweetManager.js, scripts/twitter/pin-tweet.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME
 * 2. Configure action: 'pinBest', 'pinUrl', 'pin', or 'unpin'
 * 3. Open DevTools Console (F12)
 * 4. Paste browser/pinTweetManager.js and run
 *
 * Starts as a DRY RUN. Set dryRun: false to really pin or unpin.
 * 'pinUrl' pins the post in tweetUrl (a URL or a bare status id) when it is
 * on the current page, and otherwise opens it so you can re-run there.
 * 'pin' does the same, or pins the first post on the page when tweetUrl is ''.
 * 'unpin' unpins the pinned post, or the post in tweetUrl when set.
 * Action names are case-insensitive; an unknown action stops the run.
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    action: 'pinBest',              // 'pinBest' | 'pinUrl' | 'pin' | 'unpin'
    tweetUrl: '',                   // For 'pinUrl'/'pin'/'unpin': URL or status id of your tweet
    metric: 'likes',                // For 'pinBest': 'likes', 'retweets', 'engagement', 'views'
    postsToScan: 30,                // How many recent posts to evaluate
    scrollDelay: 1500,
    maxScrolls: 20,
    dryRun: true,                   // Preview without pinning or unpinning
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms + ms * 0.1 * Math.random()));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  const waitForSelector = async (selector, timeoutMs = 4000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const extractStatusId = (urlOrId) => {
    if (!urlOrId) return '';
    const m = String(urlOrId).match(/status\/(\d+)/);
    if (m) return m[1];
    const digits = String(urlOrId).trim().match(/^\d{5,}$/);
    return digits ? digits[0] : '';
  };

  // Locate the article for a given status id, scrolling to find it if needed.
  const findArticleById = async (statusId) => {
    for (let i = 0; i < 12; i++) {
      for (const a of document.querySelectorAll('article[data-testid="tweet"]')) {
        const link = a.querySelector('a[href*="/status/"]');
        const href = link ? link.getAttribute('href') : '';
        if (href && href.includes(`/status/${statusId}`)) return a;
      }
      window.scrollBy(0, window.innerHeight * 0.8);
      await sleep(700);
    }
    return null;
  };

  (async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📌 PIN TWEET MANAGER' + ' '.repeat(W - 23) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!/(^|\.)(x|twitter)\.com$/.test(window.location.hostname)) {
      console.warn('⚠️ Not on x.com. Open your profile page, then re-run.');
      return;
    }

    // Action names are matched case-insensitively; a typo stops the run
    // instead of falling through to 'pinBest'.
    const ACTIONS = ['pinBest', 'pinUrl', 'pin', 'unpin'];
    const action = ACTIONS.find(a => a.toLowerCase() === String(CONFIG.action || '').trim().toLowerCase());
    if (!action) {
      console.error(`❌ CONFIG.action must be one of ${ACTIONS.map(a => `'${a}'`).join(', ')}. Got '${CONFIG.action}'.`);
      return;
    }

    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    // x.com/i/status/<id> (where a bare status id is opened) is fine for the
    // actions that target a single post.
    const onStatusById = /^\/i\/status\/\d+/.test(window.location.pathname) && action !== 'pinBest';
    if (!onStatusById && (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(pathMatch[1]))) {
      console.error('❌ Go to your profile page first! (x.com/YOUR_USERNAME)');
      return;
    }
    const username = onStatusById ? '' : pathMatch[1];
    if (username) console.log(`👤 Profile: @${username}`);
    if (CONFIG.dryRun) console.log('🔍 DRY RUN: nothing will be pinned or unpinned. Set dryRun: false to act.');

    // ── Action: Unpin ───────────────────────────────────────

    if (action === 'unpin') {
      console.log('\n🔓 Looking for pinned tweet to unpin...');

      const unpinId = extractStatusId(CONFIG.tweetUrl);
      const pinnedArticle = unpinId
        ? await findArticleById(unpinId)
        : document.querySelector('article[data-testid="tweet"]');
      if (unpinId && !pinnedArticle) {
        console.error(`❌ Tweet ${unpinId} not found on this page. Open its status page or your profile and re-run.`);
        return;
      }
      const socialCtx = pinnedArticle?.querySelector('[data-testid="socialContext"]');
      if (!unpinId && (!socialCtx || !/pinned/i.test(socialCtx.textContent))) {
        console.log('ℹ️ No pinned tweet found.');
        return;
      }

      if (CONFIG.dryRun) {
        const text = pinnedArticle.querySelector('[data-testid="tweetText"]')?.textContent || '';
        console.log(`🔍 [DRY] Would unpin: "${text.slice(0, 60)}..."`);
        return;
      }

      const caret = pinnedArticle.querySelector('[data-testid="caret"]');
      if (caret) {
        caret.click();
        await sleep(800);

        const menuItems = document.querySelectorAll('[role="menuitem"]');
        for (const item of menuItems) {
          if (/unpin/i.test(item.textContent)) {
            item.click();
            await sleep(800);
            const confirm = await waitForSelector('[data-testid="confirmationSheetConfirm"]', 2500);
            if (confirm) confirm.click();
            console.log('✅ Tweet unpinned!');
            return;
          }
        }
        document.body.click();
        console.warn('⚠️ Could not find Unpin option in menu. Is this your own pinned tweet?');
      } else {
        console.warn('⚠️ Menu button not found.');
      }
      return;
    }

    // ── Action: Pin Specific URL ────────────────────────────

    if (action === 'pinUrl' || action === 'pin') {
      const statusId = extractStatusId(CONFIG.tweetUrl);
      if (action === 'pinUrl' && !statusId) {
        console.error('❌ Set CONFIG.tweetUrl to the full tweet URL (or its status id).');
        return;
      }

      let article;
      if (statusId) {
        console.log(`\n📌 Looking for tweet ${statusId} on this page...`);
        article = await findArticleById(statusId);
        if (!article) {
          const target = /^https?:\/\//.test(CONFIG.tweetUrl) ? CONFIG.tweetUrl : `https://x.com/i/status/${statusId}`;
          console.log(`\n📌 Navigating to tweet: ${target}`);
          window.location.href = target;
          console.log('⏳ After the page loads, paste and run this script again to pin it.');
          console.log('   Or use the ⋯ menu → Pin to your profile.');
          return;
        }
      } else {
        article = document.querySelector('article[data-testid="tweet"]');
        if (!article) {
          console.error('❌ No tweet found on this page. Open your profile (x.com/YOUR_USERNAME) and re-run.');
          return;
        }
        console.log('\nℹ️ No tweetUrl set. Using the first tweet on the page.');
      }

      const preview = (article.querySelector('[data-testid="tweetText"]')?.textContent || '').slice(0, 60);
      console.log(`   Target: "${preview}${preview.length >= 60 ? '...' : ''}"`);

      if (/pinned/i.test(article.querySelector('[data-testid="socialContext"]')?.textContent || '')) {
        console.log('\n✅ This tweet is already pinned!');
        return;
      }

      if (CONFIG.dryRun) {
        console.log('\n🔍 [DRY RUN] Would pin this tweet. Set dryRun = false to pin.');
        return;
      }

      const pinCaret = article.querySelector('[data-testid="caret"]');
      if (!pinCaret) {
        console.warn('⚠️ Could not find menu button on tweet.');
        return;
      }
      pinCaret.scrollIntoView({ block: 'center' });
      await sleep(300);
      pinCaret.click();
      await sleep(800);

      const pinItem = [...document.querySelectorAll('[role="menuitem"]')]
        .find(el => /(^|\s)pin/i.test(el.textContent || '') && !/unpin/i.test(el.textContent || ''));
      if (!pinItem) {
        document.body.click();
        console.warn('⚠️ Could not find "Pin" option in menu. Is this your own tweet?');
        return;
      }
      pinItem.click();
      await sleep(800);
      const pinConfirm = await waitForSelector('[data-testid="confirmationSheetConfirm"]', 2500);
      if (pinConfirm) {
        pinConfirm.click();
        await sleep(800);
      }
      console.log('\n✅ Tweet pinned successfully!');
      return;
    }

    // ── Action: Pin Best Performing ─────────────────────────

    console.log(`\n📊 Scanning ${CONFIG.postsToScan} recent posts to find best by ${CONFIG.metric}...`);

    const posts = new Map();
    let retries = 0;

    for (let i = 0; i < CONFIG.maxScrolls && posts.size < CONFIG.postsToScan; i++) {
      const prevSize = posts.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
        const authorLink = article.querySelector(`a[href="/${username}" i]`);
        if (!authorLink) return;

        const timeLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const tweetUrl = timeLink?.getAttribute('href') || '';
        const tweetId = tweetUrl.split('/status/')[1]?.split(/[?/]/)[0];
        if (!tweetId || posts.has(tweetId)) return;

        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const likeBtn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtBtn = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyBtn = article.querySelector('[data-testid="reply"]');
        const viewsEl = article.querySelector('a[href*="/analytics"]');

        const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const retweets = parseCount(rtBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const views = parseCount(viewsEl?.textContent || '0');

        const isPinned = !!article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/pinned/i);

        posts.set(tweetId, {
          tweetId, text, likes, retweets, replies, views, tweetUrl, isPinned,
          engagement: likes + retweets + replies,
          article, // Keep DOM reference
        });
      });

      if (posts.size === prevSize) { retries++; if (retries >= 3) break; }
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArray = [...posts.values()];
    if (postsArray.length === 0) {
      console.error('❌ No posts found.');
      return;
    }

    // Sort by chosen metric
    postsArray.sort((a, b) => b[CONFIG.metric] - a[CONFIG.metric]);
    const best = postsArray[0];

    console.log(`\n🏆 Best post by ${CONFIG.metric}:`);
    console.log(`   "${best.text.slice(0, 80)}..."`);
    console.log(`   ❤️ ${best.likes} | 🔄 ${best.retweets} | 💬 ${best.replies} | 👁️ ${best.views}`);
    console.log(`   ${best.tweetUrl ? 'https://x.com' + best.tweetUrl : ''}`);

    if (best.isPinned) {
      console.log('\n✅ This tweet is already pinned!');
      return;
    }

    if (CONFIG.dryRun) {
      console.log('\n🔍 [DRY RUN] Would pin this tweet.');
      // Show top 5
      console.log('\n📋 Top 5 candidates:');
      postsArray.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${CONFIG.metric}: ${p[CONFIG.metric]} — "${p.text.slice(0, 50)}..."`);
      });
      console.log('⚡ Set dryRun = false to pin.');
      return;
    }

    // Scroll back to the best tweet and pin it
    console.log('\n📌 Pinning best tweet...');
    window.scrollTo(0, 0);
    await sleep(1000);

    // Re-find the article
    let targetArticle = null;
    for (let i = 0; i < 20; i++) {
      for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
        const link = article.querySelector('a[href*="/status/"]');
        if (link && link.getAttribute('href')?.includes(best.tweetId)) {
          targetArticle = article;
          break;
        }
      }
      if (targetArticle) break;
      window.scrollTo(0, document.body.scrollHeight * (i / 20));
      await sleep(800);
    }

    if (!targetArticle) {
      console.warn('⚠️ Could not re-find tweet in DOM. Navigate manually:');
      console.log(`   https://x.com${best.tweetUrl}`);
      return;
    }

    const caret = targetArticle.querySelector('[data-testid="caret"]');
    if (!caret) {
      console.warn('⚠️ Could not find menu button on tweet.');
      return;
    }

    caret.scrollIntoView({ block: 'center' });
    await sleep(300);
    caret.click();
    await sleep(800);

    const menuItems = document.querySelectorAll('[role="menuitem"]');
    for (const item of menuItems) {
      if (/pin/i.test(item.textContent) && !/unpin/i.test(item.textContent)) {
        item.click();
        await sleep(800);
        const confirm = await waitForSelector('[data-testid="confirmationSheetConfirm"]', 2500);
        if (confirm) {
          confirm.click();
          console.log('\n✅ Tweet pinned successfully!');
        }
        return;
      }
    }

    document.body.click();
    console.warn('⚠️ Could not find "Pin" option in menu.');
  })();
})();
