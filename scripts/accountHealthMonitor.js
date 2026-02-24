// scripts/accountHealthMonitor.js
// Browser console script for computing a 0-100 account health score
// Paste in DevTools console on x.com/USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    postsToAnalyze: 20,
    scrollDelay: 1500,
  };
  // =============================================

  const parseCount = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n));

  const run = async () => {
    console.log('🏥 ACCOUNT HEALTH MONITOR — by nichxbt');

    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i'].includes(pathMatch[1])) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      return;
    }
    const username = pathMatch[1];
    console.log(`\n🔍 Analyzing @${username}...\n`);

    // ── Profile data ──────────────────────────────────────
    const profile = {};
    const statsLinks = document.querySelectorAll('a[href*="/followers"], a[href*="/following"]');
    for (const link of statsLinks) {
      const href = link.getAttribute('href') || '';
      const count = parseCount(link.textContent);
      if (href.includes('/following')) profile.following = count;
      else if (href.includes('/followers') && !href.includes('/verified')) profile.followers = count;
    }

    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    profile.bio = bioEl?.textContent || '';
    profile.hasBio = profile.bio.length > 0;
    profile.bioLength = profile.bio.length;
    profile.hasCustomAvatar = !!(document.querySelector('a[href$="/photo"] img, [data-testid="UserAvatar"] img'));
    profile.hasCustomHeader = !!document.querySelector('a[href$="/header_photo"]');
    profile.isVerified = !!document.querySelector('[data-testid="icon-verified"]');
    profile.hasLocation = !!document.querySelector('[data-testid="UserLocation"]');
    profile.hasWebsite = !!document.querySelector('a[data-testid="UserUrl"]');

    console.log(`   👥 Followers: ${fmt(profile.followers || 0)} | Following: ${fmt(profile.following || 0)}`);

    // ── Collect posts ─────────────────────────────────────
    console.log('\n📋 Collecting recent posts...');
    const posts = new Map();
    let retries = 0;
    const maxScrolls = 15;

    for (let i = 0; i < maxScrolls && posts.size < CONFIG.postsToAnalyze; i++) {
      const prevSize = posts.size;
      document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
        const timeLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const tweetId = (timeLink?.getAttribute('href') || '').split('/status/')[1]?.split(/[?/]/)[0];
        if (!tweetId || posts.has(tweetId)) return;

        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const timeEl = article.querySelector('time');
        const likeBtn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtBtn = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyBtn = article.querySelector('[data-testid="reply"]');
        const viewsEl = article.querySelector('a[href*="/analytics"]');

        const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMB]?)/i)?.[1] || '0');
        const retweets = parseCount(rtBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMB]?)/i)?.[1] || '0');
        const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMB]?)/i)?.[1] || '0');
        const views = parseCount(viewsEl?.textContent || '0');
        const hasMedia = !!article.querySelector('[data-testid="tweetPhoto"], video, [data-testid="card.wrapper"]');
        const hashtags = (text.match(/#\w+/g) || []);
        const isReply = text.startsWith('@');
        const isThread = !!article.querySelector('[data-testid="tweet-thread-indicator"]');

        posts.set(tweetId, {
          text, timestamp: timeEl?.getAttribute('datetime') || '',
          likes, retweets, replies, views, hasMedia, hashtags, isReply, isThread,
          engagement: likes + retweets + replies,
        });
      });

      if (posts.size === prevSize) { retries++; if (retries >= 3) break; }
      else retries = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArr = [...posts.values()];
    console.log(`   📝 Collected ${postsArr.length} posts`);

    // ── Scoring ───────────────────────────────────────────
    // 1. Engagement (25 pts)
    const totalEng = postsArr.reduce((s, p) => s + p.engagement, 0);
    const totalViews = postsArr.reduce((s, p) => s + p.views, 0);
    const engRate = totalViews > 0 ? (totalEng / totalViews) * 100 : 0;
    const engScore = engRate >= 5 ? 25 : engRate >= 3 ? 22 : engRate >= 2 ? 18 : engRate >= 1 ? 14 : engRate >= 0.5 ? 10 : engRate > 0 ? 5 : 0;

    // 2. Profile (20 pts)
    let profScore = 0;
    if (profile.hasBio) profScore += 4;
    if (profile.bioLength > 50) profScore += 2;
    if (profile.hasCustomAvatar) profScore += 4;
    if (profile.hasCustomHeader) profScore += 3;
    if (profile.hasLocation) profScore += 2;
    if (profile.hasWebsite) profScore += 3;
    if (profile.isVerified) profScore += 2;
    profScore = Math.min(profScore, 20);

    // 3. Content (25 pts)
    let contentScore = 0;
    const mediaPct = postsArr.length > 0 ? postsArr.filter(p => p.hasMedia).length / postsArr.length : 0;
    if (mediaPct >= 0.3) contentScore += 6; else if (mediaPct >= 0.1) contentScore += 3;
    const avgLen = postsArr.reduce((s, p) => s + p.text.length, 0) / (postsArr.length || 1);
    if (avgLen >= 100) contentScore += 5; else if (avgLen >= 50) contentScore += 3;
    if (postsArr.some(p => p.hashtags.length > 0)) contentScore += 3;
    if (postsArr.some(p => p.isThread)) contentScore += 4;
    const timestamps = postsArr.map(p => new Date(p.timestamp).getTime()).filter(t => t > 0).sort();
    let postsPerDay = 0;
    if (timestamps.length >= 2) {
      const spanDays = (timestamps[timestamps.length - 1] - timestamps[0]) / 86400000;
      postsPerDay = spanDays > 0 ? postsArr.length / spanDays : 0;
      if (postsPerDay >= 1 && postsPerDay <= 10) contentScore += 5;
      else if (postsPerDay > 0.3) contentScore += 3;
      else if (postsPerDay > 0) contentScore += 1;
    }
    contentScore = Math.min(contentScore, 25);

    // 4. Growth (15 pts)
    const followers = profile.followers || 0;
    const following = profile.following || 0;
    const ratio = following > 0 ? followers / following : followers;
    let growthScore = 0;
    if (ratio >= 2) growthScore += 8; else if (ratio >= 1) growthScore += 6; else if (ratio >= 0.5) growthScore += 4; else if (ratio >= 0.2) growthScore += 2;
    if (followers >= 10000) growthScore += 4; else if (followers >= 1000) growthScore += 3; else if (followers >= 100) growthScore += 2; else if (followers >= 10) growthScore += 1;
    if (following > 5000 && ratio < 0.5) growthScore -= 2;
    growthScore = Math.max(0, Math.min(growthScore, 15));

    // 5. Risk (15 pts — deducted from 15)
    let riskScore = 15;
    const riskFactors = [];
    if (following > 5000 && ratio < 0.3) { riskFactors.push('Following too many (spam signal)'); riskScore -= 4; }
    if (!profile.hasBio) { riskFactors.push('No bio'); riskScore -= 2; }
    if (!profile.hasCustomAvatar) { riskFactors.push('Default avatar'); riskScore -= 3; }
    const uniqueRatio = postsArr.length > 0 ? new Set(postsArr.map(p => p.text.toLowerCase().trim())).size / postsArr.length : 1;
    if (uniqueRatio < 0.8) { riskFactors.push('Repetitive content'); riskScore -= 3; }
    const replyPct = postsArr.filter(p => p.isReply).length / (postsArr.length || 1);
    if (replyPct > 0.8) { riskFactors.push('Almost all replies'); riskScore -= 2; }
    riskScore = Math.max(0, riskScore);

    // ── Total ─────────────────────────────────────────────
    const total = engScore + profScore + contentScore + growthScore + riskScore;
    const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F';
    const gradeEmoji = total >= 90 ? '🏆' : total >= 80 ? '🌟' : total >= 70 ? '👍' : total >= 60 ? '⚡' : total >= 50 ? '⚠️' : '🚨';

    const bar = (s, m) => '█'.repeat(Math.round((s / m) * 20)) + '░'.repeat(20 - Math.round((s / m) * 20)) + ` ${s}/${m}`;

    console.log(`\n${gradeEmoji} HEALTH SCORE: ${total}/100 (Grade: ${grade})`);
    console.log(`  📊 Engagement:  ${bar(engScore, 25)}`);
    console.log(`  👤 Profile:     ${bar(profScore, 20)}`);
    console.log(`  📝 Content:     ${bar(contentScore, 25)}`);
    console.log(`  📈 Growth:      ${bar(growthScore, 15)}`);
    console.log(`  🛡️ Risk:        ${bar(riskScore, 15)}`);
    console.log(`  Engagement rate: ${engRate.toFixed(2)}% | Media: ${(mediaPct * 100).toFixed(0)}% | Ratio: ${ratio.toFixed(2)} | Bio: ${profile.hasBio ? '✅' : '❌'} Avatar: ${profile.hasCustomAvatar ? '✅' : '❌'} Header: ${profile.hasCustomHeader ? '✅' : '❌'}`);
    if (postsPerDay > 0) console.log(`  Posting: ${postsPerDay.toFixed(2)}/day | Avg length: ${avgLen.toFixed(0)} chars`);
    if (riskFactors.length > 0) console.log(`  ⚠️ Risks: ${riskFactors.join(', ')}`);

    // Recommendations
    const recs = [];
    if (!profile.hasBio) recs.push('Add a bio');
    if (!profile.hasCustomAvatar) recs.push('Upload a profile picture');
    if (!profile.hasCustomHeader) recs.push('Add a header image');
    if (!profile.hasWebsite) recs.push('Add a website link');
    if (engRate < 1) recs.push('Boost engagement: polls, questions, media');
    if (mediaPct < 0.2) recs.push('Post more images/videos');
    if (recs.length === 0) recs.push('Your account looks great! 🎉');
    console.log('\n💡 ' + recs.map((r, i) => `${i + 1}. ${r}`).join(' | '));

    const report = { username, timestamp: new Date().toISOString(), totalScore: total, grade, profile };
    localStorage.setItem(`xactions_health_${username}`, JSON.stringify(report));
    console.log(`\n💾 Saved. Retrieve: JSON.parse(localStorage.getItem("xactions_health_${username}"))`);
  };

  run();
})();
