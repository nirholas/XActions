// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        advancedNotifications.js
 * @title       Notification Settings
 * @description Clear notifications and configure email, push, desktop and verified-only notification settings.
 * @category    profile
 * @page        x.com/settings/notifications
 * @writes      true
 */
// browser/advancedNotifications.js
// Advanced notification management for X/Twitter
// by nichxbt
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026
(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ─── Selectors ───────────────────────────────────────────────
  const SEL = {
    notificationTab: 'a[href="/notifications"]',
    notification: '[data-testid="notification"]',
    settingsSwitch: '[data-testid="settingsSwitch"]',
    confirmBtn: '[data-testid="confirmationSheetConfirm"]',
    toast: '[data-testid="toast"]',
    tabList: '[role="tablist"]',
    tab: '[role="tab"]',
    backBtn: '[data-testid="app-bar-back"]',
  };

  // ─── Settings URL map ────────────────────────────────────────
  const SETTINGS_URLS = {
    email: '/settings/notifications/email_notifications',
    push: '/settings/notifications/push_notifications',
    preferences: '/settings/notifications/preferences',
    filters: '/settings/notifications/filters',
    base: '/settings/notifications',
  };

  // ─── Helpers ─────────────────────────────────────────────────

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(300);
    }
    return null;
  };

  const navigateTo = async (path) => {
    const url = `https://x.com${path}`;
    if (window.location.href !== url) {
      window.location.href = url;
      await sleep(3000);
    }
  };

  const getToggles = () => {
    const items = [];
    const switches = document.querySelectorAll(SEL.settingsSwitch);
    switches.forEach((sw) => {
      const container = sw.closest('[role="listitem"]') || sw.parentElement?.parentElement;
      const label = container?.textContent?.replace(/(\s{2,})/g, ' ').trim() || 'Unknown';
      const enabled = sw.getAttribute('aria-checked') === 'true';
      items.push({ label, enabled, element: sw });
    });
    return items;
  };

  const clickToggle = async (toggle) => {
    toggle.element.click();
    await sleep(1500);
    const confirm = document.querySelector(SEL.confirmBtn);
    if (confirm) {
      confirm.click();
      await sleep(1000);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. Clear / dismiss all notifications
  // ═══════════════════════════════════════════════════════════════

  const clearAllNotifications = async () => {
    console.log('🔄 Navigating to notifications...');
    await navigateTo('/notifications');
    await sleep(2000);

    const notifications = document.querySelectorAll(SEL.notification);
    if (notifications.length === 0) {
      console.log('✅ No notifications to clear — inbox is empty.');
      return { success: true, cleared: 0 };
    }

    console.log(`🔄 Found ${notifications.length} visible notifications. Marking as read...`);

    // X/Twitter marks notifications as read when you visit the page.
    // Scroll through all of them to ensure the server registers every one as seen.
    let lastHeight = 0;
    let sameHeightCount = 0;
    let totalScrolled = 0;

    while (sameHeightCount < 3) {
      window.scrollBy(0, 800);
      await sleep(1500);
      totalScrolled++;

      const currentHeight = document.documentElement.scrollHeight;
      if (currentHeight === lastHeight) {
        sameHeightCount++;
      } else {
        sameHeightCount = 0;
      }
      lastHeight = currentHeight;

      if (totalScrolled > 50) {
        console.log('⚠️ Reached scroll limit (50 scrolls). Stopping.');
        break;
      }
    }

    // Scroll back to top to trigger the "all read" state
    window.scrollTo(0, 0);
    await sleep(1000);

    const allNotifs = document.querySelectorAll(SEL.notification);
    console.log(`✅ Scrolled through all notifications. ${allNotifs.length} notifications marked as read.`);

    // Check for notification badge and try to clear it
    const badge = document.querySelector('a[href="/notifications"] [aria-live="polite"]') ||
                  document.querySelector('a[href="/notifications"] [data-testid="badge"]');
    if (badge) {
      console.log('🔄 Notification badge detected — visiting page should have cleared it.');
    }

    return { success: true, cleared: allNotifs.length };
  };

  // ═══════════════════════════════════════════════════════════════
  // 2. Email notification preferences
  // ═══════════════════════════════════════════════════════════════

  const configureEmailNotifications = async (options = {}) => {
    const { enableAll = null, toggleCategories = {} } = options;
    // enableAll: true = turn all on, false = turn all off, null = no bulk change
    // toggleCategories: { "New follower": true, "Direct message": false, ... }

    console.log('🔄 Navigating to email notification settings...');
    await navigateTo(SETTINGS_URLS.email);
    await sleep(3000);

    const toggles = getToggles();
    if (toggles.length === 0) {
      console.log('❌ No email notification toggles found. You may need to navigate manually to: Settings > Notifications > Email notifications');
      return { success: false, error: 'No toggles found' };
    }

    console.log(`📋 Found ${toggles.length} email notification categories:`);
    toggles.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.label} — ${t.enabled ? '✅ ON' : '❌ OFF'}`);
    });

    let changed = 0;

    if (enableAll !== null) {
      console.log(`🔄 ${enableAll ? 'Enabling' : 'Disabling'} all email notifications...`);
      for (const toggle of toggles) {
        if (toggle.enabled !== enableAll) {
          await clickToggle(toggle);
          changed++;
          console.log(`   🔄 ${toggle.label} → ${enableAll ? 'ON' : 'OFF'}`);
          await sleep(1000);
        }
      }
    }

    // Handle specific categories
    for (const [category, desired] of Object.entries(toggleCategories)) {
      const match = toggles.find(t => t.label.toLowerCase().includes(category.toLowerCase()));
      if (match && match.enabled !== desired) {
        await clickToggle(match);
        changed++;
        console.log(`   🔄 ${match.label} → ${desired ? 'ON' : 'OFF'}`);
        await sleep(1000);
      } else if (!match) {
        console.log(`   ⚠️ Category "${category}" not found.`);
      }
    }

    console.log(`✅ Email notification settings updated. ${changed} change(s) made.`);
    return { success: true, changed, categories: toggles.map(t => ({ label: t.label, enabled: t.enabled })) };
  };

  // ═══════════════════════════════════════════════════════════════
  // 3. Push notification preferences
  // ═══════════════════════════════════════════════════════════════

  const configurePushNotifications = async (options = {}) => {
    const { enableAll = null, toggleCategories = {} } = options;

    console.log('🔄 Navigating to push notification settings...');
    await navigateTo(SETTINGS_URLS.push);
    await sleep(3000);

    const toggles = getToggles();
    if (toggles.length === 0) {
      console.log('❌ No push notification toggles found. You may need to navigate manually to: Settings > Notifications > Push notifications');
      return { success: false, error: 'No toggles found' };
    }

    console.log(`📋 Found ${toggles.length} push notification categories:`);
    toggles.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.label} — ${t.enabled ? '✅ ON' : '❌ OFF'}`);
    });

    let changed = 0;

    if (enableAll !== null) {
      console.log(`🔄 ${enableAll ? 'Enabling' : 'Disabling'} all push notifications...`);
      for (const toggle of toggles) {
        if (toggle.enabled !== enableAll) {
          await clickToggle(toggle);
          changed++;
          console.log(`   🔄 ${toggle.label} → ${enableAll ? 'ON' : 'OFF'}`);
          await sleep(1000);
        }
      }
    }

    for (const [category, desired] of Object.entries(toggleCategories)) {
      const match = toggles.find(t => t.label.toLowerCase().includes(category.toLowerCase()));
      if (match && match.enabled !== desired) {
        await clickToggle(match);
        changed++;
        console.log(`   🔄 ${match.label} → ${desired ? 'ON' : 'OFF'}`);
        await sleep(1000);
      } else if (!match) {
        console.log(`   ⚠️ Category "${category}" not found.`);
      }
    }

    console.log(`✅ Push notification settings updated. ${changed} change(s) made.`);
    return { success: true, changed, categories: toggles.map(t => ({ label: t.label, enabled: t.enabled })) };
  };

  // ═══════════════════════════════════════════════════════════════
  // 4. Desktop notification preferences
  // ═══════════════════════════════════════════════════════════════

  const configureDesktopNotifications = async (options = {}) => {
    const { enable = true } = options;

    console.log('🔄 Configuring desktop (browser) notifications...');

    // First check current browser permission state
    if (!('Notification' in window)) {
      console.log('❌ This browser does not support desktop notifications.');
      return { success: false, error: 'Browser does not support notifications' };
    }

    const currentPermission = Notification.permission;
    console.log(`📋 Current browser notification permission: ${currentPermission}`);

    if (enable) {
      if (currentPermission === 'granted') {
        console.log('✅ Desktop notifications are already enabled.');
      } else if (currentPermission === 'denied') {
        console.log('❌ Desktop notifications are blocked by the browser. You must manually allow them:');
        console.log('   1. Click the lock icon in the address bar');
        console.log('   2. Find "Notifications" and set to "Allow"');
        console.log('   3. Reload the page');
        return { success: false, error: 'Notifications blocked by browser', permission: currentPermission };
      } else {
        console.log('🔄 Requesting notification permission from browser...');
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          console.log('✅ Desktop notifications enabled!');
          // Send a test notification
          new Notification('XActions', {
            body: 'Desktop notifications enabled successfully!',
            icon: 'https://abs.twimg.com/favicons/twitter.3.ico',
          });
        } else {
          console.log(`⚠️ Permission request result: ${result}`);
          return { success: false, error: `Permission ${result}`, permission: result };
        }
      }
    }

    // Navigate to X's notification preferences to toggle their push/desktop settings
    console.log('🔄 Navigating to X notification preferences...');
    await navigateTo(SETTINGS_URLS.preferences);
    await sleep(3000);

    const toggles = getToggles();
    if (toggles.length > 0) {
      console.log(`📋 Found ${toggles.length} notification preference toggles:`);
      toggles.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.label} — ${t.enabled ? '✅ ON' : '❌ OFF'}`);
      });

      // Look for a "browser" or "desktop" or "web" toggle
      const desktopToggle = toggles.find(t =>
        t.label.toLowerCase().includes('browser') ||
        t.label.toLowerCase().includes('desktop') ||
        t.label.toLowerCase().includes('web push')
      );

      if (desktopToggle && desktopToggle.enabled !== enable) {
        await clickToggle(desktopToggle);
        console.log(`🔄 ${desktopToggle.label} → ${enable ? 'ON' : 'OFF'}`);
      }
    } else {
      console.log('⚠️ No preference toggles found on this page.');
    }

    console.log(`✅ Desktop notification configuration complete.`);
    return {
      success: true,
      browserPermission: Notification.permission,
      preferences: toggles.map(t => ({ label: t.label, enabled: t.enabled })),
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // 5. Filter by verified-only
  // ═══════════════════════════════════════════════════════════════

  const filterVerifiedOnly = async () => {
    console.log('🔄 Navigating to notifications...');
    await navigateTo('/notifications');
    await sleep(2000);

    // Look for the "Verified" tab in the notification tabs
    const tabs = document.querySelectorAll(`${SEL.tabList} ${SEL.tab}, ${SEL.tabList} a`);
    let verifiedTab = null;

    for (const tab of tabs) {
      const text = tab.textContent?.toLowerCase() || '';
      if (text.includes('verified')) {
        verifiedTab = tab;
        break;
      }
    }

    if (!verifiedTab) {
      // Fallback: try aria-label or href-based selectors
      verifiedTab = document.querySelector('a[href="/notifications/verified"]') ||
                    document.querySelector('[role="tab"][aria-label*="erified"]');
    }

    if (!verifiedTab) {
      // Try all links in the notification header area
      const allLinks = document.querySelectorAll('nav a, [role="navigation"] a, header a');
      for (const link of allLinks) {
        if (link.textContent?.toLowerCase().includes('verified') ||
            link.href?.includes('verified')) {
          verifiedTab = link;
          break;
        }
      }
    }

    if (verifiedTab) {
      console.log('🔄 Switching to Verified notifications tab...');
      verifiedTab.click();
      await sleep(2000);

      const notifications = document.querySelectorAll(SEL.notification);
      console.log(`✅ Switched to Verified-only notifications. ${notifications.length} visible notifications.`);
      return { success: true, filter: 'verified', visibleCount: notifications.length };
    }

    // If no tab found, try the notification filters settings
    console.log('⚠️ Verified tab not found directly. Checking notification filter settings...');
    await navigateTo('/settings/notifications/filters');
    await sleep(3000);

    const toggles = getToggles();
    const qualityFilter = toggles.find(t =>
      t.label.toLowerCase().includes('quality') ||
      t.label.toLowerCase().includes('verified')
    );

    if (qualityFilter && !qualityFilter.enabled) {
      await clickToggle(qualityFilter);
      console.log(`🔄 Enabled quality/verified filter: ${qualityFilter.label}`);
    }

    if (toggles.length > 0) {
      console.log('📋 Available notification filters:');
      toggles.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.label} — ${t.enabled ? '✅ ON' : '❌ OFF'}`);
      });
    }

    // Navigate back to notifications
    await navigateTo('/notifications');
    await sleep(2000);

    console.log('✅ Notification filter settings updated.');
    return { success: true, filter: 'quality', filters: toggles.map(t => ({ label: t.label, enabled: t.enabled })) };
  };

  // ═══════════════════════════════════════════════════════════════
  // Expose on window.XActions.advancedNotifications
  // ═══════════════════════════════════════════════════════════════

  if (!window.XActions) window.XActions = {};
  window.XActions.advancedNotifications = {
    clearAllNotifications,
    configureEmailNotifications,
    configurePushNotifications,
    configureDesktopNotifications,
    filterVerifiedOnly,
  };

  // ─── Menu ────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🔔 XActions — Advanced Notifications              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. Clear all notifications (mark as read):                  ║
║     XActions.advancedNotifications.clearAllNotifications()    ║
║                                                              ║
║  2. Email notification preferences:                          ║
║     XActions.advancedNotifications                            ║
║       .configureEmailNotifications({                          ║
║         enableAll: false,                                     ║
║         toggleCategories: { "Direct message": true }          ║
║       })                                                      ║
║                                                              ║
║  3. Push notification preferences:                           ║
║     XActions.advancedNotifications                            ║
║       .configurePushNotifications({                           ║
║         enableAll: true                                       ║
║       })                                                      ║
║                                                              ║
║  4. Desktop notification preferences:                        ║
║     XActions.advancedNotifications                            ║
║       .configureDesktopNotifications({ enable: true })        ║
║                                                              ║
║  5. Filter verified-only notifications:                      ║
║     XActions.advancedNotifications.filterVerifiedOnly()       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
})();
