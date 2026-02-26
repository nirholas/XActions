/**
 * XActions Client — GraphQL Query ID Registry
 *
 * Twitter's internal GraphQL endpoints use query IDs embedded in their
 * JavaScript bundles. These IDs change periodically but are public.
 *
 * To find updated query IDs:
 *   1. Open x.com in a browser
 *   2. Open DevTools → Network tab
 *   3. Filter by "graphql"
 *   4. Perform the action (view profile, search, etc.)
 *   5. Copy the queryId from the request URL path:
 *      /i/api/graphql/{queryId}/{operationName}
 *
 * Last verified: February 2026
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Public Bearer Token
// ============================================================================

/**
 * Twitter's public bearer token — embedded in their web client JavaScript.
 * This is NOT a secret. Every Twitter scraper uses this same token.
 * @type {string}
 */
export const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// ============================================================================
// API Base URLs
// ============================================================================

export const API_BASE = 'https://api.x.com';
export const GRAPHQL_BASE = 'https://x.com/i/api/graphql';
export const UPLOAD_BASE = 'https://upload.x.com';

// ============================================================================
// GraphQL Query IDs — Last verified February 2026
// ============================================================================

export const QUERY_IDS = {
  // User operations
  UserByScreenName: 'xmU6X_CKVnQ5lSrCbAmJsg',
  UserByRestId: 'oPppcargziU1lDQXSQjT7g',
  UserTweets: 'E3opETHurmVJflFsUBVuUQ',
  UserTweetsAndReplies: 'vMkJyzx1wdQ6_ME2_R-bhA',
  UserMedia: 'dexO_2tohK86JDudXXG3Yw',
  UserLikes: '9MSTt44HoGjVFSg_u3rHDw',

  // Tweet operations
  TweetDetail: 'xOhkmRac04YFZDOzSHB3Hg',
  TweetResultByRestId: '0hWvDhmW8YQ-S_ib3azIrw',
  CreateTweet: 'a1p9RWpkYKBjWv_I3WzS-A',
  DeleteTweet: 'VaenaVgh5q5ih7kvyVjgtg',

  // Engagement operations
  FavoriteTweet: 'lI07N6Otwv1PhnEgXILM7A',
  UnfavoriteTweet: 'ZYKSe-w7KEslx3JhSIk5LA',
  CreateRetweet: 'ojPdsZsimiJrUGLR1sjUtA',
  DeleteRetweet: 'iQtK4dl5hBmXewYZuEOKVw',

  // Follow operations
  Follow: 'lI07N6Otwv1PhnEgXILM7A',
  Unfollow: 'ZYKSe-w7KEslx3JhSIk5LA',
  Followers: 'rRXFSG5vR6drKr5M37YOTw',
  Following: 'iSicc7LrzWGBgDPL0tM_TQ',

  // Search
  SearchTimeline: 'gkjsKepM6gl_HmFWoWKfgg',

  // Lists
  ListLatestTweetsTimeline: '2P8XForueTr_nZ-Sp5GNBg',
  ListMembers: 'P4NpVZDqUD_7MEM84L-8nw',

  // Trends
  GenericTimelineById: 'V1ze5q3ijDS1VeLwLY0m7g',

  // Bookmarks
  Bookmarks: 'tmd4ifV0Kn5Yt4bOBKJMxA',
  CreateBookmark: 'aoDbu3RHznuiSkQ9aNM67Q',
  DeleteBookmark: 'Wlmlj2-xISPAGIOTv_GRAW',

  // DMs
  DMInbox: 'xkJhsTyOTqYGPszxBiz6qw',
  DMConversation: 'OoHmpAKGCgMPED7A3RfJig',
  SendDM: 'MaxK2PKX1F9Z-9UwHD4A8Q',
};

// ============================================================================
// GraphQL Default Variables & Features
// ============================================================================

/**
 * Default feature flags sent with most GraphQL requests.
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
};

/**
 * Build a GraphQL API URL for a given operation.
 *
 * @param {string} operationName - The operation name (key in QUERY_IDS)
 * @param {Object} variables - The GraphQL variables
 * @param {Object} [features] - Feature flags (defaults to DEFAULT_FEATURES)
 * @returns {string} The full API URL
 */
export function buildGraphqlUrl(operationName, variables, features = DEFAULT_FEATURES) {
  const queryId = QUERY_IDS[operationName];
  if (!queryId) {
    throw new Error(`Unknown GraphQL operation: ${operationName}`);
  }
  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(features),
  });
  return `${GRAPHQL_BASE}/${queryId}/${operationName}?${params}`;
}

/**
 * Build a GraphQL mutation request body.
 *
 * @param {string} operationName - The operation name
 * @param {Object} variables - The GraphQL variables
 * @param {Object} [features] - Feature flags
 * @returns {{ url: string, body: string }} URL and JSON body for POST
 */
export function buildGraphqlMutation(operationName, variables, features = DEFAULT_FEATURES) {
  const queryId = QUERY_IDS[operationName];
  if (!queryId) {
    throw new Error(`Unknown GraphQL operation: ${operationName}`);
  }
  return {
    url: `${GRAPHQL_BASE}/${queryId}/${operationName}`,
    body: JSON.stringify({
      variables,
      features,
      queryId,
    }),
  };
}
