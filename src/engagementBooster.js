/**
 * ============================================================
 * 🚀 Engagement Booster — Production Grade
 * ============================================================
 *
 * @name        engagementBooster.js
 * @description Systematically engage with tweets from target
 *              accounts to boost mutual engagement. Scrolls
 *              through a timeline, likes tweets, optionally
 *              replies with rotating templates, and tracks
 *              all interactions. Supports targeting by keyword,
 *              minimum engagement, and account lists.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to any timeline, search, or user profile
 * 2. Open DevTools Console (F12)
 * 3. Configure targets and actions below
 * 4. Paste and run
 *
 * ⚠️ Keep rates low. Twitter WILL flag excessive liking/replying.
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxInteractions: 15,
    dryRun: true,           // Set false to actually interact

    actions: {
      like: true,           // Like tweets
      reply: false,         // Reply with templates (high risk — be careful)
    },

    // Reply templates — {author} gets replaced
    replyTemplates: [
      '🔥 Great point!',
      '💯 Couldn\'t agree more.',
      '📌 Bookmarking this.',
      'Really useful, thanks for sharing! 🙌',
    ],

    // Filter: only interact with tweets from these users (empty = any)
    targetUsers: [],

    // Filter: only interact with tweets containing these keywords (empty = any)
    onlyKeywords: [],

    // Skip tweets with these keywords
    skipKeywords: ['promoted', 'ad', 'giveaway'],

    // Skip tweets already liked
    skipLiked: true,

    // Minimum engagement to interact with (0 = any)
    minLikes: 0,

    delayBetween: [30000, 60000],  // 30-60 seconds
    scrollRounds: 5,
    scrollDelay: 2000,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeBtn: '[data-testid="like"]',
    unlikeBtn: '[data-testid="unlike"]',
    replyBtn: '[data-testid="reply"]',
    tweetBox: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    toast: '[data-testid="toast"]',
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const isRateLimited = () => {
    const alerts = document.querySelectorAll(`${SEL.toast}, [role="alert"]`);
    for (const el of alerts) {
      const text = (el.textContent || '').toLowerCase();
      if (/rate limit|try again|too many|slow down/.test(text)) return true;
    }
    return false;
  };

  let aborted = false;
  let paused = false;
  const results = [];

  window.XActions = window.XActions || {};
  window.XActions.pause = () => { paused = true; console.log('⏸️ Paused.'); };
  window.XActions.resume = () => { paused = false; console.log('▶️ Resumed.'); };
  window.XActions.abort = () => { aborted = true; console.log('🛑 Aborting...'); };

  const waitForUnpause = async () => {
    while (paused && !aborted) await sleep(500);
  };

  // ── Collect eligible tweets ────────────────────────────────
  const collectEligible = async () => {
    const eligible = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll(SEL.tweet);
      for (const article of articles) {
        const textEl = $(SEL.tweetText, article);
        const text = textEl ? textEl.textContent.trim() : '';
        const fingerprint = text.slice(0, 80);
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);

        // Author
        const authorLink = article.querySelector('a[href^="/"][role="link"]');
        const authorMatch = authorLink ? (authorLink.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/) : null;
        const author = authorMatch ? authorMatch[1] : null;
        if (!author || ['home', 'explore', 'notifications', 'messages'].includes(author)) continue;

        // Filter: target users
        if (CONFIG.targetUsers.length > 0 && !CONFIG.targetUsers.some(u => u.toLowerCase() === author.toLowerCase())) continue;

        // Filter: keywords
        const textLower = text.toLowerCase();
        if (CONFIG.skipKeywords.some(kw => textLower.includes(kw.toLowerCase()))) continue;
        if (CONFIG.onlyKeywords.length > 0 && !CONFIG.onlyKeywords.some(kw => textLower.includes(kw.toLowerCase()))) continue;

        // Filter: skip already liked
        if (CONFIG.skipLiked && $(SEL.unlikeBtn, article)) continue;

        // Filter: minimum likes
        const likeEl = article.querySelector('[data-testid="like"] span');
        const likes = likeEl ? parseNum(likeEl.textContent) : 0;
        if (likes < CONFIG.minLikes) continue;

        eligible.push({ article, text, author, likes });
      }

      console.log(`   📜 Round ${round + 1}: ${eligible.length} eligible tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return eligible;
  };

  // ── Like a tweet ───────────────────────────────────────────
  const likeTweet = async (article) => {
    const btn = $(SEL.likeBtn, article);
    if (!btn) return false;

    if (CONFIG.dryRun) {
      console.log('     ❤️ [DRY RUN] Would like.');
      return true;
    }

    btn.click();
    await sleep(500);

    // Verify liked
    return !!$(SEL.unlikeBtn, article);
  };

  // ── Reply to a tweet ───────────────────────────────────────
  const replyToTweet = async (article, template, author) => {
    const replyBtn = $(SEL.replyBtn, article);
    if (!replyBtn) return false;

    const replyText = template.replace('{author}', `@${author}`);

    if (CONFIG.dryRun) {
      console.log(`     💬 [DRY RUN] Would reply: "${replyText}"`);
      return true;
    }

    replyBtn.click();
    await sleep(1500);

    const tweetBox = $(SEL.tweetBox);
    if (!tweetBox) {
      console.log('     ⚠️ Reply box not found.');
      return false;
    }

    tweetBox.focus();
    document.execCommand('insertText', false, replyText);
    await sleep(800);

    const sendBtn = $(SEL.tweetButton);
    if (!sendBtn) {
      console.log('     ⚠️ Reply button not found.');
      return false;
    }

    sendBtn.click();
    await sleep(2000);
    return true;
  };

  // ── Main ───────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🚀 ENGAGEMENT BOOSTER' + ' '.repeat(W - 24) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('\n🏃 DRY RUN mode — no interactions will happen.');
    } else {
      console.log('\n⚠️ LIVE MODE — will actually like/reply to tweets!');
    }

    const actions = [];
    if (CONFIG.actions.like) actions.push('Like');
    if (CONFIG.actions.reply) actions.push('Reply');
    console.log(`   Actions: ${actions.join(' + ')}`);
    if (CONFIG.targetUsers.length > 0) console.log(`   Targeting: ${CONFIG.targetUsers.join(', ')}`);
    if (CONFIG.onlyKeywords.length > 0) console.log(`   Keywords: ${CONFIG.onlyKeywords.join(', ')}`);

    console.log('\n🔍 Collecting eligible tweets...\n');
    const eligible = await collectEligible();

    if (eligible.length === 0) {
      console.error('❌ No eligible tweets found. Adjust filters.');
      return;
    }

    const toProcess = eligible.slice(0, CONFIG.maxInteractions);
    console.log(`\n📊 Found ${eligible.length} eligible. Processing ${toProcess.length}.\n`);

    let liked = 0, replied = 0, fail = 0;

    for (let i = 0; i < toProcess.length; i++) {
      if (aborted) break;
      await waitForUnpause();

      if (isRateLimited()) {
        console.log('🚨 Rate limited! Waiting 120s...');
        await sleep(120000);
        if (isRateLimited()) {
          console.log('🛑 Still rate limited. Stopping.');
          break;
        }
      }

      const target = toProcess[i];
      console.log(`\n[${i + 1}/${toProcess.length}] @${target.author}: "${target.text.slice(0, 50)}..." (${target.likes} likes)`);

      target.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(800);

      const result = { author: target.author, text: target.text.slice(0, 100), actions: [] };

      // Like
      if (CONFIG.actions.like) {
        const ok = await likeTweet(target.article);
        if (ok) { liked++; result.actions.push('liked'); }
        else fail++;
        await sleep(gaussian(500, 1500));
      }

      // Reply
      if (CONFIG.actions.reply) {
        const template = CONFIG.replyTemplates[i % CONFIG.replyTemplates.length];
        const ok = await replyToTweet(target.article, template, target.author);
        if (ok) { replied++; result.actions.push('replied'); }
        else fail++;
      }

      result.timestamp = new Date().toISOString();
      results.push(result);

      if (i < toProcess.length - 1 && !aborted) {
        const delay = gaussian(CONFIG.delayBetween[0], CONFIG.delayBetween[1]);
        console.log(`   ⏳ Waiting ${(delay / 1000).toFixed(0)}s...`);
        await sleep(delay);
      }
    }

    // ── Summary ──────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 ENGAGEMENT BOOSTER RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ❤️  Liked:   ${liked}`);
    console.log(`  💬 Replied: ${replied}`);
    console.log(`  ❌ Failed:  ${fail}`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing was posted)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Unique authors engaged
    const uniqueAuthors = new Set(results.map(r => r.author));
    console.log(`  Engaged with ${uniqueAuthors.size} unique accounts.`);

    if (results.length > 0) {
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-engagement-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Engagement log exported.');
    }
  };

  run();
})();
