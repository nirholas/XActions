/**
 * Twitter Engagement Operations via HTTP
 *
 * Like/unlike, retweet/unretweet, follow/unfollow, block/unblock,
 * mute/unmute, bookmark, pin, and bulk operations — all over HTTP
 * without Puppeteer or the official API.
 *
 * Every function requires an authenticated {@link TwitterHttpClient}.
 * All single-action functions return `{ success: boolean }`.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { GRAPHQL, REST } from './endpoints.js';
import {
  AuthError,
  RateLimitError,
  NotFoundError,
  TwitterApiError,
} from './errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ensure the client is authenticated before performing a mutation.
 * @param {import('./client.js').TwitterHttpClient} client
 * @throws {AuthError}
 */
function requireAuth(client) {
  if (!client.isAuthenticated()) {
    throw new AuthError('Authentication required — set cookies before performing engagement actions');
  }
}

/**
 * Execute a GraphQL mutation and handle Twitter-specific error responses.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {{ queryId: string, operationName: string }} endpoint
 * @param {object} variables
 * @returns {Promise<{ success: boolean }>}
 */
async function graphqlMutation(client, endpoint, variables) {
  requireAuth(client);

  const response = await client.graphql(
    endpoint.queryId,
    endpoint.operationName,
    variables,
    { mutation: true },
  );

  // Parse Twitter error responses inline for reliable throw propagation
  const errors = response?.errors;
  if (errors && errors.length > 0) {
    for (const err of errors) {
      const msg = (err.message || '').toLowerCase();

      // Idempotent cases — already done, treat as success
      if (
        msg.includes('already favorited') ||
        msg.includes('already retweeted') ||
        msg.includes('already bookmarked') ||
        msg.includes('you have already') ||
        msg.includes('not found in list of retweets')
      ) {
        return { success: true };
      }

      // Rate limiting
      if (
        msg.includes('rate limit') ||
        msg.includes('to protect our users from spam') ||
        msg.includes('too many requests')
      ) {
        throw new RateLimitError(err.message || 'Rate limited', {
          endpoint: endpoint.operationName,
        });
      }

      // Not found
      if (msg.includes('cannot find specified user') || msg.includes('user not found')) {
        throw new NotFoundError(err.message || 'Not found', {
          endpoint: endpoint.operationName,
          data: response,
        });
      }

      // Suspended
      if (msg.includes('suspended')) {
        throw new TwitterApiError(err.message, {
          endpoint: endpoint.operationName,
          data: response,
        });
      }
    }

    // Unrecognised error
    throw new TwitterApiError(
      errors.map((e) => e.message).join('; ') || 'Twitter API error',
      { endpoint: endpoint.operationName, data: response },
    );
  }

  return { success: true };
}

/**
 * Execute a REST mutation and handle Twitter-specific error responses.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} path - REST endpoint path
 * @param {object} body - POST form body
 * @returns {Promise<{ success: boolean }>}
 */
async function restMutation(client, path, body) {
  requireAuth(client);

  const response = await client.rest(path, { method: 'POST', body });

  const errors = response?.errors;
  if (errors && errors.length > 0) {
    for (const err of errors) {
      const msg = (err.message || '').toLowerCase();

      if (
        msg.includes('already favorited') ||
        msg.includes('already retweeted') ||
        msg.includes('already bookmarked') ||
        msg.includes('you have already')
      ) {
        return { success: true };
      }

      if (
        msg.includes('rate limit') ||
        msg.includes('to protect our users from spam') ||
        msg.includes('too many requests')
      ) {
        throw new RateLimitError(err.message || 'Rate limited', { endpoint: path });
      }

      if (msg.includes('cannot find specified user') || msg.includes('user not found')) {
        throw new NotFoundError(err.message || 'Not found', { endpoint: path, data: response });
      }

      if (msg.includes('suspended')) {
        throw new TwitterApiError(err.message, { endpoint: path, data: response });
      }
    }

    throw new TwitterApiError(
      errors.map((e) => e.message).join('; ') || 'Twitter API error',
      { endpoint: path, data: response },
    );
  }

  return { success: true };
}

// ===========================================================================
// Likes
// ===========================================================================

