/**
 * ============================================================
 * 🏥 Account Health Monitor — Production Grade
 * ============================================================
 *
 * @name        accountHealthMonitor.js
 * @description Comprehensive health check for your X/Twitter account.
 *              Generates a composite health score (0–100) across
 *              engagement, growth, content quality, and risk factors.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME
 * 2. Open DevTools Console (F12)
 * 3. Paste this script and press Enter
 * 4. Wait ~60s for full analysis
 *
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    postsToAnalyze: 50,
    scrollDelay: 1500,
    maxScrolls: 30,
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms + ms * 0.1 * Math.random()));

  const parseCount = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  const fmt = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(Math.round(n));

  (async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🏥 ACCOUNT HEALTH MONITOR' + ' '.repeat(W - 29) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    // Detect profile
    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i'].includes(pathMatch[1])) {
      console.error('❌ Navigate to a profile page first!');
      return;
    }
    const username = pathMatch[1];
    console.log(`\n🔍 Analyzing @${username}...\n`);

    // ── Phase 1: Collect Profile Stats ──────────────────────

    console.log('📋 Phase 1: Collecting profile data...');

    const profileData = {};

    // Followers / Following counts
    const statsLinks = document.querySelectorAll('a[href*="/followers"], a[href*="/following"]');
    for (const link of statsLinks) {
      const href = link.getAttribute('href') || '';
      const count = parseCount(link.textContent);
      if (href.includes('/following')) profileData.following = count;
      else if (href.includes('/verified_followers')) profileData.verifiedFollowers = count;
      else if (href.includes('/followers')) profileData.followers = count;
    }

    // Bio
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    profileData.bio = bioEl?.textContent || '';
    profileData.hasBio = profileData.bio.length > 0;
    profileData.bioLength = profileData.bio.length;

    // Avatar
    const avatarEl = document.querySelector('a[href$="/photo"] img, [data-testid="UserAvatar"] img');
    profileData.hasCustomAvatar = avatarEl ? !avatarEl.src.includes('default_profile') : false;

    // Header
    const headerEl = document.querySelector('a[href$="/header_photo"]');
    profileData.hasCustomHeader = !!headerEl;

    // Verified
    profileData.isVerified = !!document.querySelector('[data-testid="icon-verified"]');

    // Join date
    const joinEl = document.querySelector('[data-testid="UserJoinDate"]');
    profileData.joinDate = joinEl?.textContent || '';

    // Location & website
    profileData.hasLocation = !!document.querySelector('[data-testid="UserLocation"]');
    profileData.hasWebsite = !!document.querySelector('a[data-testid="UserUrl"]');

    console.log(`   👥 Followers: ${fmt(profileData.followers || 0)}`);
    console.log(`   👤 Following: ${fmt(profileData.following || 0)}`);

    // ── Phase 2: Analyze Recent Posts ───────────────────────

    console.log('\n📋 Phase 2: Analyzing recent posts...');

    const posts = new Map();
    let retries = 0;

    for (let i = 0; i < CONFIG.maxScrolls && posts.size < CONFIG.postsToAnalyze; i++) {
      const prevSize = posts.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
        const authorLink = article.querySelector(`a[href="/${username}"]`);
        if (!authorLink) return;

        const timeLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const tweetUrl = timeLink?.getAttribute('href') || '';
        const tweetId = tweetUrl.split('/status/')[1]?.split(/[?/]/)[0];
        if (!tweetId || posts.has(tweetId)) return;

        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const timeEl = article.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || '';

        const likeBtn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtBtn = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyBtn = article.querySelector('[data-testid="reply"]');
        const viewsEl = article.querySelector('a[href*="/analytics"]');

        const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const retweets = parseCount(rtBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const views = parseCount(viewsEl?.textContent || '0');

        const hasMedia = !!article.querySelector('[data-testid="tweetPhoto"], video, [data-testid="card.wrapper"]');
        const hasLinks = !!article.querySelector('a[href*="t.co"]');
        const hashtags = (text.match(/#\w+/g) || []);
        const isThread = !!article.querySelector('[data-testid="tweet-thread-indicator"]');
        const isReply = text.startsWith('@');

        posts.set(tweetId, {
          text, timestamp, likes, retweets, replies, views,
          hasMedia, hasLinks, hashtags, isThread, isReply,
          engagement: likes + retweets + replies,
        });
      });

      if (posts.size === prevSize) { retries++; if (retries >= 3) break; }
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArray = [...posts.values()];
    console.log(`   📝 Collected ${postsArray.length} posts for analysis`);

    // ── Phase 3: Calculate Health Metrics ───────────────────

    console.log('\n📋 Phase 3: Computing health metrics...\n');

    const metrics = {};

    // 1. Engagement Health (25 points)
    const totalEngagement = postsArray.reduce((s, p) => s + p.engagement, 0);
    const avgEngagement = postsArray.length > 0 ? totalEngagement / postsArray.length : 0;
    const totalViews = postsArray.reduce((s, p) => s + p.views, 0);
    const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

    let engagementScore = 0;
    if (engagementRate >= 5) engagementScore = 25;
    else if (engagementRate >= 3) engagementScore = 22;
    else if (engagementRate >= 2) engagementScore = 18;
    else if (engagementRate >= 1) engagementScore = 14;
    else if (engagementRate >= 0.5) engagementScore = 10;
    else if (engagementRate > 0) engagementScore = 5;
    metrics.engagement = { score: engagementScore, max: 25, rate: engagementRate.toFixed(2) + '%', avg: avgEngagement.toFixed(1) };

    // 2. Profile Completeness (20 points)
    let profileScore = 0;
    if (profileData.hasBio) profileScore += 4;
    if (profileData.bioLength > 50) profileScore += 2;
    if (profileData.hasCustomAvatar) profileScore += 4;
    if (profileData.hasCustomHeader) profileScore += 3;
    if (profileData.hasLocation) profileScore += 2;
    if (profileData.hasWebsite) profileScore += 3;
    if (profileData.isVerified) profileScore += 2;
    profileScore = Math.min(profileScore, 20);
    metrics.profile = { score: profileScore, max: 20, details: profileData };

    // 3. Content Quality (25 points)
    let contentScore = 0;
    const postsWithMedia = postsArray.filter(p => p.hasMedia).length;
    const mediaPct = postsArray.length > 0 ? postsWithMedia / postsArray.length : 0;
    if (mediaPct >= 0.3) contentScore += 6; // Using media
    else if (mediaPct >= 0.1) contentScore += 3;

    const avgLength = postsArray.reduce((s, p) => s + p.text.length, 0) / (postsArray.length || 1);
    if (avgLength >= 100) contentScore += 5;
    else if (avgLength >= 50) contentScore += 3;

    const postsWithHashtags = postsArray.filter(p => p.hashtags.length > 0).length;
    if (postsWithHashtags > 0) contentScore += 3;

    const threads = postsArray.filter(p => p.isThread).length;
    if (threads > 0) contentScore += 4;

    // Posting frequency (check time span)
    const timestamps = postsArray.map(p => new Date(p.timestamp).getTime()).filter(t => t > 0).sort();
    if (timestamps.length >= 2) {
      const spanDays = (timestamps[timestamps.length - 1] - timestamps[0]) / 86400000;
      const postsPerDay = spanDays > 0 ? postsArray.length / spanDays : 0;
      if (postsPerDay >= 1 && postsPerDay <= 10) contentScore += 5; // Active but not spammy
      else if (postsPerDay > 0.3) contentScore += 3;
      else if (postsPerDay > 0) contentScore += 1;
      metrics.postingFrequency = postsPerDay.toFixed(2) + '/day';
    }
    contentScore = Math.min(contentScore, 25);
    metrics.content = { score: contentScore, max: 25, mediaPct: (mediaPct * 100).toFixed(0) + '%', avgLength: avgLength.toFixed(0) };

    // 4. Growth & Ratio Health (15 points)
    let growthScore = 0;
    const followers = profileData.followers || 0;
    const following = profileData.following || 0;
    const ratio = following > 0 ? followers / following : followers;

    if (ratio >= 2) growthScore += 8;
    else if (ratio >= 1) growthScore += 6;
    else if (ratio >= 0.5) growthScore += 4;
    else if (ratio >= 0.2) growthScore += 2;

    if (followers >= 10000) growthScore += 4;
    else if (followers >= 1000) growthScore += 3;
    else if (followers >= 100) growthScore += 2;
    else if (followers >= 10) growthScore += 1;

    // Following too many = red flag
    if (following > 5000 && ratio < 0.5) growthScore -= 2;
    growthScore = Math.max(0, Math.min(growthScore, 15));
    metrics.growth = { score: growthScore, max: 15, ratio: ratio.toFixed(2) };

    // 5. Risk Factors (15 points — deducted from 15)
    let riskScore = 15;
    const riskFactors = [];

    if (following > 5000 && ratio < 0.3) {
      riskFactors.push('Following too many accounts (spam signal)');
      riskScore -= 4;
    }
    if (!profileData.hasBio) {
      riskFactors.push('No bio (looks like bot)');
      riskScore -= 2;
    }
    if (!profileData.hasCustomAvatar) {
      riskFactors.push('Default avatar (bot signal)');
      riskScore -= 3;
    }

    // Check for repetitive content
    const uniqueTexts = new Set(postsArray.map(p => p.text.toLowerCase().trim()));
    const uniqueRatio = postsArray.length > 0 ? uniqueTexts.size / postsArray.length : 1;
    if (uniqueRatio < 0.8) {
      riskFactors.push('Repetitive content detected');
      riskScore -= 3;
    }

    // All reply posts = low-quality signal
    const replyPct = postsArray.filter(p => p.isReply).length / (postsArray.length || 1);
    if (replyPct > 0.8) {
      riskFactors.push('Almost all posts are replies');
      riskScore -= 2;
    }

    riskScore = Math.max(0, riskScore);
    metrics.risk = { score: riskScore, max: 15, factors: riskFactors };

    // ── Total Score ─────────────────────────────────────────

    const totalScore = engagementScore + profileScore + contentScore + growthScore + riskScore;
    const maxScore = 100;

    let grade, gradeEmoji;
    if (totalScore >= 90) { grade = 'A+'; gradeEmoji = '🏆'; }
    else if (totalScore >= 80) { grade = 'A'; gradeEmoji = '🌟'; }
    else if (totalScore >= 70) { grade = 'B'; gradeEmoji = '👍'; }
    else if (totalScore >= 60) { grade = 'C'; gradeEmoji = '⚡'; }
    else if (totalScore >= 50) { grade = 'D'; gradeEmoji = '⚠️'; }
    else { grade = 'F'; gradeEmoji = '🚨'; }

    // ── Display Results ─────────────────────────────────────

    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🏥 ACCOUNT HEALTH REPORT' + ' '.repeat(W - 28) + '║');
    console.log('║  ' + `@${username}`.padEnd(W - 2) + '║');
    console.log('╠' + '═'.repeat(W) + '╣');

    const bar = (score, max) => {
      const filled = Math.round((score / max) * 20);
      return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${score}/${max}`;
    };

    console.log('║' + ' '.repeat(W) + '║');
    console.log('║  ' + `📊 Engagement:  ${bar(engagementScore, 25)}`.padEnd(W - 2) + '║');
    console.log('║  ' + `👤 Profile:     ${bar(profileScore, 20)}`.padEnd(W - 2) + '║');
    console.log('║  ' + `📝 Content:     ${bar(contentScore, 25)}`.padEnd(W - 2) + '║');
    console.log('║  ' + `📈 Growth:      ${bar(growthScore, 15)}`.padEnd(W - 2) + '║');
    console.log('║  ' + `🛡️ Risk:        ${bar(riskScore, 15)}`.padEnd(W - 2) + '║');
    console.log('║' + ' '.repeat(W) + '║');
    console.log('╠' + '═'.repeat(W) + '╣');
    console.log('║  ' + `${gradeEmoji} OVERALL SCORE: ${totalScore}/${maxScore} (Grade: ${grade})`.padEnd(W - 2) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    // Detailed breakdown
    console.log('\n━━━ 📊 ENGAGEMENT ━━━');
    console.log(`  Rate: ${metrics.engagement.rate} | Avg: ${metrics.engagement.avg}/post`);

    console.log('\n━━━ 👤 PROFILE ━━━');
    console.log(`  Bio: ${profileData.hasBio ? '✅' : '❌'} (${profileData.bioLength} chars)`);
    console.log(`  Avatar: ${profileData.hasCustomAvatar ? '✅' : '❌'} | Header: ${profileData.hasCustomHeader ? '✅' : '❌'}`);
    console.log(`  Location: ${profileData.hasLocation ? '✅' : '❌'} | Website: ${profileData.hasWebsite ? '✅' : '❌'}`);
    console.log(`  Verified: ${profileData.isVerified ? '✅' : '❌'}`);

    console.log('\n━━━ 📝 CONTENT ━━━');
    console.log(`  Posts analyzed: ${postsArray.length}`);
    console.log(`  Media usage: ${metrics.content.mediaPct}`);
    console.log(`  Avg length: ${metrics.content.avgLength} chars`);
    if (metrics.postingFrequency) console.log(`  Frequency: ${metrics.postingFrequency}`);

    console.log('\n━━━ 📈 GROWTH ━━━');
    console.log(`  Followers: ${fmt(followers)} | Following: ${fmt(following)}`);
    console.log(`  Ratio: ${metrics.growth.ratio} (${ratio >= 1 ? 'healthy' : 'room to improve'})`);

    if (riskFactors.length > 0) {
      console.log('\n━━━ 🚨 RISK FACTORS ━━━');
      riskFactors.forEach(f => console.log(`  ⚠️ ${f}`));
    }

    // Recommendations
    console.log('\n━━━ 💡 RECOMMENDATIONS ━━━');
    const recs = [];
    if (!profileData.hasBio) recs.push('Add a bio to establish credibility');
    if (!profileData.hasCustomAvatar) recs.push('Upload a custom profile picture');
    if (!profileData.hasCustomHeader) recs.push('Add a header/banner image');
    if (!profileData.hasWebsite) recs.push('Add a website link to your profile');
    if (engagementRate < 1) recs.push('Boost engagement: ask questions, use polls, add media');
    if (mediaPct < 0.2) recs.push('Add more images/videos — they get 2-3x more engagement');
    if (ratio < 0.5) recs.push('Unfollow inactive accounts to improve your ratio');
    if (avgLength < 50) recs.push('Write longer, more thoughtful posts');
    if (replyPct > 0.7) recs.push('Post more original content, not just replies');
    if (recs.length === 0) recs.push('Your account looks great! Keep it up! 🎉');
    recs.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));

    // Save
    const report = { username, timestamp: new Date().toISOString(), totalScore, grade, metrics, profileData };
    localStorage.setItem(`xactions_health_${username}`, JSON.stringify(report));
    console.log(`\n💾 Report saved. Track changes over time.`);
    console.log(`   JSON.parse(localStorage.getItem("xactions_health_${username}"))\n`);
  })();
})();
