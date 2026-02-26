# Track 07 — Twitter API v2 Hybrid

> Add optional Twitter API v2 endpoint support to the Scraper class. v2 gives access to features unavailable via the internal GraphQL API: polls creation, advanced analytics, space management, filtered stream, and user lookup by ID batch. v2 requires developer API keys (opt-in), while the core Scraper continues to work without them. This is what `agent-twitter-client` provides.

---

## Research Before Starting

```
src/client/Scraper.js                — Main class (Track 01) — v2 methods mount here
src/client/http/HttpClient.js        — HTTP client (Track 03) — reused for v2 calls
src/client/auth/TokenManager.js      — Bearer token management (Track 02)
src/client/api/graphqlQueries.js     — GraphQL endpoint registry pattern to extend
src/client/models/Tweet.js           — Tweet model needs v2 field extensions
src/client/models/Profile.js         — Profile model needs v2 field extensions
src/mcp/local-tools.js               — MCP tools to add v2 tools
src/cli/index.js                     — CLI commands to add v2 commands
```

Study competitor v2 implementations:
- `agent-twitter-client` — optional v2 bearer token, polls, timeline management
- Twitter API v2 docs — https://developer.x.com/en/docs/twitter-api

### Twitter API v2 Overview

Twitter API v2 uses OAuth 2.0 Bearer (app-only) or OAuth 2.0 PKCE (user context):

```
Base URL: https://api.x.com/2/

Authentication:
- App-only: Bearer token from developer portal (different from the public one)
- User context: OAuth 2.0 with PKCE flow

Key v2 endpoints:
GET    /2/tweets/:id                        → Single tweet with expansions
GET    /2/tweets                             → Multiple tweets by ID
GET    /2/tweets/search/recent               → Search recent tweets (7 days)
GET    /2/tweets/search/all                  → Full-archive search (Academic)
GET    /2/tweets/counts/recent               → Tweet count for query
POST   /2/tweets                             → Create tweet (with poll)
DELETE /2/tweets/:id                         → Delete tweet
GET    /2/users/:id                          → User by ID
GET    /2/users/by/username/:username        → User by username
GET    /2/users                              → Multiple users by ID
GET    /2/users/:id/followers                → Followers list
GET    /2/users/:id/following                → Following list
POST   /2/users/:id/following                → Follow user
DELETE /2/users/:source_user_id/following/:target_user_id → Unfollow
GET    /2/users/:id/tweets                   → User timeline
GET    /2/users/:id/mentions                 → User mentions
POST   /2/users/:id/likes                    → Like tweet
DELETE /2/users/:id/likes/:tweet_id          → Unlike
POST   /2/users/:id/retweets                 → Retweet
DELETE /2/users/:id/retweets/:tweet_id       → Unretweet
GET    /2/spaces/:id                         → Space by ID
GET    /2/spaces/search                      → Search spaces
POST   /2/dm_conversations/:id/messages      → Send DM
GET    /2/dm_events                          → DM events

v2 features unavailable in GraphQL internal API:
- Poll creation in tweets (via POST /2/tweets with poll object)
- Filtered stream (real-time matching tweets)
- Tweet counts / volume
- Batch lookup (up to 100 IDs)
- Full-archive search (Academic access)
- Space buyer/speaker management
```

---

## Architecture

```
src/client/api/v2/
  V2Client.js         ← Main v2 client class
  auth.js             ← OAuth 2.0 app-only + PKCE authentication for v2
  tweets.js           ← v2 tweet operations
  users.js            ← v2 user operations
  polls.js            ← Poll creation and management
  spaces.js           ← Twitter Spaces operations
  analytics.js        ← Tweet counts, impressions, engagement metrics
  streams.js          ← Filtered stream (real-time)
  lists.js            ← v2 list endpoints
  dms.js              ← v2 DM endpoints
  index.js            ← Re-exports
```

The v2 module is accessed via `scraper.v2.*` — it's a namespaced extension that doesn't pollute the core Scraper API. Users who don't need v2 never import it.

---

## Prompts

### Prompt 1: V2 Client Core

