// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Client — GraphQL Query ID Registry
 * Twitter's internal GraphQL endpoints with query IDs from the web client bundle.
 *
 * Query IDs are embedded in Twitter's public JavaScript and used by all scrapers
 * (twikit, twitter-scraper, agent-twitter-client). They change periodically.
 * To find updated IDs, inspect network requests on x.com or search the JS bundle
 * for the operationName string.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import {
  GRAPHQL,
  GRAPHQL_BASE,
  BEARER_TOKEN as SHARED_BEARER_TOKEN,
} from '../../scrapers/twitter/http/endpoints.js';

/**
 * Public bearer token embedded in Twitter's web client JavaScript.
 * Not a secret — used by all Twitter scrapers.
 * @type {string}
 */
export const BEARER_TOKEN = SHARED_BEARER_TOKEN;

/**
 * Look up a query ID in the shared endpoint map.
 *
 * This file used to carry its own copy of every query ID, and the two copies
 * drifted: 11 of the IDs here went stale while the shared map stayed current,
 * so `Scraper.getProfile()` answered every call with
 * `HTTP 404: {"message":"Query not found"}`. Query IDs now have exactly one
 * home — `src/scrapers/twitter/http/endpoints.js` — and this table only adds
 * the client-specific metadata (HTTP method, default variables, REST URLs).
 *
 * @param {string} name - Key in the shared GRAPHQL map
 * @param {string} [fallback] - ID to use when the shared map has no entry
 * @returns {string|null}
 */
function queryId(name, fallback = null) {
  return GRAPHQL[name]?.queryId ?? fallback;
}

/**
 * Default feature flags Twitter expects with GraphQL requests.
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
 * GraphQL endpoint definitions.
 * @type {Object}
 */
export const GRAPHQL_ENDPOINTS = {
  UserByScreenName: {
    queryId: queryId('UserByScreenName', 'xc8f1g7BYqr6VTzTbvNLGg'),
    operationName: 'UserByScreenName',
    method: 'GET',
    defaultVariables: { withSafetyModeUserFields: true },
  },
  UserByRestId: {
    queryId: queryId('UserByRestId', 'tD8zKvQzwY3kdx5yz6YmOw'),
    operationName: 'UserByRestId',
    method: 'GET',
    defaultVariables: { withSafetyModeUserFields: true },
  },
  UserTweets: {
    queryId: queryId('UserTweets', 'E3opETHurmVJflFsUBVuUQ'),
    operationName: 'UserTweets',
    method: 'GET',
  },
  UserTweetsAndReplies: {
    queryId: queryId('UserTweetsAndReplies', 'Q6aAvPw7azXZbqXzuqTALA'),
    operationName: 'UserTweetsAndReplies',
    method: 'GET',
  },
  TweetDetail: {
    queryId: queryId('TweetDetail', 'BbCrSoXIR7z93lLCVFlQ2Q'),
    operationName: 'TweetDetail',
    method: 'GET',
  },
  SearchTimeline: {
    queryId: queryId('SearchTimeline', 'gkjsKepM6gl_HmFWoWKfgg'),
    operationName: 'SearchTimeline',
    method: 'GET',
  },
  Followers: {
    queryId: queryId('Followers', 'djdTXDIk2qhd4OStqlUFeQ'),
    operationName: 'Followers',
    method: 'GET',
  },
  Following: {
    queryId: queryId('Following', 'IWP6Zt14sARO29lJT35bBw'),
    operationName: 'Following',
    method: 'GET',
  },
  Likes: {
    queryId: queryId('Likes', 'eSSNbhECHHBBew2wkHY_Bw'),
    operationName: 'Likes',
    method: 'GET',
  },
  CreateTweet: {
    queryId: queryId('CreateTweet', 'a1p9RWpkYKBjWv_I3WzS-A'),
    operationName: 'CreateTweet',
    method: 'POST',
  },
  DeleteTweet: {
    queryId: queryId('DeleteTweet', 'VaenaVgh5q5ih7kvyVjgtg'),
    operationName: 'DeleteTweet',
    method: 'POST',
  },
  FavoriteTweet: {
    queryId: queryId('FavoriteTweet', 'lI07N6Otwv1PhnEgXILM7A'),
    operationName: 'FavoriteTweet',
    method: 'POST',
  },
  UnfavoriteTweet: {
    queryId: queryId('UnfavoriteTweet', 'ZYKSe-w7KEslx3JhSIk5LA'),
    operationName: 'UnfavoriteTweet',
    method: 'POST',
  },
  CreateRetweet: {
    queryId: queryId('CreateRetweet', 'ojPdsZsimiJrUGLR1sjUtA'),
    operationName: 'CreateRetweet',
    method: 'POST',
  },
  DeleteRetweet: {
    queryId: queryId('DeleteRetweet', 'iQtK4dl5hBmXewYZCnMPAA'),
    operationName: 'DeleteRetweet',
    method: 'POST',
  },
  CreateFollow: {
    queryId: null,
    operationName: null,
    method: 'POST',
    url: () => 'https://x.com/i/api/1.1/friendships/create.json',
    isRest: true,
  },
  DestroyFollow: {
    queryId: null,
    operationName: null,
    method: 'POST',
    url: () => 'https://x.com/i/api/1.1/friendships/destroy.json',
    isRest: true,
  },
  SendDm: {
    queryId: null,
    operationName: null,
    method: 'POST',
    url: () => 'https://x.com/i/api/1.1/dm/new2.json',
    isRest: true,
  },
  DmInbox: {
    queryId: null,
    operationName: null,
    method: 'GET',
    url: () => 'https://x.com/i/api/1.1/dm/inbox_initial_state.json',
    isRest: true,
  },
  ListLatestTweetsTimeline: {
    queryId: queryId('ListLatestTweetsTimeline', '2Vjeyo_L0nizAUhHe3fKyA'),
    operationName: 'ListLatestTweetsTimeline',
    method: 'GET',
  },
  ListMembers: {
    queryId: queryId('ListMembers', 'BQp2IEYkgxuSxqbTAr1e1g'),
    operationName: 'ListMembers',
    method: 'GET',
  },
  ListByRestId: {
    queryId: queryId('ListByRestId', 'lAzEhcd0SKDsk8qSCWgNbg'),
    operationName: 'ListByRestId',
    method: 'GET',
  },
  Trends: {
    queryId: null,
    operationName: null,
    method: 'GET',
    url: () => 'https://x.com/i/api/2/guide.json',
    isRest: true,
  },
};

