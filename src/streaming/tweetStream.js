/**
 * XActions Tweet Stream
 * Watches a user's tweets and emits new ones via callback.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { scrapeTweets } from '../scrapers/index.js';
import { acquirePage, releasePage } from './browserPool.js';

/**
 * Poll a user's tweets and return any new ones since lastSeenIds.
 *
 * @param {Object} opts
 * @param {string} opts.username - Target X/Twitter username (without @)
 * @param {string[]} opts.lastSeenIds - Tweet IDs already seen
 * @param {string} [opts.authToken] - Optional auth_token cookie
 * @returns {{ tweets: Object[], seenIds: string[] }}
 */
export async function pollTweets({ username, lastSeenIds = [], authToken }) {
  let browser, page;
  try {
    ({ browser, page } = await acquirePage(authToken));

    const tweets = await scrapeTweets(page, username, { limit: 30 });

    const lastSet = new Set(lastSeenIds);
    const newTweets = tweets.filter((t) => t.id && !lastSet.has(t.id));
    const allIds = [...new Set([...lastSeenIds, ...tweets.map((t) => t.id).filter(Boolean)])];

    // Keep only last 500 IDs to bound memory
    const seenIds = allIds.slice(-500);

    return { tweets: newTweets, seenIds };
  } finally {
    if (browser && page) await releasePage(browser, page);
  }
}
