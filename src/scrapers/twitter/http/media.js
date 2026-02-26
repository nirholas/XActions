/**
 * Twitter/X Media Upload & Scrape via HTTP
 *
 * Implements Twitter's chunked media upload API (INIT → APPEND → FINALIZE → STATUS)
 * for images, videos, and GIFs. Also provides media scraping and download utilities.
 *
 * Depends on: client.js (TwitterHttpClient), auth.js (TwitterAuth), endpoints.js
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { readFile, writeFile, stat } from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { extname, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// GraphQL endpoint constants — will be imported from endpoints.js (Build 01-01)
// once it exists. Defined inline here so this module works standalone.
// Sources: the-convocation/twitter-scraper, d60/twikit (MIT)
// ---------------------------------------------------------------------------

let _endpointsModule;
try { _endpointsModule = await import('./endpoints.js'); } catch { /* not yet created */ }

const GRAPHQL_ENDPOINTS = _endpointsModule?.GRAPHQL_ENDPOINTS ?? {
  UserByScreenName: {
    queryId: 'qW5u-DAen42o5BN1EFcoLA',
    operationName: 'UserByScreenName',
  },
  UserMedia: {
    queryId: 'dexO_2tohK86JDudXXG3Yw',
    operationName: 'UserMedia',
  },
  TweetResultByRestId: {
    queryId: '0hWvDhmW8YQ-S_ib3azIrw',
    operationName: 'TweetResultByRestId',
  },
};

