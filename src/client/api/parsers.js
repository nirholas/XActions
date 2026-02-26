/**
 * XActions Client — Response Parsers
 * Robust parsing for Twitter's deeply nested GraphQL responses.
 * Every parser is defensive — returns null/empty on unexpected data.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { Tweet } from '../models/Tweet.js';
import { Profile } from '../models/Profile.js';

/**
 * Safely navigate a nested object using a dot-separated path.
 * @param {Object} obj
 * @param {string} path
 * @returns {*}
 */
export function navigateResponse(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Extract timeline entries and pagination cursor from a GraphQL response.
 * @param {Object} response
 * @param {string} path - Dot-path to the timeline object
 * @returns {{ entries: Array, cursor: string|null }}
 */
export function parseTimelineEntries(response, path) {
  const timeline = navigateResponse(response, path);
  if (!timeline) return { entries: [], cursor: null };

  const instructions = timeline.instructions || [];
  let entries = [];
  for (const instruction of instructions) {
    if (instruction.type === 'TimelineAddEntries' || instruction.type === 'TimelineAddToModule') {
      entries = entries.concat(instruction.entries || []);
    }
  }
  const cursor = extractCursor(entries, 'bottom');
  return { entries, cursor };
}

/**
 * Parse a single timeline entry into a Tweet.
 * @param {Object} entry
 * @returns {Tweet|null}
 */
export function parseTweetEntry(entry) {
  if (!entry || !entry.content) return null;
  if (entry.entryId?.startsWith('cursor-') || entry.entryId?.startsWith('sq-cursor')) return null;
  if (entry.content.promotedMetadata || entry.entryId?.startsWith('promoted-')) return null;

  let tweetResult = entry.content.itemContent?.tweet_results?.result
    || entry.content.tweet_results?.result;
  if (!tweetResult) return null;

  if (tweetResult.__typename === 'TweetWithVisibilityResults' && tweetResult.tweet) {
    tweetResult = tweetResult.tweet;
  }
  if (tweetResult.__typename === 'TweetTombstone') return null;

  return Tweet.fromGraphQL(tweetResult);
}

/**
 * Parse a single timeline entry into a Profile.
 * @param {Object} entry
 * @returns {Profile|null}
 */
export function parseUserEntry(entry) {
  if (!entry || !entry.content) return null;
  if (entry.entryId?.startsWith('cursor-')) return null;
  if (entry.content.promotedMetadata) return null;

  const userResult = entry.content.itemContent?.user_results?.result;
  if (!userResult || userResult.__typename === 'UserUnavailable') return null;

  return Profile.fromGraphQL(userResult);
}

/**
 * Parse a conversation module entry into an array of tweets.
 * @param {Object} entry
 * @returns {Tweet[]}
 */
export function parseModuleEntry(entry) {
  if (!entry || !entry.content) return [];
  const items = entry.content.items || [];
  const tweets = [];
  for (const item of items) {
    const tweetResult = item?.item?.itemContent?.tweet_results?.result;
    if (!tweetResult) continue;
    const tweet = Tweet.fromGraphQL(tweetResult);
    if (tweet) tweets.push(tweet);
  }
  return tweets;
}

/**
 * Extract a pagination cursor from timeline entries.
 * @param {Array} entries
 * @param {'bottom'|'top'} [direction='bottom']
 * @returns {string|null}
 */
export function extractCursor(entries, direction = 'bottom') {
  if (!Array.isArray(entries)) return null;
  for (const entry of entries) {
    const entryId = entry.entryId || '';
    if (entryId.startsWith(`cursor-${direction}`)) {
      return entry.content?.value || entry.content?.itemContent?.value || null;
    }
  }
  return null;
}

/**
 * Parse a Twitter media entity into a normalized object.
 * @param {Object} media
 * @returns {{ type: string, url: string, preview: string, width: number, height: number, duration: number, altText: string }|null}
 */
export function parseMediaEntity(media) {
  if (!media) return null;
  const type = media.type || 'photo';
  let url = '';
  const preview = media.media_url_https || media.media_url || '';
  let duration = 0;

  if (type === 'photo') {
    url = preview;
  } else if (type === 'video' || type === 'animated_gif') {
    const variants = media.video_info?.variants || [];
    const best = variants
      .filter((v) => v.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    url = best?.url || '';
    duration = media.video_info?.duration_millis ? media.video_info.duration_millis / 1000 : 0;
  }

  return {
    type, url, preview,
    width: media.original_info?.width || media.sizes?.large?.w || 0,
    height: media.original_info?.height || media.sizes?.large?.h || 0,
    duration,
    altText: media.ext_alt_text || '',
  };
}

/**
 * Parse a Twitter card into poll data.
 * @param {Object} card
 * @returns {{ id: string, options: Array<{label: string, votes: number}>, endDatetime: string, votingStatus: string, totalVotes: number }|null}
 */
export function parsePoll(card) {
  if (!card) return null;
  const bindingValues = card.legacy?.binding_values || card.binding_values;
  if (!bindingValues) return null;

  const vals = {};
  if (Array.isArray(bindingValues)) {
    for (const bv of bindingValues) {
      if (bv.key && bv.value) vals[bv.key] = bv.value.string_value || bv.value.scribe_value?.value || '';
    }
  } else {
    for (const [key, val] of Object.entries(bindingValues)) {
      vals[key] = val?.string_value || val?.scribe_value?.value || '';
    }
  }

  const options = [];
  let totalVotes = 0;
  for (let i = 1; i <= 4; i++) {
    const label = vals[`choice${i}_label`];
    if (!label) break;
    const votes = parseInt(vals[`choice${i}_count`] || '0', 10);
    options.push({ label, votes });
    totalVotes += votes;
  }
  if (options.length === 0) return null;

  return {
    id: vals.card_url || '',
    options,
    endDatetime: vals.end_datetime_utc || '',
    votingStatus: vals.counts_are_final === 'true' ? 'closed' : 'open',
    totalVotes,
  };
}
