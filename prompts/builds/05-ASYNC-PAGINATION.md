# Track 05 — AsyncGenerator Pagination

> Competitors (the-convocation/twitter-scraper, agent-twitter-client) use `AsyncGenerator<T>` for cursor-based iteration. XActions' Puppeteer scraper hardcodes limits with browser scrolling. This track builds real cursor-based pagination that works with the programmatic HTTP client.

---

## Research Before Starting

```
src/client/api/              — Scraper API classes from Track 01
src/client/http/             — HttpClient from Track 03
src/scrapers/twitter/index.js — Existing Puppeteer scrolling logic (lines 200-400)
```

Twitter's GraphQL endpoints return cursor-based pages:
```
instructions[] → TimelineAddEntries → entries[] → last entry with entryId "cursor-bottom-*"
  → content.value = "DAACCgACGdy..." (opaque cursor string)
```

---

## Prompts

### Prompt 1: Core Paginator Class

```
Create src/client/pagination/Paginator.js.

This is the core async generator that drives all cursor-based pagination in XActions.

class Paginator<T> {
  constructor(options: {
    fetch: (cursor?: string) => Promise<{ items: T[], cursor?: string }>,
    maxItems?: number,     // Default: Infinity
    delayMs?: number,      // Default: 2000
    onPage?: (page: { items: T[], cursor?: string, pageNumber: number }) => void
  })

  async *[Symbol.asyncIterator]() {
    let cursor = undefined;
    let yielded = 0;
    let pageNumber = 0;

    while (true) {
      const page = await this.fetch(cursor);
      pageNumber++;
      
      if (this.onPage) this.onPage({ ...page, pageNumber });

      for (const item of page.items) {
        yield item;
        yielded++;
        if (yielded >= this.maxItems) return;
      }

      if (!page.cursor || page.items.length === 0) return;
      cursor = page.cursor;

      // Random delay between pages to avoid detection
      await sleep(this.delayMs + Math.random() * 1000);
    }
  }
}

Export as default. Also export helper:
  async function collectAll(generator, limit?) → T[]
  async function collectFirst(generator) → T | null

This file must be production-ready with full JSDoc. The delay is mandatory — X rate-limits aggressive pagination.
```

### Prompt 2: Timeline Cursor Parser

```
Create src/client/pagination/cursorParser.js.

Parse cursor values from Twitter GraphQL timeline responses.

Functions:
1. extractCursorBottom(instructions)
   - Navigate instructions array
   - Find type 'TimelineAddEntries' instruction
   - Find entry with entryId starting with 'cursor-bottom-'
   - Return content.value string or null

2. extractCursorTop(instructions)
   - Same but 'cursor-top-' entryId

3. extractEntriesFromTimeline(instructions)
   - Find TimelineAddEntries instruction
   - Return entries array excluding cursor entries
   - Also handle TimelineReplaceEntry and TimelineAddToModule

4. extractSearchCursor(instructions)
   - Search timeline uses different cursor path
   - Navigate timeline_by_id or search_by_raw_query paths

5. parseCursorType(cursorValue)
   - Detect if cursor is base64 encoded or plain
   - Return { type: 'base64' | 'plain', value: string }

6. buildPaginationVariables(cursor, count)
   - Return { cursor, count } formatted for GraphQL variables

All functions handle null/undefined input gracefully (return null, not throw).
Export all functions as named exports.
```

### Prompt 3: User Tweets Paginator

