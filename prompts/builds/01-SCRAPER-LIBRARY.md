# Track 01 — Programmatic Scraper Class

> Build a clean, typed `Scraper` class that wraps Twitter's internal GraphQL API. No Puppeteer required. This is the #1 feature that 4,000+ star repos (twikit, twitter-scraper) provide that XActions lacks.

---

## Research Before Starting

Read these files to understand the existing codebase:

```
src/scrapers/twitter/index.js     — Current Puppeteer-based scrapers (952 lines)
src/scrapers/index.js             — Unified multi-platform scraper interface (354 lines)
src/index.js                      — Package root exports (187 lines)
package.json                      — Dependencies and exports map
types/index.d.ts                  — Existing TypeScript definitions
src/mcp/server.js                 — MCP server (uses scrapers internally)
```

Study these competitor implementations for API surface design:

- `the-convocation/twitter-scraper` — Node.js, `Scraper` class, AsyncGenerator pagination
- `agent-twitter-client` (ElizaOS) — Node.js, login/cookies/sendTweet/media
- `d60/twikit` — Python, `Client` class, async/await

---

## Architecture

```
src/client/
  Scraper.js            ← Main entry point class
  api/
    tweets.js           ← getTweet, getTweets, sendTweet, deleteTweet, likeTweet, retweet
    users.js            ← getProfile, getFollowers, getFollowing, followUser, unfollowUser
    search.js           ← searchTweets, searchProfiles
    trends.js           ← getTrends
    lists.js            ← getListTweets, getListMembers
    dms.js              ← sendDm, getDmConversations
```

The Scraper class delegates to `src/client/auth/` for authentication and `src/client/http/` for HTTP — those are built in tracks 02 and 03. This track focuses on the API method layer and the Scraper facade.

---

## Prompts

### Prompt 1: Scraper Class Skeleton

```
You are building the XActions programmatic Scraper class at src/client/Scraper.js.

Create the file src/client/Scraper.js with:

1. A class `Scraper` that is the main entry point for programmatic Twitter access
2. Constructor accepts an options object: { cookies, proxy, fetch, transform }
3. Methods stubs (async, returning null for now — later prompts fill them in):
   - login({ username, password, email }) → Promise<void>
   - logout() → Promise<void>  
   - isLoggedIn() → Promise<boolean>
   - getCookies() → Promise<Array>
   - setCookies(cookies) → Promise<void>
   - saveCookies(filePath) → Promise<void>
   - loadCookies(filePath) → Promise<void>
   - getProfile(username) → Promise<Profile>
   - getTweet(id) → Promise<Tweet>
   - getTweets(username, count) → AsyncGenerator<Tweet>
   - getTweetsAndReplies(username) → AsyncGenerator<Tweet>
   - getLikedTweets(username) → AsyncGenerator<Tweet>
   - getLatestTweet(username) → Promise<Tweet|null>
   - searchTweets(query, count, mode) → AsyncGenerator<Tweet>
   - searchProfiles(query, count) → AsyncGenerator<Profile>
   - getFollowers(userId, count) → AsyncGenerator<Profile>
   - getFollowing(userId, count) → AsyncGenerator<Profile>
   - getTrends() → Promise<Array<string>>
   - sendTweet(text, options) → Promise<Tweet>
   - sendQuoteTweet(text, quotedTweetId, media) → Promise<Tweet>
   - deleteTweet(id) → Promise<void>
   - likeTweet(id) → Promise<void>
   - unlikeTweet(id) → Promise<void>
   - retweet(id) → Promise<void>
   - unretweet(id) → Promise<void>
   - followUser(username) → Promise<void>
   - unfollowUser(username) → Promise<void>
   - sendDm(userId, text) → Promise<void>
   - getListTweets(listId, count) → AsyncGenerator<Tweet>
   - me() → Promise<Profile>
4. Internal properties: this._auth (null), this._http (null), this._isLoggedIn (false)
5. A `SearchMode` enum export: { Top: 'Top', Latest: 'Latest', Photos: 'Photos', Videos: 'Videos' }
6. JSDoc on every method with @param and @returns
7. Header comment with @author nich (@nichxbt) and @license MIT
8. ESM export: `export { Scraper, SearchMode }`

The class must be real production code. Do NOT use placeholder comments like "// TODO" — stubs should have proper method signatures and return types that match the JSDoc. Methods that need auth/http will be connected in later prompts.
```

