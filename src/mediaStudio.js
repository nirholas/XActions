// Media Studio — by nichxbt
// https://github.com/nirholas/XActions
// Navigate to Media Studio, upload media, manage library, and view media analytics.
//
// HOW TO USE:
// 1. Go to https://x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    autoNavigate: true,              // Navigate to Media Studio automatically
    scanLibrary: true,               // Scan and list media in library
    showAnalytics: true,             // Show media analytics summary
    maxMediaToScan: 50,              // Max media items to scan
    scrollDelay: 2000,               // ms between scroll actions
    delayBetweenActions: 1500,       // ms between UI actions
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_media_studio';

  const SELECTORS = {
    studioLink: 'a[href*="studio.x.com"]',
    mediaLibrary: '[data-testid="mediaLibrary"]',
    uploadMedia: '[data-testid="uploadMedia"]',
    mediaItem: '[data-testid="mediaItem"]',
    mediaCard: '[data-testid="mediaCard"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    analyticsTab: '[data-testid="analyticsTab"]',
    mediaGrid: '[role="grid"], [role="list"]',
  };

  const navigateToStudio = async () => {
    console.log('🚀 Navigating to Media Studio...');

    const studioLink = document.querySelector(SELECTORS.studioLink);

    if (studioLink) {
      studioLink.click();
      console.log('✅ Clicked Media Studio link.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Media Studio link not found. Opening in new tab...');
      console.log('💡 Note: Media Studio requires X Premium (Premium or Premium+ tier).');
      window.open('https://studio.x.com', '_blank');
      await sleep(CONFIG.delayBetweenActions);
    }

    const isStudio = window.location.hostname.includes('studio.x.com');
    if (isStudio) {
      console.log('✅ Media Studio loaded successfully.');
    } else {
      console.log('ℹ️ Media Studio opens in a separate tab at studio.x.com');
      console.log('💡 Run this script again on studio.x.com to scan your library.');
    }
  };

  const scanMediaLibrary = async () => {
    console.log('📚 Scanning media library...');

    const mediaItems = [];
    let previousCount = 0;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries && mediaItems.length < CONFIG.maxMediaToScan) {
      const items = document.querySelectorAll(
        `${SELECTORS.mediaItem}, ${SELECTORS.mediaCard}, [role="gridcell"], .media-item, tr[data-media-id]`
      );

      items.forEach(item => {
        const title = item.getAttribute('aria-label')
          || item.querySelector('span, p')?.textContent?.trim()
          || 'Untitled';
        const img = item.querySelector('img');
        const video = item.querySelector('video');
        const type = video ? 'video' : img ? 'image' : 'unknown';
        const src = img?.src || video?.src || '';

        const id = item.getAttribute('data-media-id') || src || title;
        if (!mediaItems.find(m => m.id === id)) {
          mediaItems.push({
            id,
            title: title.substring(0, 60),
            type,
            src: src.substring(0, 100),
          });
        }
      });

      if (mediaItems.length === previousCount) {
        retries++;
      } else {
        retries = 0;
        previousCount = mediaItems.length;
      }

      console.log(`   🔄 Found ${mediaItems.length} media items...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (mediaItems.length > 0) {
      console.log(`\n📋 Media Library (${mediaItems.length} items):`);
      console.log('─'.repeat(50));

      const images = mediaItems.filter(m => m.type === 'image');
      const videos = mediaItems.filter(m => m.type === 'video');
      const other = mediaItems.filter(m => m.type === 'unknown');

      console.log(`   🖼️  Images: ${images.length}`);
      console.log(`   🎥 Videos: ${videos.length}`);
      if (other.length > 0) console.log(`   📁 Other: ${other.length}`);

      console.log('\n📝 Recent items:');
      mediaItems.slice(0, 10).forEach((item, i) => {
        const icon = item.type === 'video' ? '🎥' : '🖼️';
        console.log(`   ${i + 1}. ${icon} ${item.title}`);
      });

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          scannedAt: new Date().toISOString(),
          count: mediaItems.length,
          items: mediaItems,
        }));
        console.log('\n💾 Media list saved to sessionStorage.');
      } catch (e) {
        // Silent fail
      }
    } else {
      console.log('ℹ️ No media items found. Your library may be empty or the page layout differs.');
    }

    return mediaItems;
  };

  const showUploadInstructions = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('📤 UPLOADING MEDIA');
    console.log('══════════════════════════════════════════════════');
    console.log('');
    console.log('   To upload media in Media Studio:');
    console.log('   1. Click the "Upload" button in the top-right');
    console.log('   2. Select your file (image, GIF, or video)');
    console.log('   3. Add title, description, and tags');
    console.log('   4. Set visibility and scheduling options');
    console.log('');
    console.log('   📏 Supported formats:');
    console.log('      Images: JPG, PNG, GIF (up to 5MB)');
    console.log('      Videos: MP4, MOV (up to 2h with Premium)');
    console.log('      GIFs:   Up to 15MB');
    console.log('══════════════════════════════════════════════════\n');

    const uploadBtn = document.querySelector(SELECTORS.uploadMedia)
      || document.querySelector('button[aria-label*="Upload"]')
      || document.querySelector('[data-testid="uploadButton"]');

    if (uploadBtn) {
      console.log('✅ Upload button found on page.');
    } else {
      console.log('ℹ️ Upload button not found — make sure you are on studio.x.com.');
    }
  };

  const showAnalytics = async () => {
    console.log('📊 Checking media analytics...');

    const analyticsTab = document.querySelector(SELECTORS.analyticsTab)
      || document.querySelector('a[href*="analytics"]')
      || document.querySelector('button[aria-label*="Analytics"]');

    if (analyticsTab) {
      analyticsTab.click();
      await sleep(CONFIG.delayBetweenActions);
      console.log('✅ Opened analytics tab.');

      const statsElements = document.querySelectorAll('[data-testid*="stat"], .analytics-metric, .stat-value');
      if (statsElements.length > 0) {
        console.log('\n📊 Media Analytics:');
        console.log('─'.repeat(40));
        statsElements.forEach(el => {
          const label = el.getAttribute('aria-label') || el.previousElementSibling?.textContent || '';
          const value = el.textContent.trim();
          if (value) console.log(`   ${label}: ${value}`);
        });
      } else {
        console.log('ℹ️ Analytics data not found in expected format.');
        console.log('💡 Check analytics directly at: https://studio.x.com/analytics');
      }
    } else {
      console.log('ℹ️ Analytics tab not found. Visit Media Studio for analytics.');
      console.log('   👉 https://studio.x.com');
    }
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('🎬 XActions — Media Studio');
    console.log('═══════════════════════════════════════════\n');

    const isStudio = window.location.hostname.includes('studio.x.com');

    if (!isStudio && CONFIG.autoNavigate) {
      await navigateToStudio();
      return;
    }

    if (isStudio) {
      console.log('✅ Running on Media Studio page.\n');

      showUploadInstructions();

      if (CONFIG.scanLibrary) {
        await scanMediaLibrary();
      }

      if (CONFIG.showAnalytics) {
        await showAnalytics();
      }
    } else {
      console.log('ℹ️ You are not on Media Studio.');
      console.log('💡 Set CONFIG.autoNavigate = true or visit: https://studio.x.com');

      showUploadInstructions();
    }

    console.log('\n✅ Media Studio script complete.');
  };

  run();
})();
