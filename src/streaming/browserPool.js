/**
 * XActions Browser Pool
 * Manages a pool of Puppeteer browser instances for streaming.
 * Max 3 browsers, shared across all active streams.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { createBrowser, createPage, loginWithCookie } from '../scrapers/index.js';

const MAX_BROWSERS = 3;

/** @type {{ browser: import('puppeteer').Browser, pages: number, createdAt: Date }[]} */
const pool = [];

/**
 * Acquire a browser from the pool.
 * Reuses the least-loaded browser or creates a new one if under the cap.
 */
export async function acquireBrowser() {
  // Find browser with fewest active pages
  const available = pool
    .filter((b) => b.browser.isConnected())
    .sort((a, b) => a.pages - b.pages);

  if (available.length > 0 && (available[0].pages < 5 || pool.length >= MAX_BROWSERS)) {
    available[0].pages++;
    return available[0].browser;
  }

  if (pool.length < MAX_BROWSERS) {
    const browser = await createBrowser({ headless: 'new' });
    const entry = { browser, pages: 1, createdAt: new Date() };
    pool.push(entry);
    return browser;
  }

  // All browsers at capacity — use the least-loaded one anyway
  available[0].pages++;
  return available[0].browser;
}

/**
 * Release a browser slot back to the pool.
 */
export function releaseBrowser(browser) {
  const entry = pool.find((b) => b.browser === browser);
  if (entry) {
    entry.pages = Math.max(0, entry.pages - 1);
  }
}

/**
 * Create an authenticated page from a pooled browser.
 */
export async function acquirePage(authToken) {
  const browser = await acquireBrowser();
  const page = await createPage(browser);
  if (authToken) {
    await loginWithCookie(page, authToken);
  }
  return { browser, page };
}

/**
 * Release a page and its browser slot.
 */
export async function releasePage(browser, page) {
  try {
    if (page && !page.isClosed()) {
      await page.close();
    }
  } catch { /* already closed */ }
  releaseBrowser(browser);
}

/**
 * Close all browsers in the pool.
 */
export async function closeAll() {
  for (const entry of pool) {
    try {
      await entry.browser.close();
    } catch { /* ignore */ }
  }
  pool.length = 0;
}

/**
 * Get pool status.
 */
export function getPoolStatus() {
  return {
    browsers: pool.length,
    maxBrowsers: MAX_BROWSERS,
    details: pool.map((b, i) => ({
      index: i,
      connected: b.browser.isConnected(),
      activePages: b.pages,
      uptime: Date.now() - b.createdAt.getTime(),
    })),
  };
}
