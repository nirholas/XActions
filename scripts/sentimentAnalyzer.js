// scripts/sentimentAnalyzer.js
// Browser console script for analyzing tweet sentiment using a basic lexicon
// Paste in DevTools console on x.com (any timeline or search)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxTweets: 30,
    scrollRounds: 3,
    scrollDelay: 1500,
    exportResults: true,
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Sentiment lexicon
  const POSITIVE = {
    'amazing': 3, 'incredible': 3, 'fantastic': 3, 'brilliant': 3, 'outstanding': 3,
    'excellent': 3, 'wonderful': 3, 'phenomenal': 3, 'revolutionary': 3, 'legendary': 3,
    'great': 2, 'awesome': 2, 'love': 2, 'perfect': 2, 'beautiful': 2, 'impressive': 2,
    'thrilled': 2, 'excited': 2, 'grateful': 2, 'blessed': 2, 'proud': 2, 'inspired': 2,
    'superb': 2, 'remarkable': 2, 'winning': 2, 'victory': 2,
    'good': 1, 'nice': 1, 'happy': 1, 'like': 1, 'thanks': 1, 'helpful': 1,
    'interesting': 1, 'cool': 1, 'agree': 1, 'support': 1, 'hope': 1, 'enjoy': 1,
    'fun': 1, 'smart': 1, 'useful': 1, 'solid': 1, 'better': 1, 'congrats': 1,
  };

  const NEGATIVE = {
    'terrible': 3, 'horrible': 3, 'disgusting': 3, 'pathetic': 3, 'disastrous': 3,
    'hate': 3, 'despise': 3, 'devastating': 3, 'atrocious': 3, 'unforgivable': 3,
    'bad': 2, 'awful': 2, 'worst': 2, 'angry': 2, 'furious': 2, 'disappointed': 2,
    'frustrated': 2, 'annoying': 2, 'stupid': 2, 'trash': 2, 'garbage': 2, 'broken': 2,
    'scam': 2, 'toxic': 2, 'ridiculous': 2, 'ruined': 2, 'useless': 2, 'failed': 2,
    'sad': 1, 'boring': 1, 'wrong': 1, 'slow': 1, 'confusing': 1, 'worried': 1,
    'problem': 1, 'issue': 1, 'lost': 1, 'doubt': 1, 'fear': 1, 'weak': 1, 'worse': 1,
  };

  const NEGATORS = new Set(['not', "n't", 'no', 'never', 'hardly', 'barely']);

  const analyzeTweet = (text) => {
    const words = text.toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/).filter(Boolean);
    let score = 0;
    const posWords = [], negWords = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prev = i > 0 ? words[i - 1] : '';
      const negated = NEGATORS.has(prev) || prev.endsWith("n't");

      if (POSITIVE[word]) {
        score += POSITIVE[word] * (negated ? -0.5 : 1);
        if (!negated) posWords.push(word);
      }
      if (NEGATIVE[word]) {
        score -= NEGATIVE[word] * (negated ? -0.5 : 1);
        if (!negated) negWords.push(word);
      }
    }

    const normalized = Math.max(-1, Math.min(1, score / Math.max(words.length * 0.3, 1)));
    const label = normalized > 0.15 ? 'positive' : normalized < -0.15 ? 'negative' : 'neutral';
    return { score: Math.round(normalized * 100) / 100, label, positiveWords: [...new Set(posWords)], negativeWords: [...new Set(negWords)] };
  };

  const collectTweets = () => {
    const tweets = [];
    const seen = new Set();
    document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
      const textEl = article.querySelector('[data-testid="tweetText"]');
      if (!textEl) return;
      const text = textEl.textContent.trim();
      if (text.length < 5 || seen.has(text)) return;
      seen.add(text);
      const authorLink = article.querySelector('a[href^="/"][role="link"]');
      const author = authorLink ? (authorLink.getAttribute('href') || '').replace('/', '').split('/')[0] : 'unknown';
      tweets.push({ text, author });
    });
    return tweets;
  };

  const run = async () => {
    console.log('🧠 SENTIMENT ANALYZER — by nichxbt\n');

    const allTweets = new Map();
    for (let round = 0; round < CONFIG.scrollRounds && allTweets.size < CONFIG.maxTweets; round++) {
      const found = collectTweets();
      for (const t of found) {
        if (allTweets.size >= CONFIG.maxTweets) break;
        if (!allTweets.has(t.text)) allTweets.set(t.text, t);
      }
      console.log(`   📜 Round ${round + 1}: ${allTweets.size} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (allTweets.size === 0) { console.error('❌ No tweets found!'); return; }

    const results = [];
    let positive = 0, negative = 0, neutral = 0, totalScore = 0;

    for (const [text, tweet] of allTweets) {
      const sentiment = analyzeTweet(text);
      results.push({ ...tweet, ...sentiment });
      totalScore += sentiment.score;
      if (sentiment.label === 'positive') positive++;
      else if (sentiment.label === 'negative') negative++;
      else neutral++;
    }

    const total = results.length;
    const avgScore = (totalScore / total).toFixed(3);

    console.log('\n📊 SENTIMENT RESULTS:');
    console.log(`  Tweets analyzed: ${total}`);
    console.log(`  Average score: ${avgScore} (${avgScore > 0.1 ? '😊 Positive' : avgScore < -0.1 ? '😠 Negative' : '😐 Neutral'})`);

    const barW = 40;
    const posBar = Math.round((positive / total) * barW);
    const negBar = Math.round((negative / total) * barW);

    console.log(`\n  😊 Positive: ${String(positive).padStart(3)} (${((positive / total) * 100).toFixed(1)}%) ${'█'.repeat(posBar)}`);
    console.log(`  😐 Neutral:  ${String(neutral).padStart(3)} (${((neutral / total) * 100).toFixed(1)}%) ${'░'.repeat(barW - posBar - negBar)}`);
    console.log(`  😠 Negative: ${String(negative).padStart(3)} (${((negative / total) * 100).toFixed(1)}%) ${'▓'.repeat(negBar)}`);

    const sorted = [...results].sort((a, b) => b.score - a.score);
    console.log('\n🏆 Most Positive:');
    sorted.slice(0, 3).forEach(t => console.log(`  [${t.score.toFixed(2)}] @${t.author}: "${t.text.slice(0, 100)}..."`));
    console.log('\n💀 Most Negative:');
    sorted.slice(-3).reverse().forEach(t => console.log(`  [${t.score.toFixed(2)}] @${t.author}: "${t.text.slice(0, 100)}..."`));

    // Word frequency
    const wordFreq = {};
    results.forEach(r => {
      [...r.positiveWords, ...r.negativeWords].forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    });
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (topWords.length > 0) {
      console.log('\n📝 Top Emotional Words:');
      topWords.forEach(([word, count]) => console.log(`  ${POSITIVE[word] ? '😊' : '😠'} "${word}" — ${count}x`));
    }

    const toxicCount = results.filter(r => r.score < -0.5).length;
    if (toxicCount > total * 0.2) console.log(`\n⚠️ HIGH TOXICITY: ${((toxicCount / total) * 100).toFixed(0)}% strongly negative`);

    if (CONFIG.exportResults) {
      download({
        summary: { total, positive, negative, neutral, avgScore: parseFloat(avgScore), toxicCount },
        tweets: results,
        analyzedAt: new Date().toISOString(),
        page: window.location.href,
      }, `xactions-sentiment-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('\n📥 Results exported as JSON.');
    }
  };

  run();
})();
