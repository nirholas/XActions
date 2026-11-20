// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Single-post and thread reads for the edge, with no account and no API key.
 *
 * Two independent rails answer the same question, and both normalise onto the
 * one post shape this module exports:
 *
 *   - `TweetResultByRestId` over a guest token. Richest: every public metric,
 *     including views and bookmarks, plus the full note-tweet body.
 *   - `cdn.syndication.twimg.com/tweet-result`, the endpoint the official embed
 *     widget calls. Fewer metrics, but it survives guest-token rate limits and
 *     needs no activation round trip.
 *
 * GraphQL runs first because of the metrics; syndication catches it when x.com
 * throttles the guest lane, which is exactly when a single rail would go dark.
 *
 * @module src/edge/postReader
 * @author nichxbt
 */

import { guestGraphQL } from './twitterClient.js';
import { NotFoundError, TwitterApiError } from '../scrapers/twitter/http/errors.js';
import { getQualityLabel, syndicationToken } from '../video/edgeExtractor.js';

const POST_URL_RE = /(?:twitter\.com|x\.com)\/(?:\w+|i\/web)\/status\/(\d+)/;
const ID_RE = /^\d{5,25}$/;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

/** How far `getThread` will walk in either direction. */
export const THREAD_MAX_POSTS = 50;

/**
 * Accept anything a caller might have on hand for a post: a numeric ID, a
 * status URL, or a URL with tracking query parameters attached.
 * @param {string} input
 * @returns {string|null} The numeric post ID.
 */
