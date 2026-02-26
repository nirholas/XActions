/**
 * Twitter HTTP Scraper — Write Actions (Mutations)
 *
 * Post tweets, threads, replies, quote tweets, schedule posts, delete tweets.
 * All operations use Twitter's internal GraphQL API and require an
 * authenticated session (cookies with auth_token + ct0).
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { GRAPHQL, GRAPHQL_BASE, DEFAULT_FEATURES } from './endpoints.js';
import { AuthError, TwitterApiError } from './errors.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TWEET_LENGTH = 280;
const MAX_TWEET_LENGTH_PREMIUM = 25_000;

/** Query ID for CreateScheduledTweet (not always in the public bundle). */
const CREATE_SCHEDULED_TWEET = {
  queryId: 'LCVzRQGxOaGnOnYH01NQXg',
  operationName: 'CreateScheduledTweet',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) => sleep(min + Math.random() * (max - min));

/**
 * Assert the client is authenticated; throw AuthError otherwise.
 * @param {import('./client.js').TwitterHttpClient} client
 */
function requireAuth(client) {
  if (!client.isAuthenticated()) {
    throw new AuthError('Authentication required for write operations');
  }
}

/**
 * Validate tweet text length.
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [options.premium=false]
 */
function validateTweetText(text, { premium = false } = {}) {
  if (typeof text !== 'string' || text.length === 0) {
    throw new TwitterApiError('Tweet text must be a non-empty string');
  }
  const limit = premium ? MAX_TWEET_LENGTH_PREMIUM : MAX_TWEET_LENGTH;
  if (text.length > limit) {
    throw new TwitterApiError(
      `Tweet text exceeds maximum length (${text.length}/${limit})`,
    );
  }
}

/**
 * Extract the created tweet object from the CreateTweet mutation response.
 * @param {object} json — raw response from the GraphQL endpoint
 * @returns {object} parsed tweet result
 */
