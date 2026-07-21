// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🧠 Sentiment Analyzer - XActions
 * ============================================
 *
 * @name         sentiment-analyzer
 * @description  Score the sentiment of posts on the current timeline, search, or profile using an inline lexicon (no external API).
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to any timeline, search results, or profile on x.com
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) set CONFIG.maxPosts
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Search "your product name" on x.com, run with maxPosts: 60, and the
 *   script prints a positive/negative/neutral breakdown plus the most
 *   positive and most negative example posts, then downloads a JSON report.
 *   Scoring is a simple word lexicon, so sarcasm and slang are not detected.
 *   To stop the scroll early: window.stopSentimentAnalyzer()
 *
 * ============================================
 */

(async function sentimentAnalyzer() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of posts to score.
    maxPosts: 40,

    // Max scroll attempts before giving up on loading more posts.
    maxScrollAttempts: 25,

    // Delay between scrolls (ms).
    scrollDelay: 1600,

    // How many example posts to show for most-positive / most-negative.
    examples: 3,

    // Auto-download a JSON report when finished.
    exportResults: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    authorLink: 'a[href^="/"][role="link"]'
  };

  // ============================================
  // 📚 SENTIMENT LEXICON (inline, no external API)
  // ============================================
  const POSITIVE = {
    amazing: 3, incredible: 3, fantastic: 3, brilliant: 3, outstanding: 3,
    excellent: 3, wonderful: 3, phenomenal: 3, revolutionary: 3, legendary: 3,
    great: 2, awesome: 2, love: 2, perfect: 2, beautiful: 2, impressive: 2,
    thrilled: 2, excited: 2, grateful: 2, blessed: 2, proud: 2, inspired: 2,
    superb: 2, remarkable: 2, winning: 2, victory: 2, bullish: 2,
    good: 1, nice: 1, happy: 1, like: 1, thanks: 1, helpful: 1,
    interesting: 1, cool: 1, agree: 1, support: 1, hope: 1, enjoy: 1,
    fun: 1, smart: 1, useful: 1, solid: 1, better: 1, congrats: 1
  };

  const NEGATIVE = {
    terrible: 3, horrible: 3, disgusting: 3, pathetic: 3, disastrous: 3,
    hate: 3, despise: 3, devastating: 3, atrocious: 3, unforgivable: 3,
    bad: 2, awful: 2, worst: 2, angry: 2, furious: 2, disappointed: 2,
    frustrated: 2, annoying: 2, stupid: 2, trash: 2, garbage: 2, broken: 2,
    scam: 2, toxic: 2, ridiculous: 2, ruined: 2, useless: 2, failed: 2, bearish: 2,
    sad: 1, boring: 1, wrong: 1, slow: 1, confusing: 1, worried: 1,
    problem: 1, issue: 1, lost: 1, doubt: 1, fear: 1, weak: 1, worse: 1
  };

  const NEGATORS = new Set(['not', "n't", 'no', 'never', 'hardly', 'barely']);

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  const download = (data, filename) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log.success(`Report downloaded: ${filename}`);
    } catch (e) {
      log.error(`Could not download report: ${e.message}`);
    }
  };

  // Score one post. Handles simple negation ("not good" flips the sign).
  const analyze = (text) => {
    const words = text.toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/).filter(Boolean);
    let score = 0;
    const posWords = [];
    const negWords = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prev = i > 0 ? words[i - 1] : '';
      const negated = NEGATORS.has(prev) || prev.endsWith("n't");

      if (POSITIVE[word] !== undefined) {
        score += POSITIVE[word] * (negated ? -0.5 : 1);
        if (!negated) posWords.push(word);
      }
      if (NEGATIVE[word] !== undefined) {
        score -= NEGATIVE[word] * (negated ? -0.5 : 1);
        if (!negated) negWords.push(word);
      }
    }

    const normalized = Math.max(-1, Math.min(1, score / Math.max(words.length * 0.3, 1)));
    const rounded = Math.round(normalized * 100) / 100;
    const label = rounded > 0.15 ? 'positive' : rounded < -0.15 ? 'negative' : 'neutral';
    return { score: rounded, label, positiveWords: [...new Set(posWords)], negativeWords: [...new Set(negWords)] };
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🧠 SENTIMENT ANALYZER - XActions                       ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  if (!/(^|\.)x\.com$/.test(location.hostname) && !/(^|\.)twitter\.com$/.test(location.hostname)) {
    log.warning('Not on x.com. Open a timeline, search, or profile and run again.');
    return;
  }

  log.info(`Scoring up to ${CONFIG.maxPosts} posts on this page`);
  log.warning('Lexicon-based scoring. It cannot detect sarcasm, slang, or context.');
  log.info('To stop early: window.stopSentimentAnalyzer()');
  console.log('');

  let stopped = false;
  window.stopSentimentAnalyzer = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then reporting.');
  };

  const collected = new Map();
  let scrollAttempts = 0;
  let stalls = 0;

  const collect = () => {
    document.querySelectorAll(SELECTORS.tweet).forEach((article) => {
      const textEl = article.querySelector(SELECTORS.tweetText);
      if (!textEl) return;
      const text = textEl.textContent.trim();
      if (text.length < 5 || collected.has(text)) return;
      const authorLink = article.querySelector(SELECTORS.authorLink);
      const author = authorLink
        ? (authorLink.getAttribute('href') || '').replace(/^\//, '').split('/')[0]
        : 'unknown';
      collected.set(text, { text, author });
    });
  };

  while (!stopped && collected.size < CONFIG.maxPosts && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = collected.size;
    collect();
    if (collected.size > before) {
      log.info(`Collected ${collected.size}/${CONFIG.maxPosts} posts`);
      stalls = 0;
    } else {
      stalls++;
      if (stalls >= 5) {
        log.warning('No new posts after several scrolls. Reached the end of what loaded.');
        break;
      }
    }
    if (collected.size >= CONFIG.maxPosts) break;
    window.scrollTo(0, document.body.scrollHeight);
    scrollAttempts++;
    await sleep(CONFIG.scrollDelay);
  }
  collect();

  if (collected.size === 0) {
    log.error('No posts found on this page. Scroll to some posts and run again.');
    return;
  }

  const results = [];
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  let totalScore = 0;
  const wordFreq = {};

  for (const tweet of collected.values()) {
    if (results.length >= CONFIG.maxPosts) break;
    const sentiment = analyze(tweet.text);
    results.push({ ...tweet, ...sentiment });
    totalScore += sentiment.score;
    if (sentiment.label === 'positive') positive++;
    else if (sentiment.label === 'negative') negative++;
    else neutral++;
    [...sentiment.positiveWords, ...sentiment.negativeWords].forEach((w) => {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
  }

  const total = results.length;
  const avgScore = Math.round((totalScore / total) * 1000) / 1000;
  const mood = avgScore > 0.1 ? '😊 Positive' : avgScore < -0.1 ? '😠 Negative' : '😐 Neutral';

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const barW = 40;
  const posBar = Math.round((positive / total) * barW);
  const negBar = Math.round((negative / total) * barW);
  const neuBar = Math.max(0, barW - posBar - negBar);
  const pct = (n) => ((n / total) * 100).toFixed(1) + '%';

  console.log('');
  console.log('━'.repeat(60));
  console.log(`🧠 SENTIMENT REPORT (${total} posts) at ${window.location.pathname}`);
  console.log('━'.repeat(60));
  console.log(`   Average score: ${avgScore}  (${mood})`);
  console.log('');
  console.log(`   😊 Positive: ${String(positive).padStart(3)} (${pct(positive).padStart(6)}) ${'█'.repeat(posBar)}`);
  console.log(`   😐 Neutral:  ${String(neutral).padStart(3)} (${pct(neutral).padStart(6)}) ${'░'.repeat(neuBar)}`);
  console.log(`   😠 Negative: ${String(negative).padStart(3)} (${pct(negative).padStart(6)}) ${'▓'.repeat(negBar)}`);

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const topPos = sorted.filter((t) => t.label === 'positive').slice(0, CONFIG.examples);
  const topNeg = sorted.filter((t) => t.label === 'negative').slice(-CONFIG.examples).reverse();

  if (topPos.length > 0) {
    console.log('');
    console.log('🏆 Most positive:');
    topPos.forEach((t) => console.log(`   [${t.score.toFixed(2)}] @${t.author}: "${t.text.replace(/\s+/g, ' ').slice(0, 100)}"`));
  }
  if (topNeg.length > 0) {
    console.log('');
    console.log('💀 Most negative:');
    topNeg.forEach((t) => console.log(`   [${t.score.toFixed(2)}] @${t.author}: "${t.text.replace(/\s+/g, ' ').slice(0, 100)}"`));
  }

  const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topWords.length > 0) {
    console.log('');
    console.log('📝 Top emotional words:');
    topWords.forEach(([word, count]) => {
      console.log(`   ${POSITIVE[word] !== undefined ? '😊' : '😠'} "${word}" x${count}`);
    });
  }

  const stronglyNegative = results.filter((t) => t.score < -0.5).length;
  if (stronglyNegative > total * 0.2) {
    console.log('');
    log.warning(`High negativity: ${((stronglyNegative / total) * 100).toFixed(0)}% of posts are strongly negative.`);
  }

  const report = {
    page: window.location.href,
    analyzedAt: new Date().toISOString(),
    summary: { total, positive, negative, neutral, avgScore, stronglyNegative },
    topWords,
    posts: results
  };

  if (CONFIG.exportResults) {
    console.log('');
    download(report, `xactions-sentiment-${new Date().toISOString().slice(0, 10)}.json`);
  }

  window.xactionsSentiment = report;
  console.log('');
  log.info('Full report object: window.xactionsSentiment');
  log.success('Done.');

  return report;
})();