```
Create src/client/api/v2/V2Client.js.

The v2 client handles authentication, requests, and response parsing for Twitter API v2.

Export class V2Client:

Properties:
- _apiKey: string — Twitter API key (from developer portal)
- _apiSecret: string — Twitter API secret
- _bearerToken: string — app-only OAuth 2.0 bearer token
- _accessToken: string|null — user context access token
- _http: HttpClient reference
- _baseUrl: string — 'https://api.x.com/2'
- _expansions: default expansion fields for all requests
- _tweetFields: default tweet fields
- _userFields: default user fields

Constructor(options):
- options.apiKey, options.apiSecret — developer portal credentials
- options.bearerToken — pre-obtained app-only token (skips token request)
- options.accessToken — user-context token (for write operations)
- options.http — HttpClient instance to reuse

Methods:

1. async authenticate() → void
   - If bearerToken provided, use it directly
   - Otherwise: POST https://api.x.com/oauth2/token
     Body: grant_type=client_credentials
     Authorization: Basic base64(apiKey:apiSecret)
   - Store received bearer token

2. async request(method, path, options = {}) → object
   - Make authenticated v2 API request
   - path is relative to base URL: '/tweets/1234567890'
   - options.params: query parameters
   - options.body: JSON body for POST/PUT
   - options.expansions: override default expansions
   - options.tweetFields, options.userFields: override defaults
   - Automatically adds expansion and field query params
   - Handles pagination via 'next_token' in response.meta
   - Returns parsed JSON response

3. async *paginate(method, path, options = {}) → AsyncGenerator
   - Auto-paginate v2 responses using next_token
   - Yield individual items from response.data array
   - options.maxResults: items per page (10-100)
   - options.limit: total items to return

4. getDefaultExpansions() → object
   - Return standard expansion params:
     { 'tweet.fields': 'attachments,author_id,created_at,entities,geo,id,in_reply_to_user_id,lang,public_metrics,referenced_tweets,source,text,withheld',
       'user.fields': 'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,withheld',
       'expansions': 'author_id,referenced_tweets.id,attachments.media_keys,attachments.poll_ids',
       'media.fields': 'duration_ms,height,media_key,preview_image_url,type,url,width,alt_text',
       'poll.fields': 'duration_minutes,end_datetime,id,options,voting_status',
       'place.fields': 'contained_within,country,country_code,full_name,geo,id,name,place_type' }

5. isAvailable() → boolean
   - Return true if v2 credentials are configured

JSDoc on every method. ESM export. @author nich (@nichxbt). @license MIT.
```

### Prompt 2: V2 Authentication — OAuth 2.0 App-Only + PKCE

```
Create src/client/api/v2/auth.js.

Implement OAuth 2.0 authentication methods for Twitter API v2.

Export:

1. async function getAppOnlyBearerToken(apiKey, apiSecret, http) → string
   - POST https://api.x.com/oauth2/token
   - Authorization: Basic base64(encodeURIComponent(apiKey):encodeURIComponent(apiSecret))
   - Content-Type: application/x-www-form-urlencoded
   - Body: grant_type=client_credentials
   - Response: { token_type: "bearer", access_token: "AAAA..." }
   - Return access_token

2. function generateCodeVerifier() → string
   - Generate random 128-character code verifier for PKCE
   - Characters: A-Z, a-z, 0-9, -, ., _, ~
   - Use crypto.randomBytes(96).toString('base64url')

3. async function generateCodeChallenge(verifier) → string
   - SHA-256 hash of verifier, base64url encoded
   - Use crypto.createHash('sha256').update(verifier).digest('base64url')

4. function buildAuthorizationUrl(options) → { url: string, state: string, codeVerifier: string }
   - Build OAuth 2.0 authorization URL for user context:
     https://twitter.com/i/oauth2/authorize?
       response_type=code&
       client_id={clientId}&
       redirect_uri={redirectUri}&
       scope={scopes.join(' ')}&
       state={random}&
       code_challenge={challenge}&
       code_challenge_method=S256
   - Return URL, state (for CSRF), and code verifier (for token exchange)
   - Default scopes: ['tweet.read', 'tweet.write', 'users.read', 'follows.read', 'follows.write', 'like.read', 'like.write', 'offline.access']

5. async function exchangeCodeForToken(code, codeVerifier, clientId, redirectUri, http) → { accessToken, refreshToken, expiresIn, scope }
   - POST https://api.x.com/2/oauth2/token
   - Body: code, grant_type=authorization_code, client_id, redirect_uri, code_verifier
   - Return tokens

6. async function refreshAccessToken(refreshToken, clientId, http) → { accessToken, refreshToken, expiresIn }
   - POST https://api.x.com/2/oauth2/token
   - Body: refresh_token, grant_type=refresh_token, client_id
   - Return new tokens

7. async function revokeToken(token, clientId, clientSecret, http) → void
   - POST https://api.x.com/2/oauth2/revoke
   - Body: token, client_id

All use the standard OAuth 2.0 RFC 6749 / RFC 7636 (PKCE) flows.
No external dependencies — pure Node.js crypto and fetch.
```

### Prompt 3: V2 Tweets API

