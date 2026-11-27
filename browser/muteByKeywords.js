// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        muteByKeywords.js
 * @title       Mute by Keywords
 * @description Mute users whose posts (on a timeline or search) or bios (on a followers list) contain keywords you set, dry run by default.
 * @category    safety
 * @page        x.com/home or x.com/search?q=<query>&f=live or x.com/<you>/followers
 * @writes      true
 * @aliases     scripts/muteByKeywords.js, scripts/twitter/mute-by-keywords.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 */
// Mute Users by Keywords on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to any X timeline or search page (keywords are matched in post text),
//    or a followers/following page (keywords are matched in bios)
// 2. Open the Developer Console (F12)
// 3. Paste browser/muteByKeywords.js into the Developer Console and run it
// 4. To stop early: window.stopMuteByKeywords()
//
// Mutes users whose posts or bios contain specified keywords.
// Starts in dry run: set CONFIG.dryRun = false to actually mute.
// Last Updated: 26 November 2026
(() => {
  const CONFIG = {
    keywords: [
      // Add keywords/phrases to match. Users posting these get muted.
      // 'spam',
      // 'giveaway',
      // 'follow for follow',
      // Bio examples: 'crypto', 'nft', 'trading signals', 'dm for promo'
    ],
    // 'auto': match bios on /followers or /following pages, post text everywhere else
    // 'tweets': match post text on a timeline or search page
    // 'bios': match bios in the user list on a followers/following page
    mode: 'auto',
    dryRun: true,       // Set to false to actually mute
    maxMutes: 10,
    minDelay: 2000,
    maxDelay: 3000,
    scrollDelay: 2000,
    maxScrollAttempts: 20,
    maxScrolls: 0,      // Hard cap on total scrolls, 0 = no cap
    caseSensitive: false,
    saveLog: false,     // Save matched users to localStorage "xactions_keyword_mutes"
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $moreButton = '[data-testid="caret"]'; // Three-dot on tweet
  const $muteOption = '[data-testid="muteLink"]';
  const $userCell = '[data-testid="UserCell"]';
  const STORAGE_KEY = 'xactions_keyword_mutes';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const mutedUsers = new Set();
  const processedTweets = new Set();
  const processedUsers = new Set();
  const matches = [];
  let scrollAttempts = 0;
  let scrollCount = 0;

  // Stop switch: run window.stopMuteByKeywords() from the console to abort
  // after the account currently being processed.
  let stopped = false;
  window.stopMuteByKeywords = () => {
    stopped = true;
    console.log('🛑 Stop requested. Finishing the current account, then exiting.');
  };

  const matchedKeywords = (text) => {
    const t = CONFIG.caseSensitive ? text : text.toLowerCase();
    return CONFIG.keywords.filter(kw => {
      const k = CONFIG.caseSensitive ? kw : kw.toLowerCase();
      return t.includes(k);
    });
  };

  const matchesKeywords = (text) => matchedKeywords(text).length > 0;

  const getUsernameFromTweet = (tweetEl) => {
    const link = tweetEl.querySelector('a[href^="/"][role="link"]');
    if (link) {
      const match = link.href.match(/x\.com\/([^\/]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const resolveMode = () => {
    if (CONFIG.mode === 'tweets' || CONFIG.mode === 'bios') return CONFIG.mode;
    const path = window.location.pathname;
    return path.includes('/followers') || path.includes('/following') ? 'bios' : 'tweets';
  };

  const record = (username, keywords, text) => {
    mutedUsers.add(username);
    matches.push({ username, keywords, text });
  };

  // Mute through the tweet's three-dot menu
  const scanTweets = async () => {
    let foundNew = false;
    const tweets = document.querySelectorAll($tweet);

    for (const tweet of tweets) {
      if (stopped || mutedUsers.size >= CONFIG.maxMutes) break;

      const tweetId = tweet.querySelector('a[href*="/status/"]')?.href || '';
      if (processedTweets.has(tweetId)) continue;
      processedTweets.add(tweetId);
      foundNew = true;

      const textEl = tweet.querySelector($tweetText);
      if (!textEl) continue;

      const text = textEl.textContent;
      if (!matchesKeywords(text)) continue;

      const username = getUsernameFromTweet(tweet);
      if (!username || mutedUsers.has(username)) continue;

      if (CONFIG.dryRun) {
        record(username, matchedKeywords(text), text);
        console.log(`🔍 Would mute @${username} (matched: "${text.substring(0, 50)}...")`);
        continue;
      }

      try {
        // Click the three-dot menu on the tweet
        const caret = tweet.querySelector($moreButton);
        if (!caret) continue;

        caret.click();
        await sleep(800);

        // Find and click mute option
        const muteLink = document.querySelector($muteOption);
        if (muteLink) {
          muteLink.click();
          record(username, matchedKeywords(text), text);
          console.log(`🔇 Muted @${username} (matched: "${text.substring(0, 50)}...")`);
          await sleep(randomDelay());
        } else {
          // Close menu if mute not found
          document.body.click();
          await sleep(300);
        }
      } catch (e) {
        document.body.click();
        await sleep(300);
      }
    }
    return foundNew;
  };

  // Mute through the user cell's actions menu on a followers/following list
  const scanBios = async () => {
    let foundNew = false;
    const cells = document.querySelectorAll($userCell);

    for (const cell of cells) {
      if (stopped || mutedUsers.size >= CONFIG.maxMutes) break;

      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || processedUsers.has(username)) continue;
      processedUsers.add(username);
      foundNew = true;

      const bio = cell.querySelector('[data-testid="UserDescription"]')?.textContent || '';
      const keywords = matchedKeywords(bio);
      if (keywords.length === 0 || mutedUsers.has(username)) continue;

      const bioPreview = `${bio.slice(0, 100)}${bio.length > 100 ? '...' : ''}`;

      if (CONFIG.dryRun) {
        record(username, keywords, bio);
        console.log(`🔍 Would mute @${username} (keywords: ${keywords.join(', ')}) bio: "${bioPreview}"`);
        continue;
      }

      try {
        cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const moreButton = cell.querySelector('[data-testid="userActions"]');
        if (!moreButton) continue;

        moreButton.click();
        await sleep(800);

        let muteOption = document.querySelector('[data-testid="mute"]');
        if (!muteOption) {
          for (const item of document.querySelectorAll('[role="menuitem"]')) {
            if (/\bmute\b/i.test(item.textContent) && !/unmute/i.test(item.textContent)) { muteOption = item; break; }
          }
        }

        if (muteOption) {
          muteOption.click();
          record(username, keywords, bio);
          console.log(`🔇 Muted @${username} (keywords: ${keywords.join(', ')})`);
          await sleep(randomDelay());
        } else {
          console.log(`⚠️  Mute option not found for @${username}`);
          document.body.click();
          await sleep(300);
        }
      } catch (e) {
        document.body.click();
        await sleep(300);
      }
    }
    return foundNew;
  };

  const run = async () => {
    console.log('🔇 MUTE BY KEYWORDS - XActions by nichxbt');
    console.log(CONFIG.dryRun ? '⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually mute' : '🔴 LIVE MODE - Accounts WILL be muted');
    console.log('💡 To stop early: window.stopMuteByKeywords()');

    if (CONFIG.keywords.length === 0) {
      console.error('❌ No keywords configured! Edit CONFIG.keywords array.');
      return;
    }

    const mode = resolveMode();
    console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}`);
    console.log(`📊 Max mutes: ${CONFIG.maxMutes} | Matching: ${mode === 'bios' ? 'bios' : 'post text'} | Case sensitive: ${CONFIG.caseSensitive}`);

    while (!stopped && mutedUsers.size < CONFIG.maxMutes && scrollAttempts < CONFIG.maxScrollAttempts
      && (!CONFIG.maxScrolls || scrollCount < CONFIG.maxScrolls)) {
      const foundNew = mode === 'bios' ? await scanBios() : await scanTweets();

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollCount++;
    }

    if (stopped) console.log('🛑 Stopped by user.');

    if (CONFIG.dryRun) {
      console.log(`\n✅ Done! ${mutedUsers.size} users would be muted (dry run, nothing changed).`);
      if (mutedUsers.size > 0) console.log('Set CONFIG.dryRun = false to actually mute.');
    } else {
      console.log(`\n✅ Done! Muted ${mutedUsers.size} users.`);
    }
    if (mutedUsers.size > 0) {
      console.log(`${CONFIG.dryRun ? 'Matched' : 'Muted'} users:`, [...mutedUsers].join(', '));
    }

    if (CONFIG.saveLog && matches.length > 0) {
      try {
        const log = matches.map(m => ({
          username: m.username,
          keywords: m.keywords,
          muted: !CONFIG.dryRun,
          timestamp: new Date().toISOString(),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
        console.log(`💾 Results saved to localStorage "${STORAGE_KEY}"`);
      } catch (e) {
        console.warn(`⚠️ Could not save log: ${e.message}`);
      }
    }
  };

  run();
})();
