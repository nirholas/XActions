// GENERATED FILE: a copy of browser/linkScraper.js, written by scripts/build-script-manifest.mjs. Edit browser/linkScraper.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔗 Link Scraper
 * ============================================================
 *
 * @name        linkScraper.js
 * @title       Link Scraper
 * @description Scroll a user's profile and collect every external link they shared, grouped by domain, with JSON and text downloads.
 * @category    scrape
 * @page        x.com/<username>
 * @writes      false
 * @aliases     scripts/linkScraper.js, src/automation/linkScraper.js, scripts/twitter/link-scraper.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * Extracts all links shared by a specific user.
 * Great for research, finding resources, tracking promotions.
 *
 * 1. Go to a user's profile: x.com/USERNAME
 * 2. Paste browser/linkScraper.js into the DevTools console and press Enter
 *    (src/automation/core.js is optional: when it is pasted first its
 *    logger, storage and selectors are used)
 * 3. Let it scroll and collect all links!
 * 4. Run stopLinkScraper() to stop early. Results: window.scrapedLinks
 *    and window.XActions.linkData()
 * ============================================================
 */

(() => {
  // ============================================
  // CORE (optional): use core.js when present, built-ins otherwise
  // ============================================
  const Core = window.XActions?.Core;

  const sleep = Core?.sleep || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  const log = Core?.log || ((message, type = 'info') => {
    const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
    console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
  });
  const scrollBy = Core?.scrollBy || ((pixels) => window.scrollBy({ top: pixels, behavior: 'smooth' }));
  // Same key layout as core.js storage (xactions_ prefix, JSON values)
  const storage = Core?.storage || {
    get: (key) => {
      try {
        const data = localStorage.getItem('xactions_' + key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('xactions_' + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
  const SELECTORS = Core?.SELECTORS || {
    tweet: '[data-testid="tweet"]',
  };

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Scraping limits
    MAX_SCROLLS: 100,            // How far to scroll
    MAX_TWEETS: 500,             // Max tweets to process
    SCROLL_DELAY: 1500,          // Wait after each scroll (ms)
    MAX_RETRIES: 0,              // Stop after N scrolls with no new posts or links (0 = never, scroll MAX_SCROLLS times)
    
    // Filter options
    INCLUDE_TWITTER_LINKS: false, // Include links to other tweets/profiles
    INCLUDE_MEDIA: false,         // Include pic.x.com links
    DOMAINS_ONLY: [],             // Only these domains (empty = all)
    EXCLUDE_DOMAINS: [            // Skip these domains
      't.co',                     // Twitter's shortener (we expand these)
    ],
    
    // Output
    AUTO_DOWNLOAD: true,          // Auto-download results as file
    EXPORT_CSV: false,            // Also download a CSV (URL, Domain, Times Shared, First Tweet)
  };

  // ============================================
  // STATE
  // ============================================
  const links = new Map(); // url -> { count, tweets, firstSeen }
  let tweetsProcessed = 0;
  let scrollCount = 0;
  const processedTweetIds = new Set();

  // ============================================
  // HELPERS
  // ============================================
  const getUsername = () => {
    const match = window.location.pathname.match(/^\/([^/]+)/);
    return match ? match[1] : 'unknown';
  };

  const getTweetId = (tweetElement) => {
    // Prefer the permalink around the timestamp: the first /status/ link can
    // belong to a quoted tweet
    const timeAnchor = tweetElement.querySelector('time')?.closest('a[href*="/status/"]');
    const link = timeAnchor || tweetElement.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const isValidLink = (url) => {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.replace('www.', '');

      // Skip Twitter internal links unless opted in
      if (!CONFIG.INCLUDE_TWITTER_LINKS) {
        if (['x.com', 'twitter.com'].includes(domain)) return false;
      }

      // Skip media links unless opted in
      if (!CONFIG.INCLUDE_MEDIA) {
        if (['pic.x.com', 'pbs.twimg.com', 'video.twimg.com'].includes(domain)) return false;
        if (domain.endsWith('twimg.com')) return false;
        if (['x.com', 'twitter.com'].includes(domain) && /\/(photo|video)\//.test(parsed.pathname)) return false;
      }

      // Domain whitelist
      if (CONFIG.DOMAINS_ONLY.length > 0) {
        if (!CONFIG.DOMAINS_ONLY.some(d => domain.includes(d))) return false;
      }

      // Domain blacklist
      if (CONFIG.EXCLUDE_DOMAINS.some(d => domain.includes(d))) return false;

      return true;
    } catch (e) {
      return false;
    }
  };

  const extractLinks = (tweetElement) => {
    const tweetLinks = [];
    
    // Get all anchor tags
    const anchors = tweetElement.querySelectorAll('a[href]');
    
    for (const anchor of anchors) {
      let url = anchor.href;
      
      // Try to get expanded URL from title attribute (Twitter often puts it there)
      const title = anchor.getAttribute('title');
      if (title && title.startsWith('http')) {
        url = title;
      }
      
      // Or from aria-label
      const ariaLabel = anchor.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.startsWith('http')) {
        url = ariaLabel;
      }
      
      // Get display text which sometimes has the full URL
      const displayText = anchor.textContent;
      if (displayText && displayText.startsWith('http') && !displayText.includes('…')) {
        url = displayText;
      }

      if (isValidLink(url)) {
        tweetLinks.push(url);
      }
    }
    
    return [...new Set(tweetLinks)]; // Dedupe
  };

  // ============================================
  // PROCESSING
  // ============================================
  const processTweets = () => {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    
    for (const tweet of tweets) {
      const tweetId = getTweetId(tweet);
      if (!tweetId || processedTweetIds.has(tweetId)) continue;
      
      processedTweetIds.add(tweetId);
      tweetsProcessed++;

      const tweetLinks = extractLinks(tweet);
      const tweetUrl = `https://x.com/i/status/${tweetId}`;
      
      for (const url of tweetLinks) {
        if (links.has(url)) {
          const existing = links.get(url);
          existing.count++;
          existing.tweets.push(tweetUrl);
        } else {
          links.set(url, {
            count: 1,
            tweets: [tweetUrl],
            firstSeen: new Date().toISOString(),
          });
        }
      }
    }
  };

  // ============================================
  // OUTPUT
  // ============================================
  const generateReport = () => {
    const username = getUsername();
    const sortedLinks = Array.from(links.entries())
      .sort((a, b) => b[1].count - a[1].count);

    // Console output
    console.log('\n' + '='.repeat(60));
    console.log(`📎 LINKS FROM @${username}`);
    console.log('='.repeat(60));
    console.log(`Total unique links: ${links.size}`);
    console.log(`Tweets processed: ${tweetsProcessed}`);
    console.log('='.repeat(60) + '\n');

    // Group by domain
    const byDomain = {};
    for (const [url, data] of sortedLinks) {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push({ url, ...data });
      } catch {
        // Not an absolute URL, so it has no domain to group under. It is still
        // counted and listed in the totals above.
      }
    }

    // Print by domain
    const sortedDomains = Object.entries(byDomain)
      .sort((a, b) => b[1].length - a[1].length);

    for (const [domain, domainLinks] of sortedDomains.slice(0, 10)) {
      console.log(`\n🌐 ${domain} (${domainLinks.length} links)`);
      for (const link of domainLinks.slice(0, 5)) {
        console.log(`   ${link.url}`);
        if (link.count > 1) console.log(`      ↳ Shared ${link.count}x`);
      }
      if (domainLinks.length > 5) {
        console.log(`   ... and ${domainLinks.length - 5} more`);
      }
    }

    console.log(`\n📊 Total domains: ${sortedDomains.length}`);

    return { username, sortedLinks, byDomain, sortedDomains, tweetsProcessed };
  };

  const domainOf = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  };

  const downloadResults = (report) => {
    const { username, sortedLinks } = report;
    
    // Create detailed JSON
    const jsonData = {
      username,
      scrapedAt: new Date().toISOString(),
      totalLinks: links.size,
      tweetsProcessed: report.tweetsProcessed,
      byDomain: Object.fromEntries(report.sortedDomains.map(([domain, domainLinks]) => [domain, domainLinks.length])),
      links: sortedLinks.map(([url, data]) => ({
        url,
        domain: domainOf(url),
        timesShared: data.count,
        tweets: data.tweets,
        firstSeen: data.firstSeen,
      })),
    };

    // Download JSON
    const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `${username}-links-${Date.now()}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);

    // Also create simple text list
    const textContent = sortedLinks.map(([url]) => url).join('\n');
    const textBlob = new Blob([textContent], { type: 'text/plain' });
    const textUrl = URL.createObjectURL(textBlob);
    const textLink = document.createElement('a');
    textLink.href = textUrl;
    textLink.download = `${username}-links-${Date.now()}.txt`;
    document.body.appendChild(textLink);
    textLink.click();
    document.body.removeChild(textLink);

    if (CONFIG.EXPORT_CSV) {
      // Quote every field: URLs can contain commas and quotes
      const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const headers = ['URL', 'Domain', 'Times Shared', 'First Tweet'];
      const rows = sortedLinks.map(([url, data]) => [
        url,
        domainOf(url),
        data.count,
        data.tweets[0],
      ].map(csvEscape).join(','));
      const csvBlob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement('a');
      csvLink.href = csvUrl;
      csvLink.download = `${username}-links-${Date.now()}.csv`;
      document.body.appendChild(csvLink);
      csvLink.click();
      document.body.removeChild(csvLink);
      URL.revokeObjectURL(csvUrl);
    }

    log(`📥 Downloaded JSON${CONFIG.EXPORT_CSV ? ', TXT and CSV' : ' and TXT'} files!`, 'success');
  };

  // ============================================
  // MAIN RUN
  // ============================================
  const run = async () => {
    const username = getUsername();
    if (['home', 'explore', 'search', 'notifications', 'messages', 'i', 'unknown'].includes(username)) {
      log('Must be on a user\'s profile page! Go to: https://x.com/username', 'error');
      return;
    }
    log(`🔗 Starting Link Scraper for @${username}...`, 'info');
    log(`Max scrolls: ${CONFIG.MAX_SCROLLS}`, 'info');

    let retries = 0;
    let lastLinkCount = 0;
    let lastTweetCount = 0;

    while (scrollCount < CONFIG.MAX_SCROLLS && tweetsProcessed < CONFIG.MAX_TWEETS) {
      processTweets();

      // Progress means new links OR new tweets scanned
      if (links.size === lastLinkCount && tweetsProcessed === lastTweetCount) {
        retries++;
        if (CONFIG.MAX_RETRIES > 0 && retries >= CONFIG.MAX_RETRIES) {
          log(`No new posts after ${retries} scrolls, reached the end`, 'info');
          break;
        }
      } else {
        retries = 0;
        lastLinkCount = links.size;
        lastTweetCount = tweetsProcessed;
      }
      
      scrollBy(800);
      scrollCount++;
      await sleep(CONFIG.SCROLL_DELAY);
      
      if (scrollCount % 10 === 0) {
        log(`Progress: ${tweetsProcessed} tweets, ${links.size} unique links`, 'info');
      }
    }

    const report = generateReport();
    
    // Save to storage
    storage.set(`links_${username}`, {
      links: Array.from(links.entries()),
      scrapedAt: Date.now(),
    });

    if (CONFIG.AUTO_DOWNLOAD) {
      downloadResults(report);
    }

    window.scrapedLinks = {
      username,
      scrapedAt: new Date().toISOString(),
      totalLinks: links.size,
      totalTweets: tweetsProcessed,
      links: report.sortedLinks,
      byDomain: report.byDomain,
      allLinks: report.sortedLinks.map(([url, data]) => ({ url, domain: domainOf(url), ...data })),
    };
    log('Access data: window.scrapedLinks', 'info');

    log(`\n✅ Done! Found ${links.size} unique links from ${tweetsProcessed} tweets.`, 'success');
  };

  run();

  // Expose data for manual access
  window.XActions = window.XActions || {};
  window.XActions.linkData = () => links;
  window.stopLinkScraper = () => {
    CONFIG.MAX_SCROLLS = 0;
    log('Stopping...', 'warning');
  };
})();
