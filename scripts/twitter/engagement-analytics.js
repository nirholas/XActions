/**
 * ============================================================
 * 📊 Engagement Analytics
 * ============================================================
 * 
 * @name        engagement-analytics.js
 * @description Analyze likes, comments, retweets on your posts
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your profile page: https://x.com/YOUR_USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Wait for it to analyze your recent posts
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Number of posts to analyze
  maxPosts: 50,
  
  // Delay between scrolls (ms)
  scrollDelay: 1500,
  
  // Maximum scroll attempts
  maxScrolls: 30,
  
  // Retry when no new posts found
  maxRetries: 3
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function engagementAnalytics() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📊 XActions — Engagement Analytics                          ║
║  Analyze likes, comments, retweets on your posts             ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Selectors
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';
  const $views = 'a[href*="/analytics"]';

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

  const getUsername = () => {
    const match = window.location.pathname.match(/^\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const username = getUsername();
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    console.log('👉 Example: https://x.com/YOUR_USERNAME');
    return;
  }

  console.log(`📊 Analyzing engagement for @${username}\n`);
  console.log('🔄 Scrolling to load posts...\n');

  const posts = new Map();
  let retries = 0;
  let scrollCount = 0;

  while (posts.size < CONFIG.maxPosts && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = posts.size;
    
    document.querySelectorAll($tweet).forEach(tweet => {
      // Check if this is from the profile owner
      const userLinks = tweet.querySelectorAll('a[href^="/"]');
      let isOwner = false;
      userLinks.forEach(link => {
        if (link.getAttribute('href')?.toLowerCase() === `/${username.toLowerCase()}`) {
          isOwner = true;
        }
      });

      if (!isOwner) return;

      // Get tweet ID from time link
      const timeLink = tweet.querySelector('a[href*="/status/"] time')?.closest('a');
      const tweetUrl = timeLink?.getAttribute('href') || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
      
      if (!tweetId || posts.has(tweetId)) return;

      // Get tweet text
      const textEl = tweet.querySelector($tweetText);
      const text = textEl?.textContent?.slice(0, 100) || '[No text]';

      // Get engagement counts
      const likeBtn = tweet.querySelector($like);
      const retweetBtn = tweet.querySelector($retweet);
      const replyBtn = tweet.querySelector($reply);
      const viewsEl = tweet.querySelector($views);

      const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const retweets = parseCount(retweetBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const views = parseCount(viewsEl?.textContent || '0');

      // Get timestamp
      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime') || '';

      posts.set(tweetId, {
        id: tweetId,
        text,
        likes,
        retweets,
        replies,
        views,
        timestamp,
        url: `https://x.com${tweetUrl}`
      });
    });

    if (posts.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    console.log(`   Found ${posts.size} posts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  const postsArray = Array.from(posts.values());
  
  if (postsArray.length === 0) {
    console.error('❌ No posts found. Make sure you\'re on the correct profile page.');
    return;
  }

  console.log(`\n✅ Analyzed ${postsArray.length} posts\n`);
  console.log('═'.repeat(60));
  console.log('📊 ENGAGEMENT SUMMARY');
  console.log('═'.repeat(60));

  // Calculate totals and averages
  const totals = {
    likes: postsArray.reduce((sum, p) => sum + p.likes, 0),
    retweets: postsArray.reduce((sum, p) => sum + p.retweets, 0),
    replies: postsArray.reduce((sum, p) => sum + p.replies, 0),
    views: postsArray.reduce((sum, p) => sum + p.views, 0)
  };

  const averages = {
    likes: totals.likes / postsArray.length,
    retweets: totals.retweets / postsArray.length,
    replies: totals.replies / postsArray.length,
    views: totals.views / postsArray.length
  };

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  console.log(`\n📈 TOTALS (${postsArray.length} posts):`);
  console.log(`   ❤️  Likes:    ${formatNum(totals.likes)}`);
  console.log(`   🔄 Retweets: ${formatNum(totals.retweets)}`);
  console.log(`   💬 Replies:  ${formatNum(totals.replies)}`);
  console.log(`   👁️  Views:    ${formatNum(totals.views)}`);

  console.log(`\n📊 AVERAGES PER POST:`);
  console.log(`   ❤️  Likes:    ${averages.likes.toFixed(1)}`);
  console.log(`   🔄 Retweets: ${averages.retweets.toFixed(1)}`);
  console.log(`   💬 Replies:  ${averages.replies.toFixed(1)}`);
  console.log(`   👁️  Views:    ${formatNum(averages.views)}`);

  // Engagement rate
  if (totals.views > 0) {
    const engagementRate = ((totals.likes + totals.retweets + totals.replies) / totals.views) * 100;
    console.log(`\n📐 ENGAGEMENT RATE: ${engagementRate.toFixed(2)}%`);
    console.log(`   (Likes + Retweets + Replies) / Views`);
  }

  // Top performing posts
  console.log('\n' + '═'.repeat(60));
  console.log('🏆 TOP PERFORMING POSTS');
  console.log('═'.repeat(60));

  // By likes
  const topLikes = [...postsArray].sort((a, b) => b.likes - a.likes).slice(0, 5);
  console.log('\n❤️  TOP BY LIKES:');
  topLikes.forEach((p, i) => {
    console.log(`   ${i + 1}. ${formatNum(p.likes)} likes — "${p.text.slice(0, 50)}..."`);
    console.log(`      ${p.url}`);
  });

  // By retweets
  const topRetweets = [...postsArray].sort((a, b) => b.retweets - a.retweets).slice(0, 5);
  console.log('\n🔄 TOP BY RETWEETS:');
  topRetweets.forEach((p, i) => {
    console.log(`   ${i + 1}. ${formatNum(p.retweets)} RTs — "${p.text.slice(0, 50)}..."`);
    console.log(`      ${p.url}`);
  });

  // By engagement rate (if views available)
  const postsWithViews = postsArray.filter(p => p.views > 0);
  if (postsWithViews.length > 0) {
    const topEngagement = postsWithViews
      .map(p => ({ ...p, rate: ((p.likes + p.retweets + p.replies) / p.views) * 100 }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    
    console.log('\n📈 TOP BY ENGAGEMENT RATE:');
    topEngagement.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.rate.toFixed(2)}% — "${p.text.slice(0, 50)}..."`);
      console.log(`      ${p.url}`);
    });
  }

  // Worst performing
  console.log('\n' + '═'.repeat(60));
  console.log('📉 LOWEST PERFORMING (consider deleting or learning from)');
  console.log('═'.repeat(60));
  
  const bottomLikes = [...postsArray].sort((a, b) => a.likes - b.likes).slice(0, 3);
  bottomLikes.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.likes} likes — "${p.text.slice(0, 50)}..."`);
    console.log(`      ${p.url}`);
  });

  // Save to localStorage
  const storageKey = `xactions_engagement_${username}`;
  const data = {
    username,
    timestamp: new Date().toISOString(),
    postCount: postsArray.length,
    totals,
    averages,
    posts: postsArray
  };
  localStorage.setItem(storageKey, JSON.stringify(data));

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Data saved! Run again to compare over time.`);
  console.log(`📥 Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();
