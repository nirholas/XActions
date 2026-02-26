# Track 05 — AsyncGenerator Pagination

> Build a cursor-based pagination system using JavaScript AsyncGenerators so users can `for await` over arbitrarily large result sets (followers, tweets, search results) without loading everything into memory. This is the pattern that makes `the-convocation/twitter-scraper` and `twikit` feel natural.

---

## Research Before Starting

Read these files:

```
src/scrapers/twitter/index.js       — Current scroll-based pagination (Puppeteer), no cursors
src/scraping/paginationEngine.js    — Existing pagination engine (browser-based)
src/client/http/HttpClient.js       — HTTP client (from Track 03, dependency)
src/client/http/graphql.js          — GraphQL query registry (from Track 03)
```

Study competitor pagination:

- `the-convocation/twitter-scraper` — `getTweets()` returns AsyncGenerator, uses cursor from `instructions[].entries[]` with `"cursor-bottom-*"` type
- `d60/twikit` — Python async generators with `Cursor` class
- `agent-twitter-client` — `fetchSearchTweets()` with cursor continuation

### Twitter's Cursor Pagination

Twitter GraphQL responses use a cursor pattern:

```json
{
  "data": {
    "user": {
      "result": {
        "timeline_v2": {
          "timeline": {
            "instructions": [
              {
                "type": "TimelineAddEntries",
                "entries": [
                  { "entryId": "tweet-123", "content": { ... } },
                  { "entryId": "tweet-456", "content": { ... } },
                  { "entryId": "cursor-bottom-789", "content": { "cursorType": "Bottom", "value": "DAACCgACGdy..." } },
                  { "entryId": "cursor-top-001", "content": { "cursorType": "Top", "value": "DAABCgABGd..." } }
                ]
              }
            ]
          }
        }
      }
    }
  }
}
```

The `cursor-bottom-*` entry's `value` is passed as the `cursor` variable in the next request.

---

## Architecture

```
src/client/pagination/
  AsyncCursor.js        ← Core AsyncGenerator wrapper
  CursorExtractor.js    ← Extracts cursors from various response shapes
  PageIterator.js       ← High-level iterator with limit and filter support
  parsers.js            ← Response parsers (tweets, users, search results)
  index.js              ← Re-exports
```

---

## Prompts

### Prompt 1: CursorExtractor — Extract Cursors from Twitter Responses

```
Create src/client/pagination/CursorExtractor.js — extracts bottom/top cursors from Twitter's various response shapes.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class CursorExtractor with static methods:
  - static extractFromTimeline(response) — extracts cursors from UserTweets/UserTweetsAndReplies/UserMedia shapes:
    Navigates: data.user.result.timeline_v2.timeline.instructions → find TimelineAddEntries → entries → find cursor-bottom-* → content.value
    Returns: { bottom: 'DAACCg...', top: 'DAABCg...' } or { bottom: null, top: null }
  - static extractFromSearch(response) — extracts cursors from SearchTimeline shape:
    Navigates: data.search_by_raw_query.search_timeline.timeline.instructions → entries → cursor-bottom
  - static extractFromFollowers(response) — extracts from Followers/Following shape:
    Navigates: data.user.result.timeline.timeline.instructions → entries → cursor-bottom
  - static extractFromList(response) — extracts from ListLatestTweetsTimeline:
    Navigates: data.list.tweets_timeline.timeline.instructions → entries
  - static extractFromBookmarks(response) — extracts from Bookmarks shape
  - static extract(response, type) — dispatcher that calls the right method based on type string:
    type is one of: 'timeline', 'search', 'followers', 'following', 'list', 'bookmarks'
  - static hasNextPage(response, type) — returns true if a bottom cursor exists and is non-empty

Handle edge cases:
- Response is null/undefined → return { bottom: null, top: null }
- Instructions array is empty → return null cursors
- No cursor entries found → return null cursors
- Multiple instruction types (TimelineAddEntries, TimelineAddToModule) → check both

File: src/client/pagination/CursorExtractor.js
```

### Prompt 2: Response Parsers — Extract Tweets, Users, Search Results

