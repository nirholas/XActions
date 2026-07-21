// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔗 Link Scraper
 * ============================================================
 * 
 * @name        link-scraper.js
 * @description Extract all links shared by a specific user
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to any user's profile: https://x.com/username
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. All links will be extracted and organized by domain
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // Maximum scrolls to load tweets
  maxScrolls: 100,
  
  // Maximum tweets to scan
  maxTweets: 500,
  
  // Scroll delay
  scrollDelay: 1500,
  
  // Include Twitter/X internal links
  includeTwitterLinks: false,
  
  // Include media links (images/videos)
  includeMedia: false,
  
  // Domains to exclude
  excludeDomains: [
    't.co' // Twitter's URL shortener (usually just redirects)
  ],
  
  // Auto-download results
  autoDownload: true,
  
  // Max retries when no new content
  maxRetries: 5
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function linkScraper() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $tweet = 'article[data-testid="tweet"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔗 LINK SCRAPER                                           ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Get username from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const username = pathMatch ? pathMatch[1] : null;
  
  if (!username || ['home', 'explore', 'search', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ ERROR: Must be on a user\'s profile page!');
    console.log('📍 Go to: https://x.com/username');
    return;
  }
  
  console.log(`👤 Scraping links from: @${username}`);
  console.log('');
  
  const links = new Map(); // url -> { url, domain, tweetCount, tweets }
  const seenTweets = new Set();
  let scrolls = 0;
  let retries = 0;
  let lastLinkCount = 0;
  let lastTweetCount = 0;
  
  /**
   * Extract domain from URL
   */
  function getDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Check if link should be included
   */
  function shouldInclude(url) {
    const domain = getDomain(url);
    
    // Exclude configured domains
    if (CONFIG.excludeDomains.includes(domain)) return false;
    
    // Exclude Twitter links
    if (!CONFIG.includeTwitterLinks) {
      if (domain.includes('twitter.com') || domain.includes('x.com')) return false;
    }
    
    // Exclude media
    if (!CONFIG.includeMedia) {
      if (domain.includes('twimg.com') || url.includes('/photo/') || url.includes('/video/')) return false;
    }
    
    return true;
  }
  
  /**
   * Extract links from tweet
   */
  function extractLinks(tweetEl) {
    // Get tweet ID for deduplication. Prefer the permalink around the
    // timestamp: the first /status/ link can belong to a quoted tweet.
    const timeAnchor = tweetEl.querySelector('time')?.closest('a[href*="/status/"]');
    const tweetLink = timeAnchor || tweetEl.querySelector('a[href*="/status/"]');
    if (!tweetLink) return [];

    const match = tweetLink.href.match(/\/status\/(\d+)/);
    if (!match) return [];
    
    const tweetId = match[1];
    if (seenTweets.has(tweetId)) return [];
    seenTweets.add(tweetId);
    
    const foundLinks = [];
    
    // Find all links in tweet
    tweetEl.querySelectorAll('a').forEach(a => {
      const href = a.href;
      if (!href || !href.startsWith('http')) return;
      
      // Get expanded URL from title attribute if available
      let url = a.getAttribute('title') || href;
      
      // Skip if it's a relative link or twitter internal
      if (!url.startsWith('http')) return;
      
      if (shouldInclude(url)) {
        foundLinks.push({
          url,
          domain: getDomain(url),
          tweetId,
          tweetUrl: `https://x.com/${username}/status/${tweetId}`
        });
      }
    });
    
    return foundLinks;
  }
  
  console.log('🚀 Scraping links...');
  console.log('');
  
  // Scroll and extract
  while (scrolls < CONFIG.maxScrolls && seenTweets.size < CONFIG.maxTweets && retries < CONFIG.maxRetries) {
    document.querySelectorAll($tweet).forEach(tweet => {
      const foundLinks = extractLinks(tweet);
      
      foundLinks.forEach(linkData => {
        if (links.has(linkData.url)) {
          const existing = links.get(linkData.url);
          existing.tweetCount++;
          existing.tweets.push(linkData.tweetUrl);
        } else {
          links.set(linkData.url, {
            url: linkData.url,
            domain: linkData.domain,
            tweetCount: 1,
            tweets: [linkData.tweetUrl]
          });
        }
      });
    });
    
    // Progress means new links OR new tweets scanned; tracking links alone
    // would stop the scan early on stretches of tweets with no links
    if (links.size === lastLinkCount && seenTweets.size === lastTweetCount) {
      retries++;
    } else {
      retries = 0;
      lastLinkCount = links.size;
      lastTweetCount = seenTweets.size;
    }
    
    console.log(`📊 Found ${links.size} unique links from ${seenTweets.size} tweets...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log(`✅ Finished: ${links.size} links from ${seenTweets.size} tweets`);
  console.log('');
  
  // Group by domain
  const byDomain = {};
  links.forEach(link => {
    if (!byDomain[link.domain]) {
      byDomain[link.domain] = [];
    }
    byDomain[link.domain].push(link);
  });
  
  // Sort domains by link count
  const sortedDomains = Object.entries(byDomain)
    .sort((a, b) => b[1].length - a[1].length);
  
  // Display summary
  console.log('📊 LINKS BY DOMAIN:');
  console.log('');
  sortedDomains.slice(0, 15).forEach(([domain, domainLinks]) => {
    console.log(`   ${domain}: ${domainLinks.length} links`);
  });
  if (sortedDomains.length > 15) {
    console.log(`   ... and ${sortedDomains.length - 15} more domains`);
  }
  console.log('');
  
  // Build result
  const result = {
    username,
    scrapedAt: new Date().toISOString(),
    totalLinks: links.size,
    totalTweets: seenTweets.size,
    byDomain: Object.fromEntries(sortedDomains),
    allLinks: [...links.values()].sort((a, b) => b.tweetCount - a.tweetCount)
  };
  
  // Download
  if (CONFIG.autoDownload) {
    // JSON
    const jsonBlob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `${username}_links_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);
    console.log('💾 JSON downloaded!');
    
    // CSV (quote every field: URLs can contain commas and quotes)
    const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['URL', 'Domain', 'Times Shared', 'First Tweet'];
    const rows = result.allLinks.map(l => [
      l.url,
      l.domain,
      l.tweetCount,
      l.tweets[0]
    ].map(csvEscape).join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const csvBlob = new Blob([csv], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `${username}_links_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);
    console.log('💾 CSV downloaded!');
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ LINK SCRAPER COMPLETE!                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🔗 Total unique links: ${links.size}`);
  console.log(`📊 Total domains: ${sortedDomains.length}`);
  console.log('');
  
  window.scrapedLinks = result;
  console.log('💡 Access via: window.scrapedLinks');
  
  return result;
})();
