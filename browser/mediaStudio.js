// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// browser/mediaStudio.js
// Media Studio automation for X/Twitter
// by nichxbt
// https://github.com/nirholas/XActions
//
// Features: navigate to Media Studio, upload media, manage library,
// media analytics, monetization settings, live streaming management.
//
// 1. Go to studio.x.com or x.com
// 2. Open Developer Console (F12)
// 3. Paste this script and press Enter
// 4. Use window.XActions.mediaStudio.<function>() to run features
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const STORAGE_KEY = 'xactions_media_studio';

  const SEL = {
    primaryColumn: '[data-testid="primaryColumn"]',
    tweet: 'article[data-testid="tweet"]',
    confirm: '[data-testid="confirmationSheetConfirm"]',
    toast: '[data-testid="toast"]',
    fileInput: '[data-testid="fileInput"]',
    backButton: '[data-testid="app-bar-back"]',
    analyticsTab: '[data-testid="analyticsTab"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
  };

  const CONFIG = {
    delayBetweenActions: 2000,
    scrollDelay: 2000,
    maxMediaToScan: 100,
    maxRetries: 5,
  };

  const isOnStudio = () =>
    window.location.hostname.includes('studio.x.com') ||
    window.location.hostname.includes('studio.twitter.com');

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const getStoredData = () => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const storeData = (key, value) => {
    try {
      const data = getStoredData();
      data[key] = value;
      data.updatedAt = new Date().toISOString();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Silent fail
    }
  };

  // ─────────────────────────────────────────────────
  // 1. Navigate to Media Studio
  // ─────────────────────────────────────────────────
  const navigateToStudio = async () => {
    console.log('🚀 Navigating to Media Studio...');

    if (isOnStudio()) {
      console.log('✅ Already on Media Studio.');
      return true;
    }

    const studioLink = $('a[href*="studio.x.com"]') ||
      $('a[href*="studio.twitter.com"]') ||
      $('a[href*="/media_studio"]');

    if (studioLink) {
      studioLink.click();
      console.log('✅ Clicked Media Studio link.');
      await sleep(CONFIG.delayBetweenActions);
      return true;
    }

    console.log('⚠️ Media Studio link not found on page. Opening in new tab...');
    console.log('💡 Note: Media Studio requires X Premium (Premium or Premium+ tier).');
    window.open('https://studio.x.com', '_blank');
    await sleep(CONFIG.delayBetweenActions);

    console.log('ℹ️ Media Studio opened at studio.x.com in a new tab.');
    console.log('💡 Re-run this script on studio.x.com for full functionality.');
    return false;
  };

  // ─────────────────────────────────────────────────
  // 2. Upload Media to Library
  // ─────────────────────────────────────────────────
  const uploadMedia = async (options = {}) => {
    const { title = '', description = '', altText = '' } = options;

    console.log('📤 Starting media upload flow...');

    if (!isOnStudio()) {
      console.log('⚠️ Not on Media Studio. Navigating...');
      const navigated = await navigateToStudio();
      if (!navigated) return null;
    }

    await sleep(CONFIG.delayBetweenActions);

    // Look for upload button in Media Studio
    const uploadBtn = $('button[aria-label*="Upload"]') ||
      $('button[aria-label*="upload"]') ||
      $('[data-testid="uploadMedia"]') ||
      $('[data-testid="uploadButton"]') ||
      $('[data-testid="fileInput"]') ||
      $('input[type="file"]') ||
      $('[class*="upload"] button') ||
      $('button[class*="upload"]');

    if (uploadBtn) {
      uploadBtn.click();
      console.log('✅ Clicked upload button.');
      console.log('📎 Select your media file from the dialog.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      // Try to find hidden file input
      const fileInput = $('input[type="file"][accept*="image"], input[type="file"][accept*="video"]') ||
        $('input[type="file"]');

      if (fileInput) {
        console.log('✅ File input found. Triggering file picker...');
        fileInput.click();
        console.log('📎 Select your media file from the dialog.');
      } else {
        console.log('❌ Upload button not found.');
        console.log('💡 Navigate to Media Studio Library and try again.');
        console.log('   URL: https://studio.x.com/library');
        return null;
      }
    }

    await sleep(3000);

    // Fill in metadata if fields appear
    if (title) {
      const titleInput = await waitForSelector(
        'input[name="title"], [data-testid="mediaTitleInput"], [aria-label*="Title"]', 5000
      );
      if (titleInput) {
        titleInput.focus();
        document.execCommand('insertText', false, title);
        console.log(`✅ Set title: "${title}"`);
        await sleep(500);
      }
    }

    if (description) {
      const descInput = $('textarea[name="description"], [data-testid="mediaDescriptionInput"], [aria-label*="Description"]');
      if (descInput) {
        descInput.focus();
        document.execCommand('insertText', false, description);
        console.log(`✅ Set description: "${description}"`);
        await sleep(500);
      }
    }

    if (altText) {
      const altInput = $('[data-testid="altTextInput"], input[name="altText"], [aria-label*="Alt text"]');
      if (altInput) {
        altInput.focus();
        document.execCommand('insertText', false, altText);
        console.log(`✅ Set alt text: "${altText}"`);
        await sleep(500);
      }
    }

    console.log('');
    console.log('📏 Supported formats:');
    console.log('   Images: JPG, PNG, GIF (up to 5MB)');
    console.log('   Videos: MP4, MOV (up to 2h with Premium)');
    console.log('   GIFs:   Up to 15MB');
    console.log('');
    console.log('ℹ️ Upload initiated. Monitor the Media Studio library for progress.');
    console.log('💡 After upload, use manageLibrary() to verify the file appears.');

    return { status: 'upload_initiated', title, description, altText };
  };

  // ─────────────────────────────────────────────────
  // 3. Manage Media Library
  // ─────────────────────────────────────────────────
  const manageLibrary = async (options = {}) => {
    const {
      action = 'list',
      searchQuery = '',
      filter = 'all',
      maxItems = CONFIG.maxMediaToScan,
    } = options;

    console.log(`📚 Media Library — Action: ${action}`);

    if (!isOnStudio() && action !== 'list') {
      console.log('⚠️ Best results on studio.x.com. Attempting from current page...');
    }

    if (action === 'search' && searchQuery) {
      console.log(`🔍 Searching for: "${searchQuery}"...`);

      const searchInput = $(SEL.searchInput) ||
        $('input[type="search"]') ||
        $('input[placeholder*="Search"]') ||
        $('input[aria-label*="Search"]');

      if (searchInput) {
        searchInput.focus();
        searchInput.value = '';
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, searchQuery);
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true,
        });
        searchInput.dispatchEvent(enterEvent);

        console.log(`✅ Search submitted for: "${searchQuery}"`);
        await sleep(CONFIG.delayBetweenActions);
      } else {
        console.log('⚠️ Search input not found. Listing all media instead.');
      }
    }

    if (action === 'filter' && filter !== 'all') {
      console.log(`🔽 Filtering by: ${filter}...`);

      const filterBtn = $(`button[aria-label*="${filter}"]`) ||
        $(`[data-testid="mediaFilter-${filter}"]`) ||
        $(`[role="tab"][aria-label*="${filter}" i]`);

      if (filterBtn) {
        filterBtn.click();
        console.log(`✅ Applied filter: ${filter}`);
        await sleep(CONFIG.delayBetweenActions);
      } else {
        // Try dropdown filter
        const filterDropdown = $('select[name="mediaType"], [data-testid="mediaTypeFilter"]');
        if (filterDropdown) {
          filterDropdown.value = filter;
          filterDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`✅ Applied filter via dropdown: ${filter}`);
          await sleep(CONFIG.delayBetweenActions);
        } else {
          console.log(`⚠️ Filter "${filter}" not found. Available filters may differ.`);
        }
      }
    }

    // Scrape media items
    console.log('🔄 Scanning media library...');
    const mediaItems = [];
    let previousCount = 0;
    let retries = 0;

    while (retries < CONFIG.maxRetries && mediaItems.length < maxItems) {
      const items = $$(
        '[data-testid="mediaItem"], [data-testid="mediaCard"], [role="gridcell"], ' +
        'tr[data-media-id], [class*="media-item"], table tbody tr, [role="row"]'
      );

      for (const item of items) {
        const titleEl = item.querySelector(
          '[class*="title"], [class*="name"], td:first-child, h3, h4, span, p'
        );
        const title = item.getAttribute('aria-label') ||
          titleEl?.textContent?.trim() || '';

        if (!title || mediaItems.find(m => m.title === title)) continue;

        const img = item.querySelector('img');
        const video = item.querySelector('video');
        const typeEl = item.querySelector('[class*="type"], [class*="format"], td:nth-child(2)');
        const dateEl = item.querySelector('time, [class*="date"], td:nth-child(3)');
        const sizeEl = item.querySelector('[class*="size"], [class*="duration"], td:nth-child(4)');
        const statusEl = item.querySelector('[class*="status"], td:nth-child(5)');

        const inferredType = video ? 'video' : img ? 'image' : 'unknown';

        mediaItems.push({
          title: title.substring(0, 80),
          type: typeEl?.textContent?.trim() || inferredType,
          date: dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || '',
          size: sizeEl?.textContent?.trim() || '',
          status: statusEl?.textContent?.trim() || '',
          thumbnail: img?.src || video?.poster || '',
        });
      }

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
      console.log('─'.repeat(70));

      const images = mediaItems.filter(m => m.type === 'image');
      const videos = mediaItems.filter(m => m.type === 'video');
      const other = mediaItems.filter(m => m.type !== 'image' && m.type !== 'video');

      console.log(`   🖼️  Images: ${images.length} | 🎥 Videos: ${videos.length} | 📁 Other: ${other.length}`);
      console.log('');

      mediaItems.forEach((m, i) => {
        const typeIcon = m.type.toLowerCase().includes('video') ? '🎥'
          : m.type.toLowerCase().includes('gif') ? '🎞️'
          : m.type.toLowerCase().includes('image') ? '🖼️'
          : '📄';

        console.log(`   ${i + 1}. ${typeIcon} ${m.title}`);
        console.log(`      Type: ${m.type} | Date: ${m.date} | Size: ${m.size} | Status: ${m.status}`);
      });

      storeData('library', mediaItems);
      console.log('\n💾 Media library data saved to sessionStorage.');
    } else {
      console.log('ℹ️ No media items found in the library.');
      console.log('💡 Make sure you are on studio.x.com/library');
    }

    if (action === 'delete') {
      console.log('\n⚠️ Delete mode: select items in the UI, then run deleteSelected().');
    }

    return mediaItems;
  };

  const deleteSelected = async () => {
    console.log('🗑️ Deleting selected media items...');

    const selectedItems = $$('[class*="selected"], [aria-checked="true"], input[type="checkbox"]:checked');

    if (selectedItems.length === 0) {
      console.log('⚠️ No items selected. Select items in the Media Studio UI first.');
      console.log('💡 Click checkboxes on media items, then run deleteSelected().');
      return 0;
    }

    console.log(`🔄 Found ${selectedItems.length} selected items.`);

    const deleteBtn = $('button[aria-label*="Delete"]') ||
      $('button[aria-label*="delete"]') ||
      $('[data-testid="deleteMedia"]') ||
      $('button[class*="delete"]');

    if (deleteBtn) {
      deleteBtn.click();
      console.log('🔄 Clicked delete button...');
      await sleep(1000);

      const confirmBtn = $(SEL.confirm) ||
        $('button[aria-label*="Confirm"]') ||
        $('button[class*="confirm"]');

      if (confirmBtn) {
        confirmBtn.click();
        console.log('✅ Confirmed deletion.');
        await sleep(CONFIG.delayBetweenActions);
      }

      console.log(`✅ Deleted ${selectedItems.length} media items.`);
    } else {
      console.log('❌ Delete button not found. Select items and look for a delete/trash option.');
    }

    return selectedItems.length;
  };

  // ─────────────────────────────────────────────────
  // 4. Media Analytics
  // ─────────────────────────────────────────────────
  const getMediaAnalytics = async (options = {}) => {
    const { maxItems = CONFIG.maxMediaToScan } = options;

    console.log('📊 Scraping media analytics...');

    if (!isOnStudio()) {
      console.log('⚠️ Navigate to studio.x.com for best results.');
      console.log('💡 Opening Media Studio analytics...');
      window.open('https://studio.x.com/analytics', '_blank');
      await sleep(CONFIG.delayBetweenActions);
      return [];
    }

    // Try navigating to analytics tab
    const analyticsTab = $(SEL.analyticsTab) ||
      $('a[href*="analytics"]') ||
      $('[role="tab"][aria-label*="Analytics"]') ||
      $('button[aria-label*="Analytics"]') ||
      $('nav a[href*="analytics"]');

    if (analyticsTab) {
      analyticsTab.click();
      console.log('✅ Navigated to analytics tab.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Analytics tab not found. Scraping from current view...');
    }

    const analytics = [];
    let previousCount = 0;
    let retries = 0;

    while (retries < CONFIG.maxRetries && analytics.length < maxItems) {
      const rows = $$(
        'table tbody tr, [data-testid*="analytics"], [class*="analytics-row"], ' +
        '[class*="media-analytics"], [role="row"], [data-testid*="stat"]'
      );

      for (const row of rows) {
        const nameEl = row.querySelector('td:first-child, [class*="name"], [class*="title"]');
        const name = nameEl?.textContent?.trim() || '';

        if (!name || analytics.find(a => a.name === name)) continue;

        const viewsEl = row.querySelector('[class*="views"], [class*="impressions"], td:nth-child(2)');
        const engagementEl = row.querySelector('[class*="engagement"], td:nth-child(3)');
        const clicksEl = row.querySelector('[class*="clicks"], td:nth-child(4)');
        const retentionEl = row.querySelector('[class*="retention"], [class*="completion"], td:nth-child(5)');
        const revenueEl = row.querySelector('[class*="revenue"], [class*="earnings"], td:nth-child(6)');

        analytics.push({
          name: name.substring(0, 80),
          views: viewsEl?.textContent?.trim() || '0',
          engagement: engagementEl?.textContent?.trim() || '0',
          clicks: clicksEl?.textContent?.trim() || '0',
          retention: retentionEl?.textContent?.trim() || '-',
          revenue: revenueEl?.textContent?.trim() || '-',
        });
      }

      if (analytics.length === previousCount) {
        retries++;
      } else {
        retries = 0;
        previousCount = analytics.length;
      }

      console.log(`   🔄 Scraped analytics for ${analytics.length} items...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (analytics.length > 0) {
      console.log(`\n📊 Media Analytics (${analytics.length} items):`);
      console.log('─'.repeat(80));

      let totalViews = 0;
      let totalEngagement = 0;

      analytics.forEach((a, i) => {
        const viewNum = parseInt(a.views.replace(/[^0-9]/g, ''), 10) || 0;
        const engNum = parseInt(a.engagement.replace(/[^0-9]/g, ''), 10) || 0;
        totalViews += viewNum;
        totalEngagement += engNum;

        console.log(`   ${i + 1}. 📹 ${a.name}`);
        console.log(`      👁️ Views: ${a.views} | 💬 Engagement: ${a.engagement} | 🔗 Clicks: ${a.clicks} | ⏱️ Retention: ${a.retention} | 💰 Revenue: ${a.revenue}`);
      });

      console.log('\n📈 Summary:');
      console.log(`   Total views: ${totalViews.toLocaleString()}`);
      console.log(`   Total engagement: ${totalEngagement.toLocaleString()}`);
      console.log(`   Avg views per item: ${analytics.length > 0 ? Math.round(totalViews / analytics.length).toLocaleString() : 0}`);

      storeData('analytics', analytics);
      console.log('\n💾 Analytics data saved to sessionStorage.');
    } else {
      console.log('ℹ️ No analytics data found.');
      console.log('💡 Make sure you are on the Media Studio analytics page.');
      console.log('   URL: https://studio.x.com/analytics');
    }

    return analytics;
  };

  // ─────────────────────────────────────────────────
  // 5. Monetization Settings
  // ─────────────────────────────────────────────────
  const monetizationSettings = async (options = {}) => {
    const { navigate = true } = options;

    console.log('💰 Accessing monetization settings...');

    if (!isOnStudio()) {
      if (navigate) {
        console.log('⚠️ Not on Media Studio. Opening monetization page...');
        window.open('https://studio.x.com/monetization', '_blank');
        await sleep(CONFIG.delayBetweenActions);
        console.log('ℹ️ Monetization settings opened in new tab.');
        console.log('💡 Re-run this script on studio.x.com for full functionality.');
        return null;
      }
      console.log('❌ Not on Media Studio. Set navigate: true or go to studio.x.com.');
      return null;
    }

    // Navigate to monetization section
    const monetizationLink = $('a[href*="monetization"]') ||
      $('a[href*="revenue"]') ||
      $('[data-testid="monetizationTab"]') ||
      $('[data-testid="revenueTab"]') ||
      $('nav a[href*="monetization"]') ||
      $('button[aria-label*="Monetization"]');

    if (monetizationLink) {
      monetizationLink.click();
      console.log('✅ Navigated to monetization settings.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Monetization link not found on page. Trying direct URL...');
      window.location.href = 'https://studio.x.com/monetization';
      await sleep(CONFIG.delayBetweenActions);
    }

    // Scrape current monetization settings
    const settings = {};

    const statusEl = $('[class*="monetization-status"], [class*="eligibility"], [data-testid="monetizationStatus"]');
    settings.status = statusEl?.textContent?.trim() || 'Unknown';

    const revenueEl = $('[class*="total-revenue"], [class*="earnings"], [data-testid="totalRevenue"]');
    settings.totalRevenue = revenueEl?.textContent?.trim() || '-';

    const programEls = $$('[class*="program"], [class*="monetization-option"], [class*="revenue-program"]');
    settings.programs = programEls.map(el => {
      const nameEl = el.querySelector('[class*="name"], h3, h4, [class*="title"]');
      const progStatusEl = el.querySelector('[class*="status"], [class*="badge"], [class*="state"]');
      const toggleEl = el.querySelector('[data-testid="settingsSwitch"], [role="switch"], input[type="checkbox"]');

      return {
        name: nameEl?.textContent?.trim() || '',
        status: progStatusEl?.textContent?.trim() || '',
        enabled: toggleEl ? toggleEl.checked || toggleEl.getAttribute('aria-checked') === 'true' : null,
      };
    }).filter(p => p.name);

    const paymentEl = $('[class*="payment-method"], [class*="payout"], [data-testid="paymentMethod"]');
    settings.paymentMethod = paymentEl?.textContent?.trim() || 'Not configured';

    console.log('\n💰 Monetization Settings:');
    console.log('─'.repeat(60));
    console.log(`   Status: ${settings.status}`);
    console.log(`   Total Revenue: ${settings.totalRevenue}`);
    console.log(`   Payment Method: ${settings.paymentMethod}`);

    if (settings.programs.length > 0) {
      console.log('\n   Programs:');
      settings.programs.forEach((p, i) => {
        const icon = p.enabled === true ? '🟢' : p.enabled === false ? '🔴' : '⚪';
        console.log(`   ${i + 1}. ${icon} ${p.name} — ${p.status}`);
      });
    } else {
      console.log('\n   ℹ️ No monetization programs detected on page.');
      console.log('   💡 You may need to be eligible for X/Twitter monetization.');
    }

    console.log('\n💡 Monetization tips:');
    console.log('   • Ads Revenue Sharing requires X Premium subscription');
    console.log('   • Media Studio monetization requires video content');
    console.log('   • Check eligibility at: https://studio.x.com/monetization');

    storeData('monetization', settings);
    console.log('\n💾 Monetization settings saved to sessionStorage.');

    return settings;
  };

  // ─────────────────────────────────────────────────
  // 6. Live Streaming Management
  // ─────────────────────────────────────────────────
  const liveStreaming = async (options = {}) => {
    const { action = 'list', maxStreams = 50 } = options;

    console.log('📡 Live Streaming Management...');

    if (!isOnStudio()) {
      console.log('⚠️ Not on Media Studio. Opening live streaming page...');
      window.open('https://studio.x.com/producer', '_blank');
      await sleep(CONFIG.delayBetweenActions);
      console.log('ℹ️ Live streaming page opened in new tab.');
      console.log('💡 Re-run this script on studio.x.com for full functionality.');
      return [];
    }

    // Navigate to live/producer tab
    const liveLink = $('a[href*="producer"]') ||
      $('a[href*="live"]') ||
      $('[data-testid="liveTab"]') ||
      $('nav a[href*="live"]') ||
      $('button[aria-label*="Live"]') ||
      $('[role="tab"][aria-label*="Live"]');

    if (liveLink) {
      liveLink.click();
      console.log('✅ Navigated to live streaming section.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Live section not found. Trying direct URL...');
      window.location.href = 'https://studio.x.com/producer';
      await sleep(CONFIG.delayBetweenActions);
    }

    if (action === 'settings') {
      console.log('\n⚙️ Scraping live streaming settings...');

      const settings = {};

      const streamKeyEl = $('[class*="stream-key"], [data-testid="streamKey"], input[name="streamKey"]');
      settings.streamKey = streamKeyEl
        ? '••••••••' + (streamKeyEl.value || streamKeyEl.textContent || '').slice(-4)
        : 'Not found';

      const serverEl = $('[class*="server-url"], [data-testid="serverUrl"], input[name="serverUrl"]');
      settings.serverUrl = serverEl?.value || serverEl?.textContent?.trim() || 'Not found';

      const regionEl = $('[class*="region"], [data-testid="streamRegion"]');
      settings.region = regionEl?.textContent?.trim() || 'Default';

      console.log('\n⚙️ Streaming Settings:');
      console.log('─'.repeat(60));
      console.log(`   Stream Key: ${settings.streamKey}`);
      console.log(`   Server URL: ${settings.serverUrl}`);
      console.log(`   Region: ${settings.region}`);
      console.log('\n💡 Use these settings in OBS, Streamlabs, or your preferred streaming software.');

      storeData('streamSettings', settings);
      console.log('💾 Stream settings saved to sessionStorage.');
      return settings;
    }

    // List past streams
    console.log('\n📋 Scanning past live streams...');
    const streams = [];
    let previousCount = 0;
    let retries = 0;

    while (retries < CONFIG.maxRetries && streams.length < maxStreams) {
      const rows = $$(
        '[class*="broadcast"], [class*="stream-row"], [class*="live-item"], ' +
        'table tbody tr, [role="row"], [data-testid*="broadcast"]'
      );

      for (const row of rows) {
        const titleEl = row.querySelector('[class*="title"], [class*="name"], td:first-child, h3, h4');
        const title = titleEl?.textContent?.trim() || '';

        if (!title || streams.find(s => s.title === title)) continue;

        const dateEl = row.querySelector('time, [class*="date"], td:nth-child(2)');
        const durationEl = row.querySelector('[class*="duration"], td:nth-child(3)');
        const viewersEl = row.querySelector('[class*="viewers"], [class*="audience"], td:nth-child(4)');
        const statusEl = row.querySelector('[class*="status"], [class*="state"], td:nth-child(5)');

        streams.push({
          title: title.substring(0, 80),
          date: dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || '',
          duration: durationEl?.textContent?.trim() || '',
          viewers: viewersEl?.textContent?.trim() || '0',
          status: statusEl?.textContent?.trim() || '',
        });
      }

      if (streams.length === previousCount) {
        retries++;
      } else {
        retries = 0;
        previousCount = streams.length;
      }

      console.log(`   🔄 Found ${streams.length} streams...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    if (streams.length > 0) {
      console.log(`\n📡 Past Live Streams (${streams.length}):`);
      console.log('─'.repeat(70));

      streams.forEach((s, i) => {
        const statusIcon = s.status.toLowerCase().includes('live') ? '🔴'
          : s.status.toLowerCase().includes('ended') ? '⚪'
          : s.status.toLowerCase().includes('scheduled') ? '🟡'
          : '🔵';

        console.log(`   ${i + 1}. ${statusIcon} ${s.title}`);
        console.log(`      📅 ${s.date} | ⏱️ ${s.duration} | 👁️ ${s.viewers} viewers | Status: ${s.status}`);
      });

      storeData('streams', streams);
      console.log('\n💾 Stream data saved to sessionStorage.');
    } else {
      console.log('ℹ️ No past streams found.');
      console.log('💡 Go to studio.x.com/producer to start a live stream.');
    }

    return streams;
  };

  // ─────────────────────────────────────────────────
  // Expose on window.XActions.mediaStudio
  // ─────────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.mediaStudio = {
    navigateToStudio,
    uploadMedia,
    manageLibrary,
    deleteSelected,
    getMediaAnalytics,
    monetizationSettings,
    liveStreaming,
  };

  // ─────────────────────────────────────────────────
  // Menu
  // ─────────────────────────────────────────────────
  const W = 68;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  🎬 MEDIA STUDIO — XActions' + ' '.repeat(W - 30) + '║');
  console.log('║  by nichxbt' + ' '.repeat(W - 14) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  Available commands:' + ' '.repeat(W - 22) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  1.  navigateToStudio()' + ' '.repeat(W - 26) + '║');
  console.log('║      Open Media Studio (studio.x.com)' + ' '.repeat(W - 40) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  2.  uploadMedia({ title, description, altText })' + ' '.repeat(W - 52) + '║');
  console.log('║      Upload media to the Media Studio library' + ' '.repeat(W - 48) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  3.  manageLibrary({ action, searchQuery, filter, maxItems })' + ' '.repeat(W - 64) + '║');
  console.log('║      List, search, filter media (action: list|search|filter)' + ' '.repeat(W - 63) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  4.  deleteSelected()' + ' '.repeat(W - 24) + '║');
  console.log('║      Delete selected items from the library' + ' '.repeat(W - 46) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  5.  getMediaAnalytics({ maxItems })' + ' '.repeat(W - 39) + '║');
  console.log('║      Scrape analytics: views, engagement, revenue' + ' '.repeat(W - 52) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  6.  monetizationSettings({ navigate })' + ' '.repeat(W - 42) + '║');
  console.log('║      View and configure monetization programs' + ' '.repeat(W - 47) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  7.  liveStreaming({ action, maxStreams })' + ' '.repeat(W - 44) + '║');
  console.log('║      List past streams (action: list|settings)' + ' '.repeat(W - 49) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  Usage: XActions.mediaStudio.navigateToStudio()' + ' '.repeat(W - 50) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
})();