```
Create src/client/api/tweets.js with getUserTweets async generator.

import { Paginator } from '../pagination/Paginator.js';
import { extractCursorBottom, extractEntriesFromTimeline } from '../pagination/cursorParser.js';
import { Tweet } from '../models/Tweet.js';

async function* getUserTweets(httpClient, userId, options = {}) {
  const { count = 20, maxItems = Infinity, includeReplies = false } = options;
  
  const endpoint = includeReplies ? 'UserTweetsAndReplies' : 'UserTweets';
  const queryId = QUERY_IDS[endpoint];
  
  yield* new Paginator({
    fetch: async (cursor) => {
      const variables = {
        userId,
        count,
        includePromotedContent: false,
        withQuickPromoteEligibilityTweetFields: true,
        ...(cursor && { cursor }),
      };
      
      const response = await httpClient.get(
        `https://x.com/i/api/graphql/${queryId}/${endpoint}`,
        { variables, features: FEATURES }
      );
      
      const instructions = navigateResponse(response, 'data.user.result.timeline_v2.timeline.instructions');
      const entries = extractEntriesFromTimeline(instructions);
      const tweets = entries
        .map(e => Tweet.fromTimelineEntry(e))
        .filter(Boolean);
      const nextCursor = extractCursorBottom(instructions);
      
      return { items: tweets, cursor: nextCursor };
    },
    maxItems,
    delayMs: 2000,
  });
}

Also export:
- async function* getUserTweetsAndReplies(httpClient, userId, options)
- async function* getUserMedia(httpClient, userId, options)
- async function* getLikedTweets(httpClient, userId, options) — uses Likes endpoint

Each function follows the same Paginator pattern with the correct endpoint/queryId/response path.
```

### Prompt 4: Followers/Following Paginators

```
Create src/client/api/relationships.js.

Two main async generators:

async function* getFollowers(httpClient, userId, options = {}) {
  const { count = 20, maxItems = Infinity } = options;
  const queryId = QUERY_IDS.Followers;
  
  yield* new Paginator({
    fetch: async (cursor) => {
      const variables = { userId, count, ...(cursor && { cursor }) };
      const response = await httpClient.get(...);
      
      const instructions = response.data.user.result.timeline.timeline.instructions;
      const entries = extractEntriesFromTimeline(instructions);
      const profiles = entries
        .map(e => Profile.fromTimelineEntry(e))
        .filter(Boolean);
      const nextCursor = extractCursorBottom(instructions);
      
      return { items: profiles, cursor: nextCursor };
    },
    maxItems,
    delayMs: 2500, // Follower endpoints are more tightly limited
  });
}

async function* getFollowing(httpClient, userId, options) — same pattern, Following endpoint

async function* getFollowersYouKnow(httpClient, userId, options) — FollowersYouKnow

async function* getMutualFollowers(httpClient, userId1, userId2) {
  // Iterate followers of user1, check against following set of user2
  // Use Set for O(1) lookup
}

Helper:
async function getRelationship(httpClient, sourceId, targetId) {
  // Call friendships/show endpoint
  // Return { following, followedBy, blocking, muting }
}
```

### Prompt 5: Search Paginator

```
Create src/client/api/search.js.

Supports all Twitter search modes:

async function* searchTweets(httpClient, query, options = {}) {
  const { count = 20, maxItems = 100, mode = 'Latest' } = options;
  // mode: 'Top' | 'Latest' | 'People' | 'Photos' | 'Videos'
  
  const queryId = QUERY_IDS.SearchTimeline;
  
  yield* new Paginator({
    fetch: async (cursor) => {
      const variables = {
        rawQuery: query,
        count,
        querySource: 'typed_query',
        product: mode,
        ...(cursor && { cursor }),
      };
      // ...parse search_by_raw_query response path
    },
    maxItems,
    delayMs: 3000, // Search is heavily rate-limited
  });
}

async function* searchUsers(httpClient, query, options) {
  // product: 'People', parse user entries
}

Also implement Advanced Search builder:
class SearchQueryBuilder {
  from(username) { this.parts.push(`from:${username}`); return this; }
  to(username) { }
  mentioning(username) { }
  since(date) { } // 'YYYY-MM-DD'
  until(date) { }
  minLikes(n) { this.parts.push(`min_faves:${n}`); }
  minRetweets(n) { }
  minReplies(n) { }
  hasMedia() { this.parts.push('filter:media'); }
  hasLinks() { }
  hasImages() { }
  hasVideo() { }
  lang(code) { }
  excludeRetweets() { this.parts.push('-filter:retweets'); }
  or(...terms) { }
  exactPhrase(phrase) { this.parts.push(`"${phrase}"`); }
  build() { return this.parts.join(' '); }
}
```

### Prompt 6: Trends and Explore Paginator

```
Create src/client/api/explore.js.

