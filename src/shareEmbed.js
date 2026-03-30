// Share & Embed Posts on X - by nichxbt
// https://github.com/nirholas/xactions
// Copy post links, get embed codes, or bulk copy links from timeline
// 1. Go to x.com (timeline, profile, or search results)
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below
// 4. Paste and run
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── Mode: 'copyLinks', 'embedSingle', or 'bulkCopy' ──
    mode: 'bulkCopy',           // 'copyLinks' = copy link of specific posts
                                // 'embedSingle' = get embed code for a post
                                // 'bulkCopy' = scroll timeline and collect all post links

    // ── For 'copyLinks' mode ──
    postUrls: [
      // 'https://x.com/nichxbt/status/123456789',
    ],

    // ── For 'embedSingle' mode ──
    embedUrl: '',               // URL of the post to embed

    // ── For 'bulkCopy' mode ──
    maxPosts: 50,               // Max posts to collect links for
    maxScrollAttempts: 20,      // Max scroll attempts before stopping

    // ── Timing ──
    minDelay: 1000,
    maxDelay: 2000,
    scrollDelay: 2000,
  };

  // ── Selectors ──
  const SEL = {
    tweet:       'article[data-testid="tweet"]',
    share:       '[data-testid="share"]',
    copyLink:    '[data-testid="copyLink"]',
    embedTweet:  '[data-testid="embedTweet"]',
    menuItem:    '[role="menuitem"]',
    tweetText:   '[data-testid="tweetText"]',
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

  const extractPostUrl = (tweetEl) => {
    // Find the timestamp link which contains the post URL
    const timeLink = tweetEl.querySelector('a[href*="/status/"] time')?.closest('a');
    if (timeLink) {
      return 'https://x.com' + timeLink.getAttribute('href');
    }
    return null;
  };

  // ── Copy Link via Share Menu ──
  const copyLinkForTweet = async (tweetEl) => {
    const shareBtn = tweetEl.querySelector(SEL.share);
    if (!shareBtn) {
      console.warn('⚠️  Share button not found on tweet.');
      return false;
    }

    shareBtn.click();
    await sleep(800);

    // Click "Copy link" from the share menu
    const copyBtn = await waitForElement(SEL.copyLink, 3000);
    if (copyBtn) {
      copyBtn.click();
      await sleep(500);
      return true;
    }

    // Fallback: look for menu item with "Copy link" text
    const menuItems = document.querySelectorAll(SEL.menuItem);
    for (const item of menuItems) {
      if (item.textContent.toLowerCase().includes('copy link')) {
        item.click();
        await sleep(500);
        return true;
      }
    }

    console.warn('⚠️  "Copy link" option not found in share menu.');
    return false;
  };

  // ── Mode: Copy Links for Specific Posts ──
  const copyLinks = async () => {
    if (CONFIG.postUrls.length === 0) {
      console.error('❌ Please add post URLs to CONFIG.postUrls.');
      return;
    }

    console.log(`🔄 Copying links for ${CONFIG.postUrls.length} posts...`);
    const results = [];

    for (const url of CONFIG.postUrls) {
      console.log(`   📋 ${url}`);
      results.push(url);
    }

    // Copy all URLs to clipboard
    const text = results.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      console.log(`✅ ${results.length} links copied to clipboard!`);
    } catch (e) {
      console.log('⚠️  Clipboard access denied. Here are your links:');
      console.log(text);
    }

    return results;
  };

  // ── Mode: Get Embed Code ──
  const embedSingle = async () => {
    if (!CONFIG.embedUrl) {
      console.error('❌ Please set CONFIG.embedUrl to the post URL.');
      return;
    }

    console.log('🔄 Generating embed code...');

    // Navigate to the post if needed
    const statusPath = CONFIG.embedUrl.replace('https://x.com', '');
    if (!window.location.pathname.includes(statusPath)) {
      console.log('🔄 Navigating to post...');
      window.location.href = CONFIG.embedUrl;
      await sleep(3000);
    }

    // Click share button on the tweet
    const tweet = await waitForElement(SEL.tweet);
    if (!tweet) {
      console.error('❌ Could not find the tweet.');
      return;
    }

    const shareBtn = tweet.querySelector(SEL.share);
    if (!shareBtn) {
      console.error('❌ Share button not found.');
      return;
    }
    shareBtn.click();
    await sleep(1000);

    // Look for "Embed post" option
    const embedBtn = await waitForElement(SEL.embedTweet, 3000);
    if (embedBtn) {
      embedBtn.click();
      await sleep(2000);
      console.log('✅ Embed dialog opened!');
      console.log('💡 You can also get the embed code directly from:');
    } else {
      // Fallback: look in menu items
      const menuItems = document.querySelectorAll(SEL.menuItem);
      let found = false;
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('embed')) {
          item.click();
          found = true;
          await sleep(2000);
          console.log('✅ Embed dialog opened!');
          break;
        }
      }
      if (!found) {
        console.log('⚠️  Embed option not found in share menu.');
      }
    }

    // Provide the publish.twitter.com URL as fallback
    const embedDirectUrl = `https://publish.twitter.com/?url=${encodeURIComponent(CONFIG.embedUrl)}`;
    console.log(`🔗 Direct embed URL: ${embedDirectUrl}`);
    console.log('💡 Open the URL above to get the full embed HTML code.');

    return embedDirectUrl;
  };

  // ── Mode: Bulk Copy Links from Timeline ──
  const bulkCopy = async () => {
    console.log(`🔄 Collecting up to ${CONFIG.maxPosts} post links from timeline...`);

    const collectedUrls = new Set();
    let scrollAttempts = 0;
    let lastCount = 0;

    while (collectedUrls.size < CONFIG.maxPosts && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll(SEL.tweet);

      for (const tweet of tweets) {
        if (collectedUrls.size >= CONFIG.maxPosts) break;

        const url = extractPostUrl(tweet);
        if (url && !collectedUrls.has(url)) {
          collectedUrls.add(url);
        }
      }

      if (collectedUrls.size === lastCount) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0;
        lastCount = collectedUrls.size;
      }

      console.log(`   📋 Collected ${collectedUrls.size} links so far...`);

      // Scroll down to load more
      window.scrollBy(0, window.innerHeight * 2);
      await sleep(CONFIG.scrollDelay);
    }

    const urls = Array.from(collectedUrls);
    const text = urls.join('\n');

    // Try to copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      console.log(`✅ ${urls.length} links copied to clipboard!`);
    } catch (e) {
      console.log('⚠️  Clipboard access denied. Outputting links below:');
    }

    // Also store in sessionStorage
    sessionStorage.setItem('xactions_bulk_links', JSON.stringify(urls));
    console.log('💾 Links saved to sessionStorage (key: "xactions_bulk_links")');

    // Log all links
    console.log('\n📋 Collected Links:');
    urls.forEach((url, i) => console.log(`   ${i + 1}. ${url}`));

    return urls;
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('🔗 XActions — Share & Embed Posts');
    console.log('═══════════════════════════════════════');

    let result;
    switch (CONFIG.mode) {
      case 'copyLinks':
        result = await copyLinks();
        break;
      case 'embedSingle':
        result = await embedSingle();
        break;
      case 'bulkCopy':
        result = await bulkCopy();
        break;
      default:
        console.error(`❌ Invalid mode: "${CONFIG.mode}". Use 'copyLinks', 'embedSingle', or 'bulkCopy'.`);
    }

    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');

    return result;
  };

  run();
})();
