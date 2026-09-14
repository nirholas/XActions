// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Twitter/X Internal API Endpoint Map
 *
 * Every internal GraphQL call to x.com is addressed by a persisted query ID
 * (`/i/api/graphql/<queryId>/<operationName>`). X rotates those IDs whenever it
 * ships a new web bundle, and a stale ID answers `404 Query not found`.
 *
 * The query IDs, feature-switch values and field-toggle names below are no
 * longer typed in by hand. They are read out of x.com's own JavaScript bundles
 * and regenerated into `./x-endpoints.generated.js` by
 * `npm run sync:endpoints`; `npm run sync:endpoints:check` fails when the
 * committed table has fallen behind. This file keeps the parts a human decides:
 * which operations XActions tracks under which key, any hand-pinned query ID,
 * the request-variable shapes, and the rate-limit budgets.
 *
 * Resolution order for any operation, unchanged: the runtime discovery cache in
 * `./queryIds.js` first (it was read from the bundle x.com is serving right
 * now), then this table.
 *
 * Sources:
 *   - fa0311/TwitterInternalAPIDocument (MIT) - docs/json/GraphQL.json,
 *     docs/json/v1.1.json, via ./x-endpoints.generated.js
 *   - the-convocation/twitter-scraper (MIT) - src/api-data.ts
 *   - d60/twikit (MIT) - twikit/client/gql.py, twikit/client/v11.py,
 *     twikit/constants.py
 *   - x.com web client network inspection
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { resolveOperation } from './queryIds.js';
import { USER_AGENT_STRINGS } from '../../../client/auth/userAgents.generated.js';
import {
  UPSTREAM,
  OPERATIONS as UPSTREAM_OPERATIONS,
  FEATURE_NAMES,
  FEATURE_VALUES,
  FIELD_TOGGLE_NAMES,
  REST_V11,
} from './x-endpoints.generated.js';

export { UPSTREAM_OPERATIONS, REST_V11 };

/**
 * Provenance of the generated half of this module: which upstream commit the
 * query IDs came from, when it was published, and when we fetched it.
 *
 * `xactions doctor` and the endpoint audit read this rather than a date written
 * into a comment, so "last verified on ..." is a fact with a source.
 *
 * @type {typeof UPSTREAM}
 */
export const ENDPOINT_TABLE_SOURCE = UPSTREAM;

// ---------------------------------------------------------------------------
// Base URLs
// ---------------------------------------------------------------------------

export const GRAPHQL_BASE = 'https://x.com/i/api/graphql';
export const REST_BASE = 'https://x.com/i/api';
export const API_BASE = 'https://api.x.com';

// ---------------------------------------------------------------------------
// Bearer Token (public, embedded in Twitter's web client JS bundle)
// Same token used by the-convocation/twitter-scraper and d60/twikit
// ---------------------------------------------------------------------------

export const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// ---------------------------------------------------------------------------
// GraphQL operations XActions tracks
// ---------------------------------------------------------------------------
// The key is what the rest of the codebase says (`GRAPHQL.Likes`); the value is
// the operation name x.com addresses it by (`Favoriters`). The two differ often
// enough that the mapping has to be written down. Query IDs come from
// `./x-endpoints.generated.js`, so adding a key here is the whole job of
// tracking a new operation.

/**
 * Curated key -> x.com operation name.
 * @type {Readonly<Record<string, string>>}
 */
