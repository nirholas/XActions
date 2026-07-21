// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🗳️ Vote In Polls - XActions
 * ============================================
 *
 * @name         vote-in-polls
 * @description  Vote in polls found in a timeline or search as you scroll, using a fixed or random option strategy.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to a timeline or search results page that surfaces polls
 *      (e.g. x.com/home, or x.com/search?q=poll&f=live)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   strategy: 'random', maxVotes: 15. As you scroll, it finds each open poll,
 *   picks a random option, and clicks it. Use strategy: 'index' with
 *   optionIndex: 0 to always pick the first option, or 'first' / 'last'.
 *   Already-voted and closed polls are skipped automatically.
 *   Run window.stopVoteInPolls() to halt after the current poll.
 *
 * ============================================
 */

(async function voteInPolls() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // How to choose an option in each poll:
    //   'first'  = the first option
    //   'last'   = the last option
    //   'random' = a random option
    //   'index'  = the option at CONFIG.optionIndex (0-based)
    strategy: 'random',

    // Used only when strategy is 'index'. 0 = first option.
    optionIndex: 0,

    // Maximum number of polls to vote in this run
    maxVotes: 15,

    // Minimum delay between votes (ms)
    minDelay: 1500,

    // Maximum delay between votes (ms)
    maxDelay: 4000,

    // Maximum scroll attempts to find more polls
    maxScrollAttempts: 30,

    // Stop if no new polls appear after this many consecutive scrolls
    noNewPollsThreshold: 6
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    // X renders poll options with a pollChoice testid; some builds expose them
    // as ARIA radios inside the card. We match both, then keep only clickable ones.
    pollChoice: '[data-testid="pollChoice"], [data-testid^="pollChoice"], div[role="radio"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => window.scrollBy(0, window.innerHeight * 0.7);

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} voted`)
  };

  const getTweetId = (tweet) => {
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const link = tweet.querySelector('a[href*="/status/"]');
    const m = link?.getAttribute('href')?.match(/\/status\/(\d+)/);
    return m ? m[1] : (tweet.querySelector(SELECTORS.tweetText)?.textContent || '').substring(0, 100);
  };

  // Return the clickable poll option elements in a post, or [] if there is no
  // open, unvoted poll. A poll already voted or closed renders results (percent
  // bars) instead of interactive choices, so those elements are filtered out.
  const getOpenPollChoices = (tweet) => {
    const raw = Array.from(tweet.querySelectorAll(SELECTORS.pollChoice));
    if (raw.length === 0) return [];

    // Deduplicate: pollChoice and role="radio" can select nested duplicates.
    const seen = new Set();
    const choices = [];
    for (const el of raw) {
      // Prefer the interactive ancestor (the actual clickable option row).
      const clickable = el.closest('[role="radio"], button, [role="button"]') || el;
      if (seen.has(clickable)) continue;
      seen.add(clickable);

      // Skip options that are disabled or already show as selected/results.
      const ariaDisabled = clickable.getAttribute('aria-disabled') === 'true';
      const disabledAttr = clickable.hasAttribute('disabled');
      if (ariaDisabled || disabledAttr) continue;

      choices.push(clickable);
    }

    // If any choice shows a result percentage, the poll is voted/closed -> skip.
    const showsResults = /\d+(\.\d+)?%/.test(tweet.textContent || '');
    if (showsResults && choices.every(c => c.getAttribute('role') !== 'radio')) {
      return [];
    }
    // A genuine open poll has 2+ selectable options.
    return choices.length >= 2 ? choices : [];
  };

  const chooseIndex = (count) => {
    switch (CONFIG.strategy) {
      case 'first': return 0;
      case 'last': return count - 1;
      case 'random': return Math.floor(Math.random() * count);
      case 'index': return Math.min(Math.max(CONFIG.optionIndex, 0), count - 1);
      default: return 0;
    }
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    voted: 0,
    pollsSeen: 0,
    skippedClosedOrVoted: 0,
    errors: 0
  };

  const processed = new Set();

  // Stop switch: run window.stopVoteInPolls() to abort after the current poll.
  let stopped = false;
  window.stopVoteInPolls = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current poll, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🗳️  VOTE IN POLLS - XActions                            ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: needs a rendered feed. Warn, do not redirect.
  if (!/x\.com|twitter\.com/.test(window.location.href)) {
    log.warning('Open x.com on a timeline or search page, then run this again.');
    return;
  }
  if (document.querySelector(SELECTORS.tweet) === null) {
    log.warning('No posts visible yet. Go to a timeline or search results page, wait for it to load, then re-run.');
    return;
  }

  const validStrategies = ['first', 'last', 'random', 'index'];
  if (!validStrategies.includes(CONFIG.strategy)) {
    log.warning(`Unknown strategy "${CONFIG.strategy}". Falling back to 'first'.`);
    CONFIG.strategy = 'first';
  }

  log.info(`Strategy: ${CONFIG.strategy}${CONFIG.strategy === 'index' ? ` (option ${CONFIG.optionIndex})` : ''} | Max votes: ${CONFIG.maxVotes}`);
  log.info('To stop early: window.stopVoteInPolls()');

  let scrollAttempts = 0;
  let noNewPollsCount = 0;

  while (!stopped && stats.voted < CONFIG.maxVotes && scrollAttempts < CONFIG.maxScrollAttempts) {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewPoll = false;

    for (const tweet of tweets) {
      if (stopped || stats.voted >= CONFIG.maxVotes) break;

      const tweetId = getTweetId(tweet);
      if (processed.has(tweetId)) continue;

      // Only mark posts that actually contain a poll as processed, so we do not
      // burn the dedupe set on the majority of non-poll posts before they render.
      const rawHasChoice = tweet.querySelector(SELECTORS.pollChoice) !== null;
      if (!rawHasChoice) continue;

      processed.add(tweetId);
      stats.pollsSeen++;
      foundNewPoll = true;

      try {
        const choices = getOpenPollChoices(tweet);
        if (choices.length === 0) {
          stats.skippedClosedOrVoted++;
          continue;
        }

        const idx = chooseIndex(choices.length);
        const target = choices[idx];
        const label = (target.textContent || '').substring(0, 40).replace(/\n/g, ' ').trim() || `option ${idx + 1}`;

        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        target.click();
        await sleep(700);

        // Verify the vote registered: the poll should now show results.
        const registered = /\d+(\.\d+)?%/.test(tweet.textContent || '') ||
                           tweet.querySelector(SELECTORS.pollChoice) === null ||
                           getOpenPollChoices(tweet).length === 0;
        if (registered) {
          stats.voted++;
          log.success(`Voted #${stats.voted}: "${label}" (${CONFIG.strategy})`);
          log.progress(stats.voted, CONFIG.maxVotes);
          await randomDelay();
        } else {
          log.warning('Click did not register a vote (poll may have closed). Skipping.');
          stats.skippedClosedOrVoted++;
        }
      } catch (error) {
        log.error(`Error voting in poll: ${error.message}`);
        stats.errors++;
      }
    }

    if (!foundNewPoll) {
      noNewPollsCount++;
      if (noNewPollsCount >= CONFIG.noNewPollsThreshold) {
        log.warning('No new polls found after multiple scrolls. Stopping.');
        break;
      }
    } else {
      noNewPollsCount = 0;
    }

    scrollDown();
    scrollAttempts++;
    log.info(`Scrolling for more polls... (attempt ${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
    await sleep(1500);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 VOTE IN POLLS - COMPLETE                             ║
╠══════════════════════════════════════════════════════════╣
║  🗳️  Voted:                ${String(stats.voted).padEnd(28)}║
║  🔎 Polls Seen:            ${String(stats.pollsSeen).padEnd(28)}║
║  ⏭️  Closed/Already Voted: ${String(stats.skippedClosedOrVoted).padEnd(28)}║
║  ❌ Errors:                ${String(stats.errors).padEnd(28)}║
║  📜 Scroll Attempts:       ${String(scrollAttempts).padEnd(28)}║
╚══════════════════════════════════════════════════════════╝
  `);

  if (stats.pollsSeen === 0) {
    log.warning('No polls found in this feed. Try a search like x.com/search?q=poll&f=live.');
  }
  log.success('Script completed! by nichxbt');

  return stats;
})();
