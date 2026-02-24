// scripts/engagementManager.js
// Browser console script for liking, bookmarking, or replying to visible tweets
// Paste in DevTools console on x.com/home or any timeline
// by nichxbt

(() => {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────
  const CONFIG = {
    action: 'like',           // 'like' | 'bookmark' | 'reply'
    replyText: '',            // required when action = 'reply'
    maxTweets: 10,
    delay: 2000,
  };

  // ── HELPERS ───────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    like: '[data-testid="like"]',
    unlike: '[data-testid="unlike"]',
    bookmark: '[data-testid="bookmark"]',
    removeBookmark: '[data-testid="removeBookmark"]',
    reply: '[data-testid="reply"]',
    replyInput: '[data-testid="tweetTextarea_0"]',
    replySubmit: '[data-testid="tweetButton"]',
  };

  // ── ACTION HANDLERS ───────────────────────────────────────
  const doLike = async (article) => {
    const btn = article.querySelector(SELECTORS.like);
    if (!btn) return false;
    btn.click();
    return true;
  };

  const doBookmark = async (article) => {
    const btn = article.querySelector(SELECTORS.bookmark);
    if (!btn) return false;
    btn.click();
    return true;
  };

  const doReply = async (article) => {
    if (!CONFIG.replyText) {
      console.warn('⚠️ Set CONFIG.replyText before using reply action');
      return false;
    }
    const btn = article.querySelector(SELECTORS.reply);
    if (!btn) return false;
    btn.click();
    await sleep(1200);
    const textbox = document.querySelector(SELECTORS.replyInput);
    if (!textbox) { document.body.click(); return false; }
    textbox.focus();
    await sleep(200);
    for (const ch of CONFIG.replyText) {
      document.execCommand('insertText', false, ch);
      await sleep(25);
    }
    await sleep(400);
    const send = document.querySelector(SELECTORS.replySubmit);
    if (send) { send.click(); return true; }
    document.body.click();
    return false;
  };

  const actions = { like: doLike, bookmark: doBookmark, reply: doReply };

  // ── MAIN ──────────────────────────────────────────────────
  (async () => {
    const emoji = { like: '❤️', bookmark: '🔖', reply: '💬' }[CONFIG.action] || '🔧';
    console.log(`${emoji} ENGAGEMENT MANAGER — XActions by nichxbt`);
    console.log(`   Action: ${CONFIG.action} | Max: ${CONFIG.maxTweets} | Delay: ${CONFIG.delay}ms\n`);

    if (!actions[CONFIG.action]) {
      console.error(`❌ Unknown action "${CONFIG.action}". Use: like, bookmark, reply`);
      return;
    }

    const handler = actions[CONFIG.action];
    const processed = new Set();
    let count = 0;

    const articles = document.querySelectorAll(SELECTORS.tweet);
    console.log(`📜 Found ${articles.length} tweets on page`);

    for (const article of articles) {
      if (count >= CONFIG.maxTweets) break;

      const link = article.querySelector('a[href*="/status/"]');
      const href = link?.getAttribute('href') || '';
      if (!href || processed.has(href)) continue;
      processed.add(href);

      // Skip already actioned
      if (CONFIG.action === 'like' && article.querySelector(SELECTORS.unlike)) continue;
      if (CONFIG.action === 'bookmark' && article.querySelector(SELECTORS.removeBookmark)) continue;

      const text = article.querySelector(SELECTORS.tweetText)?.textContent || '';
      const snippet = text.slice(0, 50);

      article.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await sleep(300);

      try {
        const ok = await handler(article);
        if (ok) {
          count++;
          console.log(`${emoji} #${count}/${CONFIG.maxTweets}: "${snippet}..."`);
        }
      } catch (e) {
        console.warn(`⚠️ Error: ${e.message}`);
        document.body.click();
      }

      await sleep(CONFIG.delay);
    }

    console.log(`\n✅ Done! ${CONFIG.action === 'like' ? 'Liked' : CONFIG.action === 'bookmark' ? 'Bookmarked' : 'Replied to'} ${count} tweets.`);
  })();
})();
