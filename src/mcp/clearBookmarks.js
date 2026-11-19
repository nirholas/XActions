// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Remove every bookmark, one post at a time, from a Puppeteer page.
 *
 * X no longer offers the "Clear all bookmarks" item in the bookmarks page's
 * overflow menu that `x_clear_bookmarks` used to click (found by @CameronHN
 * while testing by hand), so the tool found nothing to click and reported
 * failure on every call. This removes each
 * bookmark through its own button instead, with the delays and rate-limit
 * cooldown the browser console script (`src/clearAllBookmarks.js`) uses.
 *
 * A removal is counted only once that specific post has left the feed. X can
 * re-render the clicked node, so the post is identified by its permalink
 * before the click rather than by the element. A removal that X does not
 * confirm stops the run instead of clicking the same post again.
 *
 * Re-landed from @CameronHN's https://github.com/nirholas/XActions/pull/88.
 *
 * @module mcp/clearBookmarks
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { gotoAndRender, RENDER_TIMEOUT_MS } from '../utils/navigation.js';

export const BOOKMARKS_URL = 'https://x.com/i/bookmarks';

export const BOOKMARK_SELECTORS = Object.freeze({
  tweet: 'article[data-testid="tweet"]',
  remove:
    'article[data-testid="tweet"] [data-testid="removeBookmark"], article[data-testid="tweet"] button[aria-label*="Remove"]',
  emptyState: '[data-testid="emptyState"]',
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) => sleep(min + Math.random() * (max - min));

/**
 * @param {object} pg Puppeteer page
 * @param {object} [options]
 * @param {boolean} [options.navigate=true] open the bookmarks page first
 * @param {number} [options.renderTimeout=15000] how long to wait for the feed to render
 * @param {number} [options.maxEmptyScrolls=6] scrolls with no button before stopping
 * @param {number} [options.maxConsecutiveErrors=10] failed clicks in a row before stopping
 * @param {number} [options.maxCooldowns=5] rate-limit cooldowns in a row before stopping
 * @param {number} [options.cooldownMs=60000] pause when X shows a rate-limit toast
 * @param {number} [options.confirmTimeout=5000] how long to wait for a post to leave the feed
 * @param {() => Promise<void>} [options.pause] pause between removals (1 to 3 s)
 * @param {() => Promise<void>} [options.scrollPause] pause after a scroll (1.8 to 2.6 s)
 * @returns {Promise<object>} `{ success, message, removed, ... }`
 */
export async function clearBookmarksOneByOne(pg, options = {}) {
  const {
    navigate = true,
    renderTimeout = RENDER_TIMEOUT_MS,
    maxEmptyScrolls = 6,
    maxConsecutiveErrors = 10,
    maxCooldowns = 5,
    cooldownMs = 60000,
    confirmTimeout = 5000,
    pause = () => randomDelay(),
    scrollPause = () => randomDelay(1800, 2600),
  } = options;

  if (navigate) {
    await gotoAndRender(pg, BOOKMARKS_URL, `${BOOKMARK_SELECTORS.tweet}, ${BOOKMARK_SELECTORS.emptyState}`, {
      timeout: renderTimeout,
    });
    await pause();
  }

  let removed = 0;
  let consecutiveErrors = 0;
  let cooldowns = 0;
  let emptyScrolls = 0;

  while (emptyScrolls < maxEmptyScrolls && consecutiveErrors < maxConsecutiveErrors) {
    const rateLimited = await pg.evaluate(isRateLimitedInPage);
    if (rateLimited) {
      cooldowns++;
      if (cooldowns > maxCooldowns) {
        return {
          success: false,
          message: `X kept showing a rate-limit notice through ${maxCooldowns} cooldowns; stopped. Run it again later to continue.`,
          removed,
        };
      }
      await sleep(cooldownMs);
      continue;
    }
    cooldowns = 0;

    const button = await pg.$(BOOKMARK_SELECTORS.remove);
    if (!button) {
      emptyScrolls++;
      await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await scrollPause();
      continue;
    }

    const postHref = await button.evaluate(permalinkOfPost);
    if (!postHref) {
      return { success: false, message: 'Could not identify the bookmarked post before removing it; stopped', removed };
    }

    try {
      await button.click();
    } catch {
      consecutiveErrors++;
      await pause();
      continue;
    }

    try {
      await pg.waitForFunction(postIsGone, { timeout: confirmTimeout }, postHref);
    } catch {
      return {
        success: false,
        message: 'X did not confirm a bookmark removal; stopped rather than click the same post again',
        removed,
        unconfirmedBookmark: postHref,
      };
    }

    removed++;
    consecutiveErrors = 0;
    emptyScrolls = 0;
    await pause();
  }

  if (consecutiveErrors >= maxConsecutiveErrors) {
    return { success: false, message: 'Stopped after repeated bookmark-removal errors', removed, errors: consecutiveErrors };
  }

  if (removed === 0) {
    const xSaysEmpty = await pg.evaluate(
      (sel) => !!document.querySelector(sel),
      BOOKMARK_SELECTORS.emptyState,
    );
    if (xSaysEmpty) return { success: true, message: 'X shows no bookmarks; there was nothing to remove', removed };
    return {
      success: false,
      message: 'No bookmark removal buttons found. Check that the MCP browser is logged in (xactions login) and that the bookmarks page loads.',
      removed,
    };
  }

  return { success: true, message: `Removed ${removed} bookmark${removed === 1 ? '' : 's'}; none are left on the page`, removed };
}

// ---------------------------------------------------------------------------
// Page-side functions (serialised into the page; keep them self-contained)
// ---------------------------------------------------------------------------

/** X's rate-limit toast, the same test the console script uses. */
export function isRateLimitedInPage() {
  const toast = document.querySelector('[data-testid="toast"], [role="alert"]');
  return /rate limit|try again|too many|slow down/i.test(toast?.textContent || '');
}

/** The permalink of the post a remove button belongs to (its timestamp link). */
export function permalinkOfPost(button) {
  const article = button.closest('article[data-testid="tweet"]');
  return article?.querySelector('a[href*="/status/"] time')?.closest('a')?.getAttribute('href') || null;
}

/** True once no post in the feed carries this permalink. */
export function postIsGone(href) {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  return !Array.from(articles).some((article) => {
    const link = article.querySelector('a[href*="/status/"] time')?.closest('a');
    return link?.getAttribute('href') === href;
  });
}
