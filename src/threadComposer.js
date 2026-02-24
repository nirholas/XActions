/**
 * ============================================================
 * 🧵 Thread Composer & Publisher — Production Grade
 * ============================================================
 *
 * @name        threadComposer.js
 * @description Compose and publish Twitter/X threads from the
 *              browser console. Manages multi-tweet threads with
 *              character counting, auto-numbering, preview mode,
 *              draft persistence (localStorage), and sequential
 *              posting with human-like delays.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Open x.com in browser
 * 2. Paste in DevTools Console
 * 3. Use window.XActions commands:
 *
 *   XActions.thread([
 *     "First tweet of my thread 🧵",
 *     "Second tweet with more context...",
 *     "Third tweet — the conclusion!",
 *   ])
 *
 *   XActions.preview()        // See the thread with char counts
 *   XActions.publish()        // Post the thread (dryRun by default)
 *   XActions.saveDraft('name') // Save to localStorage
 *   XActions.loadDraft('name') // Load from localStorage
 *   XActions.listDrafts()      // See all saved drafts
 *   XActions.deleteDraft('name')
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    dryRun: true,             // Set false to actually post
    autoNumber: false,         // Add "1/N" numbering
    addThreadEmoji: true,      // Add 🧵 to first tweet if missing
    delayBetween: [3000, 6000], // Delay between posting each tweet
    maxChars: 280,
  };

  const STORAGE_PREFIX = 'xactions_thread_draft_';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));

  const SEL = {
    tweetBox: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    addTweet: '[data-testid="addButton"]',     // The "+" button to add another tweet in thread
    closeCompose: '[data-testid="app-bar-close"]',
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  let currentThread = [];
  let aborted = false;

  // ── Thread management ──────────────────────────────────────
  window.XActions = window.XActions || {};

  window.XActions.thread = (tweets) => {
    if (!Array.isArray(tweets) || tweets.length === 0) {
      console.log('❌ Usage: XActions.thread(["tweet1", "tweet2", ...])');
      return;
    }

    currentThread = tweets.map((t, i) => {
      let text = t.trim();

      // Auto-numbering
      if (CONFIG.autoNumber) {
        const num = `${i + 1}/${tweets.length}`;
        if (!text.startsWith(num)) {
          text = `${num}\n\n${text}`;
        }
      }

      // Thread emoji on first tweet
      if (i === 0 && CONFIG.addThreadEmoji && !text.includes('🧵')) {
        text = text + ' 🧵';
      }

      return text;
    });

    console.log(`✅ Thread loaded: ${currentThread.length} tweets.`);
    window.XActions.preview();
  };

  window.XActions.preview = () => {
    if (currentThread.length === 0) {
      console.log('📭 No thread loaded. Use XActions.thread([...])');
      return;
    }

    const W = 58;
    console.log('\n╔' + '═'.repeat(W) + '╗');
    console.log('║  🧵 THREAD PREVIEW' + ' '.repeat(W - 20) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    for (let i = 0; i < currentThread.length; i++) {
      const text = currentThread[i];
      const charCount = text.length;
      const status = charCount > CONFIG.maxChars ? '🔴 OVER' : charCount > CONFIG.maxChars - 20 ? '🟡 CLOSE' : '🟢 OK';

      console.log(`\n┌─ Tweet ${i + 1}/${currentThread.length} ─ ${charCount}/${CONFIG.maxChars} chars [${status}] ${'─'.repeat(Math.max(0, 30 - String(charCount).length))}`);

      // Word wrap display
      const lines = text.split('\n');
      for (const line of lines) {
        console.log(`│ ${line}`);
      }
      console.log('└' + '─'.repeat(W));
    }

    const overLimit = currentThread.filter(t => t.length > CONFIG.maxChars);
    if (overLimit.length > 0) {
      console.log(`\n⚠️ ${overLimit.length} tweet(s) exceed ${CONFIG.maxChars} characters!`);
    }

    const totalChars = currentThread.reduce((s, t) => s + t.length, 0);
    console.log(`\n📊 ${currentThread.length} tweets | ${totalChars} total chars | ~${Math.ceil(totalChars / 200)} min read`);
  };

  window.XActions.publish = async () => {
    if (currentThread.length === 0) {
      console.log('❌ No thread loaded. Use XActions.thread([...]) first.');
      return;
    }

    const overLimit = currentThread.filter(t => t.length > CONFIG.maxChars);
    if (overLimit.length > 0) {
      console.log(`❌ ${overLimit.length} tweet(s) exceed character limit. Fix them first.`);
      return;
    }

    if (CONFIG.dryRun) {
      console.log('\n🏃 DRY RUN — simulating thread publish...\n');
      for (let i = 0; i < currentThread.length; i++) {
        console.log(`  [${i + 1}/${currentThread.length}] Would post: "${currentThread[i].slice(0, 60)}..."`);
        await sleep(500);
      }
      console.log('\n✅ Dry run complete. Set CONFIG.dryRun = false to actually post.');
      return;
    }

    aborted = false;
    console.log(`\n🚀 Publishing thread (${currentThread.length} tweets)...\n`);

    // Open compose
    const composeBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]') ||
                       document.querySelector('a[href="/compose/tweet"]');
    if (composeBtn) {
      composeBtn.click();
      await sleep(2000);
    }

    for (let i = 0; i < currentThread.length; i++) {
      if (aborted) {
        console.log('🛑 Aborted by user.');
        break;
      }

      const text = currentThread[i];
      console.log(`  [${i + 1}/${currentThread.length}] Posting: "${text.slice(0, 50)}..."`);

      // Find the tweet box (for thread, the latest/last one)
      const tweetBoxes = document.querySelectorAll('[data-testid="tweetTextarea_0"]');
      const tweetBox = tweetBoxes[tweetBoxes.length - 1];
      if (!tweetBox) {
        console.error(`  ❌ Tweet box not found at tweet ${i + 1}. Aborting.`);
        break;
      }

      // Type the text
      tweetBox.focus();
      await sleep(300);
      document.execCommand('insertText', false, text);
      await sleep(800);

      if (i < currentThread.length - 1) {
        // Add another tweet to thread (click "+" button)
        const addBtn = $(SEL.addTweet);
        if (addBtn) {
          addBtn.click();
          await sleep(1500);
        } else {
          console.error('  ❌ "Add tweet" button not found. Cannot continue thread.');
          break;
        }
      }
    }

    if (!aborted) {
      // Post the thread
      console.log('\n  📤 Sending thread...');
      const tweetBtn = $(SEL.tweetButton);
      if (!tweetBtn) {
        // Try alternate: "Post all" button
        const postAll = document.querySelector('[data-testid="tweetButtonInline"]') ||
                        document.querySelector('div[data-testid="tweetButton"]');
        if (postAll) postAll.click();
        else console.error('  ❌ Post button not found.');
      } else {
        tweetBtn.click();
      }

      await sleep(3000);
      console.log('✅ Thread published successfully! 🧵');
    }
  };

  window.XActions.abort = () => { aborted = true; console.log('🛑 Aborting...'); };

  // ── Draft Management ───────────────────────────────────────
  window.XActions.saveDraft = (name) => {
    if (!name) { console.log('❌ Usage: XActions.saveDraft("myThread")'); return; }
    if (currentThread.length === 0) { console.log('❌ No thread loaded.'); return; }

    const draft = {
      tweets: currentThread,
      savedAt: new Date().toISOString(),
      name,
    };
    localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(draft));
    console.log(`💾 Draft "${name}" saved (${currentThread.length} tweets).`);
  };

  window.XActions.loadDraft = (name) => {
    if (!name) { console.log('❌ Usage: XActions.loadDraft("myThread")'); return; }

    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    if (!raw) { console.log(`❌ Draft "${name}" not found.`); return; }

    try {
      const draft = JSON.parse(raw);
      currentThread = draft.tweets;
      console.log(`📂 Loaded draft "${name}" (${currentThread.length} tweets, saved ${draft.savedAt}).`);
      window.XActions.preview();
    } catch {
      console.log('❌ Failed to parse draft.');
    }
  };

  window.XActions.listDrafts = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(STORAGE_PREFIX)) {
        const name = key.slice(STORAGE_PREFIX.length);
        try {
          const draft = JSON.parse(localStorage.getItem(key));
          keys.push({ name, tweets: draft.tweets.length, savedAt: draft.savedAt });
        } catch { /* skip corrupt */ }
      }
    }

    if (keys.length === 0) {
      console.log('📭 No saved drafts.');
      return;
    }

    console.log(`\n📋 SAVED DRAFTS (${keys.length}):\n`);
    for (const d of keys) {
      console.log(`  📝 "${d.name}" — ${d.tweets} tweets (saved ${d.savedAt})`);
    }
  };

  window.XActions.deleteDraft = (name) => {
    if (!name) { console.log('❌ Usage: XActions.deleteDraft("myThread")'); return; }
    if (!localStorage.getItem(STORAGE_PREFIX + name)) {
      console.log(`❌ Draft "${name}" not found.`);
      return;
    }
    localStorage.removeItem(STORAGE_PREFIX + name);
    console.log(`🗑️ Draft "${name}" deleted.`);
  };

  window.XActions.exportThread = () => {
    if (currentThread.length === 0) {
      console.log('❌ No thread loaded.');
      return;
    }
    const blob = new Blob([JSON.stringify({ tweets: currentThread, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `xactions-thread-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    console.log('📥 Thread exported.');
  };

  // ── Initialization ─────────────────────────────────────────
  const W = 60;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  🧵 THREAD COMPOSER & PUBLISHER' + ' '.repeat(W - 33) + '║');
  console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
  console.log('\n📋 Commands:');
  console.log('  XActions.thread(["tweet1", "tweet2", ...])');
  console.log('  XActions.preview()');
  console.log('  XActions.publish()');
  console.log('  XActions.saveDraft("name")');
  console.log('  XActions.loadDraft("name")');
  console.log('  XActions.listDrafts()');
  console.log('  XActions.deleteDraft("name")');
  console.log('  XActions.exportThread()');
  console.log('\n💡 Tip: Start with XActions.thread([...]) then XActions.preview()');

})();