```
Create src/client/api/v2/tweets.js.

Implement Twitter API v2 tweet operations.

Import V2Client, Tweet model.

Export:

1. async function getTweetV2(v2, tweetId) → Tweet
   - GET /2/tweets/{tweetId}
   - With standard expansions and fields
   - Parse response into Tweet model (add v2-specific fields)

2. async function getTweetsV2(v2, tweetIds) → Tweet[]
   - GET /2/tweets?ids={comma-separated, max 100}
   - Batch lookup — much more efficient than individual requests

3. async function createTweetV2(v2, text, options = {}) → Tweet
   - POST /2/tweets
   - Body: { text }
   - options.reply → { reply: { in_reply_to_tweet_id: id } }
   - options.quote → { quote_tweet_id: id }
   - options.poll → { poll: { options: [...], duration_minutes: N } }
   - options.media → { media: { media_ids: [...], tagged_user_ids: [...] } }
   - options.geo → { geo: { place_id: id } }
   - options.directMessageDeepLink → { direct_message_deep_link: url }
   - options.forSuperFollowersOnly → { for_super_followers_only: true }

4. async function deleteTweetV2(v2, tweetId) → void
   - DELETE /2/tweets/{tweetId}

5. async function* searchRecentTweetsV2(v2, query, options = {}) → AsyncGenerator<Tweet>
   - GET /2/tweets/search/recent 
   - query: search query (max 512 chars)
   - options.startTime, options.endTime: ISO 8601 timestamps
   - options.sinceId, options.untilId: tweet ID boundaries
   - options.maxResults: 10-100 per page
   - options.limit: total results to return
   - Paginate via next_token

6. async function* searchAllTweetsV2(v2, query, options = {}) → AsyncGenerator<Tweet>
   - GET /2/tweets/search/all (requires Academic access)
   - Same params as recent but full archive

7. async function getTweetCountsV2(v2, query, options = {}) → { totalCount, data: Array<{start, end, count}> }
   - GET /2/tweets/counts/recent
   - Returns binned counts (hourly/daily/weekly)
   - options.granularity: 'minute' | 'hour' | 'day'

8. async function likeTweetV2(v2, userId, tweetId) → void
   - POST /2/users/{userId}/likes
   - Body: { tweet_id: tweetId }

9. async function unlikeTweetV2(v2, userId, tweetId) → void
   - DELETE /2/users/{userId}/likes/{tweetId}

10. async function retweetV2(v2, userId, tweetId) → void
    - POST /2/users/{userId}/retweets
    - Body: { tweet_id: tweetId }

11. async function unretweetV2(v2, userId, tweetId) → void
    - DELETE /2/users/{userId}/retweets/{tweetId}

12. async function getBookmarksV2(v2, userId, options = {}) → AsyncGenerator<Tweet>
    - GET /2/users/{userId}/bookmarks
    - Paginate with next_token

13. async function addBookmarkV2(v2, userId, tweetId) → void
    - POST /2/users/{userId}/bookmarks
    - Body: { tweet_id: tweetId }

14. async function removeBookmarkV2(v2, userId, tweetId) → void
    - DELETE /2/users/{userId}/bookmarks/{tweetId}

All functions use v2.request() for auth and error handling.
Support v2 error format: { errors: [{ title, detail, type }], status }
```

### Prompt 4: V2 Users API

```
Create src/client/api/v2/users.js.

Implement Twitter API v2 user operations.

Export:

1. async function getUserV2(v2, userId) → Profile
   - GET /2/users/{userId}

2. async function getUserByUsernameV2(v2, username) → Profile
   - GET /2/users/by/username/{username}

3. async function getUsersV2(v2, userIds) → Profile[]
   - GET /2/users?ids={comma-separated, max 100}
   - Batch lookup

4. async function getUsersByUsernamesV2(v2, usernames) → Profile[]
   - GET /2/users/by?usernames={comma-separated, max 100}

5. async function* getFollowersV2(v2, userId, options = {}) → AsyncGenerator<Profile>
   - GET /2/users/{userId}/followers
   - Paginate with pagination_token

6. async function* getFollowingV2(v2, userId, options = {}) → AsyncGenerator<Profile>
   - GET /2/users/{userId}/following

7. async function followUserV2(v2, sourceUserId, targetUserId) → { following: boolean, pendingFollow: boolean }
   - POST /2/users/{sourceUserId}/following
   - Body: { target_user_id: targetUserId }

8. async function unfollowUserV2(v2, sourceUserId, targetUserId) → void
   - DELETE /2/users/{sourceUserId}/following/{targetUserId}

9. async function* getUserMentionsV2(v2, userId, options = {}) → AsyncGenerator<Tweet>
   - GET /2/users/{userId}/mentions

10. async function* getUserTweetsV2(v2, userId, options = {}) → AsyncGenerator<Tweet>
    - GET /2/users/{userId}/tweets
    - options.exclude: 'retweets' | 'replies' | ['retweets', 'replies']

11. async function muteUserV2(v2, sourceUserId, targetUserId) → void
    - POST /2/users/{sourceUserId}/muting
    - Body: { target_user_id: targetUserId }

12. async function unmuteUserV2(v2, sourceUserId, targetUserId) → void
    - DELETE /2/users/{sourceUserId}/muting/{targetUserId}

13. async function blockUserV2(v2, sourceUserId, targetUserId) → void
    - POST /2/users/{sourceUserId}/blocking
    - Body: { target_user_id: targetUserId }

14. async function unblockUserV2(v2, sourceUserId, targetUserId) → void
    - DELETE /2/users/{sourceUserId}/blocking/{targetUserId}
```

