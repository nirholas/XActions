/**
 * Twitter HTTP Tweet Scraper
 *
 * Scrapes tweets via Twitter's internal GraphQL API — no browser required.
 * Supports user timelines, replies, single tweet lookup, and thread
 * reconstruction.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { GRAPHQL, DEFAULT_FEATURES } from './endpoints.js';
import { NotFoundError, TwitterApiError } from './errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse Twitter's `created_at` string ("Mon Jan 01 00:00:00 +0000 2007")
 * into an ISO-8601 date string.
 *
 * @param {string|null} raw
 * @returns {string|null}
 */
function toISODate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toISOString();
}

/**
 * Select the highest-bitrate MP4 variant from a video_info.variants array.
 *
 * @param {object[]} variants
 * @returns {string|null}
 */
function pickBestVideoUrl(variants) {
  if (!variants || !variants.length) return null;
  const mp4s = variants.filter((v) => v.content_type === 'video/mp4' && v.url);
  if (!mp4s.length) return null;
  mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  return mp4s[0].url;
}

/**
 * Strip HTML tags from a source string (e.g. Twitter Web App link).
 *
 * @param {string|null} raw
 * @returns {string}
 */
function cleanSource(raw) {
  if (!raw) return '';
  return raw.replace(/<[^>]+>/g, '');
}

// ---------------------------------------------------------------------------
// parseTweetData — Pure transform function
// ---------------------------------------------------------------------------

/**
 * Transform Twitter's raw GraphQL tweet object into the clean XActions
 * tweet format.
 *
 * Handles `__typename`: `'Tweet'`, `'TweetWithVisibilityResults'`,
 * `'TweetTombstone'`.
 *
 * @param {object} rawTweet — A tweet result object from the GraphQL response
 *   (typically `tweet_results.result` or a timeline entry's
 *   `itemContent.tweet_results.result`).
 * @returns {object|null} Normalised tweet object, or `null` for tombstones /
 *   unparseable entries.
 */
export function parseTweetData(rawTweet) {
  if (!rawTweet) return null;

  const typename = rawTweet.__typename;

  // Deleted / withheld tweets
  if (typename === 'TweetTombstone') {
    return {
      id: null,
      text: rawTweet.tombstone?.text?.text || '[Unavailable]',
      tombstone: true,
      platform: 'twitter',
    };
  }

  // TweetWithVisibilityResults wraps the real tweet one level deeper
  let tweet = rawTweet;
  if (typename === 'TweetWithVisibilityResults') {
    tweet = rawTweet.tweet || rawTweet;
  }

  const legacy = tweet.legacy || {};
  const core = tweet.core || {};

  // ---- Author -----------------------------------------------------------
  const authorResult = core.user_results?.result || {};
  const authorLegacy = authorResult.legacy || {};
  const author = {
    id: authorResult.rest_id || null,
    username: authorLegacy.screen_name || '',
    name: authorLegacy.name || '',
    avatar: authorLegacy.profile_image_url_https || null,
    verified: Boolean(
      authorResult.is_blue_verified || authorLegacy.verified,
    ),
  };

  // ---- Metrics ----------------------------------------------------------
  const viewsCount = tweet.views?.count ?? tweet.ext_views?.count ?? null;
  const metrics = {
    likes: legacy.favorite_count ?? 0,
    retweets: legacy.retweet_count ?? 0,
    replies: legacy.reply_count ?? 0,
    quotes: legacy.quote_count ?? 0,
    bookmarks: legacy.bookmark_count ?? 0,
    views: viewsCount != null ? Number(viewsCount) : 0,
  };

  // ---- Media ------------------------------------------------------------
  const rawMedia = legacy.extended_entities?.media || [];
  const media = rawMedia.map((m) => {
    const originalInfo = m.original_info || {};
    return {
      type: m.type || 'photo', // 'photo' | 'video' | 'animated_gif'
      url: m.media_url_https || m.media_url || '',
      width: originalInfo.width ?? m.sizes?.large?.w ?? 0,
      height: originalInfo.height ?? m.sizes?.large?.h ?? 0,
      videoUrl: m.video_info ? pickBestVideoUrl(m.video_info.variants) : null,
    };
  });

  // ---- Quote tweet (recursive) ------------------------------------------
  let quotedTweet = null;
  const quotedResult = tweet.quoted_status_result?.result;
  if (quotedResult) {
    quotedTweet = parseTweetData(quotedResult);
  }

  // ---- Reply context ----------------------------------------------------
  let inReplyTo = null;
  if (legacy.in_reply_to_status_id_str) {
    inReplyTo = {
      tweetId: legacy.in_reply_to_status_id_str,
      userId: legacy.in_reply_to_user_id_str || null,
      username: legacy.in_reply_to_screen_name || null,
    };
  }

  // ---- URLs, hashtags, mentions -----------------------------------------
  const entityUrls = legacy.entities?.urls || [];
  const urls = entityUrls.map((u) => ({
    url: u.url,
    expandedUrl: u.expanded_url,
    displayUrl: u.display_url,
  }));

  const hashtags = (legacy.entities?.hashtags || []).map((h) => h.text);
  const mentions = (legacy.entities?.user_mentions || []).map((m) => ({
    username: m.screen_name,
    id: m.id_str || null,
  }));

  // ---- Retweet detection ------------------------------------------------
  let isRetweet = false;
  let retweetOf = null;
  const retweetedResult = legacy.retweeted_status_result?.result;
  if (retweetedResult) {
    isRetweet = true;
    retweetOf = parseTweetData(retweetedResult);
  }

  // ---- Determine reply flag ---------------------------------------------
  const isReply = Boolean(legacy.in_reply_to_status_id_str);

  return {
    id: tweet.rest_id || legacy.id_str || null,
    text: legacy.full_text || '',
    createdAt: toISODate(legacy.created_at),
    author,
    metrics,
    media,
    quotedTweet,
    inReplyTo,
    urls,
    hashtags,
    mentions,
    isReply,
    isRetweet,
    retweetOf,
    lang: legacy.lang || null,
    source: cleanSource(legacy.source),
    platform: 'twitter',
  };
}

