// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        downloadAccountData.js
 * @title       Download Account Data
 * @description Request X's official data archive, report its status, and download it when it is ready.
 * @category    profile
 * @page        x.com/settings/download_your_data
 * @writes      false
 * @aliases     scripts/downloadAccountData.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * Usage:
 * 1. Go to https://x.com/settings/download_your_data
 * 2. Open the Developer Console (F12)
 * 3. Paste browser/downloadAccountData.js into the Developer Console and run it
 * Set CONFIG.monitorWhilePreparing to true to keep the tab polling while the archive
 * is being prepared and download it as soon as it is ready.
 */
(() => {
  const CONFIG = {
    checkInterval: 30000, // Check every 30 seconds
    maxChecks: 120,       // Stop after 60 minutes
    autoDownload: true,
    monitorWhilePreparing: false, // Keep checking every checkInterval while the archive is prepared
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const run = async () => {
    console.log('📦 DOWNLOAD ACCOUNT DATA - XActions by nichxbt');

    if (!window.location.href.includes('/download_your_data') && !window.location.href.includes('/your_twitter_data')) {
      console.error('❌ Navigate to x.com/settings/download_your_data first!');
      console.log('📍 Or go to: Settings > Your account > Download an archive of your data');
      return;
    }

    console.log('ℹ️ This script helps trigger and monitor Twitter\'s official data export.\n');

    // Look for the request button
    const buttons = document.querySelectorAll('button, [role="button"]');
    let requestBtn = null;
    let downloadBtn = null;

    for (const btn of buttons) {
      const text = btn.textContent.toLowerCase();
      if (text.includes('request') && text.includes('archive')) {
        requestBtn = btn;
      }
      if (text.includes('download') && (text.includes('archive') || text.includes('data'))) {
        downloadBtn = btn;
      }
    }

    if (downloadBtn) {
      console.log('✅ Your data archive is ready!');
      if (CONFIG.autoDownload) {
        downloadBtn.click();
        console.log('📥 Download started...');
      } else {
        console.log('💡 Click the download button to save your archive.');
      }
      return;
    }

    if (requestBtn) {
      console.log('📤 Requesting data archive...');
      requestBtn.click();
      await sleep(2000);
      console.log('✅ Archive requested! Twitter will prepare your data.');
      console.log('⏳ This usually takes 24-48 hours.');
      console.log('📧 You\'ll receive an email when it\'s ready.');
      console.log('\n💡 Come back to this page later to download.');
    } else {
      console.log('⏳ Checking current status...');

      // Look for status indicators
      const pageText = document.body.textContent.toLowerCase();
      if ((pageText.includes('preparing') || pageText.includes('processing')) && CONFIG.monitorWhilePreparing) {
        console.log('🔄 Your data is being prepared.');
        console.log(`⏳ Will check every ${CONFIG.checkInterval / 1000}s (up to ${Math.round(CONFIG.maxChecks * CONFIG.checkInterval / 60000)} min)...\n`);

        let checks = 0;
        while (checks < CONFIG.maxChecks) {
          await sleep(CONFIG.checkInterval);
          checks++;

          let readyBtn = null;
          for (const btn of document.querySelectorAll('button, [role="button"]')) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('download') && (text.includes('archive') || text.includes('data'))) readyBtn = btn;
          }
          if (readyBtn) {
            console.log('🎉 Archive is ready!');
            if (CONFIG.autoDownload) {
              readyBtn.click();
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
      } else if (pageText.includes('preparing') || pageText.includes('processing')) {
        console.log('🔄 Your data is being prepared. Check back later.');
        console.log('💡 Set CONFIG.monitorWhilePreparing = true to keep checking from this tab.');
      } else if (pageText.includes('expired')) {
        console.log('⚠️ Previous archive has expired. You need to request a new one.');
      } else {
        console.log('ℹ️ Could not determine status. Look for the "Request archive" button on the page.');
        console.log('📍 Settings > Your account > Download an archive of your data');
      }
    }
  };

  run();
})();
