/**
 * XActions Client — Response Parsers
 * Robust parsing helpers for Twitter's deeply nested GraphQL responses.
 * All functions are defensive — they return null/empty on unexpected data, never throw.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Tweet } from '../models/Tweet.js';
import { Profile } from '../models/Profile.js';

// ============================================================================
// Navigation
// ============================================================================

/**
 * Safely navigate a nested object using a dot-separated path.
 *
 * @param {Object} obj - Root object
 * @param {string} path - Dot-separated path (e.g., 'data.user.result')
 * @returns {*} The value at the path, or undefined if any segment is missing
 */
export function navigateResponse(obj, path) {
  if (!obj || !path) return undefined;
  const segments = path.split('.');
  let current = obj;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
}

// ============================================================================
// Timeline Parsing
// ============================================================================

/**
 * Extract timeline entries and cursor from a Twitter GraphQL response.
 *
 * @param {Object} response - Full GraphQL response
 * @param {string} path - Dot-path to the timeline object (e.g., 'data.user.result.timeline_v2.timeline')
 * @returns {{ entries: Array, cursor: string|null }}
 */
export function parseTimelineEntries(response, path) {
  const timeline = navigateResponse(response, path);
  if (!timeline) return { entries: [], cursor: null };

  const instructions = timeline.instructions || [];

  // Find the add entries instruction
  let entries = [];
  for (const instruction of instructions) {
    if (
      instruction.type === 'TimelineAddEntries' ||
      instruction.type === 'TimelineAddToModule'
    ) {
      entries = instruction.entries || [];
      break;
    }
  }

  // If no TimelineAddEntries, check for direct entries
  if (entries.length === 0) {
    for (const instruction of instructions) {
      if (instruction.entries) {
        entries = instruction.entries;
        break;
      }
    }
  }

  const cursor = extractCursor(entries, 'bottom');
  return { entries, cursor };
}

// ============================================================================
// Entry Parsers
// ============================================================================

/**
 * Parse a single tweet timeline entry into a Tweet.
 *
 * @param {Object} entry - A timeline entry
 * @returns {Tweet|null} Parsed tweet or null for tombstones, promoted, and empty entries
 */
export function parseTweetEntry(entry) {
  if (!entry) return null;

  const content = entry.content || {};

  // Skip promoted content
  if (content.promotedMetadata || entry.entryId?.startsWith('promoted')) {
    return null;
  }

  // Standard timeline item
  const itemContent = content.itemContent || {};
  let tweetResult = itemContent.tweet_results?.result;

  if (!tweetResult) return null;

  // Unwrap TweetWithVisibilityResults
  if (tweetResult.__typename === 'TweetWithVisibilityResults') {
    tweetResult = tweetResult.tweet;
  }

  // Tombstone (deleted tweet)
  if (!tweetResult || tweetResult.__typename === 'TweetTombstone') {
    return null;
  }

  return Tweet.fromGraphQL(tweetResult);
}

/**
 * Parse a user timeline entry into a Profile.
 *
 * @param {Object} entry - A timeline entry containing user data
 * @returns {Profile|null} Parsed profile or null
 */
export function parseUserEntry(entry) {
  if (!entry) return null;

  const content = entry.content || {};

  // Skip promoted content
  if (content.promotedMetadata) return null;

  const itemContent = content.itemContent || {};
  const userResult = itemContent.user_results?.result;

  if (!userResult || userResult.__typename === 'UserUnavailable') {
    return null;
  }

  return Profile.fromGraphQL(userResult);
}

/**
 * Parse a conversation module entry (multi-tweet reply chain) into an array of Tweets.
 *
 * @param {Object} entry - A timeline module entry
 * @returns {Tweet[]} Array of tweets in the conversation (may be empty)
 */
