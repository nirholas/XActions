/**
 * XActions Follower Stream
 * Watches follower count changes and emits follow/unfollow events.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { scrapeProfile, scrapeFollowers } from '../scrapers/index.js';
import { acquirePage, releasePage } from './browserPool.js';

/**
 * Poll follower data and compute diff.
 *
 * @param {Object} opts
 * @param {string} opts.username - Target username (without @)
 * @param {string[]} opts.lastFollowers - Previously-known follower usernames
 * @param {number|null} opts.lastCount - Previously-known follower count
 * @param {string} [opts.authToken] - Optional auth_token cookie
 * @returns {{ profile: Object, newFollowers: string[], lostFollowers: string[], followers: string[], countDelta: number }}
 */
export async function pollFollowers({ username, lastFollowers = [], lastCount = null, authToken }) {
  let browser, page;
  try {
    ({ browser, page } = await acquirePage(authToken));

    // Scrape profile for count
    const profile = await scrapeProfile(page, username);

    // Scrape first page of followers (we keep it lightweight — 200 max)
    const followerList = await scrapeFollowers(page, username, { limit: 200 });
    const currentUsernames = followerList.map((f) => f.username);

    const lastSet = new Set(lastFollowers);
    const currentSet = new Set(currentUsernames);

    const newFollowers = currentUsernames.filter((u) => !lastSet.has(u));
    const lostFollowers = lastFollowers.filter((u) => !currentSet.has(u));

    const currentCount = parseInt(String(profile.followers || '0').replace(/[,K]/g, ''), 10) || currentUsernames.length;
    const countDelta = lastCount !== null ? currentCount - lastCount : 0;

    return {
      profile,
      newFollowers,
      lostFollowers,
      followers: currentUsernames,
      followerCount: currentCount,
      countDelta,
    };
  } finally {
    if (browser && page) await releasePage(browser, page);
  }
}
