// scripts/businessAnalytics.js
// Browser console script for X/Twitter business analytics and brand monitoring
// Paste in DevTools console on x.com or business.x.com
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURE BRAND MONITORING
  // =============================================
  const CONFIG = {
    brand: '',          // e.g., 'XActions' or '@nichxbt' — empty scrapes current page
    maxMentions: 50,
    includeSentiment: true,
  };
  // =============================================

  const positiveWords = ['love', 'great', 'amazing', 'awesome', 'excellent', 'best', 'good', 'fantastic', 'incredible', 'perfect', '🔥', '❤️', '👏', '💯', '🚀'];
  const negativeWords = ['hate', 'terrible', 'worst', 'bad', 'awful', 'horrible', 'scam', 'broken', 'trash', 'garbage', '💩', '👎', '🤮'];

  const analyzeSentiment = (text) => {
    const lower = text.toLowerCase();
    let score = 0;
    positiveWords.forEach(w => { if (lower.includes(w)) score++; });
    negativeWords.forEach(w => { if (lower.includes(w)) score--; });
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  };

  const run = async () => {
    console.log('💼 XActions Business Analytics');
    console.log('==============================');

    // If brand is specified, search for it
    if (CONFIG.brand) {
      console.log(`🔍 Monitoring brand: "${CONFIG.brand}"`);
      window.location.href = `https://x.com/search?q=${encodeURIComponent(CONFIG.brand)}&f=live`;
      await sleep(5000);
    }

    const mentions = [];
    let scrollAttempts = 0;

    while (mentions.length < CONFIG.maxMentions && scrollAttempts < Math.ceil(CONFIG.maxMentions / 3)) {
      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const handle = tweet.querySelector('[data-testid="User-Name"] a[tabindex="-1"]')?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        const likes = tweet.querySelector('[data-testid="like"] span')?.textContent || '0';
        const reposts = tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0';
        const isVerified = !!tweet.querySelector('[data-testid="icon-verified"]');

        if (link && !mentions.find(m => m.link === link)) {
          mentions.push({
            text: text.substring(0, 300),
            author,
            handle,
            time,
            link,
            likes,
            reposts,
            isVerified,
            sentiment: CONFIG.includeSentiment ? analyzeSentiment(text) : undefined,
          });
        }
      });

      window.scrollBy(0, 1000);
      await sleep(1500);
      scrollAttempts++;
    }

    // Analysis
    const sentimentBreakdown = {
      positive: mentions.filter(m => m.sentiment === 'positive').length,
      negative: mentions.filter(m => m.sentiment === 'negative').length,
      neutral: mentions.filter(m => m.sentiment === 'neutral').length,
    };

    const verifiedMentions = mentions.filter(m => m.isVerified).length;
    const topMentions = [...mentions].sort((a, b) =>
      (parseInt(b.likes) || 0) - (parseInt(a.likes) || 0)
    ).slice(0, 5);

    console.log(`\n📊 Brand Analysis (${mentions.length} mentions):`);
    console.log(`  😊 Positive: ${sentimentBreakdown.positive}`);
    console.log(`  😐 Neutral: ${sentimentBreakdown.neutral}`);
    console.log(`  😞 Negative: ${sentimentBreakdown.negative}`);
    console.log(`  ✅ From verified accounts: ${verifiedMentions}`);
    
    console.log('\n🏆 Top mentions by likes:');
    topMentions.forEach((m, i) => {
      console.log(`  ${i + 1}. @${m.handle} (${m.likes} likes): ${m.text.substring(0, 50)}...`);
    });

    const result = {
      brand: CONFIG.brand || window.location.href,
      mentions,
      analysis: {
        sentiment: sentimentBreakdown,
        verifiedMentions,
        topMentions,
        totalEngagement: mentions.reduce((s, m) => s + (parseInt(m.likes) || 0) + (parseInt(m.reposts) || 0), 0),
      },
      scrapedAt: new Date().toISOString(),
    };

    console.log('\n📦 Full JSON:');
    console.log(JSON.stringify(result, null, 2));

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('\n✅ Copied to clipboard!');
    } catch (e) {}
  };

  run();
})();
