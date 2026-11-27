// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        reportSpam.js
 * @title       Report Spam
 * @description Report a list of spam or bot accounts, or scan a user list for spam signals and report the matches, dry run by default.
 * @category    safety
 * @page        x.com/* or x.com/<you>/followers
 * @writes      true
 * @aliases     scripts/reportSpam.js, scripts/twitter/report-spam.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Report Spam Accounts on X - by nichxbt
// https://github.com/nirholas/xactions
// Report multiple spam/bot accounts at once
// 1. Go to x.com (any page)
//    For scan mode (CONFIG.scanList.enabled), go to your followers or a post's
//    likes/reposts list instead: the script scans the visible user cells.
// 2. Edit the CONFIG.usersToReport array below (or enable scanList)
// 3. Open the Developer Console (F12)
// 4. Paste browser/reportSpam.js into the Developer Console and run it
//
// dryRun is ON by default and only lists who would be reported.
// maxReports (10 by default) caps how many accounts one run reports.
// ⚠️ Only report accounts that genuinely violate X's rules.
//    False reports can result in action against YOUR account.
//
// Last Updated: 27 November 2026
(() => {
  const CONFIG = {
    usersToReport: [
      // 'spammer1',
      // 'spammer2',
    ],
    // Report reason: 'spam', 'abuse', 'fake'
    reason: 'spam',
    actionDelay: 5000,
    blockAfterReport: false,  // Also block the user after reporting (from the post-report flow)
    dryRun: true,
    maxReports: 10,           // Max accounts to report per run
    // Scan mode: detect spam in the user list on screen instead of using usersToReport
    scanList: {
      enabled: false,
      spamKeywords: [
        'free giveaway',
        'click my link',
        'dm for cashapp',
        'send nudes',
        'sexchat',
        'hot girls in',
        'make $1000 daily',
        'guaranteed profits',
      ],
      flagDefaultAvatar: true,    // Default profile picture adds to the spam score
      flagExternalLinks: false,   // A link in the bio adds to the spam score
      minSpamScore: 30,           // A bio keyword scores 30, default avatar 10, external link 5
      scrollDelay: 1500,
      maxScrolls: 20,
    },
    saveToLocalStorage: false,  // Save detected/reported accounts to localStorage "xactions_spam_reports"
  };

  const $moreButton = '[data-testid="userActions"]';
  const $reportOption = '[data-testid="report"]';
  const $userCell = '[data-testid="UserCell"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const results = { reported: [], failed: [], blocked: [] };

  const matchesReason = (text) =>
    (CONFIG.reason === 'spam' && text.includes('spam')) ||
    (CONFIG.reason === 'abuse' && (text.includes('abuse') || text.includes('harass'))) ||
    (CONFIG.reason === 'fake' && (text.includes('fake') || text.includes('impersonat')));

  const blockAfter = async (username) => {
    if (!CONFIG.blockAfterReport) return;
    await sleep(1000);
    // Check if there's a block option in the post-report flow
    const blockOptions = document.querySelectorAll('button, [role="button"]');
    for (const opt of blockOptions) {
      if (/block/i.test(opt.textContent) && !/unblock/i.test(opt.textContent)) {
        opt.click();
        await sleep(600);
        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(500);
        }
        results.blocked.push(username);
        console.log(`🚫 Also blocked @${username}`);
        break;
      }
    }
  };

  const saveLog = (entries) => {
    if (!CONFIG.saveToLocalStorage) return;
    const storageKey = 'xactions_spam_reports';
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      console.log(`\n💾 Results saved to localStorage "${storageKey}"`);
    } catch (e) {
      console.warn(`⚠️ Could not save to localStorage: ${e.message}`);
    }
  };

  const reportUser = async (username) => {
    try {
      window.location.href = `https://x.com/${username}`;
      await sleep(3000);

      // Wait for profile to load
      let attempts = 0;
      while (!document.querySelector($moreButton) && attempts < 10) {
        await sleep(500);
        attempts++;
      }

      const moreBtn = document.querySelector($moreButton);
      if (!moreBtn) {
        console.warn(`⚠️ @${username}: Profile not found`);
        results.failed.push(username);
        return;
      }

      moreBtn.click();
      await sleep(1000);

      // Find report option
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      let reportItem = null;
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('report')) {
          reportItem = item;
          break;
        }
      }

      if (reportItem) {
        reportItem.click();
        await sleep(1500);

        // Navigate through the report flow
        // Select the spam reason
        const reasonOptions = document.querySelectorAll('[role="radio"], [role="option"], button');
        for (const opt of reasonOptions) {
          const text = opt.textContent.toLowerCase();
          if (matchesReason(text)) {
            opt.click();
            await sleep(800);
            break;
          }
        }

        // Click submit/next
        const submitBtn = document.querySelector('[data-testid="ChoiceSelectionNextButton"]');
        if (submitBtn) submitBtn.click();

        results.reported.push(username);
        console.log(`🚩 Reported @${username} for ${CONFIG.reason}`);
        await blockAfter(username);
      } else {
        document.body.click();
        results.failed.push(username);
        console.warn(`⚠️ @${username}: Report option not found`);
      }

      await sleep(1000);
    } catch (e) {
      results.failed.push(username);
      console.warn(`⚠️ Error reporting @${username}`);
    }
  };

  // Report from a user cell on the current list page (scan mode)
  const reportFromCell = async (spam) => {
    // X virtualizes long lists: a cell captured early in the scan can be
    // detached by now, and clicking a detached node is a silent no-op.
    if (!document.body.contains(spam.element)) {
      console.log(`   ⚠️ Skipped @${spam.username}: row scrolled out of the DOM. Re-run closer to this account.`);
      results.failed.push(spam.username);
      return;
    }

    try {
      spam.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);

      const moreButton = spam.element.querySelector($moreButton);
      if (!moreButton) {
        console.warn(`⚠️ @${spam.username}: no actions menu on this row`);
        results.failed.push(spam.username);
        return;
      }
      moreButton.click();
      await sleep(500);

      const reportOption = document.querySelector($reportOption);
      if (reportOption) {
        reportOption.click();
        await sleep(1000);

        // Match only short, clickable labels so a longer descriptive paragraph
        // that also contains the reason word isn't clicked instead.
        const reasonOption = Array.from(document.querySelectorAll('span'))
          .find(el => {
            const text = el.textContent.trim().toLowerCase();
            if (!matchesReason(text) || text.length > 40) return false;
            return !!el.closest('[role="radio"], [role="menuitem"], [role="button"], label');
          });

        let submitted = false;
        if (reasonOption) {
          reasonOption.click();
          await sleep(500);
          const submitBtn = document.querySelector('[data-testid="ChoiceSelectionNextButton"]');
          if (submitBtn) {
            submitBtn.click();
            submitted = true;
            results.reported.push(spam.username);
            console.log(`🚩 Reported @${spam.username} for ${CONFIG.reason}`);
            await blockAfter(spam.username);
          }
        }
        if (!submitted) {
          results.failed.push(spam.username);
          console.warn(`⚠️ @${spam.username}: could not complete the report flow`);
        }

        // Close dialog
        const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
        if (closeBtn) closeBtn.click();
      } else {
        results.failed.push(spam.username);
        console.warn(`⚠️ @${spam.username}: Report option not found`);
      }

      // Close menu
      document.body.click();
    } catch (e) {
      results.failed.push(spam.username);
      console.warn(`⚠️ Failed to report @${spam.username}: ${e.message}`);
    }
  };

  const scanForSpam = async () => {
    const S = CONFIG.scanList;
    console.log('🔍 Looking for spam indicators:');
    S.spamKeywords.forEach(kw => console.log(`   • "${kw}"`));
    console.log('');

    const scanned = new Set();
    const spamAccounts = [];
    let retries = 0;
    let scrollCount = 0;

    while (scrollCount < S.maxScrolls && retries < 3) {
      const prevSize = scanned.size;

      document.querySelectorAll($userCell).forEach(cell => {
        try {
          const link = cell.querySelector('a[href^="/"]');
          const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
          if (!username || scanned.has(username)) return;
          scanned.add(username);

          const reasons = [];
          let spamScore = 0;

          const bioEl = cell.querySelector('[data-testid="UserDescription"]');
          const bio = (bioEl?.textContent || '').toLowerCase();

          S.spamKeywords.forEach(kw => {
            if (bio.includes(kw.toLowerCase())) {
              spamScore += 30;
              reasons.push(`Bio: "${kw}"`);
            }
          });

          if (S.flagDefaultAvatar && cell.querySelector('img[src*="default_profile"]')) {
            spamScore += 10;
            reasons.push('Default avatar');
          }

          if (S.flagExternalLinks && bio.match(/https?:\/\//)) {
            spamScore += 5;
            reasons.push('External link in bio');
          }

          if (spamScore >= S.minSpamScore) {
            spamAccounts.push({ username, bio: bioEl?.textContent || '', spamScore, reasons, element: cell });
          }
        } catch {
          // One malformed cell must never abort the scan for every other cell in this pass.
        }
      });

      if (scanned.size === prevSize) retries++;
      else retries = 0;

      console.log(`   Scanned: ${scanned.size} | Spam found: ${spamAccounts.length}`);

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(S.scrollDelay);
      scrollCount++;
    }

    console.log(`\n✅ Scan complete! Total scanned: ${scanned.size} | Spam accounts: ${spamAccounts.length}\n`);
    spamAccounts.sort((a, b) => b.spamScore - a.spamScore);

    spamAccounts.forEach((s, i) => {
      console.log(`\n${i + 1}. @${s.username} (Score: ${s.spamScore})`);
      console.log(`   Reasons: ${s.reasons.join(', ')}`);
      console.log(`   Bio: "${s.bio.slice(0, 80)}${s.bio.length > 80 ? '...' : ''}"`);
      console.log(`   https://x.com/${s.username}`);
    });

    return spamAccounts;
  };

  const run = async () => {
    console.log('🚩 REPORT SPAM - XActions by nichxbt');
    console.log('⚠️  IMPORTANT: Only report genuine spam/abuse! False reports can result in action against YOUR account.');

    if (CONFIG.scanList.enabled) {
      const spamAccounts = await scanForSpam();
      if (spamAccounts.length === 0) {
        console.log('🎉 No spam accounts detected!');
        return;
      }

      if (CONFIG.dryRun) {
        console.log('\n⚠️ DRY RUN MODE - Review each account manually, then set CONFIG.dryRun = false to report.');
      } else {
        const toReport = spamAccounts.slice(0, CONFIG.maxReports);
        console.log(`\n📋 Reporting ${toReport.length} of ${spamAccounts.length} (maxReports: ${CONFIG.maxReports}, reason: ${CONFIG.reason})`);
        for (const spam of toReport) {
          console.log(`\n⏳ Processing @${spam.username}...`);
          await reportFromCell(spam);
          await sleep(CONFIG.actionDelay);
        }
      }

      saveLog(spamAccounts.map(s => ({
        username: s.username,
        spamScore: s.spamScore,
        reasons: s.reasons,
        reported: results.reported.includes(s.username),
        timestamp: new Date().toISOString(),
      })));
    } else {
      if (CONFIG.usersToReport.length === 0) {
        console.error('❌ No users to report! Edit CONFIG.usersToReport.');
        return;
      }

      if (CONFIG.dryRun) {
        console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually report');
        CONFIG.usersToReport.forEach((u, i) => console.log(`   ${i + 1}. @${u} (${CONFIG.reason})`));
        if (CONFIG.usersToReport.length > CONFIG.maxReports) {
          console.log(`   Only the first ${CONFIG.maxReports} would be reported (maxReports).`);
        }
        return;
      }

      const toReport = CONFIG.usersToReport.slice(0, CONFIG.maxReports);
      console.log(`📋 Users to report: ${toReport.length} (reason: ${CONFIG.reason}, block after: ${CONFIG.blockAfterReport})`);

      for (const username of toReport) {
        console.log(`\n⏳ Processing @${username}...`);
        await reportUser(username);
        await sleep(CONFIG.actionDelay);
      }

      saveLog(results.reported.map(username => ({ username, reported: true, timestamp: new Date().toISOString() })));
    }

    if (CONFIG.dryRun) return;
    console.log('\n📊 RESULTS:');
    console.log(`   🚩 Reported: ${results.reported.length}`);
    if (CONFIG.blockAfterReport) console.log(`   🚫 Blocked: ${results.blocked.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
  };

  run();
})();
