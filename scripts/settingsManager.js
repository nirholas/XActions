// scripts/settingsManager.js
// Browser console script for exporting settings and toggling protection on X/Twitter
// Paste in DevTools console on x.com/settings
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'export',           // 'export' | 'toggleProtect'
    dryRun: true,               // SET FALSE TO EXECUTE (for toggleProtect)
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

  const exportSettings = async () => {
    console.log('📋 Exporting settings...');

    // Scrape settings links and toggles from the page
    const links = Array.from(document.querySelectorAll('a[href^="/settings/"]')).map(link => ({
      text: link.textContent?.trim() || '',
      href: link.getAttribute('href') || '',
    }));

    const switches = Array.from(document.querySelectorAll('[role="switch"]')).map(sw => ({
      label: sw.closest('[data-testid]')?.textContent?.trim()?.substring(0, 100) || sw.parentElement?.textContent?.trim()?.substring(0, 100) || '',
      enabled: sw.getAttribute('aria-checked') === 'true',
    }));

    const settings = {
      exportedAt: new Date().toISOString(),
      currentUrl: window.location.href,
      settingsSections: links.filter(l => l.text),
      toggles: switches,
    };

    console.log(`   📄 Found ${links.length} settings sections, ${switches.length} toggles`);
    download(settings, `xactions-settings-${new Date().toISOString().slice(0, 10)}.json`);
    console.log('✅ Settings exported');
  };

  const toggleProtect = async () => {
    console.log('🔒 Toggling account protection...');

    // Navigate to audience/tagging if not already there
    if (!window.location.href.includes('audience_and_tagging')) {
      const link = document.querySelector('a[href="/settings/audience_and_tagging"]');
      if (link) { link.click(); await sleep(2000); }
      else {
        window.location.href = 'https://x.com/settings/audience_and_tagging';
        await sleep(3000);
      }
    }

    const toggle = document.querySelector('[data-testid="protectedTweets"]') || document.querySelector('[role="switch"]');
    if (!toggle) {
      console.error('❌ Protection toggle not found');
      return;
    }

    const currentState = toggle.getAttribute('aria-checked') === 'true';
    console.log(`   Current state: ${currentState ? '🔒 Protected' : '🔓 Public'}`);

    if (CONFIG.dryRun) {
      console.log(`   📝 Would ${currentState ? 'unprotect' : 'protect'} account`);
      return;
    }

    toggle.click();
    await sleep(1000);

    // Confirm if dialog appears
    const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (confirmBtn) { confirmBtn.click(); await sleep(1500); }

    const newState = !currentState;
    console.log(`✅ Account is now ${newState ? '🔒 Protected' : '🔓 Public'}`);
  };

  const run = async () => {
    console.log('⚙️ SETTINGS MANAGER — XActions by nichxbt\n');

    if (!window.location.href.includes('/settings')) {
      console.error('❌ Navigate to x.com/settings first!');
      return;
    }

    if (CONFIG.action === 'export') await exportSettings();
    else if (CONFIG.action === 'toggleProtect') await toggleProtect();
    else console.error(`❌ Unknown action: ${CONFIG.action}`);

    console.log('\n🏁 Done!');
  };

  run();
})();