/**
 * Like a tweet.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function likeTweet(client, tweetId) {
  return graphqlMutation(client, GRAPHQL.FavoriteTweet, { tweet_id: tweetId });
}

/**
 * Unlike a tweet.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function unlikeTweet(client, tweetId) {
  return graphqlMutation(client, GRAPHQL.UnfavoriteTweet, { tweet_id: tweetId });
}

// ===========================================================================
// Retweets
// ===========================================================================

/**
 * Retweet a tweet.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function retweet(client, tweetId) {
  return graphqlMutation(client, GRAPHQL.CreateRetweet, { tweet_id: tweetId, dark_request: false });
}

/**
 * Undo a retweet.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function unretweet(client, tweetId) {
  return graphqlMutation(client, GRAPHQL.DeleteRetweet, { source_tweet_id: tweetId, dark_request: false });
}

// ===========================================================================
// Following
// ===========================================================================

/**
 * Follow a user by user ID.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} userId
 * @returns {Promise<{ success: boolean }>}
 */
export async function followUser(client, userId) {
  return restMutation(client, REST.friendshipsCreate, {
    include_profile_interstitial_type: '1',
    skip_status: 'true',
    user_id: userId,
  });
}

/**
 * Unfollow a user by user ID.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} userId
 * @returns {Promise<{ success: boolean }>}
 */
export async function unfollowUser(client, userId) {
  return restMutation(client, REST.friendshipsDestroy, {
    include_profile_interstitial_type: '1',
    skip_status: 'true',
    user_id: userId,
  });
}

/**
 * Follow a user by username. Resolves the username to a user ID first
 * via the UserByScreenName GraphQL query, then calls followUser.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} username - Screen name without `@`
 * @returns {Promise<{ success: boolean }>}
 */
export async function followByUsername(client, username) {
  requireAuth(client);

  const cleanName = username.replace(/^@/, '');
  const { queryId, operationName } = GRAPHQL.UserByScreenName;
  const response = await client.graphql(queryId, operationName, {
    screen_name: cleanName,
    withSafetyModeUserFields: true,
  });

  // graphql() returns { data: rawJson, cursor } for queries
  const raw = response?.data;
  const userId =
    raw?.data?.user?.result?.rest_id ||
    raw?.data?.user?.rest_id;

  if (!userId) {
    throw new NotFoundError(`User @${cleanName} not found`);
  }

  return followUser(client, userId);
}

// ===========================================================================
// Blocking
// ===========================================================================

/**
 * Block a user.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} userId
 * @returns {Promise<{ success: boolean }>}
 */
export async function blockUser(client, userId) {
  return restMutation(client, REST.blocksCreate, { user_id: userId });
}

/**
 * Unblock a user.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} userId
 * @returns {Promise<{ success: boolean }>}
 */
export async function unblockUser(client, userId) {
  return restMutation(client, REST.blocksDestroy, { user_id: userId });
}

// ===========================================================================
// Muting
// ===========================================================================

/**
 * Mute a user.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} userId
 * @returns {Promise<{ success: boolean }>}
 */
export async function muteUser(client, userId) {
  return restMutation(client, REST.mutesCreate, { user_id: userId });
}

/**
 * Unmute a user.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} userId
 * @returns {Promise<{ success: boolean }>}
 */
export async function unmuteUser(client, userId) {
  return restMutation(client, REST.mutesDestroy, { user_id: userId });
}

// ===========================================================================
// Bookmarks
// ===========================================================================

/**
 * Bookmark a tweet.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function bookmarkTweet(client, tweetId) {
  return graphqlMutation(client, GRAPHQL.CreateBookmark, { tweet_id: tweetId });
}

/**
 * Remove a bookmark.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function unbookmarkTweet(client, tweetId) {
  return graphqlMutation(client, GRAPHQL.DeleteBookmark, { tweet_id: tweetId });
}

// ===========================================================================
// Pin / Unpin
// ===========================================================================

/**
 * Pin a tweet to profile.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function pinTweet(client, tweetId) {
  return restMutation(client, REST.pinTweet, { tweet_mode: 'extended', id: tweetId });
}

/**
 * Unpin a tweet from profile.
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function unpinTweet(client, tweetId) {
  return restMutation(client, REST.unpinTweet, { tweet_mode: 'extended', id: tweetId });
}

// ===========================================================================
// Bulk Operations
// ===========================================================================

/** Default safety delays (ms) per operation type. */
const DEFAULT_DELAYS = {
  follow: 2000,
  unfollow: 2000,
  like: 1000,
  unlike: 1000,
  block: 1000,
  mute: 1000,
};

