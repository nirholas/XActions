// scripts/blockBots.js
// Browser console script for detecting and blocking bot accounts on X/Twitter
// Paste in DevTools console on x.com/USERNAME/followers
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxBlocks: 10,            // Max bots to block
    dryRun: true,             // SET FALSE TO EXECUTE
    delay: 3000,              // ms between blocks
    scrollDelay: 2000,        // ms to wait after scroll
    maxScrollAttempts: 15,    // Give up after N scrolls with no new users
    thresholds: {
      minReasons: 2,          // Min reasons to flag as bot
      digitRatio: 0.5,        // Username digit ratio threshold
      longNameDigits: 0.3,    // Digit ratio for usernames > 14 chars
    },
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

  const processed = new Set();
  const detected = [];
  let blocked = 0;

  const extractBio = (cell) => {
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    if (autoDir?.textContent?.trim()?.length >= 10) return autoDir.textContent.trim();
    return '';
  };

  const scoreBot = (cell) => {
    const nameEl = cell.querySelector('[data-testid="User-Name"]');
    if (!nameEl) return { isBot: false, reasons: [], username: null };

    const fullText = nameEl.textContent || '';
    const reasons = [];

    // Default avatar check
    const avatar = cell.querySelector('img[src*="default_profile"]');
    if (avatar) reasons.push('default avatar');

    // Username analysis
    const usernameMatch = fullText.match(/@(\w+)/);
    const username = usernameMatch ? usernameMatch[1] : null;

    if (username) {
      const digitRatio = (username.match(/\d/g) || []).length / username.length;
      if (digitRatio > CONFIG.thresholds.digitRatio) reasons.push(`${(digitRatio * 100).toFixed(0)}% digits`);
      if (username.length > 14 && digitRatio > CONFIG.thresholds.longNameDigits) reasons.push('long name + digits');
    }

    // No bio
    const bio = extractBio(cell);
    if (!bio) reasons.push('no bio');

    // Zero followers/following
    const spans = cell.querySelectorAll('span');
    for (const span of spans) {
      const t = span.textContent.toLowerCase();
      if (t.includes('0 followers')) reasons.push('0 followers');
      if (t.includes('0 following')) reasons.push('0 following');
    }

    return {
      isBot: reasons.length >= CONFIG.thresholds.minReasons,
      reasons,
      username,
    };
  };

  const run = async () => {
    console.log('🤖 BLOCK BOTS — XActions by nichxbt');
    console.log(`⚙️ Max blocks: ${CONFIG.maxBlocks} | Dry run: ${CONFIG.dryRun}`);

    let scrollAttempts = 0;

    while (blocked < CONFIG.maxBlocks && scrollAttempts < CONFIG.maxScrollAttempts) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let foundNew = false;

      for (const cell of cells) {
        if (blocked >= CONFIG.maxBlocks) break;

        const linkEl = cell.querySelector('a[href^="/"]');
        const userId = linkEl?.href || '';
        if (processed.has(userId)) continue;
        processed.add(userId);
        foundNew = true;

        const result = scoreBot(cell);
        if (!result.isBot || !result.username) continue;

        detected.push(result);
        console.log(`🤖 Bot: @${result.username} — ${result.reasons.join(', ')}`);

        if (CONFIG.dryRun) {
          blocked++;
          continue;
        }

        // Block the bot
        const moreBtn = cell.querySelector('[data-testid="userActions"]');
        if (!moreBtn) continue;

        moreBtn.click();
        await sleep(800);

        const menuItems = document.querySelectorAll('[role="menuitem"]');
        let blockItem = null;
        for (const item of menuItems) {
          if (/\bblock\b/i.test(item.textContent)) { blockItem = item; break; }
        }
        if (!blockItem) { document.body.click(); await sleep(300); continue; }

        blockItem.click();
        await sleep(600);

        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(500);
          blocked++;
          console.log(`🚫 Blocked @${result.username} [${blocked}/${CONFIG.maxBlocks}]`);
        }

        await sleep(CONFIG.delay);
      }

      if (!foundNew) scrollAttempts++; else scrollAttempts = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Bots detected: ${detected.length} | Scanned: ${processed.size}`);
    console.log(`📊 Bot rate: ${((detected.length / Math.max(processed.size, 1)) * 100).toFixed(1)}%`);

    if (detected.length > 0) {
      detected.forEach((b, i) => console.log(`   ${i + 1}. @${b.username} — ${b.reasons.join(', ')}`));
      download(detected, `xactions-bots-${new Date().toISOString().slice(0, 10)}.json`);
    }
  };

  run();
})();
