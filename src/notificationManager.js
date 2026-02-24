// src/notificationManager.js
// Notification management for X/Twitter
// by nichxbt

/**
 * Notification Manager - Scrape, filter, and manage notifications
 * 
 * Features:
 * - Scrape notifications (likes, mentions, replies, follows)
 * - Filter by notification type
 * - Mute/unmute users and keywords
 * - Configure notification preferences
 * - Priority notifications (2026)
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  notificationTab: 'a[href="/notifications"]',
  mentionsTab: 'a[href="/notifications/mentions"]',
  notification: '[data-testid="notification"]',
  settingsGear: 'a[href="/settings/notifications"]',
  toggleSwitch: '[data-testid="settingsSwitch"]',
  notificationText: '[data-testid="notification"] span',
  userCell: '[data-testid="UserCell"]',
  muteOption: '[data-testid="mute"]',
};

/**
 * Scrape recent notifications
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function getNotifications(page, options = {}) {
  const { limit = 50, type = 'all' } = options;

  const url = type === 'mentions' ? 'https://x.com/notifications/mentions' : 'https://x.com/notifications';
  await page.goto(url, { waitUntil: 'networkidle2' });
  await sleep(3000);

  const notifications = [];
  let scrollAttempts = 0;

  while (notifications.length < limit && scrollAttempts < 15) {
    const newNotifs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="notification"]')).map(notif => {
        const text = notif.textContent || '';
        const links = Array.from(notif.querySelectorAll('a')).map(a => ({
          text: a.textContent,
          href: a.href,
        }));
        const time = notif.querySelector('time')?.getAttribute('datetime') || '';
        return { text: text.substring(0, 200), links, time };
      });
    });

    for (const notif of newNotifs) {
      if (!notifications.find(n => n.text === notif.text && n.time === notif.time)) {
        notifications.push(notif);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(1500);
    scrollAttempts++;
  }

  return {
    type,
    notifications: notifications.slice(0, limit),
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Mute a user
 * @param {import('puppeteer').Page} page
 * @param {string} username
 * @returns {Promise<Object>}
 */
export async function muteUser(page, username) {
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click more options
  await page.click('[data-testid="userActions"]');
  await sleep(1000);

  // Click mute
  await page.click('[data-testid="mute"]');
  await sleep(1500);

  return { success: true, action: 'muted', username, timestamp: new Date().toISOString() };
}

/**
 * Unmute a user
 * @param {import('puppeteer').Page} page
 * @param {string} username
 * @returns {Promise<Object>}
 */
export async function unmuteUser(page, username) {
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await sleep(2000);

  await page.click('[data-testid="userActions"]');
  await sleep(1000);
  await page.click('[data-testid="unmute"]');
  await sleep(1500);

  return { success: true, action: 'unmuted', username, timestamp: new Date().toISOString() };
}

/**
 * Mute a word/phrase
 * @param {import('puppeteer').Page} page
 * @param {string} word
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function muteWord(page, word, options = {}) {
  const { duration = 'forever' } = options; // forever, 24h, 7d, 30d

  await page.goto('https://x.com/settings/muted_keywords', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click add muted word
  await page.click('[data-testid="addMutedWord"]');
  await sleep(1000);

  // Type the word
  await page.click('[data-testid="mutedWordInput"]');
  await page.keyboard.type(word);
  await sleep(500);

  // Save
  await page.click('[data-testid="saveMutedWord"]');
  await sleep(1500);

  return { success: true, action: 'muted_word', word, duration, timestamp: new Date().toISOString() };
}

/**
 * Get notification settings
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Object>}
 */
export async function getNotificationSettings(page) {
  await page.goto('https://x.com/settings/notifications', { waitUntil: 'networkidle2' });
  await sleep(2000);

  const settings = await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('[data-testid="settingsSwitch"]'));
    return switches.map(s => ({
      label: s.closest('[role="listitem"]')?.textContent || '',
      enabled: s.getAttribute('aria-checked') === 'true',
    }));
  });

  return { settings, scrapedAt: new Date().toISOString() };
}

export default {
  getNotifications,
  muteUser,
  unmuteUser,
  muteWord,
  getNotificationSettings,
  SELECTORS,
};