async function getTrends(httpClient, options = {}) {
  // GET https://x.com/i/api/2/guide.json
  // Params: include_page_configuration=true, ...
  // NOT a paginated endpoint — returns all trends at once
  // Parse response.timeline.instructions → entries with trend data
  
  return trends.map(entry => ({
    name: entry.name,
    query: entry.query,
    tweetCount: entry.description?.match(/(\d[\d,]+)/)?.[1],
    domainContext: entry.trendMetadata?.domainContext,
    url: `https://x.com/search?q=${encodeURIComponent(entry.query)}`,
  }));
}

async function* exploreTweets(httpClient, category = 'trending') {
  // Explore page feeds — paginated
  // Uses GenericTimelineById endpoint
}

async function* getTopicTweets(httpClient, topicId, options) {
  // TopicLandingPage endpoint
  // Paginates through topic timeline
}
```

### Prompt 7: List Timeline Paginator

```
Create src/client/api/lists.js.

async function* getListTweets(httpClient, listId, options = {}) {
  // ListLatestTweetsTimeline endpoint
  // Standard Paginator with cursor
  const queryId = QUERY_IDS.ListLatestTweetsTimeline;
  // Response path: data.list.tweets_timeline.timeline.instructions
}

async function* getListMembers(httpClient, listId, options) {
  // ListMembers endpoint
  // Yields Profile objects
}

async function* getListSubscribers(httpClient, listId, options) {
  // ListSubscribers endpoint
}

async function getUserLists(httpClient, userId) {
  // ListsManagementPageTimeline endpoint
  // Returns all lists (owned and subscribed) — not paginated in practice
  return lists.map(entry => ({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    memberCount: entry.member_count,
    subscriberCount: entry.subscriber_count,
    isPrivate: entry.mode === 'Private',
    ownerId: entry.user_results?.result?.rest_id,
  }));
}

async function createList(httpClient, { name, description, isPrivate }) {
  // CreateList mutation
}

async function addListMember(httpClient, listId, userId) {
  // ListAddMember mutation
}
```

### Prompt 8: Conversations and Thread Paginator

```
Create src/client/api/conversations.js.

async function getThread(httpClient, tweetId) {
  // TweetDetail endpoint returns full conversation thread
  // Parse: data.tweetResult.result + conversation entries
  
  // Return structure:
  return {
    tweet: Tweet.fromGraphQL(mainTweet),
    parentChain: [...],  // Array of tweets above (if it's a reply)
    replies: [...],       // Direct replies
    cursor: nextCursor,   // For loading more replies
  };
}

async function* getThreadReplies(httpClient, tweetId, options = {}) {
  // Paginate through replies to a tweet
  // Uses TweetDetail with cursor for "Show more replies"
}

async function getConversation(httpClient, conversationId) {
  // Full conversation from first tweet to latest
  // Walk the reply chain upward to find root
  // Then paginate forward through all replies
}
```

### Prompt 9: Bookmarks Paginator

```
Create src/client/api/bookmarks.js.

async function* getBookmarks(httpClient, options = {}) {
  // Bookmarks endpoint — requires authentication
  // Response path: data.bookmark_timeline_v2.timeline.instructions
  
  yield* new Paginator({
    fetch: async (cursor) => {
      const queryId = QUERY_IDS.Bookmarks;
      const variables = { count: 20, ...(cursor && { cursor }) };
      // Standard timeline parsing
    },
    maxItems: options.maxItems,
    delayMs: 2000,
  });
}

async function addBookmark(httpClient, tweetId) {
  // CreateBookmark mutation
}

async function removeBookmark(httpClient, tweetId) {
  // DeleteBookmark mutation
}

async function* getBookmarkFolders(httpClient) {
  // BookmarkFoldersSlice endpoint
}

async function* getBookmarkFolderTimeline(httpClient, folderId, options) {
  // BookmarkFolderTimeline endpoint
}
```

### Prompt 10: Direct Messages Paginator

```
Create src/client/api/messages.js.

