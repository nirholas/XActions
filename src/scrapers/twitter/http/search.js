/**
 * Twitter HTTP Search Scraper
 *
 * Searches tweets, users, hashtags, and trending topics via Twitter's
 * internal GraphQL API — no browser required. Drop-in replacement for the
 * Puppeteer-based searchTweets() and scrapeHashtag() in ../index.js.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { GRAPHQL, REST_BASE } from './endpoints.js';
import { parseTweetData, parseTimelineInstructions } from './tweets.js';
import { parseUserData } from './profile.js';
import { NotFoundError, TwitterApiError } from './errors.js';

// ---------------------------------------------------------------------------
// buildAdvancedQuery — Compose Twitter advanced search query string
// ---------------------------------------------------------------------------

/**
 * Build a Twitter advanced search query string from structured options.
 *
 * @param {object} options
 * @param {string} [options.keywords] — Free-text keywords
 * @param {string} [options.from] — Tweets from this username
 * @param {string} [options.to] — Tweets directed at this username
 * @param {string} [options.since] — Start date (YYYY-MM-DD)
 * @param {string} [options.until] — End date (YYYY-MM-DD)
 * @param {number} [options.minLikes] — Minimum favourite count
 * @param {number} [options.minRetweets] — Minimum retweet count
 * @param {number} [options.minReplies] — Minimum reply count
 * @param {string} [options.lang] — Language code (e.g. 'en')
 * @param {string|string[]} [options.filter] — Include filter(s): 'links', 'images', 'videos', 'media', 'native_video'
 * @param {string|string[]} [options.exclude] — Exclude filter(s): 'retweets', 'replies'
 * @param {string} [options.near] — Geo-location string (e.g. 'San Francisco')
 * @param {string} [options.within] — Radius for geo search (e.g. '15mi')
 * @param {string} [options.url] — Tweets containing this URL
 * @param {string} [options.mentioning] — Tweets mentioning @username
 * @param {string} [options.listId] — Tweets from members of a list
 * @returns {string} Composed Twitter search query
 *
 * @example
 * buildAdvancedQuery({
 *   keywords: 'javascript',
 *   from: 'nichxbt',
 *   since: '2025-01-01',
 *   until: '2025-12-31',
 *   minLikes: 100,
 *   minRetweets: 50,
 *   lang: 'en',
 *   filter: 'links',
 *   exclude: 'retweets',
 * });
 * // => "javascript from:nichxbt since:2025-01-01 until:2025-12-31 min_faves:100 min_retweets:50 lang:en filter:links -filter:retweets"
 */
