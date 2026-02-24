// scripts/multiAccountTimelineLiker.js
// Like the entire timeline of multiple X accounts in sequence
// Example: like 500 posts on @nichxbt, then 500 on @doi, etc.
// Paste in DevTools console on x.com
// by nichxbt

(() => {
  'use strict';

  // =============================================
  // ⬇️ CONFIGURE YOUR TARGETS HERE
  // =============================================
  const TARGETS = [
    { username: 'nichxbt', maxLikes: 500 },
    { username: 'doi',     maxLikes: 500 },
    // Add more accounts:
    // { username: 'someUser', maxLikes: 200 },
  ];

  const CONFIG = {
    delayBetween: [2000, 5000],   // Random delay between likes (ms)
    scrollDelay: 2500,            // Pause after each scroll (ms)
    maxScrollsWithoutNew: 8,      // Stop scrolling if no new tweets found
    dryRun: false,                // true = preview mode (no clicks)
    pauseBetweenAccounts: 10000,  // 10s pause when switching accounts
  };

  // =============================================

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));

  const SEL = {
    tweet:     'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeBtn:   '[data-testid="like"]',
    unlikeBtn: '[data-testid="unlike"]',
    toast:     '[data-testid="toast"]',
  };

  // ── Abort handle ───────────────────────────────────────────
  let aborted = false;
  window.XActions = window.XActions || {};
  window.XActions.stop = () => { aborted = true; console.log('🛑 Stopping after current tweet...'); };

  const isRateLimited = () => {
    for (const el of document.querySelectorAll(`${SEL.toast}, [role="alert"]`)) {
      if (/rate limit|try again|too many|slow down/i.test(el.textContent)) return true;
    }
    return false;
  };

  // ── Navigate to a user's profile ───────────────────────────
  const goToProfile = async (username) => {
    const url = `https://x.com/${username}`;
    console.log(`\n🔗 Navigating to ${url}...`);
    window.location.href = url;

    // Wait for the profile timeline to load
    let attempts = 0;
    while (attempts < 30) {
      await sleep(1000);
      const tweets = document.querySelectorAll(SEL.tweet);
      // Check we're on the right page and tweets loaded
      if (tweets.length > 0 && window.location.pathname.toLowerCase().includes(username.toLowerCase())) {
        console.log(`   ✅ Profile loaded — ${tweets.length} tweets visible`);
        return true;
      }
      attempts++;
    }
    console.log(`   ⚠️ Profile may not have loaded fully. Proceeding anyway...`);
    return true;
  };

  // ── Like timeline for one account ──────────────────────────
  const likeTimeline = async (username, maxLikes) => {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  👤 @${username} — liking up to ${maxLikes} posts`);
    console.log(`${'═'.repeat(50)}`);

    let liked = 0;
    const seen = new Set();
    let scrollsWithoutNew = 0;

    while (liked < maxLikes && !aborted) {
      const articles = document.querySelectorAll(SEL.tweet);
      let foundNew = false;

      for (const article of articles) {
        if (liked >= maxLikes || aborted) break;

        // Unique fingerprint
        const link = article.querySelector('a[href*="/status/"]')?.href || '';
        const textEl = article.querySelector(SEL.tweetText);
        const text = textEl ? textEl.textContent.trim() : '';
        const id = link || text.slice(0, 80);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        foundNew = true;

        // Already liked?
        if (article.querySelector(SEL.unlikeBtn)) {
          continue;
        }

        // Rate limit check
        if (isRateLimited()) {
          console.log('   🚨 Rate limited! Waiting 120s...');
          await sleep(120000);
          if (isRateLimited()) {
            console.log('   🛑 Still limited. Stopping this account.');
            return { username, liked, stopped: 'rate_limit' };
          }
        }

        // Scroll into view
        article.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(400);

        const likeBtn = article.querySelector(SEL.likeBtn);
        if (!likeBtn) continue;

        if (CONFIG.dryRun) {
          console.log(`   🏃 [DRY] Would like: "${text.slice(0, 50)}..."`);
        } else {
          likeBtn.click();
          await sleep(400);
        }

        liked++;
        if (liked % 25 === 0 || liked === 1) {
          console.log(`   ❤️ @${username}: ${liked}/${maxLikes} liked`);
        }

        const delay = rand(CONFIG.delayBetween[0], CONFIG.delayBetween[1]);
        await sleep(delay);
      }

      if (liked >= maxLikes || aborted) break;

      // Scroll for more
      if (foundNew) {
        scrollsWithoutNew = 0;
      } else {
        scrollsWithoutNew++;
        if (scrollsWithoutNew >= CONFIG.maxScrollsWithoutNew) {
          console.log(`   ⚠️ No new tweets after ${scrollsWithoutNew} scrolls. Moving on.`);
          break;
        }
      }

      window.scrollBy(0, 1200);
      await sleep(CONFIG.scrollDelay);
    }

    return { username, liked, stopped: aborted ? 'aborted' : 'done' };
  };

  // ── Main ───────────────────────────────────────────────────
  const run = async () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🔄 MULTI-ACCOUNT TIMELINE LIKER              ║');
    console.log('║  by nichxbt — XActions                         ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`   Accounts: ${TARGETS.map(t => `@${t.username} (${t.maxLikes})`).join(', ')}`);
    console.log(`   Dry run: ${CONFIG.dryRun}`);
    console.log(`   ℹ️ Type XActions.stop() to abort at any time\n`);

    const results = [];

    for (let i = 0; i < TARGETS.length; i++) {
      if (aborted) break;

      const { username, maxLikes } = TARGETS[i];

      // Navigate to profile
      await goToProfile(username);
      await sleep(2000); // Let page settle

      // Like their timeline
      const result = await likeTimeline(username, maxLikes);
      results.push(result);

      console.log(`\n   ✅ @${username}: ${result.liked} posts liked (${result.stopped})`);

      // Pause between accounts
      if (i < TARGETS.length - 1 && !aborted) {
        console.log(`\n   ⏳ Pausing ${CONFIG.pauseBetweenAccounts / 1000}s before next account...`);
        await sleep(CONFIG.pauseBetweenAccounts);
      }
    }

    // ── Summary ──────────────────────────────────────────────
    const total = results.reduce((sum, r) => sum + r.liked, 0);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🔄 MULTI-ACCOUNT TIMELINE LIKER — RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const r of results) {
      console.log(`  👤 @${r.username}: ${r.liked} liked (${r.stopped})`);
    }
    console.log(`  ─────────────────────────────────`);
    console.log(`  ❤️  Total: ${total} posts liked`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing was liked)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  };

  // ⚠️ IMPORTANT: This script navigates between pages.
  // After navigation, the script context is lost.
  // For multi-account, we use sessionStorage to track progress.

  const STATE_KEY = 'xactions_multi_liker';

  const getState = () => {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY)); }
    catch { return null; }
  };

  const setState = (state) => {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  };

  const clearState = () => {
    sessionStorage.removeItem(STATE_KEY);
  };

  // ── Resume-aware runner ────────────────────────────────────
  // Because window.location.href kills the script, we use a
  // page-by-page approach: like one account, save state, navigate,
  // then user re-runs the script to continue.

  const runWithResume = async () => {
    let state = getState();

    if (!state) {
      // Fresh start
      state = {
        currentIndex: 0,
        results: [],
        startedAt: new Date().toISOString(),
      };
    }

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🔄 MULTI-ACCOUNT TIMELINE LIKER              ║');
    console.log('║  by nichxbt — XActions                         ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`   Accounts: ${TARGETS.map(t => `@${t.username} (${t.maxLikes})`).join(', ')}`);
    console.log(`   Dry run: ${CONFIG.dryRun}`);
    console.log(`   Progress: ${state.currentIndex}/${TARGETS.length} accounts done`);
    console.log(`   ℹ️ Type XActions.stop() to abort\n`);

    if (state.currentIndex >= TARGETS.length) {
      console.log('🎉 All accounts already processed! Call clearState() or clear sessionStorage to restart.');
      clearState();
      return;
    }

    const target = TARGETS[state.currentIndex];
    const currentPath = window.location.pathname.toLowerCase();

    // Check if we're on the right profile
    if (!currentPath.startsWith(`/${target.username.toLowerCase()}`)) {
      console.log(`\n🔗 Navigate to https://x.com/${target.username} and re-run this script.`);
      console.log(`   (Or we'll navigate now — re-paste the script after the page loads)\n`);
      setState(state);
      window.location.href = `https://x.com/${target.username}`;
      return;
    }

    // We're on the right page — like away
    await sleep(2000);
    const result = await likeTimeline(target.username, target.maxLikes);
    state.results.push(result);
    state.currentIndex++;
    setState(state);

    console.log(`\n   ✅ @${target.username}: ${result.liked} posts liked`);

    if (state.currentIndex < TARGETS.length && !aborted) {
      const next = TARGETS[state.currentIndex];
      console.log(`\n   ➡️ Next: @${next.username} (${next.maxLikes} likes)`);
      console.log(`   ⏳ Navigating in ${CONFIG.pauseBetweenAccounts / 1000}s...`);
      await sleep(CONFIG.pauseBetweenAccounts);
      setState(state);
      window.location.href = `https://x.com/${next.username}`;
      console.log('\n   📋 Re-paste this script after the page loads to continue!\n');
    } else {
      // All done
      const total = state.results.reduce((sum, r) => sum + r.liked, 0);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  🔄 MULTI-ACCOUNT TIMELINE LIKER — FINAL RESULTS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      for (const r of state.results) {
        console.log(`  👤 @${r.username}: ${r.liked} liked (${r.stopped})`);
      }
      console.log(`  ─────────────────────────────────`);
      console.log(`  ❤️  Total: ${total} posts liked`);
      if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing was liked)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      clearState();
    }
  };

  runWithResume();
})();
