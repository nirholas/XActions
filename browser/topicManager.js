// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🏷️ Topic Manager — Production Grade
 * ============================================================
 *
 * @name        topicManager.js
 * @description Browse, follow, and unfollow X Topics. Manage
 *              your followed topics list and discover new ones.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/i/topics or https://x.com/settings/your_topics
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 *
 * 🎮 CONTROLS:
 *   window.XActions.abort()   — stop the script
 *   window.XActions.status()  — check progress
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Action ───────────────────────────────────────────────
    action: 'list',
    //   'list'       — list all currently followed topics
    //   'follow'     — follow topics matching keywords
    //   'unfollow'   — unfollow topics matching keywords
    //   'unfollowAll'— unfollow all topics
    //   'discover'   — browse suggested topics

    // ── Filter ───────────────────────────────────────────────
    keywords: [],                    // Topics containing these keywords (for follow/unfollow)
    // e.g. ['crypto', 'AI', 'javascript']

    // ── Limits ───────────────────────────────────────────────
    maxActions: 50,                  // Max follow/unfollow actions per run
    maxScrollAttempts: 25,

    // ── Timing ───────────────────────────────────────────────
    scrollDelay: 2000,
    actionDelay: 2500,               // Delay between follow/unfollow clicks
    navigationDelay: 3000,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,
  };

  const SEL = {
    topicFollow:   '[data-testid="TopicFollow"]',
    topicUnfollow: '[data-testid="TopicUnfollow"]',
    topicsLink:    'a[href*="/topics"]',
    topicCard:     '[data-testid="TopicCard"]',
    topicPill:     '[data-testid="TopicPill"]',
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

  const stats = {
    action: CONFIG.action,
    topicsListed: 0,
    topicsFollowed: 0,
    topicsUnfollowed: 0,
    topicsDiscovered: 0,
    startTime: Date.now(),
  };

  window.XActions = {
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      console.log(`📊 Followed: ${stats.topicsFollowed} | Unfollowed: ${stats.topicsUnfollowed} | Listed: ${stats.topicsListed} | ${el}s`);
    },
  };

  const getTopicName = (element) => {
    // Try various ways to extract the topic name
    const card = element.closest(SEL.topicCard) ||
                 element.closest(SEL.topicPill) ||
                 element.closest('[role="listitem"]') ||
                 element.parentElement;
    if (!card) return '';
    const nameEl = card.querySelector('[dir="auto"] span') || card.querySelector('[dir="auto"]');
    return nameEl?.textContent?.trim() || card.textContent?.trim()?.split('\n')[0] || '';
  };

  const matchesKeywords = (name) => {
    if (CONFIG.keywords.length === 0) return true;
    const lower = name.toLowerCase();
    return CONFIG.keywords.some(kw => lower.includes(kw.toLowerCase()));
  };

  const listTopics = async () => {
    console.log('🔄 Listing followed topics...');

    // Navigate to your topics
    if (!window.location.pathname.includes('/topics')) {
      if (!CONFIG.dryRun) {
        window.location.href = 'https://x.com/settings/your_topics';
        return;
      }
    }

    const topics = [];
    const processedNames = new Set();
    let scrollAttempts = 0;

    while (scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      // Look for topic elements with unfollow buttons (meaning we follow them)
      const unfollowBtns = $$(SEL.topicUnfollow);
      const topicCards = $$(SEL.topicCard);
      const topicPills = $$(SEL.topicPill);
      const allElements = [...unfollowBtns, ...topicCards, ...topicPills];

      let foundNew = false;
      for (const el of allElements) {
        const name = getTopicName(el);
        if (!name || processedNames.has(name)) continue;
        processedNames.add(name);
        foundNew = true;

        topics.push({ name, followed: !!el.closest(SEL.topicUnfollow) || !!el.querySelector(SEL.topicUnfollow) });
        stats.topicsListed++;
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollBy(0, 600);
      await sleep(CONFIG.scrollDelay);
    }

    console.log('📋 Followed Topics:');
    for (const t of topics) {
      console.log(`  🏷️ ${t.name}`);
    }
    console.log(`✅ Found ${topics.length} topics`);
    return topics;
  };

  const followTopics = async () => {
    console.log(`🔄 Following topics matching: [${CONFIG.keywords.join(', ')}]...`);

    let actionsPerformed = 0;
    let scrollAttempts = 0;
    const processedBtns = new Set();

    while (actionsPerformed < CONFIG.maxActions && scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const followBtns = $$(SEL.topicFollow);
      let foundNew = false;

      for (const btn of followBtns) {
        if (aborted || actionsPerformed >= CONFIG.maxActions) break;

        const btnId = btn.closest('[data-testid]')?.textContent?.slice(0, 80) || Math.random().toString();
        if (processedBtns.has(btnId)) continue;
        processedBtns.add(btnId);

        const name = getTopicName(btn);
        if (!matchesKeywords(name)) continue;

        foundNew = true;
        console.log(`🏷️ Following: "${name}"...`);

        if (!CONFIG.dryRun) {
          btn.click();
          await sleep(CONFIG.actionDelay);
        }

        actionsPerformed++;
        stats.topicsFollowed++;
        console.log(`  ✅ Followed "${name}" (${actionsPerformed}/${CONFIG.maxActions})`);
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollBy(0, 600);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`✅ Followed ${stats.topicsFollowed} topics`);
  };

  const unfollowTopics = async () => {
    const isAll = CONFIG.action === 'unfollowAll';
    console.log(isAll
      ? '🔄 Unfollowing ALL topics...'
      : `🔄 Unfollowing topics matching: [${CONFIG.keywords.join(', ')}]...`
    );

    // Navigate to your topics page
    if (!window.location.pathname.includes('/topics') && !window.location.pathname.includes('/your_topics')) {
      if (!CONFIG.dryRun) {
        window.location.href = 'https://x.com/settings/your_topics';
        return;
      }
    }

    let actionsPerformed = 0;
    let scrollAttempts = 0;
    let consecutiveEmpty = 0;

    while (actionsPerformed < CONFIG.maxActions && consecutiveEmpty < 5 && !aborted) {
      const unfollowBtns = $$(SEL.topicUnfollow);

      if (unfollowBtns.length === 0) {
        consecutiveEmpty++;
        window.scrollBy(0, 600);
        await sleep(CONFIG.scrollDelay);
        continue;
      }

      consecutiveEmpty = 0;

      for (const btn of unfollowBtns) {
        if (aborted || actionsPerformed >= CONFIG.maxActions) break;

        const name = getTopicName(btn);
        if (!isAll && !matchesKeywords(name)) continue;

        console.log(`🏷️ Unfollowing: "${name}"...`);

        if (!CONFIG.dryRun) {
          btn.click();
          await sleep(CONFIG.actionDelay);
        }

        actionsPerformed++;
        stats.topicsUnfollowed++;
        console.log(`  ✅ Unfollowed "${name}" (${actionsPerformed}/${CONFIG.maxActions})`);
      }

      window.scrollBy(0, 600);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    console.log(`✅ Unfollowed ${stats.topicsUnfollowed} topics`);
  };

  const discoverTopics = async () => {
    console.log('🔍 Discovering suggested topics...');

    // Navigate to topics explore page
    if (!window.location.pathname.includes('/topics')) {
      if (!CONFIG.dryRun) {
        window.location.href = 'https://x.com/i/topics/picker/home';
        return;
      }
    }

    const topics = [];
    const processedNames = new Set();
    let scrollAttempts = 0;

    while (topics.length < CONFIG.maxActions && scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const topicElements = [...$$(SEL.topicCard), ...$$(SEL.topicPill), ...$$(SEL.topicFollow)];

      for (const el of topicElements) {
        const name = getTopicName(el);
        if (!name || processedNames.has(name)) continue;
        processedNames.add(name);

        const isFollowed = !!el.closest(SEL.topicUnfollow) || !!el.querySelector(SEL.topicUnfollow);
        topics.push({ name, followed: isFollowed });
        stats.topicsDiscovered++;
      }

      window.scrollBy(0, 600);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    console.log('📋 Discovered Topics:');
    for (const t of topics) {
      console.log(`  🏷️ ${t.name} ${t.followed ? '(following)' : ''}`);
    }
    console.log(`✅ Discovered ${topics.length} topics`);
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🏷️ TOPIC MANAGER' + ' '.repeat(W - 20) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually act');
    }

    console.log(`📋 Action: ${CONFIG.action}`);
    if (CONFIG.keywords.length > 0) console.log(`📋 Keywords: ${CONFIG.keywords.join(', ')}`);

    const sessionKey = 'xactions_topicManager';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    const actions = {
      list: listTopics,
      follow: followTopics,
      unfollow: unfollowTopics,
      unfollowAll: unfollowTopics,
      discover: discoverTopics,
    };

    if (!actions[CONFIG.action]) {
      console.log(`❌ Unknown action: "${CONFIG.action}"`);
      console.log(`💡 Valid actions: ${Object.keys(actions).join(', ')}`);
      return;
    }

    await actions[CONFIG.action]();

    if (aborted) console.log('🛑 Aborted by user');

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 TOPIC MANAGER SUMMARY' + ' '.repeat(W - 28) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🔧 Action: ${CONFIG.action}`);
    if (stats.topicsListed > 0) console.log(`📋 Listed: ${stats.topicsListed}`);
    if (stats.topicsFollowed > 0) console.log(`✅ Followed: ${stats.topicsFollowed}`);
    if (stats.topicsUnfollowed > 0) console.log(`🚫 Unfollowed: ${stats.topicsUnfollowed}`);
    if (stats.topicsDiscovered > 0) console.log(`🔍 Discovered: ${stats.topicsDiscovered}`);
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