### Prompt 5: V2 Polls API

```
Create src/client/api/v2/polls.js.

Poll creation is a key v2 feature unavailable via GraphQL internal API.

Export:

1. async function createPoll(v2, question, options, durationMinutes = 1440) → Tweet
   - POST /2/tweets
   - Body: {
       text: question,
       poll: {
         options: options.map(opt => opt),  // max 4 choices, each max 25 chars
         duration_minutes: durationMinutes   // 5 to 10080 (7 days)
       }
     }
   - Validates: 2-4 options, each 1-25 chars, duration 5-10080 minutes
   - Returns created tweet with poll data

2. async function getPoll(v2, pollId) → { id, options, votingStatus, endDatetime, durationMinutes }
   - Polls are accessed as tweet expansions
   - GET /2/tweets/{tweetId}?expansions=attachments.poll_ids&poll.fields=...
   - Parse poll from includes.polls

3. async function getPollResults(v2, tweetId) → { options: Array<{label, votes, percentage}>, totalVotes, endDatetime }
   - Get tweet with poll expansion
   - Calculate percentages from vote counts

4. function validatePollOptions(options) → { valid: boolean, errors: string[] }
   - 2-4 options required
   - Each option 1-25 characters
   - No duplicate options
   - Return validation result

5. function validatePollDuration(minutes) → { valid: boolean, error: string|null }
   - Minimum: 5 minutes
   - Maximum: 10080 minutes (7 days)

Integration with Scraper.v2:
  scraper.v2.createPoll('Best language?', ['JavaScript', 'Python', 'Rust', 'Go'], 1440)
  → Creates a tweet with a 24-hour poll
```

### Prompt 6: V2 Spaces API

```
Create src/client/api/v2/spaces.js.

Twitter Spaces operations via the v2 API.

Export:

1. async function getSpace(v2, spaceId) → Space
   - GET /2/spaces/{spaceId}
   - Fields: host_ids, created_at, creator_id, id, lang, invited_user_ids,
     participant_count, speaker_ids, started_at, ended_at, subscriber_count,
     topic_ids, state, title, updated_at, scheduled_start, is_ticketed

2. async function getSpaces(v2, spaceIds) → Space[]
   - GET /2/spaces?ids={comma-separated, max 100}

3. async function* searchSpaces(v2, query, options = {}) → AsyncGenerator<Space>
   - GET /2/spaces/search?query={query}
   - options.state: 'live' | 'scheduled' | 'all'

4. async function getSpaceBuyers(v2, spaceId) → Profile[]
   - GET /2/spaces/{spaceId}/buyers
   - For ticketed spaces

5. async function getSpaceTweets(v2, spaceId) → Tweet[]
   - GET /2/spaces/{spaceId}/tweets
   - Tweets shared in a space

Create model src/client/models/Space.js:
- id, state ('live' | 'scheduled' | 'ended'), title, hostIds, creatorId
- participantCount, speakerIds, subscriberCount
- startedAt, endedAt, scheduledStart, createdAt, updatedAt
- lang, invitedUserIds, topicIds, isTicketed

Space.fromV2(raw) factory method.
```

### Prompt 7: V2 Analytics and Insights

```
Create src/client/api/v2/analytics.js.

Analytics endpoints for tweet performance and engagement metrics.

Export:

1. async function getTweetMetrics(v2, tweetIds) → Array<{id, publicMetrics, nonPublicMetrics, organicMetrics}>
   - GET /2/tweets?ids={ids}&tweet.fields=public_metrics,non_public_metrics,organic_metrics
   - public_metrics: { retweet_count, reply_count, like_count, quote_count, bookmark_count, impression_count }
   - non_public_metrics: { impression_count, url_link_clicks, user_profile_clicks } (requires owner auth)
   - organic_metrics: same as non_public but organic-only (no promoted)

2. async function* getTimeline(v2, userId, options = {}) → AsyncGenerator<{ tweet, metrics }>
   - GET /2/users/{userId}/tweets with metric fields
   - Yields tweets with engagement metrics

3. async function getEngagementRate(v2, tweetIds) → Array<{id, engagementRate, impressions, engagements}>
   - Fetch tweets with metrics
   - Calculate engagement rate: (likes + retweets + replies + quotes) / impressions * 100

4. async function getFollowerGrowth(v2, userId, options = {}) → { current, history }
   - Get current follower count
   - If historical data available (from stored snapshots), calculate growth

5. async function getTopTweets(v2, userId, options = {}) → Tweet[]
   - Fetch recent tweets, sort by engagement rate
   - options.metric: 'likes' | 'retweets' | 'replies' | 'engagement_rate'
   - options.period: '7d' | '30d' | '90d'

6. async function getBestPostingTimes(v2, userId) → Array<{ hour, dayOfWeek, avgEngagement }>
   - Analyze recent tweets' posting times vs engagement
   - Return optimal posting windows

7. async function getAudienceOverlap(v2, userId1, userId2) → { overlap: number, user1Only: number, user2Only: number }
   - Compare followers between two users
   - Note: expensive operation (fetches all followers)

These analytics functions process v2 response data and return higher-level insights. Some require user-context auth (non-public metrics).
```

