// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Fetching and caching for account briefs, shared by `xactions brief` and the
 * `x_account_brief` MCP tool so both read the same cache and can never build a
 * brief two different ways.
 *
 * Each account's profile and timeline sample is cached as plain JSON under
 * `$XACTIONS_HOME/cache/brief/` (default `~/.xactions`). Re-running a list
 * while drafting posts, or adding one account to it, only fetches the accounts
 * that are new or stale, which is what keeps a twenty-account brief inside a
 * single session's rate-limit window.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { buildAccountBrief, buildEcosystemBrief, toPlainProfile, toPlainTweet } from './accountBrief.js';

export const DEFAULT_LIMIT = 100;
export const MIN_LIMIT = 10;
export const MAX_LIMIT = 400;
export const DEFAULT_CACHE_HOURS = 6;
const MS_PER_HOUR = 3_600_000;

/**
 * Where cached timelines live, read at call time so XACTIONS_HOME can be set
 * after import.
 * @returns {string}
 */
export function briefCacheDir() {
  return path.join(process.env.XACTIONS_HOME || path.join(os.homedir(), '.xactions'), 'cache', 'brief');
}

/**
 * @param {string} username
 * @returns {string}
 */
function cacheFile(username) {
  return path.join(briefCacheDir(), `${username.toLowerCase()}.json`);
}

/**
 * Read a cached sample if it is fresh enough and at least as large as asked.
 * @param {string} username
 * @param {number} limit
 * @param {number} maxAgeHours - 0 or less disables the cache
 * @returns {Promise<{profile: object, tweets: object[], fetchedAt: string}|null>}
 */
export async function readCached(username, limit, maxAgeHours) {
  if (!(maxAgeHours > 0)) return null;
  try {
    const entry = JSON.parse(await fs.readFile(cacheFile(username), 'utf-8'));
    const age = Date.now() - new Date(entry.fetchedAt).getTime();
    if (!(age >= 0 && age <= maxAgeHours * MS_PER_HOUR)) return null;
    // A cache filled with 50 posts cannot answer a request for 200, but an
    // account with only 30 posts in total is complete at 30.
    if (entry.limit < limit && !entry.exhausted) return null;
    return { profile: entry.profile, tweets: entry.tweets.slice(0, limit), fetchedAt: entry.fetchedAt };
  } catch {
    return null;
  }
}

/**
 * @param {string} username
 * @param {object} entry
 */
export async function writeCached(username, entry) {
  try {
    await fs.mkdir(briefCacheDir(), { recursive: true });
    await fs.writeFile(cacheFile(username), JSON.stringify(entry));
  } catch {
    // A cache that cannot be written only costs speed on the next run.
  }
}

/**
 * One account's profile and timeline sample, from the cache when fresh.
 *
 * @param {() => Promise<object>} getScraper - Builds the scraper on first use, so a fully cached run makes no requests
 * @param {string} username
 * @param {object} [options]
 * @param {number} [options.limit=DEFAULT_LIMIT]
 * @param {number} [options.cacheHours=DEFAULT_CACHE_HOURS]
 * @returns {Promise<{profile: object, tweets: object[], cached: boolean}>}
 */
export async function collectAccountSample(getScraper, username, { limit = DEFAULT_LIMIT, cacheHours = DEFAULT_CACHE_HOURS } = {}) {
  const cached = await readCached(username, limit, cacheHours);
  if (cached) return { profile: cached.profile, tweets: cached.tweets, cached: true };

  const scraper = await getScraper();
  const profile = await scraper.getProfile(username);
  if (!profile?.id) {
    throw new Error('X returned no profile. Check the spelling, or the account may be suspended.');
  }
  if (profile.protected) {
    throw new Error('The account is protected, so its posts are not public.');
  }

  const tweets = [];
  for await (const tweet of scraper.getTweets(username, limit)) {
    tweets.push(toPlainTweet(tweet));
    if (tweets.length >= limit) break;
  }

  const plainProfile = toPlainProfile(profile);
  await writeCached(username, {
    fetchedAt: new Date().toISOString(),
    limit,
    exhausted: tweets.length < limit,
    profile: plainProfile,
    tweets,
  });

  return { profile: plainProfile, tweets, cached: false };
}

/**
 * Clamp a numeric option, falling back when it is missing or not a number.
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * Build the combined brief for a list of accounts. Accounts are read one at a
 * time, because the scraper's rate limiting is per session and parallel reads
 * only reach the wall sooner. One account failing is recorded and the rest
 * carry on.
 *
 * @param {object} input
 * @param {string[]} input.accounts - Handles, already parsed
 * @param {() => Promise<object>} input.getScraper
 * @param {string|string[]} [input.topic]
 * @param {number} [input.limit]
 * @param {number} [input.days=30]
 * @param {number} [input.recent=5]
 * @param {number} [input.cacheHours]
 * @param {(username: string, index: number) => void} [input.onProgress]
 * @returns {Promise<{ecosystem: object, fromCache: number}>}
 */
export async function runBrief({
  accounts,
  getScraper,
  topic,
  limit = DEFAULT_LIMIT,
  days = 30,
  recent = 5,
  cacheHours = DEFAULT_CACHE_HOURS,
  onProgress = () => {},
}) {
  const briefs = [];
  const failures = [];
  let fromCache = 0;
  const now = new Date();

  for (const [index, username] of accounts.entries()) {
    onProgress(username, index);
    try {
      const { profile, tweets, cached } = await collectAccountSample(getScraper, username, { limit, cacheHours });
      if (cached) fromCache += 1;
      briefs.push(buildAccountBrief({ profile, tweets, topic, days, recent, now }));
    } catch (error) {
      const reason =
        error.code === 'AUTH_REQUIRED'
          ? 'X only serves this read to logged-in sessions. Run `xactions connect`.'
          : String(error.message || error).split('\n')[0];
      failures.push({ username, error: reason });
    }
  }

  return { ecosystem: buildEcosystemBrief(briefs, { topic, failures, now }), fromCache };
}