export const TRACKED_OPERATIONS = Object.freeze({
  // ---- Queries (user profiles) ----
  UserByScreenName: 'UserByScreenName',
  UserByRestId: 'UserByRestId',

  // ---- Queries (user timelines) ----
  UserTweets: 'UserTweets',
  UserTweetsAndReplies: 'UserTweetsAndReplies',
  UserMedia: 'UserMedia',
  UserLikes: 'Likes',

  // ---- Queries (tweets) ----
  TweetDetail: 'TweetDetail',
  TweetResultByRestId: 'TweetResultByRestId',

  // ---- Queries (search) ----
  SearchTimeline: 'SearchTimeline',

  // ---- Queries (relationships) ----
  Followers: 'Followers',
  Following: 'Following',

  // ---- Queries (engagement) ----
  Likes: 'Favoriters',
  Retweeters: 'Retweeters',

  // ---- Queries (lists) ----
  ListMembers: 'ListMembers',
  ListTimeline: 'ListLatestTweetsTimeline',

  // ---- Queries (bookmarks, auth required) ----
  BookmarkTimeline: 'Bookmarks',

  // ---- Queries (timelines) ----
  HomeTimeline: 'HomeTimeline',
  HomeLatestTimeline: 'HomeLatestTimeline',

  // ---- Mutations (tweets) ----
  CreateTweet: 'CreateTweet',
  DeleteTweet: 'DeleteTweet',

  // ---- Mutations (engagement) ----
  FavoriteTweet: 'FavoriteTweet',
  UnfavoriteTweet: 'UnfavoriteTweet',
  CreateRetweet: 'CreateRetweet',
  DeleteRetweet: 'DeleteRetweet',

  // ---- Mutations (bookmarks) ----
  CreateBookmark: 'CreateBookmark',
  DeleteBookmark: 'DeleteBookmark',

  // ---- Queries (communities) ----
  CommunityByRestId: 'CommunityByRestId',
  CommunityTweetsTimeline: 'CommunityTweetsTimeline',
  CommunityMediaTimeline: 'CommunityMediaTimeline',
  GlobalCommunitiesPostSearchTimeline: 'GlobalCommunitiesPostSearchTimeline',
  GlobalCommunitiesLatestPostSearchTimeline: 'GlobalCommunitiesLatestPostSearchTimeline',
  CommunitiesMembershipsTimeline: 'CommunitiesMembershipsTimeline',
  CommunityDiscoveryTimeline: 'CommunityDiscoveryTimeline',

  // ---- Mutations (communities) ----
  JoinCommunity: 'JoinCommunity',
  LeaveCommunity: 'LeaveCommunity',
  RequestToJoinCommunity: 'RequestToJoinCommunity',

  // ---- Queries (notifications, auth required) ----
  NotificationsTimeline: 'NotificationsTimeline',

  // ---- Queries (explore / trends) ----
  ExplorePage: 'ExplorePage',
  TrendHistory: 'TrendHistory',
  TrendRelevantUsers: 'TrendRelevantUsers',

  // ---- Queries (profile side-timelines) ----
  UserHighlightsTweets: 'UserHighlightsTweets',
  UserArticlesTweets: 'UserArticlesTweets',
  BlueVerifiedFollowers: 'BlueVerifiedFollowers',
  FollowersYouKnow: 'FollowersYouKnow',

  // ---- Queries (community notes, called Birdwatch internally) ----
  CommunityNotesTimeline: 'BirdwatchFetchGlobalTimeline',
  CommunityNotesForTweet: 'BirdwatchFetchNotes',
  CommunityNote: 'BirdwatchFetchOneNote',

  // ---- Queries (spaces) ----
  AudioSpaceById: 'AudioSpaceById',
});

/**
 * Hand-pinned query IDs, which win over the generated table.
 *
 * Empty by default, and it should stay that way: the generated table is read
 * from the bundle x.com actually serves. Pin an operation here only to hold it
 * at a known-good ID while a regression is investigated, and write down why.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const QUERY_ID_PINS = Object.freeze({});

/**
 * Tracked operations the generated table does not carry. Populated when x.com
 * retires an operation between syncs; `resolveGraphQL` then fails for that one
 * key with a message naming the fix, instead of the whole module refusing to
 * load. `npm run sync:endpoints:check` exits non-zero when this is non-empty.
 *
 * @type {readonly string[]}
 */
export const MISSING_OPERATIONS = Object.freeze(
  Object.entries(TRACKED_OPERATIONS)
    .filter(([key, name]) => !(name in UPSTREAM_OPERATIONS) && !(key in QUERY_ID_PINS))
    .map(([key]) => key),
);