```
Create src/client/pagination/parsers.js — parses Twitter GraphQL responses into clean data objects.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT

Export parser functions that extract real data items from raw GraphQL responses:

1. parseTweets(response) — extracts tweets from UserTweets/UserTweetsAndReplies response:
   - Navigate instructions → TimelineAddEntries → entries
   - Filter entries where entryId starts with "tweet-" (skip cursors, promotions)
   - For each entry, extract:
     { id, text, createdAt, likes, retweets, replies, quotes, impressions, bookmarks,
       author: { id, username, displayName, avatar, verified },
       media: [{ type, url, width, height }],
       quotedTweet: { id, text, author } | null,
       inReplyTo: { id, username } | null,
       urls: [{ url, expandedUrl, displayUrl }],
       hashtags: string[],
       language: string }
   - The raw tweet data is at: entry.content.itemContent.tweet_results.result.legacy (or .result.tweet.legacy for tombstones)

2. parseUsers(response) — extracts users from Followers/Following response:
   - Similar structure but entries have user_results instead of tweet_results
   - Extract: { id, username, displayName, bio, followers, following, tweets, avatar, verified, location, url, createdAt }

3. parseSearchResults(response) — extracts from SearchTimeline:
   - Can contain both tweets and users depending on search type
   - Returns: { tweets: [...], users: [...] }

4. parseProfile(response) — extracts single profile from UserByScreenName:
   - Returns flat object with all profile fields

5. parseTweet(response) — extracts single tweet from TweetDetail

Handle tombstoned/withheld tweets (result.__typename === 'TweetTombstone') — return { id, tombstoned: true, reason: '...' }
Handle promoted tweets — skip entries where content.promotedMetadata exists
Handle soft intervention tweets — __typename === 'TweetWithVisibilityResults' → unwrap .tweet

File: src/client/pagination/parsers.js
```

### Prompt 3: AsyncCursor — Core AsyncGenerator Wrapper

```
Create src/client/pagination/AsyncCursor.js — the core AsyncGenerator that pages through Twitter API results.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class AsyncCursor with:
  - constructor({ httpClient, queryId, operationName, variables, features, parser, cursorExtractor, type, limit = Infinity, delayMs = 1000 })
    - httpClient: HttpClient instance (from Track 03)
    - queryId/operationName: the GraphQL query to call
    - variables: base variables (cursor is added automatically)
    - features: GraphQL feature flags
    - parser: function to parse response into items
    - cursorExtractor: 'timeline' | 'search' | 'followers' etc.
    - type: result type for cursor extraction
    - limit: max total items to yield
    - delayMs: delay between page fetches
  - async *[Symbol.asyncIterator]() — the AsyncGenerator:
    1. Fetch first page (no cursor)
    2. Parse items using parser function
    3. Yield each item individually
    4. Extract bottom cursor using CursorExtractor
    5. If no cursor or limit reached → return
    6. Wait delayMs between pages
    7. Fetch next page with cursor variable
    8. Repeat until no more cursors or limit reached
  - async toArray() — collects all items into an array (respects limit)
  - async first() — returns first item or null
  - async take(n) — collects first n items into array
  - async count() — counts total items without storing them
  - getPageCount() — returns number of pages fetched so far
  - getTotalYielded() — returns number of items yielded so far

The AsyncGenerator must:
- Track total items yielded and stop at limit
- Handle empty pages (0 items but cursor exists — may happen, fetch one more page before stopping)
- Handle API errors gracefully — emit error event but don't crash the generator
- Support AbortController for cancellation

Usage will look like:
  const cursor = new AsyncCursor({ httpClient, queryId: 'E3opETHurmVJflFsUBVuUQ', operationName: 'UserTweets', variables: { userId: '123', count: 20 }, parser: parseTweets, type: 'timeline', limit: 100 });
  for await (const tweet of cursor) { console.log(tweet.text); }

File: src/client/pagination/AsyncCursor.js
```

### Prompt 4: PageIterator — High-Level Iterator with Filtering

```
Create src/client/pagination/PageIterator.js — a high-level wrapper around AsyncCursor that adds filtering, mapping, and transformation.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class PageIterator with:
  - constructor(asyncCursor) — wraps an AsyncCursor
  - filter(fn) — returns new PageIterator that only yields items where fn(item) is true
  - map(fn) — returns new PageIterator that yields fn(item) for each item
  - take(n) — returns new PageIterator limited to first n items
  - skip(n) — returns new PageIterator that skips first n items
  - until(fn) — returns new PageIterator that stops when fn(item) returns true
  - async *[Symbol.asyncIterator]() — yields items with all transforms applied
  - async toArray() — collects all items
  - async first() — returns first item
  - async count() — counts items without storing
  - async forEach(fn) — calls fn(item, index) for each item
  - async reduce(fn, initial) — reduces all items
  - pipe(...transforms) — chains multiple transforms: iterator.pipe(filter(fn), map(fn), take(n))

Transforms are chainable and lazy — nothing executes until iteration begins:
  for await (const tweet of iterator.filter(t => t.likes > 100).map(t => t.text).take(50)) {
    console.log(tweet);
  }

Export standalone transform functions for use with pipe():
  export function filter(fn) { return (iterator) => iterator.filter(fn); }
  export function map(fn) { return (iterator) => iterator.map(fn); }
  export function take(n) { return (iterator) => iterator.take(n); }
  export function skip(n) { return (iterator) => iterator.skip(n); }
  export function until(fn) { return (iterator) => iterator.until(fn); }

File: src/client/pagination/PageIterator.js
```