const DEFAULT_FEATURES = _endpointsModule?.DEFAULT_FEATURES ?? {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UPLOAD_BASE = 'https://upload.x.com/i/media/upload.json';
const METADATA_URL = 'https://x.com/i/api/1.1/media/metadata/create.json';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;       // 5 MB
const MAX_GIF_BYTES = 15 * 1024 * 1024;         // 15 MB
const MAX_VIDEO_BYTES = 512 * 1024 * 1024;       // 512 MB

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

const CATEGORY_BY_MIME = {
  'image/jpeg': 'tweet_image',
  'image/png': 'tweet_image',
  'image/webp': 'tweet_image',
  'image/gif': 'tweet_gif',
  'video/mp4': 'tweet_video',
  'video/quicktime': 'tweet_video',
};

const STATUS_POLL_INITIAL_MS = 1000;
const STATUS_POLL_MAX_MS = 15000;

// ---------------------------------------------------------------------------
// MIME detection helpers
// ---------------------------------------------------------------------------

/**
 * Detect MIME type from a file extension string.
 * @param {string} ext — e.g. '.png'
 * @returns {string|null}
 */
export function mimeFromExtension(ext) {
  return MIME_BY_EXT[ext.toLowerCase()] ?? null;
}

/**
 * Detect MIME from the first bytes of a buffer (magic-byte sniffing).
 * @param {Buffer} buf
 * @returns {string|null}
 */
export function mimeFromBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  // MP4: ftyp at offset 4
  if (buf.length >= 8 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return 'video/mp4';
  // MOV: ftyp qt at offset 4 (also matches mp4 ftyp — check moov at 4)
  if (buf.length >= 8 && buf[4] === 0x6d && buf[5] === 0x6f && buf[6] === 0x6f && buf[7] === 0x76) return 'video/quicktime';

  return null;
}

/**
 * Resolve a file path or Buffer into { buffer, mediaType }.
 * @param {string|Buffer} input — path or raw bytes
 * @param {string} [explicitMime] — override MIME if provided
 * @returns {Promise<{ buffer: Buffer, mediaType: string }>}
 */
export async function resolveInput(input, explicitMime) {
  let buffer;
  let mediaType = explicitMime ?? null;

  if (Buffer.isBuffer(input)) {
    buffer = input;
    if (!mediaType) mediaType = mimeFromBuffer(buffer);
  } else if (typeof input === 'string') {
    buffer = await readFile(resolve(input));
    if (!mediaType) {
      mediaType = mimeFromExtension(extname(input)) ?? mimeFromBuffer(buffer);
    }
  } else {
    throw new TypeError('Input must be a file path string or a Buffer');
  }

  if (!mediaType) {
    throw new Error('Could not detect media type — provide mediaType in options');
  }

  return { buffer, mediaType };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function requireAuth(client) {
  if (!client.isAuthenticated()) {
    const AuthError = client.AuthError ?? Error;
    throw new AuthError('Authentication required for media operations');
  }
}

// ---------------------------------------------------------------------------
// Core chunked upload
// ---------------------------------------------------------------------------

/**
 * Execute Twitter's 3-phase chunked upload (INIT → APPEND → FINALIZE).
 * If the finalised media has processing_info (video), polls STATUS until completion.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {Buffer} buffer
 * @param {string} mediaType — MIME e.g. 'image/jpeg'
 * @param {string} mediaCategory — 'tweet_image' | 'tweet_video' | 'tweet_gif'
 * @param {{ onProgress?: (info: { phase: string, percent: number }) => void }} [opts]
 * @returns {Promise<{ mediaId: string, mediaKey: string|null }>}
 */
export async function uploadChunked(client, buffer, mediaType, mediaCategory, opts = {}) {
  const { onProgress } = opts;

  // ---- INIT ----------------------------------------------------------------
  onProgress?.({ phase: 'init', percent: 0 });

  const initResp = await client.rest(UPLOAD_BASE, {
    method: 'POST',
    form: {
      command: 'INIT',
      total_bytes: String(buffer.length),
      media_type: mediaType,
      media_category: mediaCategory,
    },
  });

  const mediaId = initResp.media_id_string;
  if (!mediaId) {
    throw new Error('INIT failed: no media_id_string in response');
  }

  // ---- APPEND (chunked) ----------------------------------------------------
  const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, buffer.length);
    const chunk = buffer.slice(start, end);

    onProgress?.({
      phase: 'append',
      percent: Math.round(((i + 1) / totalChunks) * 100),
    });

    await client.rest(UPLOAD_BASE, {
      method: 'POST',
      multipart: {
        command: 'APPEND',
        media_id: mediaId,
        segment_index: String(i),
        media_data: chunk.toString('base64'),
      },
    });
  }

  // ---- FINALIZE ------------------------------------------------------------
  onProgress?.({ phase: 'finalize', percent: 100 });

  const finalResp = await client.rest(UPLOAD_BASE, {
    method: 'POST',
    form: {
      command: 'FINALIZE',
      media_id: mediaId,
    },
  });

  // ---- STATUS poll (videos/GIFs with processing_info) ----------------------
  if (finalResp.processing_info) {
    await pollProcessingStatus(client, mediaId, onProgress);
  }

  return {
    mediaId,
    mediaKey: finalResp.media_key ?? null,
  };
}

/**
 * Poll the STATUS endpoint until processing succeeds or fails.
 * Uses exponential back-off between polls.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} mediaId
 * @param {Function} [onProgress]
 */
export async function pollProcessingStatus(client, mediaId, onProgress) {
  let waitMs = STATUS_POLL_INITIAL_MS;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await client.rest(UPLOAD_BASE, {
      method: 'GET',
      params: {
        command: 'STATUS',
        media_id: mediaId,
      },
    });

    const info = resp.processing_info;
    if (!info) return; // no processing needed

    const state = info.state; // 'pending' | 'in_progress' | 'succeeded' | 'failed'
    const progressPercent = info.progress_percent ?? 0;

    onProgress?.({ phase: 'processing', percent: progressPercent });

    if (state === 'succeeded') return;
    if (state === 'failed') {
      const errMsg = info.error?.message ?? 'Media processing failed';
      throw new Error(`Media processing failed for ${mediaId}: ${errMsg}`);
    }

    // Twitter tells us how long to wait via check_after_secs
    const checkAfterMs = (info.check_after_secs ?? Math.ceil(waitMs / 1000)) * 1000;
    await sleep(checkAfterMs);

    waitMs = Math.min(waitMs * 2, STATUS_POLL_MAX_MS);
  }
}

