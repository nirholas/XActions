// scripts/bulkDeleteTweets.js
// Browser console script for bulk deleting tweets with filters
// Paste in DevTools console on x.com/YOUR_USERNAME (your profile)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxDeletes: 10,
    filters: {
      olderThanDays: 0,       // 0 = ignore; delete tweets older than N days
      containsKeywords: [],   // Delete if text contains ANY of these (empty = all)
      onlyRetweets: false,    // Only delete retweets
      onlyReplies: false,     // Only delete replies
    },
    dryRun: true,             // START WITH TRUE! Preview before deleting
    delay: 2000,
    scrollDelay: 2000,
    maxScrolls: 50,
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

  const parseCount = (str) => {
    if (!str) return 0;
    const m = str.replace(/,/g, '').match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  const run = async () => {
    console.log('🗑️ BULK DELETE TWEETS — XActions by nichxbt');
    console.log(CONFIG.dryRun ? '🔍 DRY RUN — preview only' : '⚠️ LIVE MODE — tweets WILL be deleted!');

    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(pathMatch[1])) {
      console.error('❌ Navigate to your profile page first! (x.com/YOUR_USERNAME)');
      return;
    }
    const profileUser = pathMatch[1];
    console.log(`👤 Profile: @${profileUser}`);

    const f = CONFIG.filters;
    const cutoff = f.olderThanDays > 0 ? new Date(Date.now() - f.olderThanDays * 86400000) : null;
    if (cutoff) console.log(`📅 Deleting tweets older than ${f.olderThanDays} days`);
    if (f.containsKeywords.length) console.log(`🔑 Keywords: ${f.containsKeywords.join(', ')}`);
    if (f.onlyRetweets) console.log('🔄 Retweets only'); if (f.onlyReplies) console.log('💬 Replies only');

    const processed = new Set();
    const deletedLog = [];
    let deleted = 0;
    let errors = 0;

    for (let scroll = 0; scroll < CONFIG.maxScrolls; scroll++) {
      if (deleted >= CONFIG.maxDeletes) break;

      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (deleted >= CONFIG.maxDeletes) break;

        const tweetLink = article.querySelector('a[href*="/status/"]');
        const tweetId = tweetLink?.getAttribute('href')?.split('/status/')[1]?.split(/[?/]/)[0];
        if (!tweetId || processed.has(tweetId)) continue;
        processed.add(tweetId);

        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const timeEl = article.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || '';
        const isRetweet = /reposted/i.test(article.querySelector('[data-testid="socialContext"]')?.textContent || '');
        const isReply = text.startsWith('@');
        const isPinned = /pinned/i.test(article.querySelector('[data-testid="socialContext"]')?.textContent || '');
        const likeBtn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');

        // Skip pinned
        if (isPinned) continue;

        // Check owner
        const authorLink = article.querySelector(`a[href="/${profileUser}" i]`);
        if (!authorLink && !isRetweet) continue;

        // Filter: older than
        if (cutoff && timestamp && new Date(timestamp) > cutoff) continue;

        // Filter: keywords
        if (f.containsKeywords.length > 0) {
          const lower = text.toLowerCase();
          if (!f.containsKeywords.some(kw => lower.includes(kw.toLowerCase()))) continue;
        }

        // Filter: type
        if (f.onlyRetweets && !isRetweet) continue;
        if (f.onlyReplies && !isReply) continue;

        const preview = text.slice(0, 60).replace(/\n/g, ' ');

        if (CONFIG.dryRun) {
          console.log(`🔍 Would delete: "${preview}..." (❤️${likes})`);
          deletedLog.push({ tweetId, text: text.slice(0, 200), likes, timestamp, dryRun: true });
          deleted++;
          continue;
        }

        try {
          const caret = article.querySelector('[data-testid="caret"]');
          if (!caret) continue;

          caret.scrollIntoView({ block: 'center' });
          await sleep(300);
          caret.click();
          await sleep(800);

          const menuItems = document.querySelectorAll('[role="menuitem"]');
          let deleteBtn = null;
          for (const item of menuItems) {
            if (/delete/i.test(item.textContent)) { deleteBtn = item; break; }
            if (/undo repost/i.test(item.textContent)) { deleteBtn = item; break; }
          }

          if (!deleteBtn) {
            document.body.click();
            await sleep(300);
            continue;
          }

          deleteBtn.click();
          await sleep(800);

          const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirm) {
            confirm.click();
            deleted++;
            deletedLog.push({ tweetId, text: text.slice(0, 200), likes, timestamp });
            console.log(`🗑️ #${deleted}: Deleted "${preview}..." (❤️${likes})`);
            await sleep(CONFIG.delay);
          }
        } catch (e) {
          errors++;
          document.body.click();
          await sleep(1000);
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Deleted: ${deleted} | Skipped: ${processed.size - deleted} | Errors: ${errors}`);
    console.log(`🔍 Dry run: ${CONFIG.dryRun}`);

    if (deletedLog.length > 0) {
      download(
        { stats: { deleted, errors, dryRun: CONFIG.dryRun }, tweets: deletedLog },
        `xactions-deleted-tweets-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    if (CONFIG.dryRun && deleted > 0) {
      console.log(`\n⚡ Set dryRun = false and re-run to actually delete ${deleted} tweets.`);
    }
  };

  run();
})();
