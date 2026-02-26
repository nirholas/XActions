# Track 04 — Comprehensive Test Suite

> XActions has only ~4 test files. This track builds full coverage for the new Scraper client, auth, HTTP, and existing modules. Every test uses real Twitter response structures as fixtures.

---

## Research Before Starting

```
tests/                         — Existing tests (x402.test.js, extractUserFromCell.test.js)
vitest.config.js               — Vitest configuration
src/client/                    — New Scraper class (from Tracks 01-03)
src/scrapers/twitter/index.js  — Existing Puppeteer scrapers (952 lines)
```

---

## Prompts

### Prompt 1: Test Fixtures — Real Twitter GraphQL Response Structures

```
Create tests/fixtures/graphql-responses/ with 10 JSON files containing REAL Twitter GraphQL response shapes. These must match the actual response structure from Twitter's internal API — study the-convocation/twitter-scraper and agent-twitter-client source code for the exact field paths.

Create:
1. user-profile.json — UserByScreenName response with full user result object including legacy.screen_name, legacy.followers_count, is_blue_verified, etc.
2. user-tweets.json — UserTweets timeline with 5+ tweet entries, a retweet, a quote tweet, a reply, media attachments, engagement counts, and "cursor-bottom-*" entry for pagination
3. tweet-detail.json — TweetDetail with full tweet data, conversation thread entries, and quoted tweet
4. search-results.json — SearchTimeline with mixed results, promoted content entries, and cursor 
5. followers.json — Followers endpoint with 5+ user entries and cursor
6. trends.json — guide.json trending topics response
7. login-flow.json — Object with responses for each login flow step (init, username, password, success)
8. error-rate-limit.json — { errors: [{ code: 88, message: "Rate limit exceeded" }] }
9. error-not-found.json — { errors: [{ code: 34, message: "Sorry, that page does not exist." }] }
10. error-suspended.json — UserUnavailable result with reason "Suspended"

Every field must match the real Twitter API structure. Include the deeply nested paths: data.user.result.legacy, data.user.result.timeline_v2.timeline.instructions, etc.
```

### Prompt 2: Tweet and Profile Model Tests

```
Create tests/client/models.test.js using vitest.

Import fixtures from tests/fixtures/graphql-responses/.
Import Tweet from src/client/models/Tweet.js and Profile from src/client/models/Profile.js.

15 tests:
1. Profile.fromGraphQL parses username, name, bio, followersCount, followingCount from user-profile.json fixture
2. Profile.fromGraphQL returns correct types (numbers for counts, Date for joined, boolean for verified)
3. Profile.fromGraphQL handles missing/null fields without crashing
4. Profile.fromGraphQL handles UserUnavailable (suspended) — returns null or throws specific error
5. Tweet.fromGraphQL parses id, text, likes, retweets, replies, views from a tweet entry
6. Tweet.fromGraphQL parses retweet (isRetweet=true, retweetedStatus populated)
7. Tweet.fromGraphQL parses quote tweet (isQuote=true, quotedStatus populated)
8. Tweet.fromGraphQL parses reply (isReply=true, inReplyToStatusId set)
9. Tweet.fromGraphQL parses photos from entities.media
10. Tweet.fromGraphQL parses video with highest bitrate variant
11. Tweet.fromGraphQL extracts hashtags and mentions from entities
12. Tweet.fromGraphQL parses poll data from card
13. Tweet.fromGraphQL handles TweetWithVisibilityResults wrapper (unwraps correctly)
14. Tweet.fromGraphQL returns null for tombstone/deleted tweets
15. Both models expose _raw property with original GraphQL data

Every test asserts specific field values using expect().toBe() / toEqual(). No approximate assertions.
```

### Prompt 3: Response Parser Tests