/**
 * Generic bulk operation runner with configurable delays & progress reporting.
 *
 * @param {object} params
 * @param {import('./client.js').TwitterHttpClient} params.client
 * @param {string[]} params.ids - Array of user/tweet IDs to process
 * @param {(client: object, id: string) => Promise<{ success: boolean }>} params.action
 * @param {string} params.type - Operation type for delay defaults & labels
 * @param {object} [params.options]
 * @param {number} [params.options.delayMs] - Delay between each action
 * @param {function} [params.options.onProgress] - Callback `({ completed, total, currentId, success })`
 * @param {boolean} [params.options.dryRun=false] - If true, skip actual actions
 * @returns {Promise<{ succeeded: number, failed: Array<{ id: string, error: string }> }>}
 */
async function bulkOperation({ client, ids, action, type, options = {} }) {
  requireAuth(client);

  const delayMs = options.delayMs ?? DEFAULT_DELAYS[type] ?? 2000;
  const dryRun = options.dryRun === true;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  let succeeded = 0;
  const failed = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];

    if (!dryRun) {
      try {
        await action(client, id);
        succeeded++;
      } catch (err) {
        failed.push({ id, error: err.message || String(err) });
      }
    } else {
      succeeded++;
    }

    if (onProgress) {
      onProgress({ completed: i + 1, total: ids.length, currentId: id, success: !failed.find((f) => f.id === id) });
    }

    // Safety delay between actions (skip after the last one)
    if (i < ids.length - 1) {
      // Add ± 30 % jitter to avoid detection
      const jitter = delayMs * 0.3 * (Math.random() * 2 - 1);
      await sleep(Math.max(delayMs + jitter, 500));
    }
  }

  return { succeeded, failed };
}

/**
 * Bulk unfollow users — XActions' core use case.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string[]} userIds
 * @param {object} [options]
 * @param {number} [options.delayMs=2000]
 * @param {function} [options.onProgress]
 * @param {boolean} [options.dryRun=false]
 * @returns {Promise<{ unfollowed: number, failed: Array<{ userId: string, error: string }> }>}
 */
export async function bulkUnfollow(client, userIds, options = {}) {
  const result = await bulkOperation({
    client,
    ids: userIds,
    action: unfollowUser,
    type: 'unfollow',
    options,
  });
  return { unfollowed: result.succeeded, failed: result.failed.map((f) => ({ userId: f.id, error: f.error })) };
}

/**
 * Bulk like tweets.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string[]} tweetIds
 * @param {object} [options]
 * @param {number} [options.delayMs=1000]
 * @param {function} [options.onProgress]
 * @param {boolean} [options.dryRun=false]
 * @returns {Promise<{ liked: number, failed: Array<{ tweetId: string, error: string }> }>}
 */
export async function bulkLike(client, tweetIds, options = {}) {
  const result = await bulkOperation({
    client,
    ids: tweetIds,
    action: likeTweet,
    type: 'like',
    options,
  });
  return { liked: result.succeeded, failed: result.failed.map((f) => ({ tweetId: f.id, error: f.error })) };
}

/**
 * Bulk block users.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string[]} userIds
 * @param {object} [options]
 * @param {number} [options.delayMs=1000]
 * @param {function} [options.onProgress]
 * @param {boolean} [options.dryRun=false]
 * @returns {Promise<{ blocked: number, failed: Array<{ userId: string, error: string }> }>}
 */
export async function bulkBlock(client, userIds, options = {}) {
  const result = await bulkOperation({
    client,
    ids: userIds,
    action: blockUser,
    type: 'block',
    options,
  });
  return { blocked: result.succeeded, failed: result.failed.map((f) => ({ userId: f.id, error: f.error })) };
}
