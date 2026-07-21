// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/threadComposer.js
// Browser console script for interactive thread composing with draft persistence
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    autoNumber: true,   // Add "1/N" numbering to tweets
    maxChars: 280,
    dryRun: true,       // SET FALSE TO ACTUALLY POST
    delayBetween: 3000, // ms between posting each tweet
  };
  // =============================================

  const STORAGE_KEY = 'xactions_thread_draft_';
  let currentThread = [];

  const typeIntoInput = async (input, text) => {
    input.focus();
    await sleep(100);
    document.execCommand('insertText', false, text);
    await sleep(200);
  };

  window.XActions = window.XActions || {};

  // ── Add tweets to the thread ───────────────────
  window.XActions.thread = (text) => {
    if (Array.isArray(text)) {
      currentThread = text.map(t => t.trim());
      console.log(`✅ Thread loaded: ${currentThread.length} tweets`);
    } else if (typeof text === 'string') {
      currentThread.push(text.trim());
      console.log(`➕ Tweet ${currentThread.length} added (${text.length}/${CONFIG.maxChars} chars)`);
    } else {
      console.log('❌ Usage: XActions.thread("tweet text") or XActions.thread(["t1","t2"])');
      return;
    }
    window.XActions.preview();
  };

  // ── Preview the current thread ─────────────────
  window.XActions.preview = () => {
    if (currentThread.length === 0) {
      console.log('📭 No thread loaded. Use XActions.thread("text") to add tweets.');
      return;
    }

    const numbered = currentThread.map((t, i) => {
      return CONFIG.autoNumber ? `${i + 1}/${currentThread.length}\n\n${t}` : t;
    });

    console.log('\n🧵 ─── THREAD PREVIEW ───────────────────────');
    numbered.forEach((t, i) => {
      const len = t.length;
      const status = len > CONFIG.maxChars ? '🔴 OVER' : len > CONFIG.maxChars - 20 ? '🟡 CLOSE' : '🟢 OK';
      console.log(`\n  Tweet ${i + 1}/${numbered.length} [${len}/${CONFIG.maxChars}] ${status}`);
      t.split('\n').forEach(line => console.log(`  │ ${line}`));
    });

    const overLimit = numbered.filter(t => t.length > CONFIG.maxChars);
    if (overLimit.length > 0) {
      console.log(`\n⚠️ ${overLimit.length} tweet(s) exceed ${CONFIG.maxChars} characters!`);
    }
    console.log(`\n📊 ${currentThread.length} tweets | ${currentThread.reduce((s, t) => s + t.length, 0)} total chars`);
  };

  // ── Publish the thread ─────────────────────────
  window.XActions.publish = async () => {
    if (currentThread.length === 0) {
      console.log('❌ No thread loaded. Use XActions.thread([...]) first.');
      return;
    }

    const tweets = currentThread.map((t, i) => {
      return CONFIG.autoNumber ? `${i + 1}/${currentThread.length}\n\n${t}` : t;
    });

    const overLimit = tweets.filter(t => t.length > CONFIG.maxChars);
    if (overLimit.length > 0) {
      console.log(`❌ ${overLimit.length} tweet(s) exceed character limit. Fix them first.`);
      return;
    }

    if (CONFIG.dryRun) {
      console.log('\n🏃 DRY RUN — simulating publish...');
      tweets.forEach((t, i) => console.log(`  [${i + 1}/${tweets.length}] Would post: "${t.slice(0, 60)}..."`));
      console.log('\n✅ Dry run complete. Set CONFIG.dryRun = false to actually post.');
      return;
    }

    console.log(`\n🚀 Publishing thread (${tweets.length} tweets)...`);

    // Open compose
    const composeBtn = document.querySelector('a[data-testid="SideNav_NewTweet_Button"]');
    if (composeBtn) { composeBtn.click(); await sleep(2000); }

    for (let i = 0; i < tweets.length; i++) {
      const boxes = document.querySelectorAll('[data-testid="tweetTextarea_0"]');
      const box = boxes[boxes.length - 1];
      if (!box) { console.error(`❌ Tweet box not found at tweet ${i + 1}`); break; }

      await typeIntoInput(box, tweets[i]);
      console.log(`  ✅ [${i + 1}/${tweets.length}] typed`);

      if (i < tweets.length - 1) {
        const addBtn = document.querySelector('[data-testid="addButton"]');
        if (addBtn) { addBtn.click(); await sleep(CONFIG.delayBetween); }
        else { console.error('❌ Add-tweet button not found'); break; }
      }
    }

    await sleep(1000);
    const postBtn = document.querySelector('[data-testid="tweetButton"]') ||
                    document.querySelector('[data-testid="tweetButtonInline"]');
    if (postBtn) { postBtn.click(); console.log('\n🧵 Thread published!'); }
    else { console.error('❌ Post button not found. Click "Post all" manually.'); }
  };

  // ── Save / Load / List / Delete Drafts ─────────
  window.XActions.saveDraft = (name) => {
    if (!name) { console.log('❌ Usage: XActions.saveDraft("name")'); return; }
    if (currentThread.length === 0) { console.log('❌ No thread to save.'); return; }
    localStorage.setItem(STORAGE_KEY + name, JSON.stringify({
      tweets: currentThread, savedAt: new Date().toISOString(), name,
    }));
    console.log(`💾 Draft "${name}" saved (${currentThread.length} tweets).`);
  };

  window.XActions.loadDraft = (name) => {
    if (!name) { console.log('❌ Usage: XActions.loadDraft("name")'); return; }
    const raw = localStorage.getItem(STORAGE_KEY + name);
    if (!raw) { console.log(`❌ Draft "${name}" not found.`); return; }
    try {
      const draft = JSON.parse(raw);
      currentThread = draft.tweets;
      console.log(`📂 Loaded "${name}" (${currentThread.length} tweets, saved ${draft.savedAt})`);
      window.XActions.preview();
    } catch { console.log('❌ Failed to parse draft.'); }
  };

  window.XActions.listDrafts = () => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(STORAGE_KEY)) {
        try {
          const d = JSON.parse(localStorage.getItem(key));
          drafts.push({ name: key.slice(STORAGE_KEY.length), tweets: d.tweets.length, saved: d.savedAt });
        } catch { /* skip */ }
      }
    }
    if (drafts.length === 0) { console.log('📭 No saved drafts.'); return; }
    console.log(`\n📋 DRAFTS (${drafts.length}):`);
    drafts.forEach(d => console.log(`  📝 "${d.name}" — ${d.tweets} tweets (${d.saved})`));
  };

  window.XActions.deleteDraft = (name) => {
    if (!name) { console.log('❌ Usage: XActions.deleteDraft("name")'); return; }
    if (!localStorage.getItem(STORAGE_KEY + name)) { console.log(`❌ Draft "${name}" not found.`); return; }
    localStorage.removeItem(STORAGE_KEY + name);
    console.log(`🗑️ Draft "${name}" deleted.`);
  };

  // ── Init ───────────────────────────────────────
  console.log('🧵 THREAD COMPOSER — XActions by nichxbt');
  console.log('📋 Commands:');
  console.log('  XActions.thread("text")         — add a tweet');
  console.log('  XActions.thread(["t1","t2"])     — load full thread');
  console.log('  XActions.preview()               — preview with char counts');
  console.log('  XActions.publish()               — post the thread');
  console.log('  XActions.saveDraft("name")       — save to localStorage');
  console.log('  XActions.loadDraft("name")       — load a draft');
  console.log('  XActions.listDrafts()            — list all drafts');
  console.log('  XActions.deleteDraft("name")     — delete a draft');
})();