// ---------------------------------------------------------------------------
// Public upload functions
// ---------------------------------------------------------------------------

/**
 * Upload any media file (image, video, GIF) to Twitter.
 *
 * @param {import('./client.js').TwitterHttpClient} client — authenticated client
 * @param {string|Buffer} filePath — file path or Buffer
 * @param {{ mediaType?: string, altText?: string, onProgress?: Function }} [options]
 * @returns {Promise<{ mediaId: string, mediaKey: string|null }>}
 */
export async function uploadMedia(client, filePath, options = {}) {
  requireAuth(client);

  const { buffer, mediaType } = await resolveInput(filePath, options.mediaType);
  const category = CATEGORY_BY_MIME[mediaType];
  if (!category) {
    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  const result = await uploadChunked(client, buffer, mediaType, category, {
    onProgress: options.onProgress,
  });

  if (options.altText) {
    await setAltText(client, result.mediaId, options.altText);
  }

  return result;
}

/**
 * Upload an image (JPEG, PNG, GIF, WebP). Max 5 MB.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string|Buffer} imagePathOrBuffer
 * @param {{ altText?: string, mediaType?: string }} [options]
 * @returns {Promise<{ mediaId: string, mediaKey: string|null }>}
 */
export async function uploadImage(client, imagePathOrBuffer, options = {}) {
  requireAuth(client);

  const { buffer, mediaType } = await resolveInput(imagePathOrBuffer, options.mediaType);

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image exceeds 5 MB limit (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`,
    );
  }

  const category = mediaType === 'image/gif' ? 'tweet_gif' : 'tweet_image';
  const result = await uploadChunked(client, buffer, mediaType, category);

  if (options.altText) {
    await setAltText(client, result.mediaId, options.altText);
  }

  return result;
}

/**
 * Upload a video (MP4, MOV). Max 512 MB, chunked in 5 MB segments.
 * Polls processing status until complete.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string|Buffer} videoPathOrBuffer
 * @param {{ onProgress?: (info: { phase: string, percent: number }) => void }} [options]
 * @returns {Promise<{ mediaId: string, mediaKey: string|null }>}
 */
export async function uploadVideo(client, videoPathOrBuffer, options = {}) {
  requireAuth(client);

  const { buffer, mediaType } = await resolveInput(videoPathOrBuffer, options.mediaType);

  if (buffer.length > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video exceeds 512 MB limit (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`,
    );
  }

  return uploadChunked(client, buffer, mediaType, 'tweet_video', {
    onProgress: options.onProgress,
  });
}

/**
 * Upload a GIF. Max 15 MB.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string|Buffer} gifPathOrBuffer
 * @returns {Promise<{ mediaId: string, mediaKey: string|null }>}
 */
export async function uploadGif(client, gifPathOrBuffer) {
  requireAuth(client);

  const { buffer } = await resolveInput(gifPathOrBuffer, 'image/gif');

  if (buffer.length > MAX_GIF_BYTES) {
    throw new Error(
      `GIF exceeds 15 MB limit (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`,
    );
  }

  return uploadChunked(client, buffer, 'image/gif', 'tweet_gif');
}

// ---------------------------------------------------------------------------
// Alt text
// ---------------------------------------------------------------------------

/**
 * Set alt text on an uploaded media item (for accessibility).
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} mediaId
 * @param {string} altText
 */
