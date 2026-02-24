// src/bookmarkManager.js
// Advanced bookmark management for X/Twitter
// by nichxbt

/**
 * Bookmark Manager - Save, organize, export, and manage bookmarks
 * 
 * Features:
 * - Bookmark/unbookmark posts
 * - Create bookmark folders (Premium)
 * - Export bookmarks to JSON/CSV
 * - Clear all bookmarks
 * - Search within bookmarks
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  bookmarksNav: 'a[href="/i/bookmarks"]',
  bookmark: '[data-testid="bookmark"]',
  removeBookmark: '[data-testid="removeBookmark"]',
  bookmarkFolder: '[data-testid="bookmarkFolder"]',
  createFolder: '[data-testid="createBookmarkFolder"]',
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  clearAll: '[data-testid="clearAllBookmarks"]',
  confirmClear: '[data-testid="confirmationSheetConfirm"]',
};

/**
 * Get all bookmarks
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getBookmarks(page, options = {}) {
  const { limit = 100, format = 'json' } = options;

  await page.goto('https://x.com/i/bookmarks', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const bookmarks = [];
  let scrollAttempts = 0;
  const maxScrolls = Math.ceil(limit / 5);

  while (bookmarks.length < limit && scrollAttempts < maxScrolls) {
    const newBookmarks = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel.tweet)).map(tweet => {
        const text = tweet.querySelector(sel.tweetText)?.textContent || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        const likes = tweet.querySelector('[data-testid="like"] span')?.textContent || '0';
        const hasMedia = !!tweet.querySelector('img[src*="media"], video');
        return { text, author, time, link, likes, hasMedia };
      });
    }, SELECTORS);

    for (const bm of newBookmarks) {
      if (bm.link && !bookmarks.find(b => b.link === bm.link)) {
        bookmarks.push(bm);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 1000));
    await sleep(1500);
    scrollAttempts++;
  }

  const result = bookmarks.slice(0, limit);

  if (format === 'csv') {
    const csv = [
      'text,author,time,link,likes,hasMedia',
      ...result.map(b => `"${b.text.replace(/"/g, '""')}","${b.author}","${b.time}","${b.link}","${b.likes}","${b.hasMedia}"`),
    ].join('\n');
    return { format: 'csv', data: csv, count: result.length };
  }

  return {
    bookmarks: result,
    count: result.length,
    format: 'json',
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Create a bookmark folder (Premium required)
 * @param {import('puppeteer').Page} page
 * @param {string} folderName
 * @returns {Promise<Object>}
 */
export async function createFolder(page, folderName) {
  await page.goto('https://x.com/i/bookmarks', { waitUntil: 'networkidle2' });
  await sleep(2000);

  try {
    await page.click(SELECTORS.createFolder);
    await sleep(1000);

    await page.click('input[name="folderName"]');
    await page.keyboard.type(folderName);
    await sleep(500);

    await page.click('[data-testid="createFolderConfirm"]');
    await sleep(1500);

    return { success: true, action: 'created_folder', name: folderName };
  } catch (e) {
    return { success: false, error: 'Could not create folder — Premium required' };
  }
}

/**
 * Clear all bookmarks
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Object>}
 */
export async function clearAllBookmarks(page) {
  await page.goto('https://x.com/i/bookmarks', { waitUntil: 'networkidle2' });
  await sleep(2000);

  try {
    // Open more options
    await page.click('[aria-label="More"]');
    await sleep(1000);

    await page.click(SELECTORS.clearAll);
    await sleep(1000);

    await page.click(SELECTORS.confirmClear);
    await sleep(2000);

    return { success: true, action: 'cleared_all', timestamp: new Date().toISOString() };
  } catch (e) {
    return { success: false, error: 'Could not clear bookmarks' };
  }
}

export default {
  getBookmarks,
  createFolder,
  clearAllBookmarks,
  SELECTORS,
};
