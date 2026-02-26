/**
 * XActions Client — Lists API
 * Twitter List operations: get list tweets, members, details.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Tweet } from '../models/Tweet.js';
import { Profile } from '../models/Profile.js';
import {
  GRAPHQL_ENDPOINTS,
  buildGraphQLUrl,
} from './graphqlQueries.js';
import { parseTimelineEntries, parseTweetEntry, parseUserEntry, navigateResponse } from './parsers.js';
import { NotFoundError } from '../errors.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 2000) => sleep(min + Math.random() * (max - min));

/**
 * Get tweets from a Twitter List using cursor-based pagination.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} listId - Numeric list ID
 * @param {number} [count=40] - Maximum number of tweets to yield
 * @yields {Tweet}
 */
export async function* getListTweets(http, listId, count = 40) {
  const endpoint = GRAPHQL_ENDPOINTS.ListLatestTweetsTimeline;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = { listId, count: 20 };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.list.tweets_timeline.timeline',
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
 * Get members of a Twitter List using cursor-based pagination.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} listId - Numeric list ID
 * @param {number} [count=100] - Maximum number of members to yield
 * @yields {Profile}
 */
export async function* getListMembers(http, listId, count = 100) {
  const endpoint = GRAPHQL_ENDPOINTS.ListMembers;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = { listId, count: 20 };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.list.members_timeline.timeline',
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
 * Get details about a specific Twitter List.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} listId - Numeric list ID
 * @returns {Promise<{id: string, name: string, description: string, memberCount: number, subscriberCount: number, createdAt: Date|null}>}
 * @throws {NotFoundError} If list does not exist
 */
export async function getListById(http, listId) {
  const endpoint = GRAPHQL_ENDPOINTS.ListByRestId;
  const variables = { listId };
  const url = buildGraphQLUrl(endpoint, variables);
  const data = await http.get(url);

  const result = navigateResponse(data, 'data.list');
  if (!result) {
    throw new NotFoundError(`List ${listId} not found`, 'LIST_NOT_FOUND');
  }

  return {
    id: result.id_str || String(result.id || listId),
    name: result.name || '',
    description: result.description || '',
    memberCount: result.member_count || 0,
    subscriberCount: result.subscriber_count || 0,
    createdAt: result.created_at ? new Date(result.created_at) : null,
  };
}