export function buildAdvancedQuery(options = {}) {
  const parts = [];

  if (options.keywords) parts.push(options.keywords);
  if (options.from) parts.push(`from:${options.from}`);
  if (options.to) parts.push(`to:${options.to}`);
  if (options.mentioning) parts.push(`@${options.mentioning}`);
  if (options.since) parts.push(`since:${options.since}`);
  if (options.until) parts.push(`until:${options.until}`);
  if (options.minLikes) parts.push(`min_faves:${options.minLikes}`);
  if (options.minRetweets) parts.push(`min_retweets:${options.minRetweets}`);
  if (options.minReplies) parts.push(`min_replies:${options.minReplies}`);
  if (options.lang) parts.push(`lang:${options.lang}`);
  if (options.url) parts.push(`url:${options.url}`);

  // Include filters
  const filters = Array.isArray(options.filter) ? options.filter : options.filter ? [options.filter] : [];
  for (const f of filters) {
    parts.push(`filter:${f}`);
  }

  // Exclude filters
  const excludes = Array.isArray(options.exclude) ? options.exclude : options.exclude ? [options.exclude] : [];
  for (const e of excludes) {
    parts.push(`-filter:${e}`);
  }

  // Geo search
  if (options.near) {
    parts.push(`near:"${options.near}"`);
    if (options.within) parts.push(`within:${options.within}`);
  }

  // List filter
  if (options.listId) parts.push(`list:${options.listId}`);

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// searchTweets — Search tweets via SearchTimeline GraphQL endpoint
// ---------------------------------------------------------------------------

/**
 * Search tweets via Twitter's `SearchTimeline` GraphQL endpoint.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} query — Search query string (plain or advanced syntax)
 * @param {object} [options]
 * @param {number} [options.limit=100] — Maximum tweets to return
 * @param {string} [options.type='Latest'] — 'Top' | 'Latest' | 'Photos' | 'Videos'
 * @param {string|null} [options.cursor=null] — Resume from pagination cursor
 * @param {function} [options.onProgress] — `({ fetched, limit }) => void`
 * @param {string} [options.since] — Start date for query (YYYY-MM-DD)
 * @param {string} [options.until] — End date for query (YYYY-MM-DD)
 * @param {string} [options.from] — Tweets from this username
 * @param {string} [options.to] — Tweets directed at this username
 * @param {number} [options.minLikes] — Minimum favourite count
 * @param {number} [options.minRetweets] — Minimum retweet count
 * @param {string} [options.lang] — Language code
 * @param {string} [options.filter] — Include filter
 * @returns {Promise<object[]>} Array of parsed tweet objects
 */
export async function searchTweets(client, query, options = {}) {
  const {
    limit = 100,
    type = 'Latest',
    cursor = null,
    onProgress,
    since,
    until,
    from,
    to,
    minLikes,
    minRetweets,
    lang,
    filter,
  } = options;

  // Build the full query by merging inline options into the raw query
  const advancedParts = [];
  if (query) advancedParts.push(query);
  if (from) advancedParts.push(`from:${from}`);
  if (to) advancedParts.push(`to:${to}`);
  if (since) advancedParts.push(`since:${since}`);
  if (until) advancedParts.push(`until:${until}`);
  if (minLikes) advancedParts.push(`min_faves:${minLikes}`);
  if (minRetweets) advancedParts.push(`min_retweets:${minRetweets}`);
  if (lang) advancedParts.push(`lang:${lang}`);
  if (filter) advancedParts.push(`filter:${filter}`);
  const rawQuery = advancedParts.join(' ');

  const { queryId, operationName } = GRAPHQL.SearchTimeline;
  const allTweets = [];
  let nextCursor = cursor;

  while (allTweets.length < limit) {
    const variables = {
      rawQuery,
      count: 20,
      querySource: 'typed_query',
      product: type,
    };
    if (nextCursor) variables.cursor = nextCursor;

    const resp = await client.graphql(queryId, operationName, variables);

    const instructions =
      resp?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? [];

    const { tweets, cursor: bottomCursor } = parseTimelineInstructions(instructions);

    for (const tweet of tweets) {
      if (allTweets.length >= limit) break;
      allTweets.push(tweet);
    }

    if (onProgress) {
      onProgress({ fetched: allTweets.length, limit });
    }

    // No more pages or no new tweets
    if (!bottomCursor || tweets.length === 0) break;
    nextCursor = bottomCursor;
  }

  return allTweets.slice(0, limit);
}

// ---------------------------------------------------------------------------
// searchUsers — Search users via SearchTimeline with product='People'
// ---------------------------------------------------------------------------

/**
 * Search for user accounts via Twitter's `SearchTimeline` endpoint with
 * `product: 'People'`.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} query — Search query string
 * @param {object} [options]
 * @param {number} [options.limit=100] — Maximum users to return
 * @param {string|null} [options.cursor=null] — Resume from pagination cursor
 * @param {function} [options.onProgress] — `({ fetched, limit }) => void`
 * @returns {Promise<object[]>} Array of parsed user profile objects
 */
export async function searchUsers(client, query, options = {}) {
  const { limit = 100, cursor = null, onProgress } = options;

  const { queryId, operationName } = GRAPHQL.SearchTimeline;
  const allUsers = [];
  let nextCursor = cursor;

  while (allUsers.length < limit) {
    const variables = {
      rawQuery: query,
      count: 20,
      querySource: 'typed_query',
      product: 'People',
    };
    if (nextCursor) variables.cursor = nextCursor;

    const resp = await client.graphql(queryId, operationName, variables);

    const instructions =
      resp?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? [];

    const { users, cursor: bottomCursor } = parseSearchUserInstructions(instructions);

    for (const user of users) {
      if (allUsers.length >= limit) break;
      allUsers.push(user);
    }

    if (onProgress) {
      onProgress({ fetched: allUsers.length, limit });
    }

    if (!bottomCursor || users.length === 0) break;
    nextCursor = bottomCursor;
  }

  return allUsers.slice(0, limit);
}

/**
 * Parse search instructions for user results (product='People').
 *
 * User search results use `user_results` instead of `tweet_results` in
 * the timeline entries.
 *
 * @param {object[]} instructions
 * @returns {{ users: object[], cursor: string|null }}
 */
function parseSearchUserInstructions(instructions) {
  const users = [];
  let cursor = null;

  if (!Array.isArray(instructions)) {
    return { users, cursor };
  }

  for (const instruction of instructions) {
    const type = instruction.type;

    if (type === 'TimelineAddEntries') {
      const entries = instruction.entries || [];
      for (const entry of entries) {
        // Bottom cursor
        if (entry.entryId?.startsWith('cursor-bottom-')) {
          cursor =
            entry.content?.value ??
            entry.content?.itemContent?.value ??
            null;
          continue;
        }
        // Top cursor — skip
        if (entry.entryId?.startsWith('cursor-top-')) {
          continue;
        }

        // User result entry
        const userResult =
          entry?.content?.itemContent?.user_results?.result;
        if (userResult) {
          try {
            const parsed = parseUserData(userResult);
            users.push(parsed);
          } catch {
            // Skip unparseable users (e.g. UserUnavailable)
          }
        }
      }
    }
  }

  return { users, cursor };
}

// ---------------------------------------------------------------------------
// scrapeTrending — Trending topics
// ---------------------------------------------------------------------------

/**
 * Scrape trending topics from Twitter.
 *
 * Uses the REST endpoint `GET /1.1/trends/place.json?id=<woeid>`.
 * Worldwide WOEID = 1. United States = 23424977. See
 * https://developer.x.com/en/docs/twitter-api/v1/trends/trends-for-location/api-reference/get-trends-place
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {object} [options]
 * @param {number} [options.woeid=1] — Where On Earth ID (1 = worldwide)
 * @returns {Promise<object[]>} Array of `{ name, tweetCount, url, category }`
 */
export async function scrapeTrending(client, options = {}) {
  const { woeid = 1 } = options;

  const resp = await client.rest(
    `/1.1/trends/place.json?id=${woeid}`,
    { method: 'GET' },
  );

  // Response is an array with one element per location
  const trendData = Array.isArray(resp) ? resp[0] : resp;
  const trends = trendData?.trends || [];

  return trends.map((trend) => ({
    name: trend.name || '',
    tweetCount: trend.tweet_volume ?? null,
    url: trend.url || null,
    category: trend.promoted_content ? 'promoted' : null,
  }));
}

// ---------------------------------------------------------------------------
// scrapeHashtag — Convenience wrapper around searchTweets
// ---------------------------------------------------------------------------

/**
 * Scrape tweets by hashtag — convenience wrapper around `searchTweets`.
 *
 * Maintains backward compatibility with the Puppeteer-based
 * `scrapeHashtag()` in ../index.js.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} hashtag — Hashtag text (with or without `#` prefix)
 * @param {object} [options] — Same options as `searchTweets`
 * @returns {Promise<object[]>} Array of parsed tweet objects
 */
export async function scrapeHashtag(client, hashtag, options = {}) {
  const tag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
  return searchTweets(client, tag, options);
}