/**
 * GraphQL Query / Mutation IDs, keyed the way the codebase refers to them.
 *
 * @type {Readonly<Record<string, Readonly<{queryId: string, operationName: string, type: string}>>>}
 */
export const GRAPHQL = Object.freeze(
  Object.fromEntries(
    Object.entries(TRACKED_OPERATIONS)
      .filter(([key]) => !MISSING_OPERATIONS.includes(key))
      .map(([key, operationName]) => {
        const upstream = UPSTREAM_OPERATIONS[operationName];
        return [
          key,
          Object.freeze({
            queryId: QUERY_ID_PINS[key] ?? upstream.queryId,
            operationName,
            type: upstream?.type ?? 'query',
          }),
        ];
      }),
  ),
);

/**
 * Read operations which X currently serves only over POST. Most persisted
 * GraphQL reads still use GET, so this stays an explicit, per-operation map
 * rather than changing every query transport at once.
 *
 * @type {ReadonlySet<string>}
 */
export const POST_QUERY_OPERATIONS = new Set([
  'SearchTimeline',
  'Followers',
]);

/**
 * Return the transport method required by a persisted GraphQL operation.
 *
 * @param {string} operationName
 * @param {boolean} [mutation=false]
 * @returns {'GET'|'POST'}
 */
export function graphqlRequestMethod(operationName, mutation = false) {
  return mutation || POST_QUERY_OPERATIONS.has(operationName) ? 'POST' : 'GET';
}

/**
 * Resolve a GRAPHQL table entry to the query ID currently in use.
 *
 * The table above is the offline fallback. When query-ID discovery
 * (`./queryIds.js`) has a cached ID for the operation, that one wins, because
 * it was read from x.com's live bundle and the table value may have rotated.
 *
 * A key XActions does not track but x.com ships resolves too, straight from the
 * generated table, so reaching one of the other operations in
 * `UPSTREAM_OPERATIONS` does not require editing this file first.
 *
 * @param {keyof typeof GRAPHQL | string} key
 * @returns {{queryId: string, operationName: string, source: 'cache'|'hardcoded'}}
 */
export function resolveGraphQL(key) {
  const entry = GRAPHQL[key] ?? untrackedEntry(key);
  if (!entry) {
    if (MISSING_OPERATIONS.includes(key)) {
      throw new Error(
        `GraphQL operation ${TRACKED_OPERATIONS[key]} (key ${key}) is no longer in x.com's bundles. ` +
          'Run `npm run sync:endpoints`, then either remove the key from TRACKED_OPERATIONS or pin it in QUERY_ID_PINS.',
      );
    }
    throw new Error(`Unknown GraphQL endpoint key: ${key}`);
  }
  const resolved = resolveOperation(entry.operationName);
  return {
    queryId: resolved.queryId || entry.queryId,
    operationName: entry.operationName,
    source: resolved.queryId ? resolved.source : 'hardcoded',
  };
}

/**
 * Build an entry for an operation x.com ships that the curated table does not
 * name.
 *
 * @param {string} operationName
 * @returns {{queryId: string, operationName: string, type: string}|null}
 */
function untrackedEntry(operationName) {
  const upstream = UPSTREAM_OPERATIONS[operationName];
  if (!upstream) return null;
  return { queryId: upstream.queryId, operationName, type: upstream.type };
}

// ---------------------------------------------------------------------------
// REST Endpoints (v1.1 / v2)
// Source: d60/twikit twikit/client/v11.py
// ---------------------------------------------------------------------------

