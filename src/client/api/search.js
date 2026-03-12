/**
 * XActions Client — Search API
 * Twitter search via the internal SearchTimeline GraphQL endpoint.
 *
 * Supports advanced search operators:
 *   from:username, to:username, since:YYYY-MM-DD, until:YYYY-MM-DD,
 *   min_replies:N, min_faves:N, min_retweets:N,
 *   filter:links, filter:media, filter:images, filter:videos,
 *   -filter:replies, lang:en
 *
 * These are passed through in rawQuery — Twitter handles the parsing.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Tweet } from '../models/Tweet.js';
import { Profile } from '../models/Profile.js';
import {
  GRAPHQL_ENDPOINTS,
  DEFAULT_FEATURES,
  DEFAULT_FIELD_TOGGLES,
  buildGraphQLUrl,
} from './graphqlQueries.js';
import { parseTimelineEntries, parseTweetEntry, parseUserEntry } from './parsers.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 2000) => sleep(min + Math.random() * (max - min));

/**
 * Search tweets using Twitter's internal SearchTimeline endpoint.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} query - Search query (supports advanced operators)
 * @param {number} [count=40] - Maximum number of tweets to yield
 * @param {string} [mode='Latest'] - Search mode: 'Top', 'Latest', 'Photos', 'Videos'
 * @yields {Tweet}
 */
export async function* searchTweets(http, query, count = 40, mode = 'Latest') {
  const endpoint = GRAPHQL_ENDPOINTS.SearchTimeline;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = {
      rawQuery: query,
      count: 20,
      querySource: 'typed_query',
      product: mode,
    };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.search_by_raw_query.search_timeline.timeline',
    );

    if (!entries.length) break;

    for (const entry of entries) {
      if (entry.entryId?.startsWith('cursor-')) continue;
      const tweet = parseTweetEntry(entry);
      if (tweet) {
        yield tweet;
        yielded++;
        if (yielded >= count) break;
      }
    }

    cursor = nextCursor;
    if (!cursor) break;
    await randomDelay(1000, 2000);
  }
}

/**
 * Search user profiles.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} query - Search query
 * @param {number} [count=40] - Maximum number of profiles to yield
 * @yields {Profile}
 */
export async function* searchProfiles(http, query, count = 40) {
  const endpoint = GRAPHQL_ENDPOINTS.SearchTimeline;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = {
      rawQuery: query,
      count: 20,
      querySource: 'typed_query',
      product: 'People',
    };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.search_by_raw_query.search_timeline.timeline',
    );

    if (!entries.length) break;

    for (const entry of entries) {
      if (entry.entryId?.startsWith('cursor-')) continue;
      const profile = parseUserEntry(entry);
      if (profile) {
        yield profile;
        yielded++;
        if (yielded >= count) break;
      }
    }

    cursor = nextCursor;
    if (!cursor) break;
    await randomDelay(1000, 2000);
  }
}

/**
 * Fetch a single page of search results (non-generator, for manual pagination).
 *
 * @param {Object} http - HttpClient instance
 * @param {string} query - Search query
 * @param {number} [count=20] - Number of results per page
 * @param {string} [mode='Latest'] - Search mode
 * @param {string} [cursor=null] - Pagination cursor
 * @returns {Promise<{ tweets: Tweet[], cursor: string|null }>}
 */
export async function fetchSearchTweets(http, query, count = 20, mode = 'Latest', cursor = null) {
  const endpoint = GRAPHQL_ENDPOINTS.SearchTimeline;
  const variables = {
    rawQuery: query,
    count,
    querySource: 'typed_query',
    product: mode,
  };
  if (cursor) variables.cursor = cursor;

  const url = buildGraphQLUrl(endpoint, variables);
  const data = await http.get(url);

  const { entries, cursor: nextCursor } = parseTimelineEntries(
    data,
    'data.search_by_raw_query.search_timeline.timeline',
  );

  const tweets = [];
  for (const entry of entries) {
    if (entry.entryId?.startsWith('cursor-')) continue;
    const tweet = parseTweetEntry(entry);
    if (tweet) tweets.push(tweet);
  }

  return { tweets, cursor: nextCursor };
}

/**
 * Fetch a single page of profile search results (non-generator).
 *
 * @param {Object} http - HttpClient instance
 * @param {string} query - Search query
 * @param {number} [count=20] - Number of results per page
 * @param {string} [cursor=null] - Pagination cursor
 * @returns {Promise<{ profiles: Profile[], cursor: string|null }>}
 */
export async function fetchSearchProfiles(http, query, count = 20, cursor = null) {
  const endpoint = GRAPHQL_ENDPOINTS.SearchTimeline;
  const variables = {
    rawQuery: query,
    count,
    querySource: 'typed_query',
    product: 'People',
  };
  if (cursor) variables.cursor = cursor;

  const url = buildGraphQLUrl(endpoint, variables);
  const data = await http.get(url);

  const { entries, cursor: nextCursor } = parseTimelineEntries(
    data,
    'data.search_by_raw_query.search_timeline.timeline',
  );

  const profiles = [];
  for (const entry of entries) {
    if (entry.entryId?.startsWith('cursor-')) continue;
    const profile = parseUserEntry(entry);
    if (profile) profiles.push(profile);
  }

  return { profiles, cursor: nextCursor };
}
