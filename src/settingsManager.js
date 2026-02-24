// src/settingsManager.js
// Account settings and privacy management for X/Twitter
// by nichxbt

/**
 * Settings Manager - Account security, privacy, preferences
 * 
 * Features:
 * - Toggle protected/private account
 * - Manage blocked/muted users
 * - Configure content preferences
 * - Data download/archive request
 * - Delegate access management
 * - Content filter settings
 * - Accessibility options
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  settingsNav: 'a[href="/settings"]',
  accountTab: 'a[href="/settings/account"]',
  privacyTab: 'a[href="/settings/privacy_and_safety"]',
  notificationsTab: 'a[href="/settings/notifications"]',
  settingsSwitch: '[role="switch"]',
  protectedToggle: '[data-testid="protectedTweets"]',
  dataDownload: 'a[href="/settings/download_data"]',
  deactivate: 'a[href="/settings/deactivate"]',
  twoFASettings: 'a[href="/settings/account/login_verification"]',
  blockedAccounts: 'a[href="/settings/blocked"]',
  mutedAccounts: 'a[href="/settings/muted"]',
  mutedKeywords: 'a[href="/settings/muted_keywords"]',
  contentPrefs: 'a[href="/settings/content_preferences"]',
  displaySettings: 'a[href="/settings/display"]',
  saveButton: '[data-testid="settingsSave"]',
};

/**
 * Get current settings overview
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Object>}
 */
export async function getSettings(page) {
  await page.goto('https://x.com/settings/account', { waitUntil: 'networkidle2' });
  await sleep(2000);

  const settings = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href^="/settings/"]'));
    const sections = links.map(link => ({
      text: link.textContent?.trim() || '',
      href: link.getAttribute('href') || '',
    }));

    const switches = Array.from(document.querySelectorAll('[role="switch"]')).map(sw => ({
      label: sw.closest('[data-testid]')?.textContent?.trim()?.substring(0, 100) || '',
      enabled: sw.getAttribute('aria-checked') === 'true',
    }));

    return { sections, switches };
  });

  return { settings, scrapedAt: new Date().toISOString() };
}

/**
 * Toggle protected/private account
 * @param {import('puppeteer').Page} page
 * @param {boolean} protect - true to protect, false to unprotect
 * @returns {Promise<Object>}
 */
export async function toggleProtectedAccount(page, protect) {
  await page.goto('https://x.com/settings/audience_and_tagging', { waitUntil: 'networkidle2' });
  await sleep(2000);

  const currentState = await page.evaluate((sel) => {
    const toggle = document.querySelector(sel.protectedToggle) || document.querySelector('[role="switch"]');
    return toggle?.getAttribute('aria-checked') === 'true';
  }, SELECTORS);

  if (currentState === protect) {
    return { success: true, action: 'no_change', protected: protect };
  }

  // Click toggle
  await page.click('[role="switch"]');
  await sleep(1000);

  // Confirm if needed
  try {
    await page.click('[data-testid="confirmationSheetConfirm"]');
    await sleep(1500);
  } catch (e) {
    // No confirmation needed
  }

  return {
    success: true,
    action: protect ? 'protected' : 'unprotected',
    protected: protect,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get blocked accounts list
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getBlockedAccounts(page, options = {}) {
  const { limit = 100 } = options;

  await page.goto('https://x.com/settings/blocked/all', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const blocked = [];
  let scrollAttempts = 0;

  while (blocked.length < limit && scrollAttempts < Math.ceil(limit / 5)) {
    const users = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="UserCell"]')).map(user => {
        const name = user.querySelector('[dir="ltr"]')?.textContent || '';
        const handle = user.querySelector('a[role="link"]')?.href?.split('/').pop() || '';
        return { name, handle };
      });
    });

    for (const user of users) {
      if (user.handle && !blocked.find(b => b.handle === user.handle)) {
        blocked.push(user);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(1500);
    scrollAttempts++;
  }

  return {
    blocked: blocked.slice(0, limit),
    count: Math.min(blocked.length, limit),
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Get muted accounts list
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getMutedAccounts(page, options = {}) {
  const { limit = 100 } = options;

  await page.goto('https://x.com/settings/muted/all', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const muted = [];
  let scrollAttempts = 0;

  while (muted.length < limit && scrollAttempts < Math.ceil(limit / 5)) {
    const users = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="UserCell"]')).map(user => {
        const name = user.querySelector('[dir="ltr"]')?.textContent || '';
        const handle = user.querySelector('a[role="link"]')?.href?.split('/').pop() || '';
        return { name, handle };
      });
    });

    for (const user of users) {
      if (user.handle && !muted.find(m => m.handle === user.handle)) {
        muted.push(user);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(1500);
    scrollAttempts++;
  }

  return {
    muted: muted.slice(0, limit),
    count: Math.min(muted.length, limit),
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Request data download/archive
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Object>}
 */
export async function requestDataDownload(page) {
  await page.goto('https://x.com/settings/download_your_data', { waitUntil: 'networkidle2' });
  await sleep(2000);

  try {
    await page.click('[data-testid="requestData"]');
    await sleep(2000);

    // May need password confirmation
    return {
      success: true,
      action: 'data_download_requested',
      note: 'Archive typically takes 24-48 hours to generate',
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    return {
      success: false,
      error: 'Could not request data download — may need password confirmation',
    };
  }
}

/**
 * Set content preferences (reduce political content, etc.)
 * @param {import('puppeteer').Page} page
 * @param {Object} preferences
 * @returns {Promise<Object>}
 */
export async function setContentPreferences(page, preferences = {}) {
  await page.goto('https://x.com/settings/content_preferences', { waitUntil: 'networkidle2' });
  await sleep(2000);

  const updated = [];

  // Toggle available preference switches
  const switches = await page.$$('[role="switch"]');
  for (const sw of switches) {
    const label = await sw.evaluate(el =>
      el.closest('[data-testid]')?.textContent?.trim()?.substring(0, 80) || ''
    );
    
    for (const [key, value] of Object.entries(preferences)) {
      if (label.toLowerCase().includes(key.toLowerCase())) {
        const currentState = await sw.evaluate(el => el.getAttribute('aria-checked') === 'true');
        if (currentState !== value) {
          await sw.click();
          await sleep(500);
          updated.push(key);
        }
      }
    }
  }

  return {
    updated,
    timestamp: new Date().toISOString(),
  };
}

export default {
  getSettings,
  toggleProtectedAccount,
  getBlockedAccounts,
  getMutedAccounts,
  requestDataDownload,
  setContentPreferences,
  SELECTORS,
};
