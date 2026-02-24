/**
 * XActions Follower Stream
 * Watches follower count changes and emits follow/unfollow events.
 *
 * Features:
 * - Fast-path: scrapes only profile count first, skips expensive follower list
 *   if count hasn't changed
 * - Returns rich follower objects (username, name, bio) for new followers
 * - Handles follower count string parsing (1.2K, 100M, etc.)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { scrapeProfile, scrapeFollowers } from '../scrapers/index.js';
import { acquirePage, releasePage } from './browserPool.js';

/**
 * Parse Twitter follower count strings like "1,234", "1.2K", "100M".
 */
function parseCount(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = String(str).trim().replace(/,/g, '');
  if (/[\d.]+M$/i.test(cleaned)) return Math.round(parseFloat(cleaned) * 1_000_000);
  if (/[\d.]+K$/i.test(cleaned)) return Math.round(parseFloat(cleaned) * 1_000);
  return parseInt(cleaned, 10) || 0;
}

/**
 * Poll follower data and compute diff.
 *
 * Strategy:
 * 1. Always scrape profile (lightweight) to get follower count.
 * 2. If count === lastCount, return early (no change).
 * 3. If count changed, scrape the follower list and diff.
 *
 * @param {Object} opts
 * @param {string} opts.username - Target username (without @)
 * @param {string[]} opts.lastFollowers - Previously-known follower usernames
 * @param {number|null} opts.lastCount - Previously-known follower count
 * @param {string} [opts.authToken] - Optional auth_token cookie
 * @returns {{ profile: Object, newFollowers: string[], lostFollowers: string[], followers: string[], followerCount: number, countDelta: number }}
 */
export async function pollFollowers({ username, lastFollowers = [], lastCount = null, authToken }) {
  let browser, page;
  try {
    ({ browser, page } = await acquirePage(authToken));

    // Step 1 — lightweight profile scrape
    const profile = await scrapeProfile(page, username);
    const currentCount = parseCount(profile.followers);

    // Fast-path: count hasn't changed and we have prior follower data → skip expensive scrape
    if (lastCount !== null && currentCount === lastCount && lastFollowers.length > 0) {
      return {
        profile,
        newFollowers: [],
        lostFollowers: [],
        followers: lastFollowers,
        followerCount: currentCount,
        countDelta: 0,
      };
    }

    // Step 2 — full follower list scrape (only when count changed or first run)
    const followerList = await scrapeFollowers(page, username, { limit: 200 });
    const currentUsernames = followerList.map((f) => f.username);

    const lastSet = new Set(lastFollowers);
    const currentSet = new Set(currentUsernames);

    const newFollowers = currentUsernames.filter((u) => !lastSet.has(u));
    const lostFollowers = lastFollowers.filter((u) => !currentSet.has(u));
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
