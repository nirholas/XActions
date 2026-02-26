/**
 * XActions Client — Tweets API
 * Tweet-related API calls: get, send, delete, like, retweet, and paginated timelines.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Tweet } from '../models/Tweet.js';
import {
  GRAPHQL_ENDPOINTS,
  DEFAULT_FEATURES,
  DEFAULT_FIELD_TOGGLES,
  buildGraphQLUrl,
} from './graphqlQueries.js';
import {
  parseTimelineEntries,
  parseTweetEntry,
  parseModuleEntry,
  navigateResponse,
} from './parsers.js';
import { NotFoundError, ScraperError } from '../errors.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 2000) => sleep(min + Math.random() * (max - min));

/**
 * Get a single tweet by its ID.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} tweetId - Numeric tweet ID
 * @returns {Promise<Tweet>}
 * @throws {NotFoundError} If tweet does not exist
 */
export async function getTweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.TweetDetail;
  const variables = {
    focalTweetId: tweetId,
    with_rux_injections: false,
    includePromotedContent: false,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: true,
    withBirdwatchNotes: true,
    withVoice: true,
    withV2Timeline: true,
  };
  const url = buildGraphQLUrl(endpoint, variables);
  const data = await http.get(url);

  // Navigate the response to find the focal tweet
  const instructions =
    data?.data?.tweetResult?.result?.timeline_v2?.timeline?.instructions ||
    navigateResponse(data, 'data.threaded_conversation_with_injections_v2.instructions') ||
    [];

  // Try direct tweetResult first
  const directResult = data?.data?.tweetResult?.result;
  if (directResult && directResult.__typename !== 'TweetTombstone') {
    const tweet = Tweet.fromGraphQL(directResult);
    if (tweet) return tweet;
  }

  // Search through timeline instructions for the focal tweet
  for (const instruction of instructions) {
    const entries = instruction.entries || [];
    for (const entry of entries) {
      if (entry.entryId === `tweet-${tweetId}`) {
        const tweet = parseTweetEntry(entry);
        if (tweet) return tweet;
      }
    }
  }

  throw new NotFoundError(`Tweet ${tweetId} not found`, 'TWEET_NOT_FOUND');
}

/**
 * Get tweets from a user's timeline using cursor-based pagination.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @param {number} [count=40] - Maximum number of tweets to yield
 * @yields {Tweet}
 */
export async function* getTweets(http, userId, count = 40) {
  const endpoint = GRAPHQL_ENDPOINTS.UserTweets;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = {
      userId,
      count: 20,
      includePromotedContent: false,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
      withV2Timeline: true,
    };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.user.result.timeline_v2.timeline',
    );

    if (!entries.length) break;

    for (const entry of entries) {
      if (entry.entryId?.startsWith('cursor-')) continue;

      // Single tweet entry
      if (entry.entryId?.startsWith('tweet-')) {
        const tweet = parseTweetEntry(entry);
        if (tweet) {
          yield tweet;
          yielded++;
          if (yielded >= count) break;
        }
      }
    }

    cursor = nextCursor;
    if (!cursor) break;
    await randomDelay(1000, 2000);
  }
}

/**
 * Get tweets and replies from a user's timeline.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @param {number} [count=40] - Maximum number of tweets to yield
 * @yields {Tweet}
 */
export async function* getTweetsAndReplies(http, userId, count = 40) {
  const endpoint = GRAPHQL_ENDPOINTS.UserTweetsAndReplies;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = {
      userId,
      count: 20,
      includePromotedContent: false,
      withCommunity: true,
      withVoice: true,
      withV2Timeline: true,
    };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.user.result.timeline_v2.timeline',
    );

    if (!entries.length) break;

    for (const entry of entries) {
      if (entry.entryId?.startsWith('cursor-')) continue;

      // Single tweet entry
      if (entry.entryId?.startsWith('tweet-') || entry.entryId?.startsWith('profile-')) {
        const tweet = parseTweetEntry(entry);
        if (tweet) {
          yield tweet;
          yielded++;
          if (yielded >= count) break;
        }
      }

      // Conversation module (reply chain)
      if (entry.entryId?.startsWith('profile-conversation-') || entry.content?.entryType === 'TimelineTimelineModule') {
        const moduleTweets = parseModuleEntry(entry);
        for (const tweet of moduleTweets) {
          yield tweet;
          yielded++;
          if (yielded >= count) break;
        }
        if (yielded >= count) break;
      }
    }

    cursor = nextCursor;
    if (!cursor) break;
    await randomDelay(1000, 2000);
  }
}

/**
 * Get a user's liked tweets using cursor-based pagination.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @param {number} [count=40] - Maximum number of liked tweets to yield
 * @yields {Tweet}
 */