### Prompt 8: V2 Filtered Stream (Real-Time)

```
Create src/client/api/v2/streams.js.

Twitter's filtered stream provides real-time tweet delivery matching rules.

Export:

1. async function addStreamRules(v2, rules) → { created: number, valid: boolean, ids: string[] }
   - POST /2/tweets/search/stream/rules
   - Body: { add: rules.map(r => ({ value: r.query, tag: r.tag })) }
   - rules: [{ query: 'from:elonmusk', tag: 'elon-tweets' }]
   - Max 25 rules for Basic, 1000 for Pro

2. async function deleteStreamRules(v2, ruleIds) → { deleted: number }
   - POST /2/tweets/search/stream/rules
   - Body: { delete: { ids: ruleIds } }

3. async function getStreamRules(v2) → Array<{ id, value, tag }>
   - GET /2/tweets/search/stream/rules

4. async function* connectStream(v2, options = {}) → AsyncGenerator<Tweet>
   - GET /2/tweets/search/stream (streaming endpoint)
   - Opens persistent HTTP connection
   - Yields tweets as they arrive in real time
   - options.expansions, options.tweetFields, options.userFields
   - options.backfillMinutes: 1-5 (recover missed tweets — requires Pro)
   - Handle connection drops with automatic reconnect
   - Use exponential backoff for reconnection (start 1s, max 16s)
   - Parse newline-delimited JSON response

5. async function disconnectStream(v2) → void
   - Close the streaming connection
   - Abort the fetch request

6. function validateStreamRule(rule) → { valid: boolean, errors: string[] }
   - Validate rule syntax (operators, length limits)
   - Max rule length: 512 chars (Basic), 1024 (Pro)

Implementation details:
- Use AbortController to manage stream connection lifecycle
- Parse Server-Sent Events format (newline-delimited JSON)
- Emit heartbeat events (empty lines sent every ~20 seconds)
- Handle HTTP 429 (rate limit) with proper backoff
- Handle HTTP 503 (service unavailable) with reconnection

Integration:
  for await (const tweet of scraper.v2.stream({ rules: [{ query: 'from:elonmusk' }] })) {
    console.log(tweet.text);
  }
```

### Prompt 9: V2 Lists and DMs

```
Create src/client/api/v2/lists.js and src/client/api/v2/dms.js.

lists.js exports:

1. async function createListV2(v2, name, description, isPrivate) → { id, name }
   - POST /2/lists
   - Body: { name, description, private: isPrivate }

2. async function deleteListV2(v2, listId) → void
   - DELETE /2/lists/{listId}

3. async function updateListV2(v2, listId, { name, description, isPrivate }) → void
   - PUT /2/lists/{listId}

4. async function addListMemberV2(v2, listId, userId) → void
   - POST /2/lists/{listId}/members
   - Body: { user_id: userId }

5. async function removeListMemberV2(v2, listId, userId) → void
   - DELETE /2/lists/{listId}/members/{userId}

6. async function* getListMembersV2(v2, listId) → AsyncGenerator<Profile>
   - GET /2/lists/{listId}/members

7. async function* getListTweetsV2(v2, listId) → AsyncGenerator<Tweet>
   - GET /2/lists/{listId}/tweets

8. async function followListV2(v2, userId, listId) → void
   - POST /2/users/{userId}/followed_lists
   - Body: { list_id: listId }

9. async function unfollowListV2(v2, userId, listId) → void
   - DELETE /2/users/{userId}/followed_lists/{listId}

10. async function pinListV2(v2, userId, listId) → void
    - POST /2/users/{userId}/pinned_lists
    - Body: { list_id: listId }

dms.js exports:

1. async function sendDmV2(v2, participantId, text, options = {}) → { eventId }
   - POST /2/dm_conversations/with/{participantId}/messages
   - Body: { text, attachments?: [{ media_id }] }

2. async function sendGroupDmV2(v2, conversationId, text) → { eventId }
   - POST /2/dm_conversations/{conversationId}/messages

3. async function createDmConversationV2(v2, participantIds, text) → { conversationId, eventId }
   - POST /2/dm_conversations
   - Body: { conversation_type: 'Group', participant_ids: [...], message: { text } }

4. async function* getDmEventsV2(v2, options = {}) → AsyncGenerator<DmEvent>
   - GET /2/dm_events
   - options.dmEventFields: 'id,text,event_type,created_at,sender_id,participant_ids,referenced_tweets,attachments'

5. async function* getDmConversationEventsV2(v2, conversationId) → AsyncGenerator<DmEvent>
   - GET /2/dm_conversations/{conversationId}/dm_events

Create model if needed: DmEvent { id, text, eventType, senderId, createdAt, attachments }
```

