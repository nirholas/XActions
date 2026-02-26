# Build 01-09 — Scrape Thread via HTTP

> **Agent Role:** Implementer  
> **Depends on:** tweets.js, profile.js  
> **Creates:** `src/scrapers/twitter/http/thread.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement full conversation thread scraping and reconstruction via Twitter's `TweetDetail` GraphQL endpoint.

---

## File: `src/scrapers/twitter/http/thread.js`

### Functions

1. **`async scrapeThread(client, tweetId, options = {})`**
   - GraphQL query: `TweetDetail`
   - Variables: `{ focalTweetId: tweetId, with_rux_injections: false, rankingMode: 'Relevance' }`
   - Parse the conversation module structure:
     - `conversationthread-{id}` entries for reply chains
     - `tweet-{id}` for individual tweets
     - `cursor-showmore-{id}` for "Show more replies"
   - Reconstruct thread as ordered array:
     ```javascript
     {
       rootTweet: parsedTweet,
       authorReplies: [parsedTweet, ...],  // Same author's continuation
       conversation: [parsedTweet, ...],   // All replies in thread
       totalReplies: number,
       hasMore: boolean,
       cursor: string|null,
     }
     ```

2. **`async scrapeFullThread(client, tweetId, options = {})`**
   - Walk up the reply chain to find the root tweet
   - Then scrape the full thread from root
   - Uses `in_reply_to_status_id_str` to traverse parent tweets
   - Returns complete thread from root to all leaves

3. **`async scrapeConversation(client, tweetId, options = {})`**
   - Get all replies to a specific tweet (not just author's)
   - Paginate through "Show more replies" cursors
   - Options: `{ limit: 200, sortBy: 'relevance'|'recency' }`

4. **`parseConversationModule(module)`** — Parse Twitter's conversation thread module
   - Handle `TimelineTimelineModule` with `items` array
   - Each item is a `TimelineTimelineItem` containing tweet or cursor
   - Group by `conversationthread-{id}` to associate replies with parent

5. **`reconstructThread(tweets)`** — Pure function
   - Input: flat array of parsed tweets with `inReplyTo` fields
   - Output: tree structure or ordered flat array
   - Handles:
     - Self-threads (same author replying to themselves)
     - Branching conversations
     - Missing tweets (deleted or rate-limited)

---

## Test File: `tests/http-scraper/thread.test.js`

1. Test thread reconstruction from flat tweet array
2. Test self-thread ordering (author's continuation)
3. Test "walk up" to find root tweet
4. Test conversation module parsing
5. Test cursor extraction for "Show more"
6. Test handling of deleted tweets in thread

---

## Acceptance Criteria

- [ ] Full thread reconstruction from any tweet in the chain
- [ ] Author's self-thread extracted separately
- [ ] Pagination through "Show more replies"
- [ ] Compatible with existing `scrapeThread()` output format
- [ ] All tests pass
