/**
 * XActions Browser Pool
 * Manages a pool of Puppeteer browser instances for streaming.
 * Max 3 browsers, shared across all active streams.
 *
 * Features:
 * - Automatic pruning of disconnected / over-age browsers
 * - Acquisition timeout to prevent deadlocks
 * - Max-age recycling (30 min) to cap memory leaks
 * - Graceful page-creation failure handling
 * - Health check
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { createBrowser, createPage, loginWithCookie } from '../scrapers/index.js';

const MAX_BROWSERS = parseInt(process.env.XACTIONS_MAX_BROWSERS || '3', 10);
const MAX_PAGES_PER_BROWSER = 5;
const MAX_BROWSER_AGE_MS = 30 * 60 * 1000; // 30 min — recycle to prevent memory leaks
const ACQUIRE_TIMEOUT_MS = 30_000; // 30s max wait

/** @type {{ browser: import('puppeteer').Browser, pages: number, createdAt: Date, id: number }[]} */
const pool = [];
let nextBrowserId = 1;

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Remove disconnected and idle over-age browsers from pool.
 */
async function prunePool() {
  const now = Date.now();
  const toRemove = [];

  for (let i = pool.length - 1; i >= 0; i--) {
    const entry = pool[i];
    const disconnected = !entry.browser.isConnected();
    const tooOld = (now - entry.createdAt.getTime()) > MAX_BROWSER_AGE_MS && entry.pages === 0;

    if (disconnected || tooOld) {
      toRemove.push(i);
      try { await entry.browser.close(); } catch { /* already dead */ }
    }
  }

  for (const idx of toRemove) {
    pool.splice(idx, 1);
  }

  if (toRemove.length > 0) {
    console.log(`🧹 Browser pool: pruned ${toRemove.length} stale browser(s), ${pool.length} remaining`);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Acquire a browser from the pool.
 * Reuses the least-loaded connected browser or spins up a new one.
 * Times out after ACQUIRE_TIMEOUT_MS.
 */
export async function acquireBrowser() {
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await prunePool();

    const available = pool
      .filter((b) => b.browser.isConnected())
      .sort((a, b) => a.pages - b.pages);

    // Reuse if a browser has capacity
    if (available.length > 0 && available[0].pages < MAX_PAGES_PER_BROWSER) {
      available[0].pages++;
      return available[0].browser;
    }

    // Create new if under the cap
    if (pool.length < MAX_BROWSERS) {
      const browser = await createBrowser({ headless: 'new' });
      const entry = { browser, pages: 1, createdAt: new Date(), id: nextBrowserId++ };
      pool.push(entry);
      console.log(`🌐 Browser pool: created browser #${entry.id} (${pool.length}/${MAX_BROWSERS})`);
      return browser;
    }

    // All at capacity — overload lightest connected browser
    if (available.length > 0) {
      available[0].pages++;
      return available[0].browser;
    }

    // Nothing available — wait and retry
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Browser pool: timed out after ${ACQUIRE_TIMEOUT_MS / 1000}s — all browsers unavailable`);
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
 * Returns { browser, page } — caller must call releasePage() when done.
 */
export async function acquirePage(authToken) {
  const browser = await acquireBrowser();
  try {
    const page = await createPage(browser);
    if (authToken) {
      await loginWithCookie(page, authToken);
    }
    return { browser, page };
  } catch (err) {
    // Release the slot if page creation fails
    releaseBrowser(browser);
    throw err;
  }
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
 * Close all browsers in the pool (for shutdown).
 */
export async function closeAll() {
  await Promise.allSettled(
    pool.map(async (entry) => {
      try { await entry.browser.close(); } catch { /* ignore */ }
    })
  );
  pool.length = 0;
  console.log('🌐 Browser pool: all browsers closed');
}

/**
 * Get pool status.
 */
export function getPoolStatus() {
  return {
    browsers: pool.length,
    maxBrowsers: MAX_BROWSERS,
    maxPagesPerBrowser: MAX_PAGES_PER_BROWSER,
    totalActivePages: pool.reduce((sum, b) => sum + b.pages, 0),
    details: pool.map((b) => ({
      id: b.id,
      connected: b.browser.isConnected(),
      activePages: b.pages,
      ageMs: Date.now() - b.createdAt.getTime(),
    })),
  };
}

/**
 * Health check — true if at least one browser can be acquired.
 */
export async function isHealthy() {
  try {
    await prunePool();
    const connected = pool.filter((b) => b.browser.isConnected()).length;
    return connected > 0 || pool.length < MAX_BROWSERS;
  } catch {
    return false;
  }
}