```
Create tests/client/parsers.test.js.

Test src/client/api/parsers.js functions with real fixtures.

15 tests:
1. parseTimelineEntries extracts entries array and cursor from user-tweets.json
2. parseTimelineEntries returns empty entries and null cursor for empty timeline
3. parseTweetEntry converts standard entry to Tweet instance
4. parseTweetEntry returns null for promoted/ad content
5. parseTweetEntry returns null for tombstone entries
6. parseUserEntry converts to Profile instance
7. parseModuleEntry extracts array of tweets from conversation module
8. navigateResponse('a.b.c') traverses nested objects correctly
9. navigateResponse returns undefined for missing paths without throwing
10. extractCursor finds cursor-bottom entry value
11. extractCursor returns null when no cursor exists
12. parseMediaEntity correctly parses photo (type, url, dimensions)
13. parseMediaEntity selects highest bitrate video variant
14. parsePoll extracts options, totalVotes, endDatetime
15. All parsers return null/empty for null/undefined input (never throw)
```

### Prompt 4: Auth System Tests

```
Create tests/client/auth.test.js.

Test CookieJar, CookieAuth, TokenManager from src/client/auth/.

15 tests:
1. CookieJar.set + get stores and retrieves cookies
2. CookieJar.toJSON + fromJSON serialization round-trip preserves all cookies
3. CookieJar.toCookieString formats as "name1=value1; name2=value2"
4. CookieJar.saveToFile + loadFromFile round-trip (use os.tmpdir())
5. CookieJar.loadFromFile returns empty jar for non-existent file
6. CookieJar handles expired cookies (isExpired, removeExpired)
7. TokenManager.getHeaders(false) returns guest mode headers with Authorization and x-guest-token
8. TokenManager.getHeaders(true) returns authenticated headers with x-csrf-token
9. CookieAuth.isAuthenticated returns false when no cookies loaded
10. CookieAuth.loginWithCookies populates jar and sets userId (mock verify_credentials)
11. CookieAuth.loginWithCookies rejects missing auth_token cookie
12. CookieAuth.getHeaders includes Cookie string and x-csrf-token
13. CookieAuth.saveCookies + loadCookies round-trip maintains authentication state
14. CookieParser.extractUserId decodes twid cookie "u%3D1234567890" → "1234567890"
15. Cookie encryption: encrypt then decrypt with same password succeeds; wrong password throws
```

### Prompt 5: Scraper Class Unit Tests

```
Create tests/client/scraper.test.js.

Test Scraper class with mocked HTTP. Create helper createMockHttpClient(responseMap) that matches URLs to fixture responses.

15 tests:
1. Scraper.getProfile returns Profile for valid user (mock UserByScreenName)
2. Scraper.getProfile throws NotFoundError for missing user
3. Scraper.getTweet returns Tweet for valid ID
4. Scraper.getTweet throws NotFoundError for deleted tweet
5. Scraper.getTweets yields correct number of tweets via AsyncGenerator
6. Scraper.getTweets paginates: page 1 (20 tweets + cursor) → page 2 (10 tweets, no cursor) → yields all 30
7. Scraper.searchTweets respects count limit (returns only requested amount)
8. Scraper.searchTweets passes mode to request variables
9. Scraper.sendTweet throws AUTH_REQUIRED when not logged in
10. Scraper.sendTweet posts text and returns created Tweet when authenticated
11. Scraper.likeTweet calls FavoriteTweet with correct tweet_id
12. Scraper.followUser resolves username to userId then calls friendships/create
13. Scraper caches username→userId lookups (second call doesn't hit API)
14. Scraper.me returns authenticated user profile
15. Scraper constructor with cookies option loads on first auth request
```

### Prompt 6: Pagination Tests

```
Create tests/client/pagination.test.js.

Test AsyncGenerator pagination behavior in detail.

15 tests:
1. getFollowers yields profiles across 3 pages (20 per page)
2. getFollowers stops when no cursor on final page
3. getFollowing same pagination pattern works
4. getTweets handles mixed entry types (tweets + conversation modules)
5. searchTweets yields nothing for empty results (no crash)
6. getLikedTweets paginates correctly
7. getListTweets paginates list timeline
8. Delay between pages >= 1000ms (verify with timing)
9. Breaking from generator early stops fetching subsequent pages
10. Multiple concurrent generators work independently
11. fetchSearchTweets returns { tweets, cursor } for manual pagination
12. Generator handles mid-stream 429 rate limit (retry and continue)
13. Generator throws AuthenticationError on 401 mid-stream
14. getLatestTweet returns first tweet, consumes only 1 page
15. Pagination handles both base64 and plain cursor formats
```

