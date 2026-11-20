// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📝 Community Notes — Production Grade
 * ============================================================
 *
 * @name        communityNotes.js
 * @description View and contribute to Community Notes on posts,
 *              rate existing notes, and browse noted tweets.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/home or a specific tweet
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 *
 * ⚠️ Contributing to Community Notes requires enrollment at
 *    https://x.com/i/communitynotes
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Action ───────────────────────────────────────────────
    action: 'view',
    //   'view'     — view Community Notes on visible tweets
    //   'write'    — write a note on the current tweet (requires tweetUrl)
    //   'rate'     — rate existing notes as helpful/not helpful
    //   'browse'   — browse tweets with Community Notes on your timeline

    // ── Write Note Parameters ────────────────────────────────
    tweetUrl: '',                    // URL of tweet to add a note to
    noteText: '',                    // The note content to write
    noteClassification: 'misleading', // 'misleading', 'not_misleading', or 'might_be_misleading'

    // ── Rate Parameters ──────────────────────────────────────
    rateAsHelpful: true,             // true = helpful, false = not helpful

    // ── Browse Settings ──────────────────────────────────────
    maxTweets: 30,                   // Max tweets to scan for notes
    maxScrollAttempts: 20,

    // ── Timing ───────────────────────────────────────────────
    scrollDelay: 2000,
    actionDelay: 2000,
    navigationDelay: 3000,
    typeCharDelay: 30,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,
  };

  const SEL = {
    communityNote:  '[data-testid="communityNote"]',
    rateNote:       '[data-testid="rateNote"]',
    writeNote:      '[data-testid="writeNote"]',
    tweet:          'article[data-testid="tweet"]',
    tweetText:      '[data-testid="tweetText"]',
    userName:       '[data-testid="User-Name"]',
    caret:          '[data-testid="caret"]',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
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

  const typeText = async (element, text) => {
    element.focus();
    for (const char of text) {
      document.execCommand('insertText', false, char);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
      await sleep(CONFIG.typeCharDelay);
    }
  };

  const stats = {
    action: CONFIG.action,
    notesFound: 0,
    notesViewed: [],
    noteWritten: false,
    notesRated: 0,
    tweetsScanned: 0,
    startTime: Date.now(),
  };

  window.XActions = {
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      console.log(`📊 Notes: ${stats.notesFound} | Rated: ${stats.notesRated} | Tweets: ${stats.tweetsScanned} | ${el}s`);
    },
  };

  const extractTweetInfo = (tweetEl) => {
    const text = tweetEl.querySelector(SEL.tweetText)?.textContent || '';
    const author = tweetEl.querySelector(SEL.userName + ' a')?.textContent || '';
    const link = tweetEl.querySelector('a[href*="/status/"]')?.href || '';
    const time = tweetEl.querySelector('time')?.getAttribute('datetime') || '';
    return { text: text.slice(0, 200), author, link, time };
  };

  const viewNotes = async () => {
    console.log('👁️ Scanning visible tweets for Community Notes...');

    const processedTweets = new Set();
    let scrollAttempts = 0;

    while (scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const tweets = $$(SEL.tweet);

      for (const tweet of tweets) {
        const info = extractTweetInfo(tweet);
        if (!info.link || processedTweets.has(info.link)) continue;
        processedTweets.add(info.link);
        stats.tweetsScanned++;

        // Check for Community Note on this tweet
        const note = tweet.querySelector(SEL.communityNote);
        if (note) {
          const noteText = note.textContent?.trim() || '';
          stats.notesFound++;
          stats.notesViewed.push({
            tweet: info,
            note: noteText.slice(0, 300),
          });

          console.log(`📝 Note found on tweet by ${info.author}:`);
          console.log(`   Tweet: "${info.text.slice(0, 80)}..."`);
          console.log(`   Note: "${noteText.slice(0, 150)}..."`);
          console.log(`   Link: ${info.link}`);
          console.log('');
        }
      }

      window.scrollBy(0, 600);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    console.log(`✅ Scanned ${stats.tweetsScanned} tweets, found ${stats.notesFound} Community Notes`);
  };

  const writeNote = async () => {
    if (!CONFIG.tweetUrl) {
      console.log('❌ No tweetUrl provided in CONFIG.tweetUrl');
      return;
    }
    if (!CONFIG.noteText) {
      console.log('❌ No noteText provided in CONFIG.noteText');
      return;
    }

    // Navigate to the tweet
    console.log(`🔄 Navigating to tweet: ${CONFIG.tweetUrl}`);
    if (!CONFIG.dryRun && window.location.href !== CONFIG.tweetUrl) {
      window.location.href = CONFIG.tweetUrl;
      return; // Page will reload
    }

    await sleep(CONFIG.navigationDelay);

    // Look for the "Write a note" option
    // First try the caret/more menu on the tweet
    const tweet = await waitForSelector(SEL.tweet, 5000);
    if (!tweet) {
      console.log('❌ Could not find the tweet');
      return;
    }

    let writeBtn = tweet.querySelector(SEL.writeNote);

    if (!writeBtn) {
      // Try the caret menu
      const caretBtn = tweet.querySelector(SEL.caret);
      if (caretBtn && !CONFIG.dryRun) {
        caretBtn.click();
        await sleep(CONFIG.actionDelay);

        const menuItems = $$('[role="menuitem"]');
        writeBtn = menuItems.find(item =>
          item.textContent.toLowerCase().includes('note') ||
          item.textContent.toLowerCase().includes('community note')
        );
      }
    }

    if (!writeBtn) {
      console.log('❌ Could not find "Write a note" option');
      console.log('💡 Make sure you are enrolled in Community Notes at x.com/i/communitynotes');
      return;
    }

    if (!CONFIG.dryRun) {
      writeBtn.click();
      await sleep(CONFIG.navigationDelay);
    }

    // Select classification
    console.log(`📋 Classification: ${CONFIG.noteClassification}`);
    const classificationMap = {
      misleading: 'misinformed',
      not_misleading: 'not_misleading',
      might_be_misleading: 'might_be_misleading',
    };

    const classLabels = $$('[role="radio"], [role="option"], input[type="radio"]');
    for (const label of classLabels) {
      const text = label.textContent?.toLowerCase() || label.value?.toLowerCase() || '';
      const target = (classificationMap[CONFIG.noteClassification] || CONFIG.noteClassification).toLowerCase();
      if (text.includes(target)) {
        if (!CONFIG.dryRun) {
          label.click();
          await sleep(CONFIG.actionDelay);
        }
        break;
      }
    }

    // Type the note
    console.log('✍️ Writing note...');
    const noteInput = document.querySelector('textarea, [contenteditable="true"], [data-testid="noteTextarea"]');
    if (noteInput && !CONFIG.dryRun) {
      await typeText(noteInput, CONFIG.noteText);
      await sleep(1000);
    }

    // Submit
    const submitBtn = document.querySelector('[data-testid="submitNote"], button[type="submit"]');
    if (submitBtn) {
      if (!CONFIG.dryRun) {
        submitBtn.click();
        await sleep(CONFIG.actionDelay);
      }
      stats.noteWritten = true;
      console.log('✅ Community Note submitted');
    } else {
      console.log('⚠️ Could not find submit button — note may need manual submission');
    }
  };

  const rateNotes = async () => {
    console.log(`🔄 Rating Community Notes as ${CONFIG.rateAsHelpful ? 'helpful' : 'not helpful'}...`);

    const processedTweets = new Set();
    let scrollAttempts = 0;

    while (scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const tweets = $$(SEL.tweet);

      for (const tweet of tweets) {
        if (aborted) break;

        const info = extractTweetInfo(tweet);
        if (!info.link || processedTweets.has(info.link)) continue;
        processedTweets.add(info.link);

        const note = tweet.querySelector(SEL.communityNote);
        if (!note) continue;

        stats.notesFound++;

        // Look for rate buttons
        const rateBtn = note.querySelector(SEL.rateNote) ||
                        note.querySelector('[aria-label*="ate"], [aria-label*="elpful"]');

        if (rateBtn) {
          console.log(`📝 Rating note on tweet by ${info.author}...`);

          if (!CONFIG.dryRun) {
            rateBtn.click();
            await sleep(CONFIG.actionDelay);

            // Select helpful or not helpful
            const options = $$('[role="radio"], [role="option"], button');
            const targetText = CONFIG.rateAsHelpful ? 'helpful' : 'not helpful';
            const targetOption = options.find(opt =>
              opt.textContent?.toLowerCase()?.includes(targetText)
            );

            if (targetOption) {
              targetOption.click();
              await sleep(CONFIG.actionDelay);

              // Submit rating
              const submitBtn = document.querySelector('[data-testid="submitRating"], button[type="submit"]');
              if (submitBtn) {
                submitBtn.click();
                await sleep(CONFIG.actionDelay);
              }
            }
          }

          stats.notesRated++;
          console.log(`  ✅ Rated as ${CONFIG.rateAsHelpful ? 'helpful' : 'not helpful'} (${stats.notesRated})`);
        }
      }

      window.scrollBy(0, 600);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    console.log(`✅ Rated ${stats.notesRated} Community Notes`);
  };

  const browseNotedTweets = async () => {
    console.log('🔍 Browsing tweets with Community Notes...');

    // Try navigating to Community Notes hub
    if (!CONFIG.dryRun) {
      console.log('💡 Tip: Visit x.com/i/communitynotes for the full Community Notes dashboard');
    }

    // Scan timeline for noted tweets
    await viewNotes();

    // Export results
    if (stats.notesViewed.length > 0) {
      console.log('');
      console.log('📋 Noted Tweets Export:');
      console.log(JSON.stringify(stats.notesViewed, null, 2));
    }
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📝 COMMUNITY NOTES' + ' '.repeat(W - 22) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually act');
    }

    console.log(`📋 Action: ${CONFIG.action}`);

    const sessionKey = 'xactions_communityNotes';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    const actions = {
      view: viewNotes,
      write: writeNote,
      rate: rateNotes,
      browse: browseNotedTweets,
    };

    if (!actions[CONFIG.action]) {
      console.log(`❌ Unknown action: "${CONFIG.action}"`);
      console.log(`💡 Valid actions: ${Object.keys(actions).join(', ')}`);
      return;
    }

    await actions[CONFIG.action]();

    if (aborted) console.log('🛑 Aborted by user');

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 COMMUNITY NOTES SUMMARY' + ' '.repeat(W - 30) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🔧 Action: ${CONFIG.action}`);
    console.log(`📝 Notes found: ${stats.notesFound}`);
    if (stats.noteWritten) console.log('✍️ Note written: ✅');
    if (stats.notesRated > 0) console.log(`⭐ Notes rated: ${stats.notesRated}`);
    console.log(`📄 Tweets scanned: ${stats.tweetsScanned}`);
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
