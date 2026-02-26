# Build 01-11 — Like, Retweet, Follow via HTTP

> **Agent Role:** Implementer  
> **Depends on:** 02-client, 03-auth, 01-endpoints  
> **Creates:** `src/scrapers/twitter/http/engagement.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement engagement mutations: like/unlike, retweet/unretweet, follow/unfollow, block/unblock, mute/unmute, and bookmark operations.

---

## File: `src/scrapers/twitter/http/engagement.js`

### Functions

All functions require authenticated client. All return `{ success: boolean }`.

**Likes:**
1. **`async likeTweet(client, tweetId)`** — GraphQL mutation: `FavoriteTweet`
2. **`async unlikeTweet(client, tweetId)`** — GraphQL mutation: `UnfavoriteTweet`

**Retweets:**
3. **`async retweet(client, tweetId)`** — GraphQL mutation: `CreateRetweet`
4. **`async unretweet(client, tweetId)`** — GraphQL mutation: `DeleteRetweet`

**Following:**
5. **`async followUser(client, userId)`** — REST: `POST /1.1/friendships/create.json` with `user_id`
6. **`async unfollowUser(client, userId)`** — REST: `POST /1.1/friendships/destroy.json` with `user_id`
7. **`async followByUsername(client, username)`** — Resolve to ID, then follow

**Blocking:**
8. **`async blockUser(client, userId)`** — REST: `POST /1.1/blocks/create.json`
9. **`async unblockUser(client, userId)`** — REST: `POST /1.1/blocks/destroy.json`

**Muting:**
10. **`async muteUser(client, userId)`** — REST: `POST /1.1/mutes/users/create.json`
11. **`async unmuteUser(client, userId)`** — REST: `POST /1.1/mutes/users/destroy.json`

**Bookmarks:**
12. **`async bookmarkTweet(client, tweetId)`** — GraphQL mutation: `CreateBookmark`
13. **`async unbookmarkTweet(client, tweetId)`** — GraphQL mutation: `DeleteBookmark`

**Pin:**
14. **`async pinTweet(client, tweetId)`** — REST: `POST /1.1/account/pin_tweet.json`
15. **`async unpinTweet(client, tweetId)`** — REST: `POST /1.1/account/unpin_tweet.json`

### Bulk Operations

16. **`async bulkUnfollow(client, userIds, options = {})`**
    - Unfollow multiple users with delay between each
    - Options: `{ delayMs: 2000, onProgress, dryRun: false }`
    - Returns `{ unfollowed: number, failed: [{ userId, error }] }`
    - This is XActions' core use case

17. **`async bulkLike(client, tweetIds, options = {})`**
    - Like multiple tweets with delay
    - Same progress/error reporting pattern

18. **`async bulkBlock(client, userIds, options = {})`**
    - Block multiple users with delay

### Error Handling

Each mutation may return specific errors:
- `"You have already favorited this Tweet"` — Idempotent, return success
- `"Cannot find specified user"` — Throw `NotFoundError`
- `"To protect our users from spam..."` — Rate limited, throw `RateLimitError`
- `"User has been suspended"` — Throw `TwitterApiError` with details

Handle these by parsing the `errors` array in the GraphQL response.

### Safety Delays

Implement mandatory delays between bulk operations:
- Follow/unfollow: 2-5 seconds between each (Twitter flags rapid following)
- Like/unlike: 1-3 seconds
- Block/mute: 1-2 seconds
- User-configurable via options

---

## Test File: `tests/http-scraper/engagement.test.js`

1. Test like request body format
2. Test unlike request body format  
3. Test follow uses REST endpoint (not GraphQL)
4. Test bulk unfollow respects delay between calls
5. Test bulk unfollow progress callback
6. Test idempotent handling (already liked -> success)
7. Test rate-limit error handling
8. Test auth check before operations

---

## Acceptance Criteria

- [ ] All 15 engagement operations implemented
- [ ] Bulk operations include configurable delays
- [ ] Idempotent responses handled gracefully
- [ ] Error parsing for Twitter-specific error messages
- [ ] Auth enforced on all operations
- [ ] All tests pass