export const REST = {
  // Follow / Unfollow (FollowUser / UnfollowUser)
  friendshipsCreate:  '/1.1/friendships/create.json',
  friendshipsDestroy: '/1.1/friendships/destroy.json',

  // Block / Unblock (BlockUser / UnblockUser)
  blocksCreate:  '/1.1/blocks/create.json',
  blocksDestroy: '/1.1/blocks/destroy.json',

  // Mute / Unmute (MuteUser / UnmuteUser)
  mutesCreate:  '/1.1/mutes/users/create.json',
  mutesDestroy: '/1.1/mutes/users/destroy.json',

  // Pin / Unpin
  pinTweet:   '/1.1/account/pin_tweet.json',
  unpinTweet: '/1.1/account/unpin_tweet.json',

  // Guest token
  guestActivate: '/1.1/guest/activate.json',

  // Account
  verifyCredentials: '/1.1/account/verify_credentials.json',

  // Direct Messages (SendDM)
  dmNew:           '/1.1/dm/new2.json',
  dmDestroy:       '/1.1/direct_messages/events/destroy.json',
  dmInbox:         '/1.1/dm/inbox_initial_state.json',
  dmConversation:  '/1.1/dm/conversation',
  dmMarkRead:      '/1.1/dm/conversation',

  // Notifications
  notificationsAll:      '/2/notifications/all.json',
  notificationsVerified: '/2/notifications/verified.json',
  notificationsMentions: '/2/notifications/mentions.json',

  // Trending / Explore (ExploreTrending)
  guide:           '/2/guide.json',
  trendsAvailable: '/1.1/trends/available.json',
  trendsPlace:     '/1.1/trends/place.json',
};

// ---------------------------------------------------------------------------
// GraphQL feature switches and field toggles
// ---------------------------------------------------------------------------
// x.com's web client declares, per operation, which feature switches it sends
// and what value it sends for each. Both are read out of its bundles into
// ./x-endpoints.generated.js, so the defaults below are what x.com itself is
// sending today rather than a snapshot someone transcribed.

/**
 * Feature switches we send regardless of what upstream declares.
 *
 * All three were sent by every client for years and x.com's bundles no longer
 * declare them anywhere. They are kept because established third-party clients
 * still send them and requests still succeed; dropping them is a live-traffic
 * change nobody has tested. Delete the entry to stop sending one.
 *
 * @type {Readonly<Record<string, boolean>>}
 */
export const FEATURE_PINS = Object.freeze({
  responsive_web_graphql_exclude_directive_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  tweet_awards_web_tipping_enabled: false,
});

/**
 * Field-toggle values.
 *
 * Upstream records which operations accept a toggle but not the value the
 * client sends, because a toggle is passed as a request parameter rather than
 * baked into the bundle. A toggle named by an operation and absent here is sent
 * as `false`, which asks for the smaller response and is the safe default; pin
 * a `true` here when a caller needs the extra payload.
 *
 * @type {Readonly<Record<string, boolean>>}
 */
export const FIELD_TOGGLE_VALUES = Object.freeze({
  withArticleRichContentState: true,
  withArticlePlainText: false,
  withGrokAnalyze: false,
  withDisallowedReplyControls: false,
});

/**
 * The exact feature switches one operation declares, with their values.
 *
 * Sending an operation only the switches it asks for is closer to what the web
 * client does than sending the merged default set, and it is the way to satisfy
 * an operation outside the curated table.
 *
 * @param {string} operationName
 * @returns {Record<string, boolean>} empty when x.com ships no such operation
 */
export function operationFeatures(operationName) {
  const upstream = UPSTREAM_OPERATIONS[operationName];
  if (!upstream) return {};
  const out = {};
  for (const index of upstream.featureIdx) {
    const name = FEATURE_NAMES[index];
    if (name !== undefined) out[name] = FEATURE_VALUES[name];
  }
  return out;
}

/**
 * The exact field toggles one operation declares, with their values.
 *
 * @param {string} operationName
 * @returns {Record<string, boolean>} empty when x.com ships no such operation
 */
export function operationFieldToggles(operationName) {
  const upstream = UPSTREAM_OPERATIONS[operationName];
  if (!upstream) return {};
  const out = {};
  for (const index of upstream.toggleIdx) {
    const name = FIELD_TOGGLE_NAMES[index];
    if (name !== undefined) out[name] = FIELD_TOGGLE_VALUES[name] ?? false;
  }
  return out;
}

