// Post Interactions Scraper on X - by nichxbt
// https://github.com/nirholas/xactions
// Scrape who liked, retweeted, quoted, and bookmarked a post — export as JSON
// 1. Go to x.com and navigate to a specific post (status page)
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below
// 4. Paste and run
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── What to Scrape ──
    scrapeLikes: true,
    scrapeRetweets: true,
    scrapeQuotes: true,

    // ── Scroll Settings ──
    maxUsersPerCategory: 500,   // Max users to collect per interaction type
    maxScrollAttempts: 15,      // Max scroll attempts before moving to next category
    scrollDelay: 2000,          // Wait between scrolls

    // ── Export ──
    autoExport: true,           // Auto-download JSON when done
    saveToSession: true,        // Save to sessionStorage

    // ── Timing ──
    minDelay: 1000,
    maxDelay: 2000,
    navigationDelay: 3000,      // Wait for tab pages to load
  };

  // ── Selectors ──
  const SEL = {
    tweet:       'article[data-testid="tweet"]',
    userCell:    '[data-testid="UserCell"]',
    likesLink:   'a[href*="/likes"]',
    retweetsLink:'a[href*="/retweets"]',
    quotesLink:  'a[href*="/quotes"]',
    tweetText:   '[data-testid="tweetText"]',
    userName:    '[data-testid="User-Name"]',
  };

  // ── Utilities ──
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const waitForElement = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  // ── Extract Post Info from Current Page ──
  const getPostInfo = () => {
    const match = window.location.pathname.match(/\/([^/]+)\/status\/(\d+)/);
    if (!match) return null;

    return {
      username: match[1],
      statusId: match[2],
      url: window.location.href,
    };
  };

  // ── Scrape Users from a User List Page ──
  const scrapeUsers = async (label) => {
    const users = new Map();
    let scrollAttempts = 0;
    let lastCount = 0;

    console.log(`🔄 Scraping ${label}...`);

    while (users.size < CONFIG.maxUsersPerCategory && scrollAttempts < CONFIG.maxScrollAttempts) {
      const userCells = document.querySelectorAll(SEL.userCell);

      for (const cell of userCells) {
        if (users.size >= CONFIG.maxUsersPerCategory) break;

        // Extract username from the user cell
        const userLink = cell.querySelector('a[href^="/"][role="link"]');
        if (!userLink) continue;

        const href = userLink.getAttribute('href');
        const username = href?.replace('/', '')?.replace(/\/$/, '');
        if (!username || username.includes('/')) continue;

        if (!users.has(username)) {
          // Extract display name
          const nameEl = cell.querySelector(SEL.userName);
          const displayName = nameEl?.querySelector('span')?.textContent || '';

          // Extract bio snippet
          const bioEl = cell.querySelector('[data-testid="UserDescription"]');
          const bio = bioEl?.textContent?.trim() || '';

          // Check if verified
          const verified = !!cell.querySelector('svg[data-testid="icon-verified"]');

          users.set(username, {
            username,
            displayName,
            bio: bio.substring(0, 200),
            verified,
            profileUrl: `https://x.com/${username}`,
          });
        }
      }

      if (users.size === lastCount) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0;
        lastCount = users.size;
      }

      console.log(`   Found ${users.size} ${label} so far...`);

      // Scroll down
      window.scrollBy(0, window.innerHeight * 2);
      await sleep(CONFIG.scrollDelay);
    }

    return Array.from(users.values());
  };

  // ── Navigate to Interaction Tab ──
  const navigateToTab = async (tabSelector, label) => {
    // Find the link on the current post page
    const link = document.querySelector(tabSelector);
    if (!link) {
      console.warn(`⚠️  ${label} link not found on this post. It may have zero ${label.toLowerCase()}.`);
      return null;
    }

    // Get the count from the link text
    const countText = link.textContent.trim();
    console.log(`📊 ${label}: ${countText || '0'}`);

    // Click to navigate
    link.click();
    await sleep(CONFIG.navigationDelay);

    return true;
  };

  // ── Export Data ──
  const exportData = (data, filename) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`💾 Exported: ${filename}`);
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('🔍 XActions — Post Interactions Scraper');
    console.log('═══════════════════════════════════════');

    // Verify we're on a post page
    const postInfo = getPostInfo();
    if (!postInfo) {
      console.error('❌ Please navigate to a specific post first.');
      console.log('💡 URL should look like: https://x.com/username/status/123456789');
      return;
    }

    console.log(`📌 Post by @${postInfo.username} (${postInfo.statusId})`);
    console.log(`🔗 ${postInfo.url}`);
    console.log('');

    const baseUrl = postInfo.url.split('?')[0];
    const results = {
      post: postInfo,
      scrapedAt: new Date().toISOString(),
      likes: [],
      retweets: [],
      quotes: [],
    };

    // ── Scrape Likes ──
    if (CONFIG.scrapeLikes) {
      window.location.href = `${baseUrl}/likes`;
      await sleep(CONFIG.navigationDelay);

      const likes = await scrapeUsers('likes');
      results.likes = likes;
      console.log(`✅ Scraped ${likes.length} likes.`);
    }

    // ── Scrape Retweets ──
    if (CONFIG.scrapeRetweets) {
      window.location.href = `${baseUrl}/retweets`;
      await sleep(CONFIG.navigationDelay);

      const retweets = await scrapeUsers('retweets');
      results.retweets = retweets;
      console.log(`✅ Scraped ${retweets.length} retweets.`);
    }

    // ── Scrape Quotes ──
    if (CONFIG.scrapeQuotes) {
      window.location.href = `${baseUrl}/quotes`;
      await sleep(CONFIG.navigationDelay);

      const quotes = await scrapeUsers('quotes');
      results.quotes = quotes;
      console.log(`✅ Scraped ${quotes.length} quotes.`);
    }

    // Navigate back to the post
    window.location.href = baseUrl;

    // ── Summary ──
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`   ❤️  Likes:    ${results.likes.length}`);
    console.log(`   🔁 Retweets: ${results.retweets.length}`);
    console.log(`   💬 Quotes:   ${results.quotes.length}`);
    console.log(`   📊 Total:    ${results.likes.length + results.retweets.length + results.quotes.length}`);

    // ── Export ──
    if (CONFIG.saveToSession) {
      sessionStorage.setItem('xactions_post_interactions', JSON.stringify(results));
      console.log('💾 Saved to sessionStorage (key: "xactions_post_interactions")');
    }

    if (CONFIG.autoExport) {
      const filename = `interactions_${postInfo.username}_${postInfo.statusId}.json`;
      exportData(results, filename);
    }

    // Log top interactors for quick view
    const allUsers = [
      ...results.likes.map(u => ({ ...u, type: 'like' })),
      ...results.retweets.map(u => ({ ...u, type: 'retweet' })),
      ...results.quotes.map(u => ({ ...u, type: 'quote' })),
    ];

    // Find users who interacted in multiple ways
    const userInteractions = {};
    for (const u of allUsers) {
      if (!userInteractions[u.username]) userInteractions[u.username] = [];
      userInteractions[u.username].push(u.type);
    }

    const multiInteractors = Object.entries(userInteractions)
      .filter(([, types]) => types.length > 1)
      .sort((a, b) => b[1].length - a[1].length);

    if (multiInteractors.length > 0) {
      console.log('');
      console.log('🌟 Top Engagers (multiple interaction types):');
      multiInteractors.slice(0, 10).forEach(([username, types]) => {
        console.log(`   @${username}: ${types.join(', ')}`);
      });
    }

    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');

    return results;
  };

  run();
})();
