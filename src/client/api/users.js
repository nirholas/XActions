/**
 * XActions Client — Users API
 * User-related API calls: get profile, followers, following, follow/unfollow.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Profile } from '../models/Profile.js';
import {
  GRAPHQL_ENDPOINTS,
  DEFAULT_FEATURES,
  DEFAULT_FIELD_TOGGLES,
  buildGraphQLUrl,
} from './graphqlQueries.js';
import { parseTimelineEntries, parseUserEntry } from './parsers.js';
import { NotFoundError, ScraperError } from '../errors.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 2000) => sleep(min + Math.random() * (max - min));

/**
 * Get a user profile by screen name (handle).
 *
 * @param {Object} http - HttpClient instance (must have .get method)
 * @param {string} username - Twitter handle (without @)
 * @returns {Promise<Profile>}
 * @throws {NotFoundError} If user does not exist
 */
export async function getUserByScreenName(http, username) {
  const endpoint = GRAPHQL_ENDPOINTS.UserByScreenName;
  const variables = {
    screen_name: username,
    withSafetyModeUserFields: true,
  };
  const url = buildGraphQLUrl(endpoint, variables);
  const data = await http.get(url);

  const userResult = data?.data?.user?.result;
  if (!userResult || userResult.__typename === 'UserUnavailable') {
    throw new NotFoundError(`User @${username} not found`, 'USER_NOT_FOUND');
  }

  const profile = Profile.fromGraphQL(userResult);
  if (!profile) {
    throw new NotFoundError(`User @${username} not found`, 'USER_NOT_FOUND');
  }
  return profile;
}

/**
 * Get a user profile by numeric user ID.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @returns {Promise<Profile>}
 * @throws {NotFoundError} If user does not exist
 */
export async function getUserById(http, userId) {
  const endpoint = GRAPHQL_ENDPOINTS.UserByRestId;
  const variables = {
    userId,
    withSafetyModeUserFields: true,
  };
  const url = buildGraphQLUrl(endpoint, variables);
  const data = await http.get(url);

  const userResult = data?.data?.user?.result;
  if (!userResult || userResult.__typename === 'UserUnavailable') {
    throw new NotFoundError(`User ID ${userId} not found`, 'USER_NOT_FOUND');
  }

  const profile = Profile.fromGraphQL(userResult);
  if (!profile) {
    throw new NotFoundError(`User ID ${userId} not found`, 'USER_NOT_FOUND');
  }
  return profile;
}

/**
 * Resolve a screen name to a numeric user ID.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} username - Twitter handle (without @)
 * @returns {Promise<string>} Numeric user ID
 */
export async function getUserIdByScreenName(http, username) {
  const profile = await getUserByScreenName(http, username);
  return profile.id;
}

/**
 * Get a user's followers using cursor-based pagination.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @param {number} [count=100] - Maximum number of followers to yield
 * @yields {Profile}
 */
export async function* getFollowers(http, userId, count = 100) {
  const endpoint = GRAPHQL_ENDPOINTS.Followers;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = {
      userId,
      count: 20,
      includePromotedContent: false,
    };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.user.result.timeline.timeline',
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
 * Get accounts a user follows using cursor-based pagination.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @param {number} [count=100] - Maximum number of following to yield
 * @yields {Profile}
 */
export async function* getFollowing(http, userId, count = 100) {
  const endpoint = GRAPHQL_ENDPOINTS.Following;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = {
      userId,
      count: 20,
      includePromotedContent: false,
    };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.user.result.timeline.timeline',
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
 * Follow a user by their numeric user ID.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @returns {Promise<void>}
 */
export async function followUser(http, userId) {
  const endpoint = GRAPHQL_ENDPOINTS.CreateFollow;
  const url = endpoint.url();
  await http.post(url, new URLSearchParams({
    include_profile_interstitial_type: '1',
    include_blocking: '1',
    include_blocked_by: '1',
    include_followed_by: '1',
    include_want_retweets: '1',
    include_mute_edge: '1',
    include_can_dm: '1',
    include_can_media_tag: '1',
    include_ext_is_blue_verified: '1',
    include_ext_verified_type: '1',
    include_ext_profile_image_shape: '1',
    skip_status: '1',
    user_id: userId,
  }), { contentType: 'application/x-www-form-urlencoded' });
}

/**
 * Unfollow a user by their numeric user ID.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @returns {Promise<void>}
 */
export async function unfollowUser(http, userId) {
  const endpoint = GRAPHQL_ENDPOINTS.DestroyFollow;
  const url = endpoint.url();
  await http.post(url, new URLSearchParams({
    include_profile_interstitial_type: '1',
    include_blocking: '1',
    include_blocked_by: '1',
    include_followed_by: '1',
    include_want_retweets: '1',
    include_mute_edge: '1',
    include_can_dm: '1',
    include_can_media_tag: '1',
    include_ext_is_blue_verified: '1',
    include_ext_verified_type: '1',
    include_ext_profile_image_shape: '1',
    skip_status: '1',
    user_id: userId,
  }), { contentType: 'application/x-www-form-urlencoded' });
}
