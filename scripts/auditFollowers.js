// scripts/auditFollowers.js
// Browser console script for auditing follower quality on X/Twitter
// Paste in DevTools console on x.com/USERNAME/followers
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxFollowers: 200,    // Max followers to scan
    scrollDelay: 2000,    // ms between scrolls
    maxScrollAttempts: 30,
    exportResults: true,  // Auto-download JSON audit report
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

  const extractBio = (cell) => {
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    if (autoDir?.textContent?.trim()?.length >= 10) return autoDir.textContent.trim();
    const noRole = cell.querySelector('[dir="auto"]:not([role])');
    if (noRole && !noRole.closest('a') && noRole.textContent?.trim()?.length >= 10) return noRole.textContent.trim();
    return '';
  };

  const run = async () => {
    console.log('🔍 AUDIT FOLLOWERS — by nichxbt');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    console.log('📊 Scanning followers...\n');

    const followers = new Map();
    let scrollAttempts = 0, retries = 0;

    while (followers.size < CONFIG.maxFollowers && scrollAttempts < CONFIG.maxScrollAttempts) {
      const prevSize = followers.size;

      for (const cell of document.querySelectorAll('[data-testid="UserCell"]')) {
        const linkEl = cell.querySelector('a[href^="/"]');
        if (!linkEl) continue;
        const username = linkEl.href.replace(/^.*x\.com\//, '').split('/')[0];
        if (followers.has(username)) continue;

        const nameEl = cell.querySelector('[data-testid="User-Name"]');
        const followsYou = !!cell.querySelector('[data-testid="userFollowIndicator"]');
        const bio = extractBio(cell);
        const displayName = nameEl?.textContent?.split('@')[0]?.trim() || '';

        // Heuristic bot scoring
        let score = 0;
        const flags = [];

        const avatarImg = cell.querySelector('img');
        if (avatarImg && avatarImg.src.includes('default_profile')) { score += 2; flags.push('default avatar'); }
        if (!bio || bio.length < 5) { score += 1; flags.push('no bio'); }

        const digitRatio = (username.match(/\d/g) || []).length / username.length;
        if (digitRatio > 0.5) { score += 2; flags.push('generated username'); }
        if (username.length > 14 && digitRatio > 0.3) { score += 1; flags.push('long numeric username'); }
        if (displayName.match(/^[A-Z][a-z]+ [A-Z][a-z]+\d+$/)) { score += 1; flags.push('template name'); }

        followers.set(username, {
          username, displayName, bio: bio.substring(0, 100), followsYou,
          suspicionScore: score, flags,
          category: score >= 3 ? 'likely-fake' : score >= 2 ? 'suspicious' : 'legitimate',
        });
      }

      if (followers.size === prevSize) retries++;
      else retries = 0;
      if (retries >= 3) break;

      scrollAttempts++;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      console.log(`   Scanned ${followers.size} followers...`);
    }

    const all = [...followers.values()];
    const legitimate = all.filter(f => f.category === 'legitimate');
    const suspicious = all.filter(f => f.category === 'suspicious');
    const fakes = all.filter(f => f.category === 'likely-fake');
    const followBack = all.filter(f => f.followsYou);

    // Report
    console.log('\n📊 FOLLOWER AUDIT REPORT');
    console.log(`   Total scanned: ${all.length}`);
    console.log(`   ✅ Legitimate:  ${legitimate.length} (${(legitimate.length / all.length * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Suspicious:  ${suspicious.length} (${(suspicious.length / all.length * 100).toFixed(1)}%)`);
    console.log(`   🚫 Likely fake: ${fakes.length} (${(fakes.length / all.length * 100).toFixed(1)}%)`);
    console.log(`   🤝 Follow back: ${followBack.length} (${(followBack.length / all.length * 100).toFixed(1)}%)`);

    if (fakes.length > 0) {
      console.log('\n🚫 LIKELY FAKE ACCOUNTS:');
      fakes.forEach((f, i) => console.log(`   ${i + 1}. @${f.username} — ${f.flags.join(', ')}`));
    }

    if (suspicious.length > 0) {
      console.log('\n⚠️ SUSPICIOUS ACCOUNTS:');
      suspicious.slice(0, 20).forEach((f, i) => console.log(`   ${i + 1}. @${f.username} — ${f.flags.join(', ')}`));
      if (suspicious.length > 20) console.log(`   ... and ${suspicious.length - 20} more`);
    }

    if (CONFIG.exportResults) {
      const report = {
        auditedAt: new Date().toISOString(),
        summary: { total: all.length, legitimate: legitimate.length, suspicious: suspicious.length, fakes: fakes.length, followBack: followBack.length },
        followers: all,
      };
      download(report, `xactions-follower-audit-${new Date().toISOString().slice(0, 10)}.json`);
    }

    console.log('\n✅ Audit complete!\n');
  };

  run();
})();