async function* getConversations(httpClient, options = {}) {
  // DM inbox: dm/inbox_initial_state.json
  // Returns conversation list with last message
  // Cursor-based: dm/inbox_timeline/{conversationId}.json
  
  yield* new Paginator({
    fetch: async (cursor) => {
      const params = cursor 
        ? { cursor, filter: 'none' }
        : { filter: 'none', nsfw_filtering_enabled: false };
      
      const url = cursor
        ? 'https://x.com/i/api/1.1/dm/inbox_timeline.json'
        : 'https://x.com/i/api/1.1/dm/inbox_initial_state.json';
      
      const response = await httpClient.get(url, { params });
      const conversations = parseInboxResponse(response);
      const nextCursor = response.inbox_initial_state?.cursor || response.cursor;
      
      return { items: conversations, cursor: nextCursor };
    },
    maxItems: options.maxItems,
  });
}

async function* getDirectMessages(httpClient, conversationId, options) {
  // dm/conversation/{id}.json with cursor
}

async function sendDirectMessage(httpClient, recipientId, text) {
  // dm/new2.json POST
}
```

### Prompt 11: Notification Feed Paginator

```
Create src/client/api/notifications.js.

async function* getNotifications(httpClient, options = {}) {
  const { filter = 'all' } = options;
  // filter: 'all' | 'mentions' | 'verified'
  
  // Endpoint varies by filter:
  // all: notifications/all.json
  // mentions: notifications/mentions.json
  
  yield* new Paginator({
    fetch: async (cursor) => {
      const params = {
        include_profile_interstitial_type: 1,
        include_blocking: 1,
        include_blocked_by: 1,
        count: 40,
        ...(cursor && { cursor }),
      };
      
      const response = await httpClient.get(
        `https://x.com/i/api/2/notifications/${filter}.json`,
        { params }
      );
      
      // Notifications have a different structure:
      // globalObjects.tweets, globalObjects.users, timeline.instructions
      const notifications = parseNotificationTimeline(response);
      const nextCursor = extractNotificationCursor(response);
      
      return { items: notifications, cursor: nextCursor };
    },
    maxItems: options.maxItems,
  });
}

Model:
class Notification {
  type        // 'like' | 'retweet' | 'follow' | 'reply' | 'mention' | 'quote'
  users       // Profile[] — who triggered it
  tweet       // Tweet | null
  timestamp
  message     // Human-readable: "John liked your tweet"
}
```

### Prompt 12: Pagination Module Index and Factory

```
Create src/client/pagination/index.js that re-exports everything:

export { Paginator, collectAll, collectFirst } from './Paginator.js';
export * from './cursorParser.js';

Create src/client/api/index.js that unifies all API modules:

import * as tweets from './tweets.js';
import * as relationships from './relationships.js';
import * as search from './search.js';
import * as explore from './explore.js';
import * as lists from './lists.js';
import * as conversations from './conversations.js';
import * as bookmarks from './bookmarks.js';
import * as messages from './messages.js';
import * as notifications from './notifications.js';

export { tweets, relationships, search, explore, lists, conversations, bookmarks, messages, notifications };

// Also convenience re-exports at top level:
export const getUserTweets = tweets.getUserTweets;
export const getFollowers = relationships.getFollowers;
export const searchTweets = search.searchTweets;
// ... etc for all commonly used functions

Wire into the main Scraper class:
  scraper.getTweets(username)    → resolves userId, calls getUserTweets
  scraper.getFollowers(username) → resolves userId, calls getFollowers
  scraper.search(query)          → calls searchTweets
  scraper.getTrends()            → calls getTrends
  // ... all methods delegate to API modules
```

### Prompt 13: Pagination Progress Events

```
Create src/client/pagination/ProgressEmitter.js.

import { EventEmitter } from 'events';

