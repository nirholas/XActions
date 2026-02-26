/**
 * XActions Client — GraphQL Query ID Registry
 *
 * Twitter's internal GraphQL endpoints use query IDs embedded in their
 * JavaScript bundles. These IDs change periodically but are public.
 *
 * To find updated query IDs:
 *   1. Open x.com in a browser with DevTools → Network tab
 *   2. Filter by "graphql"
 *   3. Perform the action (view profile, search, etc.)
 *   4. Copy the queryId from: /i/api/graphql/{queryId}/{operationName}
 *
 * Last verified: January 2026
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

/** Twitter's public bearer token — embedded in their web app JS bundle. */
export const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

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
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  hidden_profile_subscriptions_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: true,
  subscriptions_feature_can_gift_premium: true,
};

export const DEFAULT_FIELD_TOGGLES = { withArticlePlainText: false };

export const GRAPHQL_ENDPOINTS = {
  UserByScreenName: {
    queryId: 'xc8f1g7BYqr6VTzTbvNLGg',
    operationName: 'UserByScreenName',
    method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/UserByScreenName`,
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
    queryId: 'tD8zKvQzwY3kdx5yz6YmOw', operationName: 'UserByRestId', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/UserByRestId`,
    defaultVariables: { withSafetyModeUserFields: true },
  },
  UserTweets: {
    queryId: 'E3opETHurmVJflFsUBVuUQ', operationName: 'UserTweets', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/UserTweets`,
  },
  UserTweetsAndReplies: {
    queryId: 'bt4TKuFz4T7Ckk-VvQVSow', operationName: 'UserTweetsAndReplies', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/UserTweetsAndReplies`,
  },
  TweetDetail: {
    queryId: 'BbCrSoXIR7z93lLCVFlQ2Q', operationName: 'TweetDetail', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/TweetDetail`,
  },
  SearchTimeline: {
    queryId: 'gkjsKepM6gl_HmFWoWKfgg', operationName: 'SearchTimeline', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/SearchTimeline`,
  },
  Followers: {
    queryId: 'djdTXDIk2qhd4OStqlUFeQ', operationName: 'Followers', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/Followers`,
  },
  Following: {
    queryId: 'IWP6Zt14sARO29lJT35bBw', operationName: 'Following', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/Following`,
  },
  Likes: {
    queryId: 'eSSNbhECHHBBew2wkHY_Bw', operationName: 'Likes', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/Likes`,
  },
  CreateTweet: {
    queryId: 'a1p9RWpkYKBjWv_I3WzS-A', operationName: 'CreateTweet', method: 'POST',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/CreateTweet`,
  },
  DeleteTweet: {
    queryId: 'VaenaVgh5q5ih7kvyVjgtg', operationName: 'DeleteTweet', method: 'POST',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/DeleteTweet`,
  },
  FavoriteTweet: {
    queryId: 'lI07N6Otwv1PhnEgXILM7A', operationName: 'FavoriteTweet', method: 'POST',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/FavoriteTweet`,
  },
  UnfavoriteTweet: {
    queryId: 'ZYKSe-w7KEslx3JhSIk5LA', operationName: 'UnfavoriteTweet', method: 'POST',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/UnfavoriteTweet`,
  },
  CreateRetweet: {
    queryId: 'ojPdsZsimiJrUGLR1sjUtA', operationName: 'CreateRetweet', method: 'POST',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/CreateRetweet`,
  },
  DeleteRetweet: {
    queryId: 'iQtK4dl5hBmXewYZCnMPAA', operationName: 'DeleteRetweet', method: 'POST',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/DeleteRetweet`,
  },
  CreateFollow: {
    queryId: null, operationName: null, method: 'POST',
    url: () => 'https://x.com/i/api/1.1/friendships/create.json',
  },
  DestroyFollow: {
    queryId: null, operationName: null, method: 'POST',
    url: () => 'https://x.com/i/api/1.1/friendships/destroy.json',
  },
  SendDm: {
    queryId: null, operationName: null, method: 'POST',
    url: () => 'https://x.com/i/api/1.1/dm/new2.json',
  },
  ListLatestTweetsTimeline: {
    queryId: '2Vjeyo_L0nizAUhHe3fKyA', operationName: 'ListLatestTweetsTimeline', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/ListLatestTweetsTimeline`,
  },
  ListMembers: {
    queryId: 'BQp2IEYkgxuSxqbTAr1e1g', operationName: 'ListMembers', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/ListMembers`,
  },
  ListByRestId: {
    queryId: 'tHANqN2gDG3V6MZBq3VEzQ', operationName: 'ListByRestId', method: 'GET',
    url: (qid) => `https://x.com/i/api/graphql/${qid}/ListByRestId`,
  },
  GenericTimelineById: {
    queryId: null, operationName: 'GenericTimelineById', method: 'GET',
  },
};

/**
 * Build a full GraphQL request URL with encoded query parameters.
 * @param {Object} endpoint
 * @param {Object} [variables={}]
 * @param {Object} [features]
 * @returns {string}
 */
export function buildGraphQLUrl(endpoint, variables = {}, features = null) {
  const urlFn = endpoint.url || ((id) => `https://x.com/i/api/graphql/${id}/${endpoint.operationName}`);
  const baseUrl = urlFn(endpoint.queryId);
  if (endpoint.method === 'POST') return baseUrl;

  const mergedVars = { ...endpoint.defaultVariables, ...variables };
  const mergedFeatures = features || endpoint.defaultFeatures || DEFAULT_FEATURES;
  const params = new URLSearchParams();
  params.set('variables', JSON.stringify(mergedVars));
  params.set('features', JSON.stringify(mergedFeatures));
  params.set('fieldToggles', JSON.stringify(DEFAULT_FIELD_TOGGLES));
  return `${baseUrl}?${params.toString()}`;
}
