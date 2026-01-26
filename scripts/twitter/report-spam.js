/**
 * ============================================================
 * 🚨 Report Spam
 * ============================================================
 * 
 * @name        report-spam.js
 * @description Report spam accounts from your followers/mentions
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your followers or a tweet's likes/retweets
 * 2. Edit CONFIG below to set detection criteria
 * 3. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 4. Paste this script and press Enter
 * 
 * ⚠️ WARNING: Only report accounts that genuinely violate Twitter's rules.
 * False reports can result in action against YOUR account.
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Spam detection keywords in bio
  spamKeywords: [
    'free giveaway',
    'click my link',
    'dm for cashapp',
    'send nudes',
    'sexchat',
    'hot girls in',
    'make $1000 daily',
    'guaranteed profits'
  ],
  
  // Flag accounts with these patterns
  detection: {
    // Default profile picture
    flagDefaultAvatar: true,
    
    // Account following way more than followers
    maxFollowingRatio: 100,
    
    // Very new accounts
    flagNewAccounts: true, // Can't easily detect from list view
    
    // Bio contains external links
    flagExternalLinks: false
  },
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 20,
  
  // Dry run - just identify, don't report
  dryRun: true,
  
  // Max to report per run
  maxReports: 10,
  
  // Delay between reports
  reportDelay: 5000
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function reportSpam() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚨 XActions — Report Spam                                   ║
║  Identify and report spam accounts                           ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - Accounts will NOT be reported           ║' : '║  🔴 LIVE MODE - Accounts WILL be reported                   ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log('⚠️  IMPORTANT: Only report genuine spam/abuse!');
  console.log('   False reports can result in action against YOUR account.\n');

  const $userCell = '[data-testid="UserCell"]';

  console.log('🔍 Looking for spam indicators:');
  CONFIG.spamKeywords.forEach(kw => console.log(`   • "${kw}"`));
  console.log('');

  const scanned = new Set();
  const spamAccounts = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < 3) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || scanned.has(username)) return;

      scanned.add(username);

      const reasons = [];
      let spamScore = 0;

      // Check bio
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const bio = (bioEl?.textContent || '').toLowerCase();

      CONFIG.spamKeywords.forEach(kw => {
        if (bio.includes(kw.toLowerCase())) {
          spamScore += 30;
          reasons.push(`Bio: "${kw}"`);
        }
      });

      // Check for default avatar
      if (CONFIG.detection.flagDefaultAvatar) {
        const avatar = cell.querySelector('img[src*="default_profile"]');
        if (avatar) {
          spamScore += 10;
          reasons.push('Default avatar');
        }
      }

      // Check for external links in bio
      if (CONFIG.detection.flagExternalLinks && bio.match(/https?:\/\//)) {
        spamScore += 5;
        reasons.push('External link in bio');
      }

      if (spamScore >= 30) {
        spamAccounts.push({
          username,
          bio: bioEl?.textContent || '',
          spamScore,
          reasons,
          element: cell
        });
      }
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} | Spam found: ${spamAccounts.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scanned.size}`);
  console.log(`   Spam accounts: ${spamAccounts.length}\n`);

  if (spamAccounts.length === 0) {
    console.log('🎉 No spam accounts detected!');
    return;
  }

  // Sort by spam score
  spamAccounts.sort((a, b) => b.spamScore - a.spamScore);

  console.log('═'.repeat(60));
  console.log('🚨 DETECTED SPAM ACCOUNTS');
  console.log('═'.repeat(60));

  spamAccounts.forEach((s, i) => {
    console.log(`\n${i + 1}. @${s.username} (Score: ${s.spamScore})`);
    console.log(`   Reasons: ${s.reasons.join(', ')}`);
    console.log(`   Bio: "${s.bio.slice(0, 80)}${s.bio.length > 80 ? '...' : ''}"`);
    console.log(`   https://x.com/${s.username}`);
  });

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE');
    console.log('═'.repeat(60));
    console.log('\nTo report these accounts:');
    console.log('1. Review each account manually');
    console.log('2. Only report if they genuinely violate Twitter rules');
    console.log('3. Set CONFIG.dryRun = false to enable reporting');
    console.log('\nOr report manually by visiting each profile.');
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🚨 REPORTING ACCOUNTS');
    console.log('═'.repeat(60));
    console.log('\n⚠️  Reporting is a serious action. Please review carefully!\n');

    const toReport = spamAccounts.slice(0, CONFIG.maxReports);
    let reported = 0;

    for (const spam of toReport) {
      console.log(`\n⏳ Processing @${spam.username}...`);

      try {
        spam.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const moreButton = spam.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          // Find report option
          const reportOption = document.querySelector('[data-testid="report"]');
          if (reportOption) {
            reportOption.click();
            await sleep(1000);

            // Select "Spam" as reason
            const spamOption = Array.from(document.querySelectorAll('span'))
              .find(el => el.textContent.toLowerCase().includes('spam'));
            
            if (spamOption) {
              spamOption.click();
              await sleep(500);

              // Submit report
              const submitBtn = document.querySelector('[data-testid="ChoiceSelectionNextButton"]');
              if (submitBtn) {
                submitBtn.click();
                reported++;
                console.log(`   ✅ Reported @${spam.username}`);
              }
            }

            // Close dialog
            const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
            if (closeBtn) closeBtn.click();
          }

          // Close menu
          document.body.click();
        }

        await sleep(CONFIG.reportDelay);
      } catch (e) {
        console.log(`   ❌ Failed to report @${spam.username}: ${e.message}`);
      }
    }

    console.log(`\n✅ Reported ${reported} accounts`);
  }

  // Save log
  const storageKey = 'xactions_spam_reports';
  const log = spamAccounts.map(s => ({
    username: s.username,
    spamScore: s.spamScore,
    reasons: s.reasons,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify(log));

  console.log('\n💾 Results saved to localStorage');

})();
