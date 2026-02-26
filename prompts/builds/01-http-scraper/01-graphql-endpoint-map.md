# Build 01-01 — GraphQL Endpoint Map & Constants

> **Agent Role:** Implementer  
> **Depends on:** 00-research-and-plan.md  
> **Creates:** `src/scrapers/twitter/http/endpoints.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Create a complete endpoint constants module that maps every Twitter/X internal API endpoint XActions needs. This file is the single source of truth for all HTTP-based scraper operations.

---

## Requirements

### File: `src/scrapers/twitter/http/endpoints.js`

```javascript
/**
 * Twitter/X Internal API Endpoint Map
 * 
 * These endpoints are reverse-engineered from Twitter's web client.
 * GraphQL query IDs change periodically — update them when Twitter deploys new bundles.
 * 
 * Sources:
 *   - the-convocation/twitter-scraper (MIT)
 *   - d60/twikit (MIT)
 *   - Twitter web client network inspection
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */
```

### Must include:

1. **Base URLs**
   - `GRAPHQL_BASE = 'https://x.com/i/api/graphql'`
   - `REST_BASE = 'https://x.com/i/api'`
   - `API_BASE = 'https://api.x.com'`

2. **Bearer Token** — The public bearer token embedded in Twitter's web client JS bundle:
   - `BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'`
   - This is the same bearer token used by the-convocation/twitter-scraper and other open-source projects

3. **GraphQL Query IDs** — Each has `queryId` and `operationName`:
   - `UserByScreenName` — Profile lookup by username
   - `UserByRestId` — Profile lookup by user ID
   - `UserTweets` — User's tweets timeline
   - `UserTweetsAndReplies` — User's tweets + replies
   - `UserMedia` — User's media tweets
   - `UserLikes` — User's liked tweets
   - `TweetDetail` — Single tweet with thread context
   - `TweetResultByRestId` — Single tweet by ID
   - `SearchTimeline` — Tweet search
   - `Followers` — User's followers list
   - `Following` — User's following list
   - `Likes` — Who liked a tweet
   - `Retweeters` — Who retweeted a tweet
   - `ListMembers` — Members of a Twitter list
   - `ListTimeline` — Tweets in a list
   - `BookmarkTimeline` — User's bookmarks (auth required)
   - `CreateTweet` — Post a tweet (mutation)
   - `DeleteTweet` — Delete a tweet (mutation)
   - `FavoriteTweet` — Like a tweet (mutation)
   - `UnfavoriteTweet` — Unlike (mutation)
   - `CreateRetweet` — Retweet (mutation)
   - `DeleteRetweet` — Unretweet (mutation)
   - `CreateBookmark` — Bookmark a tweet (mutation)
   - `DeleteBookmark` — Remove bookmark (mutation)
   - `FollowUser` / `UnfollowUser` — Follow/unfollow mutations
   - `BlockUser` / `UnblockUser` — Block mutations
   - `MuteUser` / `UnmuteUser` — Mute mutations
   - `SendDM` — Direct message mutation
   - `Notifications` — Notification timeline
   - `HomeTimeline` — Home feed
   - `ExploreTrending` — Trending topics

4. **Feature Flags / Variables** — Default GraphQL feature flag objects that Twitter requires:
   - `DEFAULT_FEATURES` — The gigantic feature flags object Twitter sends with every GraphQL request
   - `DEFAULT_FIELD_TOGGLES` — Field toggle defaults

5. **Rate Limit Constants**
   - Per-endpoint rate limits (requests per 15-minute window)
   - Global rate limit fallback

6. **User Agent Strings** — Array of realistic Chrome user agents for rotation

7. **Helper Functions**
   - `buildGraphQLUrl(queryId, operationName, variables, features)` — Constructs full GET URL with encoded params
   - `buildGraphQLVariables(type, params)` — Builds the variables object for each query type

### GraphQL Query ID Discovery

The query IDs must be **real, currently working IDs** from Twitter's client. Research them by:
1. Studying `the-convocation/twitter-scraper` source code (`src/api.ts`)
2. Studying `d60/twikit` source code (`twikit/client/gql.py`)  
3. Include a comment documenting the source for each ID

Include a `validateEndpoints()` function that makes a lightweight probe to verify query IDs are still valid.

---

## Test File: `tests/http-scraper/endpoints.test.js`

Write tests that:
1. Verify all query IDs are non-empty strings
2. Verify `buildGraphQLUrl` produces correctly encoded URLs
3. Verify `buildGraphQLVariables` returns valid objects for each query type
4. Verify `BEARER_TOKEN` matches expected format
5. Verify `DEFAULT_FEATURES` has all required keys

---

## Integration

- This module is imported by all other `src/scrapers/twitter/http/*.js` files
- Must be a pure ES module (`export const`, `export function`)
- Zero runtime dependencies (no npm packages)
- Must work in Node.js 18+ and edge runtimes (no Node-specific APIs)

---

## Acceptance Criteria

- [ ] All GraphQL query IDs are real, sourced from verified open-source projects
- [ ] `buildGraphQLUrl` produces URLs that match what the Twitter web client sends
- [ ] Feature flags object matches Twitter's current requirements
- [ ] All tests pass
- [ ] Zero dependencies