### Prompt 10: V2 Client Integration with Scraper

```
Create src/client/api/v2/index.js that re-exports all v2 modules.

Then create a V2 facade that mounts on Scraper.

Update src/client/api/v2/V2Client.js to add convenience methods that delegate to the individual modules:

class V2Client {
  // ... constructor, authenticate, request from Prompt 1 ...

  // Tweets
  async getTweet(id) { return getTweetV2(this, id); }
  async getTweets(ids) { return getTweetsV2(this, ids); }
  async createTweet(text, options) { return createTweetV2(this, text, options); }
  async deleteTweet(id) { return deleteTweetV2(this, id); }
  async *searchRecent(query, options) { yield* searchRecentTweetsV2(this, query, options); }
  async getTweetCounts(query, options) { return getTweetCountsV2(this, query, options); }

  // Polls
  async createPoll(question, options, duration) { return createPoll(this, question, options, duration); }
  async getPollResults(tweetId) { return getPollResults(this, tweetId); }

  // Users
  async getUser(userId) { return getUserV2(this, userId); }
  async getUserByUsername(username) { return getUserByUsernameV2(this, username); }
  async *getFollowers(userId, options) { yield* getFollowersV2(this, userId, options); }
  async *getFollowing(userId, options) { yield* getFollowingV2(this, userId, options); }

  // Spaces
  async getSpace(id) { return getSpace(this, id); }
  async *searchSpaces(query, options) { yield* searchSpaces(this, query, options); }

  // Analytics
  async getTweetMetrics(tweetIds) { return getTweetMetrics(this, tweetIds); }
  async getEngagementRate(tweetIds) { return getEngagementRate(this, tweetIds); }
  async getTopTweets(userId, options) { return getTopTweets(this, userId, options); }

  // Stream
  async *stream(options) { yield* connectStream(this, options); }
  async addStreamRules(rules) { return addStreamRules(this, rules); }
  async deleteStreamRules(ids) { return deleteStreamRules(this, ids); }

  // Lists
  async createList(name, desc, isPrivate) { return createListV2(this, name, desc, isPrivate); }
  async *getListTweets(listId) { yield* getListTweetsV2(this, listId); }

  // DMs
  async sendDm(userId, text) { return sendDmV2(this, userId, text); }
}

Update src/client/Scraper.js:
- Import V2Client
- In constructor: if options.v2 (containing apiKey/apiSecret), create V2Client
- Expose as this.v2 property (lazy — instantiated on first access)
- If v2 not configured, accessing scraper.v2 throws: 'Twitter API v2 requires apiKey and apiSecret. Pass them in Scraper options.'
```

### Prompt 11: V2 Response Parser

```
Create src/client/api/v2/parsers.js.

Twitter API v2 responses use a different format than the internal GraphQL API. The data comes in a normalized shape with includes for referenced objects.

Export:

1. function parseV2Tweet(data, includes = {}) → Tweet
   - data: { id, text, created_at, author_id, public_metrics, entities, ... }
   - includes: { users: [...], tweets: [...], media: [...], polls: [...] }
   - Resolve author from includes.users by author_id
   - Resolve referenced tweets (retweet, quote, reply) from includes.tweets
   - Resolve media from includes.media by attachments.media_keys
   - Resolve polls from includes.polls by attachments.poll_ids
   - Map to existing Tweet model (same model used by GraphQL and v2)

2. function parseV2User(data, includes = {}) → Profile
   - data: { id, name, username, created_at, public_metrics, description, ... }
   - Map to existing Profile model

3. function parseV2Response(response) → { data, includes, meta, errors }
   - Normalize v2 response shape
   - Handle single object (response.data is object) and array (response.data is array)
   - Resolve includes map: { usersMap, tweetsMap, mediaMap, pollsMap }

4. function resolveIncludes(data, includes) → void
   - In-place resolve: replace IDs with full objects where possible
   - e.g., tweet.author_id → tweet.author = includes.users.find(...)

5. function parseV2Error(response) → { title, detail, type, status }
   - Parse v2 error format
   - Map to ScraperError subclasses

6. function parseV2Pagination(meta) → { nextToken, previousToken, resultCount }
   - Extract pagination info from response.meta

7. function mergeV2andGraphQL(v2Tweet, graphqlTweet) → Tweet
   - For cases where both APIs are used, merge v2-only fields (metrics) with GraphQL-only fields (views, bookmark count)
```

### Prompt 12: V2 TypeScript Type Definitions

