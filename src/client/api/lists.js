/**
 * XActions Client — Lists API
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { Tweet } from '../models/Tweet.js';
import { Profile } from '../models/Profile.js';
import { GRAPHQL_ENDPOINTS, buildGraphQLUrl, DEFAULT_FEATURES } from './graphqlQueries.js';
import { parseTimelineEntries, parseTweetEntry, parseUserEntry, extractCursor } from './parsers.js';

/**
 * Paginate list timeline results.
 * @param {Object} http
 * @param {string} endpoint - GRAPHQL_ENDPOINTS key
 * @param {Object} variables
 * @param {string} timelinePath - dot-path to timeline
 * @param {Function} parseEntry - parseTweetEntry or parseUserEntry
 * @param {number} count
 */
async function* paginateList(http, endpoint, variables, timelinePath, parseEntry, count) {
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const vars = { ...variables };
    if (cursor) vars.cursor = cursor;

    const ep = GRAPHQL_ENDPOINTS[endpoint];
    const url = buildGraphQLUrl(ep, vars, DEFAULT_FEATURES);
    const data = await http.get(url);

    const { entries } = parseTimelineEntries(data, timelinePath);
    if (!entries || entries.length === 0) break;

    let foundItems = false;
    for (const entry of entries) {
      if (entry.entryId?.startsWith('cursor-')) continue;
      const item = parseEntry(entry);
      if (item) {
        yield item;
        yielded++;
        foundItems = true;
        if (yielded >= count) return;
      }
    }

    const nextCursor = extractCursor(entries, 'bottom');
    if (!nextCursor || nextCursor === cursor || !foundItems) break;
    cursor = nextCursor;

    // Rate limit courtesy delay
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
  }
}

/**
 * Get tweets from a list.
 *
 * @param {Object} http
 * @param {string} listId
 * @param {number} [count=100]
 * @returns {AsyncGenerator<Tweet>}
 */
export async function* getListTweets(http, listId, count = 100) {
  yield* paginateList(
    http,
    'ListLatestTweetsTimeline',
    { listId, count: 20 },
    'data.list.tweets_timeline.timeline',
    parseTweetEntry,
    count,
  );
}

/**
 * Get members of a list.
 *
 * @param {Object} http
 * @param {string} listId
 * @param {number} [count=100]
 * @returns {AsyncGenerator<Profile>}
 */
export async function* getListMembers(http, listId, count = 100) {
  yield* paginateList(
    http,
    'ListMembers',
    { listId, count: 20 },
    'data.list.members_timeline.timeline',
    parseUserEntry,
    count,
  );
}

/**
 * Get list details by ID.
 *
 * @param {Object} http
 * @param {string} listId
 * @returns {Promise<{id: string, name: string, description: string, memberCount: number, subscriberCount: number, createdAt: string}>}
 */
export async function getListById(http, listId) {
  const ep = GRAPHQL_ENDPOINTS.ListByRestId;
  const url = buildGraphQLUrl(ep, { listId }, DEFAULT_FEATURES);
  const data = await http.get(url);

  const list = data?.data?.list;
  if (!list) return null;

  return {
    id: list.id_str || listId,
    name: list.name || '',
    description: list.description || '',
    memberCount: list.member_count ?? 0,
    subscriberCount: list.subscriber_count ?? 0,
    createdAt: list.created_at || '',
  };
}