### Prompt 5: Pagination Module Index

```
Create src/client/pagination/index.js — barrel exports for the pagination module.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Re-export everything:
  export { CursorExtractor } from './CursorExtractor.js';
  export { parseTweets, parseUsers, parseSearchResults, parseProfile, parseTweet } from './parsers.js';
  export { AsyncCursor } from './AsyncCursor.js';
  export { PageIterator, filter, map, take, skip, until } from './PageIterator.js';

- Export convenience factory functions that the Scraper class will use:
  export function createTweetIterator(httpClient, userId, options = {}) {
    // Creates AsyncCursor configured for UserTweets
    // Returns PageIterator wrapping it
  }
  export function createFollowerIterator(httpClient, userId, options = {}) { ... }
  export function createFollowingIterator(httpClient, userId, options = {}) { ... }
  export function createSearchIterator(httpClient, query, options = {}) { ... }
  export function createLikesIterator(httpClient, userId, options = {}) { ... }
  export function createBookmarkIterator(httpClient, options = {}) { ... }
  export function createListIterator(httpClient, listId, options = {}) { ... }

Each factory sets the correct queryId, operationName, variables, parser, and cursorExtractor type.

File: src/client/pagination/index.js
```

### Prompt 6: Wire Pagination into Scraper Class

```
Read src/client/Scraper.js (created in Track 01). Add AsyncGenerator pagination methods to the Scraper class.

The Scraper class should gain these methods that return AsyncGenerators:

1. async *getTweets(username, limit = 100) — yields tweets
   - First resolve username to userId via getProfile
   - Create tweet iterator with userId
   - Yield from iterator

2. async *getFollowers(username, limit = 100) — yields user objects
3. async *getFollowing(username, limit = 100) — yields user objects
4. async *searchTweets(query, limit = 100) — yields tweets
5. async *searchUsers(query, limit = 100) — yields users
6. async *getLikes(username, limit = 100) — yields tweets
7. async *getBookmarks(limit = 100) — yields tweets (requires auth)
8. async *getListTweets(listId, limit = 100) — yields tweets
9. async *getUserMedia(username, limit = 100) — yields tweets with media

Each method should also have a non-generator variant:
  getTweetsArray(username, limit) → returns Promise<Tweet[]>
  getFollowersArray(username, limit) → returns Promise<User[]>
  etc.

Also add: async getTweetsCount(username) and async getFollowersCount(username) that use the count() method.

Import from '../pagination/index.js'. Use the factory functions.
Update src/client/Scraper.js — don't rewrite it, only add the new methods.
```

### Prompt 7: Cursor Extractor Tests

```
Create tests/client/pagination/cursorExtractor.test.js

Requirements:
- Use vitest
- Import fixtures from tests/fixtures/twitter-responses.js

Test cases:
1. extractFromTimeline() finds bottom cursor in UserTweets response
2. extractFromTimeline() finds top cursor
3. extractFromTimeline() returns null cursors for empty response
4. extractFromTimeline() handles TimelineAddToModule instruction type
5. extractFromSearch() finds cursor in SearchTimeline response
6. extractFromFollowers() finds cursor in Followers response
7. extractFromList() finds cursor in ListLatestTweetsTimeline response
8. extract('timeline', response) dispatches correctly
9. extract('search', response) dispatches correctly
10. extract('followers', response) dispatches correctly
11. hasNextPage() returns true when bottom cursor exists
12. hasNextPage() returns false when no cursor
13. Handles null response gracefully
14. Handles response with empty instructions array
15. Handles response with no entries

File: tests/client/pagination/cursorExtractor.test.js
```

### Prompt 8: Response Parser Tests

