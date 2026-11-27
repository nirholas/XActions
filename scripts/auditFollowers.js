// GENERATED FILE: a copy of browser/auditFollowers.js, written by scripts/build-script-manifest.mjs. Edit browser/auditFollowers.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        auditFollowers.js
 * @title       Audit Followers
 * @description Scan your followers list and score each account as legitimate, suspicious or likely fake, with an optional audience quality report.
 * @category    analytics
 * @page        x.com/<you>/followers
 * @writes      false
 * @aliases     scripts/auditFollowers.js, scripts/twitter/audit-followers.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Audit Followers on X - by nichxbt
// https://github.com/nirholas/xactions
// Analyze your followers: find fakes, bots, inactive accounts
// 1. Go to https://x.com/YOUR_USERNAME/followers
// 2. Open the Developer Console (F12)
// 3. Paste browser/auditFollowers.js into the Developer Console and run it
//
// CONFIG.qualityReport adds the audience quality report: verified accounts,
// influencers, high-quality accounts, red flags, a 0-100 quality score, top
// influential and verified followers, bio interests and recommendations.
// CONFIG.saveToLocalStorage keeps a summary in localStorage "xactions_audit_<you>".
//
// Last Updated: 27 November 2026
(() => {
  const CONFIG = {
    maxFollowers: 200,
    scrollDelay: 2000,
    maxScrollAttempts: 30,
    maxRetries: 3,              // Stop after this many scrolls in a row that find no new followers
    exportResults: true,
    qualityReport: false,       // Also print the audience quality report (composition, quality score, interests)
    saveToLocalStorage: false,  // Save the quality summary to localStorage "xactions_audit_<you>" (implies the quality analysis)
    thresholds: {
      influencer: 10,           // Followers 10x+ following = influencer
      balanced: 0.5,            // Followers/following ratio from 0.5 up to the influencer ratio = balanced
      massFollower: 2000,       // Following 2000+ = aggressive follower
    },
  };

  const $userCell = '[data-testid="UserCell"]';
  const $userName = '[data-testid="User-Name"]';
  const $followIndicator = '[data-testid="userFollowIndicator"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Bio extraction with fallback chain (canonical version: src/automation/core.js → extractUserFromCell)
  const extractBio = (cell) => {
    // Strategy 1: data-testid (most reliable)
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    // Strategy 2: dir="auto" excluding testid elements
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    if (autoDir?.textContent?.trim()?.length >= 10) return autoDir.textContent.trim();
    // Strategy 3: dir="auto" excluding role (variant DOMs)
    const noRole = cell.querySelector('[dir="auto"]:not([role])');
    if (noRole && !noRole.closest('a') && noRole.textContent?.trim()?.length >= 10) return noRole.textContent.trim();
    return '';
  };

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  const interestCategories = {
    tech: ['developer', 'engineer', 'programmer', 'tech', 'software', 'coding', 'ai', 'data'],
    crypto: ['crypto', 'bitcoin', 'btc', 'eth', 'nft', 'web3', 'defi', 'blockchain'],
    business: ['founder', 'ceo', 'entrepreneur', 'startup', 'investor', 'business'],
    marketing: ['marketing', 'growth', 'social media', 'brand', 'digital'],
    creative: ['creator', 'artist', 'designer', 'writer', 'photographer', 'content'],
    finance: ['finance', 'trading', 'forex', 'investment', 'stocks'],
  };

  const qualityAnalysis = (all, owner) => {
    const pct = (n) => (n / all.length * 100).toFixed(1);
    const categories = {
      influencers: all.filter(f => f.followers > 0 && f.followers / (f.following || 1) >= CONFIG.thresholds.influencer),
      balanced: all.filter(f => {
        const ratio = (f.followers || 1) / (f.following || 1);
        return ratio >= CONFIG.thresholds.balanced && ratio < CONFIG.thresholds.influencer;
      }),
      aggressiveFollowers: all.filter(f => f.following > CONFIG.thresholds.massFollower),
      verified: all.filter(f => f.verified),
      defaultAvatars: all.filter(f => f.defaultAvatar),
      noBio: all.filter(f => !f.bio),
      zeroFollowers: all.filter(f => f.followers === 0),
      highQuality: all.filter(f => f.followers >= 1000 && f.bio && !f.defaultAvatar),
    };

    const avgFollowing = all.reduce((sum, f) => sum + f.following, 0) / all.length;
    const avgFollowers = all.reduce((sum, f) => sum + f.followers, 0) / all.length;
    const totalReach = all.reduce((sum, f) => sum + f.followers, 0);

    const qualityScore = Math.min(100, Math.round(
      (categories.highQuality.length * 3 +
       categories.influencers.length * 2 +
       categories.verified.length * 5 +
       categories.balanced.length * 1) /
      (all.length * 3) * 100
    ));

    const interests = {};
    all.forEach(f => {
      const bioLower = f.bio.toLowerCase();
      Object.entries(interestCategories).forEach(([category, words]) => {
        if (words.some(w => bioLower.includes(w))) {
          interests[category] = (interests[category] || 0) + 1;
        }
      });
    });
    const sortedInterests = Object.entries(interests).sort((a, b) => b[1] - a[1]);
    const topInfluencers = [...categories.influencers].sort((a, b) => b.followers - a.followers);

    if (CONFIG.qualityReport) {
      console.log('\n' + '═'.repeat(60));
      console.log(`📊 AUDIENCE QUALITY REPORT: @${owner}`);
      console.log('═'.repeat(60));

      console.log('\n📈 OVERVIEW:');
      console.log(`   Total audience reach:     ${formatNum(totalReach)}`);
      console.log(`   Average following:        ${formatNum(avgFollowing)}`);
      console.log(`   Average followers:        ${formatNum(avgFollowers)}`);

      console.log('\n👥 FOLLOWER COMPOSITION:');
      console.log(`   ⭐ Verified accounts:     ${categories.verified.length} (${pct(categories.verified.length)}%)`);
      console.log(`   🌟 Influencers (${CONFIG.thresholds.influencer}:1+):   ${categories.influencers.length} (${pct(categories.influencers.length)}%)`);
      console.log(`   💎 High-quality:          ${categories.highQuality.length} (${pct(categories.highQuality.length)}%)`);
      console.log(`   ⚖️  Balanced accounts:     ${categories.balanced.length} (${pct(categories.balanced.length)}%)`);
      console.log(`   🔄 Aggressive followers:  ${categories.aggressiveFollowers.length} (${pct(categories.aggressiveFollowers.length)}%)`);

      console.log('\n⚠️  RED FLAGS:');
      console.log(`   🖼️  Default avatars:       ${categories.defaultAvatars.length} (${pct(categories.defaultAvatars.length)}%)`);
      console.log(`   📝 No bio:                ${categories.noBio.length} (${pct(categories.noBio.length)}%)`);
      console.log(`   👻 Zero followers:        ${categories.zeroFollowers.length} (${pct(categories.zeroFollowers.length)}%)`);

      console.log('\n🏆 QUALITY SCORE:');
      const scoreBar = '█'.repeat(Math.round(qualityScore / 5)) + '░'.repeat(20 - Math.round(qualityScore / 5));
      console.log(`   [${scoreBar}] ${qualityScore}/100`);
      if (qualityScore >= 80) console.log('   🏆 EXCELLENT - Premium quality audience!');
      else if (qualityScore >= 60) console.log('   👍 GOOD - Solid audience quality');
      else if (qualityScore >= 40) console.log('   ⚠️  MODERATE - Room for improvement');
      else console.log('   🚨 POOR - Consider audience cleanup');

      if (topInfluencers.length > 0) {
        console.log('\n🌟 YOUR TOP INFLUENTIAL FOLLOWERS:');
        topInfluencers.slice(0, 15).forEach((f, i) => {
          const badge = f.verified ? ' ✓' : '';
          console.log(`\n${i + 1}. ${f.displayName}${badge} (@${f.username})`);
          console.log(`   ${formatNum(f.followers)} followers | ${formatNum(f.following)} following`);
          if (f.bio) console.log(`   "${f.bio.slice(0, 60)}${f.bio.length > 60 ? '...' : ''}"`);
        });
      }

      if (categories.verified.length > 0) {
        console.log('\n⭐ VERIFIED FOLLOWERS:');
        categories.verified.slice(0, 20).forEach((f, i) => {
          console.log(`   ${i + 1}. @${f.username} - ${formatNum(f.followers)} followers`);
        });
      }

      console.log('\n🏷️  AUDIENCE INTERESTS (Bio Keywords):');
      if (sortedInterests.length > 0) {
        const maxCount = sortedInterests[0][1];
        sortedInterests.forEach(([category, count]) => {
          const bar = '█'.repeat(Math.round(count / maxCount * 20));
          console.log(`   ${category.padEnd(12)} ${bar.padEnd(20)} ${count} (${pct(count)}%)`);
        });
      } else {
        console.log('   Not enough bio data to analyze interests');
      }

      console.log('\n💡 RECOMMENDATIONS:');
      if (categories.defaultAvatars.length / all.length > 0.2) {
        console.log('   ⚠️  High number of default avatars - consider removing bots');
      }
      if (categories.zeroFollowers.length / all.length > 0.1) {
        console.log('   ⚠️  Many followers have 0 followers - possible fake accounts');
      }
      if (categories.influencers.length > 0) {
        console.log(`   ✅ You have ${categories.influencers.length} influencer followers - engage with them!`);
      }
      if (categories.verified.length > 0) {
        console.log(`   ✅ You have ${categories.verified.length} verified followers - great credibility!`);
      }
    }

    return {
      qualityScore,
      totalReach,
      composition: {
        verified: categories.verified.length,
        influencers: categories.influencers.length,
        highQuality: categories.highQuality.length,
        balanced: categories.balanced.length,
        aggressiveFollowers: categories.aggressiveFollowers.length,
        defaultAvatars: categories.defaultAvatars.length,
        noBio: categories.noBio.length,
        zeroFollowers: categories.zeroFollowers.length,
      },
      interests: Object.fromEntries(sortedInterests),
      topInfluencers: topInfluencers
        .slice(0, 50)
        .map(f => ({ username: f.username, followers: f.followers, verified: f.verified })),
    };
  };

  const run = async () => {
    console.log('🔍 AUDIT FOLLOWERS - XActions by nichxbt');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    const owner = window.location.pathname.split('/')[1];
    console.log(`📊 Scanning followers of @${owner}...\n`);

    const followers = new Map();
    let scrollAttempts = 0;
    let retries = 0;

    while (followers.size < CONFIG.maxFollowers && scrollAttempts < CONFIG.maxScrollAttempts) {
      const prevSize = followers.size;
      const cells = document.querySelectorAll($userCell);

      cells.forEach(cell => {
        const linkEl = cell.querySelector('a[href^="/"]');
        if (!linkEl) return;
        const username = linkEl.href.replace(/^.*x\.com\//, '').split('/')[0];
        if (followers.has(username)) return;

        const nameEl = cell.querySelector($userName);
        const followsYou = !!cell.querySelector($followIndicator);
        const bio = extractBio(cell);
        const displayName = nameEl?.textContent?.split('@')[0]?.trim() || '';

        // Counts and badges for the quality report (counts are 0 when the cell does not show them)
        const text = cell.textContent;
        const followingMatch = text.match(/([\d,.]+[KMB]?)\s*Following/i);
        const followersMatch = text.match(/([\d,.]+[KMB]?)\s*Follower/i);
        const following = followingMatch ? parseCount(followingMatch[1]) : 0;
        const followerCount = followersMatch ? parseCount(followersMatch[1]) : 0;
        // testid is locale-independent; aria-label kept as fallback
        const verified = cell.querySelector('[data-testid="icon-verified"], svg[aria-label*="Verified"]') !== null;

        // Heuristic scoring
        let suspicionScore = 0;
        const flags = [];

        // Default/no avatar
        const avatarImg = cell.querySelector('img');
        const defaultAvatar = !!(avatarImg && avatarImg.src.includes('default_profile'));
        if (defaultAvatar) {
          suspicionScore += 2;
          flags.push('default avatar');
        }

        // No bio
        if (!bio || bio.length < 5) {
          suspicionScore += 1;
          flags.push('no bio');
        }

        // Username looks generated (high digit ratio)
        const digitRatio = (username.match(/\d/g) || []).length / username.length;
        if (digitRatio > 0.5) {
          suspicionScore += 2;
          flags.push('generated username');
        }

        // Very long username with numbers
        if (username.length > 14 && digitRatio > 0.3) {
          suspicionScore += 1;
          flags.push('long numeric username');
        }

        // Display name matches patterns
        if (displayName.match(/^[A-Z][a-z]+ [A-Z][a-z]+\d+$/)) {
          suspicionScore += 1;
          flags.push('template name');
        }

        followers.set(username, {
          username,
          displayName,
          bio: bio.substring(0, 100),
          followsYou,
          verified,
          defaultAvatar,
          following,
          followers: followerCount,
          suspicionScore,
          flags,
          category: suspicionScore >= 3 ? 'likely-fake' : suspicionScore >= 2 ? 'suspicious' : 'legitimate',
        });
      });

      if (followers.size === prevSize) retries++;
      else retries = 0;

      if (retries >= CONFIG.maxRetries) break;
      scrollAttempts++;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      console.log(`   Scanned ${followers.size} followers...`);
    }

    const all = [...followers.values()];
    if (all.length === 0) {
      console.error('❌ No followers found! Scroll the list once or reload the page, then run again.');
      return;
    }

    const legitimate = all.filter(f => f.category === 'legitimate');
    const suspicious = all.filter(f => f.category === 'suspicious');
    const fakes = all.filter(f => f.category === 'likely-fake');
    const followBack = all.filter(f => f.followsYou);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 FOLLOWER AUDIT REPORT                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 OVERVIEW (${all.length} followers of @${owner} scanned)`);
    console.log(`   ✅ Legitimate:  ${legitimate.length} (${(legitimate.length / all.length * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Suspicious:  ${suspicious.length} (${(suspicious.length / all.length * 100).toFixed(1)}%)`);
    console.log(`   🚫 Likely fake: ${fakes.length} (${(fakes.length / all.length * 100).toFixed(1)}%)`);
    console.log(`   🤝 Follow back: ${followBack.length} (${(followBack.length / all.length * 100).toFixed(1)}%)`);

    if (fakes.length > 0) {
      console.log('\n🚫 LIKELY FAKE ACCOUNTS:');
      fakes.forEach((f, i) => {
        console.log(`   ${i + 1}. @${f.username} — ${f.flags.join(', ')}`);
      });
    }

    if (suspicious.length > 0) {
      console.log('\n⚠️ SUSPICIOUS ACCOUNTS:');
      suspicious.slice(0, 20).forEach((f, i) => {
        console.log(`   ${i + 1}. @${f.username} — ${f.flags.join(', ')}`);
      });
      if (suspicious.length > 20) console.log(`   ... and ${suspicious.length - 20} more`);
    }

    const quality = (CONFIG.qualityReport || CONFIG.saveToLocalStorage) ? qualityAnalysis(all, owner) : null;

    if (quality && CONFIG.saveToLocalStorage) {
      const storageKey = `xactions_audit_${owner}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          username: owner,
          timestamp: new Date().toISOString(),
          totalFollowers: all.length,
          ...quality,
        }));
        console.log(`\n💾 Audit saved. Run it periodically to track audience quality.`);
        console.log(`   Export: copy(localStorage.getItem("${storageKey}"))`);
      } catch (e) {
        console.warn(`⚠️ Could not save the audit to localStorage: ${e.message}`);
      }
    }

    if (CONFIG.exportResults) {
      const report = {
        auditedAt: new Date().toISOString(),
        owner,
        summary: {
          total: all.length,
          legitimate: legitimate.length,
          suspicious: suspicious.length,
          fakes: fakes.length,
          followBack: followBack.length,
        },
        ...(quality ? { quality } : {}),
        followers: all,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-follower-audit-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      console.log('\n📥 Full audit report downloaded as JSON');
    }

    console.log('\n✅ Audit complete!\n');
  };

  run();
})();
