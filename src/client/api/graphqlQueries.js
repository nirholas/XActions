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
 * @license Apache-2.0
 */

import { GRAPHQL, BEARER_TOKEN as SHARED_BEARER_TOKEN } from '../../scrapers/twitter/http/endpoints.js';
import { getQueryId } from '../../scrapers/twitter/http/queryIds.js';

/**
 * Public bearer token embedded in Twitter's web client JavaScript.
 * Not a secret — used by all Twitter scrapers.
 * @type {string}
 */
export const BEARER_TOKEN = SHARED_BEARER_TOKEN;

/**
 * Look up the query ID for an operation, live.
 *
 * This file used to carry its own copy of every query ID, and the two copies
 * drifted: 11 of the IDs here went stale while the shared map stayed current,
 * so `Scraper.getProfile()` answered every call with
 * `HTTP 404: {"message":"Query not found"}`. Query IDs now have exactly one
 * home, `src/scrapers/twitter/http/endpoints.js`, and on top of that the
 * discovery cache in `src/scrapers/twitter/http/queryIds.js` (IDs read from
 * x.com's live bundles) takes precedence whenever it holds the operation.
 *
 * Read at access time, not module load time, so a refresh that lands after
 * import is picked up by the next request.
 *
 * @param {string} name - operationName, or a key in the shared GRAPHQL map
 * @param {string} [fallback] - ID to use when neither the cache nor the shared map has an entry
 * @returns {string|null}
 */
function queryId(name, fallback = null) {
  return getQueryId(name) ?? GRAPHQL[name]?.queryId ?? fallback;
}

/**
 * Build an endpoint entry whose `queryId` resolves on every read.
 *
 * @param {string} name - operationName (also the GRAPHQL map key)
 * @param {string} fallback - Last-resort query ID
 * @param {object} rest - method, defaultVariables
 * @returns {object}
 */
function graphqlEndpoint(name, fallback, rest) {
  return {
    get queryId() {
      return queryId(name, fallback);
    },
    url(qid) {
      const id = qid ?? queryId(name, fallback);
      return `https://x.com/i/api/graphql/${id}/${name}`;
    },
    operationName: name,
    ...rest,
  };
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
  UserByScreenName: graphqlEndpoint('UserByScreenName', 'xc8f1g7BYqr6VTzTbvNLGg', { method: 'GET', defaultVariables: { withSafetyModeUserFields: true } }),
  UserByRestId: graphqlEndpoint('UserByRestId', 'xvmVfRLmnr1alc5f2dib0Q', { method: 'GET', defaultVariables: { withSafetyModeUserFields: true } }),
  UserTweets: graphqlEndpoint('UserTweets', 'E3opETHurmVJflFsUBVuUQ', { method: 'GET' }),
  UserTweetsAndReplies: graphqlEndpoint('UserTweetsAndReplies', 'Q6aAvPw7azXZbqXzuqTALA', { method: 'GET' }),
  TweetDetail: graphqlEndpoint('TweetDetail', 'BbCrSoXIR7z93lLCVFlQ2Q', { method: 'GET' }),
  SearchTimeline: graphqlEndpoint('SearchTimeline', 'gkjsKepM6gl_HmFWoWKfgg', { method: 'GET' }),
  Followers: graphqlEndpoint('Followers', 'djdTXDIk2qhd4OStqlUFeQ', { method: 'GET' }),
  Following: graphqlEndpoint('Following', 'IWP6Zt14sARO29lJT35bBw', { method: 'GET' }),
  Likes: graphqlEndpoint('Likes', 'eSSNbhECHHBBew2wkHY_Bw', { method: 'GET' }),
  CreateTweet: graphqlEndpoint('CreateTweet', 'a1p9RWpkYKBjWv_I3WzS-A', { method: 'POST' }),
  DeleteTweet: graphqlEndpoint('DeleteTweet', 'nxpZCY2K-I6QoFHAHeojFQ', { method: 'POST' }),
  FavoriteTweet: graphqlEndpoint('FavoriteTweet', 'lI07N6Otwv1PhnEgXILM7A', { method: 'POST' }),
  UnfavoriteTweet: graphqlEndpoint('UnfavoriteTweet', 'ZYKSe-w7KEslx3JhSIk5LA', { method: 'POST' }),
  CreateRetweet: graphqlEndpoint('CreateRetweet', 'mbRO74GrOvSfRcJnlMapnQ', { method: 'POST' }),
  DeleteRetweet: graphqlEndpoint('DeleteRetweet', 'iQtK4dl5hBmXewYZCnMPAA', { method: 'POST' }),
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
  ListLatestTweetsTimeline: graphqlEndpoint('ListLatestTweetsTimeline', '2Vjeyo_L0nizAUhHe3fKyA', { method: 'GET' }),
  ListMembers: graphqlEndpoint('ListMembers', '8rYmkvWQe9jRRZdy_-vkGA', { method: 'GET' }),
  ListByRestId: graphqlEndpoint('ListByRestId', 'lAzEhcd0SKDsk8qSCWgNbg', { method: 'GET' }),
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