/**
 * Build a full GraphQL URL with encoded variables and features query params.
 *
 * @param {Object} endpoint - Entry from GRAPHQL_ENDPOINTS
 * @param {Object} [variables={}] - GraphQL variables
 * @param {Object} [features] - Feature flags (defaults to DEFAULT_FEATURES)
 * @returns {string} Full URL with query parameters
 */
export function buildGraphQLUrl(endpoint, variables = {}, features) {
  if (endpoint.isRest && endpoint.url) {
    return endpoint.url();
  }

  const { queryId, operationName } = endpoint;
  const base = `https://x.com/i/api/graphql/${queryId}/${operationName}`;

  const mergedVars = { ...endpoint.defaultVariables, ...variables };
  const mergedFeatures = features || DEFAULT_FEATURES;

  const params = new URLSearchParams();
  params.set('variables', JSON.stringify(mergedVars));
  params.set('features', JSON.stringify(mergedFeatures));

  return `${base}?${params.toString()}`;
}

/**
 * Execute a GraphQL query/mutation through the HTTP client.
 *
 * X now rejects GET on several GraphQL endpoints (SearchTimeline, Followers)
 * with HTTP 404 and requires POST with body `{ variables, features, queryId }`.
 * Every queryId works over POST, so all GraphQL endpoints POST. REST GET
 * endpoints (Trends, DM inbox) keep GET via their url() factory.
 *
 * @param {Object} http - HTTP client with get/post methods
 * @param {Object} endpoint - Entry from GRAPHQL_ENDPOINTS
 * @param {Object} [variables={}] - GraphQL variables
 * @param {Object} [features] - Feature flags (defaults to DEFAULT_FEATURES)
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function graphqlRequest(http, endpoint, variables = {}, features) {
  if (endpoint.isRest) {
    if (endpoint.method === 'GET') return http.get(endpoint.url());
    throw new Error(
      `graphqlRequest: REST ${endpoint.method} endpoint (${endpoint.url()}) must call http directly`,
    );
  }

  const mergedVars = { ...endpoint.defaultVariables, ...variables };
  const url = `${GRAPHQL_BASE}/${endpoint.queryId}/${endpoint.operationName}`;
  return http.post(url, {
    variables: mergedVars,
    features: features || DEFAULT_FEATURES,
    queryId: endpoint.queryId,
  });
}
