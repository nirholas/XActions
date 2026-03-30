/**
 * ============================================================
 * 🎧 Join a Space — Production Grade
 * ============================================================
 *
 * @name        joinSpace.js
 * @description Find and join live X Spaces by topic, keyword,
 *              or specific host username.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/search or https://x.com/home
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 *
 * 💡 Leave keywords empty & set targetHost to join a specific
 *    user's Space.
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Search ───────────────────────────────────────────────
    keywords: ['crypto', 'web3'],    // Keywords to match in Space titles (any match)
    targetHost: '',                   // Specific host to join (without @), leave empty to search by keywords
    autoJoin: true,                   // Automatically join the first matching Space
    minListeners: 0,                  // Minimum listener count to join

    // ── Timing ───────────────────────────────────────────────
    searchDelay: 3000,
    scrollDelay: 2000,
    actionDelay: 2000,
    maxScrollAttempts: 15,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,                    // Set to false to actually join
  };

  const SEL = {
    joinSpace:      '[data-testid="joinSpace"]',
    spaceCard:      '[data-testid="SpaceCard"]',
    spaceTitle:     '[data-testid="spaceTitle"]',
    spaceListeners: '[data-testid="spaceListeners"]',
    searchInput:    '[data-testid="SearchBox_Search_Input"]',
    spacePill:      '[data-testid="Spaces_Pill"]',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  let aborted = false;

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const parseListenerCount = (text) => {
    if (!text) return 0;
    const clean = text.replace(/,/g, '').trim();
    const m = clean.match(/([\d.]+)\s*([KMkm])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, K: 1e3, m: 1e6, M: 1e6 }[m[2]] || 1;
    return Math.round(n);
  };

  const stats = {
    spacesFound: 0,
    spacesMatched: 0,
    joined: false,
    joinedTitle: '',
    startTime: Date.now(),
  };

  window.XActions = {
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      console.log(`📊 Found: ${stats.spacesFound} | Matched: ${stats.spacesMatched} | Joined: ${stats.joined} | ${el}s`);
    },
  };

  const extractSpaceInfo = (card) => {
    const titleEl = card.querySelector(SEL.spaceTitle) ||
                    card.querySelector('[dir="auto"]');
    const listenersEl = card.querySelector(SEL.spaceListeners) ||
                        card.querySelector('span[dir="ltr"]');

    const title = titleEl?.textContent?.trim() || '';
    const listenersText = listenersEl?.textContent || '';
    const listeners = parseListenerCount(listenersText);
    const hostEl = card.querySelector('a[href*="/"]');
    const host = hostEl?.href?.split('/').pop() || '';

    return { title, listeners, host, element: card };
  };

  const matchesFilters = (space) => {
    // Check target host
    if (CONFIG.targetHost) {
      return space.host.toLowerCase() === CONFIG.targetHost.toLowerCase();
    }

    // Check keywords
    if (CONFIG.keywords.length > 0) {
      const titleLower = space.title.toLowerCase();
      const hasKeyword = CONFIG.keywords.some(kw => titleLower.includes(kw.toLowerCase()));
      if (!hasKeyword) return false;
    }

    // Check minimum listeners
    if (space.listeners < CONFIG.minListeners) return false;

    return true;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🎧 JOIN A SPACE' + ' '.repeat(W - 19) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually join');
    }

    if (CONFIG.targetHost) {
      console.log(`📋 Looking for Space by: @${CONFIG.targetHost}`);
    } else {
      console.log(`📋 Keywords: ${CONFIG.keywords.join(', ')}`);
    }
    console.log(`📋 Min listeners: ${CONFIG.minListeners}`);

    const sessionKey = 'xactions_joinSpace';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    // Navigate to search with Spaces filter
    const searchQuery = CONFIG.targetHost
      ? `from:${CONFIG.targetHost}`
      : CONFIG.keywords.join(' OR ');

    console.log(`🔍 Searching: "${searchQuery}"...`);

    // Use the search input if available
    const searchInput = await waitForSelector(SEL.searchInput, 5000);
    if (searchInput && !CONFIG.dryRun) {
      searchInput.focus();
      searchInput.value = '';
      document.execCommand('insertText', false, searchQuery);
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(500);
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      searchInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
      searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
      // Simulate form submission
      const form = searchInput.closest('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
      await sleep(CONFIG.searchDelay);
    }

    // Look for Spaces tab/pill
    const spacesPill = $(SEL.spacePill) ||
                       document.querySelector('a[href*="f=spaces"]') ||
                       document.querySelector('[role="tab"][aria-label*="Space"]');
    if (spacesPill && !CONFIG.dryRun) {
      spacesPill.click();
      await sleep(CONFIG.searchDelay);
    }

    // Scan for Space cards
    let scrollAttempts = 0;
    const processedCards = new Set();

    while (!stats.joined && scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const cards = $$(SEL.spaceCard);

      // Also try finding Spaces by their live indicator
      const liveIndicators = $$('[aria-label*="LIVE"], [aria-label*="Live"]');
      const spaceLikeCards = liveIndicators.map(el =>
        el.closest('[data-testid="SpaceCard"]') ||
        el.closest('article') ||
        el.closest('[role="listitem"]')
      ).filter(Boolean);

      const allCards = [...new Set([...cards, ...spaceLikeCards])];
      stats.spacesFound = allCards.length;

      for (const card of allCards) {
        if (aborted) break;

        const cardId = card.textContent.slice(0, 100);
        if (processedCards.has(cardId)) continue;
        processedCards.add(cardId);

        const space = extractSpaceInfo(card);
        console.log(`🎙️ Found: "${space.title}" (${space.listeners} listeners) by @${space.host}`);

        if (matchesFilters(space)) {
          stats.spacesMatched++;
          console.log(`✅ Matches filters!`);

          if (CONFIG.autoJoin) {
            console.log(`🔄 Joining: "${space.title}"...`);

            // Look for join button within the card
            const joinBtn = card.querySelector(SEL.joinSpace) ||
                            card.querySelector('button[aria-label*="Join"]') ||
                            card.querySelector('[role="button"]');

            if (joinBtn && !CONFIG.dryRun) {
              joinBtn.click();
              await sleep(CONFIG.actionDelay);
            } else if (!joinBtn) {
              // Try clicking the card itself
              if (!CONFIG.dryRun) {
                card.click();
                await sleep(CONFIG.actionDelay);

                // Look for join button in the expanded view
                const expandedJoin = await waitForSelector(SEL.joinSpace, 5000);
                if (expandedJoin) {
                  expandedJoin.click();
                  await sleep(CONFIG.actionDelay);
                }
              }
            }

            stats.joined = true;
            stats.joinedTitle = space.title;
            console.log(`✅ Joined Space: "${space.title}"`);
            break;
          }
        }
      }

      if (!stats.joined) {
        window.scrollBy(0, 800);
        await sleep(CONFIG.scrollDelay);
        scrollAttempts++;
      }
    }

    if (aborted) {
      console.log('🛑 Aborted by user');
    }

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 JOIN SPACE SUMMARY' + ' '.repeat(W - 24) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🔍 Spaces found: ${stats.spacesFound}`);
    console.log(`✅ Matched filters: ${stats.spacesMatched}`);
    console.log(`🎧 Joined: ${stats.joined ? `"${stats.joinedTitle}"` : 'none'}`);
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
