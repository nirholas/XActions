// Download Account Data from X - by nichxbt
// https://github.com/nirholas/xactions
// Trigger Twitter's built-in data download and monitor progress
// 1. Go to https://x.com/settings/download_your_data
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    checkInterval: 30000, // Check every 30 seconds
    maxChecks: 120,       // Stop after 60 minutes
    autoDownload: true,
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
      if (pageText.includes('preparing') || pageText.includes('processing')) {
        console.log('🔄 Your data is being prepared. Check back later.');
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
