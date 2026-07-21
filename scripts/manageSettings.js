// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/manageSettings.js
// Browser console script to export and audit X/Twitter settings
// Paste in DevTools console on x.com/settings
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const run = async () => {
    console.log('⚙️ XActions Settings Auditor');
    console.log('============================');

    const settings = {
      sections: [],
      toggles: [],
      links: [],
    };

    // Scrape all setting links
    document.querySelectorAll('a[href^="/settings/"]').forEach(link => {
      const text = link.textContent?.trim() || '';
      const href = link.getAttribute('href') || '';
      if (text && href) {
        settings.links.push({ text: text.substring(0, 100), href });
      }
    });

    // Scrape all toggles/switches
    document.querySelectorAll('[role="switch"]').forEach(sw => {
      const label = sw.closest('[data-testid]')?.textContent?.trim() ||
                    sw.parentElement?.textContent?.trim() || 'Unknown';
      const enabled = sw.getAttribute('aria-checked') === 'true';
      settings.toggles.push({
        label: label.substring(0, 100),
        enabled,
      });
    });

    // Scrape section headers
    document.querySelectorAll('[role="heading"], h2, h3').forEach(heading => {
      const text = heading.textContent?.trim();
      if (text) settings.sections.push(text);
    });

    console.log(`\n📋 Settings overview:`);
    console.log(`  📁 ${settings.links.length} setting pages`);
    console.log(`  🔘 ${settings.toggles.length} toggles found`);
    
    if (settings.toggles.length > 0) {
      console.log('\n🔘 Toggle states:');
      settings.toggles.forEach(t => {
        console.log(`  ${t.enabled ? '✅' : '❌'} ${t.label}`);
      });
    }

    console.log('\n📁 Setting pages:');
    settings.links.forEach(l => {
      console.log(`  → ${l.text}: ${l.href}`);
    });

    settings.scrapedAt = new Date().toISOString();
    settings.url = window.location.href;

    console.log('\n📦 Full JSON:');
    console.log(JSON.stringify(settings, null, 2));

    try {
      await navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
      console.log('\n✅ Copied to clipboard!');
    } catch (e) {}
  };

  run();
})();