export async function* getLikedTweets(http, userId, count = 40) {
  const endpoint = GRAPHQL_ENDPOINTS.Likes;
  let cursor = null;
  let yielded = 0;

  while (yielded < count) {
    const variables = {
      userId,
      count: 20,
      includePromotedContent: false,
      withClientEventToken: false,
      withBirdwatchNotes: false,
      withVoice: true,
      withV2Timeline: true,
    };
    if (cursor) variables.cursor = cursor;

    const url = buildGraphQLUrl(endpoint, variables);
    const data = await http.get(url);

    const { entries, cursor: nextCursor } = parseTimelineEntries(
      data,
      'data.user.result.timeline_v2.timeline',
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
 * Get the latest tweet from a user.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} userId - Numeric user ID
 * @returns {Promise<Tweet|null>}
 */
export async function getLatestTweet(http, userId) {
  for await (const tweet of getTweets(http, userId, 1)) {
    return tweet;
  }
  return null;
}

/**
 * Post a new tweet.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} text - Tweet text
 * @param {Object} [options={}]
 * @param {string[]} [options.mediaIds] - Media entity IDs to attach
 * @param {string} [options.replyTo] - Tweet ID to reply to
 * @returns {Promise<Tweet>}
 */
export async function sendTweet(http, text, options = {}) {
  const endpoint = GRAPHQL_ENDPOINTS.CreateTweet;
  const url = buildGraphQLUrl(endpoint);

  const variables = {
    tweet_text: text,
    dark_request: false,
    media: {
      media_entities: (options.mediaIds || []).map((id) => ({
        media_id: id,
        tagged_users: [],
      })),
      possibly_sensitive: false,
    },
    semantic_annotation_ids: [],
  };

  if (options.replyTo) {
    variables.reply = {
      in_reply_to_tweet_id: options.replyTo,
      exclude_reply_user_ids: [],
    };
  }

  const body = {
    variables,
    features: DEFAULT_FEATURES,
    queryId: endpoint.queryId,
  };

  const data = await http.post(url, body);
  const result =
    data?.data?.create_tweet?.tweet_results?.result;

  if (!result) {
    throw new ScraperError('Failed to send tweet — no result returned', 'API_ERROR');
  }

  return Tweet.fromGraphQL(result);
}

/**
 * Post a quote tweet.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} text - Tweet text
 * @param {string} quotedTweetId - ID of tweet to quote
 * @param {string[]} [mediaIds=[]] - Media entity IDs to attach
 * @returns {Promise<Tweet>}
 */
export async function sendQuoteTweet(http, text, quotedTweetId, mediaIds = []) {
  const endpoint = GRAPHQL_ENDPOINTS.CreateTweet;
  const url = buildGraphQLUrl(endpoint);

  const variables = {
    tweet_text: text,
    dark_request: false,
    attachment_url: `https://x.com/i/status/${quotedTweetId}`,
    media: {
      media_entities: mediaIds.map((id) => ({ media_id: id, tagged_users: [] })),
      possibly_sensitive: false,
    },
    semantic_annotation_ids: [],
  };

  const body = {
    variables,
    features: DEFAULT_FEATURES,
    queryId: endpoint.queryId,
  };

  const data = await http.post(url, body);
  const result = data?.data?.create_tweet?.tweet_results?.result;

  if (!result) {
    throw new ScraperError('Failed to send quote tweet — no result returned', 'API_ERROR');
  }

  return Tweet.fromGraphQL(result);
}

/**
 * Delete a tweet.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} tweetId - Numeric tweet ID
 * @returns {Promise<void>}
 */
export async function deleteTweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.DeleteTweet;
  const url = buildGraphQLUrl(endpoint);
  await http.post(url, {
    variables: { tweet_id: tweetId, dark_request: false },
    queryId: endpoint.queryId,
  });
}

/**
 * Like a tweet.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} tweetId - Numeric tweet ID
 * @returns {Promise<void>}
 */
export async function likeTweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.FavoriteTweet;
  const url = buildGraphQLUrl(endpoint);
  await http.post(url, {
    variables: { tweet_id: tweetId },
    queryId: endpoint.queryId,
  });
}

/**
 * Unlike a tweet.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} tweetId - Numeric tweet ID
 * @returns {Promise<void>}
 */
export async function unlikeTweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.UnfavoriteTweet;
  const url = buildGraphQLUrl(endpoint);
  await http.post(url, {
    variables: { tweet_id: tweetId },
    queryId: endpoint.queryId,
  });
}

/**
 * Retweet a tweet.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} tweetId - Numeric tweet ID
 * @returns {Promise<void>}
 */
export async function retweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.CreateRetweet;
  const url = buildGraphQLUrl(endpoint);
  await http.post(url, {
    variables: { tweet_id: tweetId, dark_request: false },
    queryId: endpoint.queryId,
  });
}

/**
 * Unretweet (remove retweet) a tweet.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} tweetId - Numeric tweet ID
 * @returns {Promise<void>}
 */
export async function unretweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.DeleteRetweet;
  const url = buildGraphQLUrl(endpoint);
  await http.post(url, {
    variables: { source_tweet_id: tweetId, dark_request: false },
    queryId: endpoint.queryId,
  });
}
