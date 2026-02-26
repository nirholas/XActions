# Track 07 — Twitter API v2 Hybrid Layer

> Add optional Twitter API v2 support for features that the internal GraphQL API doesn't expose well: polls, Spaces metadata, advanced analytics, filtered search. This is opt-in — users provide their own API keys. The internal GraphQL API remains the default for all core operations.

---

## Research Before Starting

```
src/client/Scraper.js                  — Main Scraper class (Tracks 01-06)
src/client/http/HttpClient.js          — HTTP client
src/client/auth/TokenManager.js        — Auth system
src/pollCreator.js                     — Browser-based poll creation (Puppeteer)
src/spacesManager.js                   — Browser-based Spaces management
src/scrapers/twitter/index.js          — Puppeteer scrapers
```

Study: `agent-twitter-client` — has v2 integration for polls, quote counts, tweet counts

### Twitter API v2 Endpoints

Base URL: `https://api.x.com/2/`
Auth: OAuth 2.0 Bearer Token (user-provided API key) or OAuth 1.0a (user tokens)

Key v2 endpoints NOT available via internal GraphQL:
- POST /2/tweets — tweet creation with poll_options (official way to create polls)
- GET /2/tweets/counts/recent — tweet volume counts (analytics)
- GET /2/tweets/search/recent — filtered stream rules, advanced operators
- GET /2/spaces — Spaces metadata, participant counts
- GET /2/users/:id/tweets — with tweet.fields expansion for public_metrics
- GET /2/tweets/:id — includes organic_metrics, promoted_metrics (if auth'd)

---

## Architecture

```
src/client/api/v2/
  V2Client.js           ← v2 API client with OAuth 2.0 auth
  polls.js              ← Poll creation and management
  analytics.js          ← Tweet metrics, counts, engagement data
  spaces.js             ← Spaces discovery and metadata
  search.js             ← v2 filtered search (advanced operators)
  users.js              ← v2 user lookup (includes public_metrics)
  index.js              ← Re-exports
```

---

## Prompts

### Prompt 1: V2Client — Twitter API v2 HTTP Client

```
Create src/client/api/v2/V2Client.js — HTTP client specifically for Twitter API v2 endpoints.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class V2Client with:
  - constructor({ apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken, httpClient })
    - Supports two auth modes:
      a. Bearer token only (app-level, read-only) — for search, user lookup
      b. OAuth 1.0a (user tokens) — for creating tweets, polls, write operations
    - httpClient: reuses the existing HttpClient from Track 03 for rate limiting/retries
  - isConfigured() — returns true if any credentials are provided
  - hasBearerToken() — returns true if bearerToken is set
  - hasUserAuth() — returns true if accessToken + accessTokenSecret are set
  - async get(path, params = {}) — GET request to v2 API:
    URL: https://api.x.com/2/{path}
    Auth: Bearer token OR OAuth 1.0a signature
    Returns parsed JSON response
  - async post(path, body = {}) — POST request to v2 API
  - buildOAuth1Header(method, url, params) — generates OAuth 1.0a Authorization header:
    Uses HMAC-SHA1 signing (Node.js crypto module, no external deps)
    Parameters: oauth_consumer_key, oauth_nonce, oauth_signature_method, oauth_timestamp, oauth_token, oauth_version, oauth_signature

OAuth 1.0a signature implementation (using Node.js crypto):
1. Create signature base string: METHOD&url_encode(url)&url_encode(sorted_params)
2. Create signing key: url_encode(apiSecret)&url_encode(accessTokenSecret)
3. Sign with HMAC-SHA1
4. Base64-encode the signature

File: src/client/api/v2/V2Client.js
```

### Prompt 2: Poll Creation via v2

```
Create src/client/api/v2/polls.js — create and manage polls using Twitter API v2.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT

Export functions:
1. async createPoll(v2Client, { text, options, durationMinutes = 60 }) — creates a tweet with poll:
   POST /2/tweets
   Body: {
     text: text,
     poll: {
       options: options.map(o => typeof o === 'string' ? o : o.label),
       duration_minutes: durationMinutes
     }
   }
   Requires OAuth 1.0a auth (user-level)
   durationMinutes: 5 to 10080 (7 days)
   options: 2-4 choices, each max 25 chars
   Returns: { tweetId, pollId, options: [{ label, votes: 0 }] }

2. async getPollResults(v2Client, tweetId) — get poll results:
   GET /2/tweets/{tweetId}?expansions=attachments.poll_ids&poll.fields=duration_minutes,end_datetime,voting_status,options
   Returns: { pollId, status: 'open' | 'closed', options: [{ label, votes }], endTime, totalVotes }

3. async endPoll(v2Client, tweetId) — end a poll early (by deleting the tweet — v2 has no direct end-poll endpoint)

Input validation:
- options must be 2-4 items
- Each option max 25 chars
- durationMinutes 5-10080
- Throw descriptive errors on invalid input

File: src/client/api/v2/polls.js
```

### Prompt 3: Advanced Analytics via v2

```
Create src/client/api/v2/analytics.js — tweet metrics and volume analytics.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT

Export functions:
1. async getTweetMetrics(v2Client, tweetId) — get detailed metrics:
   GET /2/tweets/{tweetId}?tweet.fields=public_metrics,organic_metrics,non_public_metrics
   Returns: {
     public: { likes, retweets, replies, quotes, impressions, bookmarks },
     organic: { likes, retweets, replies, impressions } (if user is author),
     promoted: { likes, retweets, replies, impressions } (if promoted),
   }

2. async getTweetCounts(v2Client, query, { granularity = 'day', startTime, endTime } = {}) — volume counts:
   GET /2/tweets/counts/recent?query={query}&granularity={granularity}
   Returns: { totalCount, data: [{ start, end, count }] }
   granularity: 'minute', 'hour', 'day'

3. async getUserMetrics(v2Client, userId) — user-level metrics:
   GET /2/users/{userId}?user.fields=public_metrics,created_at,description
   Returns: { followers, following, tweets, listed }

4. async getMultipleTweetMetrics(v2Client, tweetIds) — batch up to 100 tweets:
   GET /2/tweets?ids={ids}&tweet.fields=public_metrics,created_at,author_id
   Returns array of metrics

5. async getTopTweets(v2Client, username, { count = 10, metric = 'likes' }) — gets user's top tweets by metric:
   Fetches recent tweets, sorts by the specified metric
   Returns sorted array

File: src/client/api/v2/analytics.js
```

### Prompt 4: Spaces Discovery via v2

```
Create src/client/api/v2/spaces.js — Spaces metadata and discovery.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT

Export functions:
1. async getSpace(v2Client, spaceId) — get Space details:
   GET /2/spaces/{spaceId}?space.fields=title,state,participant_count,scheduled_start,host_ids,speaker_ids,created_at,lang,is_ticketed
   Returns: { id, title, state, participantCount, scheduledStart, hostIds, speakerIds, createdAt, language, isTicketed }

2. async searchSpaces(v2Client, query, { state = 'live' } = {}) — find Spaces:
   GET /2/spaces/search?query={query}&state={state}&space.fields=...
   state: 'live', 'scheduled', 'all'
   Returns array of Space objects

3. async getSpacesByCreator(v2Client, userIds) — get Spaces by hosts:
   GET /2/spaces/by/creator_ids?user_ids={ids}&space.fields=...
   Returns array of Space objects

4. async getSpaceBuyers(v2Client, spaceId) — get ticketed Space buyers:
   GET /2/spaces/{spaceId}/buyers
   Returns array of user IDs

5. async getSpaceTweets(v2Client, spaceId) — get tweets shared in a Space:
   GET /2/spaces/{spaceId}/tweets
   Returns array of tweet objects

File: src/client/api/v2/spaces.js
```

### Prompt 5: v2 Filtered Search

```
Create src/client/api/v2/search.js — advanced search using v2 operators.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT

Export functions:
1. async searchRecent(v2Client, query, { maxResults = 10, nextToken, startTime, endTime, sortOrder = 'recency' } = {}) — recent search:
   GET /2/tweets/search/recent?query={query}&max_results={maxResults}&sort_order={sortOrder}
   &tweet.fields=created_at,public_metrics,author_id,conversation_id,lang,entities
   &expansions=author_id,attachments.media_keys
   &user.fields=username,name,profile_image_url,verified
   Returns: { tweets: [...], users: [...], nextToken, resultCount }

2. async searchAll(v2Client, query, options) — full archive search (Academic access):
   GET /2/tweets/search/all (same params as recent)
   Returns same shape

3. async *searchStream(v2Client, query, options) — AsyncGenerator for paginated search:
   Yields tweets, automatically follows nextToken pagination
   Respects limit option

4. buildSearchQuery({ from, to, keyword, hashtag, hasMedia, hasLinks, lang, minLikes, minRetweets, isReply, isQuote, since, until } = {}) — builds v2 search query string:
   Examples:
   buildSearchQuery({ from: 'nichxbt', hasMedia: true }) → 'from:nichxbt has:media'
   buildSearchQuery({ keyword: 'javascript', minLikes: 100, lang: 'en' }) → 'javascript min_faves:100 lang:en'
   buildSearchQuery({ hashtag: 'webdev', since: '2026-01-01' }) → '#webdev since:2026-01-01'

5. async getSearchCount(v2Client, query, { granularity = 'day' } = {}) — tweet volume for query:
   Delegates to analytics.getTweetCounts()

File: src/client/api/v2/search.js
```

### Prompt 6: v2 User Lookup

```
Create src/client/api/v2/users.js — user lookup with v2 fields.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT

Export functions:
1. async getUserById(v2Client, userId) — lookup by ID:
   GET /2/users/{userId}?user.fields=created_at,description,entities,location,pinned_tweet_id,profile_image_url,protected,public_metrics,url,verified,verified_type,withheld
   Returns full user object with all fields

2. async getUserByUsername(v2Client, username) — lookup by username:
   GET /2/users/by/username/{username}?user.fields=...

3. async getUsers(v2Client, userIds) — batch lookup up to 100 users:
   GET /2/users?ids={ids}&user.fields=...

4. async getUsersByUsernames(v2Client, usernames) — batch by usernames:
   GET /2/users/by?usernames={usernames}&user.fields=...

5. async getUserFollowers(v2Client, userId, { maxResults = 100, paginationToken } = {}) — v2 followers:
   GET /2/users/{userId}/followers?max_results={maxResults}&user.fields=...
   Returns: { users: [...], nextToken }

6. async getUserFollowing(v2Client, userId, { maxResults = 100, paginationToken } = {}) — v2 following

7. async getMutualFollowers(v2Client, userId1, userId2) — find mutual followers:
   Fetches both follower lists, computes intersection

File: src/client/api/v2/users.js
```

### Prompt 7: v2 Module Index

```
Create src/client/api/v2/index.js — barrel exports.

Export:
  export { V2Client } from './V2Client.js';
  export { createPoll, getPollResults, endPoll } from './polls.js';
  export { getTweetMetrics, getTweetCounts, getUserMetrics, getMultipleTweetMetrics, getTopTweets } from './analytics.js';
  export { getSpace, searchSpaces, getSpacesByCreator, getSpaceBuyers, getSpaceTweets } from './spaces.js';
  export { searchRecent, searchAll, searchStream, buildSearchQuery, getSearchCount } from './search.js';
  export { getUserById, getUserByUsername, getUsers, getUsersByUsernames, getUserFollowers, getUserFollowing, getMutualFollowers } from './users.js';

  export function createV2Client(options) {
    // options: { apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken }
    // Returns configured V2Client
    // Throws if no credentials provided
  }

File: src/client/api/v2/index.js
```

### Prompt 8: Wire v2 into Scraper Class

```
Update src/client/Scraper.js — add a `v2` namespace property.

Add to constructor:
  this.v2 = null; // Initialized when v2 credentials provided

Add method:
  configureV2({ apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken }) {
    this.v2 = new V2Client({ ...credentials, httpClient: this._httpClient });
    return this;
  }

Add v2 convenience methods on Scraper:
  async createPoll(text, options, durationMinutes) — delegates to polls.createPoll(this.v2, ...)
  async getPollResults(tweetId) — delegates to polls.getPollResults(this.v2, ...)
  async getTweetMetrics(tweetId) — delegated to analytics
  async searchV2(query, options) — delegates to search.searchRecent(this.v2, ...)

Users can also access the v2 client directly:
  scraper.v2.get('/tweets/counts/recent', { query: 'javascript' })

Read Scraper.js before editing — only add new methods.
```

### Prompt 9: V2Client Tests

```
Create tests/client/api/v2/v2Client.test.js

Test cases:
1. constructor stores credentials
2. isConfigured() returns true with bearerToken
3. isConfigured() returns false with no credentials
4. hasBearerToken() / hasUserAuth() return correct booleans
5. get() sends correct Authorization header (Bearer)
6. get() builds correct URL with path and params
7. post() sends JSON body
8. buildOAuth1Header() generates valid OAuth 1.0a signature
9. OAuth signature base string is correct
10. OAuth nonce is unique per call
11. OAuth timestamp is current
12. get() with OAuth 1.0a uses Authorization header
13. Error on v2-specific error responses { errors: [...], title, detail }
14. Rate limiting from v2 headers
15. Timeout handling

File: tests/client/api/v2/v2Client.test.js
```

### Prompt 10: Poll Tests

```
Create tests/client/api/v2/polls.test.js

Test cases:
1. createPoll() sends correct POST body
2. createPoll() returns tweetId and pollId
3. createPoll() validates 2-4 options
4. createPoll() validates option length (max 25)
5. createPoll() validates duration (5-10080)
6. createPoll() requires user auth
7. getPollResults() fetches with correct expansions
8. getPollResults() returns structured poll data
9. getPollResults() handles closed poll
10. endPoll() deletes the tweet
11. Error on invalid credentials
12. Error response from API is handled
13. Rate limit on poll creation
14. Multiple polls in sequence
15. Poll with emoji in options

File: tests/client/api/v2/polls.test.js
```

### Prompt 11: Analytics Tests

```
Create tests/client/api/v2/analytics.test.js

Test cases:
1. getTweetMetrics() returns public metrics
2. getTweetMetrics() returns organic metrics when available
3. getTweetCounts() returns daily volume data
4. getTweetCounts() respects granularity parameter
5. getUserMetrics() returns follower/following counts
6. getMultipleTweetMetrics() batches up to 100
7. getMultipleTweetMetrics() handles partial failures
8. getTopTweets() sorts by likes
9. getTopTweets() sorts by retweets
10. Error handling for non-existent tweet
11. Error handling for unauthorized metrics
12. Rate limit response handling
13. Empty result sets
14. Date range filtering works
15. Large batch (100 tweets) returns all

File: tests/client/api/v2/analytics.test.js
```

### Prompt 12: Search v2 Tests

```
Create tests/client/api/v2/search.test.js

Test cases:
1. searchRecent() sends correct query
2. searchRecent() includes tweet.fields and expansions
3. searchRecent() returns structured response
4. searchRecent() handles nextToken pagination
5. searchAll() same as recent but different endpoint
6. searchStream() yields tweets across pages
7. searchStream() respects limit
8. buildSearchQuery() builds from:user query
9. buildSearchQuery() builds has:media filter
10. buildSearchQuery() builds min_faves filter
11. buildSearchQuery() combines multiple filters
12. buildSearchQuery() handles hashtags
13. buildSearchQuery() handles date ranges
14. getSearchCount() returns volume data
15. Search with special characters in query

File: tests/client/api/v2/search.test.js
```

### Prompt 13: v2 TypeScript Definitions

```
Create types/client/v2.d.ts

Contents:
- interface V2Credentials { apiKey?, apiSecret?, accessToken?, accessTokenSecret?, bearerToken? }
- class V2Client { isConfigured, hasBearerToken, hasUserAuth, get, post, buildOAuth1Header }
- interface PollOptions { text: string; options: string[]; durationMinutes?: number; }
- interface PollResult { tweetId: string; pollId: string; options: { label: string; votes: number; }[]; status: 'open' | 'closed'; totalVotes: number; }
- interface TweetMetrics { public: PublicMetrics; organic?: OrganicMetrics; promoted?: PromotedMetrics; }
- interface PublicMetrics { likes: number; retweets: number; replies: number; quotes: number; impressions: number; bookmarks: number; }
- interface SpaceInfo { id, title, state, participantCount, scheduledStart, hostIds, speakerIds }
- interface SearchQuery { from?, to?, keyword?, hashtag?, hasMedia?, hasLinks?, lang?, minLikes?, minRetweets?, isReply?, isQuote?, since?, until? }
- function createPoll, getPollResults, endPoll
- function getTweetMetrics, getTweetCounts, getUserMetrics, getMultipleTweetMetrics, getTopTweets
- function getSpace, searchSpaces, getSpacesByCreator
- function searchRecent, searchAll, searchStream, buildSearchQuery
- function getUserById, getUserByUsername, getUsers, getUsersByUsernames
- function createV2Client(options: V2Credentials): V2Client

File: types/client/v2.d.ts
```

### Prompt 14: Wire v2 into Package

```
1. Update src/index.js:
   export { V2Client, createV2Client, createPoll, getPollResults, getTweetMetrics, getTweetCounts, buildSearchQuery, searchRecent, getSpace, searchSpaces } from './client/api/v2/index.js';

2. Update package.json exports:
   "./v2": "./src/client/api/v2/index.js"

3. Update types/index.d.ts:
   export * from './client/v2';

Read existing files. Only add new exports.
```

### Prompt 15: v2 Documentation

```
Create docs/v2-api.md — documentation for the optional Twitter API v2 layer.

Structure:
1. Overview — what v2 adds that internal GraphQL doesn't have
2. Getting API Keys — step-by-step to get Twitter developer credentials
3. Configuration — how to provide v2 credentials
   - Via Scraper.configureV2()
   - Via environment variables: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET, TWITTER_BEARER_TOKEN
4. Polls — create, read results, examples
5. Analytics — tweet metrics, volume counts, top tweets
6. Spaces — discover, search, metadata
7. Advanced Search — v2 search operators, buildSearchQuery helper
8. User Lookup — v2 fields, batch lookup
9. v2 vs Internal GraphQL API — comparison table:
   | Feature | GraphQL (default) | v2 (optional) |
   |---------|-------------------|---------------|
   | Auth | Cookie/session | API keys |
   | Cost | Free | Free tier available |
   | Polls | Create via UI only | Full poll API |
   | Metrics | Basic | Organic + promoted |
10. Rate Limits — v2 specific limits
11. API Reference — every function
12. Troubleshooting

File: docs/v2-api.md
```

---

## Validation

```bash
ls src/client/api/v2/{V2Client,polls,analytics,spaces,search,users,index}.js
ls tests/client/api/v2/{v2Client,polls,analytics,search}.test.js
ls types/client/v2.d.ts
ls docs/v2-api.md

npx vitest run tests/client/api/v2/
```
