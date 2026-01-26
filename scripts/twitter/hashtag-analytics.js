/**
 * ============================================================
 * #️⃣ Hashtag Analytics
 * ============================================================
 * 
 * @name        hashtag-analytics.js
 * @description Track hashtag performance on your posts
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your profile: https://x.com/YOUR_USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Analyzes which hashtags drive the most engagement
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Number of posts to analyze
  maxPosts: 100,
  
  // Delay between scrolls (ms)
  scrollDelay: 1500,
  
  // Maximum scroll attempts
  maxScrolls: 50,
  
  // Retry when no new posts found
  maxRetries: 3
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function hashtagAnalytics() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  #️⃣ XActions — Hashtag Analytics                             ║
║  Track which hashtags drive the most engagement              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const username = window.location.pathname.match(/^\/([^\/]+)/)?.[1];
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  console.log(`📊 Analyzing hashtags for @${username}\n`);
  console.log('🔄 Scrolling to collect posts...\n');

  const posts = new Map();
  let retries = 0;
  let scrollCount = 0;

  while (posts.size < CONFIG.maxPosts && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = posts.size;
    
    document.querySelectorAll($tweet).forEach(tweet => {
      const timeLink = tweet.querySelector('a[href*="/status/"] time')?.closest('a');
      const tweetUrl = timeLink?.getAttribute('href') || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
      
      if (!tweetId || posts.has(tweetId)) return;

      const textEl = tweet.querySelector($tweetText);
      const text = textEl?.textContent || '';

      // Extract hashtags
      const hashtags = (text.match(/#\w+/g) || []).map(h => h.toLowerCase());

      const likeBtn = tweet.querySelector($like);
      const retweetBtn = tweet.querySelector($retweet);
      const replyBtn = tweet.querySelector($reply);

      const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const retweets = parseCount(retweetBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');

      posts.set(tweetId, {
        id: tweetId,
        text,
        hashtags,
        likes,
        retweets,
        replies,
        engagement: likes + retweets + replies,
        url: `https://x.com${tweetUrl}`
      });
    });

    if (posts.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${posts.size} posts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  const postsArray = Array.from(posts.values());
  
  if (postsArray.length === 0) {
    console.error('❌ No posts found.');
    return;
  }

  // Analyze hashtags
  const hashtagStats = {};
  let postsWithHashtags = 0;
  let postsWithoutHashtags = 0;

  postsArray.forEach(p => {
    if (p.hashtags.length > 0) {
      postsWithHashtags++;
      p.hashtags.forEach(tag => {
        if (!hashtagStats[tag]) {
          hashtagStats[tag] = {
            tag,
            count: 0,
            totalEngagement: 0,
            posts: []
          };
        }
        hashtagStats[tag].count++;
        hashtagStats[tag].totalEngagement += p.engagement;
        hashtagStats[tag].posts.push(p);
      });
    } else {
      postsWithoutHashtags++;
    }
  });

  // Calculate averages
  Object.values(hashtagStats).forEach(stat => {
    stat.avgEngagement = stat.totalEngagement / stat.count;
  });

  // Sort by different criteria
  const byCount = Object.values(hashtagStats).sort((a, b) => b.count - a.count);
  const byEngagement = Object.values(hashtagStats).filter(h => h.count >= 2).sort((a, b) => b.avgEngagement - a.avgEngagement);
  const byTotal = Object.values(hashtagStats).sort((a, b) => b.totalEngagement - a.totalEngagement);

  const formatNum = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  console.log(`\n✅ Analyzed ${postsArray.length} posts\n`);
  console.log('═'.repeat(60));
  console.log('#️⃣ HASHTAG ANALYTICS');
  console.log('═'.repeat(60));

  console.log('\n📊 OVERVIEW:');
  console.log('─'.repeat(50));
  console.log(`   Total posts analyzed: ${postsArray.length}`);
  console.log(`   Posts with hashtags: ${postsWithHashtags} (${((postsWithHashtags/postsArray.length)*100).toFixed(0)}%)`);
  console.log(`   Posts without hashtags: ${postsWithoutHashtags}`);
  console.log(`   Unique hashtags used: ${Object.keys(hashtagStats).length}`);

  // Compare with/without hashtags
  const withHashtagsAvg = postsArray.filter(p => p.hashtags.length > 0);
  const withoutHashtagsAvg = postsArray.filter(p => p.hashtags.length === 0);
  
  const avgWithHashtags = withHashtagsAvg.length > 0 
    ? withHashtagsAvg.reduce((s, p) => s + p.engagement, 0) / withHashtagsAvg.length 
    : 0;
  const avgWithoutHashtags = withoutHashtagsAvg.length > 0 
    ? withoutHashtagsAvg.reduce((s, p) => s + p.engagement, 0) / withoutHashtagsAvg.length 
    : 0;

  console.log('\n📈 HASHTAG IMPACT:');
  console.log('─'.repeat(50));
  console.log(`   Avg engagement WITH hashtags:    ${formatNum(avgWithHashtags)}`);
  console.log(`   Avg engagement WITHOUT hashtags: ${formatNum(avgWithoutHashtags)}`);
  
  if (avgWithHashtags > avgWithoutHashtags) {
    const improvement = ((avgWithHashtags - avgWithoutHashtags) / avgWithoutHashtags * 100).toFixed(0);
    console.log(`   📈 Hashtags improve engagement by ${improvement}%`);
  } else if (avgWithoutHashtags > avgWithHashtags) {
    const decrease = ((avgWithoutHashtags - avgWithHashtags) / avgWithoutHashtags * 100).toFixed(0);
    console.log(`   📉 Posts without hashtags perform ${decrease}% better`);
  }

  if (byCount.length > 0) {
    console.log('\n🔢 MOST USED HASHTAGS:');
    console.log('─'.repeat(50));
    byCount.slice(0, 10).forEach((h, i) => {
      const bar = '█'.repeat(Math.min(20, Math.round(h.count / byCount[0].count * 20)));
      console.log(`   ${(i + 1).toString().padStart(2)}. ${h.tag.padEnd(20)} ${bar} ${h.count}x`);
    });
  }

  if (byEngagement.length > 0) {
    console.log('\n🏆 HIGHEST PERFORMING HASHTAGS (min 2 uses):');
    console.log('─'.repeat(50));
    byEngagement.slice(0, 10).forEach((h, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`   ${medal} ${h.tag.padEnd(20)} ${formatNum(h.avgEngagement)} avg (${h.count} posts)`);
    });
  }

  if (byTotal.length > 0) {
    console.log('\n💰 HASHTAGS BY TOTAL ENGAGEMENT:');
    console.log('─'.repeat(50));
    byTotal.slice(0, 10).forEach((h, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${h.tag.padEnd(20)} ${formatNum(h.totalEngagement)} total`);
    });
  }

  // Hashtag combinations
  console.log('\n🔗 HASHTAG COMBINATIONS:');
  console.log('─'.repeat(50));
  
  const combos = {};
  postsArray.filter(p => p.hashtags.length >= 2).forEach(p => {
    const sorted = [...p.hashtags].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]} + ${sorted[j]}`;
        if (!combos[key]) combos[key] = { count: 0, totalEngagement: 0 };
        combos[key].count++;
        combos[key].totalEngagement += p.engagement;
      }
    }
  });

  const topCombos = Object.entries(combos)
    .filter(([_, data]) => data.count >= 2)
    .map(([combo, data]) => ({ combo, ...data, avg: data.totalEngagement / data.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  if (topCombos.length > 0) {
    topCombos.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.combo} — ${formatNum(c.avg)} avg (${c.count}x)`);
    });
  } else {
    console.log('   Not enough data on hashtag combinations.');
  }

  // Recommendations
  console.log('\n' + '═'.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('═'.repeat(60));

  if (byEngagement.length > 0) {
    console.log(`\n✅ Best performing hashtags to keep using:`);
    byEngagement.slice(0, 5).forEach(h => {
      console.log(`   ${h.tag}`);
    });
  }

  const lowPerformers = Object.values(hashtagStats)
    .filter(h => h.count >= 3 && h.avgEngagement < avgWithHashtags * 0.5)
    .sort((a, b) => a.avgEngagement - b.avgEngagement);

  if (lowPerformers.length > 0) {
    console.log(`\n❌ Consider dropping these underperforming hashtags:`);
    lowPerformers.slice(0, 5).forEach(h => {
      console.log(`   ${h.tag} (${formatNum(h.avgEngagement)} avg vs ${formatNum(avgWithHashtags)} overall)`);
    });
  }

  // Save analysis
  const storageKey = `xactions_hashtags_${username}`;
  localStorage.setItem(storageKey, JSON.stringify({
    username,
    timestamp: new Date().toISOString(),
    postCount: postsArray.length,
    postsWithHashtags,
    uniqueHashtags: Object.keys(hashtagStats).length,
    avgWithHashtags,
    avgWithoutHashtags,
    topByEngagement: byEngagement.slice(0, 20).map(h => ({ tag: h.tag, count: h.count, avg: h.avgEngagement })),
    topByCount: byCount.slice(0, 20).map(h => ({ tag: h.tag, count: h.count }))
  }));

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Analysis saved! Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();
