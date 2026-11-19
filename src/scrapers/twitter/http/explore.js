// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Twitter/X Explore, trends, Spaces, and profile side-timelines via HTTP
 *
 * - Trends by WOEID (`/1.1/trends/place.json`), trend locations
 *   (`/1.1/trends/available.json`), the Explore tabs (`/2/guide.json`), and
 *   the GraphQL `ExplorePage` timeline.
 * - Profile side-timelines: Highlights (`UserHighlightsTweets`), Articles
 *   (`UserArticlesTweets`), verified followers (`BlueVerifiedFollowers`),
 *   and followers you know (`FollowersYouKnow`).
 * - Space details (`AudioSpaceById`).
 *
 * GraphQL query IDs were read from the live x.com bundles on 2026-08-27.
 *
 * Depends on: endpoints.js, paging.js, tweets.js, relationships.js
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { GRAPHQL, REST, REST_BASE } from './endpoints.js';
import { NotFoundError, TwitterApiError } from './errors.js';
import { parseTimelineInstructions } from './tweets.js';
import { parseUserList, parseUserEntry } from './relationships.js';
import { flattenEntries, paginate, requireAuth } from './paging.js';

// ---------------------------------------------------------------------------
// Trend parsing
// ---------------------------------------------------------------------------

/**
 * Parse "12.3K posts" / "1,234 Tweets" style volume text to a number.
 * @param {string|null} text
 * @returns {number|null}
 */
function parseVolumeText(text) {
  if (!text) return null;
  const m = /([\d.,]+)\s*([KkMm])?/.exec(text);
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ''));
  if (Number.isNaN(base)) return null;
  const mult = m[2]?.toLowerCase() === 'k' ? 1e3 : m[2]?.toLowerCase() === 'm' ? 1e6 : 1;
  return Math.round(base * mult);
}

/**
 * Parse a GraphQL / guide.json trend item into the XActions trend format.
 *
 * @param {object} raw A `TimelineTrend` item content or a guide.json `trend`
 * @returns {object|null}
 */
export function parseTrend(raw) {
  if (!raw) return null;
  const name = raw.name ?? raw.trend_name ?? null;
  if (!name) return null;
  const meta = raw.trend_metadata ?? raw.trendMetadata ?? {};
  const url = raw.trend_url?.url ?? raw.url?.url ?? raw.url ?? null;
  const volumeText = meta.meta_description ?? meta.metaDescription ?? null;
  return {
    name,
    url: typeof url === 'string' ? url.replace(/^twitter:\/\/search\/\?query=/, 'https://x.com/search?q=') : null,
    query: raw.query ?? (typeof url === 'string' && url.includes('query=') ? decodeURIComponent(url.split('query=')[1].split('&')[0]) : name),
    volume: raw.tweet_volume ?? parseVolumeText(volumeText),
    volumeText,
    context: meta.domain_context ?? meta.domainContext ?? null,
    rank: raw.rank ?? meta.rank ?? null,
    promoted: Boolean(raw.promoted_content ?? meta.promoted),
    platform: 'twitter',
  };
}

/**
 * Pull every trend out of a GraphQL timeline (`ExplorePage`).
 *
 * @param {object[]} instructions
 * @returns {{ items: object[], cursor: string|null }}
 */
export function parseTrendTimeline(instructions) {
  const { entries, cursor } = flattenEntries(instructions);
  const items = [];
  let rank = 0;
  for (const entry of entries) {
    const ic = entry?.content?.itemContent ?? {};
    const isTrend = ic.itemType === 'TimelineTrend' || ic.__typename === 'TimelineTrend' || ic.trend_metadata || ic.trend_url;
    if (!isTrend) continue;
    const parsed = parseTrend(ic);
    if (parsed) {
      rank++;
      items.push({ ...parsed, rank: parsed.rank ?? rank });
    }
  }
  return { items, cursor };
}

/**
 * Pull every trend out of a `/2/guide.json` response.
 *
 * @param {object} response
 * @returns {object[]}
 */