### Prompt 7: Error Handling Tests

```
Create tests/client/errors.test.js.

15 tests:
1. ScraperError has code, endpoint, httpStatus properties
2. AuthenticationError extends ScraperError
3. RateLimitError includes retryAfter and resetAt
4. NotFoundError has code USER_NOT_FOUND or TWEET_NOT_FOUND
5. TwitterApiError includes twitterErrorCode and twitterMessage
6. detectTwitterError maps code 88 → RateLimitError
7. detectTwitterError maps code 34 → NotFoundError
8. detectTwitterError maps code 326 → AuthenticationError(ACCOUNT_LOCKED)
9. detectTwitterError handles GraphQL error format
10. detectTwitterError returns null for successful response
11. detectShadowRateLimit identifies suspiciously empty timeline
12. validateUsername rejects special characters, accepts alphanumeric+underscore
13. validateUsername strips @ prefix
14. validateTweetId rejects non-numeric strings
15. validateTweetText enforces 280 character limit
```

### Prompt 8: HTTP Client Stack Tests

```
Create tests/client/http.test.js.

Test RateLimiter, RetryHandler, RequestQueue, CircuitBreaker.

15 tests:
1. RateLimiter tracks per-endpoint limits from headers
2. RateLimiter adaptive backoff increases on consecutive rate limits
3. RateLimiter adaptive backoff decreases on consecutive successes
4. RetryHandler retries 429 with increasing delays, succeeds on 3rd try
5. RetryHandler does NOT retry 404 (throws immediately)
6. RetryHandler respects maxRetries limit
7. RequestQueue enforces concurrency limit of 2
8. RequestQueue processes high-priority requests first
9. RequestQueue.drain waits for all queued work
10. CircuitBreaker trips to OPEN after threshold failures
11. CircuitBreaker transitions OPEN → HALF_OPEN after timeout
12. CircuitBreaker transitions HALF_OPEN → CLOSED on success
13. Deduplicator merges concurrent identical GET requests (fn called once)
14. TimeoutManager aborts request after configured timeout
15. Full HttpClient pipeline: fetch → parse → update rate limiter → return data
```

### Prompt 9: MCP Tools Tests

```
Create tests/mcp/tools.test.js.

Test MCP server tool registration and the new x_client_* tools.

15 tests:
1. MCP server registers 140+ tools
2. x_client_get_profile returns formatted profile data
3. x_client_get_tweet returns formatted tweet data
4. x_client_search returns array of results
5. x_client_send_tweet returns error without auth
6. x_client_get_followers returns follower list
7. x_client_get_trends returns trend names
8. Tool parameter validation rejects empty username
9. Tool responses match MCP format { content: [{ type: 'text', text }] }
10. Rate limit errors return helpful error message
11. Not found errors return helpful message
12. Auth errors instruct user to login
13. Tools have proper inputSchema with required fields
14. All tool names follow x_ prefix convention
15. Tool descriptions are non-empty and descriptive
```

### Prompt 10: CLI Command Tests

```
Create tests/cli/commands.test.js.

Test CLI commands programmatically using Commander test patterns.

15 tests:
1. 'client login' calls inquirer and Scraper.login
2. 'client profile <username>' outputs formatted profile
3. 'client tweet <id>' outputs tweet text and metadata
4. 'client search <query>' outputs matching tweets
5. 'client post "<text>"' sends tweet and prints URL
6. 'client followers <username>' lists followers
7. 'client trends' shows trending topics
8. 'client whoami' shows authenticated user
9. Auth-required commands show "Not authenticated" when no cookies
10-15. Each command --help shows usage information and parameters
```

### Prompt 11: Integration Tests (Real API, Gated)

