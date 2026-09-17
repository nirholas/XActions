// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Twitter HTTP Tweet Scraper
 *
 * Scrapes tweets via Twitter's internal GraphQL API — no browser required.
 * Supports user timelines, replies, single tweet lookup, and thread
 * reconstruction.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { GRAPHQL, DEFAULT_FEATURES } from './endpoints.js';
import { bindCheckpoint } from './checkpoint.js';
import { NotFoundError, TwitterApiError } from './errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

// The parsers live in ./parse/tweet.js so the edge API can import them without
// dragging in the HTTP client, the checkpoint store and the Node filesystem.
// Re-exported here because this module has been their public home since they
// were written.
export {
  parseTweetData,
  parseTimelineInstructions,
  userTimelineInstructions,
} from './parse/tweet.js';
import {
  parseTweetData,
  parseTimelineInstructions,
  userTimelineInstructions,
  extractTweetResult,
} from './parse/tweet.js';

/**
 * Scrape tweets from a user's timeline via the `UserTweets` GraphQL
 * endpoint.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} username — Screen name (without `@`).
 * @param {object} [options]
 * @param {number} [options.limit=100]
 * @param {boolean} [options.includeReplies=false]
 * @param {string|null} [options.cursor=null] — Resume pagination from cursor.
 * @param {function} [options.onProgress] — `({ fetched, limit }) => void`
 * @returns {Promise<object[]>} Array of parsed tweet objects.
 */
export async function scrapeTweets(client, username, options = {}) {
  const { limit: requestedLimit = 100, includeReplies = false, cursor = null, onProgress, checkpoint: checkpointHandle } = options;

  // If includeReplies, delegate to the specialised function
  if (includeReplies) {
    return scrapeTweetsAndReplies(client, username, { limit: requestedLimit, cursor, onProgress, checkpoint: checkpointHandle });
  }

  // Resolve username → userId
  const userId = await resolveUserId(client, username);

  const { queryId, operationName } = GRAPHQL.UserTweets;
  const checkpoint = bindCheckpoint(checkpointHandle, { cursor, limit: requestedLimit, meta: { operation: operationName, username } });
  const limit = checkpoint.limit;
  const allTweets = [];
  let nextCursor = checkpoint.cursor;

  while (allTweets.length < limit) {
    const variables = {
      userId,
      count: 20,
      includePromotedContent: false,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
      withV2Timeline: true,
    };
    if (nextCursor) variables.cursor = nextCursor;

    const resp = await client.graphql(queryId, operationName, variables);

    const instructions = userTimelineInstructions(resp?.data);

    const { tweets, cursor: bottomCursor } = parseTimelineInstructions(instructions);

    for (const tweet of tweets) {
      if (allTweets.length >= limit) break;
      allTweets.push(tweet);
    }

    if (onProgress) {
      onProgress({ fetched: allTweets.length, limit });
    }

    // No more pages or no new tweets
    // A cursor that comes back unchanged means the page did not advance;
    // continuing would append the same items again.
    if (!bottomCursor || tweets.length === 0 || bottomCursor === nextCursor) break;
    nextCursor = bottomCursor;
    checkpoint.record(bottomCursor, allTweets.length);
  }

  checkpoint.complete();
  return allTweets.slice(0, limit);
}

// ---------------------------------------------------------------------------
// scrapeTweetsAndReplies — User tweets + replies timeline
// ---------------------------------------------------------------------------

/**
 * Scrape tweets and replies from a user's timeline via the
 * `UserTweetsAndReplies` GraphQL endpoint.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} username
 * @param {object} [options]
 * @param {number} [options.limit=100]
 * @param {string|null} [options.cursor=null]
 * @param {function} [options.onProgress]
 * @returns {Promise<object[]>}
 */
export async function scrapeTweetsAndReplies(client, username, options = {}) {
  const { limit: requestedLimit = 100, cursor = null, onProgress } = options;

  const userId = await resolveUserId(client, username);

  const { queryId, operationName } = GRAPHQL.UserTweetsAndReplies;
  const checkpoint = bindCheckpoint(options.checkpoint, { cursor, limit: requestedLimit, meta: { operation: operationName, username } });
  const limit = checkpoint.limit;
  const allTweets = [];
  let nextCursor = checkpoint.cursor;

  while (allTweets.length < limit) {
    const variables = {
      userId,
      count: 20,
      includePromotedContent: false,
      withCommunity: true,
      withVoice: true,
      withV2Timeline: true,
    };
    if (nextCursor) variables.cursor = nextCursor;

    const resp = await client.graphql(queryId, operationName, variables);

    const instructions = userTimelineInstructions(resp?.data);

    const { tweets, cursor: bottomCursor } = parseTimelineInstructions(instructions);

    for (const tweet of tweets) {
      if (allTweets.length >= limit) break;
      allTweets.push(tweet);
    }

    if (onProgress) {
      onProgress({ fetched: allTweets.length, limit });
    }

    // A cursor that comes back unchanged means the page did not advance;
    // continuing would append the same items again.
    if (!bottomCursor || tweets.length === 0 || bottomCursor === nextCursor) break;
    nextCursor = bottomCursor;
    checkpoint.record(bottomCursor, allTweets.length);
  }

  checkpoint.complete();
  return allTweets.slice(0, limit);
}