/**
 * Tracked operations whose switches are deliberately kept out of the merged
 * default.
 *
 * Most operations share one broad timeline feature family, so merging them
 * costs nothing. A few carry a family of their own that no other request would
 * ever send, and folding those into the default would put, for example, six
 * `responsive_web_birdwatch_*` switches on a plain `UserTweets` call. Reach
 * these through `operationFeatures(name)` instead, which is the narrower and
 * more faithful set anyway.
 *
 * @type {readonly string[]}
 */
export const SPECIALISED_OPERATIONS = Object.freeze(['BirdwatchFetchNotes', 'BirdwatchFetchOneNote']);

/**
 * Merge one map per tracked operation into a single default, sorted so the
 * object is stable across regenerations.
 *
 * @param {(operationName: string) => Record<string, boolean>} per
 * @param {Record<string, boolean>} pins
 * @returns {Record<string, boolean>}
 */
function mergeAcrossTracked(per, pins = {}) {
  const merged = {};
  for (const operationName of Object.values(TRACKED_OPERATIONS)) {
    if (SPECIALISED_OPERATIONS.includes(operationName)) continue;
    Object.assign(merged, per(operationName));
  }
  Object.assign(merged, pins);
  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/**
 * Feature switches sent with a GraphQL request when the caller names none:
 * every switch any tracked operation declares, plus `FEATURE_PINS`.
 *
 * X rejects a request that omits a switch the operation requires
 * ("The following features cannot be null"), so the merged set is the safe
 * default. `operationFeatures()` gives the narrower per-operation set.
 *
 * @type {Record<string, boolean>}
 */
export const DEFAULT_FEATURES = mergeAcrossTracked(operationFeatures, FEATURE_PINS);

/**
 * Field toggles sent with a GraphQL request when the caller names none.
 * @type {Record<string, boolean>}
 */
export const DEFAULT_FIELD_TOGGLES = mergeAcrossTracked(operationFieldToggles);

// ---------------------------------------------------------------------------
// User Feature Flags (for UserByScreenName / UserByRestId queries)
// Source: d60/twikit constants.py USER_FEATURES
// ---------------------------------------------------------------------------

export const USER_FEATURES = {
  hidden_profile_likes_enabled: true,
  hidden_profile_subscriptions_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
};

// ---------------------------------------------------------------------------
// Rate Limit Constants (requests per 15-minute window)
// Conservative estimates based on observed Twitter behavior.
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  // Queries
  UserByScreenName: 95,
  UserByRestId: 95,
  UserTweets: 50,
  UserTweetsAndReplies: 50,
  UserMedia: 50,
  UserLikes: 75,
  TweetDetail: 150,
  TweetResultByRestId: 150,
  SearchTimeline: 50,
  Followers: 50,
  Following: 50,
  Likes: 75,
  Retweeters: 75,
  ListMembers: 75,
  ListTimeline: 50,
  BookmarkTimeline: 75,
  HomeTimeline: 150,
  HomeLatestTimeline: 150,

  // Mutations
  FavoriteTweet: 500,
  UnfavoriteTweet: 500,
  CreateRetweet: 300,
  DeleteRetweet: 300,
  CreateTweet: 300,
  DeleteTweet: 300,
  CreateBookmark: 500,
  DeleteBookmark: 500,

  // REST endpoints
  friendshipsCreate: 400,
  friendshipsDestroy: 400,
  blocksCreate: 200,
  blocksDestroy: 200,
  mutesCreate: 200,
  mutesDestroy: 200,
  pinTweet: 100,
  unpinTweet: 100,
  dmNew: 200,
  notificationsAll: 180,
  guide: 75,

  // Fallback
  DEFAULT: 180,
};

// ---------------------------------------------------------------------------
// User Agent Strings
// ---------------------------------------------------------------------------
// Refreshed by `npm run sync:user-agents` from fa0311/latest-user-agent, so the
// pool tracks the browser versions shipping now instead of whichever ones were
// current when someone last edited this file. A user agent two major versions
// behind is itself a signal worth avoiding.
//
// `src/client/auth/userAgent.js` is the richer surface: it holds one consistent
// profile (user agent plus matching client hints) per session rather than
// rotating per request.

