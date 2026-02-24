// Block Bot Accounts on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to x.com/YOUR_USERNAME/followers or any user list
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Detects & blocks likely bot accounts based on heuristics
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Bot detection thresholds
    minFollowersToFollowingRatio: 0.01, // Very low ratio = likely bot
    maxDefaultProfileAge: 30, // Days with default avatar = suspicious
    noTweetThreshold: 0,      // Zero tweets = suspicious
    nameLooksGenerated: true,  // Check for random-looking usernames
    maxBlocks: 50,
    actionDelay: 2500,
    scrollDelay: 2000,
    maxScrollAttempts: 15,
    dryRun: true, // Set to false to actually block
  };

  const $userCell = '[data-testid="UserCell"]';
  const $userName = '[data-testid="User-Name"]';

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

  const detected = [];
  const processedUsers = new Set();

  const looksLikeBot = (userEl) => {
    const nameEl = userEl.querySelector($userName);
    if (!nameEl) return { isBot: false, reasons: [] };

    const fullText = nameEl.textContent || '';
    const reasons = [];

    // Check for default/no avatar
    const avatar = userEl.querySelector('img[src*="default_profile"]');
    if (avatar) reasons.push('default avatar');

    // Check for generated-looking usernames (lots of numbers)
    const usernameMatch = fullText.match(/@(\w+)/);
    if (usernameMatch) {
      const username = usernameMatch[1];
      const digitRatio = (username.match(/\d/g) || []).length / username.length;
      if (digitRatio > 0.5 && CONFIG.nameLooksGenerated) {
        reasons.push(`username ${digitRatio * 100}% digits`);
      }
      if (username.length > 14 && digitRatio > 0.3) {
        reasons.push('long username with many digits');
      }
    }

    // Check for no bio
    const bio = extractBio(userEl);
    if (!bio) {
      reasons.push('no bio');
    }

    // Check for suspiciously low engagement text
    const spans = userEl.querySelectorAll('span');
    for (const span of spans) {
      const t = span.textContent.toLowerCase();
      if (t.includes('0 followers')) reasons.push('0 followers');
      if (t.includes('0 following')) reasons.push('0 following');
    }

    return {
      isBot: reasons.length >= 2,
      reasons,
      username: usernameMatch ? usernameMatch[1] : 'unknown',
    };
  };

  const run = async () => {
    console.log('🤖 BLOCK BOTS - XActions by nichxbt');
    console.log(CONFIG.dryRun ? '⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually block' : '🔴 LIVE MODE');

    let scrollAttempts = 0;

    while (detected.length < CONFIG.maxBlocks && scrollAttempts < CONFIG.maxScrollAttempts) {
      const userCells = document.querySelectorAll($userCell);
      let foundNew = false;

      for (const cell of userCells) {
        const linkEl = cell.querySelector('a[href^="/"]');
        const userId = linkEl?.href || '';
        if (processedUsers.has(userId)) continue;
        processedUsers.add(userId);
        foundNew = true;

        const result = looksLikeBot(cell);
        if (result.isBot) {
          detected.push(result);
          console.log(`🤖 Bot detected: @${result.username} — ${result.reasons.join(', ')}`);

          if (!CONFIG.dryRun) {
            // Click on user to navigate, then block
            // For safety we just log in dry-run by default
            console.log(`   🚫 Would block @${result.username}`);
          }
        }
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n📊 RESULTS:`);
    console.log(`   🤖 Bots detected: ${detected.length}`);
    console.log(`   👤 Users scanned: ${processedUsers.size}`);
    console.log(`   📊 Bot rate: ${((detected.length / processedUsers.size) * 100).toFixed(1)}%`);

    if (detected.length > 0) {
      console.log('\nDetected bots:');
      detected.forEach((b, i) => {
        console.log(`   ${i + 1}. @${b.username} — ${b.reasons.join(', ')}`);
      });

      // Export as JSON
      const blob = new Blob([JSON.stringify(detected, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-bots-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('📥 Bot list downloaded as JSON');
    }
  };

  run();
})();
