// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        advancedSettings.js
 * @title       Advanced Settings and Privacy
 * @description Advanced settings and privacy management across the settings pages.
 * @category    profile
 * @page        x.com/settings
 * @writes      true
 */
// browser/advancedSettings.js
// Advanced settings and privacy management for X/Twitter
// by nichxbt
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const SETTINGS_URLS = {
    password: 'https://x.com/settings/password',
    email: 'https://x.com/settings/email',
    phone: 'https://x.com/settings/phone',
    username: 'https://x.com/settings/screen_name',
    security: 'https://x.com/settings/account/login_verification',
    sessions: 'https://x.com/settings/sessions',
    connectedApps: 'https://x.com/settings/connected_apps',
    sensitiveContent: 'https://x.com/settings/content_you_see',
    adPreferences: 'https://x.com/settings/ads_preferences',
    dataPersonalization: 'https://x.com/settings/off_twitter_activity',
    locationInfo: 'https://x.com/settings/location_information',
    accessibility: 'https://x.com/settings/accessibility',
    display: 'https://x.com/settings/display',
    languages: 'https://x.com/settings/languages',
    audienceTagging: 'https://x.com/settings/audience_and_tagging',
    discoverability: 'https://x.com/settings/contacts_dashboard',
    spacesActivity: 'https://x.com/settings/spaces',
    deactivate: 'https://x.com/settings/deactivate',
    country: 'https://x.com/settings/your_twitter_data/country',
    loginHistory: 'https://x.com/settings/your_twitter_data/login_history',
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const waitForSelector = async (selector, timeout = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(300);
    }
    return null;
  };

  const fillInput = async (selector, value) => {
    const el = await waitForSelector(selector);
    if (!el) {
      console.log(`❌ Could not find input: ${selector}`);
      return false;
    }
    el.focus();
    // Clear existing value
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(200);
    // Set new value
    for (const char of value) {
      el.value += char;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(300);
    return true;
  };

  const clickButton = async (selector) => {
    const el = await waitForSelector(selector);
    if (!el) {
      console.log(`❌ Could not find button: ${selector}`);
      return false;
    }
    el.click();
    await sleep(1000);
    return true;
  };

  const navigateTo = (url) => {
    console.log(`🔄 Navigating to ${url}...`);
    window.location.href = url;
  };

  const getToggles = () => {
    return Array.from(document.querySelectorAll('[role="switch"]')).map(sw => {
      const container = sw.closest('div[class]');
      const label = container?.textContent?.trim()?.substring(0, 120) || '';
      const enabled = sw.getAttribute('aria-checked') === 'true';
      return { element: sw, label, enabled };
    });
  };

  const setToggle = async (toggle, desired) => {
    if (toggle.enabled !== desired) {
      toggle.element.click();
      await sleep(1500);
      // Handle confirmation dialog if it appears
      const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirm) {
        confirm.click();
        await sleep(1000);
      }
      console.log(`✅ Toggle "${toggle.label.substring(0, 50)}" set to ${desired ? 'ON' : 'OFF'}`);
      return true;
    }
    console.log(`⚠️ Toggle "${toggle.label.substring(0, 50)}" already ${desired ? 'ON' : 'OFF'}`);
    return false;
  };

  // ---------------------------------------------------------------------------
  // 1. Change Password
  // ---------------------------------------------------------------------------

  const changePassword = async (currentPassword, newPassword) => {
    console.log('🔄 Navigating to password settings...');
    navigateTo(SETTINGS_URLS.password);
    await sleep(3000);

    const currentInput = await waitForSelector('input[name="current_password"], input[autocomplete="current-password"]');
    if (!currentInput) {
      console.log('❌ Password page not loaded. Make sure you are logged in.');
      return;
    }

    await fillInput('input[name="current_password"], input[autocomplete="current-password"]', currentPassword);
    await sleep(500);
    await fillInput('input[name="new_password"], input[autocomplete="new-password"]', newPassword);
    await sleep(500);
    await fillInput('input[name="password_confirmation"], input[name="confirm_password"]', newPassword);
    await sleep(500);

    const saveBtn = document.querySelector('[data-testid="settingsSave"], button[type="submit"]');
    if (saveBtn) {
      saveBtn.click();
      await sleep(2000);
      console.log('✅ Password change submitted. Check for confirmation.');
    } else {
      console.log('⚠️ Save button not found. Fill the form manually and click Save.');
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Change Email
  // ---------------------------------------------------------------------------

  const changeEmail = async (newEmail) => {
    console.log('🔄 Navigating to email settings...');
    navigateTo(SETTINGS_URLS.email);
    await sleep(3000);

    const emailInput = await waitForSelector('input[type="email"], input[name="email"]');
    if (!emailInput) {
      console.log('❌ Email settings page not loaded. You may need to verify your password first.');
      return;
    }

    await fillInput('input[type="email"], input[name="email"]', newEmail);
    await sleep(500);

    const saveBtn = document.querySelector('[data-testid="settingsSave"], button[type="submit"]');
    if (saveBtn) {
      saveBtn.click();
      await sleep(2000);
      console.log('✅ Email update submitted. Check your inbox for verification.');
    } else {
      console.log('⚠️ Save button not found. Submit the form manually.');
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Change Phone Number
  // ---------------------------------------------------------------------------

  const changePhone = async (phoneNumber) => {
    console.log('🔄 Navigating to phone settings...');
    navigateTo(SETTINGS_URLS.phone);
    await sleep(3000);

    const phoneInput = await waitForSelector('input[type="tel"], input[name="phone_number"]');
    if (!phoneInput) {
      console.log('❌ Phone settings page not loaded. You may need to verify your password first.');
      return;
    }

    await fillInput('input[type="tel"], input[name="phone_number"]', phoneNumber);
    await sleep(500);

    const nextBtn = document.querySelector('[data-testid="settingsSave"], button[type="submit"]');
    if (nextBtn) {
      nextBtn.click();
      await sleep(2000);
      console.log('✅ Phone number submitted. You will receive a verification code via SMS.');
    } else {
      console.log('⚠️ Submit button not found. Complete the form manually.');
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Change Username
  // ---------------------------------------------------------------------------

  const changeUsername = async (newUsername) => {
    console.log('🔄 Navigating to username settings...');
    navigateTo(SETTINGS_URLS.username);
    await sleep(3000);

    const usernameInput = await waitForSelector('input[name="username"], input[name="screen_name"]');
    if (!usernameInput) {
      console.log('❌ Username settings page not loaded.');
      return;
    }

    await fillInput('input[name="username"], input[name="screen_name"]', newUsername);
    await sleep(1000);

    // Check for availability feedback
    const pageText = document.body.innerText;
    if (pageText.includes('not available') || pageText.includes('already taken')) {
      console.log(`❌ Username @${newUsername} is not available.`);
      return;
    }

    const saveBtn = document.querySelector('[data-testid="settingsSave"], button[type="submit"]');
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.click();
      await sleep(2000);
      console.log(`✅ Username change to @${newUsername} submitted.`);
    } else {
      console.log('⚠️ Save button not found or disabled. Check username availability.');
    }
  };

  // ---------------------------------------------------------------------------
  // 5. 2FA Setup
  // ---------------------------------------------------------------------------

  const setup2FA = async (method = 'app') => {
    console.log(`🔄 Navigating to 2FA settings (method: ${method})...`);
    navigateTo(SETTINGS_URLS.security);
    await sleep(3000);

    const methodLabels = {
      sms: 'Text message',
      app: 'Authentication app',
      key: 'Security key',
    };

    const label = methodLabels[method] || methodLabels.app;
    const links = Array.from(document.querySelectorAll('a, span, div'));
    const target = links.find(el => el.textContent.includes(label));

    if (target) {
      target.click();
      await sleep(2000);
      console.log(`✅ Opened ${label} 2FA setup. Follow the on-screen instructions.`);
    } else {
      console.log(`⚠️ Could not find "${label}" option. Available 2FA methods on this page:`);
      const toggles = getToggles();
      toggles.forEach(t => console.log(`   - ${t.label} [${t.enabled ? 'ON' : 'OFF'}]`));
    }

    console.log('ℹ️ 2FA methods: sms, app, key');
    console.log('ℹ️ Usage: XActions.advancedSettings.setup2FA("app")');
  };

  // ---------------------------------------------------------------------------
  // 6. Login Verification History
  // ---------------------------------------------------------------------------

  const viewLoginHistory = async () => {
    console.log('🔄 Navigating to login history...');
    navigateTo(SETTINGS_URLS.loginHistory);
    await sleep(3000);

    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (!primaryColumn) {
      console.log('❌ Could not load login history page.');
      return [];
    }

    const entries = [];
    const rows = primaryColumn.querySelectorAll('div[role="listitem"], div[data-testid] > div');
    rows.forEach(row => {
      const text = row.textContent.trim();
      if (text && text.length > 5) {
        entries.push(text);
      }
    });

    if (entries.length === 0) {
      console.log('⚠️ No login history entries found on the page. You may need to verify your identity first.');
      console.log('ℹ️ The page content:');
      console.log(primaryColumn.textContent.trim().substring(0, 500));
    } else {
      console.log(`✅ Found ${entries.length} login history entries:`);
      entries.slice(0, 20).forEach((entry, i) => {
        console.log(`   ${i + 1}. ${entry.substring(0, 100)}`);
      });
    }

    return entries;
  };

  // ---------------------------------------------------------------------------
  // 7. Connected Apps Management
  // ---------------------------------------------------------------------------

  const manageConnectedApps = async (revokeAppName = null) => {
    console.log('🔄 Navigating to connected apps...');
    navigateTo(SETTINGS_URLS.connectedApps);
    await sleep(3000);

    const appLinks = Array.from(document.querySelectorAll('a[href*="/settings/connected_apps/"]'));
    const apps = appLinks.map(link => ({
      name: link.textContent.trim(),
      href: link.getAttribute('href'),
      element: link,
    }));

    if (apps.length === 0) {
      console.log('✅ No connected apps found — your account has no third-party app access.');
      return [];
    }

    console.log(`📋 Found ${apps.length} connected app(s):`);
    apps.forEach((app, i) => {
      console.log(`   ${i + 1}. ${app.name}`);
    });

    if (revokeAppName) {
      const target = apps.find(a => a.name.toLowerCase().includes(revokeAppName.toLowerCase()));
      if (target) {
        target.element.click();
        await sleep(2000);
        const revokeBtn = document.querySelector('button[data-testid="confirmationSheetConfirm"], button');
        const buttons = Array.from(document.querySelectorAll('button'));
        const revoke = buttons.find(b => b.textContent.toLowerCase().includes('revoke'));
        if (revoke) {
          revoke.click();
          await sleep(1500);
          const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirm) confirm.click();
          await sleep(1000);
          console.log(`✅ Revoked access for "${target.name}".`);
        } else {
          console.log(`⚠️ Could not find revoke button for "${target.name}".`);
        }
      } else {
        console.log(`❌ App "${revokeAppName}" not found in connected apps.`);
      }
    }

    return apps.map(a => a.name);
  };

  // ---------------------------------------------------------------------------
  // 8. Sessions Management
  // ---------------------------------------------------------------------------

  const manageSessions = async (logoutAll = false) => {
    console.log('🔄 Navigating to sessions...');
    navigateTo(SETTINGS_URLS.sessions);
    await sleep(3000);

    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (!primaryColumn) {
      console.log('❌ Could not load sessions page.');
      return;
    }

    const sessionEntries = [];
    const items = primaryColumn.querySelectorAll('a[href*="/settings/sessions/"], div[role="listitem"]');
    items.forEach(item => {
      const text = item.textContent.trim();
      if (text) sessionEntries.push(text);
    });

    console.log(`📋 Active sessions:`);
    if (sessionEntries.length > 0) {
      sessionEntries.forEach((s, i) => console.log(`   ${i + 1}. ${s.substring(0, 100)}`));
    } else {
      console.log('   (Could not parse individual sessions. Page content:)');
      console.log(`   ${primaryColumn.textContent.trim().substring(0, 500)}`);
    }

    if (logoutAll) {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const logoutBtn = buttons.find(b =>
        b.textContent.toLowerCase().includes('log out all other sessions') ||
        b.textContent.toLowerCase().includes('log out all')
      );
      if (logoutBtn) {
        logoutBtn.click();
        await sleep(1500);
        const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirm) {
          confirm.click();
          await sleep(1000);
        }
        console.log('✅ Logged out of all other sessions.');
      } else {
        console.log('⚠️ "Log out all" button not found.');
      }
    }

    return sessionEntries;
  };

  // ---------------------------------------------------------------------------
  // 9. Sensitive Content Display Toggle
  // ---------------------------------------------------------------------------

  const toggleSensitiveContent = async (show = true) => {
    console.log('🔄 Navigating to content settings...');
    navigateTo(SETTINGS_URLS.sensitiveContent);
    await sleep(3000);

    const toggles = getToggles();
    const sensitiveToggle = toggles.find(t =>
      t.label.toLowerCase().includes('sensitive') ||
      t.label.toLowerCase().includes('content you see') ||
      t.label.toLowerCase().includes('display media')
    );

    if (sensitiveToggle) {
      await setToggle(sensitiveToggle, show);
      console.log(`✅ Sensitive content display set to: ${show ? 'SHOW' : 'HIDE'}`);
    } else {
      console.log('⚠️ Sensitive content toggle not found. Available toggles:');
      toggles.forEach(t => console.log(`   - ${t.label.substring(0, 80)} [${t.enabled ? 'ON' : 'OFF'}]`));
      console.log('ℹ️ Try clicking the relevant toggle manually on this page.');
    }
  };

  // ---------------------------------------------------------------------------
  // 10. Ad Preferences Management
  // ---------------------------------------------------------------------------

  const manageAdPreferences = async (options = {}) => {
    const { personalizedAds, interestBased, locationBased } = options;
    console.log('🔄 Navigating to ad preferences...');
    navigateTo(SETTINGS_URLS.adPreferences);
    await sleep(3000);

    const toggles = getToggles();

    if (toggles.length === 0) {
      console.log('⚠️ No ad preference toggles found on this page.');
      return;
    }

    console.log(`📋 Ad preference toggles found: ${toggles.length}`);
    let changed = 0;

    for (const toggle of toggles) {
      const lbl = toggle.label.toLowerCase();
      let desired = null;

      if (personalizedAds !== undefined && lbl.includes('personalized')) desired = personalizedAds;
      if (interestBased !== undefined && lbl.includes('interest')) desired = interestBased;
      if (locationBased !== undefined && lbl.includes('location')) desired = locationBased;

      if (desired !== null) {
        const didChange = await setToggle(toggle, desired);
        if (didChange) changed++;
      } else {
        console.log(`   - ${toggle.label.substring(0, 80)} [${toggle.enabled ? 'ON' : 'OFF'}]`);
      }
    }

    console.log(`✅ Ad preferences updated. ${changed} toggle(s) changed.`);
  };

  // ---------------------------------------------------------------------------
  // 11. Data Sharing / Personalization Preferences
  // ---------------------------------------------------------------------------

  const manageDataSharing = async (options = {}) => {
    const { personalization, tracking, dataSharing } = options;
    console.log('🔄 Navigating to data sharing settings...');
    navigateTo(SETTINGS_URLS.dataPersonalization);
    await sleep(3000);

    const toggles = getToggles();

    if (toggles.length === 0) {
      console.log('⚠️ No data sharing toggles found.');
      return;
    }

    console.log(`📋 Data sharing toggles found: ${toggles.length}`);
    let changed = 0;

    for (const toggle of toggles) {
      const lbl = toggle.label.toLowerCase();
      let desired = null;

      if (personalization !== undefined && lbl.includes('personali')) desired = personalization;
      if (tracking !== undefined && (lbl.includes('track') || lbl.includes('web'))) desired = tracking;
      if (dataSharing !== undefined && lbl.includes('shar')) desired = dataSharing;

      if (desired !== null) {
        const didChange = await setToggle(toggle, desired);
        if (didChange) changed++;
      } else {
        console.log(`   - ${toggle.label.substring(0, 80)} [${toggle.enabled ? 'ON' : 'OFF'}]`);
      }
    }

    console.log(`✅ Data sharing preferences updated. ${changed} toggle(s) changed.`);
  };

  // ---------------------------------------------------------------------------
  // 12. Location Information Settings
  // ---------------------------------------------------------------------------

  const manageLocationSettings = async (options = {}) => {
    const { locationSharing, locationPersonalization } = options;
    console.log('🔄 Navigating to location settings...');
    navigateTo(SETTINGS_URLS.locationInfo);
    await sleep(3000);

    const toggles = getToggles();

    if (toggles.length === 0) {
      console.log('⚠️ No location toggles found.');
      return;
    }

    console.log(`📋 Location toggles found: ${toggles.length}`);
    let changed = 0;

    for (const toggle of toggles) {
      const lbl = toggle.label.toLowerCase();
      let desired = null;

      if (locationSharing !== undefined && (lbl.includes('precise') || lbl.includes('location'))) desired = locationSharing;
      if (locationPersonalization !== undefined && lbl.includes('personali')) desired = locationPersonalization;

      if (desired !== null) {
        const didChange = await setToggle(toggle, desired);
        if (didChange) changed++;
      } else {
        console.log(`   - ${toggle.label.substring(0, 80)} [${toggle.enabled ? 'ON' : 'OFF'}]`);
      }
    }

    console.log(`✅ Location settings updated. ${changed} toggle(s) changed.`);
  };

  // ---------------------------------------------------------------------------
  // 13. Accessibility Settings
  // ---------------------------------------------------------------------------

  const manageAccessibility = async (options = {}) => {
    const { colorContrast, reduceMotion, autoplayMedia, fontSize } = options;
    console.log('🔄 Navigating to accessibility settings...');
    navigateTo(SETTINGS_URLS.accessibility);
    await sleep(3000);

    const toggles = getToggles();
    let changed = 0;

    for (const toggle of toggles) {
      const lbl = toggle.label.toLowerCase();
      let desired = null;

      if (colorContrast !== undefined && lbl.includes('contrast')) desired = colorContrast;
      if (reduceMotion !== undefined && lbl.includes('motion')) desired = reduceMotion;
      if (autoplayMedia !== undefined && lbl.includes('autoplay')) desired = autoplayMedia;

      if (desired !== null) {
        const didChange = await setToggle(toggle, desired);
        if (didChange) changed++;
      } else {
        console.log(`   - ${toggle.label.substring(0, 80)} [${toggle.enabled ? 'ON' : 'OFF'}]`);
      }
    }

    // Font size is a slider, not a toggle
    if (fontSize !== undefined) {
      const slider = document.querySelector('input[type="range"]');
      if (slider) {
        const sizeMap = { small: 0, default: 2, large: 3, largest: 4 };
        const val = sizeMap[fontSize] !== undefined ? sizeMap[fontSize] : fontSize;
        slider.value = val;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(1000);
        console.log(`✅ Font size set to: ${fontSize}`);
        changed++;
      } else {
        console.log('⚠️ Font size slider not found on this page.');
      }
    }

    console.log(`✅ Accessibility settings updated. ${changed} change(s) made.`);
  };

  // ---------------------------------------------------------------------------
  // 14. Display Settings
  // ---------------------------------------------------------------------------

  const manageDisplay = async (options = {}) => {
    const { theme, fontSize, color } = options;
    console.log('🔄 Navigating to display settings...');
    navigateTo(SETTINGS_URLS.display);
    await sleep(3000);

    let changed = 0;

    // Theme: dark, dim, light
    if (theme) {
      const themeMap = {
        light: 'Default',
        dim: 'Dim',
        dark: 'Lights out',
      };
      const themeLabel = themeMap[theme.toLowerCase()] || theme;
      const radios = Array.from(document.querySelectorAll('input[type="radio"], [role="radio"]'));
      const labels = Array.from(document.querySelectorAll('label, span, div'));
      const target = labels.find(el => el.textContent.trim() === themeLabel);

      if (target) {
        target.click();
        await sleep(1000);
        console.log(`✅ Theme set to: ${theme}`);
        changed++;
      } else {
        // Try clicking radio buttons near theme text
        const themeSection = labels.find(el => el.textContent.includes(themeLabel));
        if (themeSection) {
          themeSection.click();
          await sleep(1000);
          console.log(`✅ Theme set to: ${theme}`);
          changed++;
        } else {
          console.log(`⚠️ Theme "${theme}" not found. Options: light, dim, dark`);
        }
      }
    }

    // Font size slider
    if (fontSize !== undefined) {
      const sliders = document.querySelectorAll('input[type="range"]');
      const fontSlider = sliders[0]; // First slider is typically font size
      if (fontSlider) {
        const sizeMap = { small: 0, default: 2, large: 3, largest: 4 };
        const val = sizeMap[fontSize] !== undefined ? sizeMap[fontSize] : fontSize;
        fontSlider.value = val;
        fontSlider.dispatchEvent(new Event('input', { bubbles: true }));
        fontSlider.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(1000);
        console.log(`✅ Font size set to: ${fontSize}`);
        changed++;
      } else {
        console.log('⚠️ Font size slider not found.');
      }
    }

    // Color accent
    if (color) {
      const colorMap = {
        blue: 0,
        yellow: 1,
        pink: 2,
        purple: 3,
        orange: 4,
        green: 5,
      };
      const colorIdx = colorMap[color.toLowerCase()];
      const colorCircles = document.querySelectorAll('[role="radio"][style*="background"], div[style*="background-color"]');

      if (colorIdx !== undefined && colorCircles[colorIdx]) {
        colorCircles[colorIdx].click();
        await sleep(1000);
        console.log(`✅ Accent color set to: ${color}`);
        changed++;
      } else {
        console.log(`⚠️ Color "${color}" not found. Options: blue, yellow, pink, purple, orange, green`);
      }
    }

    console.log(`✅ Display settings updated. ${changed} change(s) made.`);
  };

  // ---------------------------------------------------------------------------
  // 15. Language Settings
  // ---------------------------------------------------------------------------

  const manageLanguages = async (displayLanguage = null) => {
    console.log('🔄 Navigating to language settings...');
    navigateTo(SETTINGS_URLS.languages);
    await sleep(3000);

    const selects = document.querySelectorAll('select');
    const links = Array.from(document.querySelectorAll('a[href*="language"], a[href*="lang"]'));

    if (displayLanguage && selects.length > 0) {
      const langSelect = selects[0];
      const options = Array.from(langSelect.options);
      const match = options.find(o =>
        o.text.toLowerCase().includes(displayLanguage.toLowerCase()) ||
        o.value.toLowerCase() === displayLanguage.toLowerCase()
      );

      if (match) {
        langSelect.value = match.value;
        langSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(1000);

        const saveBtn = document.querySelector('[data-testid="settingsSave"], button[type="submit"]');
        if (saveBtn) {
          saveBtn.click();
          await sleep(2000);
        }
        console.log(`✅ Display language set to: ${match.text}`);
      } else {
        console.log(`❌ Language "${displayLanguage}" not found. Available:`);
        options.slice(0, 20).forEach(o => console.log(`   - ${o.text} (${o.value})`));
      }
    } else {
      console.log('📋 Language settings page loaded.');
      if (selects.length > 0) {
        const current = selects[0];
        console.log(`   Current display language: ${current.options[current.selectedIndex]?.text || 'unknown'}`);
        console.log('ℹ️ Usage: XActions.advancedSettings.manageLanguages("English")');
      }
      if (links.length > 0) {
        console.log('   Content language links found:');
        links.forEach(l => console.log(`   - ${l.textContent.trim()}`));
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 16. Audience and Tagging Preferences
  // ---------------------------------------------------------------------------

  const manageAudienceTagging = async (options = {}) => {
    const { protectTweets, photoTagging } = options;
    console.log('🔄 Navigating to audience and tagging settings...');
    navigateTo(SETTINGS_URLS.audienceTagging);
    await sleep(3000);

    const toggles = getToggles();
    let changed = 0;

    // Protected tweets toggle
    if (protectTweets !== undefined) {
      const protectedToggle = toggles.find(t =>
        t.label.toLowerCase().includes('protect') ||
        t.label.toLowerCase().includes('private')
      );
      if (protectedToggle) {
        const didChange = await setToggle(protectedToggle, protectTweets);
        if (didChange) changed++;
      }
    }

    // Photo tagging
    if (photoTagging !== undefined) {
      // Photo tagging may use radio buttons or a dropdown
      const labels = Array.from(document.querySelectorAll('label, span'));
      const tagOptions = {
        everyone: 'Anyone can tag you',
        followers: 'Only people you follow',
        off: 'Off',
      };
      const targetLabel = tagOptions[photoTagging] || photoTagging;
      const target = labels.find(el => el.textContent.includes(targetLabel));

      if (target) {
        target.click();
        await sleep(1000);
        console.log(`✅ Photo tagging set to: ${photoTagging}`);
        changed++;
      } else {
        console.log(`⚠️ Photo tagging option "${photoTagging}" not found. Options: everyone, followers, off`);
      }
    }

    if (Object.keys(options).length === 0) {
      console.log('📋 Audience and tagging toggles:');
      toggles.forEach(t => console.log(`   - ${t.label.substring(0, 80)} [${t.enabled ? 'ON' : 'OFF'}]`));
      console.log('ℹ️ Usage: XActions.advancedSettings.manageAudienceTagging({ protectTweets: true, photoTagging: "followers" })');
    }

    console.log(`✅ Audience and tagging updated. ${changed} change(s) made.`);
  };

  // ---------------------------------------------------------------------------
  // 17. Discoverability Settings
  // ---------------------------------------------------------------------------

  const manageDiscoverability = async (options = {}) => {
    const { findByEmail, findByPhone } = options;
    console.log('🔄 Navigating to discoverability settings...');
    navigateTo(SETTINGS_URLS.discoverability);
    await sleep(3000);

    const toggles = getToggles();
    let changed = 0;

    for (const toggle of toggles) {
      const lbl = toggle.label.toLowerCase();
      let desired = null;

      if (findByEmail !== undefined && lbl.includes('email')) desired = findByEmail;
      if (findByPhone !== undefined && lbl.includes('phone')) desired = findByPhone;

      if (desired !== null) {
        const didChange = await setToggle(toggle, desired);
        if (didChange) changed++;
      } else {
        console.log(`   - ${toggle.label.substring(0, 80)} [${toggle.enabled ? 'ON' : 'OFF'}]`);
      }
    }

    if (Object.keys(options).length === 0) {
      console.log('ℹ️ Usage: XActions.advancedSettings.manageDiscoverability({ findByEmail: false, findByPhone: false })');
    }

    console.log(`✅ Discoverability settings updated. ${changed} change(s) made.`);
  };

  // ---------------------------------------------------------------------------
  // 18. Spaces Listening Activity Visibility
  // ---------------------------------------------------------------------------

  const manageSpacesActivity = async (visible = null) => {
    console.log('🔄 Navigating to Spaces settings...');
    navigateTo(SETTINGS_URLS.spacesActivity);
    await sleep(3000);

    const toggles = getToggles();
    const spacesToggle = toggles.find(t =>
      t.label.toLowerCase().includes('space') ||
      t.label.toLowerCase().includes('listening') ||
      t.label.toLowerCase().includes('live')
    );

    if (spacesToggle && visible !== null) {
      await setToggle(spacesToggle, visible);
      console.log(`✅ Spaces listening activity visibility set to: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
    } else if (toggles.length > 0) {
      console.log('📋 Spaces-related toggles:');
      toggles.forEach(t => console.log(`   - ${t.label.substring(0, 80)} [${t.enabled ? 'ON' : 'OFF'}]`));
      console.log('ℹ️ Usage: XActions.advancedSettings.manageSpacesActivity(false) — to hide listening activity');
    } else {
      console.log('⚠️ No Spaces toggles found on this page. Spaces settings may be located elsewhere.');
    }
  };

  // ---------------------------------------------------------------------------
  // 19. Deactivate Account
  // ---------------------------------------------------------------------------

  const deactivateAccount = async () => {
    const confirmed = confirm(
      '⚠️ DANGER: You are about to navigate to the account deactivation page.\n\n' +
      'This will NOT immediately delete your account, but will begin the deactivation process.\n' +
      'You have 30 days to reactivate by logging back in.\n\n' +
      'Are you sure you want to proceed?'
    );

    if (!confirmed) {
      console.log('❌ Deactivation cancelled by user.');
      return;
    }

    console.log('🔄 Navigating to account deactivation...');
    navigateTo(SETTINGS_URLS.deactivate);
    await sleep(3000);

    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (primaryColumn) {
      console.log('⚠️ Deactivation page loaded. Read the information carefully.');
      console.log('⚠️ You must click the "Deactivate" button manually to confirm.');
      console.log('ℹ️ Your account will be deactivated for 30 days before permanent deletion.');
      console.log('ℹ️ To reactivate, simply log back in within 30 days.');
    } else {
      console.log('❌ Could not load deactivation page. Make sure you are logged in.');
    }
  };

  // ---------------------------------------------------------------------------
  // 20. Country/Region Settings
  // ---------------------------------------------------------------------------

  const manageCountry = async (newCountry = null) => {
    console.log('🔄 Navigating to country/region settings...');
    navigateTo(SETTINGS_URLS.country);
    await sleep(3000);

    const selects = document.querySelectorAll('select');

    if (newCountry && selects.length > 0) {
      const countrySelect = selects[0];
      const options = Array.from(countrySelect.options);
      const match = options.find(o =>
        o.text.toLowerCase().includes(newCountry.toLowerCase()) ||
        o.value.toLowerCase() === newCountry.toLowerCase()
      );

      if (match) {
        countrySelect.value = match.value;
        countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(1000);

        const saveBtn = document.querySelector('[data-testid="settingsSave"], button[type="submit"]');
        if (saveBtn) {
          saveBtn.click();
          await sleep(2000);
        }
        console.log(`✅ Country/region set to: ${match.text}`);
      } else {
        console.log(`❌ Country "${newCountry}" not found. Available options:`);
        options.slice(0, 30).forEach(o => console.log(`   - ${o.text}`));
      }
    } else {
      console.log('📋 Country/region settings page loaded.');
      if (selects.length > 0) {
        const current = selects[0];
        console.log(`   Current: ${current.options[current.selectedIndex]?.text || 'unknown'}`);
      }
      console.log('ℹ️ Usage: XActions.advancedSettings.manageCountry("United States")');
    }
  };

  // ---------------------------------------------------------------------------
  // Expose on window.XActions.advancedSettings
  // ---------------------------------------------------------------------------

  window.XActions = window.XActions || {};
  window.XActions.advancedSettings = {
    changePassword,
    changeEmail,
    changePhone,
    changeUsername,
    setup2FA,
    viewLoginHistory,
    manageConnectedApps,
    manageSessions,
    toggleSensitiveContent,
    manageAdPreferences,
    manageDataSharing,
    manageLocationSettings,
    manageAccessibility,
    manageDisplay,
    manageLanguages,
    manageAudienceTagging,
    manageDiscoverability,
    manageSpacesActivity,
    deactivateAccount,
    manageCountry,
  };

  // ---------------------------------------------------------------------------
  // Print menu
  // ---------------------------------------------------------------------------

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           XActions — Advanced Settings Manager              ║');
  console.log('║                      by nichxbt                             ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Account                                                    ║');
  console.log('║  1.  changePassword(current, new)                           ║');
  console.log('║  2.  changeEmail(newEmail)                                  ║');
  console.log('║  3.  changePhone(phoneNumber)                               ║');
  console.log('║  4.  changeUsername(newUsername)                             ║');
  console.log('║                                                             ║');
  console.log('║  Security                                                   ║');
  console.log('║  5.  setup2FA(method)          — "sms", "app", "key"       ║');
  console.log('║  6.  viewLoginHistory()                                     ║');
  console.log('║  7.  manageConnectedApps(revokeAppName?)                    ║');
  console.log('║  8.  manageSessions(logoutAll?)                             ║');
  console.log('║                                                             ║');
  console.log('║  Privacy & Content                                          ║');
  console.log('║  9.  toggleSensitiveContent(show)                           ║');
  console.log('║  10. manageAdPreferences({...})                             ║');
  console.log('║  11. manageDataSharing({...})                               ║');
  console.log('║  12. manageLocationSettings({...})                          ║');
  console.log('║                                                             ║');
  console.log('║  Display & Accessibility                                    ║');
  console.log('║  13. manageAccessibility({...})                             ║');
  console.log('║  14. manageDisplay({ theme, fontSize, color })              ║');
  console.log('║  15. manageLanguages(displayLanguage?)                      ║');
  console.log('║                                                             ║');
  console.log('║  Social & Discovery                                         ║');
  console.log('║  16. manageAudienceTagging({...})                           ║');
  console.log('║  17. manageDiscoverability({ findByEmail, findByPhone })    ║');
  console.log('║  18. manageSpacesActivity(visible?)                         ║');
  console.log('║                                                             ║');
  console.log('║  Danger Zone                                                ║');
  console.log('║  19. deactivateAccount()       — with safety prompt        ║');
  console.log('║  20. manageCountry(countryName?)                            ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Access: XActions.advancedSettings.<functionName>(...)      ║');
  console.log('║  Example: XActions.advancedSettings.manageDisplay({         ║');
  console.log('║    theme: "dark", color: "blue" })                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

})();
