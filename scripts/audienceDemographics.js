// scripts/audienceDemographics.js
// Browser console script for analyzing follower bios, niches, locations, verified status
// Paste in DevTools console on x.com/USERNAME/followers
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxFollowers: 200,
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

  const NICHES = {
    'Tech/Dev':    ['developer', 'engineer', 'coder', 'software', 'frontend', 'backend', 'fullstack', 'devops', 'ai', 'ml', 'blockchain', 'web3', 'crypto', 'python', 'javascript', 'react', 'saas', 'startup'],
    'Design':      ['designer', 'ux', 'ui', 'figma', 'creative', 'graphic', 'brand', 'illustration'],
    'Marketing':   ['marketing', 'growth', 'seo', 'content', 'copywriting', 'social media', 'ads', 'ppc'],
    'Finance':     ['investor', 'trading', 'finance', 'fintech', 'stocks', 'bitcoin', 'defi', 'vc'],
    'Founder/CEO': ['founder', 'ceo', 'co-founder', 'entrepreneur', 'bootstrapped', 'solopreneur', 'indie hacker'],
    'Creator':     ['creator', 'youtuber', 'podcaster', 'writer', 'blogger', 'newsletter', 'author'],
    'Education':   ['teacher', 'professor', 'phd', 'student', 'university', 'researcher'],
    'Health':      ['fitness', 'health', 'wellness', 'doctor', 'nutrition', 'mental health'],
    'Gaming':      ['gamer', 'gaming', 'esports', 'twitch', 'game dev'],
  };

  const REGIONS = {
    'US': ['united states', 'usa', 'new york', 'san francisco', 'la', 'chicago', 'austin', 'seattle', 'miami', 'silicon valley', 'nyc', 'bay area'],
    'UK': ['united kingdom', 'uk', 'london', 'manchester', 'england'],
    'Canada': ['canada', 'toronto', 'vancouver', 'montreal'],
    'India': ['india', 'mumbai', 'bangalore', 'delhi', 'hyderabad', 'pune'],
    'Europe': ['germany', 'france', 'spain', 'italy', 'netherlands', 'berlin', 'paris', 'amsterdam'],
    'LATAM': ['brazil', 'mexico', 'argentina', 'colombia'],
    'Asia-Pacific': ['japan', 'singapore', 'australia', 'korea', 'hong kong'],
  };

  const detectNiches = (bio) => {
    if (!bio) return [];
    const lower = bio.toLowerCase();
    return Object.entries(NICHES).filter(([, kws]) => kws.some(kw => lower.includes(kw))).map(([n]) => n);
  };

  const detectRegion = (loc) => {
    if (!loc) return 'Unknown';
    const lower = loc.toLowerCase();
    for (const [region, kws] of Object.entries(REGIONS)) {
      if (kws.some(kw => lower.includes(kw))) return region;
    }
    return 'Other';
  };

  const collectFollowers = async () => {
    const followers = new Map();
    const scrollRounds = 10;

    for (let round = 0; round < scrollRounds && followers.size < CONFIG.maxFollowers; round++) {
      document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
        if (followers.size >= CONFIG.maxFollowers) return;
        const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
        if (!link) return;
        const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
        if (!match || ['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) return;
        const username = match[1].toLowerCase();
        if (followers.has(username)) return;

        const nameSpans = cell.querySelectorAll('a[href^="/"] span');
        const displayName = nameSpans.length > 0 ? nameSpans[0].textContent.trim() : match[1];

        let bio = '';
        cell.querySelectorAll('[dir="auto"]').forEach(el => {
          const txt = el.textContent.trim();
          if (txt.length > 20 && !txt.startsWith('@') && !bio) bio = txt;
        });

        const verified = !!cell.querySelector('[data-testid="icon-verified"]') || !!cell.querySelector('svg[aria-label="Verified"]');
        const avatar = cell.querySelector('img[src*="profile_images"]');
        const hasCustomAvatar = !!avatar && !avatar.src.includes('default_profile');

        followers.set(username, { username: match[1], displayName, bio: bio.slice(0, 300), verified, hasCustomAvatar });
      });

      console.log(`   📜 Round ${round + 1}: ${followers.size} followers`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    return [...followers.values()];
  };

  const run = async () => {
    console.log('👥 AUDIENCE DEMOGRAPHICS ANALYZER — by nichxbt\n');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/USERNAME/followers first!');
      return;
    }

    console.log(`📊 Collecting up to ${CONFIG.maxFollowers} followers...\n`);
    const followers = await collectFollowers();
    if (followers.length < 5) { console.error('❌ Need at least 5 followers.'); return; }

    const total = followers.length;

    // Niche breakdown
    const nicheCount = {};
    let nicheless = 0;
    followers.forEach(f => {
      const niches = detectNiches(f.bio);
      f.niches = niches;
      if (niches.length === 0) nicheless++;
      niches.forEach(n => { nicheCount[n] = (nicheCount[n] || 0) + 1; });
    });

    const sortedNiches = Object.entries(nicheCount).sort((a, b) => b[1] - a[1]);

    console.log('🎯 NICHE BREAKDOWN:');
    sortedNiches.forEach(([niche, count]) => {
      const pct = ((count / total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(count / total * 30));
      console.log(`  ${niche.padEnd(16)} ${String(count).padStart(3)} (${pct.padStart(5)}%) ${bar}`);
    });
    console.log(`  ${'Unidentified'.padEnd(16)} ${String(nicheless).padStart(3)} (${((nicheless / total) * 100).toFixed(1).padStart(5)}%)`);

    // Verified
    const verified = followers.filter(f => f.verified).length;
    console.log(`\n✅ VERIFIED: ${verified} (${((verified / total) * 100).toFixed(1)}%) | Non-verified: ${total - verified}`);

    // Profile quality
    const hasAvatar = followers.filter(f => f.hasCustomAvatar).length;
    const hasBio = followers.filter(f => f.bio && f.bio.length > 10).length;
    console.log(`\n🖼️ PROFILE QUALITY:`);
    console.log(`  Custom avatar: ${hasAvatar} (${((hasAvatar / total) * 100).toFixed(1)}%)`);
    console.log(`  Has bio: ${hasBio} (${((hasBio / total) * 100).toFixed(1)}%)`);

    // Bot likelihood
    const suspicious = followers.filter(f => !f.hasCustomAvatar && (!f.bio || f.bio.length < 10)).length;
    console.log(`\n🤖 Suspicious (no avatar + no bio): ${suspicious} (${((suspicious / total) * 100).toFixed(1)}%)`);

    // Top bio keywords
    const wordFreq = {};
    const stopWords = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was', 'not', 'but', 'all', 'have', 'you', 'your', 'who', 'just', 'about', 'can', 'will']);
    followers.forEach(f => {
      if (!f.bio) return;
      f.bio.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).forEach(w => {
        if (w.length > 3 && !stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
      });
    });
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log('\n📝 TOP BIO KEYWORDS:');
    topWords.forEach(([word, count]) => console.log(`  "${word}" — ${count}x`));

    // Insights
    if (sortedNiches.length > 0) {
      console.log(`\n💡 Primary audience: "${sortedNiches[0][0]}" (${sortedNiches[0][1]} followers)`);
      if (sortedNiches.length > 1) console.log(`   Secondary: "${sortedNiches[1][0]}" (${sortedNiches[1][1]})`);
    }

    if (CONFIG.exportResults) {
      download({
        summary: { total, verified, suspicious, topNiches: sortedNiches.slice(0, 5), topKeywords: topWords.slice(0, 10) },
        followers,
        analyzedAt: new Date().toISOString(),
      }, `xactions-demographics-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('\n📥 Demographics exported as JSON.');
    }
  };

  run();
})();