```
Create tests/client/pagination/parsers.test.js

Requirements:
- Use vitest
- Import fixtures from tests/fixtures/twitter-responses.js

Test cases:
1. parseTweets() extracts all tweets from timeline response
2. parseTweets() skips cursor entries
3. parseTweets() skips promoted tweets
4. parseTweets() extracts tweet text, id, metrics
5. parseTweets() extracts author info
6. parseTweets() extracts media array
7. parseTweets() handles quoted tweets
8. parseTweets() handles tombstoned tweets
9. parseTweets() handles TweetWithVisibilityResults wrapper
10. parseUsers() extracts user objects from followers response
11. parseUsers() includes all profile fields
12. parseProfile() extracts single profile
13. parseTweet() extracts single tweet detail
14. parseSearchResults() handles mixed tweet/user results
15. All parsers handle empty/null responses without throwing

File: tests/client/pagination/parsers.test.js
```

### Prompt 9: AsyncCursor Tests

```
Create tests/client/pagination/asyncCursor.test.js

Requirements:
- Use vitest with fake timers
- Mock HttpClient to return controlled responses

Test cases:
1. Yields items from first page
2. Automatically fetches next page using cursor
3. Stops when no more cursors
4. Stops when limit is reached
5. Handles empty page (0 items, cursor exists) — fetches one more page
6. toArray() collects all items
7. first() returns first item
8. take(n) returns first n items
9. count() counts without storing
10. Delays between page fetches (verify with fake timers)
11. Handles API error gracefully
12. getPageCount() returns correct count
13. getTotalYielded() returns correct count
14. Works with AbortController cancellation
15. Multiple concurrent cursors don't interfere

Mock HttpClient.graphql() to return fixture responses with cursors.

File: tests/client/pagination/asyncCursor.test.js
```

### Prompt 10: PageIterator Tests

```
Create tests/client/pagination/pageIterator.test.js

Requirements:
- Use vitest

Test cases:
1. filter() only yields items matching predicate
2. map() transforms each item
3. take(n) limits to n items
4. skip(n) skips first n items
5. until(fn) stops at matching item
6. Chaining: filter → map → take works correctly
7. toArray() collects filtered/mapped results
8. first() returns first matching item after transforms
9. count() counts correctly with filters
10. forEach() calls function for each yielded item
11. reduce() accumulates result
12. pipe() chains transforms
13. Standalone filter/map/take work with pipe
14. Lazy evaluation — filter fn not called until iteration
15. Empty iterator yields no items

Create a simple async generator helper for test data.

File: tests/client/pagination/pageIterator.test.js
```

### Prompt 11: Pagination TypeScript Definitions

```
Create types/client/pagination.d.ts

Contents:
- interface Cursor { bottom: string | null; top: string | null; }
- class CursorExtractor { static extractFromTimeline, extractFromSearch, extractFromFollowers, extractFromList, extractFromBookmarks, extract, hasNextPage }
- interface Tweet { id, text, createdAt, likes, retweets, replies, quotes, impressions, bookmarks, author, media, quotedTweet, inReplyTo, urls, hashtags, language }
- interface User { id, username, displayName, bio, followers, following, tweets, avatar, verified, location, url, createdAt }
- interface TweetAuthor { id, username, displayName, avatar, verified }
- interface MediaItem { type: 'photo' | 'video' | 'animated_gif'; url: string; width: number; height: number; }
- function parseTweets(response: any): Tweet[]
- function parseUsers(response: any): User[]
- function parseSearchResults(response: any): { tweets: Tweet[]; users: User[] }
- function parseProfile(response: any): User
- function parseTweet(response: any): Tweet
- class AsyncCursor<T> implements AsyncIterable<T> { [Symbol.asyncIterator], toArray, first, take, count, getPageCount, getTotalYielded }
- class PageIterator<T> implements AsyncIterable<T> { filter, map, take, skip, until, toArray, first, count, forEach, reduce, pipe }
- function createTweetIterator, createFollowerIterator, createSearchIterator, etc.

File: types/client/pagination.d.ts
```

### Prompt 12: Update Scraper Class Types