```
Update types/index.d.ts with v2-specific type definitions.

Add these interfaces:

export interface V2Options {
  apiKey: string;
  apiSecret: string;
  bearerToken?: string;
  accessToken?: string;
}

export interface V2TweetCreateOptions {
  reply?: { in_reply_to_tweet_id: string };
  quote?: string;
  poll?: { options: string[]; duration_minutes: number };
  media?: { media_ids: string[]; tagged_user_ids?: string[] };
  geo?: { place_id: string };
  forSuperFollowersOnly?: boolean;
}

export interface V2SearchOptions {
  startTime?: string;
  endTime?: string;
  sinceId?: string;
  untilId?: string;
  maxResults?: number;
  limit?: number;
}

export interface TweetCounts {
  totalCount: number;
  data: Array<{ start: string; end: string; tweetCount: number }>;
}

export interface TweetMetrics {
  id: string;
  publicMetrics: { retweetCount: number; replyCount: number; likeCount: number; quoteCount: number; bookmarkCount: number; impressionCount: number };
  nonPublicMetrics?: { impressionCount: number; urlLinkClicks: number; userProfileClicks: number };
  organicMetrics?: { impressionCount: number; urlLinkClicks: number; userProfileClicks: number };
}

export interface Space {
  id: string;
  state: 'live' | 'scheduled' | 'ended';
  title: string;
  hostIds: string[];
  creatorId: string;
  participantCount: number;
  speakerIds: string[];
  subscriberCount: number;
  startedAt: Date | null;
  endedAt: Date | null;
  scheduledStart: Date | null;
  lang: string;
  isTicketed: boolean;
}

export interface StreamRule {
  query: string;
  tag?: string;
}

export interface DmEvent {
  id: string;
  text: string;
  eventType: string;
  senderId: string;
  createdAt: Date;
  attachments?: Array<{ mediaId: string }>;
}

export class V2Client {
  constructor(options: V2Options);
  authenticate(): Promise<void>;
  isAvailable(): boolean;

  // Tweets
  getTweet(id: string): Promise<Tweet>;
  getTweets(ids: string[]): Promise<Tweet[]>;
  createTweet(text: string, options?: V2TweetCreateOptions): Promise<Tweet>;
  deleteTweet(id: string): Promise<void>;
  searchRecent(query: string, options?: V2SearchOptions): AsyncGenerator<Tweet>;
  searchAll(query: string, options?: V2SearchOptions): AsyncGenerator<Tweet>;
  getTweetCounts(query: string, options?: { granularity?: 'minute' | 'hour' | 'day' }): Promise<TweetCounts>;

  // Polls
  createPoll(question: string, options: string[], durationMinutes?: number): Promise<Tweet>;
  getPollResults(tweetId: string): Promise<{ options: Array<{ label: string; votes: number; percentage: number }>; totalVotes: number }>;

  // Users
  getUser(userId: string): Promise<Profile>;
  getUserByUsername(username: string): Promise<Profile>;
  getFollowers(userId: string, options?: { limit?: number }): AsyncGenerator<Profile>;
  getFollowing(userId: string, options?: { limit?: number }): AsyncGenerator<Profile>;

  // Spaces
  getSpace(id: string): Promise<Space>;
  searchSpaces(query: string, options?: { state?: 'live' | 'scheduled' | 'all' }): AsyncGenerator<Space>;

  // Analytics
  getTweetMetrics(tweetIds: string[]): Promise<TweetMetrics[]>;
  getEngagementRate(tweetIds: string[]): Promise<Array<{ id: string; engagementRate: number }>>;

  // Stream
  stream(options?: { rules?: StreamRule[] }): AsyncGenerator<Tweet>;
  addStreamRules(rules: StreamRule[]): Promise<{ created: number }>;
  deleteStreamRules(ids: string[]): Promise<{ deleted: number }>;

  // Lists
  createList(name: string, description?: string, isPrivate?: boolean): Promise<{ id: string; name: string }>;
  getListTweets(listId: string): AsyncGenerator<Tweet>;

  // DMs
  sendDm(userId: string, text: string): Promise<{ eventId: string }>;
}

export interface ScraperOptions {
  // ... existing options ...
  v2?: V2Options;
}
```

### Prompt 13: V2 MCP Tools

```
Update src/mcp/local-tools.js to add v2 MCP tools.

Add these tools (only available when v2 is configured):

1. x_v2_create_poll — Create a tweet with a poll
   Input: { question: string, options: string[], durationMinutes?: number }
   - Use scraper.v2.createPoll()
   - Return created tweet with poll data

2. x_v2_search — Search tweets with v2 (more structured results)
   Input: { query: string, count: number, startTime?: string, endTime?: string }
   - Use scraper.v2.searchRecent()

3. x_v2_tweet_metrics — Get engagement metrics for tweets
   Input: { tweetIds: string[] }
   - Use scraper.v2.getTweetMetrics()

4. x_v2_tweet_counts — Get tweet volume for a query
   Input: { query: string, granularity?: string }
   - Use scraper.v2.getTweetCounts()

5. x_v2_stream_rules — Manage filtered stream rules
   Input: { action: 'list' | 'add' | 'delete', rules?: object[], ruleIds?: string[] }

6. x_v2_spaces_search — Search Twitter Spaces
   Input: { query: string, state?: string }
   - Use scraper.v2.searchSpaces()

Helper:
async function getV2Client() {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('v2 tools require TWITTER_API_KEY and TWITTER_API_SECRET env vars');
  const v2 = new V2Client({ apiKey, apiSecret });
  await v2.authenticate();
  return v2;
}

Each tool should check v2 availability and return a helpful error if credentials not configured.
```

