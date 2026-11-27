// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        scrapeExplore.js
 * @title       Scrape Explore
 * @description Scrape trending topics, search results, or the Explore page's trends and posts, and export them as JSON.
 * @category    scrape
 * @page        x.com/explore or x.com/explore/tabs/trending
 * @writes      false
 * @aliases     scripts/discoveryExplore.js, scripts/scrapeExplore.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Browser console script for scraping trending topics and search results on X/Twitter
// Paste browser/scrapeExplore.js in the DevTools console on x.com/explore
// by nichxbt
//
// Actions:
//   'trends'  - switch to the Trending tab and scroll it for trends
//   'search'  - search CONFIG.searchQuery (Latest) and scrape the posts
//   'explore' - the trends and posts on the Explore page you are on, without switching tabs

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'trends',           // 'trends' | 'search' | 'explore'
    searchQuery: '',            // Query for 'search' action
    maxResults: 20,             // Max trends ('trends', 'explore') or posts ('search')
    maxTweets: 50,              // 'explore' only: max posts to scrape from the Explore feed (0 = trends only)
    exportResults: true,
    outputFormat: 'json',       // 'json' or 'csv' ('csv' also prints the trends as CSV in the console)
    printJson: false,           // Also print the full JSON result in the console
    copyToClipboard: false,     // Also copy the full JSON result to the clipboard
    scrollDelay: 1500,
    maxScrollRetries: 5,
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

  // Add the trends currently on screen to the list (deduplicated by name)
  const collectTrends = (trends) => {
    document.querySelectorAll('[data-testid="trend"]').forEach((trend) => {
      if (trends.length >= CONFIG.maxResults) return;
      const spans = trend.querySelectorAll('[dir="ltr"] span');
      const texts = Array.from(spans).map(s => s.textContent).filter(Boolean);
      const name = texts.find(t => t.startsWith('#') || t.length > 3) || texts[0] || '';
      const category = texts.find(t => t.includes('·') || t.includes('Trending')) || '';
      const count = texts.find(t => /\d+[KMB]?\s*(posts|tweets)/i.test(t)) || '';

      if (name && !trends.find(t => t.name === name)) {
        trends.push({ rank: trends.length + 1, name, category: category.trim(), tweetCount: count.trim() });
      }
    });
  };

  const printTrends = (trends) => {
    console.log(`\n📈 Found ${trends.length} trends:\n`);
    trends.slice(0, 20).forEach(t => {
      console.log(`   #${t.rank} ${t.name} ${t.tweetCount ? '(' + t.tweetCount + ')' : ''}`);
    });
  };

  const scrapeTrends = async () => {
    console.log('📈 Scraping trending topics...');

    // Navigate to trending tab if not already there
    if (!window.location.href.includes('/explore/tabs/trending')) {
      const trendingTab = document.querySelector('a[href="/explore/tabs/trending"]');
      if (trendingTab) { trendingTab.click(); await sleep(2000); }
    }

    const trends = [];
    let retries = 0;

    while (trends.length < CONFIG.maxResults && retries < CONFIG.maxScrollRetries) {
      const prevSize = trends.length;

      collectTrends(trends);

      if (trends.length === prevSize) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    printTrends(trends);

    return { type: 'trends', trends };
  };

  // Scroll the current page and collect posts (deduplicated by URL)
  const collectPosts = async (max) => {
    const results = new Map();
    let retries = 0;

    while (results.size < max && retries < CONFIG.maxScrollRetries) {
      const prevSize = results.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        if (results.size >= max) return;
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || results.has(linkEl.href)) return;

        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const likes = tweet.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent || '0';
        const reposts = tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0';

        results.set(linkEl.href, { text: text.substring(0, 300), author, time, url: linkEl.href, likes, reposts });
      });

      if (results.size === prevSize) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return [...results.values()];
  };

  const searchTweets = async () => {
    if (!CONFIG.searchQuery) {
      console.error('❌ Set CONFIG.searchQuery first!');
      return null;
    }

    console.log(`🔍 Searching: "${CONFIG.searchQuery}"...`);

    // Type in search box
    const searchInput = document.querySelector('[data-testid="SearchBox_Search_Input"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.value = '';
      document.execCommand('insertText', false, CONFIG.searchQuery);
      await sleep(500);
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      await sleep(3000);
    } else {
      // Navigate directly
      window.location.href = `https://x.com/search?q=${encodeURIComponent(CONFIG.searchQuery)}&f=live`;
      await sleep(4000);
    }

    const all = await collectPosts(CONFIG.maxResults);
    console.log(`\n🔍 Found ${all.length} results`);

    return { type: 'search', query: CONFIG.searchQuery, results: all };
  };

  // The Explore page as it is: trends on screen plus the posts in its feed
  const scrapeExplorePage = async () => {
    console.log('🧭 Scraping the Explore page...');

    const trends = [];
    collectTrends(trends);
    printTrends(trends);

    let tweets = [];
    if (CONFIG.maxTweets > 0) {
      tweets = await collectPosts(CONFIG.maxTweets);
      console.log(`\n📰 Scraped ${tweets.length} posts`);
    }

    return { type: 'explore', trends, tweets };
  };

  const run = async () => {
    console.log('🔍 DISCOVERY & EXPLORE — XActions by nichxbt\n');

    let data;
    if (CONFIG.action === 'trends') data = await scrapeTrends();
    else if (CONFIG.action === 'search') data = await searchTweets();
    else if (CONFIG.action === 'explore') data = await scrapeExplorePage();
    else { console.error(`❌ Unknown action: ${CONFIG.action}`); return; }

    if (!data) return;
    const result = { exportedAt: new Date().toISOString(), url: window.location.href, ...data };

    if (CONFIG.outputFormat === 'csv' && data.trends) {
      const csvTrends = 'rank,name,category,postCount\n' +
        data.trends.map(t => `${t.rank},"${t.name}","${t.category}","${t.tweetCount}"`).join('\n');
      console.log('\n📋 Trends CSV:');
      console.log(csvTrends);
    }

    if (CONFIG.printJson) {
      console.log('\n📦 Full JSON result:');
      console.log(JSON.stringify(result, null, 2));
    }

    if (CONFIG.copyToClipboard) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        console.log('\n✅ Results copied to clipboard!');
      } catch {
        console.log('\n⚠️ Could not copy to clipboard. Use the download or console output.');
      }
    }

    if (CONFIG.exportResults) {
      const date = new Date().toISOString().slice(0, 10);
      download(result, `xactions-explore-${CONFIG.action}-${date}.json`);
    }

    console.log('\n🏁 Done!');
  };

  run();
})();
