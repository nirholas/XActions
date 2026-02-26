/**
 * XActions Client — GraphQL Query ID Registry
 *
 * Twitter's internal GraphQL endpoints use query IDs embedded in their JavaScript
 * bundles. These IDs change periodically but are publicly observable.
 *
 * HOW TO UPDATE QUERY IDS:
 *   1. Open https://x.com in a browser
 *   2. Open DevTools → Network tab
 *   3. Perform the action (e.g., view a profile, search)
 *   4. Look for requests to /i/api/graphql/
 *   5. The query ID is the path segment after /graphql/
 *   Example: /i/api/graphql/xc8f1g7BYqr6VTzTbvNLGg/UserByScreenName
 *
 * All query IDs below are sourced from Twitter's JS bundles as of January 2026.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Public Bearer Token
// ============================================================================

/**
 * Twitter's public bearer token — used for all API requests (guest or authenticated).
 * This is NOT a secret; it's baked into the Twitter web client's JavaScript.
 * @type {string}
 */
export const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// ============================================================================
// Default Feature Flags
// ============================================================================

/**
 * Feature flags that Twitter expects in GraphQL requests.
 * These enable/disable experimental features in the response.
 * @type {Object}
 */
export const DEFAULT_FEATURES = {
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
  hidden_profile_subscriptions_enabled: true,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: true,
  subscriptions_feature_can_gift_premium: true,
};

/**
 * Default field toggles sent alongside features.
 * @type {Object}
 */
export const DEFAULT_FIELD_TOGGLES = {
  withArticlePlainText: false,
};

// ============================================================================
// GraphQL Endpoint Registry
// ============================================================================

/**
 * @typedef {Object} GraphQLEndpoint
 * @property {string|null} queryId - GraphQL query hash
 * @property {string|null} operationName - GraphQL operation name
 * @property {'GET'|'POST'} method - HTTP method
 * @property {Function} [url] - Custom URL builder (overrides default GraphQL URL pattern)
 * @property {Object} [defaultVariables] - Default variables merged into every request
 * @property {Object} [defaultFeatures] - Feature overrides for this specific endpoint
 */