export async function setAltText(client, mediaId, altText) {
  requireAuth(client);

  await client.rest(METADATA_URL, {
    method: 'POST',
    body: JSON.stringify({
      media_id: mediaId,
      alt_text: { text: altText },
    }),
    headers: { 'content-type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Media scraping (user media tab)
// ---------------------------------------------------------------------------

/**
 * Parse a single media entity from Twitter's extended_entities / media array.
 *
 * @param {object} media — raw media object from Twitter response
 * @param {string} tweetId
 * @returns {object}
 */
export function parseMediaEntity(media, tweetId) {
  const type = media.type; // 'photo' | 'video' | 'animated_gif'

  let url = media.media_url_https ?? media.media_url ?? '';
  if (type === 'photo' && url && !url.includes('?format=')) {
    // Request original-quality image
    url = `${url}?format=jpg&name=orig`;
  }

  let videoUrl = null;
  let bitrate = null;
  if ((type === 'video' || type === 'animated_gif') && media.video_info?.variants) {
    const mp4Variants = media.video_info.variants
      .filter((v) => v.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
    if (mp4Variants.length > 0) {
      videoUrl = mp4Variants[0].url;
      bitrate = mp4Variants[0].bitrate ?? null;
    }
  }

  const originalInfo = media.original_info ?? {};

  return {
    tweetId,
    mediaType: type,
    url: type === 'photo' ? url : (videoUrl ?? url),
    thumbnailUrl: media.media_url_https ?? media.media_url ?? '',
    width: originalInfo.width ?? media.sizes?.large?.w ?? 0,
    height: originalInfo.height ?? media.sizes?.large?.h ?? 0,
    altText: media.ext_alt_text ?? null,
  };
}

/**
 * Scrape a user's media tab (photos and videos).
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} username
 * @param {{ limit?: number, cursor?: string }} [options]
 * @returns {Promise<Array<object>>}
 */
export async function scrapeMedia(client, username, options = {}) {
  const { limit = 100, cursor = null } = options;

  // Resolve username → userId via UserByScreenName
  const userResp = await client.graphql(
    GRAPHQL_ENDPOINTS.UserByScreenName.queryId,
    'UserByScreenName',
    { screen_name: username, withSafetyModeUserFields: true },
    DEFAULT_FEATURES,
  );

  const userResult = userResp?.data?.user?.result;
  if (!userResult || userResult.__typename === 'UserUnavailable') {
    throw new Error(`User @${username} not found or unavailable`);
  }
  const userId = userResult.rest_id;

  // Paginate through UserMedia
  const mediaItems = [];
  let nextCursor = cursor;

  while (mediaItems.length < limit) {
    const variables = {
      userId,
      count: Math.min(20, limit - mediaItems.length),
      includePromotedContent: false,
      withClientEventToken: false,
      withBirdwatchNotes: false,
      withVoice: true,
      withV2Timeline: true,
    };
    if (nextCursor) variables.cursor = nextCursor;

    const resp = await client.graphql(
      GRAPHQL_ENDPOINTS.UserMedia.queryId,
      'UserMedia',
      variables,
      DEFAULT_FEATURES,
    );

    const instructions =
      resp?.data?.user?.result?.timeline_v2?.timeline?.instructions ?? [];

    let foundTweets = false;
    nextCursor = null;

    for (const instruction of instructions) {
      const entries = instruction.entries ?? [];
      for (const entry of entries) {
        // Cursor entries
        if (entry.entryId?.startsWith('cursor-bottom-')) {
          nextCursor = entry.content?.value ?? null;
          continue;
        }

        // Tweet entries — may be nested in modules
        const tweetResults = extractTweetResultsFromEntry(entry);
        for (const tweetResult of tweetResults) {
          const legacy = tweetResult?.legacy;
          if (!legacy) continue;

          const tweetId = tweetResult.rest_id ?? legacy.id_str;
          const mediaArray =
            legacy.extended_entities?.media ?? legacy.entities?.media ?? [];

          for (const m of mediaArray) {
            if (mediaItems.length >= limit) break;
            mediaItems.push(parseMediaEntity(m, tweetId));
            foundTweets = true;
          }
        }
      }
    }

    if (!nextCursor || !foundTweets) break;
  }

  return mediaItems;
}

/**
 * Extract tweet result objects from a timeline entry (handles module wrapping).
 * @param {object} entry
 * @returns {object[]}
 */
function extractTweetResultsFromEntry(entry) {
  const results = [];

  // Direct tweet entry
  const itemContent = entry.content?.itemContent ?? entry.content;
  if (itemContent?.tweet_results?.result) {
    const r = itemContent.tweet_results.result;
    // Handle TweetWithVisibilityResults wrapper
    results.push(r.__typename === 'TweetWithVisibilityResults' ? r.tweet : r);
  }

  // Module entries (media tab uses TimelineModule)
  const moduleItems = entry.content?.items ?? [];
  for (const item of moduleItems) {
    const inner = item.item?.itemContent?.tweet_results?.result;
    if (inner) {
      results.push(inner.__typename === 'TweetWithVisibilityResults' ? inner.tweet : inner);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Download a media file from a URL to a local path.
 * Streams data to avoid memory issues with large videos.
 *
 * @param {string} url
 * @param {string} destPath
 * @param {{ onProgress?: (info: { downloaded: number, total: number|null }) => void }} [options]
 * @returns {Promise<{ bytes: number, path: string }>}
 */
export async function downloadMedia(url, destPath, options = {}) {
  const { onProgress } = options;
  const resolvedPath = resolve(destPath);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Download failed: HTTP ${resp.status} for ${url}`);
  }

  const contentLength = resp.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : null;
  let downloaded = 0;

  const fileStream = createWriteStream(resolvedPath);

  // Node 18+ — resp.body is a ReadableStream; convert to Node stream
  const reader = resp.body.getReader();
  const nodeStream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      downloaded += value.byteLength;
      onProgress?.({ downloaded, total });
      controller.enqueue(value);
    },
  });

  // Use Writable wrapper for pipeline compatibility
  const { Readable } = await import('node:stream');
  const readable = Readable.fromWeb(nodeStream);

  await pipeline(readable, fileStream);

  return { bytes: downloaded, path: resolvedPath };
}

// ---------------------------------------------------------------------------
// Video URL extraction
// ---------------------------------------------------------------------------

/**
 * Extract the highest-quality video URL from a tweet.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId
 * @returns {Promise<{ url: string, bitrate: number, contentType: string, width: number, height: number }|null>}
 */
export async function getVideoUrl(client, tweetId) {
  const resp = await client.graphql(
    GRAPHQL_ENDPOINTS.TweetResultByRestId.queryId,
    'TweetResultByRestId',
    {
      tweetId,
      withCommunity: false,
      includePromotedContent: false,
      withVoice: false,
    },
    DEFAULT_FEATURES,
  );

  const tweetResult = resp?.data?.tweetResult?.result;
  if (!tweetResult) return null;

  const tweet =
    tweetResult.__typename === 'TweetWithVisibilityResults'
      ? tweetResult.tweet
      : tweetResult;

  const legacy = tweet?.legacy;
  if (!legacy) return null;

  const mediaArray = legacy.extended_entities?.media ?? legacy.entities?.media ?? [];
  const videos = mediaArray.filter(
    (m) => m.type === 'video' || m.type === 'animated_gif',
  );

  if (videos.length === 0) return null;

  const video = videos[0];
  const variants = (video.video_info?.variants ?? [])
    .filter((v) => v.content_type === 'video/mp4')
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

  if (variants.length === 0) return null;

  const best = variants[0];
  const aspectRatio = video.video_info?.aspect_ratio ?? [16, 9];
  const originalInfo = video.original_info ?? {};

  return {
    url: best.url,
    bitrate: best.bitrate ?? 0,
    contentType: best.content_type,
    width: originalInfo.width ?? aspectRatio[0],
    height: originalInfo.height ?? aspectRatio[1],
  };
}