### Prompt 2: Tweet Data Models

```
Create src/client/models/Tweet.js and src/client/models/Profile.js.

Tweet.js should export a Tweet class with these properties (populated from Twitter GraphQL responses):
- id (string)
- text (string) 
- fullText (string)
- username (string)
- userId (string)
- timeParsed (Date)
- timestamp (number)
- hashtags (string[])
- mentions (string[])
- urls (string[])
- photos (Array<{id, url, alt}>)
- videos (Array<{id, url, preview, duration}>)
- thread (Tweet[])
- inReplyToStatusId (string|null)
- inReplyToStatus (Tweet|null)
- quotedStatusId (string|null)
- quotedStatus (Tweet|null)
- isRetweet (boolean)
- isReply (boolean)
- isQuote (boolean)
- retweetedStatus (Tweet|null)
- likes (number)
- retweets (number)
- replies (number)
- views (number)
- bookmarkCount (number)
- place (object|null)
- sensitiveContent (boolean)
- conversationId (string)
- poll (object|null) — {id, options: [{label, votes}], endDatetime, votingStatus}

Add a static method Tweet.fromGraphQL(raw) that takes a raw Twitter GraphQL "tweet_results.result" object and maps every field. This is the REAL Twitter API shape. Study the-convocation/twitter-scraper's tweet parsing for the exact field paths:
- raw.legacy.full_text → fullText
- raw.legacy.favorite_count → likes
- raw.legacy.retweet_count → retweets
- raw.legacy.reply_count → replies
- raw.views?.count → views
- raw.legacy.entities.hashtags[].text → hashtags
- raw.legacy.entities.user_mentions[].screen_name → mentions
- raw.legacy.entities.urls[].expanded_url → urls
- raw.legacy.entities.media[] → photos/videos
- raw.legacy.in_reply_to_status_id_str → inReplyToStatusId
- raw.quoted_status_result?.result → quotedStatus (recursive Tweet.fromGraphQL)
- raw.legacy.retweeted_status_result?.result → retweetedStatus

Profile.js should export a Profile class with:
- id, username, name, bio, location, website, joined (Date)
- followersCount, followingCount, tweetCount, likesCount, listedCount, mediaCount
- avatar, banner, verified, protected, birthdate
- pinnedTweetIds (string[])
- isBlueVerified (boolean)
- isGovernment (boolean)
- isBusiness (boolean)
- affiliatesCount (number)
- canDm (boolean)
- platform ('twitter')

Add Profile.fromGraphQL(raw) that maps from Twitter's "user_results.result" shape:
- raw.legacy.screen_name → username
- raw.legacy.name → name
- raw.legacy.description → bio
- raw.legacy.followers_count → followersCount
- raw.legacy.friends_count → followingCount
- raw.legacy.statuses_count → tweetCount
- raw.legacy.favourites_count → likesCount
- raw.legacy.listed_count → listedCount
- raw.legacy.media_count → mediaCount
- raw.is_blue_verified → isBlueVerified
- raw.legacy.verified → verified
- raw.legacy.protected → protected

All parsing must handle null/undefined gracefully. No crashes on missing fields.
Export both classes. ESM. @author nich (@nichxbt).
```

### Prompt 3: GraphQL Query ID Registry

