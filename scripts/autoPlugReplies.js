// scripts/autoPlugReplies.js
// Browser console script for auto-replying to your viral tweets with a plug
// Paste in DevTools console on x.com/YOUR_USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    plugText: '🔌 If you liked this, check out my project → [your link]',
    minLikes: 50,            // Min likes to consider "viral"
    maxPlugs: 3,             // Max plugs per session
    scrollRounds: 5,         // Scroll rounds to find tweets
    scrollDelay: 2000,       // ms between scrolls
    replyDelay: 3000,        // ms before posting reply
    dryRun: true,            // SET FALSE TO EXECUTE
  };
  // =============================================

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

  let plugCount = 0;
  const plugHistory = [];

  const scanViral = async () => {
    const viral = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      for (const article of articles) {
        const tweetLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const href = tweetLink ? tweetLink.getAttribute('href') : null;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const likeEl = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
        const likes = likeEl ? parseNum(likeEl.textContent) : 0;
        if (likes < CONFIG.minLikes) continue;

        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent.trim().slice(0, 100) : '';

        viral.push({ href, text, likes, article });
      }
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    return viral.sort((a, b) => b.likes - a.likes);
  };

  const postPlug = async (tweet) => {
    console.log(`\n  🔌 Plugging: "${tweet.text.slice(0, 50)}..." (${tweet.likes} likes)`);

    if (CONFIG.dryRun) {
      console.log(`  🏃 [DRY RUN] Would reply: "${CONFIG.plugText.slice(0, 60)}..."`);
      return true;
    }

    tweet.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(1000);

    const replyBtn = tweet.article.querySelector('[data-testid="reply"]');
    if (!replyBtn) { console.log('  ⚠️ Reply button not found.'); return false; }
    replyBtn.click();
    await sleep(2000);

    const tweetBox = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!tweetBox) { console.log('  ⚠️ Reply box not found.'); return false; }
    tweetBox.focus();
    await sleep(300);
    document.execCommand('insertText', false, CONFIG.plugText);
    await sleep(CONFIG.replyDelay);

    const sendBtn = document.querySelector('[data-testid="tweetButton"]');
    if (!sendBtn) { console.log('  ⚠️ Post button not found.'); return false; }
    sendBtn.click();
    await sleep(3000);
    return true;
  };

  const run = async () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🔌 AUTO-PLUG REPLIES                          ║');
    console.log('║  by nichxbt — v1.0                            ║');
    console.log('╚════════════════════════════════════════════════╝');
    if (CONFIG.dryRun) console.log('\n🏃 DRY RUN — no replies will be posted.');
    console.log(`📊 Threshold: ${CONFIG.minLikes} likes | Max plugs: ${CONFIG.maxPlugs}`);
    console.log(`🔌 Plug: "${CONFIG.plugText.slice(0, 50)}..."\n`);
    console.log('🔍 Scanning for viral tweets...\n');

    const viral = await scanViral();

    if (viral.length === 0) {
      console.log('❌ No tweets above threshold. Lower minLikes or scroll more.');
      return;
    }

    console.log(`📊 Found ${viral.length} viral tweet(s):\n`);
    for (const t of viral) {
      console.log(`  🔥 ${t.likes} likes — "${t.text.slice(0, 60)}..."`);
    }

    const toPlug = viral.slice(0, CONFIG.maxPlugs - plugCount);
    console.log(`\n🔌 Plugging ${toPlug.length} tweet(s)...\n`);

    for (const tweet of toPlug) {
      const ok = await postPlug(tweet);
      if (ok) {
        plugCount++;
        plugHistory.push({ url: 'https://x.com' + tweet.href, text: tweet.text, likes: tweet.likes, pluggedAt: new Date().toISOString(), dryRun: CONFIG.dryRun });
        console.log('  ✅ Plugged!');
      } else {
        console.log('  ❌ Failed.');
      }
      await sleep(3000);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ✅ Plugged: ${plugCount}/${CONFIG.maxPlugs}`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing posted)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (plugHistory.length > 0) {
      download(plugHistory, `xactions-plug-history-${Date.now()}.json`);
    }
  };

  run();
})();
