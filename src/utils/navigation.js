// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Page navigation that settles on x.com.
 *
 * `page.goto(url, { waitUntil: 'networkidle2' })` never settles on x.com:
 * media, ads and the live event pipeline keep the connection pool busy, so the
 * wait burns Puppeteer's whole 30s timeout and throws before the caller reads
 * a single field or clicks a single button. `domcontentloaded` returns as soon
 * as the app shell is in place; waiting for the selector the caller is about
 * to use is what makes that wait meaningful.
 *
 * The finding, and the first version of this helper (in the scrapers), came
 * from @devlewicki in https://github.com/nirholas/XActions/pull/100. It lives
 * here so the scrapers, the MCP tools and the workflow actions share one copy.
 *
 * @module utils/navigation
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** How long to wait for the caller's selector after the shell has loaded. */
export const RENDER_TIMEOUT_MS = 15000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Navigate to a page and wait for the content the caller needs.
 *
 * A missing selector is not fatal: the function resolves `false` and the
 * caller's own lookup (or retry loop) decides what that means, exactly as it
 * would have on a page that loaded without the element. A navigation that
 * itself fails (DNS, a 30s `domcontentloaded` timeout) still throws.
 *
 * With no selector there is nothing to wait for, so it pauses briefly instead,
 * which is what the old `networkidle2` wait was standing in for.
 *
 * @param {object} page Puppeteer (or Playwright) page
 * @param {string} url
 * @param {string} [waitFor] CSS selector marking the content about to be used
 * @param {object} [options]
 * @param {number} [options.timeout=15000] how long to wait for `waitFor`
 * @param {number} [options.settleMs] pause when there is no selector
 *   (default: a random 1 to 3 seconds)
 * @returns {Promise<boolean>} whether `waitFor` appeared (true when none was given)
 */
export async function gotoAndRender(page, url, waitFor, options = {}) {
  const { timeout = RENDER_TIMEOUT_MS, settleMs } = options;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (waitFor) {
    try {
      await page.waitForSelector(waitFor, { timeout });
      return true;
    } catch {
      // Nothing appeared; the caller decides whether that is fatal.
      return false;
    }
  }
  await sleep(settleMs ?? 1000 + Math.random() * 2000);
  return true;
}
