// scripts/algorithmBuilder.js
// Browser console script for training X's algorithm by engaging with niche content
// Paste in DevTools console on x.com/home or x.com/search
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    topics: ['AI', 'startups', 'web3'],  // Niches to train on
    scrollRounds: 6,           // Rounds per topic
    scrollDelay: 2000,         // ms between scrolls
    likeRatio: 0.5,            // Like 50% of relevant tweets
    followRatio: 0.2,          // Follow 20% of relevant users
    maxLikes: 30,              // Max likes per session
    maxFollows: 10,            // Max follows per session
    actionDelay: 2500,         // ms between actions
    dryRun: true,              // SET FALSE TO EXECUTE
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

  let totalLikes = 0;
  let totalFollows = 0;
  const engaged = [];

  const scrapeTweets = async () => {
    const tweets = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      for (const article of articles) {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        if (!textEl) continue;
        const text = textEl.textContent.trim();
        const fp = text.slice(0, 80);
        if (seen.has(fp)) continue;
        seen.add(fp);

        const likeBtn = article.querySelector('[data-testid="like"]');
        const isLiked = !!article.querySelector('[data-testid="unlike"]');
        const authorLink = article.querySelector('a[href^="/"][role="link"]');
        const authorMatch = authorLink ? (authorLink.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/) : null;
        const author = authorMatch ? authorMatch[1] : 'unknown';
        const followBtn = article.querySelector('[data-testid$="-follow"]');

        tweets.push({ text, author, likeBtn, isLiked, followBtn, article });
      }
      console.log(`   📜 Round ${round + 1}: ${tweets.length} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    return tweets;
  };

  const engageTopic = async (topic) => {
    console.log(`\n🔍 Searching: "${topic}"...`);
    window.location.href = `https://x.com/search?q=${encodeURIComponent(topic)}&src=typed_query&f=live`;
    await sleep(4000);

    const tweets = await scrapeTweets();
    console.log(`📊 Found ${tweets.length} tweets for "${topic}"`);

    for (const tweet of tweets) {
      if (totalLikes >= CONFIG.maxLikes && totalFollows >= CONFIG.maxFollows) break;

      // Like
      if (!tweet.isLiked && tweet.likeBtn && totalLikes < CONFIG.maxLikes && Math.random() < CONFIG.likeRatio) {
        if (CONFIG.dryRun) {
          console.log(`  🏃 [DRY] Would like @${tweet.author}: "${tweet.text.slice(0, 50)}..."`);
        } else {
          tweet.likeBtn.click();
          console.log(`  ❤️ Liked @${tweet.author}: "${tweet.text.slice(0, 50)}..."`);
        }
        totalLikes++;
        engaged.push({ action: 'like', author: tweet.author, topic, text: tweet.text.slice(0, 100) });
        await sleep(CONFIG.actionDelay);
      }

      // Follow
      if (tweet.followBtn && totalFollows < CONFIG.maxFollows && Math.random() < CONFIG.followRatio) {
        if (CONFIG.dryRun) {
          console.log(`  🏃 [DRY] Would follow @${tweet.author}`);
        } else {
          tweet.followBtn.click();
          console.log(`  ➕ Followed @${tweet.author}`);
        }
        totalFollows++;
        engaged.push({ action: 'follow', author: tweet.author, topic });
        await sleep(CONFIG.actionDelay);
      }
    }
  };

  const run = async () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🧠 ALGORITHM BUILDER                         ║');
    console.log('║  by nichxbt — v1.0                            ║');
    console.log('╚════════════════════════════════════════════════╝');
    if (CONFIG.dryRun) console.log('\n🏃 DRY RUN — no actions will be taken.');
    console.log(`📋 Topics: ${CONFIG.topics.join(', ')}`);
    console.log(`🎯 Limits: ${CONFIG.maxLikes} likes, ${CONFIG.maxFollows} follows\n`);

    for (const topic of CONFIG.topics) {
      if (totalLikes >= CONFIG.maxLikes && totalFollows >= CONFIG.maxFollows) break;
      await engageTopic(topic);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 SESSION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ❤️ Likes:   ${totalLikes}`);
    console.log(`  ➕ Follows: ${totalFollows}`);
    console.log(`  📝 Topics:  ${CONFIG.topics.length}`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing executed)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (engaged.length > 0) {
      download({
        topics: CONFIG.topics,
        totalLikes,
        totalFollows,
        engaged,
        dryRun: CONFIG.dryRun,
        timestamp: new Date().toISOString(),
      }, `xactions-algorithm-builder-${Date.now()}.json`);
    }
  };

  run();
})();
