/**
 * Twitter/X Internal API Endpoint Map
 *
 * These endpoints are reverse-engineered from Twitter's web client.
 * GraphQL query IDs change periodically — update them when Twitter deploys new bundles.
 *
 * Sources:
 *   - the-convocation/twitter-scraper (MIT) — src/api-data.ts
 *   - d60/twikit (MIT) — twikit/client/gql.py, twikit/client/v11.py, twikit/constants.py
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
// Same token used by the-convocation/twitter-scraper and d60/twikit
// ---------------------------------------------------------------------------

export const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// ---------------------------------------------------------------------------
// GraphQL Query / Mutation IDs
// ---------------------------------------------------------------------------
// Cross-referenced from:
//   - the-convocation/twitter-scraper src/api-data.ts (endpoints object)
//   - d60/twikit twikit/client/gql.py (Endpoint class)
// When both sources provide an ID, the more recent one is preferred.
// Query IDs marked [twikit] or [scraper] indicate their primary source.

export const GRAPHQL = {
  // ---- Queries (user profiles) ----
  UserByScreenName:     { queryId: 'NimuplG1OB7Fd2btCLdBOw', operationName: 'UserByScreenName' },     // [twikit] d60/twikit gql.py
  UserByRestId:         { queryId: 'tD8zKvQzwY3kdx5yz6YmOw', operationName: 'UserByRestId' },         // [twikit] d60/twikit gql.py — also in scraper

  // ---- Queries (user timelines) ----
  UserTweets:           { queryId: 'QWF3SzpHmykQHsQMixG0cg', operationName: 'UserTweets' },           // [twikit] d60/twikit gql.py
  UserTweetsAndReplies: { queryId: 'vMkJyzx1wdmvOeeNG0n6Wg', operationName: 'UserTweetsAndReplies' }, // [twikit] d60/twikit gql.py
  UserMedia:            { queryId: '2tLOJWwGuCTytDrGBg8VwQ', operationName: 'UserMedia' },             // [twikit] d60/twikit gql.py
  UserLikes:            { queryId: 'IohM3gxQHfvWePH5E3KuNA', operationName: 'Likes' },                // [twikit] d60/twikit gql.py

  // ---- Queries (tweets) ----
  TweetDetail:          { queryId: 'U0HTv-bAWTBYylwEMT7x5A', operationName: 'TweetDetail' },          // [twikit] d60/twikit gql.py
  TweetResultByRestId:  { queryId: 'Xl5pC_lBk_gcO2ItU39DQw', operationName: 'TweetResultByRestId' },  // [twikit] d60/twikit gql.py

  // ---- Queries (search) ----
  SearchTimeline:       { queryId: 'flaR-PUMshxFWZWPNpq4zA', operationName: 'SearchTimeline' },       // [twikit] d60/twikit gql.py

  // ---- Queries (relationships) ----
  Followers:            { queryId: 'gC_lyAxZOptAMLCJX5UhWw', operationName: 'Followers' },             // [twikit] d60/twikit gql.py
  Following:            { queryId: '2vUj-_Ek-UmBVDNtd8OnQA', operationName: 'Following' },            // [twikit] d60/twikit gql.py

  // ---- Queries (engagement) ----
  Likes:                { queryId: 'LLkw5EcVutJL6y-2gkz22A', operationName: 'Favoriters' },           // [twikit] d60/twikit gql.py — who liked a tweet
  Retweeters:           { queryId: 'X-XEqG5qHQSAwmvy00xfyQ', operationName: 'Retweeters' },           // [twikit] d60/twikit gql.py

  // ---- Queries (lists) ----
  ListMembers:          { queryId: 'BQp2IEYkgxuSxqbTAr1e1g', operationName: 'ListMembers' },          // [twikit] d60/twikit gql.py
  ListTimeline:         { queryId: 'HjsWc-nwwHKYwHenbHm-tw', operationName: 'ListLatestTweetsTimeline' }, // [twikit] d60/twikit gql.py

  // ---- Queries (bookmarks, auth required) ----
  BookmarkTimeline:     { queryId: 'qToeLeMs43Q8cr7tRYXmaQ', operationName: 'Bookmarks' },            // [twikit] d60/twikit gql.py

  // ---- Queries (timelines) ----
  HomeTimeline:         { queryId: '-X_hcgQzmHGl29-UXxz4sw', operationName: 'HomeTimeline' },          // [twikit] d60/twikit gql.py
  HomeLatestTimeline:   { queryId: 'U0cdisy7QFIoTfu3-Okw0A', operationName: 'HomeLatestTimeline' },    // [twikit] d60/twikit gql.py

  // ---- Mutations (tweets) ----
  CreateTweet:     { queryId: 'SiM_cAu83R0wnrpmKQQSEw', operationName: 'CreateTweet' },               // [twikit] d60/twikit gql.py
  DeleteTweet:     { queryId: 'VaenaVgh5q5ih7kvyVjgtg', operationName: 'DeleteTweet' },                // [twikit] d60/twikit gql.py — also in scraper

  // ---- Mutations (engagement) ----
  FavoriteTweet:   { queryId: 'lI07N6Otwv1PhnEgXILM7A', operationName: 'FavoriteTweet' },             // [twikit] d60/twikit gql.py — also in scraper
  UnfavoriteTweet: { queryId: 'ZYKSe-w7KEslx3JhSIk5LA', operationName: 'UnfavoriteTweet' },           // [twikit] d60/twikit gql.py — also in scraper
  CreateRetweet:   { queryId: 'ojPdsZsimiJrUGLR1sjUtA', operationName: 'CreateRetweet' },              // [twikit] d60/twikit gql.py — also in scraper
  DeleteRetweet:   { queryId: 'iQtK4dl5hBmXewYZuEOKVw', operationName: 'DeleteRetweet' },             // [twikit] d60/twikit gql.py — also in scraper

  // ---- Mutations (bookmarks) ----
  CreateBookmark:  { queryId: 'aoDbu3RHznuiSkQ9aNM67Q', operationName: 'CreateBookmark' },            // [twikit] d60/twikit gql.py — also in scraper
  DeleteBookmark:  { queryId: 'Wlmlj2-xzyS1GN3a6cj-mQ', operationName: 'DeleteBookmark' },           // [twikit] d60/twikit gql.py
};

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
// Default GraphQL Feature Flags
// Merged from the-convocation/twitter-scraper api-data.ts and d60/twikit constants.py
// These flags are sent with nearly every GraphQL request by the Twitter web client.
// ---------------------------------------------------------------------------

export const DEFAULT_FEATURES = {
  rweb_video_screen_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  rweb_tipjar_consumption_enabled: false,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_enhance_cards_enabled: false,
  responsive_web_profile_redirect_enabled: false,
};

export const DEFAULT_FIELD_TOGGLES = {
  withArticleRichContentState: true,
  withArticlePlainText: false,
  withGrokAnalyze: false,
  withDisallowedReplyControls: false,
};

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
// User Agent Strings (realistic Chrome 131–133 on Windows/Mac/Linux, Feb 2026)
// ---------------------------------------------------------------------------

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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

    const url = `${GRAPHQL_BASE}/${endpoint.queryId}/${endpoint.operationName}`;

    try {
      const res = await fetchFn(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      // 200, 400 (missing params), or 403 (auth required) all mean the endpoint exists.
      // Only 404 means the query ID is stale.
      if (res.status === 404) {
        results.invalid.push(key);
        results.errors[key] = `HTTP 404 — query ID likely stale`;
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
