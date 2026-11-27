// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        settingsManager.js
 * @title       Settings Manager
 * @description Export and audit the settings pages and toggle states on x.com/settings, or toggle protected posts, dry run by default.
 * @category    profile
 * @page        x.com/settings or x.com/settings/audience_and_tagging
 * @writes      false
 * @aliases     scripts/manageSettings.js, scripts/settingsManager.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Settings Manager on X - by nichxbt
// Browser console script for exporting settings and toggling protection on X/Twitter
// 1. Go to x.com/settings (or any settings page you want to audit)
// 2. Open the Developer Console (F12)
// 3. Set CONFIG.action: 'export' downloads the settings pages, section
//    headers and toggle states as JSON; 'toggleProtect' flips "Protect your
//    posts" (dryRun: true only reports what it would do)
// 4. Paste browser/settingsManager.js into the Developer Console and run it

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'export',           // 'export' | 'toggleProtect'
    dryRun: true,               // SET FALSE TO EXECUTE (for toggleProtect)
    logDetails: false,          // export: also list every toggle state and settings page in the console
    logJSON: false,             // export: also print the full JSON to the console
    copyToClipboard: false,     // export: also copy the JSON to the clipboard
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
      text: link.textContent?.trim()?.substring(0, 100) || '',
      href: link.getAttribute('href') || '',
    }));

    const switches = Array.from(document.querySelectorAll('[role="switch"]')).map(sw => ({
      label: sw.closest('[data-testid]')?.textContent?.trim()?.substring(0, 100) || sw.parentElement?.textContent?.trim()?.substring(0, 100) || '',
      enabled: sw.getAttribute('aria-checked') === 'true',
    }));

    // Section headers on the current settings page
    const headings = Array.from(document.querySelectorAll('[role="heading"], h2, h3'))
      .map(h => h.textContent?.trim() || '')
      .filter(Boolean);

    const settings = {
      exportedAt: new Date().toISOString(),
      currentUrl: window.location.href,
      settingsSections: links.filter(l => l.text),
      toggles: switches,
      headings,
    };

    console.log(`   📄 Found ${links.length} settings sections, ${switches.length} toggles`);

    if (CONFIG.logDetails) {
      if (switches.length > 0) {
        console.log('\n🔘 Toggle states:');
        switches.forEach(t => console.log(`  ${t.enabled ? '✅' : '❌'} ${t.label || 'Unknown'}`));
      }
      console.log('\n📁 Setting pages:');
      settings.settingsSections.forEach(l => console.log(`  → ${l.text}: ${l.href}`));
    }

    if (CONFIG.logJSON) {
      console.log('\n📦 Full JSON:');
      console.log(JSON.stringify(settings, null, 2));
    }

    if (CONFIG.copyToClipboard) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
        console.log('✅ Copied to clipboard!');
      } catch (e) {
        console.warn('⚠️ Could not copy to clipboard.');
      }
    }

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
        console.log('   ↪️ Opening x.com/settings/audience_and_tagging; paste the script again once it loads.');
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
    console.log('⚙️ SETTINGS MANAGER - XActions by nichxbt\n');

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
