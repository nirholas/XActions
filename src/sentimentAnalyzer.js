/**
 * ============================================================
 * 🧠 Tweet Sentiment Analyzer — Production Grade
 * ============================================================
 *
 * @name        sentimentAnalyzer.js
 * @description Analyze the sentiment of your recent tweets,
 *              mentions, or any visible timeline. Categorizes
 *              posts as positive/negative/neutral using a
 *              battle-tested lexicon-based approach. Shows trends,
 *              toxicity flags, and emotional distribution.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to any timeline, profile, or search results on x.com
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 * 4. Auto-scrolls and analyzes visible tweets
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxTweets: 100,                   // Max tweets to analyze
    scrollRounds: 5,                  // Number of scroll rounds to collect
    scrollDelay: 2000,
    exportResults: true,
  };

  // ── Sentiment Lexicon ──────────────────────────────────────
  // Carefully curated with intensity weights
  const POSITIVE = {
    // Strong positive (3)
    'amazing': 3, 'incredible': 3, 'fantastic': 3, 'brilliant': 3, 'outstanding': 3,
    'excellent': 3, 'wonderful': 3, 'phenomenal': 3, 'exceptionally': 3, 'masterpiece': 3,
    'extraordinary': 3, 'spectacular': 3, 'magnificent': 3, 'revolutionary': 3, 'legendary': 3,
    // Medium positive (2)
    'great': 2, 'awesome': 2, 'love': 2, 'perfect': 2, 'beautiful': 2, 'impressive': 2,
    'thrilled': 2, 'excited': 2, 'grateful': 2, 'blessed': 2, 'proud': 2, 'inspired': 2,
    'delighted': 2, 'superb': 2, 'remarkable': 2, 'succeed': 2, 'winning': 2, 'victory': 2,
    // Light positive (1)
    'good': 1, 'nice': 1, 'happy': 1, 'like': 1, 'thanks': 1, 'thank': 1, 'helpful': 1,
    'interesting': 1, 'cool': 1, 'agree': 1, 'support': 1, 'hope': 1, 'enjoy': 1,
    'fun': 1, 'smart': 1, 'useful': 1, 'solid': 1, 'strong': 1, 'clean': 1, 'better': 1,
    'congrats': 1, 'well': 1, 'glad': 1, 'fair': 1, 'kind': 1, 'sweet': 1, 'gain': 1,
  };

  const NEGATIVE = {
    // Strong negative (3)
    'terrible': 3, 'horrible': 3, 'disgusting': 3, 'pathetic': 3, 'disastrous': 3,
    'catastrophic': 3, 'abysmal': 3, 'hate': 3, 'despise': 3, 'devastating': 3,
    'outrageous': 3, 'infuriating': 3, 'atrocious': 3, 'repulsive': 3, 'unforgivable': 3,
    // Medium negative (2)
    'bad': 2, 'awful': 2, 'worst': 2, 'angry': 2, 'furious': 2, 'disappointed': 2,
    'frustrated': 2, 'annoying': 2, 'stupid': 2, 'trash': 2, 'garbage': 2, 'broken': 2,
    'scam': 2, 'fraud': 2, 'toxic': 2, 'ridiculous': 2, 'dumb': 2, 'ruined': 2,
    'failed': 2, 'crash': 2, 'ugly': 2, 'waste': 2, 'useless': 2, 'liar': 2,
    // Light negative (1)
    'sad': 1, 'boring': 1, 'wrong': 1, 'slow': 1, 'confusing': 1, 'worried': 1,
    'difficult': 1, 'problem': 1, 'issue': 1, 'miss': 1, 'lost': 1, 'hard': 1,
    'doubt': 1, 'concern': 1, 'risk': 1, 'fear': 1, 'weak': 1, 'lack': 1, 'worse': 1,
  };

  const NEGATORS = new Set(['not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing', 'hardly', 'barely', 'rarely']);
  const INTENSIFIERS = { 'very': 1.5, 'really': 1.5, 'extremely': 2, 'absolutely': 2, 'super': 1.5, 'so': 1.3, 'totally': 1.5, 'incredibly': 2 };

  // ── Emoji sentiment
  const EMOJI_POS = /[😀😃😄😁😆😂🤣😊😇🥰😍🤩😘😗😙😚😋😛😜🤪😝🤑🤗🤭🥳🎉🎊💪🔥✨💯👏❤️💕💖💗💝💘🙏👍👌✅🏆🥇🎯💎🚀⭐🌟]/;
  const EMOJI_NEG = /[😢😭😤😡🤬😠😞😔😟😣😩😫😰😱🤮💀☠️👎❌🚫💩😒😑😐🙄]/;

  // ── Analyze single tweet ──────────────────────────────────
  const analyzeTweet = (text) => {
    const words = text.toLowerCase().replace(/[^\w\s'@#]/g, ' ').split(/\s+/).filter(Boolean);
    let score = 0;
    let posWords = [], negWords = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = i > 0 ? words[i - 1] : '';
      const negated = NEGATORS.has(prevWord) || (prevWord.endsWith("n't"));
      const intensifier = INTENSIFIERS[prevWord] || 1;

      if (POSITIVE[word]) {
        const val = POSITIVE[word] * intensifier * (negated ? -0.5 : 1);
        score += val;
        if (!negated) posWords.push(word);
      }
      if (NEGATIVE[word]) {
        const val = NEGATIVE[word] * intensifier * (negated ? -0.5 : 1);
        score -= val;
        if (!negated) negWords.push(word);
      }
    }

    // Emoji bonus
    const emojiPosMatches = text.match(new RegExp(EMOJI_POS.source, 'g'));
    const emojiNegMatches = text.match(new RegExp(EMOJI_NEG.source, 'g'));
    if (emojiPosMatches) score += emojiPosMatches.length * 0.5;
    if (emojiNegMatches) score -= emojiNegMatches.length * 0.5;

    // ALL CAPS penalty (shouting)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
    if (capsRatio > 0.5 && text.length > 10) score *= 1.3; // Amplifies existing emotion

    // Normalize to -1 to 1 range
    const normalized = Math.max(-1, Math.min(1, score / Math.max(words.length * 0.3, 1)));

    let label = 'neutral';
    if (normalized > 0.15) label = 'positive';
    else if (normalized < -0.15) label = 'negative';

    return {
      score: Math.round(normalized * 100) / 100,
      label,
      positiveWords: [...new Set(posWords)],
      negativeWords: [...new Set(negWords)],
    };
  };

  // ── Collect tweets from page ──────────────────────────────
  const collectTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const tweets = [];
    const seen = new Set();

    for (const article of articles) {
      const textEl = article.querySelector('[data-testid="tweetText"]');
      if (!textEl) continue;
      const text = textEl.textContent.trim();
      if (text.length < 5 || seen.has(text)) continue;
      seen.add(text);

      const authorLink = article.querySelector('a[href^="/"][role="link"]');
      const author = authorLink ? (authorLink.getAttribute('href') || '').replace('/', '') : 'unknown';

      tweets.push({ text, author });
    }
    return tweets;
  };

  // ── Main ──────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🧠 TWEET SENTIMENT ANALYZER' + ' '.repeat(W - 31) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`\n📊 Collecting up to ${CONFIG.maxTweets} tweets (${CONFIG.scrollRounds} scroll rounds)...\n`);

    const allTweets = new Map();

    for (let round = 0; round < CONFIG.scrollRounds && allTweets.size < CONFIG.maxTweets; round++) {
      const found = collectTweets();
      for (const t of found) {
        if (allTweets.size >= CONFIG.maxTweets) break;
        if (!allTweets.has(t.text)) allTweets.set(t.text, t);
      }
      console.log(`   📜 Round ${round + 1}: ${allTweets.size} tweets collected`);
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
    }

    if (allTweets.size === 0) {
      console.error('❌ No tweets found on this page!');
      return;
    }

    // Analyze all tweets
    const results = [];
    let positive = 0, negative = 0, neutral = 0;
    let totalScore = 0;

    for (const [text, tweet] of allTweets) {
      const sentiment = analyzeTweet(text);
      results.push({ ...tweet, ...sentiment });
      totalScore += sentiment.score;
      if (sentiment.label === 'positive') positive++;
      else if (sentiment.label === 'negative') negative++;
      else neutral++;
    }

    // ── Results ─────────────────────────────────────────────
    const total = results.length;
    const avgScore = (totalScore / total).toFixed(3);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 SENTIMENT ANALYSIS RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n  Tweets analyzed: ${total}`);
    console.log(`  Average score:   ${avgScore} (${avgScore > 0.1 ? '😊 Positive' : avgScore < -0.1 ? '😠 Negative' : '😐 Neutral'})`);

    // Distribution bar
    const barWidth = 40;
    const posBar = Math.round((positive / total) * barWidth);
    const negBar = Math.round((negative / total) * barWidth);
    const neuBar = barWidth - posBar - negBar;

    console.log(`\n  Distribution:`);
    console.log(`  😊 Positive: ${String(positive).padStart(3)} (${((positive / total) * 100).toFixed(1)}%) ${'█'.repeat(posBar)}`);
    console.log(`  😐 Neutral:  ${String(neutral).padStart(3)} (${((neutral / total) * 100).toFixed(1)}%) ${'░'.repeat(neuBar)}`);
    console.log(`  😠 Negative: ${String(negative).padStart(3)} (${((negative / total) * 100).toFixed(1)}%) ${'▓'.repeat(negBar)}`);

    // Top positive tweets
    const sorted = [...results].sort((a, b) => b.score - a.score);
    console.log('\n  🏆 Most Positive Tweets:');
    for (const t of sorted.slice(0, 3)) {
      console.log(`    [${t.score.toFixed(2)}] @${t.author}: "${t.text.slice(0, 100)}..."`);
    }

    console.log('\n  💀 Most Negative Tweets:');
    for (const t of sorted.slice(-3).reverse()) {
      console.log(`    [${t.score.toFixed(2)}] @${t.author}: "${t.text.slice(0, 100)}..."`);
    }

    // Most common positive/negative words
    const wordFreq = {};
    for (const r of results) {
      for (const w of [...r.positiveWords, ...r.negativeWords]) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (topWords.length > 0) {
      console.log('\n  📝 Most Frequent Emotional Words:');
      for (const [word, count] of topWords) {
        const type = POSITIVE[word] ? '😊' : '😠';
        console.log(`    ${type} "${word}" — ${count}x`);
      }
    }

    // Toxicity warning
    const toxicCount = results.filter(r => r.score < -0.5).length;
    if (toxicCount > total * 0.2) {
      console.log(`\n  ⚠️ HIGH TOXICITY WARNING: ${((toxicCount / total) * 100).toFixed(0)}% of tweets are strongly negative`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults) {
      const data = {
        summary: { total, positive, negative, neutral, avgScore: parseFloat(avgScore), toxicCount },
        tweets: results,
        analyzedAt: new Date().toISOString(),
        page: window.location.href,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-sentiment-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Full results exported as JSON.');
    }
  };

  run();
})();