/** @type {Record<string, GraphQLEndpoint>} */
export const GRAPHQL_ENDPOINTS = {
  // ── User endpoints ──────────────────────────────────────────────────────
  UserByScreenName: {
    queryId: 'xc8f1g7BYqr6VTzTbvNLGg',
    operationName: 'UserByScreenName',
    method: 'GET',
    defaultVariables: { withSafetyModeUserFields: true },
    defaultFeatures: {
      hidden_profile_subscriptions_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      subscriptions_verification_info_is_identity_verified_enabled: true,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
    },
  },
  UserByRestId: {
    queryId: 'tD8zKvQzwY3kdx5yz6YmOw',
    operationName: 'UserByRestId',
    method: 'GET',
    defaultVariables: { withSafetyModeUserFields: true },
  },

  // ── Tweet endpoints ─────────────────────────────────────────────────────
  UserTweets: {
    queryId: 'E3opETHurmVJflFsUBVuUQ',
    operationName: 'UserTweets',
    method: 'GET',
  },
  UserTweetsAndReplies: {
    queryId: 'zQxfEr5IFxQ2QZ-XMJlKew',
    operationName: 'UserTweetsAndReplies',
    method: 'GET',
  },
  TweetDetail: {
    queryId: 'BbCrSoXIR7z93lLCVFlQ2Q',
    operationName: 'TweetDetail',
    method: 'GET',
  },

  // ── Search ──────────────────────────────────────────────────────────────
  SearchTimeline: {
    queryId: 'gkjsKepM6gl_HmFWoWKfgg',
    operationName: 'SearchTimeline',
    method: 'GET',
  },

  // ── Social graph ────────────────────────────────────────────────────────
  Followers: {
    queryId: 'djdTXDIk2qhd4OStqlUFeQ',
    operationName: 'Followers',
    method: 'GET',
  },
  Following: {
    queryId: 'IWP6Zt14sARO29lJT35bBw',
    operationName: 'Following',
    method: 'GET',
  },

  // ── Engagement ──────────────────────────────────────────────────────────
  Likes: {
    queryId: 'eSSNbhECHHBBew2wkHY_Bw',
    operationName: 'Likes',
    method: 'GET',
  },
  CreateTweet: {
    queryId: 'a1p9RWpkYKBjWv_I3WzS-A',
    operationName: 'CreateTweet',
    method: 'POST',
  },
  DeleteTweet: {
    queryId: 'VaenaVgh5q5ih7kvyVjgtg',
    operationName: 'DeleteTweet',
    method: 'POST',
  },
  FavoriteTweet: {
    queryId: 'lI07N6Otwv1PhnEgXILM7A',
    operationName: 'FavoriteTweet',
    method: 'POST',
  },
  UnfavoriteTweet: {
    queryId: 'ZYKSe-w7KEslx3JhSIk5LA',
    operationName: 'UnfavoriteTweet',
    method: 'POST',
  },
  CreateRetweet: {
    queryId: 'ojPdsZsimiJrUGLR1sjUtA',
    operationName: 'CreateRetweet',
    method: 'POST',
  },
  DeleteRetweet: {
    queryId: 'iQtK4dl5hBmXewYZCnMPAA',
    operationName: 'DeleteRetweet',
    method: 'POST',
  },

  // ── Follow / Unfollow (REST v1.1) ──────────────────────────────────────
  CreateFollow: {
    queryId: null,
    operationName: null,
    method: 'POST',
    url: () => 'https://x.com/i/api/1.1/friendships/create.json',
  },
  DestroyFollow: {
    queryId: null,
    operationName: null,
    method: 'POST',
    url: () => 'https://x.com/i/api/1.1/friendships/destroy.json',
  },

  // ── DMs (REST v1.1) ────────────────────────────────────────────────────
  SendDm: {
    queryId: null,
    operationName: null,
    method: 'POST',
    url: () => 'https://x.com/i/api/1.1/dm/new2.json',
  },

  // ── Lists ───────────────────────────────────────────────────────────────
  ListLatestTweetsTimeline: {
    queryId: '2Vjeyo_L0nizAUhHe3fKyA',
    operationName: 'ListLatestTweetsTimeline',
    method: 'GET',
  },
  ListMembers: {
    queryId: 'BQp2IEYkgxuSxqbTAr1e1g',
    operationName: 'ListMembers',
    method: 'GET',
  },
  ListByRestId: {
    queryId: 'DXKBuZPBnbJYJJMHLZQZ5Q',
    operationName: 'ListByRestId',
    method: 'GET',
  },

  // ── Generic / Misc ─────────────────────────────────────────────────────
  GenericTimelineById: {
    queryId: null,
    operationName: 'GenericTimelineById',
    method: 'GET',
  },
};

// ============================================================================
// URL Builder
// ============================================================================

/**
 * Build a full GraphQL URL with encoded query parameters.
 *
 * @param {GraphQLEndpoint} endpoint - Endpoint configuration from GRAPHQL_ENDPOINTS
 * @param {Object} [variables={}] - GraphQL variables
 * @param {Object} [features] - Feature flags (defaults to DEFAULT_FEATURES)
 * @param {Object} [fieldToggles] - Field toggles (defaults to DEFAULT_FIELD_TOGGLES)
 * @returns {string} Complete URL with query parameters
 */
export function buildGraphQLUrl(endpoint, variables = {}, features, fieldToggles) {
  // Use custom URL builder if available
  if (endpoint.url) {
    const baseUrl = endpoint.url(endpoint.queryId);
    if (endpoint.method === 'POST') return baseUrl;

    const params = new URLSearchParams();
    const mergedVars = { ...endpoint.defaultVariables, ...variables };
    params.set('variables', JSON.stringify(mergedVars));
    params.set('features', JSON.stringify(features || endpoint.defaultFeatures || DEFAULT_FEATURES));
    if (fieldToggles || DEFAULT_FIELD_TOGGLES) {
      params.set('fieldToggles', JSON.stringify(fieldToggles || DEFAULT_FIELD_TOGGLES));
    }
    return `${baseUrl}?${params.toString()}`;
  }

  // Standard GraphQL URL pattern
  const baseUrl = `https://x.com/i/api/graphql/${endpoint.queryId}/${endpoint.operationName}`;
  if (endpoint.method === 'POST') return baseUrl;

  const params = new URLSearchParams();
  const mergedVars = { ...endpoint.defaultVariables, ...variables };
  params.set('variables', JSON.stringify(mergedVars));
  params.set('features', JSON.stringify(features || endpoint.defaultFeatures || DEFAULT_FEATURES));
  params.set('fieldToggles', JSON.stringify(fieldToggles || DEFAULT_FIELD_TOGGLES));
  return `${baseUrl}?${params.toString()}`;
}
