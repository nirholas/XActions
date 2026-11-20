// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// browser/advancedProfile.js
// Advanced profile management for X/Twitter
// by nichxbt
// https://github.com/nirholas/xactions
//
// Features:
//   1. Edit birthday (month, day, year, visibility)
//   2. Set pronouns
//   3. Professional account setup (Business / Creator category)
//   4. Creator profile configuration
//   5. Profile accent color / theme (Premium)
//   6. Custom app icon (Premium)
//   7. Custom navigation bar (Premium)
//   8. View-as / preview profile
//   9. Switch between accounts (multi-account)
//  10. Translate bio
//
// Usage:
//   1. Go to x.com and log in
//   2. Open Developer Console (F12)
//   3. Paste this script and press Enter
//   4. Call any function via window.XActions.advancedProfile.*
//
// Last Updated: 30 March 2026
(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ============================================================================
  // Selectors
  // ============================================================================

  const SEL = {
    editProfileButton: '[data-testid="editProfileButton"]',
    saveButton: '[data-testid="Profile_Save_Button"]',
    confirmButton: '[data-testid="confirmationSheetConfirm"]',
    backButton: '[data-testid="app-bar-back"]',
    toast: '[data-testid="toast"]',
    userCell: '[data-testid="UserCell"]',
    accountSwitcher: '[data-testid="SideNav_AccountSwitcher_Button"]',
    addAccount: '[data-testid="AccountSwitcher_AddAccount_Button"]',
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  const waitForSelector = async (selector, timeout = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(300);
    }
    return null;
  };

  const waitForXPath = async (xpath, timeout = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result.singleNodeValue) return result.singleNodeValue;
      await sleep(300);
    }
    return null;
  };

  const setInputValue = async (el, value) => {
    if (!el) return false;
    el.focus();
    el.select?.();
    await sleep(100);
    document.execCommand('selectAll');
    document.execCommand('delete');
    await sleep(100);
    document.execCommand('insertText', false, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(200);
    return true;
  };

  const clickByText = async (text, tag = 'span') => {
    const xpath = `//${tag}[contains(text(),"${text}")]`;
    const el = await waitForXPath(xpath);
    if (el) {
      el.closest('button, a, div[role="button"], div[role="option"], div[role="menuitem"]')?.click() || el.click();
      await sleep(1500);
      return true;
    }
    return false;
  };

  const selectDropdownValue = async (selectEl, value) => {
    if (!selectEl) return false;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype, 'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(selectEl, value);
    } else {
      selectEl.value = value;
    }
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    selectEl.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(500);
    return true;
  };

  const openEditProfile = async () => {
    const editBtn = document.querySelector(SEL.editProfileButton);
    if (editBtn) {
      editBtn.click();
      await sleep(2000);
      return true;
    }
    console.error('❌ Edit Profile button not found. Navigate to your profile page first.');
    return false;
  };

  const saveProfile = async () => {
    await sleep(500);
    const saveBtn = document.querySelector(SEL.saveButton);
    if (saveBtn) {
      saveBtn.click();
      await sleep(2000);
      console.log('✅ Profile saved!');
      return true;
    }
    console.warn('⚠️ Save button not found. Please save manually.');
    return false;
  };

  // ============================================================================
  // 1. Edit Birthday
  // ============================================================================

  /**
   * Set birthday fields in the profile edit dialog.
   * @param {Object} options
   * @param {string} options.month - Month name, e.g. 'January'
   * @param {number} options.day - Day of month, e.g. 15
   * @param {number} options.year - Year, e.g. 1995
   * @param {string} [options.visibility='Only you'] - 'Only you', 'My followers', 'Public'
   */
  const editBirthday = async ({ month, day, year, visibility = 'Only you' } = {}) => {
    console.log('🔄 Opening profile editor to set birthday...');

    if (!month || !day || !year) {
      console.error('❌ Please provide month, day, and year. Example: editBirthday({ month: "January", day: 15, year: 1995 })');
      return;
    }

    if (!(await openEditProfile())) return;

    // Look for the birthday section — click "Edit" or "Add" next to birthday
    const birthdayLink = await waitForXPath('//span[contains(text(),"Birth")]');
    if (birthdayLink) {
      const clickTarget = birthdayLink.closest('a, button, div[role="button"]');
      if (clickTarget) {
        clickTarget.click();
        await sleep(1500);
      }
    }

    // Also try clicking "Add your date of birth" or "Edit" link
    await clickByText('Add your date of birth') || await clickByText('Edit birth');
    await sleep(1000);

    // Find month/day/year select elements or input fields
    const selects = document.querySelectorAll('select');
    if (selects.length >= 3) {
      // Typically order: month, day, year
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = months.indexOf(month);
      if (monthIndex === -1) {
        console.error(`❌ Invalid month: "${month}". Use full name like "January".`);
        return;
      }

      // Month select
      await selectDropdownValue(selects[0], String(monthIndex + 1));
      console.log(`🔄 Set month: ${month}`);

      // Day select
      await selectDropdownValue(selects[1], String(day));
      console.log(`🔄 Set day: ${day}`);

      // Year select
      await selectDropdownValue(selects[2], String(year));
      console.log(`🔄 Set year: ${year}`);
    } else {
      // Fallback: try to find labeled inputs
      const monthInput = document.querySelector('[aria-label*="Month"], [name*="month"], #SELECTOR_MONTH');
      const dayInput = document.querySelector('[aria-label*="Day"], [name*="day"], #SELECTOR_DAY');
      const yearInput = document.querySelector('[aria-label*="Year"], [name*="year"], #SELECTOR_YEAR');

      if (monthInput) await setInputValue(monthInput, month);
      if (dayInput) await setInputValue(dayInput, String(day));
      if (yearInput) await setInputValue(yearInput, String(year));

      if (!monthInput && !dayInput && !yearInput) {
        console.error('❌ Could not find birthday fields. The UI may have changed.');
        return;
      }
    }

    // Set visibility if available
    if (visibility) {
      await sleep(500);
      const visibilityClicked = await clickByText(visibility);
      if (visibilityClicked) {
        console.log(`🔄 Birthday visibility set to: ${visibility}`);
      }
    }

    // Confirm if there is a confirmation dialog
    const confirmBtn = await waitForSelector(SEL.confirmButton, 2000);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(1000);
    }

    await saveProfile();
    console.log(`✅ Birthday set to ${month} ${day}, ${year}`);
  };

  // ============================================================================
  // 2. Set Pronouns
  // ============================================================================

  /**
   * Set pronouns in the profile edit dialog.
   * @param {string} pronouns - Pronouns text, e.g. 'they/them', 'she/her', 'he/him'
   */
  const setPronouns = async (pronouns) => {
    if (!pronouns) {
      console.error('❌ Please provide pronouns. Example: setPronouns("they/them")');
      return;
    }

    console.log(`🔄 Setting pronouns to "${pronouns}"...`);

    if (!(await openEditProfile())) return;

    // Look for pronouns input field
    const pronounsInput = document.querySelector(
      'input[name="pronouns"], input[aria-label*="Pronoun"], input[placeholder*="Pronoun"]'
    );

    if (pronounsInput) {
      await setInputValue(pronounsInput, pronouns);
      console.log(`🔄 Typed pronouns: ${pronouns}`);
    } else {
      // Try clicking on the pronouns section first
      const pronounsSection = await waitForXPath('//span[contains(text(),"Pronoun")]');
      if (pronounsSection) {
        const clickTarget = pronounsSection.closest('div[role="button"], button, a');
        if (clickTarget) {
          clickTarget.click();
          await sleep(1500);
        }
      }

      // Try finding the input after expanding
      const expandedInput = document.querySelector(
        'input[name="pronouns"], input[aria-label*="Pronoun"], input[placeholder*="Pronoun"]'
      );
      if (expandedInput) {
        await setInputValue(expandedInput, pronouns);
        console.log(`🔄 Typed pronouns: ${pronouns}`);
      } else {
        // Try selecting from predefined options
        const optionClicked = await clickByText(pronouns);
        if (!optionClicked) {
          console.error('❌ Could not find pronouns field. Navigate to profile edit or check if this feature is available for your account.');
          return;
        }
      }
    }

    await saveProfile();
    console.log(`✅ Pronouns set to "${pronouns}"`);
  };

  // ============================================================================
  // 3. Professional Account Setup
  // ============================================================================

  /**
   * Switch to a professional account and configure it.
   * @param {Object} options
   * @param {string} options.category - e.g. 'Business', 'Creator'
   * @param {string} [options.businessType] - e.g. 'Brand', 'Organization', 'Service'
   * @param {string} [options.professionalCategory] - e.g. 'Technology', 'Entertainment', 'Education'
   */
  const setupProfessionalAccount = async ({ category, businessType, professionalCategory } = {}) => {
    if (!category) {
      console.error('❌ Please provide a category. Example: setupProfessionalAccount({ category: "Business" })');
      return;
    }

    console.log(`🔄 Setting up professional account as "${category}"...`);

    // Navigate to professional account settings
    window.location.href = 'https://x.com/settings/convert_to_professional';
    await sleep(3000);

    // Wait for the page to load
    const pageLoaded = await waitForXPath('//span[contains(text(),"Professional")]', 10000);
    if (!pageLoaded) {
      // Try alternative path
      window.location.href = 'https://x.com/i/flow/convert_professional';
      await sleep(3000);
    }

    // Select category: Business or Creator
    const categoryClicked = await clickByText(category);
    if (categoryClicked) {
      console.log(`🔄 Selected category: ${category}`);
    } else {
      console.warn(`⚠️ Could not find "${category}" option. Looking for alternatives...`);
      // Try clicking any visible category button
      const buttons = document.querySelectorAll('div[role="button"], button');
      for (const btn of buttons) {
        if (btn.textContent?.includes(category)) {
          btn.click();
          await sleep(1500);
          console.log(`🔄 Selected category: ${category}`);
          break;
        }
      }
    }

    // Click Next/Continue if present
    await clickByText('Next') || await clickByText('Continue');
    await sleep(1500);

    // Select business type if provided
    if (businessType) {
      const typeClicked = await clickByText(businessType);
      if (typeClicked) {
        console.log(`🔄 Selected business type: ${businessType}`);
      }
      await clickByText('Next') || await clickByText('Continue');
      await sleep(1500);
    }

    // Select professional category if provided
    if (professionalCategory) {
      // Try searching for the category
      const searchInput = document.querySelector('input[type="text"], input[type="search"]');
      if (searchInput) {
        await setInputValue(searchInput, professionalCategory);
        await sleep(1500);
      }

      const catClicked = await clickByText(professionalCategory);
      if (catClicked) {
        console.log(`🔄 Selected professional category: ${professionalCategory}`);
      }
      await clickByText('Next') || await clickByText('Continue');
      await sleep(1500);
    }

    // Confirm / finish
    const finishClicked = await clickByText('Done') || await clickByText('Save') || await clickByText('Confirm');
    if (finishClicked) {
      console.log('✅ Professional account setup complete!');
    } else {
      console.log('⚠️ Please complete the remaining steps manually.');
    }
  };

  // ============================================================================
  // 4. Creator Profile Configuration
  // ============================================================================

  /**
   * Configure creator-specific profile settings.
   * @param {Object} options
   * @param {string} [options.bio] - Creator bio text
   * @param {string} [options.category] - Content category, e.g. 'Tech', 'Gaming'
   * @param {string} [options.contentType] - Content type, e.g. 'Videos', 'Blogs'
   */
  const configureCreatorProfile = async ({ bio, category, contentType } = {}) => {
    console.log('🔄 Configuring creator profile...');

    // Navigate to creator settings
    window.location.href = 'https://x.com/settings/creator';
    await sleep(3000);

    const pageLoaded = await waitForXPath('//span[contains(text(),"Creator")]', 8000);
    if (!pageLoaded) {
      // Try profile edit as fallback
      console.log('🔄 Creator settings page not found, trying professional tools...');
      window.location.href = 'https://x.com/i/professional_tools';
      await sleep(3000);
    }

    if (bio) {
      const bioField = document.querySelector(
        'textarea[name="description"], textarea[aria-label*="bio" i], textarea[placeholder*="bio" i]'
      );
      if (bioField) {
        await setInputValue(bioField, bio);
        console.log(`🔄 Updated creator bio (${bio.length} chars)`);
      }
    }

    if (category) {
      const catClicked = await clickByText(category);
      if (catClicked) {
        console.log(`🔄 Selected category: ${category}`);
      } else {
        // Try searching
        const searchInput = document.querySelector('input[type="text"], input[type="search"]');
        if (searchInput) {
          await setInputValue(searchInput, category);
          await sleep(1000);
          await clickByText(category);
        }
      }
    }

    if (contentType) {
      const typeClicked = await clickByText(contentType);
      if (typeClicked) {
        console.log(`🔄 Selected content type: ${contentType}`);
      }
    }

    // Save
    const saved = await clickByText('Save') || await clickByText('Done');
    if (saved) {
      console.log('✅ Creator profile configured!');
    } else {
      console.log('⚠️ Please save changes manually if needed.');
    }
  };

  // ============================================================================
  // 5. Profile Accent Color / Theme (Premium)
  // ============================================================================

  /**
   * Change profile accent color. Requires Premium subscription.
   * @param {string} color - Color name or hex. Options: 'blue', 'yellow', 'pink', 'purple', 'orange', 'green'
   */
  const setAccentColor = async (color) => {
    if (!color) {
      console.error('❌ Please provide a color. Example: setAccentColor("purple")');
      console.log('   Options: blue, yellow, pink, purple, orange, green');
      return;
    }

    console.log(`🔄 Setting accent color to "${color}"...`);

    // Navigate to display settings
    window.location.href = 'https://x.com/i/display';
    await sleep(3000);

    const displayPage = await waitForXPath('//span[contains(text(),"Display")]', 8000);
    if (!displayPage) {
      console.error('❌ Could not load display settings page.');
      return;
    }

    // Color map for the radio buttons
    const colorMap = {
      blue: 'Color-0',
      yellow: 'Color-1',
      pink: 'Color-2',
      purple: 'Color-3',
      orange: 'Color-4',
      green: 'Color-5',
    };

    const colorKey = color.toLowerCase();
    const colorSelector = colorMap[colorKey];

    if (colorSelector) {
      // Try data-testid first
      const colorBtn = document.querySelector(`[data-testid="${colorSelector}"], [aria-label*="${color}" i]`);
      if (colorBtn) {
        colorBtn.click();
        await sleep(1000);
        console.log(`✅ Accent color set to ${color}!`);
      } else {
        // Try clicking by finding radio/circle buttons in the color section
        const colorSection = await waitForXPath('//span[contains(text(),"Color")]');
        if (colorSection) {
          const container = colorSection.closest('div')?.parentElement;
          if (container) {
            const colorButtons = container.querySelectorAll('div[role="button"], label, input[type="radio"]');
            const index = Object.keys(colorMap).indexOf(colorKey);
            if (index >= 0 && colorButtons[index]) {
              colorButtons[index].click();
              await sleep(1000);
              console.log(`✅ Accent color set to ${color}!`);
            } else {
              console.error(`❌ Color "${color}" not found. Options: ${Object.keys(colorMap).join(', ')}`);
            }
          }
        } else {
          console.error('❌ Color picker not found. You may need a Premium subscription.');
        }
      }
    } else {
      console.error(`❌ Unknown color "${color}". Options: ${Object.keys(colorMap).join(', ')}`);
    }

    // Click Done if present
    await clickByText('Done');
  };

  // ============================================================================
  // 6. Custom App Icon (Premium)
  // ============================================================================

  /**
   * Change the X app icon. Requires Premium subscription.
   * @param {string} iconName - Icon name, e.g. 'default', 'lightning', 'party', 'seasonal'
   */
  const setAppIcon = async (iconName) => {
    if (!iconName) {
      console.error('❌ Please provide an icon name. Example: setAppIcon("lightning")');
      return;
    }

    console.log(`🔄 Setting app icon to "${iconName}"...`);

    // Navigate to Premium customization settings
    window.location.href = 'https://x.com/i/premium_sign_up';
    await sleep(3000);

    // Try navigating to app icon settings
    const iconLink = await waitForXPath('//span[contains(text(),"App icon")]', 5000);
    if (iconLink) {
      const clickTarget = iconLink.closest('a, div[role="button"], button');
      if (clickTarget) {
        clickTarget.click();
        await sleep(2000);
      }
    } else {
      // Try direct navigation
      window.location.href = 'https://x.com/settings/app_icon';
      await sleep(3000);
    }

    // Select the icon
    const selected = await clickByText(iconName, 'span');
    if (!selected) {
      // Try by aria-label
      const iconBtn = document.querySelector(`[aria-label*="${iconName}" i]`);
      if (iconBtn) {
        iconBtn.click();
        await sleep(1000);
        console.log(`✅ App icon set to "${iconName}"!`);
      } else {
        console.error(`❌ Icon "${iconName}" not found. This feature requires X Premium.`);
        console.log('💡 Navigate to your Premium settings manually to see available icons.');
        return;
      }
    } else {
      console.log(`✅ App icon set to "${iconName}"!`);
    }

    // Confirm
    await clickByText('Save') || await clickByText('Done') || await clickByText('Confirm');
  };

  // ============================================================================
  // 7. Custom Navigation Bar (Premium)
  // ============================================================================

  /**
   * Customize the bottom navigation bar items. Requires Premium.
   * @param {string[]} items - Array of nav item names to enable, e.g. ['Home', 'Search', 'Spaces', 'Messages']
   */
  const customizeNavBar = async (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Please provide an array of nav items. Example: customizeNavBar(["Home", "Search", "Spaces", "Messages"])');
      return;
    }

    console.log(`🔄 Customizing navigation bar: [${items.join(', ')}]...`);

    // Navigate to navigation customization
    window.location.href = 'https://x.com/settings/navigation';
    await sleep(3000);

    const navPage = await waitForXPath('//span[contains(text(),"Navigation")]', 8000);
    if (!navPage) {
      // Try Premium settings path
      window.location.href = 'https://x.com/i/premium_sign_up';
      await sleep(3000);
      const navLink = await waitForXPath('//span[contains(text(),"Navigation")]');
      if (navLink) {
        const clickTarget = navLink.closest('a, div[role="button"], button');
        if (clickTarget) {
          clickTarget.click();
          await sleep(2000);
        }
      } else {
        console.error('❌ Navigation customization not found. This feature requires X Premium.');
        return;
      }
    }

    // Toggle items on/off
    let enabledCount = 0;
    for (const item of items) {
      const toggled = await clickByText(item);
      if (toggled) {
        enabledCount++;
        console.log(`🔄 Toggled: ${item}`);
      } else {
        console.warn(`⚠️ Could not find nav item: "${item}"`);
      }
      await sleep(500);
    }

    // Save
    const saved = await clickByText('Save') || await clickByText('Done');
    if (saved) {
      console.log(`✅ Navigation bar customized! ${enabledCount}/${items.length} items toggled.`);
    } else if (enabledCount > 0) {
      console.log(`✅ Toggled ${enabledCount} items. Save manually if needed.`);
    } else {
      console.error('❌ Could not customize navigation bar. This feature requires X Premium.');
    }
  };

  // ============================================================================
  // 8. View-as / Preview Profile
  // ============================================================================

  /**
   * Preview how your profile appears to the public or a specific user.
   * @param {string} [username] - Optional username to view your profile as. Leave empty for public view.
   */
  const previewProfile = async (username) => {
    console.log('🔄 Previewing profile...');

    // Get current user handle from the sidebar
    const currentHandle = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')
      ?.textContent?.match(/@(\w+)/)?.[1];

    if (!currentHandle) {
      console.error('❌ Could not determine your username. Make sure you are logged in.');
      return;
    }

    if (username) {
      console.log(`🔄 Opening your profile as it appears to @${username}...`);
      console.log('⚠️ X does not have a native "view as specific user" feature.');
      console.log('💡 Opening your profile in a way that simulates a public view.');
    }

    // Open profile in a new window with no auth to see public view
    const profileUrl = `https://x.com/${currentHandle}`;

    // Scrape current profile data for comparison
    const profileData = {
      name: document.querySelector('[data-testid="UserName"]')?.textContent || '',
      bio: document.querySelector('[data-testid="UserDescription"]')?.textContent || '',
      location: document.querySelector('[data-testid="UserLocation"]')?.textContent || '',
      website: document.querySelector('[data-testid="UserUrl"]')?.textContent || '',
      joinDate: document.querySelector('[data-testid="UserJoinDate"]')?.textContent || '',
      followers: document.querySelector('a[href$="/verified_followers"] span, a[href$="/followers"] span')?.textContent || '',
      following: document.querySelector('a[href$="/following"] span')?.textContent || '',
      isVerified: !!document.querySelector('[data-testid="icon-verified"]'),
      avatarUrl: document.querySelector('img[alt="Opens profile photo"]')?.src || '',
    };

    // Navigate to own profile to show what it looks like
    window.location.href = profileUrl;
    await sleep(3000);

    console.log('✅ Profile preview loaded!');
    console.log('📋 Your public profile data:');
    console.log(`   👤 Name: ${profileData.name}`);
    console.log(`   📝 Bio: ${profileData.bio || '(empty)'}`);
    console.log(`   📍 Location: ${profileData.location || '(empty)'}`);
    console.log(`   🔗 Website: ${profileData.website || '(empty)'}`);
    console.log(`   📅 Joined: ${profileData.joinDate}`);
    console.log(`   👥 Followers: ${profileData.followers}`);
    console.log(`   👁️ Following: ${profileData.following}`);
    console.log(`   ✓ Verified: ${profileData.isVerified ? 'Yes' : 'No'}`);

    if (username) {
      console.log(`\n💡 To see how @${username} sees your profile:`);
      console.log('   - If your account is public, everyone sees the same profile.');
      console.log('   - If protected, non-followers see a limited view.');
      console.log('   - Blocked users cannot see your profile at all.');
    }

    return profileData;
  };

  // ============================================================================
  // 9. Switch Between Accounts (Multi-Account)
  // ============================================================================

  /**
   * Switch to a different account using the account switcher.
   * @param {string} [handle] - The @handle to switch to (without @). Leave empty to show available accounts.
   */
  const switchAccount = async (handle) => {
    console.log('🔄 Opening account switcher...');

    const switcherBtn = document.querySelector(SEL.accountSwitcher);
    if (!switcherBtn) {
      console.error('❌ Account switcher button not found. Make sure you are on x.com.');
      return;
    }

    switcherBtn.click();
    await sleep(1500);

    // Get list of available accounts
    const accountCells = document.querySelectorAll('[data-testid="AccountSwitcher_Account"], div[role="listitem"], div[role="option"]');
    const accounts = [];

    accountCells.forEach(cell => {
      const text = cell.textContent || '';
      const handleMatch = text.match(/@(\w+)/);
      if (handleMatch) {
        accounts.push(handleMatch[1]);
      }
    });

    if (accounts.length === 0) {
      // Try finding accounts in the popup/dropdown
      const popup = document.querySelector('[role="menu"], [role="dialog"], [role="listbox"]');
      if (popup) {
        const spans = popup.querySelectorAll('span');
        spans.forEach(span => {
          const handleMatch = span.textContent?.match(/@(\w+)/);
          if (handleMatch && !accounts.includes(handleMatch[1])) {
            accounts.push(handleMatch[1]);
          }
        });
      }
    }

    if (!handle) {
      console.log('📋 Available accounts:');
      if (accounts.length > 0) {
        accounts.forEach((acc, i) => console.log(`   ${i + 1}. @${acc}`));
      } else {
        console.log('   (could not detect accounts — the popup may need manual inspection)');
      }
      console.log('\n💡 Call switchAccount("handle") to switch.');

      // Close the popup
      document.body.click();
      await sleep(500);
      return accounts;
    }

    // Find and click the target account
    console.log(`🔄 Switching to @${handle}...`);

    const targetClicked = await clickByText(`@${handle}`);
    if (targetClicked) {
      await sleep(2000);
      console.log(`✅ Switched to @${handle}!`);
      return true;
    }

    // Try clicking by matching account cells
    let switched = false;
    const allCells = document.querySelectorAll('[data-testid="AccountSwitcher_Account"], div[role="listitem"], div[role="option"]');
    for (const cell of allCells) {
      if (cell.textContent?.includes(handle)) {
        cell.click();
        await sleep(2000);
        console.log(`✅ Switched to @${handle}!`);
        switched = true;
        break;
      }
    }

    if (!switched) {
      console.error(`❌ Account @${handle} not found in switcher.`);
      console.log('💡 Add the account first via the account switcher menu.');
      // Close the popup
      document.body.click();
      await sleep(500);
    }
  };

  // ============================================================================
  // 10. Translate Bio
  // ============================================================================

  /**
   * Translate another user's bio if in a foreign language.
   * @param {string} [username] - Username whose bio to translate. Leave empty if already on their profile.
   */
  const translateBio = async (username) => {
    if (username) {
      console.log(`🔄 Navigating to @${username}'s profile...`);
      window.location.href = `https://x.com/${username}`;
      await sleep(3000);
    }

    console.log('🔄 Looking for bio to translate...');

    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    if (!bioEl) {
      console.error('❌ No bio found on this profile.');
      return;
    }

    const bioText = bioEl.textContent?.trim();
    if (!bioText) {
      console.error('❌ Bio is empty.');
      return;
    }

    console.log(`📝 Original bio: "${bioText}"`);

    // Check for X's built-in translate button
    const translateBtn = document.querySelector(
      'button[aria-label*="Translate" i], [data-testid="translateBio"], span[role="button"]'
    );

    // Also look for "Translate bio" link that X sometimes shows
    const translateLink = await waitForXPath('//span[contains(text(),"Translate bio")]', 3000);

    if (translateBtn) {
      translateBtn.click();
      await sleep(2000);
      console.log('✅ Translation requested via X built-in translator.');

      // Try to read the translated text
      const translatedEl = document.querySelector('[data-testid="UserDescription"] + div, [lang] [data-testid="UserDescription"]');
      if (translatedEl) {
        console.log(`🌐 Translated: "${translatedEl.textContent?.trim()}"`);
      }
    } else if (translateLink) {
      translateLink.click();
      await sleep(2000);
      console.log('✅ Translation requested.');
    } else {
      // Fallback: use browser built-in translation hint
      console.log('⚠️ No translate button found on this profile.');
      console.log('💡 Trying fallback: detecting language and providing manual options...');

      // Simple language detection heuristic
      const hasNonLatin = /[^\u0000-\u007F]/.test(bioText);
      const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(bioText);
      const hasCyrillic = /[\u0400-\u04ff]/.test(bioText);
      const hasArabic = /[\u0600-\u06ff]/.test(bioText);

      let detectedLang = 'unknown';
      if (hasCJK) detectedLang = 'CJK (Chinese/Japanese/Korean)';
      else if (hasCyrillic) detectedLang = 'Cyrillic (Russian/Ukrainian/etc.)';
      else if (hasArabic) detectedLang = 'Arabic';
      else if (hasNonLatin) detectedLang = 'non-Latin script';
      else detectedLang = 'Latin script (may already be English)';

      console.log(`🔍 Detected script: ${detectedLang}`);
      console.log(`🌐 Google Translate link:`);
      console.log(`   https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(bioText)}`);

      return { original: bioText, detectedScript: detectedLang };
    }

    return { original: bioText, translated: true };
  };

  // ============================================================================
  // Expose on window.XActions.advancedProfile
  // ============================================================================

  window.XActions = window.XActions || {};
  window.XActions.advancedProfile = {
    editBirthday,
    setPronouns,
    setupProfessionalAccount,
    configureCreatorProfile,
    setAccentColor,
    setAppIcon,
    customizeNavBar,
    previewProfile,
    switchAccount,
    translateBio,
  };

  // ============================================================================
  // Menu
  // ============================================================================

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       🛠️ XActions Advanced Profile Manager          ║');
  console.log('║                  by nichxbt                         ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║                                                      ║');
  console.log('║  1. editBirthday({ month, day, year, visibility })  ║');
  console.log('║  2. setPronouns("they/them")                        ║');
  console.log('║  3. setupProfessionalAccount({ category, ... })     ║');
  console.log('║  4. configureCreatorProfile({ bio, category, ... }) ║');
  console.log('║  5. setAccentColor("purple")           [Premium]    ║');
  console.log('║  6. setAppIcon("lightning")             [Premium]    ║');
  console.log('║  7. customizeNavBar(["Home", ...])      [Premium]    ║');
  console.log('║  8. previewProfile("username")                      ║');
  console.log('║  9. switchAccount("handle")                         ║');
  console.log('║ 10. translateBio("username")                        ║');
  console.log('║                                                      ║');
  console.log('║  Access: window.XActions.advancedProfile.<function> ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
})();
