// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📋 Follow & Manage Lists — Production Grade
 * ============================================================
 *
 * @name        followList.js
 * @description Follow/unfollow X Lists, pin lists to your
 *              timeline, and browse list feeds.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/i/lists or a specific list page
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Action ───────────────────────────────────────────────
    action: 'follow',
    //   'follow'      — follow a list by URL
    //   'unfollow'    — unfollow a list by URL
    //   'pin'         — pin a list to your timeline
    //   'browse'      — export tweets from a list feed
    //   'discover'    — find and list suggested lists

    // ── Target ───────────────────────────────────────────────
    listUrl: '',                     // URL of the list (for follow/unfollow/pin/browse)
    // e.g. 'https://x.com/i/lists/123456789'

    // ── Browse Settings ──────────────────────────────────────
    maxTweets: 50,                   // Max tweets to export from list
    exportFormat: 'json',            // 'json' or 'csv'

    // ── Discover Settings ────────────────────────────────────
    maxLists: 20,                    // Max lists to discover

    // ── Timing ───────────────────────────────────────────────
    navigationDelay: 3000,
    scrollDelay: 2000,
    actionDelay: 2000,
    maxScrollAttempts: 20,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,
  };

  const SEL = {
    listFollow:     '[data-testid="listFollow"]',
    listUnfollow:   '[data-testid="listUnfollow"]',
    pinList:        '[data-testid="pinList"]',
    listsLink:      'a[href*="/lists"]',
    tweet:          'article[data-testid="tweet"]',
    tweetText:      '[data-testid="tweetText"]',
    userName:       '[data-testid="User-Name"]',
    listCard:       '[data-testid="listCard"]',
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
    followed: false,
    unfollowed: false,
    pinned: false,
    tweetsExported: 0,
    listsDiscovered: 0,
    startTime: Date.now(),
  };

  window.XActions = {
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      console.log(`📊 Action: ${stats.action} | Tweets: ${stats.tweetsExported} | Lists: ${stats.listsDiscovered} | ${el}s`);
    },
  };

  const navigateToList = async () => {
    if (CONFIG.listUrl && window.location.href !== CONFIG.listUrl) {
      console.log(`🔄 Navigating to list: ${CONFIG.listUrl}`);
      if (!CONFIG.dryRun) {
        window.location.href = CONFIG.listUrl;
        return false; // Page will reload
      }
    }
    return true;
  };

  const followList = async () => {
    if (!(await navigateToList())) return;

    console.log('🔄 Following list...');
    const followBtn = await waitForSelector(SEL.listFollow, 5000);
    if (!followBtn) {
      console.log('❌ Could not find Follow button');
      console.log('💡 You may already be following this list');
      return;
    }

    if (!CONFIG.dryRun) {
      followBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    stats.followed = true;
    console.log('✅ List followed!');
  };

  const unfollowList = async () => {
    if (!(await navigateToList())) return;

    console.log('🔄 Unfollowing list...');
    const unfollowBtn = await waitForSelector(SEL.listUnfollow, 5000);
    if (!unfollowBtn) {
      console.log('❌ Could not find Unfollow button');
      console.log('💡 You may not be following this list');
      return;
    }

    if (!CONFIG.dryRun) {
      unfollowBtn.click();
      await sleep(CONFIG.actionDelay);

      // Confirm if needed
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(CONFIG.actionDelay);
      }
    }

    stats.unfollowed = true;
    console.log('✅ List unfollowed!');
  };

  const pinList = async () => {
    if (!(await navigateToList())) return;

    console.log('📌 Pinning list to timeline...');
    const pinBtn = await waitForSelector(SEL.pinList, 5000);
    if (!pinBtn) {
      // Try alternative: look for pin in the more menu
      const moreBtn = document.querySelector('[data-testid="caret"], [aria-label="More"]');
      if (moreBtn && !CONFIG.dryRun) {
        moreBtn.click();
        await sleep(CONFIG.actionDelay);
        const menuItems = $$('[role="menuitem"]');
        const pinItem = menuItems.find(item => item.textContent.toLowerCase().includes('pin'));
        if (pinItem) {
          pinItem.click();
          await sleep(CONFIG.actionDelay);
          stats.pinned = true;
          console.log('✅ List pinned!');
          return;
        }
      }
      console.log('❌ Could not find Pin button');
      return;
    }

    if (!CONFIG.dryRun) {
      pinBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    stats.pinned = true;
    console.log('✅ List pinned to timeline!');
  };

  const browseList = async () => {
    if (!(await navigateToList())) return;

    console.log(`🔄 Browsing list feed (max ${CONFIG.maxTweets} tweets)...`);
    const tweets = [];
    const processedUrls = new Set();
    let scrollAttempts = 0;

    while (tweets.length < CONFIG.maxTweets && scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const tweetEls = $$(SEL.tweet);

      for (const el of tweetEls) {
        const linkEl = el.querySelector('a[href*="/status/"]');
        const url = linkEl?.href || '';
        if (!url || processedUrls.has(url)) continue;
        processedUrls.add(url);

        const text = el.querySelector(SEL.tweetText)?.textContent || '';
        const author = el.querySelector(SEL.userName + ' a')?.textContent || '';
        const time = el.querySelector('time')?.getAttribute('datetime') || '';
        const likes = el.querySelector('[data-testid="like"] span')?.textContent || '0';
        const reposts = el.querySelector('[data-testid="retweet"] span')?.textContent || '0';

        tweets.push({ url, text, author, time, likes, reposts });
        stats.tweetsExported++;

        if (tweets.length >= CONFIG.maxTweets) break;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    // Export
    if (CONFIG.exportFormat === 'csv') {
      const csv = 'url,author,text,time,likes,reposts\n' +
        tweets.map(t =>
          `"${t.url}","${t.author}","${t.text.replace(/"/g, '""')}","${t.time}","${t.likes}","${t.reposts}"`
        ).join('\n');
      console.log('📋 CSV Export:');
      console.log(csv);
    } else {
      console.log('📋 JSON Export:');
      console.log(JSON.stringify(tweets, null, 2));
    }

    console.log(`✅ Exported ${tweets.length} tweets from list`);
  };

  const discoverLists = async () => {
    console.log('🔍 Discovering suggested lists...');

    // Navigate to lists page
    if (!window.location.pathname.includes('/lists')) {
      const listsLink = $(SEL.listsLink);
      if (listsLink && !CONFIG.dryRun) {
        listsLink.click();
        await sleep(CONFIG.navigationDelay);
      }
    }

    const lists = [];
    const processedNames = new Set();
    let scrollAttempts = 0;

    while (lists.length < CONFIG.maxLists && scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      // Look for list cards or list-like elements
      const listCards = $$(SEL.listCard);
      const altCards = $$('a[href*="/lists/"]');
      const allCards = [...new Set([...listCards, ...altCards])];

      for (const card of allCards) {
        const name = card.textContent?.trim()?.slice(0, 100) || '';
        if (!name || processedNames.has(name)) continue;
        processedNames.add(name);

        const link = card.href || card.querySelector('a')?.href || '';
        const description = card.querySelector('[dir="auto"]:not([data-testid])')?.textContent || '';
        const memberCount = card.querySelector('span')?.textContent || '';

        lists.push({ name: name.split('\n')[0], link, description, memberCount });
        stats.listsDiscovered++;

        if (lists.length >= CONFIG.maxLists) break;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    console.log('📋 Discovered Lists:');
    console.log(JSON.stringify(lists, null, 2));
    console.log(`✅ Found ${lists.length} lists`);
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📋 FOLLOW & MANAGE LISTS' + ' '.repeat(W - 28) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually act');
    }

    console.log(`📋 Action: ${CONFIG.action}`);
    if (CONFIG.listUrl) console.log(`📋 List: ${CONFIG.listUrl}`);

    const sessionKey = 'xactions_followList';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    const actions = { follow: followList, unfollow: unfollowList, pin: pinList, browse: browseList, discover: discoverLists };

    if (!actions[CONFIG.action]) {
      console.log(`❌ Unknown action: "${CONFIG.action}"`);
      console.log(`💡 Valid actions: ${Object.keys(actions).join(', ')}`);
      return;
    }

    await actions[CONFIG.action]();

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 LIST MANAGEMENT SUMMARY' + ' '.repeat(W - 30) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🔧 Action: ${CONFIG.action}`);
    if (stats.followed) console.log('✅ Followed: yes');
    if (stats.unfollowed) console.log('✅ Unfollowed: yes');
    if (stats.pinned) console.log('📌 Pinned: yes');
    if (stats.tweetsExported > 0) console.log(`📄 Tweets exported: ${stats.tweetsExported}`);
    if (stats.listsDiscovered > 0) console.log(`🔍 Lists discovered: ${stats.listsDiscovered}`);
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