function parseTweetResult(json) {
  // Twitter nests the result at varying depths depending on the response shape
  const result =
    json?.data?.create_tweet?.tweet_results?.result ??
    json?.data?.create_tweet?.tweet_result?.result ??
    json?.data?.create_tweet ??
    json;
  return result;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Post a tweet via the CreateTweet GraphQL mutation.
 *
 * @param {import('./client.js').TwitterHttpClient} client — authenticated client
 * @param {string} text — tweet body
 * @param {object} [options]
 * @param {string} [options.replyTo] — tweet ID to reply to
 * @param {string[]} [options.mediaIds] — uploaded media IDs to attach
 * @param {string} [options.quoteTweetId] — tweet ID to quote
 * @param {boolean} [options.sensitive=false] — mark media as sensitive
 * @param {boolean} [options.premium=false] — allow >280 chars
 * @param {string[]} [options.excludeReplyUserIds] — user IDs to exclude from reply thread
 * @returns {Promise<object>} the created tweet object
 */
export async function postTweet(client, text, options = {}) {
  requireAuth(client);
  validateTweetText(text, { premium: options.premium });

  const {
    replyTo,
    mediaIds = [],
    quoteTweetId,
    sensitive = false,
    excludeReplyUserIds = [],
  } = options;

  const { queryId, operationName } = GRAPHQL.CreateTweet;

  const variables = {
    tweet_text: text,
    dark_request: false,
    media: {
      media_entities: mediaIds.map((id) => ({ media_id: id, tagged_users: [] })),
      possibly_sensitive: sensitive,
    },
    semantic_annotation_ids: [],
  };

  // Reply
  if (replyTo) {
    variables.reply = {
      in_reply_to_tweet_id: replyTo,
      exclude_reply_user_ids: excludeReplyUserIds,
    };
  }

  // Quote tweet
  if (quoteTweetId) {
    variables.attachment_url = `https://x.com/i/web/status/${quoteTweetId}`;
  }

  const json = await client.graphql(queryId, operationName, variables, {
    mutation: true,
    features: DEFAULT_FEATURES,
  });

  return parseTweetResult(json);
}

/**
 * Post a thread (multiple tweets chained as self-replies).
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {Array<{ text: string, mediaIds?: string[] }>} tweets
 * @param {object} [options]
 * @param {boolean} [options.premium=false]
 * @returns {Promise<object[]>} array of created tweet objects
 */
export async function postThread(client, tweets, options = {}) {
  requireAuth(client);

  if (!Array.isArray(tweets) || tweets.length === 0) {
    throw new TwitterApiError('Thread must contain at least one tweet');
  }

  const results = [];
  let previousTweetId = null;

  for (let i = 0; i < tweets.length; i++) {
    const { text, mediaIds } = tweets[i];

    const tweetOptions = {
      ...options,
      mediaIds: mediaIds || [],
    };

    if (previousTweetId) {
      tweetOptions.replyTo = previousTweetId;
    }

    const result = await postTweet(client, text, tweetOptions);
    results.push(result);

    // Extract tweet ID for the next reply in the chain
    previousTweetId =
      result?.rest_id ??
      result?.legacy?.id_str ??
      result?.tweet?.rest_id ??
      null;

    // Rate-limit safety: delay between posts (skip after the last one)
    if (i < tweets.length - 1) {
      await randomDelay(1000, 3000);
    }
  }

  return results;
}

/**
 * Delete a tweet via the DeleteTweet GraphQL mutation.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteTweet(client, tweetId) {
  requireAuth(client);

  if (!tweetId) {
    throw new TwitterApiError('tweetId is required');
  }

  const { queryId, operationName } = GRAPHQL.DeleteTweet;

  await client.graphql(queryId, operationName, { tweet_id: tweetId }, {
    mutation: true,
    features: DEFAULT_FEATURES,
  });

  return { success: true };
}

/**
 * Reply to a tweet. Convenience wrapper around postTweet.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId — tweet to reply to
 * @param {string} text — reply body
 * @param {object} [options]
 * @param {string[]} [options.mediaIds]
 * @param {string[]} [options.excludeReplyUserIds]
 * @param {boolean} [options.premium]
 * @returns {Promise<object>}
 */
export async function replyToTweet(client, tweetId, text, options = {}) {
  return postTweet(client, text, {
    ...options,
    replyTo: tweetId,
  });
}

/**
 * Quote-tweet another tweet. Convenience wrapper around postTweet.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId — tweet to quote
 * @param {string} text — commentary
 * @param {object} [options]
 * @param {string[]} [options.mediaIds]
 * @param {boolean} [options.premium]
 * @returns {Promise<object>}
 */
export async function quoteTweet(client, tweetId, text, options = {}) {
  return postTweet(client, text, {
    ...options,
    quoteTweetId: tweetId,
  });
}

/**
 * Schedule a tweet for future publication via CreateScheduledTweet.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} text
 * @param {Date|number} scheduledAt — Date object or Unix epoch in seconds
 * @param {object} [options]
 * @param {string[]} [options.mediaIds]
 * @param {boolean} [options.premium]
 * @returns {Promise<{ scheduledTweetId: string }>}
 */
export async function schedulePost(client, text, scheduledAt, options = {}) {
  requireAuth(client);
  validateTweetText(text, { premium: options.premium });

  const { queryId, operationName } = CREATE_SCHEDULED_TWEET;

  // Normalise to Unix seconds
  const executeAt =
    scheduledAt instanceof Date
      ? Math.floor(scheduledAt.getTime() / 1000)
      : typeof scheduledAt === 'number' && scheduledAt > 1e12
        ? Math.floor(scheduledAt / 1000) // was milliseconds
        : scheduledAt;

  const variables = {
    post_tweet_request: {
      auto_populate_reply_metadata: false,
      status: text,
      exclude_reply_user_ids: [],
      media_ids: options.mediaIds || [],
    },
    execute_at: executeAt,
  };

  const url = `${GRAPHQL_BASE}/${queryId}/${operationName}`;
  const json = await client.request(url, {
    method: 'POST',
    body: { variables, queryId },
  });

  const scheduledTweetId =
    json?.data?.tweet?.rest_id ??
    json?.data?.create_scheduled_tweet?.id ??
    json?.data?.id ??
    null;

  return { scheduledTweetId };
}