```
Create src/client/api/graphqlQueries.js.

Twitter's internal GraphQL endpoints use query IDs that are embedded in their JavaScript bundles. These IDs change periodically but are public. This file maintains the registry.

Export an object `GRAPHQL_ENDPOINTS` with:

{
  UserByScreenName: {
    queryId: 'xc8f1g7BYqr6VTzTbvNLGg',
    operationName: 'UserByScreenName',
    method: 'GET',
    url: (queryId) => `https://x.com/i/api/graphql/${queryId}/UserByScreenName`,
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
  UserTweets: {
    queryId: 'E3opETHurmVJflFsUBVuUQ',
    operationName: 'UserTweets',
    method: 'GET',
  },
  TweetDetail: {
    queryId: 'BbCrSoXIR7z93lLCVFlQ2Q',
    operationName: 'TweetDetail',
    method: 'GET',
  },
  SearchTimeline: {
    queryId: 'gkjsKepM6gl_HmFWoWKfgg',
    operationName: 'SearchTimeline',
    method: 'GET',
  },
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
  SendDm: {
    queryId: null,
    operationName: null,
    method: 'POST',
    url: () => 'https://x.com/i/api/1.1/dm/new2.json',
  },
  ListLatestTweetsTimeline: {
    queryId: '2Vjeyo_L0nizAUhHe3fKyA',
    operationName: 'ListLatestTweetsTimeline',
    method: 'GET',
  },
  GenericTimelineById: {
    queryId: null,
    operationName: 'GenericTimelineById',
    method: 'GET',
  },
}

Also export:
- BEARER_TOKEN constant (the public Twitter bearer token)
- DEFAULT_FEATURES object with all feature flags Twitter expects
- A function `buildGraphQLUrl(endpoint, variables, features)` that constructs the full URL with encoded params

All query IDs are real values from Twitter's JavaScript bundles as of January 2026. Include a comment explaining that query IDs may need periodic updates and how to find new ones (inspect network requests on x.com).
```

### Prompt 4: Users API Implementation

```
Create src/client/api/users.js.

This file implements all user-related API calls for the Scraper class. It depends on:
- src/client/http/HttpClient.js (will exist from Track 03 — use a simple fetch wrapper for now)
- src/client/api/graphqlQueries.js (from Prompt 3)
- src/client/models/Profile.js (from Prompt 2)

Export these functions:

1. async function getUserByScreenName(http, username) → Profile
   - Calls GRAPHQL_ENDPOINTS.UserByScreenName
   - Variables: { screen_name: username, withSafetyModeUserFields: true }
   - Parses response with Profile.fromGraphQL(data.user.result)
   - Throws ScraperError if user not found

2. async function getUserById(http, userId) → Profile
   - Calls UserByRestId endpoint
   - Variables: { userId, withSafetyModeUserFields: true }

3. async function* getFollowers(http, userId, count) → AsyncGenerator<Profile>
   - Calls GRAPHQL_ENDPOINTS.Followers with cursor pagination
   - Variables: { userId, count: 20, includePromotedContent: false }
   - Yields Profile objects one at a time
   - Handles cursor: extracts "cursor-bottom-*" from timeline entries
   - Stops when requested count reached or no more results
   - Each page request has randomDelay(1000, 2000) to avoid rate limits

4. async function* getFollowing(http, userId, count) → AsyncGenerator<Profile>
   - Same pattern as getFollowers but uses Following endpoint

5. async function followUser(http, userId) → void
   - POST to friendships/create.json with user_id parameter
   - Requires authentication

6. async function unfollowUser(http, userId) → void
   - POST to friendships/destroy.json

7. async function getUserIdByScreenName(http, username) → string
   - Calls getUserByScreenName then returns profile.id

All functions take `http` as first param (the HttpClient instance). All use real Twitter GraphQL endpoints. Handle errors with a custom ScraperError class (create src/client/errors.js with ScraperError extending Error, with properties: code, endpoint, rateLimitReset). All network requests must go through the http client, never raw fetch.
```

### Prompt 5: Tweets API Implementation

```
Create src/client/api/tweets.js.

Implements all tweet-related API calls. Uses:
- src/client/http/HttpClient.js
- src/client/api/graphqlQueries.js
- src/client/models/Tweet.js

Export these functions:

1. async function getTweet(http, tweetId) → Tweet
   - GET TweetDetail endpoint
   - Variables: { focalTweetId: tweetId, with_rux_injections: false, includePromotedContent: false, withCommunity: true, withQuickPromoteEligibilityTweetFields: true, withBirdwatchNotes: true, withVoice: true, withV2Timeline: true }
   - Parse response: navigate data.tweetResult.result → Tweet.fromGraphQL()
   - Handle tweet not found (null result) with ScraperError

