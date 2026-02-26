# Build 01-06 — Scrape Tweets via HTTP

> **Agent Role:** Implementer  
> **Depends on:** 01-endpoints, 02-client, 03-auth  
> **Creates:** `src/scrapers/twitter/http/tweets.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement tweet scraping via Twitter's GraphQL API endpoints: user tweets, user replies, single tweet detail, and tweet thread reconstruction.

---

## File: `src/scrapers/twitter/http/tweets.js`

### Functions

1. **`async scrapeTweets(client, username, options = {})`**
   - First resolve username to user ID via `scrapeProfile` or `UserByScreenName`
   - GraphQL query: `UserTweets` with user's `rest_id`
   - Options: `{ limit: 100, includeReplies: false, cursor: null, onProgress }`
   - Uses `client.graphqlPaginate()` for auto-pagination
   - Returns array of parsed tweet objects
   - Each tweet includes: `{ id, text, createdAt, author, metrics, media, quotedTweet, inReplyTo, urls, hashtags, platform: 'twitter' }`

2. **`async scrapeTweetsAndReplies(client, username, options = {})`**
   - GraphQL query: `UserTweetsAndReplies`
   - Same interface as `scrapeTweets` but includes replies
   - Tags each tweet with `isReply: true/false`

3. **`async scrapeTweetById(client, tweetId)`**
   - GraphQL query: `TweetResultByRestId`
   - Returns single parsed tweet object
   - Includes full thread context (parent tweet, quoted tweet)

4. **`async scrapeThread(client, tweetId, options = {})`**
   - GraphQL query: `TweetDetail`
   - Reconstructs full conversation thread:
     - Walk up via `in_reply_to_status_id_str` to find root
     - Collect all replies from the same author
   - Returns `{ rootTweet, tweets: [...], totalReplies }`

5. **`parseTweetData(rawTweet)`** — Pure transform function
   - Handles `__typename: 'Tweet'`, `'TweetWithVisibilityResults'`, `'TweetTombstone'`
   - Extracts from `tweet_results.result.legacy`:
     ```javascript
     {
       id: string,                    // rest_id / id_str
       text: string,                  // full_text
       createdAt: string,             // created_at -> ISO string
       author: {                      // core.user_results.result.legacy
         id: string,
         username: string,
         name: string,
         avatar: string,
         verified: boolean,
       },
       metrics: {
         likes: number,               // favorite_count
         retweets: number,            // retweet_count
         replies: number,             // reply_count
         quotes: number,              // quote_count
         bookmarks: number,           // bookmark_count
         views: number,               // views.count (from ext_views)
       },
       media: [{                      // extended_entities.media
         type: 'photo'|'video'|'animated_gif',
         url: string,                 // media_url_https
         width: number,
         height: number,
         videoUrl: string|null,       // video_info.variants highest bitrate
       }],
       quotedTweet: object|null,      // Recursively parsed
       inReplyTo: {                   // If this is a reply
         tweetId: string,
         userId: string,
         username: string,
       } | null,
       urls: [{ url, expandedUrl, displayUrl }],
       hashtags: [string],
       mentions: [{ username, id }],
       isRetweet: boolean,
       retweetOf: object|null,        // Original tweet if retweet
       lang: string,                  // lang field
       source: string,                // source (Twitter Web App, etc)
       platform: 'twitter',
     }
     ```

6. **`parseTimelineInstructions(instructions)`** — Parse Twitter's timeline response format
   - Twitter wraps timeline data in `instructions` array
   - Handle `TimelineAddEntries`, `TimelineAddToModule`, `TimelinePinEntry`
   - Extract tweets + cursor from instructions
   - Return `{ tweets: [], cursor: string|null }`

### Pagination

Twitter's timeline pagination uses cursor-based pagination:
```json
{
  "entryId": "cursor-bottom-1234567890",
  "content": {
    "cursorType": "Bottom",
    "value": "DAACCgACGKi..."
  }
}
```

The `graphqlPaginate` method should handle this, but `parseTimelineInstructions` must extract the bottom cursor correctly.

---

## Test File: `tests/http-scraper/tweets.test.js`

1. Test `parseTweetData` with a standard tweet (text + metrics)
2. Test `parseTweetData` with media attachments (photo, video)
3. Test `parseTweetData` with a quote tweet
4. Test `parseTweetData` with a retweet
5. Test `parseTweetData` with `TweetTombstone` (deleted tweet)
6. Test `parseTimelineInstructions` cursor extraction
7. Test `scrapeTweets` pagination calling pattern
8. Test thread reconstruction ordering

Provide realistic fixture data matching actual Twitter GraphQL response shapes.

---

## Acceptance Criteria

- [ ] Parses all tweet types (original, reply, quote, retweet)
- [ ] Media extraction handles photos, videos, GIFs
- [ ] Pagination cursors extracted correctly
- [ ] Thread reconstruction produces ordered conversation
- [ ] Output matches existing XActions tweet format
- [ ] All tests pass
