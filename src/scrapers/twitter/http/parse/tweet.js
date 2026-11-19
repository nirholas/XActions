// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Pure parsers for x.com's GraphQL tweet and timeline payloads.
 *
 * Split out of tweets.js so anything can import them, a Cloudflare Worker
 * included: this file reaches for nothing but `errors.js`, while the scrapers
 * they came from pull in the HTTP client, the resumable checkpoint store and
 * the Node filesystem behind it.
 *
 * @module scrapers/twitter/http/parse/tweet
 * @author nich (@nichxbt)
 */

import { NotFoundError } from '../errors.js';

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
  // The embedded user carries the same shape migration as a standalone
  // profile: name/screen_name moved to `core`, the avatar to `avatar`, the
  // verified flag to `verification`. `legacy` is still sent on some
  // authenticated responses, so it stays as the fallback.
  const authorResult = core.user_results?.result || {};
  const authorLegacy = authorResult.legacy || {};
  const authorCore = authorResult.core || {};
  const author = {
    id: authorResult.rest_id || null,
    username: authorCore.screen_name ?? authorLegacy.screen_name ?? '',
    name: authorCore.name ?? authorLegacy.name ?? '',
    avatar: authorResult.avatar?.image_url ?? authorLegacy.profile_image_url_https ?? null,
    verified: Boolean(
      authorResult.is_blue_verified ||
        authorResult.verification?.verified ||
        authorLegacy.verified,
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
    // A post over 280 characters arrives with `legacy.full_text` cut off and
    // its whole body in `note_tweet`.
    text: tweet.note_tweet?.note_tweet_results?.result?.text || legacy.full_text || '',
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
 * Read the instruction list out of a user timeline payload.
 *
 * x.com renamed the container from `timeline_v2` to `timeline`, and a guest
 * response uses the new name while some authenticated responses still send the
 * old one. Reading only `timeline_v2` silently yields zero tweets, so both are
 * accepted here and every user-timeline caller goes through this.
 *
 * @param {object} payload - `response.data` from client.graphql()
 * @returns {object[]} Timeline instructions, empty when the payload has none.
 */
export function userTimelineInstructions(payload) {
  const result = payload?.user?.result;
  return (
    result?.timeline?.timeline?.instructions ??
    result?.timeline_v2?.timeline?.instructions ??
    result?.timeline?.instructions ??
    []
  );
}

/**
 * Parse the `instructions` array from a Twitter timeline GraphQL response.
 *
 * Handles entry types:
 * - `TimelineAddEntries` — primary timeline entries and cursors
 * - `TimelineAddToModule` — entries inside conversation modules
 * - `TimelinePinEntry` — pinned tweets
 * - `TimelineReplaceEntry` — the bottom cursor from page two on (search
 *   timelines deliver it this way rather than inside `TimelineAddEntries`)
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

    // ---- TimelineReplaceEntry ----------------------------------------------
    if (type === 'TimelineReplaceEntry') {
      const replaced = readReplacedBottomCursor(instruction);
      if (replaced) cursor = replaced;
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
 * The bottom cursor a `TimelineReplaceEntry` instruction carries, or null when
 * it replaces anything else (the top cursor, a tweet).
 *
 * @param {object} instruction
 * @returns {string|null}
 */
export function readReplacedBottomCursor(instruction) {
  const entry = instruction?.entry;
  if (!entry) return null;
  const isBottom =
    entry.content?.cursorType === 'Bottom' ||
    entry.entryId?.startsWith('cursor-bottom-') ||
    instruction.entry_id_to_replace?.startsWith('cursor-bottom-');
  if (!isBottom) return null;
  return entry.content?.value ?? entry.content?.itemContent?.value ?? null;
}

/**
 * Extract the tweet result object from a standard timeline entry.
 *
 * @param {object} entry
 * @returns {object|null}
 */
export function extractTweetResult(entry) {
  // Standard tweet entry: content.itemContent.tweet_results.result
  return (
    entry?.content?.itemContent?.tweet_results?.result ?? null
  );
}

// ---------------------------------------------------------------------------
// scrapeTweets — User tweets timeline
// ---------------------------------------------------------------------------