2. async function* getTweets(http, userId, count) → AsyncGenerator<Tweet>
   - GET UserTweets endpoint with cursor pagination
   - Variables: { userId, count: 20, includePromotedContent: false, withQuickPromoteEligibilityTweetFields: true, withVoice: true, withV2Timeline: true }
   - Each page: extract entries from timeline instructions (add_entries instruction type)
   - Filter: only yield entries with entryId starting with "tweet-"
   - Parse each entry.content.itemContent.tweet_results.result → Tweet.fromGraphQL()
   - Cursor: find entry with entryId "cursor-bottom-*", extract value
   - Yield tweets one at a time, stop at count or end of timeline

3. async function* getTweetsAndReplies(http, userId, count) → AsyncGenerator<Tweet>
   - Same as getTweets but uses UserTweetsAndReplies endpoint
   - Also yields conversation module entries (multi-tweet reply chains)

4. async function* getLikedTweets(http, userId, count) → AsyncGenerator<Tweet>
   - GET Likes endpoint with cursor pagination

5. async function getLatestTweet(http, userId) → Tweet|null
   - Calls getTweets for 1 tweet, returns first or null

6. async function sendTweet(http, text, options = {}) → Tweet
   - POST CreateTweet endpoint
   - Body: { variables: { tweet_text: text, media: { media_entities: options.mediaIds || [], possibly_sensitive: false }, dark_request: false }, features: DEFAULT_FEATURES, queryId }
   - options.replyTo → variables.reply = { in_reply_to_tweet_id: options.replyTo, exclude_reply_user_ids: [] }
   - Returns created tweet parsed from response

7. async function sendQuoteTweet(http, text, quotedTweetId, mediaIds) → Tweet
   - POST CreateTweet with attachment_url set to the quoted tweet URL

8. async function deleteTweet(http, tweetId) → void
   - POST DeleteTweet endpoint

9. async function likeTweet(http, tweetId) → void
   - POST FavoriteTweet endpoint
   - Body: { variables: { tweet_id: tweetId }, queryId }

10. async function unlikeTweet(http, tweetId) → void
    - POST UnfavoriteTweet endpoint

11. async function retweet(http, tweetId) → void
    - POST CreateRetweet endpoint

12. async function unretweet(http, tweetId) → void
    - POST DeleteRetweet endpoint

All pagination functions must use AsyncGenerator with cursor-based pagination. Handle Twitter's nested timeline response format correctly:
- Response shape: data.user.result.timeline_v2.timeline.instructions[]
- Find instruction with type "TimelineAddEntries"
- entries[].content.entryType === "TimelineTimelineItem" → single tweet
- entries[].content.entryType === "TimelineTimelineModule" → thread/conversation
- entries[].entryId.startsWith("cursor-bottom") → next cursor

Include 1-2 second random delays between paginated requests.
```

### Prompt 6: Search API Implementation

```
Create src/client/api/search.js.

Implements Twitter search via the internal SearchTimeline GraphQL endpoint.

Export these functions:

1. async function* searchTweets(http, query, count, mode = 'Latest') → AsyncGenerator<Tweet>
   - GET SearchTimeline endpoint
   - Variables: {
       rawQuery: query,
       count: 20,
       querySource: 'typed_query',
       product: mode  // 'Top', 'Latest', 'Photos', 'Videos', 'People'
     }
   - Cursor pagination (same pattern as tweets)
   - Parse SearchTimeline response:
     data.search_by_raw_query.search_timeline.timeline.instructions[]
   - Find TimelineAddEntries instruction
   - Extract tweets from entries, parse with Tweet.fromGraphQL
   - Yield one tweet at a time

2. async function* searchProfiles(http, query, count) → AsyncGenerator<Profile>
   - Same endpoint but product: 'People'
   - Parse user entries with Profile.fromGraphQL

3. async function fetchSearchTweets(http, query, count, mode) → { tweets: Tweet[], cursor: string }
   - Non-generator version that returns a page of results with cursor
   - Useful for manual pagination control

4. async function fetchSearchProfiles(http, query, count) → { profiles: Profile[], cursor: string }
   - Same for profiles

Support advanced search operators in the query string:
- from:username
- to:username
- since:YYYY-MM-DD
- until:YYYY-MM-DD
- min_replies:N
- min_faves:N
- min_retweets:N
- filter:links / filter:media / filter:images / filter:videos
- -filter:replies (exclude replies)
- lang:en