/**
 * Browser User-Agent strings, one per generated profile.
 * @type {string[]}
 */
export const USER_AGENTS = [...USER_AGENT_STRINGS];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a full GraphQL GET URL with encoded query params. Operations returned
 * by graphqlRequestMethod() as POST use the same base path without params.
 *
 * @param {string} queryId
 * @param {string} operationName
 * @param {object} variables
 * @param {object} [features]
 * @param {object} [fieldToggles]
 * @returns {string}
 */
export function buildGraphQLUrl(queryId, operationName, variables, features = DEFAULT_FEATURES, fieldToggles) {
  const params = new URLSearchParams();
  params.set('variables', JSON.stringify(variables));
  params.set('features', JSON.stringify(features));
  if (fieldToggles) {
    params.set('fieldToggles', JSON.stringify(fieldToggles));
  }
  return `${GRAPHQL_BASE}/${queryId}/${operationName}?${params.toString()}`;
}

/**
 * Build the variables object for common GraphQL query types.
 *
 * @param {'UserByScreenName'|'UserByRestId'|'UserTweets'|'UserTweetsAndReplies'|'UserMedia'|'UserLikes'|'TweetDetail'|'TweetResultByRestId'|'SearchTimeline'|'Followers'|'Following'|'Likes'|'Retweeters'|'ListMembers'|'ListTimeline'|'BookmarkTimeline'|'HomeTimeline'|'CreateTweet'|'DeleteTweet'|'FavoriteTweet'|'UnfavoriteTweet'|'CreateRetweet'|'DeleteRetweet'|'CreateBookmark'|'DeleteBookmark'|string} type
 * @param {object} params
 * @returns {object}
 */
