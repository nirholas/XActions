// scripts/personaEngine.js
// Browser console script for analyzing your posting style and generating a persona profile
// Paste in DevTools console on x.com/YOUR_USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxPosts: 50,            // Max tweets to analyze
    scrollRounds: 8,         // Scroll rounds on profile
    scrollDelay: 2000,       // ms between scrolls
    exportResults: true,     // Auto-download JSON
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const run = async () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🎭 PERSONA ENGINE                             ║');
    console.log('║  by nichxbt — v1.0                            ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n🔍 Analyzing your posting style...\n');

    // Scrape tweets
    const tweets = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds && tweets.length < CONFIG.maxPosts; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      for (const article of articles) {
        if (tweets.length >= CONFIG.maxPosts) break;
        const textEl = article.querySelector('[data-testid="tweetText"]');
        if (!textEl) continue;
        const text = textEl.textContent.trim();
        if (text.length < 5 || seen.has(text.slice(0, 80))) continue;
        seen.add(text.slice(0, 80));

        const timeEl = article.querySelector('time');
        const datetime = timeEl ? timeEl.getAttribute('datetime') : null;
        const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
        const likes = parseInt((likeBtn?.textContent || '0').replace(/[,\s]/g, '')) || 0;
        const hasMedia = !!(article.querySelector('[data-testid="tweetPhoto"]') || article.querySelector('video'));

        tweets.push({ text, datetime, likes, hasMedia, charCount: text.length, wordCount: text.split(/\s+/).length });
      }
      console.log(`   📜 Round ${round + 1}: ${tweets.length} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (tweets.length < 5) { console.error('❌ Need at least 5 tweets.'); return; }
    console.log(`\n✅ Analyzed ${tweets.length} tweets\n`);

    // ── Tone Analysis ──────────────────────────────────────
    const allText = tweets.map(t => t.text).join(' ').toLowerCase();
    const allWords = allText.split(/\s+/);
    const wordFreq = {};
    allWords.forEach(w => { if (w.length > 3) wordFreq[w] = (wordFreq[w] || 0) + 1; });
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 20);

    // Emoji usage
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const allEmojis = allText.match(emojiRegex) || [];
    const emojiFreq = {};
    allEmojis.forEach(e => { emojiFreq[e] = (emojiFreq[e] || 0) + 1; });
    const topEmojis = Object.entries(emojiFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Hashtag usage
    const hashtags = allText.match(/#\w+/g) || [];
    const hashFreq = {};
    hashtags.forEach(h => { hashFreq[h] = (hashFreq[h] || 0) + 1; });
    const topHashtags = Object.entries(hashFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Question / exclamation ratio
    const questions = tweets.filter(t => t.text.includes('?')).length;
    const exclamations = tweets.filter(t => t.text.includes('!')).length;

    // Posting times
    const hourCounts = {};
    const dayCounts = {};
    tweets.forEach(t => {
      if (!t.datetime) return;
      const d = new Date(t.datetime);
      const h = d.getHours();
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      hourCounts[h] = (hourCounts[h] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    // Avg length
    const avgChars = Math.round(tweets.reduce((s, t) => s + t.charCount, 0) / tweets.length);
    const avgWords = Math.round(tweets.reduce((s, t) => s + t.wordCount, 0) / tweets.length);
    const mediaRate = ((tweets.filter(t => t.hasMedia).length / tweets.length) * 100).toFixed(0);

    // Tone classification
    const casual = ['lol', 'lmao', 'ngl', 'tbh', 'bruh', 'fr', 'imo'].filter(w => allText.includes(w)).length;
    const formal = ['however', 'furthermore', 'therefore', 'consequently', 'regarding'].filter(w => allText.includes(w)).length;
    const tone = casual > formal ? 'Casual / Conversational' : formal > casual ? 'Formal / Professional' : 'Balanced';

    // Topic detection
    const TOPICS = {
      'Tech/AI': ['ai', 'gpt', 'llm', 'coding', 'dev', 'software', 'code', 'api', 'build', 'ship'],
      'Crypto/Web3': ['crypto', 'bitcoin', 'eth', 'defi', 'web3', 'blockchain', 'token', 'nft'],
      'Business': ['startup', 'saas', 'revenue', 'growth', 'marketing', 'founder', 'launch'],
      'Personal': ['life', 'today', 'feel', 'think', 'love', 'happy', 'morning'],
    };
    const topicScores = {};
    for (const [topic, kws] of Object.entries(TOPICS)) {
      topicScores[topic] = kws.reduce((s, kw) => s + (wordFreq[kw] || 0), 0);
    }
    const detectedTopics = Object.entries(topicScores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

    // ── Display Persona ────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🎭 PERSONA PROFILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  📝 Tone:         ${tone}`);
    console.log(`  📏 Avg length:   ${avgChars} chars / ${avgWords} words`);
    console.log(`  ❓ Questions:    ${questions}/${tweets.length} tweets (${((questions / tweets.length) * 100).toFixed(0)}%)`);
    console.log(`  ❗ Exclamations: ${exclamations}/${tweets.length} tweets`);
    console.log(`  📸 Media rate:   ${mediaRate}%`);

    if (detectedTopics.length > 0) {
      console.log(`\n  🏷️ TOPICS: ${detectedTopics.map(([t, s]) => `${t} (${s})`).join(', ')}`);
    }

    console.log(`\n  📊 TOP WORDS: ${topWords.slice(0, 10).map(([w, c]) => `${w}(${c})`).join(', ')}`);

    if (topEmojis.length > 0) {
      console.log(`  😎 TOP EMOJIS: ${topEmojis.slice(0, 8).map(([e, c]) => `${e}(${c})`).join(' ')}`);
    }
    if (topHashtags.length > 0) {
      console.log(`  # TOP HASHTAGS: ${topHashtags.slice(0, 5).map(([h, c]) => `${h}(${c})`).join(', ')}`);
    }

    if (peakHour) console.log(`\n  ⏰ Peak hour: ${peakHour[0]}:00 (${peakHour[1]} tweets)`);
    if (peakDay) console.log(`  📅 Peak day:  ${peakDay[0]} (${peakDay[1]} tweets)`);

    // Engagement style
    const avgLikes = (tweets.reduce((s, t) => s + t.likes, 0) / tweets.length).toFixed(1);
    const topTweet = [...tweets].sort((a, b) => b.likes - a.likes)[0];
    console.log(`\n  ❤️ Avg likes:    ${avgLikes}`);
    if (topTweet) console.log(`  🔥 Best tweet:   ${topTweet.likes} likes — "${topTweet.text.slice(0, 60)}..."`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults) {
      download({
        persona: { tone, avgChars, avgWords, mediaRate: parseFloat(mediaRate), questionRate: questions / tweets.length },
        topics: detectedTopics,
        topWords: topWords.slice(0, 20),
        topEmojis: topEmojis.slice(0, 10),
        topHashtags: topHashtags.slice(0, 10),
        posting: { peakHour: peakHour?.[0], peakDay: peakDay?.[0], hourDistribution: hourCounts },
        engagement: { avgLikes: parseFloat(avgLikes), topTweet: topTweet?.text?.slice(0, 200) },
        tweetsAnalyzed: tweets.length,
        analyzedAt: new Date().toISOString(),
      }, `xactions-persona-${Date.now()}.json`);
    }
  };

  run();
})();
