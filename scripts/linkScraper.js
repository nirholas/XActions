/**
 * Link Scraper - Standalone Version
 * Extracts all links shared by a user
 * 
 * HOW TO USE:
 * 1. Go to a user's profile: x.com/USERNAME
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_SCROLLS: 100,
    MAX_TWEETS: 500,
    SCROLL_DELAY: 1500,
    INCLUDE_TWITTER_LINKS: false,
    INCLUDE_MEDIA: false,
    AUTO_DOWNLOAD: true,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const download = (data, filename, type = 'application/json') => {
    const content = type.includes('json') ? JSON.stringify(data, null, 2) : data;
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const links = new Map();
  const processedTweetIds = new Set();
  let tweetsProcessed = 0;

  const getUsername = () => {
    const match = window.location.pathname.match(/^\/([^/]+)/);
    return match ? match[1] : 'unknown';
  };

  const getTweetId = (article) => {
    const link = article.querySelector('a[href*="/status/"]');
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
      
      if (!CONFIG.INCLUDE_TWITTER_LINKS) {
        if (['x.com', 'twitter.com'].includes(domain)) return false;
      }
      if (!CONFIG.INCLUDE_MEDIA) {
        if (['pic.x.com', 'pbs.twimg.com', 'video.twimg.com'].includes(domain)) return false;
      }
      if (domain === 't.co') return false;
      
      return true;
    } catch (e) {
      return false;
    }
  };

  const extractLinks = (article) => {
    const tweetLinks = [];
    const anchors = article.querySelectorAll('a[href]');
    
    for (const anchor of anchors) {
      let url = anchor.href;
      const title = anchor.getAttribute('title');
      if (title && title.startsWith('http')) url = title;
      
      const displayText = anchor.textContent;
      if (displayText && displayText.startsWith('http') && !displayText.includes('…')) {
        url = displayText;
      }

      if (isValidLink(url)) {
        tweetLinks.push(url);
      }
    }
    
    return [...new Set(tweetLinks)];
  };

  const processTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    
    for (const article of articles) {
      const tweetId = getTweetId(article);
      if (!tweetId || processedTweetIds.has(tweetId)) continue;
      
      processedTweetIds.add(tweetId);
      tweetsProcessed++;

      const tweetLinks = extractLinks(article);
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

  const run = async () => {
    const username = getUsername();
    console.log(`🔗 Link Scraper starting for @${username}...`);

    let scrollCount = 0;
    let lastHeight = 0;

    while (scrollCount < CONFIG.MAX_SCROLLS && tweetsProcessed < CONFIG.MAX_TWEETS) {
      processTweets();
      
      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrollCount++;

      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) {
        scrollCount += 5;
      }
      lastHeight = newHeight;
      
      if (scrollCount % 10 === 0) {
        console.log(`📊 Progress: ${tweetsProcessed} tweets, ${links.size} unique links`);
      }
    }

    const sortedLinks = Array.from(links.entries())
      .sort((a, b) => b[1].count - a[1].count);

    console.log('\n' + '='.repeat(60));
    console.log(`🔗 LINKS FROM @${username}`);
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

    const sortedDomains = Object.entries(byDomain)
      .sort((a, b) => b[1].length - a[1].length);

    for (const [domain, domainLinks] of sortedDomains.slice(0, 10)) {
      console.log(`\n🌐 ${domain} (${domainLinks.length} links)`);
      for (const link of domainLinks.slice(0, 3)) {
        console.log(`   ${link.url}`);
      }
    }

    if (CONFIG.AUTO_DOWNLOAD) {
      const data = {
        username,
        scrapedAt: new Date().toISOString(),
        totalLinks: links.size,
        tweetsProcessed,
        links: sortedLinks.map(([url, data]) => ({ url, ...data })),
      };
      download(data, `${username}_links_${Date.now()}.json`);
      console.log('💾 Downloaded links.json');
    }

    window.scrapedLinks = { links: sortedLinks, byDomain };
    console.log('\n✅ Done! Access data: window.scrapedLinks');
  };

  run();
})();
