// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// browser/postInteractions.js
// Post interaction tools for X/Twitter
// by nichxbt
//
// Features:
// - View who liked a post
// - View who reposted a post
// - View who quoted a post
// - View post edit history
// - Embed post (copy embed HTML)
// - Copy link to post
// - "Not interested in this post"
// - Translate post
// - View post source label
// - Mute conversation
// - Report specific post
// - Request Community Note
// - Write/Rate Community Notes
//
// Usage:
// 1. Navigate to x.com (any tweet page or timeline)
// 2. Open DevTools Console (F12)
// 3. Paste this script and run
// 4. Use: window.XActions.postInteractions.<function>(tweetUrl)
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const CONFIG = {
    scrollDelay: 2000,
    actionDelay: 1500,
    navigationDelay: 3000,
    maxScrollAttempts: 50,
    maxEmptyScrolls: 5,
    maxUsers: 500,
    autoExport: true,
    saveToSession: true,
  };

  const SEL = {
    tweet:       'article[data-testid="tweet"]',
    tweetText:   '[data-testid="tweetText"]',
    userCell:    '[data-testid="UserCell"]',
    userName:    '[data-testid="User-Name"]',
    caret:       '[data-testid="caret"]',
    share:       '[data-testid="share"]',
    toast:       '[data-testid="toast"]',
    confirm:     '[data-testid="confirmationSheetConfirm"]',
    menuItem:    '[role="menuitem"]',
    verified:    '[data-testid="icon-verified"]',
  };

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  // ── URL Helpers ──

  const parseTweetUrl = (url) => {
    const match = url.match(/x\.com\/([^/]+)\/status\/(\d+)/);
    if (!match) return null;
    return { username: match[1], statusId: match[2] };
  };

  const extractTweetId = (url) => {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const currentTweetUrl = () => {
    const match = window.location.href.match(/x\.com\/\w+\/status\/\d+/);
    return match ? `https://${match[0]}` : null;
  };

  const requireUrl = (tweetUrl, funcName) => {
    if (tweetUrl) return tweetUrl;
    const current = currentTweetUrl();
    if (current) return current;
    console.error(`❌ Usage: XActions.postInteractions.${funcName}("https://x.com/user/status/123")`);
    console.error('❌ Or navigate to a tweet page and call without arguments.');
    return null;
  };

  // ── DOM Helpers ──

  const waitForElement = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const extractBio = (cell) => {
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    if (autoDir?.textContent?.trim()?.length >= 10) return autoDir.textContent.trim();
    const noRole = cell.querySelector('[dir="auto"]:not([role])');
    if (noRole && !noRole.closest('a') && noRole.textContent?.trim()?.length >= 10) return noRole.textContent.trim();
    return '';
  };

  const extractUserFromCell = (cell) => {
    const userLink = cell.querySelector('a[href^="/"][role="link"]');
    if (!userLink) return null;
    const href = userLink.getAttribute('href');
    const username = href?.replace('/', '')?.replace(/\/$/, '');
    if (!username || username.includes('/')) return null;

    const nameEl = cell.querySelector(SEL.userName);
    const displayName = nameEl?.querySelector('span')?.textContent || '';
    const bio = extractBio(cell);
    const verified = !!cell.querySelector(SEL.verified);

    // Try to find follower count text in the cell
    let followerCount = '';
    for (const span of $$(SEL.userName + ' ~ div span', cell)) {
      const txt = span.textContent?.trim() || '';
      if (/^\d[\d,.]*[KMB]?\s*(followers?)/i.test(txt)) {
        followerCount = txt;
        break;
      }
    }

    return {
      username,
      displayName,
      bio: bio.substring(0, 200),
      verified,
      followerCount,
      profileUrl: `https://x.com/${username}`,
    };
  };

  const findPrimaryTweet = () => {
    const articles = $$(SEL.tweet);
    if (articles.length === 0) return null;
    for (const article of articles) {
      if (article.querySelector('a[href*="/likes"]') || article.querySelector('a[href*="/retweets"]')) {
        return article;
      }
    }
    return articles[0];
  };

  const openTweetMenu = async (tweetArticle) => {
    const caret = tweetArticle?.querySelector(SEL.caret);
    if (!caret) {
      console.error('❌ Could not find tweet menu button (caret).');
      return false;
    }
    caret.click();
    await sleep(CONFIG.actionDelay);
    return true;
  };

  const clickMenuItem = async (text) => {
    await sleep(500);
    const items = $$(SEL.menuItem);
    for (const item of items) {
      if (item.textContent?.toLowerCase().includes(text.toLowerCase())) {
        item.click();
        await sleep(CONFIG.actionDelay);
        return true;
      }
    }
    // Fallback: broader search in menu-like containers
    const allSpans = $$('[role="menu"] span, [data-testid="Dropdown"] span');
    for (const span of allSpans) {
      if (span.textContent?.toLowerCase().includes(text.toLowerCase())) {
        const clickTarget = span.closest('[role="menuitem"]') || span;
        clickTarget.click();
        await sleep(CONFIG.actionDelay);
        return true;
      }
    }
    return false;
  };

  const dismissMenu = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  };

  // ── Export Helpers ──

  const exportJSON = (data, filename) => {
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

  // ── Generic Scroll-and-Scrape for User Lists ──

  const scrapeUserList = async (url, label) => {
    console.log(`🔄 Navigating to ${label} page...`);
    window.location.href = url;
    await sleep(CONFIG.navigationDelay);

    const users = new Map();
    let scrollAttempts = 0;
    let emptyScrolls = 0;

    console.log(`🔄 Scraping ${label}...`);

    while (users.size < CONFIG.maxUsers && scrollAttempts < CONFIG.maxScrollAttempts) {
      const prevSize = users.size;
      const cells = $$(SEL.userCell);

      for (const cell of cells) {
        if (users.size >= CONFIG.maxUsers) break;
        const user = extractUserFromCell(cell);
        if (user && !users.has(user.username)) {
          users.set(user.username, user);
        }
      }

      if (users.size === prevSize) {
        emptyScrolls++;
        if (emptyScrolls >= CONFIG.maxEmptyScrolls) {
          console.log(`✅ Reached end of ${label} list.`);
          break;
        }
      } else {
        emptyScrolls = 0;
        console.log(`🔄 Found ${users.size} ${label} so far...`);
      }

      window.scrollBy(0, window.innerHeight * 2);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    const result = [...users.values()];
    console.log(`✅ Scraped ${result.length} ${label}.`);
    return result;
  };

  // ═══════════════════════════════════════════════
  // 1. View who liked a post
  // ═══════════════════════════════════════════════
  const viewLikes = async (tweetUrl) => {
    tweetUrl = requireUrl(tweetUrl, 'viewLikes');
    if (!tweetUrl) return null;
    const parsed = parseTweetUrl(tweetUrl);
    if (!parsed) { console.error('❌ Invalid tweet URL.'); return null; }

    const likesUrl = `https://x.com/${parsed.username}/status/${parsed.statusId}/likes`;
    const users = await scrapeUserList(likesUrl, 'likes');

    if (users.length > 0) {
      console.table(users.map(u => ({
        Username: `@${u.username}`,
        Name: u.displayName,
        Bio: u.bio.substring(0, 60) + (u.bio.length > 60 ? '...' : ''),
        Verified: u.verified ? '✓' : '',
      })));
    }

    if (CONFIG.saveToSession) {
      sessionStorage.setItem('xactions_post_likes', JSON.stringify(users));
      console.log('💾 Saved to sessionStorage key: xactions_post_likes');
    }
    if (CONFIG.autoExport) {
      exportJSON({ post: parsed, type: 'likes', scrapedAt: new Date().toISOString(), users }, `likes_${parsed.username}_${parsed.statusId}.json`);
    }
    return users;
  };

  // ═══════════════════════════════════════════════
  // 2. View who reposted a post
  // ═══════════════════════════════════════════════
  const viewReposts = async (tweetUrl) => {
    tweetUrl = requireUrl(tweetUrl, 'viewReposts');
    if (!tweetUrl) return null;
    const parsed = parseTweetUrl(tweetUrl);
    if (!parsed) { console.error('❌ Invalid tweet URL.'); return null; }

    const repostsUrl = `https://x.com/${parsed.username}/status/${parsed.statusId}/retweets`;
    const users = await scrapeUserList(repostsUrl, 'reposts');

    if (users.length > 0) {
      console.table(users.map(u => ({
        Username: `@${u.username}`,
        Name: u.displayName,
        Bio: u.bio.substring(0, 60) + (u.bio.length > 60 ? '...' : ''),
        Verified: u.verified ? '✓' : '',
      })));
    }

    if (CONFIG.saveToSession) {
      sessionStorage.setItem('xactions_post_reposts', JSON.stringify(users));
      console.log('💾 Saved to sessionStorage key: xactions_post_reposts');
    }
    if (CONFIG.autoExport) {
      exportJSON({ post: parsed, type: 'reposts', scrapedAt: new Date().toISOString(), users }, `reposts_${parsed.username}_${parsed.statusId}.json`);
    }
    return users;
  };

  // ═══════════════════════════════════════════════
  // 3. View who quoted a post
  // ═══════════════════════════════════════════════
  const viewQuotes = async (tweetUrl) => {
    tweetUrl = requireUrl(tweetUrl, 'viewQuotes');
    if (!tweetUrl) return null;
    const parsed = parseTweetUrl(tweetUrl);
    if (!parsed) { console.error('❌ Invalid tweet URL.'); return null; }

    const quotesUrl = `https://x.com/${parsed.username}/status/${parsed.statusId}/quotes`;
    console.log('🔄 Navigating to quotes page...');
    window.location.href = quotesUrl;
    await sleep(CONFIG.navigationDelay);

    const quotes = new Map();
    let scrollAttempts = 0;
    let emptyScrolls = 0;

    console.log('🔄 Scraping quote tweets...');

    while (quotes.size < CONFIG.maxUsers && scrollAttempts < CONFIG.maxScrollAttempts) {
      const prevSize = quotes.size;
      const articles = $$(SEL.tweet);

      for (const article of articles) {
        const statusLinks = $$('a[href*="/status/"]', article);
        // The quote tweet's own status link (not the original tweet's)
        let quoteLink = null;
        for (const link of statusLinks) {
          const href = link.getAttribute('href') || '';
          if (!href.includes(parsed.statusId)) {
            quoteLink = href;
            break;
          }
        }
        if (!quoteLink) continue;

        const quoteId = extractTweetId(quoteLink);
        if (!quoteId || quotes.has(quoteId)) continue;

        const nameEl = article.querySelector(SEL.userName);
        const textEl = article.querySelector(SEL.tweetText);
        const timeEl = article.querySelector('time');
        const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
        const username = authorLink?.getAttribute('href')?.replace('/', '')?.replace(/\/$/, '') || '';

        quotes.set(quoteId, {
          quoteId,
          username,
          displayName: nameEl?.textContent?.split('@')[0]?.trim() || '',
          text: textEl?.textContent?.trim() || '',
          time: timeEl?.getAttribute('datetime') || '',
          url: `https://x.com${quoteLink}`,
        });
      }

      if (quotes.size === prevSize) {
        emptyScrolls++;
        if (emptyScrolls >= CONFIG.maxEmptyScrolls) {
          console.log('✅ Reached end of quotes list.');
          break;
        }
      } else {
        emptyScrolls = 0;
        console.log(`🔄 Found ${quotes.size} quotes so far...`);
      }

      window.scrollBy(0, window.innerHeight * 2);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    const result = [...quotes.values()];
    console.log(`✅ Scraped ${result.length} quote tweets.`);

    if (result.length > 0) {
      console.table(result.map(q => ({
        User: `@${q.username}`,
        Text: q.text.substring(0, 80) + (q.text.length > 80 ? '...' : ''),
        Time: q.time,
      })));
    }

    if (CONFIG.saveToSession) {
      sessionStorage.setItem('xactions_post_quotes', JSON.stringify(result));
      console.log('💾 Saved to sessionStorage key: xactions_post_quotes');
    }
    if (CONFIG.autoExport) {
      exportJSON({ post: parsed, type: 'quotes', scrapedAt: new Date().toISOString(), quotes: result }, `quotes_${parsed.username}_${parsed.statusId}.json`);
    }
    return result;
  };

  // ═══════════════════════════════════════════════
  // 4. View post edit history
  // ═══════════════════════════════════════════════
  const viewEditHistory = async (tweetUrl) => {
    tweetUrl = requireUrl(tweetUrl, 'viewEditHistory');
    if (!tweetUrl) return null;
    const parsed = parseTweetUrl(tweetUrl);
    if (!parsed) { console.error('❌ Invalid tweet URL.'); return null; }

    const historyUrl = `https://x.com/${parsed.username}/status/${parsed.statusId}/history`;
    console.log('🔄 Navigating to edit history...');
    window.location.href = historyUrl;
    await sleep(CONFIG.navigationDelay);

    const edits = [];
    const articles = $$(SEL.tweet);

    if (articles.length === 0) {
      console.log('⚠️ No edit history found. This post may not have been edited.');
      return edits;
    }

    for (const article of articles) {
      const textEl = article.querySelector(SEL.tweetText);
      const timeEl = article.querySelector('time');

      edits.push({
        text: textEl?.textContent?.trim() || '',
        editedAt: timeEl?.getAttribute('datetime') || '',
        displayTime: timeEl?.textContent?.trim() || '',
      });
    }

    console.log(`✅ Found ${edits.length} version(s) of this post.`);
    edits.forEach((edit, i) => {
      console.log(`\n📝 Version ${i + 1} (${edit.displayTime || edit.editedAt}):`);
      console.log(`   ${edit.text}`);
    });

    if (CONFIG.saveToSession) {
      sessionStorage.setItem('xactions_edit_history', JSON.stringify(edits));
      console.log('\n💾 Saved to sessionStorage key: xactions_edit_history');
    }
    return edits;
  };

  // ═══════════════════════════════════════════════
  // 5. Embed post
  // ═══════════════════════════════════════════════
  const embedPost = async (tweetUrl) => {
    tweetUrl = requireUrl(tweetUrl, 'embedPost');
    if (!tweetUrl) return null;
    const parsed = parseTweetUrl(tweetUrl);
    if (!parsed) { console.error('❌ Invalid tweet URL.'); return null; }

    const canonicalUrl = `https://x.com/${parsed.username}/status/${parsed.statusId}`;
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(canonicalUrl)}`;

    console.log('🔄 Fetching embed code via oEmbed API...');

    try {
      const response = await fetch(oembedUrl);
      if (!response.ok) {
        console.error(`❌ Failed to fetch embed code: HTTP ${response.status}`);
        return null;
      }
      const data = await response.json();
      const embedHtml = data.html;

      if (!embedHtml) {
        console.error('❌ No embed HTML returned from oEmbed API.');
        return null;
      }

      try {
        await navigator.clipboard.writeText(embedHtml);
        console.log('✅ Embed HTML copied to clipboard!');
      } catch {
        console.log('⚠️ Could not copy to clipboard automatically (requires user gesture).');
      }

      console.log('\n📋 Embed HTML:\n');
      console.log(embedHtml);

      if (CONFIG.saveToSession) {
        sessionStorage.setItem('xactions_embed_html', embedHtml);
        console.log('\n💾 Saved to sessionStorage key: xactions_embed_html');
      }
      return embedHtml;
    } catch (err) {
      console.error('❌ Error fetching embed code:', err.message);
      return null;
    }
  };

  // ═══════════════════════════════════════════════
  // 6. Copy link to post
  // ═══════════════════════════════════════════════
  const copyLink = async (tweetUrl) => {
    tweetUrl = requireUrl(tweetUrl, 'copyLink');
    if (!tweetUrl) return null;
    const parsed = parseTweetUrl(tweetUrl);
    if (!parsed) { console.error('❌ Invalid tweet URL.'); return null; }

    const permanentLink = `https://x.com/${parsed.username}/status/${parsed.statusId}`;

    try {
      await navigator.clipboard.writeText(permanentLink);
      console.log(`✅ Link copied to clipboard: ${permanentLink}`);
    } catch {
      console.log(`⚠️ Could not copy to clipboard. Link: ${permanentLink}`);
    }

    return permanentLink;
  };

  // ═══════════════════════════════════════════════
  // 7. "Not interested in this post"
  // ═══════════════════════════════════════════════
  const notInterested = async (tweetUrl) => {
    if (tweetUrl) {
      console.log('🔄 Navigating to tweet...');
      window.location.href = tweetUrl;
      await sleep(CONFIG.navigationDelay);
    }

    const tweet = findPrimaryTweet();
    if (!tweet) {
      console.error('❌ No tweet found on this page. Navigate to a tweet or pass a tweet URL.');
      return false;
    }

    const menuOpened = await openTweetMenu(tweet);
    if (!menuOpened) return false;

    const clicked = await clickMenuItem('not interested');
    if (!clicked) {
      console.error('❌ Could not find "Not interested" option in menu.');
      dismissMenu();
      return false;
    }

    console.log('✅ Marked post as "Not interested".');
    return true;
  };

  // ═══════════════════════════════════════════════
  // 8. Translate post
  // ═══════════════════════════════════════════════
  const translatePost = async (tweetUrl) => {
    if (tweetUrl) {
      console.log('🔄 Navigating to tweet...');
      window.location.href = tweetUrl;
      await sleep(CONFIG.navigationDelay);
    }

    const tweet = findPrimaryTweet();
    if (!tweet) {
      console.error('❌ No tweet found on this page.');
      return false;
    }

    // Look for "Translate post" / "Translate Tweet" button within or below the tweet
    const candidates = $$('span', tweet);
    for (const el of candidates) {
      const text = el.textContent?.trim()?.toLowerCase() || '';
      if (text === 'translate post' || text === 'translate tweet' || text === 'translate') {
        el.click();
        await sleep(2000);
        console.log('✅ Translation triggered.');

        const tweetText = tweet.querySelector(SEL.tweetText);
        if (tweetText) {
          console.log(`📝 Text: ${tweetText.textContent}`);
        }
        return true;
      }
    }

    console.log('⚠️ No "Translate post" option found. The post may already be in your language.');
    return false;
  };

  // ═══════════════════════════════════════════════
  // 9. View post source label
  // ═══════════════════════════════════════════════
  const viewSourceLabel = async (tweetUrl) => {
    if (tweetUrl) {
      console.log('🔄 Navigating to tweet...');
      window.location.href = tweetUrl;
      await sleep(CONFIG.navigationDelay);
    }

    const tweet = findPrimaryTweet();
    if (!tweet) {
      console.error('❌ No tweet found on this page.');
      return null;
    }

    const result = {
      source: null,
      timestamp: null,
      views: null,
    };

    // Timestamp
    const timeEl = tweet.querySelector('time');
    if (timeEl) {
      result.timestamp = timeEl.getAttribute('datetime');
    }

    // Source label — historically shown as "Twitter for iPhone", etc.
    // May appear as a link near the timestamp on tweet detail pages
    const allLinks = $$('a', tweet);
    for (const link of allLinks) {
      const href = link.getAttribute('href') || '';
      if (href.includes('help.twitter.com') || href.includes('source=')) {
        result.source = link.textContent?.trim() || null;
        break;
      }
    }

    // Fallback: scan spans for common source patterns
    if (!result.source) {
      for (const span of $$('span', tweet)) {
        const text = span.textContent?.trim() || '';
        if (/^(Twitter|X)\s+(for|Web|Android|iPhone|iPad|Pro)/i.test(text)) {
          result.source = text;
          break;
        }
      }
    }

    // View count
    const analyticsLink = tweet.querySelector('a[href*="/analytics"]');
    if (analyticsLink) {
      result.views = analyticsLink.textContent?.trim() || null;
    }

    if (result.source) {
      console.log(`✅ Source: ${result.source}`);
    } else {
      console.log('⚠️ Source label not available. X no longer shows source for most tweets.');
    }
    if (result.timestamp) {
      console.log(`🕐 Timestamp: ${result.timestamp}`);
    }
    if (result.views) {
      console.log(`👁️ Views: ${result.views}`);
    }

    return result;
  };

  // ═══════════════════════════════════════════════
  // 10. Mute conversation
  // ═══════════════════════════════════════════════
  const muteConversation = async (tweetUrl) => {
    if (tweetUrl) {
      console.log('🔄 Navigating to tweet...');
      window.location.href = tweetUrl;
      await sleep(CONFIG.navigationDelay);
    }

    const tweet = findPrimaryTweet();
    if (!tweet) {
      console.error('❌ No tweet found on this page.');
      return false;
    }

    const menuOpened = await openTweetMenu(tweet);
    if (!menuOpened) return false;

    let clicked = await clickMenuItem('mute this conversation');
    if (!clicked) {
      clicked = await clickMenuItem('mute conversation');
    }
    if (!clicked) {
      console.error('❌ Could not find "Mute this conversation" option in menu.');
      dismissMenu();
      return false;
    }

    console.log('✅ Conversation muted.');
    return true;
  };

  // ═══════════════════════════════════════════════
  // 11. Report specific post
  // ═══════════════════════════════════════════════
  const reportPost = async (tweetUrl, category) => {
    const validCategories = [
      'spam', 'abuse', 'harmful', 'misleading',
      'violence', 'privacy', 'hateful', 'self-harm', 'illegal',
    ];

    if (!tweetUrl) {
      console.error('❌ Usage: XActions.postInteractions.reportPost("https://x.com/user/status/123", "spam")');
      console.log(`📋 Valid categories: ${validCategories.join(', ')}`);
      return false;
    }

    console.log('🔄 Navigating to tweet...');
    window.location.href = tweetUrl;
    await sleep(CONFIG.navigationDelay);

    const tweet = findPrimaryTweet();
    if (!tweet) {
      console.error('❌ No tweet found on this page.');
      return false;
    }

    const menuOpened = await openTweetMenu(tweet);
    if (!menuOpened) return false;

    const clicked = await clickMenuItem('report');
    if (!clicked) {
      console.error('❌ Could not find "Report" option in menu.');
      dismissMenu();
      return false;
    }

    console.log('🔄 Report dialog opened...');
    await sleep(2000);

    if (category) {
      const normalized = category.toLowerCase();
      const options = $$('[role="radio"], [role="option"], [role="button"], [role="menuitemradio"]');
      let found = false;

      for (const option of options) {
        const optionText = option.textContent?.toLowerCase() || '';
        if (optionText.includes(normalized)) {
          option.click();
          await sleep(CONFIG.actionDelay);
          found = true;
          console.log(`✅ Selected report category: ${category}`);
          break;
        }
      }

      if (!found) {
        console.log(`⚠️ Could not auto-select category "${category}". Please select manually.`);
        console.log(`📋 Valid categories: ${validCategories.join(', ')}`);
      }
    } else {
      console.log('⚠️ No category specified. Please select a report reason in the dialog.');
      console.log(`📋 Valid categories: ${validCategories.join(', ')}`);
    }

    console.log('✅ Report flow initiated. Complete the remaining steps in the dialog.');
    return true;
  };

  // ═══════════════════════════════════════════════
  // 12. Request Community Note
  // ═══════════════════════════════════════════════
  const requestCommunityNote = async (tweetUrl) => {
    tweetUrl = requireUrl(tweetUrl, 'requestCommunityNote');
    if (!tweetUrl) return false;

    console.log('🔄 Navigating to tweet...');
    window.location.href = tweetUrl;
    await sleep(CONFIG.navigationDelay);

    const tweet = findPrimaryTweet();
    if (!tweet) {
      console.error('❌ No tweet found on this page.');
      return false;
    }

    const menuOpened = await openTweetMenu(tweet);
    if (!menuOpened) return false;

    let clicked = await clickMenuItem('request community note');
    if (!clicked) {
      clicked = await clickMenuItem('community note');
    }
    if (!clicked) {
      console.error('❌ Could not find "Request Community Note" option.');
      console.log('⚠️ This feature requires Community Notes contributor enrollment.');
      dismissMenu();
      return false;
    }

    console.log('✅ Community Note request initiated. Complete the form if prompted.');
    return true;
  };

  // ═══════════════════════════════════════════════
  // 13. Write/Rate Community Notes
  // ═══════════════════════════════════════════════
  const openCommunityNotes = async () => {
    console.log('🔄 Navigating to Community Notes...');
    window.location.href = 'https://x.com/i/birdwatch';
    await sleep(CONFIG.navigationDelay);

    if (window.location.href.includes('birdwatch') || window.location.href.includes('communitynotes')) {
      console.log('✅ Community Notes page opened.');
      console.log('');
      console.log('📋 From here you can:');
      console.log('   • Write new notes on tweets');
      console.log('   • Rate existing community notes');
      console.log('   • View your note-writing history');
      console.log('   • Check your contributor rating');
      console.log('');
      console.log('💡 To write a note on a specific tweet, use writeCommunityNote(url)');
    } else {
      console.log('⚠️ Could not open Community Notes. You may need to enroll as a contributor.');
      console.log('💡 Sign up at: https://x.com/i/birdwatch/signup');
    }
    return true;
  };

  const writeCommunityNote = async (tweetUrl) => {
    tweetUrl = requireUrl(tweetUrl, 'writeCommunityNote');
    if (!tweetUrl) return false;

    console.log('🔄 Navigating to tweet...');
    window.location.href = tweetUrl;
    await sleep(CONFIG.navigationDelay);

    const tweet = findPrimaryTweet();
    if (!tweet) {
      console.error('❌ No tweet found on this page.');
      return false;
    }

    const menuOpened = await openTweetMenu(tweet);
    if (!menuOpened) return false;

    let clicked = await clickMenuItem('write community note');
    if (!clicked) {
      clicked = await clickMenuItem('write a community note');
    }
    if (!clicked) {
      console.error('❌ Could not find "Write Community Note" option.');
      console.log('⚠️ You may need Community Notes contributor status.');
      dismissMenu();
      return false;
    }

    console.log('✅ Community Note editor opened. Write your note in the dialog.');
    return true;
  };

  // ═══════════════════════════════════════════════
  // Expose on window.XActions.postInteractions
  // ═══════════════════════════════════════════════
  window.XActions = window.XActions || {};
  window.XActions.postInteractions = {
    viewLikes,
    viewReposts,
    viewQuotes,
    viewEditHistory,
    embedPost,
    copyLink,
    notInterested,
    translatePost,
    viewSourceLabel,
    muteConversation,
    reportPost,
    requestCommunityNote,
    openCommunityNotes,
    writeCommunityNote,
  };

  // ═══════════════════════════════════════════════
  // Print menu
  // ═══════════════════════════════════════════════
  const W = 66;
  const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║' + pad('  📝 POST INTERACTIONS — XActions by nichxbt', W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║' + ' '.repeat(W) + '║');

  const cmds = [
    ['viewLikes(url)',            'Scrape users who liked a post'],
    ['viewReposts(url)',          'Scrape users who reposted'],
    ['viewQuotes(url)',           'Scrape quote tweets with text'],
    ['viewEditHistory(url)',      'View all versions of an edited post'],
    ['embedPost(url)',            'Get embed HTML, copy to clipboard'],
    ['copyLink(url?)',            'Copy permanent link to clipboard'],
    ['notInterested(url?)',       'Mark "Not interested in this post"'],
    ['translatePost(url?)',       'Click "Translate post" if available'],
    ['viewSourceLabel(url?)',     'Extract source / "Posted via" label'],
    ['muteConversation(url?)',    'Mute a conversation thread'],
    ['reportPost(url, cat?)',     'Report post (spam, abuse, ...)'],
    ['requestCommunityNote(url)', 'Request a Community Note'],
    ['openCommunityNotes()',      'Open Community Notes dashboard'],
    ['writeCommunityNote(url)',   'Write a Community Note on a post'],
  ];

  for (const [cmd, desc] of cmds) {
    const left = `  .${cmd}`;
    const right = `${desc}  `;
    const gap = W - left.length - right.length;
    if (gap >= 3) {
      console.log('║' + left + ' '.repeat(gap - 2) + '— ' + right + '║');
    } else {
      console.log('║' + pad(left, W) + '║');
      console.log('║' + pad(`      — ${desc}`, W) + '║');
    }
  }

  console.log('║' + ' '.repeat(W) + '║');
  console.log('║' + pad('  💡 Access via: window.XActions.postInteractions', W) + '║');
  console.log('║' + pad('  💡 url? = optional if already on a tweet page', W) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
})();