// ---------------------------------------------------------------------------
// parseTimelineInstructions — Parse Twitter's timeline response format
// ---------------------------------------------------------------------------

/**
 * Parse the `instructions` array from a Twitter timeline GraphQL response.
 *
 * Handles entry types:
 * - `TimelineAddEntries` — primary timeline entries and cursors
 * - `TimelineAddToModule` — entries inside conversation modules
 * - `TimelinePinEntry` — pinned tweets
 *
 * @param {object[]} instructions — The `instructions` array.
 * @returns {{ tweets: object[], cursor: string|null }}
 */
export function parseTimelineInstructions(instructions) {
  const tweets = [];
  let cursor = null;

  if (!Array.isArray(instructions)) {
    return { tweets, cursor };
  }

  for (const instruction of instructions) {
    const type = instruction.type;

    // ---- TimelineAddEntries (most common) --------------------------------
    if (type === 'TimelineAddEntries') {
      const entries = instruction.entries || [];
      for (const entry of entries) {
        // Bottom cursor for pagination
        if (entry.entryId?.startsWith('cursor-bottom-')) {
          cursor =
            entry.content?.value ??
            entry.content?.itemContent?.value ??
            null;
          continue;
        }
        // Top cursor — ignore
        if (entry.entryId?.startsWith('cursor-top-')) {
          continue;
        }

        // Single tweet entry
        const tweetResult = extractTweetResult(entry);
        if (tweetResult) {
          const parsed = parseTweetData(tweetResult);
          if (parsed && parsed.id) tweets.push(parsed);
        }

        // Conversation module (appears in UserTweetsAndReplies)
        const moduleItems = entry.content?.items;
        if (Array.isArray(moduleItems)) {
          for (const moduleItem of moduleItems) {
            const modTweetResult =
              moduleItem?.item?.itemContent?.tweet_results?.result;
            if (modTweetResult) {
              const parsed = parseTweetData(modTweetResult);
              if (parsed && parsed.id) tweets.push(parsed);
            }
          }
        }
      }
    }

    // ---- TimelineAddToModule -----------------------------------------------
    if (type === 'TimelineAddToModule') {
      const moduleItems = instruction.moduleItems || [];
      for (const item of moduleItems) {
        const tweetResult = item?.item?.itemContent?.tweet_results?.result;
        if (tweetResult) {
          const parsed = parseTweetData(tweetResult);
          if (parsed && parsed.id) tweets.push(parsed);
        }
      }
    }

    // ---- TimelinePinEntry --------------------------------------------------
    if (type === 'TimelinePinEntry') {
      const tweetResult =
        instruction.entry?.content?.itemContent?.tweet_results?.result;
      if (tweetResult) {
        const parsed = parseTweetData(tweetResult);
        if (parsed && parsed.id) tweets.push(parsed);
      }
    }
  }

  return { tweets, cursor };
}

/**
 * Extract the tweet result object from a standard timeline entry.
 *
 * @param {object} entry
 * @returns {object|null}
 */
function extractTweetResult(entry) {
  // Standard tweet entry: content.itemContent.tweet_results.result
  return (
    entry?.content?.itemContent?.tweet_results?.result ?? null
  );
}

// ---------------------------------------------------------------------------
// scrapeTweets — User tweets timeline
// ---------------------------------------------------------------------------

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
  const { limit = 100, includeReplies = false, cursor = null, onProgress } = options;

  // If includeReplies, delegate to the specialised function
  if (includeReplies) {
    return scrapeTweetsAndReplies(client, username, { limit, cursor, onProgress });
  }

  // Resolve username → userId
  const userId = await resolveUserId(client, username);

  const { queryId, operationName } = GRAPHQL.UserTweets;
  const allTweets = [];
  let nextCursor = cursor;

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

    const instructions =
      resp?.data?.user?.result?.timeline_v2?.timeline?.instructions ?? [];

    const { tweets, cursor: bottomCursor } = parseTimelineInstructions(instructions);

    for (const tweet of tweets) {
      if (allTweets.length >= limit) break;
      allTweets.push(tweet);
    }

    if (onProgress) {
      onProgress({ fetched: allTweets.length, limit });
    }

    // No more pages or no new tweets
    if (!bottomCursor || tweets.length === 0) break;
    nextCursor = bottomCursor;
  }

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
  const { limit = 100, cursor = null, onProgress } = options;

  const userId = await resolveUserId(client, username);

  const { queryId, operationName } = GRAPHQL.UserTweetsAndReplies;
  const allTweets = [];
  let nextCursor = cursor;

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

    const instructions =
      resp?.data?.user?.result?.timeline_v2?.timeline?.instructions ?? [];

    const { tweets, cursor: bottomCursor } = parseTimelineInstructions(instructions);

    for (const tweet of tweets) {
      if (allTweets.length >= limit) break;
      allTweets.push(tweet);
    }

    if (onProgress) {
      onProgress({ fetched: allTweets.length, limit });
    }

    if (!bottomCursor || tweets.length === 0) break;
    nextCursor = bottomCursor;
  }

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
