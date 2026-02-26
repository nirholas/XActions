/**
 * Twitter/X Internal API Endpoint Map
 *
 * These endpoints are reverse-engineered from Twitter's web client.
 * GraphQL query IDs change periodically — update them when Twitter deploys new bundles.
 *
 * Sources:
 *   - the-convocation/twitter-scraper (MIT)
 *   - d60/twikit (MIT)
 *   - Twitter web client network inspection
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

// ---------------------------------------------------------------------------
// Base URLs
// ---------------------------------------------------------------------------

export const GRAPHQL_BASE = 'https://x.com/i/api/graphql';
export const REST_BASE = 'https://x.com/i/api';
export const API_BASE = 'https://api.x.com';

// ---------------------------------------------------------------------------
// Bearer Token (public, embedded in Twitter's web client JS bundle)
// ---------------------------------------------------------------------------

export const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// ---------------------------------------------------------------------------
// GraphQL Query / Mutation IDs
// ---------------------------------------------------------------------------
// Sources: the-convocation/twitter-scraper src/api.ts, d60/twikit twikit/client/gql.py

export const GRAPHQL = {
  // ---- Queries ----
  UserByScreenName:     { queryId: 'xmU6X_CKVnQ5lSrCbAmJsg', operationName: 'UserByScreenName' },
  UserByRestId:         { queryId: 'tD8zKvQzwY3kdx5yz6YmOw', operationName: 'UserByRestId' },
  UserTweets:           { queryId: 'E3opETHurmVJflFsUBVuUQ', operationName: 'UserTweets' },
  UserTweetsAndReplies: { queryId: 'BTkEs3R8bJoiMGv6LvJnCA', operationName: 'UserTweetsAndReplies' },
  UserMedia:            { queryId: 'iHxHgHtAMGog6k0ggSaPQA', operationName: 'UserMedia' },
  UserLikes:            { queryId: '9MSTt44HoGjVFSg_7gNapA', operationName: 'Likes' },
  TweetDetail:          { queryId: 'xOhkmRac04YFZmOzU9PJHg', operationName: 'TweetDetail' },
  TweetResultByRestId:  { queryId: '0hWvDhmW8YQ-S_ib3azIrw', operationName: 'TweetResultByRestId' },
  SearchTimeline:       { queryId: 'gkjsKepM6gl_HmFWoWKfgg', operationName: 'SearchTimeline' },
  Followers:            { queryId: 'djdTXDIk2qhd4OStqlUFeQ', operationName: 'Followers' },
  Following:            { queryId: 'IWP6Zt14sARO29lJT35bBw', operationName: 'Following' },
  Retweeters:           { queryId: 'ViKvXirbMxMBgIg4DmEE6A', operationName: 'Retweeters' },
  ListMembers:          { queryId: 'BQp2IEYkgxuSxqbTAr1e-g', operationName: 'ListMembers' },
  ListTimeline:         { queryId: 'Pa4kNFk5n-FrOK41mX3mew', operationName: 'ListTimeline' },
  BookmarkTimeline:     { queryId: 'oadL9m6E1AMr9rRTPvpNYA', operationName: 'BookmarkTimeline_v2' },
  HomeTimeline:         { queryId: 'HJFjzBgCs16TqxewQOeLNg', operationName: 'HomeTimeline' },
  Notifications:        { queryId: 'SeQ-jmhaz_Mko0Iho9oGBg', operationName: 'Notifications' },

  // ---- Mutations (engagement) ----
  FavoriteTweet:   { queryId: 'lI07N6Otwv1PhnEgXILM7A', operationName: 'FavoriteTweet' },
  UnfavoriteTweet: { queryId: 'ZYKSe-w7KEslx3JhSIk5LA', operationName: 'UnfavoriteTweet' },
  CreateRetweet:   { queryId: 'ojPdsZsimiJrUGLR1sjUtA', operationName: 'CreateRetweet' },
  DeleteRetweet:   { queryId: 'iQtK4dl5hBmXewYZuEOKVw', operationName: 'DeleteRetweet' },
  CreateTweet:     { queryId: 'SoVnbfCycZ7fERGCwpZkYA', operationName: 'CreateTweet' },
  DeleteTweet:     { queryId: 'VaenaVgh5q5ih7kvyVjgtg', operationName: 'DeleteTweet' },
  CreateBookmark:  { queryId: 'aoDbu3RHznuiSkQ9aNM67Q', operationName: 'CreateBookmark' },
  DeleteBookmark:  { queryId: 'Wlmlj2-xIS1dAMY2p6lnPA', operationName: 'DeleteBookmark' },
};

// ---------------------------------------------------------------------------
// REST Endpoints
// ---------------------------------------------------------------------------

export const REST = {
  // Follow / Unfollow
  friendshipsCreate:  '/1.1/friendships/create.json',
  friendshipsDestroy: '/1.1/friendships/destroy.json',

  // Block / Unblock
  blocksCreate:  '/1.1/blocks/create.json',
  blocksDestroy: '/1.1/blocks/destroy.json',

  // Mute / Unmute
  mutesCreate:  '/1.1/mutes/users/create.json',
  mutesDestroy: '/1.1/mutes/users/destroy.json',

  // Pin / Unpin
  pinTweet:   '/1.1/account/pin_tweet.json',
  unpinTweet: '/1.1/account/unpin_tweet.json',

  // Guest token
  guestActivate: '/1.1/guest/activate.json',

  // Account
  verifyCredentials: '/1.1/account/verify_credentials.json',

  // Direct Messages
  dmNew:           '/1.1/direct_messages/events/new.json',
  dmDestroy:       '/1.1/direct_messages/events/destroy.json',
  dmInbox:         '/1.1/dm/inbox_initial_state.json',
  dmConversation:  '/1.1/dm/conversation',
  dmMarkRead:      '/1.1/dm/conversation',
};

// ---------------------------------------------------------------------------
// Default GraphQL Feature Flags
// ---------------------------------------------------------------------------

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
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_text_conversations_enabled: false,
  vibe_api_enabled: true,
  interactive_text_enabled: true,
  blue_business_profile_image_shape_enabled: false,
  premium_content_api_read_enabled: false,
};

export const DEFAULT_FIELD_TOGGLES = {
  withArticleRichContentState: true,
  withArticlePlainText: false,
  withGrokAnalyze: false,
  withDisallowedReplyControls: false,
};

// ---------------------------------------------------------------------------
// Rate Limit Constants (requests per 15-minute window)
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  FavoriteTweet: 500,
  UnfavoriteTweet: 500,
  CreateRetweet: 300,
  DeleteRetweet: 300,
  CreateBookmark: 500,
  DeleteBookmark: 500,
  friendshipsCreate: 400,
  friendshipsDestroy: 400,
  blocksCreate: 200,
  blocksDestroy: 200,
  mutesCreate: 200,
  mutesDestroy: 200,
  pinTweet: 100,
  unpinTweet: 100,
  DEFAULT: 180,
};

// ---------------------------------------------------------------------------
// User Agent Strings (realistic Chrome on Windows/Mac)
// ---------------------------------------------------------------------------

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a full GraphQL GET URL with encoded query params.
 *
 * @param {string} queryId
 * @param {string} operationName
 * @param {object} variables
 * @param {object} [features]
 * @returns {string}
 */
export function buildGraphQLUrl(queryId, operationName, variables, features = DEFAULT_FEATURES) {
  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(features),
  });
  return `${GRAPHQL_BASE}/${queryId}/${operationName}?${params.toString()}`;
}

/**
 * Build the variables object for common query types.
 *
 * @param {'UserByScreenName'|'UserByRestId'|'TweetDetail'|string} type
 * @param {object} params
 * @returns {object}
 */
export function buildGraphQLVariables(type, params = {}) {
  switch (type) {
    case 'UserByScreenName':
      return { screen_name: params.username, withSafetyModeUserFields: true };
    case 'UserByRestId':
      return { userId: params.userId, withSafetyModeUserFields: true };
    case 'TweetDetail':
      return {
        focalTweetId: params.tweetId,
        with_rux_injections: false,
        rankingMode: 'Relevance',
        includePromotedContent: true,
        withCommunity: true,
        withQuickPromoteEligibilityTweetFields: true,
        withBirdwatchNotes: true,
        withVoice: true,
      };
    default:
      return params;
  }
}