export function normalizePostId(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (ID_RE.test(trimmed)) return trimmed;
  const match = trimmed.match(POST_URL_RE);
  return match ? match[1] : null;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function postUrl(username, id) {
  return `https://x.com/${username || 'i/web'}/status/${id}`;
}

/**
 * @typedef {object} PostAuthor
 * @property {string | null} id
 * @property {string | null} username
 * @property {string | null} name
 * @property {string | null} avatar
 * @property {boolean} verified
 * @property {string | null} verifiedType
 */

/**
 * @typedef {object} PostMedia
 * @property {string} type `photo`, `video` or `gif`.
 * @property {string | null} url The image, or the best mp4 for a video or gif.
 * @property {number} width
 * @property {number} height
 * @property {string | null} altText
 * @property {string | null} [thumbnail] Video and gif only.
 * @property {number | null} [durationMs] Video and gif only.
 * @property {Array<{ url: string, quality: string, width: number, height: number, bitrate: number }>} [variants]
 *   Video and gif only, best first.
 */

/**
 * The normalised post shape both rails return.
 *
 * @typedef {object} Post
 * @property {string} id
 * @property {string} url
 * @property {string | null} createdAt ISO 8601.
 * @property {string | null} lang
 * @property {string} text
 * @property {PostAuthor} author
 * @property {{ likes: number, reposts: number, replies: number, quotes: number, bookmarks: number, views: number }} metrics
 * @property {PostMedia[]} media
 * @property {{ hashtags: string[], symbols: string[], mentions: string[], urls: Array<{ url: string, expanded: string, display: string }> }} entities
 * @property {string | null} conversationId
 * @property {{ id: string, username: string | null } | null} replyTo
 * @property {Post | null} quoted
 * @property {boolean} possiblySensitive
 * @property {'graphql' | 'syndication'} source
 */

/**
 * Media entities arrive in the same shape on both rails, so one reader covers
 * them. Video variants are filtered to real mp4 files and sorted best first,
 * matching what the download endpoints hand out.
 */
function readMedia(entities) {
  const media = [];
  for (const item of entities || []) {
    const type = item.type === 'animated_gif' ? 'gif' : item.type;
    const entry = {
      type,
      url: item.media_url_https || null,
      width: item.original_info?.width || item.sizes?.large?.w || 0,
      height: item.original_info?.height || item.sizes?.large?.h || 0,
      altText: item.ext_alt_text || item.alt_text || null,
    };

    if (type === 'video' || type === 'gif') {
      entry.thumbnail = item.media_url_https || null;
      entry.durationMs = item.video_info?.duration_millis || null;
      entry.variants = (item.video_info?.variants || [])
        .filter((variant) => variant.content_type === 'video/mp4' && variant.url)
        .map((variant) => {
          const dims = variant.url.match(/\/(\d+)x(\d+)\//);
          const width = dims ? Number(dims[1]) : 0;
          const height = dims ? Number(dims[2]) : 0;
          return {
            url: variant.url.split('?')[0],
            quality: getQualityLabel(width, height),
            width,
            height,
            bitrate: variant.bitrate || 0,
          };
        })
        .sort((a, b) => (b.width * b.height || b.bitrate) - (a.width * a.height || a.bitrate));
      entry.url = entry.variants[0]?.url || entry.url;
    }

    media.push(entry);
  }
  return media;
}

function readEntities(entities) {
  return {
    hashtags: (entities?.hashtags || []).map((tag) => tag.text),
    symbols: (entities?.symbols || []).map((symbol) => symbol.text),
    mentions: (entities?.user_mentions || []).map((mention) => mention.screen_name),
    urls: (entities?.urls || []).map((url) => ({
      url: url.url,
      expanded: url.expanded_url,
      display: url.display_url,
    })),
  };
}

/**
 * x.com serves two User shapes: the current typed one, where the handle lives
 * under `core`, and the older `legacy` blob. Read both so a rollout on their
 * side cannot blank out an author.
 */
function readGraphUser(result) {
  const core = result?.core || {};
  const legacy = result?.legacy || {};
  return {
    id: result?.rest_id || legacy.id_str || null,
    username: core.screen_name || legacy.screen_name || null,
    name: core.name || legacy.name || null,
    avatar: (result?.avatar?.image_url || legacy.profile_image_url_https || '').replace('_normal', '') || null,
    verified: Boolean(result?.is_blue_verified || legacy.verified),
    verifiedType: result?.verification?.verified_type || legacy.verified_type || null,
  };
}

function normalizeGraphPost(result) {
  if (!result) throw new NotFoundError('Post not found');
  if (result.__typename === 'TweetTombstone') {
    throw new NotFoundError('This post is unavailable (deleted, private, or age-restricted)');
  }

  const tweet = result.tweet || result;
  const legacy = tweet.legacy || {};
  const author = readGraphUser(tweet.core?.user_results?.result);
  const media = readMedia(legacy.extended_entities?.media || legacy.entities?.media);

  return {
    id: tweet.rest_id || legacy.id_str,
    url: postUrl(author.username, tweet.rest_id || legacy.id_str),
    createdAt: legacy.created_at ? new Date(legacy.created_at).toISOString() : null,
    lang: legacy.lang || null,
    text: tweet.note_tweet?.note_tweet_results?.result?.text || legacy.full_text || '',
    author,
    metrics: {
      likes: toNumber(legacy.favorite_count),
      reposts: toNumber(legacy.retweet_count),
      replies: toNumber(legacy.reply_count),
      quotes: toNumber(legacy.quote_count),
      bookmarks: toNumber(legacy.bookmark_count),
      views: toNumber(tweet.views?.count),
    },
    media,
    entities: readEntities(legacy.entities),
    conversationId: legacy.conversation_id_str || null,
    replyTo: legacy.in_reply_to_status_id_str
      ? { id: legacy.in_reply_to_status_id_str, username: legacy.in_reply_to_screen_name || null }
      : null,
    quoted: tweet.quoted_status_result?.result
      ? normalizeGraphPost(tweet.quoted_status_result.result)
      : null,
    possiblySensitive: Boolean(legacy.possibly_sensitive),
    source: 'graphql',
  };
}

function normalizeSyndicationPost(data) {
  if (!data || data.__typename === 'TweetTombstone') {
    throw new NotFoundError('This post is unavailable (deleted, private, or age-restricted)');
  }

  const user = data.user || {};
  const author = {
    id: user.id_str || null,
    username: user.screen_name || null,
    name: user.name || null,
    avatar: (user.profile_image_url_https || '').replace('_normal', '') || null,
    verified: Boolean(user.is_blue_verified || user.verified),
    verifiedType: user.verified_type || null,
  };

  return {
    id: data.id_str,
    url: postUrl(author.username, data.id_str),
    createdAt: data.created_at ? new Date(data.created_at).toISOString() : null,
    lang: data.lang || null,
    text: data.text || '',
    author,
    metrics: {
      likes: toNumber(data.favorite_count),
      reposts: 0,
      replies: toNumber(data.conversation_count),
      quotes: 0,
      bookmarks: 0,
      views: 0,
    },
    media: readMedia(data.mediaDetails),
    entities: readEntities(data.entities),
    conversationId: data.conversation_id_str || null,
    replyTo: data.in_reply_to_status_id_str
      ? { id: data.in_reply_to_status_id_str, username: data.in_reply_to_screen_name || null }
      : null,
    quoted: data.quoted_tweet ? normalizeSyndicationPost(data.quoted_tweet) : null,
    possiblySensitive: Boolean(data.possibly_sensitive),
    source: 'syndication',
  };
}

/**
 * Read one post through the guest GraphQL rail.
 * @param {string} id
 * @returns {Promise<Post>}
 */
export async function getPostViaGraphQL(id) {
  const data = await guestGraphQL('TweetResultByRestId', {
    tweetId: id,
    withCommunity: false,
    includePromotedContent: false,
    withVoice: false,
  });
  return normalizeGraphPost(data?.tweetResult?.result);
}

/**
 * Read one post through the public syndication rail.
 * @param {string} id
 * @returns {Promise<Post>}
 */
export async function getPostViaSyndication(id) {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${syndicationToken(id)}&lang=en`;
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT, referer: 'https://platform.twitter.com/' },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) throw new NotFoundError('Post not found');
  if (!response.ok) throw new TwitterApiError(`syndication failed (HTTP ${response.status})`, { status: response.status });
  return normalizeSyndicationPost(await response.json());
}

/**
 * Read one public post by ID or URL.
 *
 * @param {string} idOrUrl
 * @returns {Promise<Post>}
 */
export async function getPost(idOrUrl) {
  const id = normalizePostId(idOrUrl);
  if (!id) throw new TwitterApiError('Expected a post ID or an x.com status URL', { status: 400 });

  let firstError;
  try {
    return await getPostViaGraphQL(id);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    firstError = error;
  }

  try {
    return await getPostViaSyndication(id);
  } catch (error) {
    throw error instanceof NotFoundError ? error : (firstError || error);
  }
}

/**
 * Read a post together with the conversation around it.
 *
 * Upward is exact: each post names the one it replied to, so the chain to the
 * root is walked hop by hop and works on a post of any age. Downward is the
 * author's own continuation, stitched from their recent timeline, so a thread
 * that has scrolled off the profile returns its root and focal post without the
 * tail. `truncated` says when that happened rather than pretending otherwise.
 *
 * @param {string} idOrUrl
 * @param {object} [options]
 * @param {number} [options.limit=25] Maximum posts to return.
 * @param {(username: string, options: object) => Promise<{tweets: object[]}>} [options.timelineReader]
 *   Injected for tests; defaults to the guest UserTweets reader.
 * @returns {Promise<{ focal: Post, posts: Post[], author: PostAuthor, truncated: boolean }>}
 */
export async function getThread(idOrUrl, { limit = 25, timelineReader } = {}) {
  const cap = Math.max(1, Math.min(Number(limit) || 25, THREAD_MAX_POSTS));
  const focal = await getPost(idOrUrl);

  const chain = [focal];
  let cursor = focal;
  while (cursor.replyTo?.id && chain.length < cap) {
    const parent = await getPost(cursor.replyTo.id).catch(() => null);
    if (!parent) break;
    chain.unshift(parent);
    cursor = parent;
  }

  let truncated = Boolean(cursor.replyTo?.id);
  const author = focal.author;

  if (author.username && chain.length < cap) {
    const read = timelineReader || (await import('./twitterClient.js')).getTweets;
    const recent = await read(author.username, { limit: 100 }).catch(() => null);
    if (recent?.tweets?.length) {
      const byParent = new Map();
      for (const tweet of recent.tweets) {
        const parentId = tweet.inReplyToStatusId || tweet.in_reply_to_status_id_str;
        if (parentId) byParent.set(String(parentId), tweet);
      }
      let tail = chain[chain.length - 1];
      while (chain.length < cap) {
        const next = byParent.get(String(tail.id));
        if (!next) break;
        const post = await getPost(String(next.id)).catch(() => null);
        if (!post) break;
        chain.push(post);
        tail = post;
      }
      if (byParent.has(String(tail.id))) truncated = true;
    }
  }

  return { focal, posts: chain, author, truncated: truncated || chain.length >= cap };
}