The search functions should pass these through as-is in the rawQuery — Twitter handles the parsing.

Include proper error handling for empty results (yield nothing, don't crash).
```

### Prompt 7: Trends and Lists API

```
Create src/client/api/trends.js and src/client/api/lists.js.

trends.js exports:
1. async function getTrends(http, category = 'trending') → Array<{name, tweetCount, url, context}>
   - GET https://x.com/i/api/2/guide.json with params:
     include_page_configuration=false, initial_tab_id=trending
   - Parse response.timeline.instructions[0].addEntries.entries
   - Each trend entry has: trend.name, trend.url, trend.description (tweet volume context)
   - Also support categories: 'trending', 'for_you', 'news', 'sports', 'entertainment'

2. async function getExploreTabs(http) → Array<{id, label}>
   - Get available explore tabs

lists.js exports:
1. async function* getListTweets(http, listId, count) → AsyncGenerator<Tweet>
   - GET ListLatestTweetsTimeline endpoint
   - Variables: { listId, count: 20 }
   - Cursor pagination, same parse pattern as tweets

2. async function* getListMembers(http, listId, count) → AsyncGenerator<Profile>
   - GET ListMembers endpoint
   - Cursor pagination

3. async function getListById(http, listId) → { id, name, description, memberCount, subscriberCount, createdAt }
   - GET ListByRestId endpoint

All real endpoints, real parsing, cursor-based pagination for generators.
```

### Prompt 8: Wire Up Scraper Class Methods

```
Update src/client/Scraper.js to wire all API modules into the Scraper class methods.

Import all modules:
- import * as usersApi from './api/users.js'
- import * as tweetsApi from './api/tweets.js'
- import * as searchApi from './api/search.js'
- import * as trendsApi from './api/trends.js'
- import * as listsApi from './api/lists.js'

Replace every stub method with a real implementation that:
1. Checks this._auth.isAuthenticated() for methods that require auth (send*, delete*, like*, follow*, dm)
2. Delegates to the appropriate API function, passing this._http
3. For methods that take a username but the API needs a userId, resolve it:
   - Store a cache Map this._userIdCache
   - Check cache first, then call usersApi.getUserIdByScreenName(this._http, username)

Implement me() method:
- Call this._auth.getAuthenticatedUserId() → then getUserById(this._http, id)

Implement isLoggedIn():
- return this._auth?.isAuthenticated() ?? false

Implement login():
- Delegates to this._auth.login(credentials)
- After login, sets this._isLoggedIn = true

Implement cookie methods (getCookies, setCookies, saveCookies, loadCookies):
- Delegate to this._auth cookie methods

Every method must have complete error handling:
- Not logged in → throw new ScraperError('Not authenticated', 'AUTH_REQUIRED')
- User not found → throw new ScraperError('User not found', 'USER_NOT_FOUND')
- Tweet not found → throw new ScraperError('Tweet not found', 'TWEET_NOT_FOUND')

Make sure the constructor initializes this._http and this._auth from the options or creates defaults:
- this._http = new HttpClient(options) // from Track 03
- this._auth = new CookieAuth(this._http) // from Track 02
```

### Prompt 9: Scraper Client Index and Package Exports

```
Create src/client/index.js that exports everything from the client module:

export { Scraper, SearchMode } from './Scraper.js';
export { Tweet } from './models/Tweet.js';
export { Profile } from './models/Profile.js';
export { ScraperError } from './errors.js';
export { GRAPHQL_ENDPOINTS, BEARER_TOKEN } from './api/graphqlQueries.js';

Then update src/index.js to add client exports alongside existing scrapers:

Add these lines after the existing scraper exports:
// ============================================================================
// Programmatic Client (HTTP-only, no Puppeteer)
// ============================================================================
export { Scraper, SearchMode, Tweet, Profile, ScraperError } from './client/index.js';

Update package.json exports map to add:
  "./client": "./src/client/index.js",

So users can do either:
  import { Scraper } from 'xactions';           // from root
  import { Scraper } from 'xactions/client';     // explicit client import

Also update types/index.d.ts to add TypeScript declarations for the Scraper class. Add:

export class Scraper {
  constructor(options?: ScraperOptions);
  login(credentials: LoginCredentials): Promise<void>;
  logout(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  getCookies(): Promise<CookieJar>;
  setCookies(cookies: CookieJar): Promise<void>;
  saveCookies(filePath: string): Promise<void>;
  loadCookies(filePath: string): Promise<void>;
  getProfile(username: string): Promise<Profile>;
  getTweet(id: string): Promise<Tweet>;
  getTweets(username: string, count?: number): AsyncGenerator<Tweet>;
  searchTweets(query: string, count?: number, mode?: SearchMode): AsyncGenerator<Tweet>;
  searchProfiles(query: string, count?: number): AsyncGenerator<Profile>;
  getFollowers(userId: string, count?: number): AsyncGenerator<Profile>;
  getFollowing(userId: string, count?: number): AsyncGenerator<Profile>;
  getTrends(): Promise<Trend[]>;
  sendTweet(text: string, options?: SendTweetOptions): Promise<Tweet>;
  deleteTweet(id: string): Promise<void>;
  likeTweet(id: string): Promise<void>;
  unlikeTweet(id: string): Promise<void>;
  retweet(id: string): Promise<void>;
  unretweet(id: string): Promise<void>;
  followUser(username: string): Promise<void>;
  unfollowUser(username: string): Promise<void>;
  sendDm(userId: string, text: string): Promise<void>;
  getListTweets(listId: string, count?: number): AsyncGenerator<Tweet>;
  me(): Promise<Profile>;
  v2: ScraperV2;
}

export interface ScraperOptions {
  cookies?: string | CookieJar;
  proxy?: string;
  fetch?: typeof fetch;
  transform?: RequestTransform;
}

export interface LoginCredentials {
  username: string;
  password: string;
  email?: string;
}

export enum SearchMode {
  Top = 'Top',
  Latest = 'Latest',
  Photos = 'Photos',
  Videos = 'Videos',
}

Include full type definitions for Tweet, Profile, Trend, SendTweetOptions, etc.
```

### Prompt 10: DM API Implementation

```
Create src/client/api/dms.js.

Twitter's DM system uses different endpoints than tweets. Implement:

1. async function sendDm(http, conversationId, text) → { id, text, createdAt }
   - POST https://x.com/i/api/1.1/dm/new2.json
   - Body (form-encoded): {
       conversation_id: conversationId,
       text: text,
       cards_platform: 'Web-12',
       include_cards: 1,
       include_quote_count: true,
       dm_users: false
     }
   - Or for new conversation by userId:
     Body includes recipient_ids: false, request_id: uuid

2. async function sendDmToUser(http, userId, text) → same
   - Creates new DM conversation with user
   - POST same endpoint but with different body format

3. async function* getDmConversations(http, count) → AsyncGenerator<Conversation>
   - GET https://x.com/i/api/1.1/dm/inbox_initial_state.json
   - Parse conversations from response.inbox_initial_state.conversations
   - Each conversation: { id, type, participants, lastMessage, updatedAt }

4. async function* getDmMessages(http, conversationId, count) → AsyncGenerator<Message>
   - GET https://x.com/i/api/1.1/dm/conversation/{conversationId}.json
   - Parse messages from response.conversation_timeline.entries
   - Each message: { id, text, senderId, createdAt, mediaUrls }

Create model src/client/models/Message.js:
- id, text, senderId, recipientId, createdAt, mediaUrls, conversationId

Handle DM errors (user has DMs disabled, rate limited, etc).
```

### Prompt 11: Error Handling and Validation Layer

```
Create src/client/errors.js with comprehensive error classes:

1. ScraperError (base class extending Error)
   - Properties: code (string), endpoint (string), httpStatus (number), rateLimitReset (Date|null)
   - toString() → formatted error message

2. AuthenticationError extends ScraperError
   - code: 'AUTH_FAILED' | 'AUTH_REQUIRED' | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_LOCKED'
   
3. RateLimitError extends ScraperError
   - code: 'RATE_LIMITED'
   - Properties: retryAfter (number), limit (number), remaining (number), resetAt (Date)
   
4. NotFoundError extends ScraperError
   - code: 'USER_NOT_FOUND' | 'TWEET_NOT_FOUND' | 'LIST_NOT_FOUND'

5. TwitterApiError extends ScraperError
   - code: 'API_ERROR'
   - Properties: twitterErrorCode (number), twitterMessage (string)
   - Maps Twitter error codes: 34 → NotFoundError, 63 → AccountSuspended, 88 → RateLimited, 326 → AccountLocked

Create src/client/validation.js with input validators:
1. validateUsername(username) → cleaned username (strips @, validates length 1-15, alphanumeric + underscore)
2. validateTweetId(id) → validated string (must be numeric, reasonable length)
3. validateTweetText(text) → validated text (max 280 chars, or 25000 for long tweets if enabled)
4. validateCount(count, min, max) → validated number
5. validateUrl(url) → validated URL string

All validators throw descriptive errors. Used by Scraper class methods before making API calls.
```

### Prompt 12: Response Parsers

```
Create src/client/api/parsers.js.

Twitter's GraphQL responses are deeply nested and inconsistent. This file provides robust parsing functions used by all API modules.

Export:

1. function parseTimelineEntries(response, path) → { entries: Array, cursor: string|null }
   - Navigate the response using dot-path (e.g., 'data.user.result.timeline_v2.timeline')
   - Find instruction with type "TimelineAddEntries" or "TimelineAddToModule"
   - Extract entries array
   - Find cursor entry (entryId starts with "cursor-bottom")
   - Return both entries and cursor for pagination

2. function parseTweetEntry(entry) → Tweet|null
   - entry.content.itemContent.tweet_results.result → Tweet.fromGraphQL()
   - Handles "TweetWithVisibilityResults" wrapper (content.tweet → actual tweet)
   - Handles soft-deleted tweets (tombstone) → return null
   - Handles promoted tweets → return null (filter out ads)

3. function parseUserEntry(entry) → Profile|null
   - entry.content.itemContent.user_results.result → Profile.fromGraphQL()

4. function parseModuleEntry(entry) → Tweet[]
   - For conversation modules: entry.content.items[].item.itemContent.tweet_results.result
   - Returns array of tweets in the conversation

5. function navigateResponse(obj, path) → any
   - Safe dot-path navigation: navigateResponse(response, 'data.user.result') 
   - Returns undefined instead of crashing on missing fields

6. function extractCursor(entries, direction = 'bottom') → string|null
   - Find cursor entry from entries array
   - direction: 'bottom' for next page, 'top' for refresh

7. function parseMediaEntity(media) → { type, url, preview, width, height, duration, altText }
   - Parse Twitter's media entity format
   - Handle photo, animated_gif, video types
   - Extract best-quality video variant by bitrate

8. function parsePoll(card) → { id, options, endDatetime, votingStatus, totalVotes }
   - Parse Twitter card data for polls

Each parser must be defensive — return null/empty on unexpected data, never throw. Log warnings for unexpected shapes using console.warn for debugging.
```

### Prompt 13: Guest Token Manager

```
Create src/client/auth/TokenManager.js.

Twitter requires two tokens for unauthenticated (guest) access:
1. Bearer token (hardcoded, public): the constant from graphqlQueries.js
2. Guest token (dynamic, obtained per session): from activate.json endpoint

Export class TokenManager:

Properties:
- bearerToken (string) — the public bearer token
- guestToken (string|null) — current guest token
- guestTokenExpiresAt (number|null) — timestamp
- csrfToken (string|null) — for authenticated requests
- _http — reference to fetch function or HttpClient

Methods:
1. constructor(fetchFn)
   - Sets bearerToken to the public constant
   - guestToken starts null

2. async activateGuestToken() → string
   - POST https://api.x.com/1.1/guest/activate.json
   - Headers: { Authorization: `Bearer ${this.bearerToken}` }
   - Response: { guest_token: "1234567890" }
   - Store token and set expiry (guest tokens last ~3 hours)
   - Return guest_token

3. async getGuestToken() → string
   - If guestToken exists and not expired, return it
   - Otherwise call activateGuestToken()

4. getHeaders(authenticated = false) → object
   - Returns the HTTP headers Twitter expects:
     {
       'Authorization': `Bearer ${this.bearerToken}`,
       'x-guest-token': this.guestToken (if not authenticated),
       'x-csrf-token': this.csrfToken (if authenticated),
       'x-twitter-auth-type': authenticated ? 'OAuth2Session' : '',
       'x-twitter-active-user': 'yes',
       'x-twitter-client-language': 'en',
       'Content-Type': 'application/json',
     }
   
5. setCsrfToken(token) → void
   - Set from ct0 cookie after login

6. isGuestTokenValid() → boolean
   - Check if guest token exists and hasn't expired

7. invalidateGuestToken() → void
   - Set guestToken to null, force refresh on next request

This is a real implementation. Guest tokens are rate-limited: if you get a 403 or 429, invalidate and get a new one. The bearer token never changes.
```

### Prompt 14: Scraper Integration with Existing MCP Server

```
Update src/mcp/local-tools.js to add tools that use the new Scraper class alongside existing Puppeteer tools.

Read the existing local-tools.js first to understand the tool registration pattern.

Add these new MCP tools that use the HTTP-only Scraper (faster, no browser needed):

1. x_client_get_profile — Get a user's profile using the HTTP client
   - Input: { username: string }
   - Creates a Scraper instance, loads saved cookies if available, calls getProfile()

2. x_client_get_tweet — Get a single tweet by ID
   - Input: { tweetId: string }

3. x_client_search — Search tweets
   - Input: { query: string, count: number, mode: string }
   - Uses searchTweets generator, collects results up to count

4. x_client_send_tweet — Post a tweet
   - Input: { text: string }
   - Requires saved auth cookies

5. x_client_get_followers — Get a user's followers
   - Input: { username: string, count: number }

6. x_client_get_trends — Get trending topics
   - Input: {}

Add a helper function at the top that creates and authenticates a Scraper instance:
async function getAuthenticatedScraper() {
  const scraper = new Scraper();
  const cookiePath = path.join(os.homedir(), '.xactions', 'cookies.json');
  if (await fileExists(cookiePath)) {
    await scraper.loadCookies(cookiePath);
  }
  return scraper;
}

These tools provide a faster path than the Puppeteer-based existing tools (no browser launch needed). Mark them with a description noting they use the HTTP client.
```

### Prompt 15: CLI Integration

```
Update src/cli/index.js to add commands that use the new Scraper class.

Read the existing CLI file to understand the Commander.js command pattern.

Add these new commands under a "client" command group:

1. xactions client login
   - Prompts for username, password, email using inquirer
   - Creates Scraper, calls login(), saves cookies to ~/.xactions/cookies.json
   - Prints success message with authenticated username

2. xactions client profile <username>
   - Loads cookies, creates Scraper, calls getProfile()
   - Prints formatted profile info (name, bio, followers, following, etc.)

3. xactions client tweet <tweetId>
   - Gets and displays a single tweet

4. xactions client search <query> --count 20 --mode Latest
   - Searches tweets, displays results in formatted table

5. xactions client post "<text>"
   - Posts a tweet, displays the created tweet URL

6. xactions client followers <username> --count 100
   - Lists followers

7. xactions client trends
   - Shows current trending topics

8. xactions client whoami
   - Shows authenticated user profile (calls me())

Each command:
- Uses ora for spinners during network requests
- Uses chalk for colored output
- Handles errors gracefully (not logged in, user not found, rate limited)
- Prints results in a clean, readable format

These complement the existing Puppeteer-based CLI commands, offering faster execution for operations that don't need a browser.
```

---

## Validation

After all 15 prompts are complete, verify:

```bash
# Import test
node -e "import { Scraper, SearchMode, Tweet, Profile } from './src/client/index.js'; console.log('✅ Client module loads')"

# Scraper instantiation
node -e "import { Scraper } from './src/client/index.js'; const s = new Scraper(); console.log('✅ Scraper creates', typeof s.getProfile)"

# Package export
node -e "import { Scraper } from './src/index.js'; console.log('✅ Root export works')"

# CLI commands registered
node src/cli/index.js client --help

# Type definitions exist
grep -c "class Scraper" types/index.d.ts
```