```
Update types/client/scraper.d.ts (or types/index.d.ts if Scraper types are there) to add the new AsyncGenerator methods:

Add to the Scraper class interface:
  getTweets(username: string, limit?: number): AsyncGenerator<Tweet, void, undefined>;
  getFollowers(username: string, limit?: number): AsyncGenerator<User, void, undefined>;
  getFollowing(username: string, limit?: number): AsyncGenerator<User, void, undefined>;
  searchTweets(query: string, limit?: number): AsyncGenerator<Tweet, void, undefined>;
  searchUsers(query: string, limit?: number): AsyncGenerator<User, void, undefined>;
  getLikes(username: string, limit?: number): AsyncGenerator<Tweet, void, undefined>;
  getBookmarks(limit?: number): AsyncGenerator<Tweet, void, undefined>;
  getListTweets(listId: string, limit?: number): AsyncGenerator<Tweet, void, undefined>;
  getUserMedia(username: string, limit?: number): AsyncGenerator<Tweet, void, undefined>;
  
  // Array convenience methods
  getTweetsArray(username: string, limit?: number): Promise<Tweet[]>;
  getFollowersArray(username: string, limit?: number): Promise<User[]>;
  getFollowingArray(username: string, limit?: number): Promise<User[]>;

Read existing type files first. Add new methods — don't remove existing ones.
```

### Prompt 13: Wire Pagination into Package Exports

```
1. Update src/index.js — add exports:
   export { AsyncCursor, PageIterator, CursorExtractor, parseTweets, parseUsers, filter, map, take, skip, until } from './client/pagination/index.js';

2. Update package.json — add to "exports":
   "./pagination": "./src/client/pagination/index.js"

3. Update types/index.d.ts — add:
   export * from './client/pagination';

Read existing files first. Preserve all existing exports.
```

### Prompt 14: Add Pagination Examples

```
Create examples/pagination.js — executable example showing all pagination patterns.

Contents:
// Example 1: Basic iteration
import { Scraper } from 'xactions';
const scraper = new Scraper();
await scraper.login({ cookies: 'cookies.json' });

// Iterate over tweets
for await (const tweet of scraper.getTweets('elonmusk', 50)) {
  console.log(`${tweet.createdAt} - ${tweet.text.slice(0, 80)}`);
  console.log(`  ❤️ ${tweet.likes}  🔄 ${tweet.retweets}  💬 ${tweet.replies}`);
}

// Example 2: Filtered search
const popularTweets = scraper.searchTweets('#javascript', 200)
  .filter(t => t.likes > 100)
  .map(t => ({ text: t.text, likes: t.likes, author: t.author.username }))
  .take(20);

for await (const tweet of popularTweets) {
  console.log(`@${tweet.author}: ${tweet.text.slice(0, 60)} (${tweet.likes} likes)`);
}

// Example 3: Collect to array
const topFollowers = await scraper.getFollowers('nichxbt', 100)
  .filter(u => u.followers > 1000)
  .toArray();
console.log(`Found ${topFollowers.length} followers with 1000+ followers`);

// Example 4: Search with accumulation
let totalLikes = 0;
for await (const tweet of scraper.searchTweets('from:nichxbt', 500)) {
  totalLikes += tweet.likes;
}
console.log(`Total likes across 500 tweets: ${totalLikes}`);

// Example 5: Pipeline with pipe()
import { filter, map, take } from 'xactions/pagination';
const pipeline = scraper.getTweets('nichxbt')
  .pipe(filter(t => t.media.length > 0), map(t => t.media[0].url), take(10));

File: examples/pagination.js
```

### Prompt 15: Pagination Documentation

```
Create docs/pagination.md — comprehensive documentation for the pagination system.

Structure:
1. Overview — why AsyncGenerators are better than arrays for large datasets
2. Quick Start — basic for-await-of example
3. All Iterator Methods — getTweets, getFollowers, getFollowing, searchTweets, etc.
   - For each: signature, parameters, return type, example
4. Filtering and Transforming — .filter(), .map(), .take(), .skip(), .until()
5. Collecting Results — .toArray(), .first(), .count(), .forEach(), .reduce()
6. Pipeline Pattern — using .pipe() with standalone transform functions
7. Pagination Internals — how cursors work, what happens on each page
8. Performance — memory usage, rate limit awareness, delay configuration
9. Error Handling — what happens when a page fails mid-iteration
10. Advanced: Custom Parsers — writing your own response parser
11. Advanced: Direct AsyncCursor Usage — bypassing convenience methods
12. API Reference — every class and method

Include real code examples for every section.

File: docs/pagination.md
```

---

## Validation

After all 15 prompts:

```bash
ls src/client/pagination/{AsyncCursor,CursorExtractor,PageIterator,parsers,index}.js
ls tests/client/pagination/{cursorExtractor,parsers,asyncCursor,pageIterator}.test.js
ls types/client/pagination.d.ts
ls docs/pagination.md
ls examples/pagination.js

npx vitest run tests/client/pagination/
```
