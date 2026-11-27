// GENERATED FILE: a copy of browser/joinCommunities.js, written by scripts/build-script-manifest.mjs. Edit browser/joinCommunities.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Join Communities on X - by nichxbt
 * https://github.com/nirholas/xactions
 *
 * @name        joinCommunities.js
 * @title       Join Communities
 * @description Join X communities found by keyword on the suggested page, or from a list of community IDs, dry run by default.
 * @category    communities
 * @page        x.com/i/communities/suggested or x.com/i/communities/<id>
 * @writes      true
 * @aliases     scripts/joinCommunities.js, scripts/twitter/join-communities.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 *
 * Discover and join X communities based on keywords
 * 1. Go to https://x.com/i/communities/suggested
 * 2. Open the Developer Console (F12)
 * 3. Paste browser/joinCommunities.js into the Developer Console and run it
 *
 * List mode: put community IDs (from x.com/i/communities/<id>) in
 * CONFIG.communities. The script opens each community in turn; re-paste it after
 * each page load to continue (progress is kept in sessionStorage).
 *
 * Last Updated: 26 November 2026
 */
(() => {
  const CONFIG = {
    // Keywords to filter communities (leave empty to join all visible)
    keywords: [
      // 'crypto',
      // 'AI',
      // 'javascript',
    ],
    // Community IDs to join instead of the keyword scan (list mode)
    // e.g. '1234567890123456789' from x.com/i/communities/1234567890123456789
    communities: [],
    skipAlreadyJoined: true,  // List mode: skip communities you are already in
    navigationDelay: 3000,    // List mode: wait for the community page to load
    maxJoins: 5,
    actionDelay: 3000,
    scrollDelay: 2000,
    maxScrollAttempts: 15,
    dryRun: true, // Set to false to actually join
  };

  const $communityCard = 'div[data-testid="communityCard"], a[href^="/i/communities/"]';
  const $joinButton = 'button[data-testid="join"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let joined = 0;
  const processedCommunities = new Set();

  const run = async () => {
    console.log('🏘️ JOIN COMMUNITIES - XActions by nichxbt');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually join');
    }

    if (CONFIG.keywords.length > 0) {
      console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}`);
    }

    let scrollAttempts = 0;

    while (joined < CONFIG.maxJoins && scrollAttempts < CONFIG.maxScrollAttempts) {
      const cards = document.querySelectorAll($communityCard);
      let foundNew = false;

      for (const card of cards) {
        if (joined >= CONFIG.maxJoins) break;

        const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href^="/i/communities/"]');
        const communityId = linkEl?.href?.match(/communities\/(\d+)/)?.[1] || '';
        if (!communityId || processedCommunities.has(communityId)) continue;
        processedCommunities.add(communityId);
        foundNew = true;

        const name = card.textContent?.trim()?.substring(0, 80) || 'Unknown';

        // Filter by keywords
        if (CONFIG.keywords.length > 0) {
          const nameLC = name.toLowerCase();
          const matches = CONFIG.keywords.some(kw => nameLC.includes(kw.toLowerCase()));
          if (!matches) continue;
        }

        if (CONFIG.dryRun) {
          console.log(`   🏘️ Would join: ${name}`);
          joined++;
          continue;
        }

        try {
          // Navigate to community and join
          const joinBtn = card.querySelector($joinButton) || card.querySelector('button');
          if (joinBtn && joinBtn.textContent.toLowerCase().includes('join')) {
            joinBtn.click();
            await sleep(CONFIG.actionDelay);
            console.log(`✅ Joined: ${name}`);
            joined++;
          } else {
            // Navigate to community page to find join button
            if (linkEl) {
              linkEl.click();
              await sleep(2000);
              const joinOnPage = document.querySelector('button[data-testid="join"]');
              if (joinOnPage) {
                joinOnPage.click();
                console.log(`✅ Joined: ${name}`);
                joined++;
                await sleep(1000);
              }
              // Return to the list even when no Join button was found
              window.history.back();
              await sleep(1500);
            }
          }
        } catch (e) {
          console.warn(`⚠️ Failed to join: ${name}`);
        }
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! ${CONFIG.dryRun ? 'Would join' : 'Joined'} ${joined} communities.`);
  };

  // ── List mode: join communities by ID, resuming across page loads ──
  const $listJoinButton = 'button[aria-label^="Join"]:not([aria-label^="Joined"]), button[data-testid="join"]';
  const $listJoinedButton = 'button[aria-label^="Joined"]';
  const $listPendingButton = 'button[aria-label^="Pending"]';
  const STATE_KEY = 'xactions_joined_communities';
  const INDEX_KEY = 'xactions_join_index';

  const getJoinedCommunities = () => {
    try {
      return JSON.parse(sessionStorage.getItem(STATE_KEY) || '[]');
    } catch { return []; }
  };

  const markAsJoined = (id, status) => {
    const list = getJoinedCommunities();
    if (!list.find(c => c.id === id)) {
      list.push({ id, status, timestamp: Date.now() });
      try { sessionStorage.setItem(STATE_KEY, JSON.stringify(list)); } catch { /* sessionStorage unavailable */ }
    }
  };

  const getCurrentIndex = () => {
    try { return parseInt(sessionStorage.getItem(INDEX_KEY) || '0', 10); } catch { return 0; }
  };

  const setCurrentIndex = (idx) => {
    try { sessionStorage.setItem(INDEX_KEY, idx.toString()); } catch { /* sessionStorage unavailable */ }
  };

  const runFromList = async () => {
    console.log('🏘️ JOIN COMMUNITIES FROM LIST - XActions by nichxbt');
    const ids = CONFIG.communities.map(String);

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually join');
      ids.slice(0, CONFIG.maxJoins).forEach((id, i) => console.log(`   🏘️ Would join ${i + 1}/${ids.length}: x.com/i/communities/${id}`));
      if (ids.length > CONFIG.maxJoins) console.log(`   (capped at maxJoins = ${CONFIG.maxJoins})`);
      return;
    }

    console.log(`📋 Communities to join: ${ids.length}`);
    console.log(`✅ Already processed: ${getJoinedCommunities().length}`);

    const processCurrentCommunity = async () => {
      const index = getCurrentIndex();

      // Check if we're done
      if (index >= ids.length) {
        const list = getJoinedCommunities();
        console.log(`\n🎉 COMPLETE! Processed ${list.length} communities`);
        console.log(`   ✅ Joined: ${list.filter(c => c.status === 'joined').length}`);
        console.log(`   ⏳ Pending approval: ${list.filter(c => c.status === 'pending').length}`);
        console.log(`   ⏭️ Already joined: ${list.filter(c => c.status === 'already_joined').length}`);
        console.log(`   ❌ Failed: ${list.filter(c => c.status === 'failed').length}`);
        try {
          sessionStorage.removeItem(STATE_KEY);
          sessionStorage.removeItem(INDEX_KEY);
        } catch { /* sessionStorage unavailable */ }
        return;
      }

      // Check limits
      const successCount = getJoinedCommunities().filter(c => c.status === 'joined' || c.status === 'pending').length;
      if (CONFIG.maxJoins > 0 && successCount >= CONFIG.maxJoins) {
        console.log(`🛑 Reached limit of ${CONFIG.maxJoins} communities. Stopping.`);
        return;
      }

      const communityId = ids[index];
      const currentId = window.location.href.match(/\/i\/communities\/(\d+)/)?.[1] || null;

      // Navigate to community if not there
      if (currentId !== communityId) {
        console.log(`📍 Navigating to community ${index + 1}/${ids.length}: ${communityId}`);
        console.log('💡 Re-paste this script after the page loads to continue (progress is saved).');
        window.location.href = `https://x.com/i/communities/${communityId}`;
        return;
      }

      console.log(`🔍 Processing community ${index + 1}/${ids.length}: ${communityId}`);
      await sleep(CONFIG.navigationDelay);

      if (document.querySelector($listJoinedButton) && CONFIG.skipAlreadyJoined) {
        console.log('⏭️ Already a member, skipping...');
        markAsJoined(communityId, 'already_joined');
        setCurrentIndex(index + 1);
        await sleep(1000);
        return processCurrentCommunity();
      }

      if (document.querySelector($listPendingButton)) {
        console.log('⏳ Request pending, skipping...');
        markAsJoined(communityId, 'pending');
        setCurrentIndex(index + 1);
        await sleep(1000);
        return processCurrentCommunity();
      }

      const joinBtn = document.querySelector($listJoinButton);
      if (joinBtn) {
        console.log('👆 Clicking Join button...');
        joinBtn.click();
        await sleep(CONFIG.actionDelay);
        if (document.querySelector($listJoinedButton)) {
          console.log(`✅ Successfully joined community: ${communityId}`);
          markAsJoined(communityId, 'joined');
        } else if (document.querySelector($listPendingButton)) {
          console.log(`⏳ Request sent (awaiting approval): ${communityId}`);
          markAsJoined(communityId, 'pending');
        } else {
          console.log(`❓ Join status unknown for: ${communityId}`);
          markAsJoined(communityId, 'unknown');
        }
      } else {
        console.log(`❌ Join button not found for: ${communityId}`);
        markAsJoined(communityId, 'failed');
      }

      // Move to next
      setCurrentIndex(index + 1);
      await sleep(CONFIG.actionDelay);
      return processCurrentCommunity();
    };

    await processCurrentCommunity();
  };

  if (Array.isArray(CONFIG.communities) && CONFIG.communities.length > 0) runFromList();
  else run();
})();
