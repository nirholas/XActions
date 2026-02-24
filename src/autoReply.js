/**
 * ============================================================
 * 🤖 Auto-Reply / Auto-Respond — Production Grade
 * ============================================================
 *
 * @name        autoReply.js
 * @description Automatically reply to tweets matching filters.
 *              Monitors timeline/search and posts contextual replies.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/home (or a search page)
 * 2. Configure triggers and reply templates
 * 3. Set dryRun = false when ready
 * 4. Paste and run
 *
 * ⚠️ AUTOMATED REPLIES CAN GET YOU RESTRICTED!
 * - Use sparingly, with long delays
 * - Vary reply text to avoid spam detection
 * - Only reply to relevant content
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    // ── Triggers (at least one must match) ──────────────────
    triggers: [
      {
        keywords: ['xactions', 'twitter automation'],
        reply: 'Check out XActions — the complete X automation toolkit! 🚀 https://github.com/nirholas/XActions',
      },
      // Add more trigger/reply pairs here:
      // { keywords: ['keyword'], reply: 'Your reply text' },
    ],

    // ── Targeting ───────────────────────────────────────────
    minLikes: 0,                    // Only reply to tweets with >= N likes
    maxLikes: Infinity,             // Skip viral tweets (too noisy)
    ignoreVerified: false,          // Skip verified accounts
    ignoreReplies: true,            // Don't reply to replies (only originals)
    fromUsers: [],                  // Only reply to these users (empty = any)
    ignoreUsers: [],                // Never reply to these users

    // ── Limits ──────────────────────────────────────────────
    maxReplies: 10,                 // Max replies per session
    scrollCycles: 20,               // How far to scroll
    minDelay: 30000,                // 30s minimum between replies (CRITICAL for safety)
    maxDelay: 60000,                // 60s maximum between replies

    // ── Safety ──────────────────────────────────────────────
    dryRun: true,                   // START TRUE! Preview before acting.
    rateLimitPauseMs: 120000,       // 2min cooldown

    // ── Variation ───────────────────────────────────────────
    addRandomEmoji: true,           // Append random emoji for variation
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms + ms * 0.15 * (Math.random() - 0.5)));
  const rand = (lo, hi) => sleep(lo + Math.random() * (hi - lo));
  const emojis = ['🔥', '💯', '⚡', '🚀', '👏', '💡', '✨', '🙌', '💪', '🎯'];

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  (async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🤖 AUTO-REPLY' + ' '.repeat(W - 17) + '║');
    console.log('║  ' + (CONFIG.dryRun ? '🔍 DRY RUN' : '⚡ LIVE MODE').padEnd(W - 2) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`\n⚙️ ${CONFIG.triggers.length} trigger(s) | Max: ${CONFIG.maxReplies} replies | ` +
                `Delay: ${CONFIG.minDelay/1000}-${CONFIG.maxDelay/1000}s\n`);

    const repliedSet = new Set(
      JSON.parse(localStorage.getItem('xactions_autoreplied') || '[]')
    );
    const ignoreSet = new Set(CONFIG.ignoreUsers.map(u => u.toLowerCase().replace('@', '')));
    const fromSet = new Set(CONFIG.fromUsers.map(u => u.toLowerCase().replace('@', '')));
    let replied = 0;
    const t0 = Date.now();

    const matchTrigger = (text) => {
      const lower = text.toLowerCase();
      for (const trigger of CONFIG.triggers) {
        if (trigger.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
          return trigger;
        }
      }
      return null;
    };

    for (let scroll = 0; scroll < CONFIG.scrollCycles && replied < CONFIG.maxReplies; scroll++) {
      // Rate-limit check
      for (const sel of ['[data-testid="toast"]', '[role="alert"]']) {
        const el = document.querySelector(sel);
        if (el && /rate.limit|try.again|too.many|slow.down/i.test(el.textContent)) {
          console.warn(`⏳ Rate-limited — waiting ${CONFIG.rateLimitPauseMs/1000}s...`);
          await sleep(CONFIG.rateLimitPauseMs);
        }
      }

      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (replied >= CONFIG.maxReplies) break;

        // Get tweet ID
        const link = article.querySelector('a[href*="/status/"]');
        const tweetUrl = link?.getAttribute('href') || '';
        const tweetId = tweetUrl.split('/status/')[1]?.split(/[?/]/)[0];
        if (!tweetId || repliedSet.has(tweetId)) continue;

        // Get tweet data
        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
        const author = authorLink?.getAttribute('href')?.replace('/', '').split('/')[0] || '';

        // Check if it's a reply
        const isReply = !!article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/replying/i);
        if (CONFIG.ignoreReplies && isReply) continue;

        // Author checks
        if (ignoreSet.has(author.toLowerCase())) continue;
        if (fromSet.size > 0 && !fromSet.has(author.toLowerCase())) continue;

        // Verified check
        if (CONFIG.ignoreVerified && article.querySelector('[data-testid="icon-verified"]')) continue;

        // Engagement checks
        const likeBtn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        if (likes < CONFIG.minLikes || likes > CONFIG.maxLikes) continue;

        // Match trigger
        const trigger = matchTrigger(text);
        if (!trigger) continue;

        let replyText = trigger.reply;
        if (CONFIG.addRandomEmoji) {
          replyText += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
        }

        repliedSet.add(tweetId);

        if (CONFIG.dryRun) {
          console.log(`🔍 [DRY] Would reply to @${author}: "${text.slice(0, 50)}..."`);
          console.log(`   Reply: "${replyText}"`);
          replied++;
          continue;
        }

        try {
          // Click reply button
          const replyBtn = article.querySelector('[data-testid="reply"]');
          if (!replyBtn) continue;

          replyBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
          await sleep(300);
          replyBtn.click();
          await sleep(1500);

          // Find reply textbox
          const textbox = document.querySelector('[data-testid="tweetTextarea_0"]') ||
                          document.querySelector('div[contenteditable="true"][role="textbox"]');
          if (!textbox) {
            console.warn('⚠️ Reply textbox not found');
            document.body.click();
            await sleep(500);
            continue;
          }

          textbox.focus();
          await sleep(300);

          // Type reply
          for (const char of replyText) {
            document.execCommand('insertText', false, char);
            await sleep(20 + Math.random() * 40);
          }
          await sleep(500);

          // Click send
          const sendBtn = document.querySelector('[data-testid="tweetButtonInline"]') ||
                          document.querySelector('[data-testid="tweetButton"]');
          if (sendBtn) {
            sendBtn.click();
            replied++;
            console.log(`💬 #${replied} Replied to @${author}: "${replyText.slice(0, 40)}..."`);

            // Save to localStorage
            localStorage.setItem('xactions_autoreplied', JSON.stringify([...repliedSet]));

            // Long delay between replies (critical)
            await rand(CONFIG.minDelay, CONFIG.maxDelay);
          } else {
            console.warn('⚠️ Send button not found');
            document.body.click();
            await sleep(1000);
          }
        } catch (e) {
          console.warn(`⚠️ Error replying: ${e.message}`);
          document.body.click();
          await sleep(2000);
        }
      }

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await sleep(2000);
    }

    // Results
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(W) + '╗');
    console.log('║  ✅ AUTO-REPLY COMPLETE' + ' '.repeat(W - 25) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`  💬 Replied: ${replied}`);
    console.log(`  ⏱️ Time: ${elapsed}s`);
    console.log(`  📝 Total tracked: ${repliedSet.size}`);

    if (CONFIG.dryRun && replied > 0) {
      console.log(`\n  ⚡ Set dryRun = false to actually send ${replied} replies.\n`);
    }
  })();
})();
