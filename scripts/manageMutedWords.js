// scripts/manageMutedWords.js
// Browser console script for bulk-adding muted words on X/Twitter
// Paste in DevTools console on x.com/settings/muted_keywords
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    wordsToMute: [
      'crypto',
      'nft',
      'giveaway',
      // Add more words/phrases here
    ],
    duration: 'Forever',      // 'Forever', '24h', '7d', '30d'
    dryRun: true,             // SET FALSE TO EXECUTE
    delay: 1500,              // ms between words
  };
  // =============================================

  const results = { muted: [], failed: [] };

  const run = async () => {
    console.log('🔇 MANAGE MUTED WORDS — XActions by nichxbt');

    if (CONFIG.wordsToMute.length === 0) {
      console.error('❌ No words to mute! Edit CONFIG.wordsToMute array.');
      return;
    }

    console.log(`📋 Words to mute: ${CONFIG.wordsToMute.length}`);
    CONFIG.wordsToMute.forEach((w, i) => console.log(`   ${i + 1}. "${w}"`));
    console.log(`⏱️ Duration: ${CONFIG.duration}`);

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN — Set CONFIG.dryRun = false to actually mute words.');
      return;
    }

    if (!window.location.href.includes('/muted_keywords') && !window.location.href.includes('/muted')) {
      console.error('❌ Navigate to x.com/settings/muted_keywords first!');
      return;
    }

    for (const word of CONFIG.wordsToMute) {
      try {
        // Click "+" / Add button
        const addBtn = document.querySelector('[data-testid="addMutedWord"]');
        if (addBtn) {
          addBtn.click();
          await sleep(1000);
        }

        // Type the word into input
        const input = document.querySelector('input[name="keyword"]');
        if (!input) {
          console.error(`❌ Input not found for "${word}"`);
          results.failed.push(word);
          continue;
        }

        input.focus();
        input.value = '';
        document.execCommand('insertText', false, word);
        await sleep(500);

        // Select duration
        const durationOptions = document.querySelectorAll('[role="radio"], [role="option"]');
        for (const opt of durationOptions) {
          const text = opt.textContent.toLowerCase();
          if (
            (CONFIG.duration.toLowerCase() === 'forever' && text.includes('forever')) ||
            (CONFIG.duration === '24h' && text.includes('24')) ||
            (CONFIG.duration === '7d' && text.includes('7')) ||
            (CONFIG.duration === '30d' && text.includes('30'))
          ) {
            opt.click();
            break;
          }
        }
        await sleep(300);

        // Click Save
        const saveBtn = document.querySelector('[data-testid="settingsSave"]');
        if (saveBtn) {
          saveBtn.click();
          results.muted.push(word);
          console.log(`🔇 Muted word: "${word}"`);
        } else {
          results.failed.push(word);
          console.warn(`⚠️ Save button not found for "${word}"`);
        }

        await sleep(CONFIG.delay);
      } catch (e) {
        results.failed.push(word);
        console.warn(`⚠️ Failed to mute: "${word}"`);
      }
    }

    console.log(`\n✅ Done! Muted: ${results.muted.length} | Failed: ${results.failed.length}`);
  };

  run();
})();