```
Create tests/client/integration.test.js.

Real integration tests gated behind XACTIONS_TEST_INTEGRATION=true env var.

15 tests (all describe.skip unless env var is set):
1. Fetch real profile for @x (public, guest mode)
2. Fetch real tweet by known public tweet ID
3. Search real tweets for common term
4. Get real trending topics
5. Iterate real followers (requires auth)
6. Iterate real following (requires auth)
7. Authenticated user can call me()
8. Rate limit headers are parsed from real response
9. Guest token obtained automatically on first request
10. Cookie save + load round-trip maintains session
11. Concurrent requests complete without collision
12. Public list tweets are fetchable
13. Advanced search operators work (from:, since:)
14. Non-existent user throws NotFoundError
15. Rate limited endpoint returns RateLimitError with reset time

Each test has 30s timeout. Log rate limit status after each.
```

### Prompt 12: Test Helpers and Utilities

```
Create tests/helpers/index.js.

Shared test utilities used across all test files:

1. createMockFetch(responseMap) — URL pattern matching mock fetch
2. createMockScraper(overrides) — Scraper with pre-mocked responses
3. createTestScraper() — Real scraper for integration tests (loads cookies from env)
4. withTempDir(fn) — Create temp directory, run fn, cleanup
5. captureConsoleOutput(fn) — Capture stdout/stderr during fn
6. loadFixture(name) — Load JSON from tests/fixtures/graphql-responses/
7. assertAsyncGeneratorYields(gen, count) — Consume and assert count
8. createTimedFn(fn) — Wrap to measure execution time
9. TWITTER_ERROR_CODES — Map of all error codes for parameterized tests
10. sleep(ms) — Promisified timeout for timing tests

Also create tests/helpers/mockHttpClient.js:
- Takes response map with URL glob patterns
- Tracks call history (which endpoints called, how many times)
- Supports configurable delays and error injection
```

### Prompt 13: Vitest Config and Coverage Setup

```
Update vitest.config.js to add:

1. Coverage configuration:
   - Provider: 'v8' or 'istanbul'
   - Include: ['src/client/**', 'src/scrapers/**', 'src/mcp/**', 'src/cli/**']
   - Exclude: ['**/node_modules/**', '**/fixtures/**']
   - Thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 }
   - Reporter: ['text', 'lcov', 'html']

2. Test file patterns:
   - include: ['tests/**/*.test.js']
   
3. Setup files:
   - setupFiles: ['tests/helpers/setup.js']
   
4. Timeouts:
   - testTimeout: 10000 (normal tests)
   - hookTimeout: 30000 (for integration)

5. Environment: 'node'

Create tests/helpers/setup.js:
- Global test setup (suppress console.warn in tests unless XACTIONS_DEBUG)

Update package.json scripts:
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:integration": "XACTIONS_TEST_INTEGRATION=true vitest run tests/client/integration.test.js",
  "test:client": "vitest run tests/client/",
  "test:mcp": "vitest run tests/mcp/",
  "test:cli": "vitest run tests/cli/"
```

### Prompt 14: GitHub Actions CI Workflow

```
Create .github/workflows/test.yml:

name: Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - name: Coverage
        if: matrix.node-version == 22
        run: npx vitest run --coverage
      - name: Upload Coverage
        if: matrix.node-version == 22
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run test:integration
        env:
          XACTIONS_TEST_INTEGRATION: 'true'
          XACTIONS_COOKIE_PATH: ${{ secrets.XACTIONS_COOKIE_PATH }}
        continue-on-error: true
```

### Prompt 15: Test Documentation

```
Create docs/testing.md:

Complete testing documentation:
1. Quick start: npm test, npm run test:coverage
2. Test directory structure
3. Writing new tests (helpers, fixtures, mocking)
4. Adding fixtures (capture responses, anonymize, save)
5. Integration test setup (env vars, cookies)
6. CI pipeline description
7. Coverage goals: client/ 90%, scrapers/ 70%, mcp/ 80%, cli/ 75%
8. Troubleshooting flaky tests
9. Performance benchmarks
10. Contributing tests with PRs
```

---

## Validation

```bash
npx vitest run
npx vitest run --coverage
ls tests/fixtures/graphql-responses/
ls tests/client/
cat .github/workflows/test.yml
```