### Prompt 14: V2 CLI Commands

```
Update src/cli/index.js to add v2 commands.

Add a 'v2' command group:

1. xactions v2 search <query> --count 20 --start-time 2026-01-01 --end-time 2026-01-31
   - Search with v2 API (more granular than internal API)
   - Display results with engagement metrics

2. xactions v2 poll "<question>" --options "JS,Python,Rust" --duration 1440
   - Create a tweet with a poll
   - Display created tweet URL

3. xactions v2 metrics <tweetId1> [tweetId2] [tweetId3]
   - Get engagement metrics for one or more tweets
   - Display in table format: impressions, likes, retweets, replies, engagement rate

4. xactions v2 counts <query> --granularity hour
   - Get tweet volume for a query
   - Display histogram or bar chart in terminal

5. xactions v2 stream --rule "from:elonmusk" --tag "elon"
   - Connect to filtered stream
   - Display tweets as they arrive
   - Ctrl+C to disconnect

6. xactions v2 spaces <query> --state live
   - Search for Twitter Spaces
   - Display results with participant count and state

7. xactions v2 setup
   - Interactive setup for v2 API credentials
   - Prompt for API key and secret
   - Test authentication
   - Save to ~/.xactions/config.json

All v2 commands require TWITTER_API_KEY and TWITTER_API_SECRET.
Show helpful setup instructions if credentials missing.
Use chalk for colored output, ora for spinners.
```

### Prompt 15: V2 Tests

```
Create tests/client/v2.test.js using vitest.

Create test fixtures at tests/fixtures/v2-responses/:
- v2-tweet.json — single tweet response with includes
- v2-tweets.json — multiple tweets response
- v2-search.json — search results with pagination
- v2-user.json — single user response
- v2-poll.json — tweet with poll data
- v2-space.json — space response
- v2-metrics.json — tweet metrics response
- v2-error.json — v2 error response

Tests (20+):

V2Client:
1. constructor stores credentials
2. authenticate() makes correct OAuth 2.0 request
3. request() adds correct Authorization header
4. request() adds expansion and field params
5. paginate() follows next_token
6. isAvailable() returns true when configured, false otherwise

V2 Parsers:
7. parseV2Tweet maps id, text, created_at, public_metrics correctly
8. parseV2Tweet resolves author from includes
9. parseV2Tweet resolves referenced tweets (retweet, quote)
10. parseV2Tweet resolves media attachments
11. parseV2User maps all Profile fields
12. parseV2Error extracts title, detail, status

V2 Tweets:
13. createTweetV2 sends correct POST body
14. createTweetV2 with poll includes poll object
15. searchRecentTweetsV2 paginates correctly

V2 Users:
16. getUsersV2 handles batch of up to 100 IDs
17. followUserV2 sends correct body

V2 Polls:
18. validatePollOptions rejects <2 options
19. validatePollOptions rejects >4 options
20. validatePollOptions rejects options >25 chars
21. validatePollDuration rejects <5 or >10080

V2 Spaces:
22. Space.fromV2 parses all fields

Scraper integration:
23. scraper.v2 throws if no v2 credentials
24. scraper.v2 returns V2Client when credentials provided

Use vitest mocks for HTTP requests (vi.fn() on HttpClient.request).
All fixtures use real Twitter API v2 response shapes.
```

---

## Validation

After all 15 prompts are complete, verify:

```bash
# V2 module loads
node -e "import { V2Client } from './src/client/api/v2/index.js'; console.log('✅ V2 module loads')"

# V2Client instantiation
node -e "
import { V2Client } from './src/client/api/v2/index.js';
const v2 = new V2Client({ apiKey: 'test', apiSecret: 'test' });
console.log('✅ V2Client creates:', typeof v2.createPoll, typeof v2.searchRecent);
"

# Scraper.v2 integration
node -e "
import { Scraper } from './src/client/index.js';
const s = new Scraper({ v2: { apiKey: 'test', apiSecret: 'test' } });
console.log('✅ Scraper.v2 available:', s.v2.isAvailable());
"

# Scraper.v2 throws without creds
node -e "
import { Scraper } from './src/client/index.js';
const s = new Scraper();
try { s.v2; } catch(e) { console.log('✅ Correctly throws:', e.message); }
"

# TypeScript types
grep -c "class V2Client" types/index.d.ts
grep -c "V2Options" types/index.d.ts

# Tests pass
npx vitest run tests/client/v2.test.js
```
