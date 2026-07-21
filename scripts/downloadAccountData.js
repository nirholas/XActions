// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/downloadAccountData.js
// Browser console script for triggering X/Twitter's official data archive download
// Paste in DevTools console on x.com/settings/download_your_data
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    checkInterval: 5000,      // Check for button readiness (ms)
    maxChecks: 60,            // Max checks before giving up
    autoDownload: true,       // Click download button automatically
  };
  // =============================================

  const findButton = (keywords) => {
    const buttons = document.querySelectorAll('button, [role="button"]');
    for (const btn of buttons) {
      const text = btn.textContent.toLowerCase();
      if (keywords.every(k => text.includes(k))) return btn;
    }
    return null;
  };

  const run = async () => {
    console.log('📦 DOWNLOAD ACCOUNT DATA — XActions by nichxbt');
    console.log('━'.repeat(50));

    if (!window.location.href.includes('/download_your_data') && !window.location.href.includes('/your_twitter_data')) {
      console.error('❌ Navigate to x.com/settings/download_your_data first!');
      console.log('📍 Settings → Your account → Download an archive of your data');
      return;
    }

    console.log('\nℹ️ Monitoring for archive buttons...\n');

    // Check for download button (archive ready)
    const downloadBtn = findButton(['download']);
    if (downloadBtn && (downloadBtn.textContent.toLowerCase().includes('archive') || downloadBtn.textContent.toLowerCase().includes('data'))) {
      console.log('✅ Your data archive is ready!');
      if (CONFIG.autoDownload) {
        downloadBtn.click();
        console.log('📥 Download started!');
      } else {
        console.log('💡 Click the download button to save your archive.');
      }
      return;
    }

    // Check for request button
    const requestBtn = findButton(['request']);
    if (requestBtn) {
      console.log('📤 Found "Request archive" button.');
      requestBtn.click();
      await sleep(2000);
      console.log('✅ Archive requested!');
      console.log('⏳ Twitter will prepare your data (usually 24-48 hours).');
      console.log('📧 You\'ll receive an email when ready.');
      console.log('\n💡 Come back to this page later to download.');
      return;
    }

    // Monitor for readiness
    console.log('⏳ No buttons detected yet. Monitoring page...');

    const pageText = document.body.textContent.toLowerCase();
    if (pageText.includes('preparing') || pageText.includes('processing')) {
      console.log('🔄 Your data is being prepared.');
      console.log(`⏳ Will check every ${CONFIG.checkInterval / 1000}s (up to ${Math.round(CONFIG.maxChecks * CONFIG.checkInterval / 60000)} min)...\n`);

      let checks = 0;
      while (checks < CONFIG.maxChecks) {
        await sleep(CONFIG.checkInterval);
        checks++;

        const btn = findButton(['download']);
        if (btn) {
          console.log('🎉 Archive is ready!');
          if (CONFIG.autoDownload) {
            btn.click();
            console.log('📥 Download started!');
          } else {
            console.log('💡 Click the download button to save.');
          }
          return;
        }

        if (checks % 6 === 0) {
          console.log(`   ⏳ Still waiting... (${checks}/${CONFIG.maxChecks} checks)`);
        }
      }

      console.log('⏱️ Max checks reached. Archive may not be ready yet.');
      console.log('💡 Try again later or check your email for a notification.');
    } else if (pageText.includes('expired')) {
      console.log('⚠️ Previous archive expired. Request a new one.');
    } else {
      console.log('ℹ️ Could not determine status.');
      console.log('📍 Look for "Request archive" on: Settings → Your account → Download data');
    }

    console.log('');
  };

  run();
})();
