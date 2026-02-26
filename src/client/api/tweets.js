/**
 * XActions Client — Tweets API
 *
 * Tweet-related API calls: get, send, delete, like, retweet.
 * All functions take an HTTP client as the first parameter.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { GRAPHQL_ENDPOINTS, DEFAULT_FEATURES, buildGraphQLUrl } from './graphqlQueries.js';
import { Tweet } from '../models/Tweet.js';
import { NotFoundError, ScraperError } from '../errors.js';
import { parseTimelineEntries, parseTweetEntry, parseModuleEntry } from './parsers.js';

/** @private Random delay between paginated requests */
function randomDelay(min = 1000, max = 2000) {
  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
}

/**
 * Get a single tweet by ID.
 *
 * @param {Object} http - HTTP client with get/post methods
 * @param {string} tweetId - Numeric tweet ID
 * @returns {Promise<Tweet>}
 * @throws {NotFoundError}
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

  // Navigate the TweetDetail response — entries are nested in instructions
  const instructions = data?.data?.tweetResult?.result?.tweet
    ? null // Direct tweet result
    : data?.data?.threaded_conversation_with_injections_v2?.instructions;

  // Try direct tweet result first
  const directResult = data?.data?.tweetResult?.result;
  if (directResult) {
    const tweet = Tweet.fromGraphQL(directResult);
    if (tweet) return tweet;
  }

  // Try timeline entries format
  if (instructions) {
    for (const instruction of instructions) {
      if (instruction.type !== 'TimelineAddEntries') continue;
      for (const entry of instruction.entries || []) {
        if (!entry.entryId?.startsWith('tweet-')) continue;
        const tweetResult = entry.content?.itemContent?.tweet_results?.result;
        if (tweetResult) {
          let result = tweetResult;
          if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) {
            result = result.tweet;
          }
          if (result.rest_id === tweetId || result.legacy?.id_str === tweetId) {
            const tweet = Tweet.fromGraphQL(result);
            if (tweet) return tweet;
          }
        }
      }
    }
  }

  throw new NotFoundError(`Tweet "${tweetId}" not found`, 'TWEET_NOT_FOUND', {
    endpoint: 'TweetDetail',
  });
}

/**
 * Get tweets from a user's timeline.
 *
 * @param {Object} http
 * @param {string} userId - Numeric user ID
 * @param {number} [count=40] - Maximum tweets to yield
 * @yields {Tweet}
 */
