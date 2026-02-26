# Build 01-10 — Post Tweet via HTTP

> **Agent Role:** Implementer  
> **Depends on:** 02-client, 03-auth, 01-endpoints  
> **Creates:** `src/scrapers/twitter/http/actions.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement write operations (mutations) via Twitter's GraphQL API: posting tweets, posting threads, and deleting tweets. These require authenticated sessions.

---

## File: `src/scrapers/twitter/http/actions.js`

### Functions

1. **`async postTweet(client, text, options = {})`**
   - GraphQL mutation: `CreateTweet`
   - POST to `https://x.com/i/api/graphql/{queryId}/CreateTweet`
   - Body:
     ```json
     {
       "variables": {
         "tweet_text": "Hello world",
         "dark_request": false,
         "media": { "media_entities": [], "possibly_sensitive": false },
         "semantic_annotation_ids": [],
         "reply": null  // or { "in_reply_to_tweet_id": "123", "exclude_reply_user_ids": [] }
       },
       "features": { ... },
       "queryId": "..."
     }
     ```
   - Options: `{ replyTo: tweetId, mediaIds: [], quoteTweetId, sensitive: false }`
   - Returns parsed tweet object of the created tweet
   - Requires authentication (throws `AuthError`)

2. **`async postThread(client, tweets, options = {})`**
   - Post multiple tweets as a self-reply thread
   - Each tweet after the first replies to the previous
   - Input: `[{ text, mediaIds? }, { text, mediaIds? }, ...]`
   - Returns array of created tweet objects
   - Implements delay between posts (1-3 seconds) to avoid rate limiting

3. **`async deleteTweet(client, tweetId)`**
   - GraphQL mutation: `DeleteTweet`
   - Returns `{ success: boolean }`
   - Requires authentication

4. **`async replyToTweet(client, tweetId, text, options = {})`**
   - Wrapper around `postTweet` with `replyTo` set
   - Options: `{ mediaIds: [], excludeReplyUserIds: [] }`

5. **`async quoteTweet(client, tweetId, text, options = {})`**
   - Wrapper around `postTweet` with `quoteTweetId` set

6. **`async schedulePost(client, text, scheduledAt, options = {})`**
   - GraphQL mutation: `CreateScheduledTweet`
   - `scheduledAt` is a Date or Unix timestamp
   - Returns `{ scheduledTweetId }`

### Request Format for Mutations

Twitter mutations use POST with JSON body (not URL-encoded query params like reads):

```javascript
const response = await client.request(`${GRAPHQL_BASE}/${queryId}/CreateTweet`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-csrf-token': client.getCsrfToken(),
    'x-twitter-auth-type': 'OAuth2Session',
  },
  body: JSON.stringify({
    variables: { tweet_text: text, ... },
    features: DEFAULT_FEATURES,
    queryId,
  }),
});
```

### Safety

- All write operations require `client.isAuthenticated()` check
- Implement tweet text validation (max 280 chars for non-Premium, 25000 for Premium)
- Rate limit: ~300 tweets per 3 hours
- Include `dark_request: false` in all mutation variables

---

## Test File: `tests/http-scraper/actions.test.js`

1. Test `postTweet` constructs correct POST body
2. Test `postThread` chains replies correctly (each tweet replies to previous)
3. Test `deleteTweet` sends correct mutation
4. Test auth check before write operations
5. Test tweet text length validation
6. Test reply includes correct `in_reply_to_tweet_id`
7. Test quote tweet includes `quoteTweetId`

---

## Acceptance Criteria

- [ ] Tweet posting works with text, media, replies, and quotes
- [ ] Thread posting chains tweets as self-replies
- [ ] Delete operation works
- [ ] Authentication enforced on all write operations
- [ ] All tests pass
