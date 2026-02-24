/**
 * XActions Mention Stream
 * Watches mentions of a username and emits new ones.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { searchTweets } from '../scrapers/index.js';
import { acquirePage, releasePage } from './browserPool.js';

/**
 * Poll mentions of a username and return new ones.
 *
 * @param {Object} opts
 * @param {string} opts.username - Target username (without @)
 * @param {string[]} opts.lastSeenIds - Tweet IDs already seen
 * @param {string} [opts.authToken] - Optional auth_token cookie
 * @returns {{ mentions: Object[], seenIds: string[] }}
 */
export async function pollMentions({ username, lastSeenIds = [], authToken }) {
  let browser, page;
  try {
    ({ browser, page } = await acquirePage(authToken));

    const query = `@${username}`;
    const tweets = await searchTweets(page, query, { limit: 30, filter: 'latest' });

    const lastSet = new Set(lastSeenIds);
    const newMentions = tweets.filter((t) => t.id && !lastSet.has(t.id));
    const allIds = [...new Set([...lastSeenIds, ...tweets.map((t) => t.id).filter(Boolean)])];

    // Keep only last 500 IDs
    const seenIds = allIds.slice(-500);

    return { mentions: newMentions, seenIds };
  } finally {
    if (browser && page) await releasePage(browser, page);
  }
}
