// Audit Followers on X - by nichxbt
// https://github.com/nirholas/xactions
// Analyze your followers: find fakes, bots, inactive accounts
// 1. Go to https://x.com/YOUR_USERNAME/followers
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    maxFollowers: 200,
    scrollDelay: 2000,
    maxScrollAttempts: 30,
    exportResults: true,
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

  const run = async () => {
    console.log('🔍 AUDIT FOLLOWERS - XActions by nichxbt');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    console.log('📊 Scanning followers...\n');

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

        // Heuristic scoring
        let suspicionScore = 0;
        const flags = [];

        // Default/no avatar
        const avatarImg = cell.querySelector('img');
        if (avatarImg && avatarImg.src.includes('default_profile')) {
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
          suspicionScore,
          flags,
          category: suspicionScore >= 3 ? 'likely-fake' : suspicionScore >= 2 ? 'suspicious' : 'legitimate',
        });
      });

      if (followers.size === prevSize) retries++;
      else retries = 0;

      if (retries >= 3) break;
      scrollAttempts++;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const all = [...followers.values()];
    const legitimate = all.filter(f => f.category === 'legitimate');
    const suspicious = all.filter(f => f.category === 'suspicious');
    const fakes = all.filter(f => f.category === 'likely-fake');
    const followBack = all.filter(f => f.followsYou);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 FOLLOWER AUDIT REPORT                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 OVERVIEW (${all.length} followers scanned)`);
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

    if (CONFIG.exportResults) {
      const report = {
        auditedAt: new Date().toISOString(),
        summary: {
          total: all.length,
          legitimate: legitimate.length,
          suspicious: suspicious.length,
          fakes: fakes.length,
          followBack: followBack.length,
        },
        followers: all,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-follower-audit-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('\n📥 Full audit report downloaded as JSON');
    }
  };

  run();
})();