export function buildGraphQLVariables(type, params = {}) {
  const count = params.count ?? 20;
  const cursor = params.cursor;

  switch (type) {
    // ---- User profiles ----
    case 'UserByScreenName':
      return {
        screen_name: params.username,
        withSafetyModeUserFields: false,
      };

    case 'UserByRestId':
      return {
        userId: params.userId,
        withSafetyModeUserFields: true,
      };

    // ---- User timelines ----
    case 'UserTweets': {
      const v = {
        userId: params.userId,
        count,
        includePromotedContent: true,
        withQuickPromoteEligibilityTweetFields: true,
        withVoice: true,
        withV2Timeline: true,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    case 'UserTweetsAndReplies': {
      const v = {
        userId: params.userId,
        count,
        includePromotedContent: true,
        withCommunity: true,
        withVoice: true,
        withV2Timeline: true,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    case 'UserMedia': {
      const v = {
        userId: params.userId,
        count,
        includePromotedContent: false,
        withClientEventToken: false,
        withBirdwatchNotes: false,
        withVoice: true,
        withV2Timeline: true,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    case 'UserLikes': {
      const v = {
        userId: params.userId,
        count,
        includePromotedContent: false,
        withClientEventToken: false,
        withBirdwatchNotes: false,
        withVoice: true,
        withV2Timeline: true,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    // ---- Tweets ----
    case 'TweetDetail': {
      const v = {
        focalTweetId: params.tweetId,
        with_rux_injections: false,
        rankingMode: 'Relevance',
        includePromotedContent: true,
        withCommunity: true,
        withQuickPromoteEligibilityTweetFields: true,
        withBirdwatchNotes: true,
        withVoice: true,
        withV2Timeline: true,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    case 'TweetResultByRestId':
      return {
        tweetId: params.tweetId,
        includePromotedContent: true,
        withBirdwatchNotes: true,
        withVoice: true,
        withCommunity: true,
      };

    // ---- Search ----
    case 'SearchTimeline': {
      const v = {
        rawQuery: params.query,
        count,
        querySource: 'typed_query',
        product: params.product ?? 'Top',
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    // ---- Relationships ----
    case 'Followers':
    case 'Following': {
      const v = {
        userId: params.userId,
        count,
        includePromotedContent: false,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    // ---- Engagement queries ----
    case 'Likes':
    case 'Retweeters': {
      const v = {
        tweetId: params.tweetId,
        count,
        includePromotedContent: true,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    // ---- Lists ----
    case 'ListMembers': {
      const v = {
        listId: params.listId,
        count,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    case 'ListTimeline': {
      const v = {
        listId: params.listId,
        count,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    // ---- Bookmarks ----
    case 'BookmarkTimeline': {
      const v = {
        count,
      };
      if (cursor) v.cursor = cursor;
      return v;
    }

    // ---- Home ----
    case 'HomeTimeline':
    case 'HomeLatestTimeline': {
      const v = {
        count,
        includePromotedContent: true,
        latestControlAvailable: true,
        requestContext: 'launch',
        withCommunity: true,
      };
      if (cursor) v.cursor = cursor;
      if (params.seenTweetIds) v.seenTweetIds = params.seenTweetIds;
      return v;
    }

    // ---- Mutations (tweets) ----
    case 'CreateTweet':
      return {
        tweet_text: params.text ?? '',
        dark_request: false,
        media: {
          media_entities: params.mediaEntities ?? [],
          possibly_sensitive: false,
        },
        semantic_annotation_ids: [],
      };

    case 'DeleteTweet':
      return {
        tweet_id: params.tweetId,
        dark_request: false,
      };

    // ---- Mutations (engagement) ----
    case 'FavoriteTweet':
    case 'UnfavoriteTweet':
      return { tweet_id: params.tweetId };

    case 'CreateRetweet':
      return { tweet_id: params.tweetId, dark_request: false };

    case 'DeleteRetweet':
      return { source_tweet_id: params.tweetId, dark_request: false };

    // ---- Mutations (bookmarks) ----
    case 'CreateBookmark':
    case 'DeleteBookmark':
      return { tweet_id: params.tweetId };

    default:
      return params;
  }
}

/**
 * Validate that GraphQL endpoint query IDs are still active.
 * Makes a lightweight OPTIONS/HEAD probe to confirm the endpoint returns
 * a recognizable response (not 404). Requires a valid auth cookie or guest token.
 *
 * @param {object} [options]
 * @param {string[]} [options.endpoints] - Specific endpoint keys to check (default: all queries)
 * @param {typeof globalThis.fetch} [options.fetch] - Custom fetch implementation
 * @returns {Promise<{valid: string[], invalid: string[], errors: Record<string, string>}>}
 */
export async function validateEndpoints(options = {}) {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const endpointKeys = options.endpoints ?? Object.keys(GRAPHQL);
  const results = { valid: [], invalid: [], errors: {} };

  for (const key of endpointKeys) {
    const endpoint = GRAPHQL[key];
    if (!endpoint) {
      results.invalid.push(key);
      results.errors[key] = 'Unknown endpoint key';
      continue;
    }

    const { queryId } = resolveGraphQL(key);
    const url = `${GRAPHQL_BASE}/${queryId}/${endpoint.operationName}`;

    try {
      const method = graphqlRequestMethod(endpoint.operationName);
      const res = await fetchFn(url, {
        method,
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        ...(method === 'POST'
          ? { body: JSON.stringify({ variables: {}, features: DEFAULT_FEATURES, queryId }) }
          : {}),
        signal: AbortSignal.timeout(10000),
      });

      // 200, 400 (missing params), or 403 (auth required) all mean the endpoint exists.
      // Only 404 means the query ID is stale.
      if (res.status === 404) {
        results.invalid.push(key);
        results.errors[key] = `HTTP 404, query ID likely stale`;
      } else {
        results.valid.push(key);
      }
    } catch (err) {
      results.invalid.push(key);
      results.errors[key] = err.message ?? String(err);
    }
  }

  return results;
}