export async function* getTweets(http, userId, count = 40) {
  let yielded = 0;
  let cursor = null;

  while (yielded < count) {
    const endpoint = GRAPHQL_ENDPOINTS.UserTweets;
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
 * Get tweets and replies from a user's timeline.
 *
 * @param {Object} http
 * @param {string} userId
 * @param {number} [count=40]
 * @yields {Tweet}
 */
export async function* getTweetsAndReplies(http, userId, count = 40) {
  let yielded = 0;
  let cursor = null;

  while (yielded < count) {
    const endpoint = GRAPHQL_ENDPOINTS.UserTweetsAndReplies;
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

    let foundAny = false;
    for (const entry of entries) {
      // Handle conversation modules (multi-tweet replies)
      if (entry.content?.entryType === 'TimelineTimelineModule') {
        const moduleTweets = parseModuleEntry(entry);
        for (const tweet of moduleTweets) {
          yield tweet;
          yielded++;
          foundAny = true;
          if (yielded >= count) return;
        }
      } else {
        const tweet = parseTweetEntry(entry);
        if (tweet) {
          yield tweet;
          yielded++;
          foundAny = true;
          if (yielded >= count) return;
        }
      }
    }

    if (!nextCursor || !foundAny) return;
    cursor = nextCursor;
    await randomDelay(1000, 2000);
  }
}

/**
 * Get a user's liked tweets.
 *
 * @param {Object} http
 * @param {string} userId
 * @param {number} [count=40]
 * @yields {Tweet}
 */
export async function* getLikedTweets(http, userId, count = 40) {
  let yielded = 0;
  let cursor = null;

  while (yielded < count) {
    const endpoint = GRAPHQL_ENDPOINTS.Likes;
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
 * Get the latest tweet from a user.
 *
 * @param {Object} http
 * @param {string} userId
 * @returns {Promise<Tweet|null>}
 */
export async function getLatestTweet(http, userId) {
  const gen = getTweets(http, userId, 1);
  const result = await gen.next();
  return result.value || null;
}

/**
 * Post a new tweet.
 *
 * @param {Object} http
 * @param {string} text - Tweet text
 * @param {Object} [options={}]
 * @param {string[]} [options.mediaIds] - Media entity IDs to attach
 * @param {string} [options.replyTo] - Tweet ID to reply to
 * @returns {Promise<Tweet>}
 */
export async function sendTweet(http, text, options = {}) {
  const endpoint = GRAPHQL_ENDPOINTS.CreateTweet;
  const url = endpoint.url(endpoint.queryId);

  const variables = {
    tweet_text: text,
    dark_request: false,
    media: {
      media_entities: (options.mediaIds || []).map((id) => ({ media_id: id, tagged_users: [] })),
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
  const tweetResult = data?.data?.create_tweet?.tweet_results?.result;

  if (tweetResult) {
    const tweet = Tweet.fromGraphQL(tweetResult);
    if (tweet) return tweet;
  }

  // Return a minimal tweet on parsing failure
  const tweet = new Tweet();
  tweet.text = text;
  return tweet;
}

/**
 * Post a quote tweet.
 *
 * @param {Object} http
 * @param {string} text
 * @param {string} quotedTweetId
 * @param {string[]} [mediaIds=[]]
 * @returns {Promise<Tweet>}
 */
export async function sendQuoteTweet(http, text, quotedTweetId, mediaIds = []) {
  const endpoint = GRAPHQL_ENDPOINTS.CreateTweet;
  const url = endpoint.url(endpoint.queryId);

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
  const tweetResult = data?.data?.create_tweet?.tweet_results?.result;

  if (tweetResult) {
    const tweet = Tweet.fromGraphQL(tweetResult);
    if (tweet) return tweet;
  }

  const tweet = new Tweet();
  tweet.text = text;
  tweet.isQuote = true;
  tweet.quotedStatusId = quotedTweetId;
  return tweet;
}

/**
 * Delete a tweet.
 *
 * @param {Object} http
 * @param {string} tweetId
 * @returns {Promise<void>}
 */
export async function deleteTweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.DeleteTweet;
  const url = endpoint.url(endpoint.queryId);
  const body = {
    variables: { tweet_id: tweetId, dark_request: false },
    queryId: endpoint.queryId,
  };
  await http.post(url, body);
}

/**
 * Like a tweet.
 *
 * @param {Object} http
 * @param {string} tweetId
 * @returns {Promise<void>}
 */
export async function likeTweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.FavoriteTweet;
  const url = endpoint.url(endpoint.queryId);
  const body = {
    variables: { tweet_id: tweetId },
    queryId: endpoint.queryId,
  };
  await http.post(url, body);
}

/**
 * Unlike a tweet.
 *
 * @param {Object} http
 * @param {string} tweetId
 * @returns {Promise<void>}
 */
export async function unlikeTweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.UnfavoriteTweet;
  const url = endpoint.url(endpoint.queryId);
  const body = {
    variables: { tweet_id: tweetId },
    queryId: endpoint.queryId,
  };
  await http.post(url, body);
}

/**
 * Retweet a tweet.
 *
 * @param {Object} http
 * @param {string} tweetId
 * @returns {Promise<void>}
 */
export async function retweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.CreateRetweet;
  const url = endpoint.url(endpoint.queryId);
  const body = {
    variables: { tweet_id: tweetId, dark_request: false },
    queryId: endpoint.queryId,
  };
  await http.post(url, body);
}

/**
 * Unretweet (undo retweet).
 *
 * @param {Object} http
 * @param {string} tweetId
 * @returns {Promise<void>}
 */
export async function unretweet(http, tweetId) {
  const endpoint = GRAPHQL_ENDPOINTS.DeleteRetweet;
  const url = endpoint.url(endpoint.queryId);
  const body = {
    variables: { source_tweet_id: tweetId, dark_request: false },
    queryId: endpoint.queryId,
  };
  await http.post(url, body);
}
