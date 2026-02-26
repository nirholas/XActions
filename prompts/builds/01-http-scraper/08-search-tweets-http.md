# Build 01-08 — Search Tweets via HTTP

> **Agent Role:** Implementer  
> **Depends on:** 01-endpoints, 02-client, tweets.js  
> **Creates:** `src/scrapers/twitter/http/search.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement tweet search via Twitter's `SearchTimeline` GraphQL endpoint. This replaces the Puppeteer-based `searchTweets()`.

---

## File: `src/scrapers/twitter/http/search.js`

### Functions

1. **`async searchTweets(client, query, options = {})`**
   - GraphQL query: `SearchTimeline`
   - Variables: `{ rawQuery: query, product: 'Latest'|'Top'|'People'|'Photos'|'Videos' }`
   - Options: `{ limit: 100, type: 'Latest', cursor, onProgress, since, until, from, to, minLikes, minRetweets, lang, filter }`
   - Auto-paginate through results
   - Return array of parsed tweet objects (same format as tweets.js)
   - Works with guest tokens (limited) and auth tokens (full access)

2. **`async searchUsers(client, query, options = {})`**
   - Same endpoint with `product: 'People'`
   - Return array of user objects
   - Useful for finding accounts by keyword

3. **`buildAdvancedQuery(options)`** — Build Twitter advanced search query string
   - Compose query from structured options into Twitter's search syntax:
     ```javascript
     buildAdvancedQuery({
       keywords: 'javascript',
       from: 'nichxbt',
       since: '2025-01-01',
       until: '2025-12-31',
       minLikes: 100,
       minRetweets: 50,
       lang: 'en',
       filter: 'links',       // 'links', 'images', 'videos', 'media', 'native_video'
       exclude: 'retweets',   // 'retweets', 'replies'
       near: 'San Francisco', // geo search
     })
     // Returns: "javascript from:nichxbt since:2025-01-01 until:2025-12-31 min_faves:100 min_retweets:50 lang:en filter:links -filter:retweets"
     ```

4. **`async scrapeTrending(client, options = {})`**
   - REST endpoint: `GET /1.1/trends/place.json?id=1` (worldwide) or specific WOEID
   - Or GraphQL `GenericTimelineById` for Explore tab
   - Return `[{ name, tweetCount, url, category }]`

5. **`async scrapeHashtag(client, hashtag, options = {})`**
   - Wrapper around `searchTweets(client, '#' + hashtag, options)`
   - Convenience function maintaining backward compatibility

### Search Types

Twitter search supports these product types:
- `Top` — Most relevant/popular tweets (default)
- `Latest` — Chronological (most recent first)  
- `People` — User accounts matching query
- `Photos` — Tweets with images
- `Videos` — Tweets with video

### Rate Limits

- Guest: ~50 searches per 15 minutes
- Authenticated: ~180 searches per 15 minutes
- Each pagination request counts as a separate search

---

## Test File: `tests/http-scraper/search.test.js`

1. Test `buildAdvancedQuery` with all options
2. Test `buildAdvancedQuery` with minimal options
3. Test `searchTweets` constructs correct GraphQL variables
4. Test search result parsing (reuses tweet parser)
5. Test `searchUsers` returns user objects
6. Test pagination cursor extraction from search results
7. Test `scrapeHashtag` prefixes `#` correctly
8. Test trending response parsing

---

## Acceptance Criteria

- [ ] All 5 search product types supported
- [ ] Advanced query builder produces valid Twitter search syntax
- [ ] Pagination works through search results
- [ ] Backward compatible with existing `searchTweets()` and `scrapeHashtag()`  
- [ ] Works with guest tokens for basic searches
- [ ] All tests pass