export function parseGuideTrends(response) {
  const items = [];
  const instructions = response?.timeline?.instructions ?? [];
  for (const instruction of instructions) {
    const entries = instruction.addEntries?.entries ?? [];
    for (const entry of entries) {
      const moduleItems = entry.content?.timelineModule?.items ?? [];
      for (const item of moduleItems) {
        const trend = item?.item?.content?.trend;
        const parsed = parseTrend(trend);
        if (parsed) items.push({ ...parsed, rank: parsed.rank ?? items.length + 1 });
      }
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

/** Explore tab ids accepted by `/2/guide.json` */
const GUIDE_TABS = {
  trending: 'trending',
  'for-you': 'for-you',
  news: 'news',
  sports: 'sports',
  entertainment: 'entertainment',
};

/**
 * Trends for a WOEID via `/1.1/trends/place.json` (1 = worldwide, 23424977 = US).
 *
 * @param {object} client TwitterHttpClient instance
 * @param {number|string} [woeid=1]
 * @returns {Promise<{ location: {name: string, woeid: number}|null, asOf: string|null, trends: object[] }>}
 */
export async function scrapeTrendsByWoeid(client, woeid = 1) {
  const url = `${REST_BASE}${REST.trendsPlace}?id=${encodeURIComponent(String(woeid))}`;
  const response = await client.request(url, { method: 'GET' });
  const block = Array.isArray(response) ? response[0] : response;
  if (!block || !Array.isArray(block.trends)) {
    throw new NotFoundError(`No trends returned for WOEID ${woeid}`, { endpoint: REST.trendsPlace });
  }
  const location = block.locations?.[0] ? { name: block.locations[0].name, woeid: block.locations[0].woeid } : null;
  return {
    location,
    asOf: block.as_of ?? null,
    trends: block.trends.map((t, i) => ({ ...parseTrend(t), rank: i + 1 })),
  };
}

/**
 * Locations that have trends (`/1.1/trends/available.json`).
 *
 * @param {object} client TwitterHttpClient instance
 * @returns {Promise<Array<{name: string, woeid: number, country: string|null, countryCode: string|null, placeType: string|null}>>}
 */
export async function scrapeTrendLocations(client) {
  const response = await client.request(`${REST_BASE}${REST.trendsAvailable}`, { method: 'GET' });
  if (!Array.isArray(response)) return [];
  return response.map((p) => ({
    name: p.name,
    woeid: p.woeid,
    country: p.country || null,
    countryCode: p.countryCode || null,
    placeType: p.placeType?.name ?? null,
    parentId: p.parentid ?? null,
  }));
}

/**
 * Explore tab trends via `/2/guide.json`.
 *
 * @param {object} client TwitterHttpClient instance (authenticated)
 * @param {object} [options]
 * @param {'trending'|'for-you'|'news'|'sports'|'entertainment'} [options.tab='trending']
 * @param {number} [options.limit=30]
 * @returns {Promise<object[]>} Trends in tab order
 */
export async function scrapeTrends(client, options = {}) {
  requireAuth(client, 'guide');
  const tab = GUIDE_TABS[options.tab ?? 'trending'];
  if (!tab) throw new TwitterApiError(`Unknown explore tab: ${options.tab}`);
  const params = new URLSearchParams({
    include_page_configuration: 'true',
    initial_tab_id: tab,
    count: String(options.limit ?? 30),
  });
  const response = await client.request(`${REST_BASE}${REST.guide}?${params}`, { method: 'GET' });
  return parseGuideTrends(response).slice(0, options.limit ?? 30);
}

/**
 * The GraphQL Explore page (`ExplorePage`), which returns the same trend
 * modules the web client renders on /explore.
 *
 * @param {object} client TwitterHttpClient instance (authenticated)
 * @param {object} [options] `{ limit, cursor, onProgress }`
 * @returns {Promise<object[]>} Trends
 */
export async function scrapeExplorePage(client, options = {}) {
  requireAuth(client, 'ExplorePage');
  return paginate(client, GRAPHQL.ExplorePage, {}, parseTrendTimeline, {
    limit: 50,
    ...options,
    keyOf: (t) => t.name,
    path: 'data.explore_page.body.initialTimeline.timeline.timeline.instructions',
  });
}

// ---------------------------------------------------------------------------
// Profile side-timelines
// ---------------------------------------------------------------------------

/**
 * Resolve a username to a rest_id.
 * @param {object} client
 * @param {string} username
 * @returns {Promise<string>}
 */
async function resolveUserId(client, username) {
  const { queryId, operationName } = GRAPHQL.UserByScreenName;
  const response = await client.graphql(queryId, operationName, { screen_name: username, withSafetyModeUserFields: true });
  const result = response?.data?.user?.result;
  if (!result || result.__typename === 'UserUnavailable') {
    throw new NotFoundError(`User @${username} not found or unavailable`, { endpoint: operationName });
  }
  return result.rest_id;
}

/**
 * Accept either a username or a `{ userId }` and return the rest_id.
 * @param {object} client
 * @param {string|{userId: string}} user
 * @returns {Promise<string>}
 */
async function toUserId(client, user) {
  if (user && typeof user === 'object' && user.userId) return String(user.userId);
  if (/^\d{5,}$/.test(String(user))) return String(user);
  return resolveUserId(client, String(user).replace(/^@/, ''));
}

/** Tweet-timeline page parser in the `{ items, cursor }` shape `paginate` expects */
function parseTweetPage(instructions) {
  const { tweets, cursor } = parseTimelineInstructions(instructions);
  return { items: tweets, cursor };
}

/** User-list page parser in the `{ items, cursor }` shape `paginate` expects */
function parseUserPage(instructions) {
  const { users, cursor } = parseUserList(instructions);
  return { items: users, cursor };
}

/**
 * A user's Highlights tab (`UserHighlightsTweets`).
 *
 * @param {object} client TwitterHttpClient instance (authenticated)
 * @param {string|{userId: string}} user Username, numeric id, or `{ userId }`
 * @param {object} [options] `{ limit, cursor, onProgress }`
 * @returns {Promise<object[]>} Parsed tweets
 */
export async function scrapeHighlights(client, user, options = {}) {
  requireAuth(client, 'UserHighlightsTweets');
  const userId = await toUserId(client, user);
  return paginate(
    client,
    GRAPHQL.UserHighlightsTweets,
    { userId, includePromotedContent: true, withVoice: true },
    parseTweetPage,
    { ...options, path: 'data.user.result.timeline.timeline.instructions' },
  );
}

/**
 * A user's Articles tab (`UserArticlesTweets`).
 *
 * Returns the tweets that carry each article, not the article bodies; pass an
 * item's `id` to `scrapeArticle` (./tweets.js) for the full text.
 *
 * @param {object} client TwitterHttpClient instance (authenticated)
 * @param {string|{userId: string}} user Username, numeric id, or `{ userId }`
 * @param {object} [options] `{ limit, cursor, onProgress }`
 * @returns {Promise<object[]>} Parsed article tweets
 */
export async function scrapeArticles(client, user, options = {}) {
  requireAuth(client, 'UserArticlesTweets');
  const userId = await toUserId(client, user);
  return paginate(
    client,
    GRAPHQL.UserArticlesTweets,
    { userId, includePromotedContent: true, withVoice: true },
    parseTweetPage,
    { ...options, path: 'data.user.result.timeline.timeline.instructions' },
  );
}

/**
 * A user's verified followers (`BlueVerifiedFollowers`).
 *
 * @param {object} client TwitterHttpClient instance (authenticated)
 * @param {string|{userId: string}} user
 * @param {object} [options] `{ limit, cursor, onProgress }`
 * @returns {Promise<object[]>} Users
 */
export async function scrapeVerifiedFollowers(client, user, options = {}) {
  requireAuth(client, 'BlueVerifiedFollowers');
  const userId = await toUserId(client, user);
  return paginate(
    client,
    GRAPHQL.BlueVerifiedFollowers,
    { userId, includePromotedContent: false },
    parseUserPage,
    { ...options, keyOf: (u) => u.username, path: 'data.user.result.timeline.timeline.instructions' },
  );
}

/**
 * Followers of a user that the viewer also follows (`FollowersYouKnow`).
 *
 * @param {object} client TwitterHttpClient instance (authenticated)
 * @param {string|{userId: string}} user
 * @param {object} [options] `{ limit, cursor, onProgress }`
 * @returns {Promise<object[]>} Users
 */
export async function scrapeFollowersYouKnow(client, user, options = {}) {
  requireAuth(client, 'FollowersYouKnow');
  const userId = await toUserId(client, user);
  return paginate(
    client,
    GRAPHQL.FollowersYouKnow,
    { userId, includePromotedContent: false },
    parseUserPage,
    { ...options, keyOf: (u) => u.username, path: 'data.user.result.timeline.timeline.instructions' },
  );
}

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

/**
 * Parse a Space participant record.
 * @param {object} p
 * @returns {object}
 */
function parseParticipant(p) {
  const user = parseUserEntry(p?.user_results?.result);
  return {
    id: user?.id ?? p?.user_results?.rest_id ?? null,
    username: user?.username ?? p?.twitter_screen_name ?? null,
    name: user?.name ?? p?.display_name ?? null,
    avatar: user?.avatar ?? p?.avatar_url ?? null,
    verified: user?.verified ?? Boolean(p?.is_verified),
    periscopeUserId: p?.periscope_user_id ?? null,
    platform: 'twitter',
  };
}

/**
 * Parse a raw `data.audioSpace` object into the XActions Space format.
 *
 * @param {object} raw
 * @returns {object|null}
 */
export function parseAudioSpace(raw) {
  const meta = raw?.metadata;
  if (!meta) return null;
  const participants = raw.participants ?? {};
  const toISO = (ms) => (ms ? new Date(Number(ms)).toISOString() : null);
  return {
    id: meta.rest_id ?? null,
    title: meta.title ?? '',
    state: meta.state ?? null,
    mediaKey: meta.media_key ?? null,
    createdAt: toISO(meta.created_at),
    scheduledStart: toISO(meta.scheduled_start),
    startedAt: toISO(meta.started_at),
    endedAt: toISO(meta.ended_at),
    updatedAt: toISO(meta.updated_at),
    liveListeners: meta.total_live_listeners ?? 0,
    replayWatched: meta.total_replay_watched ?? 0,
    participating: meta.total_participating ?? 0,
    replayAvailable: Boolean(meta.is_space_available_for_replay),
    locked: Boolean(meta.is_locked),
    disallowJoin: Boolean(meta.disallow_join),
    conversationControls: meta.conversation_controls ?? null,
    creator: parseUserEntry(meta.creator_results?.result),
    admins: (participants.admins ?? []).map(parseParticipant),
    speakers: (participants.speakers ?? []).map(parseParticipant),
    listeners: (participants.listeners ?? []).map(parseParticipant),
    participantCount: participants.total ?? 0,
    url: meta.rest_id ? `https://x.com/i/spaces/${meta.rest_id}` : null,
    platform: 'twitter',
  };
}

/**
 * Space details by ID (`AudioSpaceById`).
 *
 * @param {object} client TwitterHttpClient instance (authenticated)
 * @param {string} spaceId e.g. `1YqKDqWZrVZKV`
 * @returns {Promise<object>} Parsed Space
 * @throws {NotFoundError} when the Space does not exist
 */
export async function scrapeAudioSpace(client, spaceId) {
  requireAuth(client, 'AudioSpaceById');
  const { queryId, operationName } = GRAPHQL.AudioSpaceById;
  const response = await client.graphql(queryId, operationName, {
    id: String(spaceId),
    isMetatagsQuery: false,
    withReplays: true,
    withListeners: true,
  });
  const parsed = parseAudioSpace(response?.data?.audioSpace);
  if (!parsed || !parsed.id) {
    throw new NotFoundError(`Space ${spaceId} not found`, { endpoint: operationName });
  }
  return parsed;
}