class PaginationProgress extends EventEmitter {
  constructor(generator, meta = {}) {
    this.generator = generator;
    this.meta = meta;         // { endpoint, username, etc. }
    this.stats = {
      pagesLoaded: 0,
      itemsYielded: 0,
      startTime: null,
      rateLimitHits: 0,
      errors: 0,
    };
  }

  async *[Symbol.asyncIterator]() {
    this.stats.startTime = Date.now();
    this.emit('start', this.meta);
    
    try {
      for await (const item of this.generator) {
        this.stats.itemsYielded++;
        this.emit('item', item, this.stats);
        yield item;
      }
      this.emit('complete', this.stats);
    } catch (error) {
      this.stats.errors++;
      this.emit('error', error, this.stats);
      throw error;
    }
  }
}

Usage:
const progress = new PaginationProgress(
  scraper.getFollowers('username'),
  { endpoint: 'followers', username: 'username' }
);
progress.on('item', (profile, stats) => {
  console.log(`Fetched ${stats.itemsYielded} followers...`);
});
progress.on('complete', (stats) => {
  console.log(`Done: ${stats.itemsYielded} followers in ${Date.now() - stats.startTime}ms`);
});
for await (const follower of progress) { ... }

This bridges the gap between the clean async generator API and the need for progress reporting in CLI, MCP, and dashboard contexts.
```

### Prompt 14: Collect-to-Array and Streaming Helpers

```
Create src/client/pagination/helpers.js.

Utility functions for consuming async generators in different contexts:

1. async function toArray(generator, limit?) → T[]
   - Collect all items into array, optionally stop at limit

2. async function toStream(generator) → ReadableStream<T>
   - Convert AsyncGenerator to Web ReadableStream for HTTP streaming

3. async function toNodeStream(generator) → Readable
   - Convert to Node.js Readable stream

4. async function toNDJSON(generator) → ReadableStream<string>
   - Convert to newline-delimited JSON stream for SSE/streaming APIs

5. async function batch(generator, size) → AsyncGenerator<T[]>
   - Yield arrays of `size` items instead of individual items

6. async function filter(generator, predicate) → AsyncGenerator<T>
   - Filter items through predicate function

7. async function map(generator, transform) → AsyncGenerator<U>
   - Transform each item

8. async function take(generator, n) → AsyncGenerator<T>
   - Take first n items

9. async function tap(generator, sideEffect) → AsyncGenerator<T>
   - Execute side effect for each item, yield unchanged

10. async function merge(...generators) → AsyncGenerator<T>
    - Interleave items from multiple generators (race-based)

These are composable pipeline operators. Usage:
  const topTweets = await toArray(
    take(filter(scraper.getTweets(user), t => t.likes > 100), 10)
  );
```

### Prompt 15: Pagination Integration Tests

```
Create tests/client/pagination-integration.test.js.

Test the full pagination pipeline with mocked HTTP responses.

15 tests:
1. Paginator yields all items across 3 mock pages
2. Paginator respects maxItems (page has 20, maxItems=15 → yields 15)
3. Paginator stops when cursor is null
4. Paginator stops when page returns 0 items
5. Paginator enforces delay between pages (use vi.useFakeTimers)
6. collectAll returns complete array
7. collectFirst returns single item
8. Breaking from for-await-of stops pagination (no further fetches)
9. getUserTweets integrates with Paginator (3 pages of real-shape fixtures)
10. getFollowers integration with cursor parsing
11. searchTweets with SearchQueryBuilder constructs correct query
12. SearchQueryBuilder.from('user').since('2024-01-01').hasMedia().build() = "from:user since:2024-01-01 filter:media"
13. toArray + filter pipeline works end-to-end
14. batch(generator, 5) yields arrays of 5
15. PaginationProgress emits start, item, complete events in order

All tests use mock HTTP responses matching real Twitter GraphQL response shapes from fixtures.
```

---

## Validation

```bash
node -e "import('./src/client/pagination/Paginator.js').then(m => console.log('✅ Paginator loaded'))"
node -e "import('./src/client/pagination/helpers.js').then(m => console.log('✅ Helpers loaded'))"
npx vitest run tests/client/pagination-integration.test.js
```
