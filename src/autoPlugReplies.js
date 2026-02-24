/**
 * ============================================================
 * 🔌 Auto-Plug Replies — Production Grade
 * ============================================================
 *
 * @name        autoPlugReplies.js
 * @description Automatically reply to your own tweets that go
 *              viral with a "plug" (link, CTA, product pitch).
 *              Monitors your recent tweets for engagement spikes,
 *              and when a tweet exceeds a threshold, posts a
 *              follow-up reply to capitalize on the visibility.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to your profile: x.com/YOUR_USERNAME
 * 2. Open DevTools Console (F12)
 * 3. Configure your plug message and threshold
 * 4. Paste and run
 *
 * Controls:
 *   XActions.setPlug("Check out my new project → link")
 *   XActions.setThreshold(100)   // Min likes to trigger
 *   XActions.scan()              // Manual scan
 *   XActions.autoScan(600000)    // Auto-scan every 10min
 *   XActions.stop()              // Stop auto-scanning
 *   XActions.history()           // View plug history
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    dryRun: true,            // Set false to actually reply
    plugMessage: '🔌 If you liked this, you\'ll love my newsletter → [your link here]',
    viralThreshold: 50,      // Minimum likes to consider "viral enough" to plug
    maxPlugsPerSession: 3,   // Don't over-plug
    replyDelay: 3000,        // Delay before posting reply (ms)
    scrollRounds: 5,
    scrollDelay: 2000,
  };

  const STORAGE_KEY = 'xactions_plug_history';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeBtn: '[data-testid="like"] span',
    unlikeBtn: '[data-testid="unlike"] span',
    replyBtn: '[data-testid="reply"]',
    tweetBox: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };

  const saveHistory = (history) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  };

  let autoScanTimer = null;
  let plugsThisSession = 0;

  // ── Scan for viral tweets ──────────────────────────────────
  const scanForViral = async () => {
    const viralTweets = [];
    const seen = new Set();
    const history = loadHistory();
    const pluggedUrls = new Set(history.map(h => h.tweetUrl));

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll(SEL.tweet);

      for (const article of articles) {
        const timeEl = article.querySelector('time');
        if (!timeEl) continue;

        const tweetLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const href = tweetLink ? tweetLink.getAttribute('href') : null;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        // Skip already plugged tweets
        const fullUrl = 'https://x.com' + href;
        if (pluggedUrls.has(fullUrl)) continue;

        // Get like count
        const likeEl = $(SEL.likeBtn, article) || $(SEL.unlikeBtn, article);
        const likes = likeEl ? parseNum(likeEl.textContent) : 0;

        if (likes < CONFIG.viralThreshold) continue;

        // Get tweet text
        const textEl = $(SEL.tweetText, article);
        const text = textEl ? textEl.textContent.trim().slice(0, 100) : '';

        // Check if it already has a self-reply (basic check: look for reply chain)
        const replyBtn = $(SEL.replyBtn, article);
        const replyCount = replyBtn ? parseNum(replyBtn.querySelector('span')?.textContent || '0') : 0;

        viralTweets.push({
          href,
          fullUrl,
          text,
          likes,
          replyCount,
          article,
        });
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return viralTweets.sort((a, b) => b.likes - a.likes);
  };

  // ── Post plug reply ────────────────────────────────────────
  const postPlug = async (tweet) => {
    console.log(`\n  🔌 Plugging on: "${tweet.text.slice(0, 50)}..." (${tweet.likes} likes)`);

    if (CONFIG.dryRun) {
      console.log(`  🏃 [DRY RUN] Would reply: "${CONFIG.plugMessage.slice(0, 60)}..."`);
      return true;
    }

    // Navigate to the tweet
    tweet.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(1000);

    // Click reply button
    const replyBtn = $(SEL.replyBtn, tweet.article);
    if (!replyBtn) {
      console.log('  ⚠️ Reply button not found.');
      return false;
    }

    replyBtn.click();
    await sleep(2000);

    // Type in the reply box
    const tweetBox = $(SEL.tweetBox);
    if (!tweetBox) {
      console.log('  ⚠️ Reply box not found.');
      return false;
    }

    tweetBox.focus();
    await sleep(300);
    document.execCommand('insertText', false, CONFIG.plugMessage);
    await sleep(CONFIG.replyDelay);

    // Post
    const sendBtn = $(SEL.tweetButton);
    if (!sendBtn) {
      console.log('  ⚠️ Post button not found.');
      return false;
    }

    sendBtn.click();
    await sleep(3000);
    return true;
  };

  // ── Main scan ──────────────────────────────────────────────
  const scan = async () => {
    const W = 58;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔌 AUTO-PLUG REPLIES' + ' '.repeat(W - 22) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) console.log('\n🏃 DRY RUN mode — no replies will be posted.');
    console.log(`📊 Threshold: ${CONFIG.viralThreshold} likes | Plug: "${CONFIG.plugMessage.slice(0, 50)}..."`);
    console.log('\n🔍 Scanning for viral tweets...\n');

    const viral = await scanForViral();

    if (viral.length === 0) {
      console.log('❌ No tweets above threshold found. Lower viralThreshold or wait.');
      return;
    }

    console.log(`\n📊 Found ${viral.length} viral tweet(s):\n`);

    for (const t of viral) {
      console.log(`  🔥 ${t.likes} likes — "${t.text.slice(0, 60)}..."`);
    }

    // Plug the top ones
    const toPlug = viral.slice(0, CONFIG.maxPlugsPerSession - plugsThisSession);
    if (toPlug.length === 0) {
      console.log(`\n⚠️ Already plugged ${plugsThisSession} tweets this session. Max: ${CONFIG.maxPlugsPerSession}`);
      return;
    }

    console.log(`\n🔌 Plugging ${toPlug.length} tweet(s)...\n`);

    const history = loadHistory();

    for (const tweet of toPlug) {
      const ok = await postPlug(tweet);
      if (ok) {
        plugsThisSession++;
        history.push({
          tweetUrl: tweet.fullUrl,
          tweetText: tweet.text,
          likes: tweet.likes,
          plugMessage: CONFIG.plugMessage,
          pluggedAt: new Date().toISOString(),
          dryRun: CONFIG.dryRun,
        });
        console.log('  ✅ Plugged!');
      } else {
        console.log('  ❌ Failed to plug.');
      }

      await sleep(5000);
    }

    saveHistory(history);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ✅ Plugged: ${toPlug.length} | Session total: ${plugsThisSession}/${CONFIG.maxPlugsPerSession}`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing was posted)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  };

  // ── Controls ───────────────────────────────────────────────
  window.XActions = window.XActions || {};

  window.XActions.setPlug = (msg) => {
    if (!msg) { console.log('❌ Usage: XActions.setPlug("your plug message")'); return; }
    CONFIG.plugMessage = msg;
    console.log(`✅ Plug set: "${msg.slice(0, 60)}..."`);
  };

  window.XActions.setThreshold = (n) => {
    if (typeof n !== 'number' || n < 1) { console.log('❌ Threshold must be a positive number.'); return; }
    CONFIG.viralThreshold = n;
    console.log(`✅ Viral threshold set to ${n} likes.`);
  };

  window.XActions.scan = scan;

  window.XActions.autoScan = (intervalMs = 600000) => {
    if (autoScanTimer) clearInterval(autoScanTimer);
    console.log(`🔄 Auto-scanning every ${(intervalMs / 60000).toFixed(1)} minutes.`);
    autoScanTimer = setInterval(scan, intervalMs);
  };

  window.XActions.stop = () => {
    if (autoScanTimer) { clearInterval(autoScanTimer); autoScanTimer = null; }
    console.log('⏹️ Auto-scan stopped.');
  };

  window.XActions.history = () => {
    const history = loadHistory();
    if (history.length === 0) { console.log('📭 No plug history.'); return; }
    console.log(`\n🔌 PLUG HISTORY (${history.length}):\n`);
    for (const h of history.slice(-10)) {
      console.log(`  ${new Date(h.pluggedAt).toLocaleString()} — ${h.likes} likes${h.dryRun ? ' [dry]' : ''}`);
      console.log(`    Tweet: "${h.tweetText.slice(0, 50)}..."`);
    }
  };

  window.XActions.exportHistory = () => {
    const history = loadHistory();
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `xactions-plug-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    console.log('📥 Plug history exported.');
  };

  // Run initial scan
  scan();
})();
