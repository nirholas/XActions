// UnfollowX Automation - Link Scraper
// https://github.com/nirholas/UnfollowX
//
// REQUIRES: Paste core.js first!
//
// Extracts all links shared by a specific user.
// Great for research, finding resources, tracking promotions.
//
// HOW TO USE:
// 1. Go to a user's profile: twitter.com/USERNAME
// 2. Paste core.js, then paste this script
// 3. Let it scroll and collect all links!

(() => {
  if (!window.UnfollowX?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, scrollBy, storage, SELECTORS } = window.UnfollowX.Core;

  // ============================================
  // CONFIGURATION
  // ============================================
  const OPTIONS = {
    // Scraping limits
    MAX_SCROLLS: 100,            // How far to scroll
    MAX_TWEETS: 500,             // Max tweets to process
    
    // Filter options
    INCLUDE_TWITTER_LINKS: false, // Include links to other tweets/profiles
    INCLUDE_MEDIA: false,         // Include pic.twitter.com links
    DOMAINS_ONLY: [],             // Only these domains (empty = all)
    EXCLUDE_DOMAINS: [            // Skip these domains
      't.co',                     // Twitter's shortener (we expand these)
    ],
    
    // Output
    AUTO_DOWNLOAD: true,          // Auto-download results as file
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
    const link = tweetElement.querySelector('a[href*="/status/"]');
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
      if (!OPTIONS.INCLUDE_TWITTER_LINKS) {
        if (['twitter.com', 'x.com'].includes(domain)) return false;
      }

      // Skip media links unless opted in
      if (!OPTIONS.INCLUDE_MEDIA) {
        if (['pic.twitter.com', 'pbs.twimg.com', 'video.twimg.com'].includes(domain)) return false;
      }

      // Domain whitelist
      if (OPTIONS.DOMAINS_ONLY.length > 0) {
        if (!OPTIONS.DOMAINS_ONLY.some(d => domain.includes(d))) return false;
      }

      // Domain blacklist
      if (OPTIONS.EXCLUDE_DOMAINS.some(d => domain.includes(d))) return false;

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
      const tweetUrl = `https://twitter.com/i/status/${tweetId}`;
      
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
      } catch (e) {}
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

    return { username, sortedLinks, byDomain, tweetsProcessed };
  };

  const downloadResults = (report) => {
    const { username, sortedLinks } = report;
    
    // Create detailed JSON
    const jsonData = {
      username,
      scrapedAt: new Date().toISOString(),
      totalLinks: links.size,
      tweetsProcessed: report.tweetsProcessed,
      links: sortedLinks.map(([url, data]) => ({
        url,
        timesShared: data.count,
        tweets: data.tweets,
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

    log('📥 Downloaded JSON and TXT files!', 'success');
  };

  // ============================================
  // MAIN RUN
  // ============================================
  const run = async () => {
    const username = getUsername();
    log(`🔗 Starting Link Scraper for @${username}...`, 'info');
    log(`Max scrolls: ${OPTIONS.MAX_SCROLLS}`, 'info');

    while (scrollCount < OPTIONS.MAX_SCROLLS && tweetsProcessed < OPTIONS.MAX_TWEETS) {
      processTweets();
      
      scrollBy(800);
      scrollCount++;
      await sleep(1500);
      
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

    if (OPTIONS.AUTO_DOWNLOAD) {
      downloadResults(report);
    }

    log(`\n✅ Done! Found ${links.size} unique links from ${tweetsProcessed} tweets.`, 'success');
  };

  run();

  // Expose data for manual access
  window.UnfollowX.linkData = () => links;
  window.stopLinkScraper = () => {
    OPTIONS.MAX_SCROLLS = 0;
    log('Stopping...', 'warning');
  };
})();
