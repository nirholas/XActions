// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// browser/savedSearchManager.js
// Saved search and discovery tools for X/Twitter
// by nichxbt
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const SEL = {
    tweet:        'article[data-testid="tweet"]',
    tweetText:    '[data-testid="tweetText"]',
    searchInput:  '[data-testid="SearchBox_Search_Input"]',
    trend:        '[data-testid="trend"]',
    userCell:     '[data-testid="UserCell"]',
    toast:        '[data-testid="toast"]',
    confirm:      '[data-testid="confirmationSheetConfirm"]',
    tabList:      '[role="tablist"]',
  };

  const CONFIG = {
    maxTweets: 100,
    scrollDelay: 2000,
    actionDelay: 1500,
    maxScrollAttempts: 25,
  };

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

  const parseTweet = (article) => {
    const getText = (sel) => article.querySelector(sel)?.textContent?.trim() || '';

    // Author handle
    const authorLink = article.querySelector('a[href^="/"][role="link"] > div > span');
    const handleEl = article.querySelectorAll('a[href^="/"][role="link"]');
    let handle = '';
    let displayName = '';
    for (const a of handleEl) {
      const href = a.getAttribute('href') || '';
      if (href.match(/^\/[^\/]+$/) && !href.startsWith('/i/')) {
        handle = href.replace('/', '@');
        displayName = a.textContent?.trim() || '';
        break;
      }
    }

    // Tweet text
    const tweetText = getText(SEL.tweetText);

    // Timestamp
    const timeEl = article.querySelector('time');
    const timestamp = timeEl?.getAttribute('datetime') || '';
    const timeText = timeEl?.textContent?.trim() || '';

    // Permalink
    const permalink = timeEl?.closest('a')?.getAttribute('href') || '';

    // Engagement metrics
    const getMetric = (testId) => {
      const el = article.querySelector(`[data-testid="${testId}"]`);
      const text = el?.getAttribute('aria-label') || '';
      const match = text.match(/(\d[\d,]*)/);
      return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    };

    return {
      handle,
      displayName,
      text: tweetText.substring(0, 500),
      timestamp,
      timeText,
      permalink: permalink ? `https://x.com${permalink}` : '',
      likes: getMetric('like'),
      replies: getMetric('reply'),
      reposts: getMetric('retweet'),
    };
  };

  const scrollAndCollectTweets = async (maxTweets = CONFIG.maxTweets) => {
    const collected = new Map();
    let scrollAttempts = 0;

    while (collected.size < maxTweets && scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const prevSize = collected.size;
      const articles = $$(SEL.tweet);

      for (const article of articles) {
        if (collected.size >= maxTweets) break;
        const data = parseTweet(article);
        const key = data.permalink || `${data.handle}-${data.text.substring(0, 60)}`;
        if (key && !collected.has(key)) {
          collected.set(key, data);
        }
      }

      if (collected.size === prevSize) scrollAttempts++;
      else scrollAttempts = 0;

      console.log(`🔄 Collected ${collected.size}/${maxTweets} tweets...`);
      window.scrollBy(0, 800);
      await sleep(CONFIG.scrollDelay);
    }

    return [...collected.values()];
  };

  // ──────────────────────────────────────────────────────────────
  // 1. Save Search
  // ──────────────────────────────────────────────────────────────
  const saveSearch = async (query) => {
    console.log(`🔄 Saving search: "${query}"...`);

    if (!window.location.pathname.startsWith('/search')) {
      window.location.href = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query`;
      console.log('⚠️ Navigating to search page. Re-run after page loads.');
      return null;
    }

    // Look for save/bookmark search icon in the search bar area
    // The save search button is typically near the search input or in the search toolbar
    const saveBtn = $('[data-testid="savedSearchButton"]')
      || $('[aria-label="Save search"]')
      || $('[aria-label="Save this search"]');

    if (saveBtn) {
      saveBtn.click();
      await sleep(CONFIG.actionDelay);

      // Handle confirmation if present
      const confirmBtn = $(SEL.confirm);
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(1000);
      }

      console.log(`✅ Search "${query}" saved successfully`);
      return { query, saved: true };
    }

    // Fallback: try the overflow/more menu near the search bar
    const moreBtn = $('[aria-label="More"]') || $('[data-testid="searchMore"]');
    if (moreBtn) {
      moreBtn.click();
      await sleep(1000);

      const menuItems = $$('[role="menuitem"]');
      const saveItem = menuItems.find(item =>
        item.textContent?.toLowerCase().includes('save')
      );

      if (saveItem) {
        saveItem.click();
        await sleep(CONFIG.actionDelay);
        console.log(`✅ Search "${query}" saved via menu`);
        return { query, saved: true };
      }
    }

    console.log('❌ Could not find save search button. Make sure you have performed a search first.');
    return null;
  };

  // ──────────────────────────────────────────────────────────────
  // 2. Delete Saved Search
  // ──────────────────────────────────────────────────────────────
  const deleteSavedSearch = async (searchText) => {
    console.log(`🔄 Deleting saved search: "${searchText}"...`);

    // Click on the search input to reveal saved searches dropdown
    const searchInput = $(SEL.searchInput);
    if (!searchInput) {
      console.log('❌ Search input not found. Navigate to x.com first.');
      return null;
    }

    searchInput.focus();
    searchInput.click();
    await sleep(1500);

    // Look for saved search items in the dropdown
    const listItems = $$('[data-testid="TypeaheadListItem"], [role="option"], [role="listbox"] > *');
    let targetItem = null;

    for (const item of listItems) {
      const text = item.textContent?.trim()?.toLowerCase() || '';
      if (text.includes(searchText.toLowerCase())) {
        targetItem = item;
        break;
      }
    }

    if (!targetItem) {
      console.log(`❌ Saved search "${searchText}" not found in dropdown.`);
      console.log('💡 Click the search box to see your saved searches, then try again.');
      return null;
    }

    // Look for delete/remove button (X icon) on the saved search item
    const deleteBtn = targetItem.querySelector('[aria-label="Remove"]')
      || targetItem.querySelector('[aria-label="Delete"]')
      || targetItem.querySelector('svg')?.closest('div[role="button"]');

    if (deleteBtn) {
      deleteBtn.click();
      await sleep(1000);

      // Confirm deletion if prompted
      const confirmBtn = $(SEL.confirm);
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(1000);
      }

      console.log(`✅ Saved search "${searchText}" deleted`);
      return { searchText, deleted: true };
    }

    // Alternative: long-press or right-click for context menu
    console.log('⚠️ Delete button not found directly. Attempting via long-press...');
    const longPressEvent = new MouseEvent('contextmenu', { bubbles: true });
    targetItem.dispatchEvent(longPressEvent);
    await sleep(1000);

    const menuItems = $$('[role="menuitem"]');
    const deleteItem = menuItems.find(item =>
      item.textContent?.toLowerCase().includes('delete') ||
      item.textContent?.toLowerCase().includes('remove')
    );

    if (deleteItem) {
      deleteItem.click();
      await sleep(1000);
      const confirmBtn = $(SEL.confirm);
      if (confirmBtn) confirmBtn.click();
      console.log(`✅ Saved search "${searchText}" deleted via context menu`);
      return { searchText, deleted: true };
    }

    console.log('❌ Could not delete saved search. Try deleting manually.');
    return null;
  };

  // ──────────────────────────────────────────────────────────────
  // 3. View Saved Searches
  // ──────────────────────────────────────────────────────────────
  const viewSavedSearches = async () => {
    console.log('🔄 Retrieving saved searches...');

    // Focus the search input to reveal saved searches dropdown
    const searchInput = $(SEL.searchInput);
    if (!searchInput) {
      // Navigate to explore page where search is accessible
      console.log('⚠️ Search input not found. Navigating to explore page...');
      window.location.href = 'https://x.com/explore';
      console.log('💡 Re-run after page loads.');
      return [];
    }

    // Clear existing text and focus to show saved searches
    searchInput.value = '';
    searchInput.focus();
    searchInput.click();
    // Dispatch input event to trigger dropdown
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(2000);

    // Collect saved searches from dropdown
    const savedSearches = [];
    const listItems = $$('[data-testid="TypeaheadListItem"], [role="option"], [role="listbox"] > div');

    for (const item of listItems) {
      const text = item.textContent?.trim() || '';
      if (!text) continue;

      // Check if it looks like a saved search (has remove/delete icon)
      const hasDeleteIcon = item.querySelector('[aria-label="Remove"]')
        || item.querySelector('[aria-label="Delete"]');
      const isSaved = !!hasDeleteIcon;

      savedSearches.push({
        query: text,
        isSaved,
      });
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 SAVED SEARCHES                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (savedSearches.length === 0) {
      console.log('📭 No saved searches found.');
      console.log('💡 Save a search by performing a search and clicking the save icon.');
    } else {
      savedSearches.forEach((s, i) => {
        const marker = s.isSaved ? '⭐' : '🕐';
        console.log(`  ${i + 1}. ${marker} ${s.query}`);
      });
      console.log(`\n✅ Found ${savedSearches.length} search entries`);
      console.log('   ⭐ = saved search | 🕐 = recent search');
    }

    // Close dropdown by blurring
    searchInput.blur();
    return savedSearches;
  };

  // ──────────────────────────────────────────────────────────────
  // 4. Trending for Specific Location
  // ──────────────────────────────────────────────────────────────
  const trendingForLocation = async (location = '') => {
    console.log(`🔄 Fetching trends${location ? ` for "${location}"` : ''}...`);

    // Navigate to explore/trending page
    if (!window.location.pathname.startsWith('/explore')) {
      window.location.href = 'https://x.com/explore/tabs/trending';
      console.log('⚠️ Navigating to trending page. Re-run after page loads.');
      return [];
    }

    // If location specified, try to change location setting
    if (location) {
      console.log(`🔄 Attempting to change trending location to "${location}"...`);

      // Look for location/settings gear icon on the trending page
      const settingsBtn = $('[aria-label="Settings"]')
        || $('[aria-label="Trending settings"]')
        || $('[data-testid="trendingSettings"]')
        || $('a[href="/settings/trends"]');

      if (settingsBtn) {
        settingsBtn.click();
        await sleep(2000);

        // Look for location toggle or "Change location" option
        const exploreLocationToggle = $('input[type="checkbox"]')
          || $('[role="switch"]');
        if (exploreLocationToggle) {
          // If there's a toggle for "Show content in your location", it may need to be enabled
          exploreLocationToggle.click();
          await sleep(1000);
        }

        // Look for location input/search within settings
        const locationInput = $('input[placeholder*="location"]')
          || $('input[placeholder*="Location"]')
          || $('input[data-testid="locationSearch"]');

        if (locationInput) {
          locationInput.value = '';
          locationInput.focus();
          // Type location character by character for reactivity
          for (const char of location) {
            locationInput.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            locationInput.value += char;
            locationInput.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(100);
          }
          await sleep(1500);

          // Select first matching result
          const locationResults = $$('[role="option"], [role="listbox"] > div');
          const match = locationResults.find(r =>
            r.textContent?.toLowerCase().includes(location.toLowerCase())
          );
          if (match) {
            match.click();
            await sleep(1500);
            console.log(`✅ Location changed to match: "${match.textContent?.trim()}"`);

            // Save/confirm
            const doneBtn = $('[data-testid="settingsSave"]')
              || $$('button, [role="button"]').find(b => b.textContent?.includes('Done'))
              || $$('button, [role="button"]').find(b => b.textContent?.includes('Save'));
            if (doneBtn) {
              doneBtn.click();
              await sleep(2000);
            }
          } else {
            console.log(`⚠️ No location match found for "${location}". Showing current trends.`);
          }
        } else {
          console.log('⚠️ Location input not found in settings. Navigate to x.com/settings/trends to change manually.');
          // Go back
          const backBtn = $('[data-testid="app-bar-back"]');
          if (backBtn) backBtn.click();
          await sleep(1000);
        }
      } else {
        console.log('⚠️ Trending settings button not found. Showing current location trends.');
        console.log('💡 Change location manually at: x.com/settings/trends');
      }
    }

    // Now scrape the trends
    const trends = [];
    const seenTrends = new Set();
    let scrollAttempts = 0;

    while (scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const prevSize = trends.length;
      const trendEls = $$(SEL.trend);

      for (const el of trendEls) {
        const spans = el.querySelectorAll('span');
        let trendName = '';
        let category = '';
        let tweetCount = '';

        for (const span of spans) {
          const text = span.textContent?.trim() || '';
          if (text.startsWith('#') || (text.length > 1 && !text.includes('Trending') && !text.match(/^\d/) && !text.includes('posts'))) {
            if (!trendName) trendName = text;
          }
          if (text.includes('Trending') || text.includes('trending')) category = text;
          if (text.match(/[\d,.]+[KMB]?\s*(posts|tweets)/i) || text.match(/^[\d,.]+[KMB]?$/)) {
            tweetCount = text;
          }
        }

        if (trendName && !seenTrends.has(trendName)) {
          seenTrends.add(trendName);
          trends.push({
            rank: trends.length + 1,
            name: trendName,
            category,
            tweetCount,
          });
        }
      }

      if (trends.length === prevSize) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollBy(0, 600);
      await sleep(CONFIG.scrollDelay);
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📈 TRENDING TOPICS                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    if (location) console.log(`📍 Location: ${location}`);
    console.log('');

    for (const t of trends) {
      const count = t.tweetCount ? ` (${t.tweetCount})` : '';
      const cat = t.category ? ` [${t.category}]` : '';
      console.log(`  ${t.rank}. ${t.name}${count}${cat}`);
    }

    console.log(`\n✅ Found ${trends.length} trending topics`);
    return trends;
  };

  // ──────────────────────────────────────────────────────────────
  // 5. Scrape Hashtag Page
  // ──────────────────────────────────────────────────────────────
  const scrapeHashtag = async (hashtag, maxTweets = CONFIG.maxTweets) => {
    // Normalize hashtag
    const tag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    const encoded = encodeURIComponent(tag);
    console.log(`🔄 Scraping tweets for ${tag}...`);

    if (!window.location.href.includes(`q=${encoded}`) && !window.location.href.includes(`q=%23${hashtag.replace('#', '')}`)) {
      window.location.href = `https://x.com/search?q=${encoded}&src=typed_query&f=live`;
      console.log('⚠️ Navigating to hashtag search. Re-run after page loads.');
      return [];
    }

    await sleep(2000);

    const tweets = await scrollAndCollectTweets(maxTweets);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  #️⃣ HASHTAG SCRAPE: ${tag.padEnd(37)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Collected ${tweets.length} tweets\n`);

    for (const t of tweets.slice(0, 10)) {
      console.log(`  ${t.handle} — ${t.text.substring(0, 80)}...`);
      console.log(`    ❤️ ${t.likes} | 🔁 ${t.reposts} | 💬 ${t.replies} | ${t.timeText}`);
    }

    if (tweets.length > 10) {
      console.log(`  ... and ${tweets.length - 10} more tweets`);
    }

    console.log(`\n✅ Scraped ${tweets.length} tweets for ${tag}`);
    console.log('💡 Access full data: window.XActions.savedSearch._lastResults');

    window.XActions.savedSearch._lastResults = tweets;
    return tweets;
  };

  // ──────────────────────────────────────────────────────────────
  // 6. Scrape For You Timeline
  // ──────────────────────────────────────────────────────────────
  const scrapeForYou = async (maxTweets = CONFIG.maxTweets) => {
    console.log('🔄 Scraping "For You" timeline...');

    // Navigate to home if not there
    if (window.location.pathname !== '/home' && window.location.pathname !== '/') {
      window.location.href = 'https://x.com/home';
      console.log('⚠️ Navigating to home. Re-run after page loads.');
      return [];
    }

    // Ensure "For You" tab is active
    const tabList = $(SEL.tabList);
    if (tabList) {
      const tabs = tabList.querySelectorAll('[role="tab"], a[role="tab"], [role="presentation"] a');
      for (const tab of tabs) {
        const text = tab.textContent?.trim()?.toLowerCase() || '';
        if (text.includes('for you')) {
          const isActive = tab.getAttribute('aria-selected') === 'true'
            || tab.classList.contains('r-1habvwh') // active tab style
            || tab.querySelector('[aria-selected="true"]');
          if (!isActive) {
            tab.click();
            console.log('🔄 Switched to "For You" tab');
            await sleep(2000);
          } else {
            console.log('✅ "For You" tab already active');
          }
          break;
        }
      }
    }

    // Scroll to top first
    window.scrollTo(0, 0);
    await sleep(1000);

    const tweets = await scrollAndCollectTweets(maxTweets);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🏠 FOR YOU TIMELINE                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Collected ${tweets.length} tweets\n`);

    for (const t of tweets.slice(0, 10)) {
      console.log(`  ${t.handle} — ${t.text.substring(0, 80)}...`);
      console.log(`    ❤️ ${t.likes} | 🔁 ${t.reposts} | 💬 ${t.replies} | ${t.timeText}`);
    }

    if (tweets.length > 10) {
      console.log(`  ... and ${tweets.length - 10} more tweets`);
    }

    console.log(`\n✅ Scraped ${tweets.length} tweets from For You timeline`);
    console.log('💡 Access full data: window.XActions.savedSearch._lastResults');

    window.XActions.savedSearch._lastResults = tweets;
    return tweets;
  };

  // ──────────────────────────────────────────────────────────────
  // 7. Scrape Following Timeline
  // ──────────────────────────────────────────────────────────────
  const scrapeFollowing = async (maxTweets = CONFIG.maxTweets) => {
    console.log('🔄 Scraping "Following" timeline...');

    // Navigate to home if not there
    if (window.location.pathname !== '/home' && window.location.pathname !== '/') {
      window.location.href = 'https://x.com/home';
      console.log('⚠️ Navigating to home. Re-run after page loads.');
      return [];
    }

    // Switch to "Following" tab
    const tabList = $(SEL.tabList);
    if (tabList) {
      const tabs = tabList.querySelectorAll('[role="tab"], a[role="tab"], [role="presentation"] a');
      for (const tab of tabs) {
        const text = tab.textContent?.trim()?.toLowerCase() || '';
        if (text.includes('following')) {
          const isActive = tab.getAttribute('aria-selected') === 'true'
            || tab.querySelector('[aria-selected="true"]');
          if (!isActive) {
            tab.click();
            console.log('🔄 Switched to "Following" tab');
            await sleep(2000);
          } else {
            console.log('✅ "Following" tab already active');
          }
          break;
        }
      }
    }

    // Scroll to top first
    window.scrollTo(0, 0);
    await sleep(1000);

    const tweets = await scrollAndCollectTweets(maxTweets);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  👥 FOLLOWING TIMELINE                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Collected ${tweets.length} tweets\n`);

    for (const t of tweets.slice(0, 10)) {
      console.log(`  ${t.handle} — ${t.text.substring(0, 80)}...`);
      console.log(`    ❤️ ${t.likes} | 🔁 ${t.reposts} | 💬 ${t.replies} | ${t.timeText}`);
    }

    if (tweets.length > 10) {
      console.log(`  ... and ${tweets.length - 10} more tweets`);
    }

    console.log(`\n✅ Scraped ${tweets.length} tweets from Following timeline`);
    console.log('💡 Access full data: window.XActions.savedSearch._lastResults');

    window.XActions.savedSearch._lastResults = tweets;
    return tweets;
  };

  // ──────────────────────────────────────────────────────────────
  // Expose on window.XActions.savedSearch
  // ──────────────────────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.savedSearch = {
    saveSearch,
    deleteSavedSearch,
    viewSavedSearches,
    trendingForLocation,
    scrapeHashtag,
    scrapeForYou,
    scrapeFollowing,
    abort() { aborted = true; console.log('🛑 Aborting...'); },
    _lastResults: [],
  };

  // ──────────────────────────────────────────────────────────────
  // Menu
  // ──────────────────────────────────────────────────────────────
  const W = 60;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  🔍 SAVED SEARCH MANAGER' + ' '.repeat(W - 27) + '║');
  console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
  console.log('');
  console.log('📋 Available commands:');
  console.log('');
  console.log('  1. Save a search:');
  console.log('     await window.XActions.savedSearch.saveSearch("your query")');
  console.log('');
  console.log('  2. Delete a saved search:');
  console.log('     await window.XActions.savedSearch.deleteSavedSearch("query text")');
  console.log('');
  console.log('  3. View saved searches:');
  console.log('     await window.XActions.savedSearch.viewSavedSearches()');
  console.log('');
  console.log('  4. Trending for location:');
  console.log('     await window.XActions.savedSearch.trendingForLocation("New York")');
  console.log('     await window.XActions.savedSearch.trendingForLocation()  // current location');
  console.log('');
  console.log('  5. Scrape hashtag page:');
  console.log('     await window.XActions.savedSearch.scrapeHashtag("AI", 50)');
  console.log('');
  console.log('  6. Scrape For You timeline:');
  console.log('     await window.XActions.savedSearch.scrapeForYou(100)');
  console.log('');
  console.log('  7. Scrape Following timeline:');
  console.log('     await window.XActions.savedSearch.scrapeFollowing(100)');
  console.log('');
  console.log('  🛑 Abort any running operation:');
  console.log('     window.XActions.savedSearch.abort()');
  console.log('');
  console.log('  📦 Access last scrape results:');
  console.log('     window.XActions.savedSearch._lastResults');
  console.log('');
  console.log('✅ Ready! Use the commands above in the console.');
})();
