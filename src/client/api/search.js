/**
 * XActions Client — Search API
 *
 * Search tweets and profiles via Twitter's internal GraphQL SearchTimeline endpoint.
 * All functions take an HTTP client as the first parameter.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { GRAPHQL_ENDPOINTS, DEFAULT_FEATURES, buildGraphQLUrl } from './graphqlQueries.js';
import { Tweet } from '../models/Tweet.js';
import { Profile } from '../models/Profile.js';
import { parseTimelineEntries, parseTweetEntry, parseUserEntry } from './parsers.js';

/** @private Random delay between paginated requests */
function randomDelay(min = 1000, max = 2000) {
  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
}

/**
 * Map SearchMode string to Twitter's internal product value.
 * @param {string} mode - 'Top', 'Latest', 'Photos', 'Videos'
 * @returns {string}
 * @private
 */
function searchModeToProduct(mode) {
  const map = {
    Top: 'Top',
    Latest: 'Latest',
    Photos: 'Photos',
    Videos: 'Videos',
  };
  return map[mode] || 'Latest';
}

/**
 * Search tweets.
 *
 * @param {Object} http - HTTP client with get/post methods
 * @param {string} query - Search query (supports advanced operators)
 * @param {number} [count=100] - Maximum number of results
 * @param {string} [mode='Latest'] - SearchMode: 'Top', 'Latest', 'Photos', 'Videos'
 * @yields {Tweet}
 */
export async function* searchTweets(http, query, count = 100, mode = 'Latest') {
  let yielded = 0;
  let cursor = null;

  while (yielded < count) {
    const endpoint = GRAPHQL_ENDPOINTS.SearchTimeline;
    const variables = {
      rawQuery: query,
      count: 20,
      querySource: 'typed_query',
      product: searchModeToProduct(mode),
    };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.search_by_raw_query.search_timeline.timeline',
    );

    let foundAny = false;
    for (const entry of entries) {
      const tweet = parseTweetEntry(entry);
      if (tweet) {
        yield tweet;
        yielded++;
        foundAny = true;
        if (yielded >= count) return;
      }
    }

    if (!nextCursor || !foundAny) return;
    cursor = nextCursor;
    await randomDelay(1000, 2000);
  }
}

/**
 * Search profiles (people).
 *
 * @param {Object} http - HTTP client with get/post methods
 * @param {string} query - Search query
 * @param {number} [count=100] - Maximum number of results
 * @yields {Profile}
 */
export async function* searchProfiles(http, query, count = 100) {
  let yielded = 0;
  let cursor = null;

  while (yielded < count) {
    const endpoint = GRAPHQL_ENDPOINTS.SearchTimeline;
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

    let foundAny = false;
    for (const entry of entries) {
      const profile = parseUserEntry(entry);
      if (profile) {
        yield profile;
        yielded++;
        foundAny = true;
        if (yielded >= count) return;
      }
    }

    if (!nextCursor || !foundAny) return;
    cursor = nextCursor;
    await randomDelay(1000, 2000);
  }
}