export function parseModuleEntry(entry) {
  if (!entry) return [];

  const content = entry.content || {};
  const items = content.items || [];
  const tweets = [];

  for (const item of items) {
    const itemContent = item.item?.itemContent || {};
    let tweetResult = itemContent.tweet_results?.result;
    if (!tweetResult) continue;

    // Unwrap visibility wrapper
    if (tweetResult.__typename === 'TweetWithVisibilityResults') {
      tweetResult = tweetResult.tweet;
    }
    if (!tweetResult || tweetResult.__typename === 'TweetTombstone') continue;

    const tweet = Tweet.fromGraphQL(tweetResult);
    if (tweet) tweets.push(tweet);
  }

  return tweets;
}

// ============================================================================
// Cursor Extraction
// ============================================================================

/**
 * Find and return a pagination cursor from a set of timeline entries.
 *
 * @param {Array} entries - Timeline entries array
 * @param {'bottom'|'top'} [direction='bottom'] - 'bottom' for next page, 'top' for refresh
 * @returns {string|null} Cursor value or null if not found
 */
export function extractCursor(entries, direction = 'bottom') {
  if (!Array.isArray(entries)) return null;

  const prefix = `cursor-${direction}`;

  for (const entry of entries) {
    if (entry.entryId && entry.entryId.startsWith(prefix)) {
      return entry.content?.value || entry.content?.itemContent?.value || null;
    }
  }

  // Fallback: look for cursor type in content
  for (const entry of entries) {
    const content = entry.content || {};
    if (
      content.entryType === 'TimelineTimelineCursor' &&
      content.cursorType === (direction === 'bottom' ? 'Bottom' : 'Top')
    ) {
      return content.value || null;
    }
  }

  return null;
}

// ============================================================================
// Media Parsing
// ============================================================================

/**
 * Parse a Twitter media entity into a normalized media object.
 *
 * @param {Object} media - Raw Twitter media entity
 * @returns {{ type: string, url: string, preview: string, width: number, height: number, duration: number, altText: string }}
 */
export function parseMediaEntity(media) {
  if (!media) return null;

  const type = media.type === 'animated_gif' ? 'gif' : media.type || 'photo';
  let url = media.media_url_https || media.media_url || '';
  let duration = 0;

  // For video/gif, pick the highest-quality mp4 variant
  if (type === 'video' || type === 'gif') {
    const variants = media.video_info?.variants || [];
    const best = variants
      .filter((v) => v.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    if (best) url = best.url;
    if (media.video_info?.duration_millis) {
      duration = Math.round(media.video_info.duration_millis / 1000);
    }
  }

  return {
    type,
    url,
    preview: media.media_url_https || media.media_url || '',
    width: media.original_info?.width || media.sizes?.large?.w || 0,
    height: media.original_info?.height || media.sizes?.large?.h || 0,
    duration,
    altText: media.ext_alt_text || '',
  };
}

// ============================================================================
// Poll Parsing
// ============================================================================

/**
 * Parse a Twitter card into poll data.
 *
 * @param {Object} card - Raw Twitter card data (from tweet.card)
 * @returns {{ id: string, options: Array<{label: string, votes: number}>, endDatetime: string, votingStatus: string, totalVotes: number }|null}
 */
export function parsePoll(card) {
  if (!card) return null;

  const binding = card.legacy?.binding_values || card.binding_values;
  if (!binding) return null;

  // Normalize binding values into a flat map
  const vals = {};
  if (Array.isArray(binding)) {
    for (const b of binding) {
      vals[b.key] = b.value?.string_value || b.value?.scribe_value?.value || '';
    }
  } else {
    for (const [k, v] of Object.entries(binding)) {
      vals[k] = v?.string_value || v?.scribe_value?.value || '';
    }
  }

  if (!vals.choice1_label) return null;

  const options = [];
  let totalVotes = 0;
  for (let i = 1; i <= 4; i++) {
    const label = vals[`choice${i}_label`];
    if (!label) break;
    const votes = parseInt(vals[`choice${i}_count`], 10) || 0;
    totalVotes += votes;
    options.push({ label, votes });
  }

  return {
    id: vals.card_url || '',
    options,
    endDatetime: vals.end_datetime_utc || '',
    votingStatus: vals.counts_are_final === 'true' ? 'closed' : 'open',
    totalVotes,
  };
}