// ---------------------------------------------------------------------------
// scrapeTweetById — Single tweet lookup
// ---------------------------------------------------------------------------

/**
 * Fetch a single tweet by its ID via `TweetResultByRestId`.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<object>} Parsed tweet object.
 * @throws {NotFoundError} If the tweet doesn't exist.
 */
export async function scrapeTweetById(client, tweetId) {
  const { queryId, operationName } = GRAPHQL.TweetResultByRestId;

  const variables = {
    tweetId,
    withCommunity: false,
    includePromotedContent: false,
    withVoice: false,
  };

  const resp = await client.graphql(queryId, operationName, variables);

  const result = resp?.data?.tweetResult?.result;
  if (!result) {
    throw new NotFoundError(`Tweet ${tweetId} not found`);
  }

  const parsed = parseTweetData(result);
  if (!parsed || parsed.tombstone) {
    throw new NotFoundError(`Tweet ${tweetId} is unavailable`);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// scrapeThread — Full conversation thread reconstruction
// ---------------------------------------------------------------------------

/**
 * Reconstruct a conversation thread from a single tweet.
 *
 * Uses the `TweetDetail` endpoint which returns the conversation context:
 * parent tweets above, the focal tweet, and replies below.
 *
 * Filters to only include tweets from the same author (self-thread) unless
 * `options.allAuthors` is true.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId — Any tweet in the thread.
 * @param {object} [options]
 * @param {boolean} [options.allAuthors=false]
 * @returns {Promise<{ rootTweet: object, tweets: object[], totalReplies: number }>}
 */
export async function scrapeThread(client, tweetId, options = {}) {
  const { allAuthors = false } = options;
  const { queryId, operationName } = GRAPHQL.TweetDetail;

  const variables = {
    focalTweetId: tweetId,
    with_rux_injections: false,
    rankingMode: 'Relevance',
    includePromotedContent: false,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: true,
    withBirdwatchNotes: true,
    withVoice: true,
  };

  const resp = await client.graphql(queryId, operationName, variables);

  const instructions =
    resp?.data?.threaded_conversation_with_injections_v2?.instructions ?? [];

  // Collect all tweets from the conversation
  const allTweets = [];
  for (const instruction of instructions) {
    const entries = instruction.entries || [];
    for (const entry of entries) {
      // Single tweet entry
      const tweetResult = extractTweetResult(entry);
      if (tweetResult) {
        const parsed = parseTweetData(tweetResult);
        if (parsed && parsed.id) allTweets.push(parsed);
      }

      // Conversation module items (threaded replies)
      const moduleItems = entry.content?.items;
      if (Array.isArray(moduleItems)) {
        for (const moduleItem of moduleItems) {
          const modTweetResult =
            moduleItem?.item?.itemContent?.tweet_results?.result;
          if (modTweetResult) {
            const parsed = parseTweetData(modTweetResult);
            if (parsed && parsed.id) allTweets.push(parsed);
          }
        }
      }
    }
  }

  if (allTweets.length === 0) {
    throw new NotFoundError(`Thread for tweet ${tweetId} not found`);
  }

  // Find the focal tweet to identify the thread author
  const focalTweet = allTweets.find((t) => t.id === tweetId);
  const threadAuthorId = focalTweet?.author?.id;

  // Filter to same-author tweets (self-thread) unless allAuthors requested
  let threadTweets = allAuthors
    ? allTweets
    : allTweets.filter((t) => t.author?.id === threadAuthorId);

  // Sort chronologically by createdAt
  threadTweets.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return da - db;
  });

  // The root tweet is the earliest in the thread
  const rootTweet = threadTweets[0] || null;

  return {
    rootTweet,
    tweets: threadTweets,
    totalReplies: allTweets.length - 1, // exclude the focal/root tweet itself
  };
}

// ---------------------------------------------------------------------------
// Internal: resolve username → userId
// ---------------------------------------------------------------------------

/**
 * Resolve a username to a Twitter user ID via `UserByScreenName`.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} username
 * @returns {Promise<string>} The user's `rest_id`.
 * @throws {NotFoundError}
 */
async function resolveUserId(client, username) {
  const { queryId, operationName } = GRAPHQL.UserByScreenName;
  const variables = {
    screen_name: username,
    withSafetyModeUserFields: true,
  };

  const resp = await client.graphql(queryId, operationName, variables);
  const result = resp?.data?.user?.result;

  if (!result || result.__typename === 'UserUnavailable') {
    throw new NotFoundError(`User @${username} not found`);
  }

  return result.rest_id;
}
