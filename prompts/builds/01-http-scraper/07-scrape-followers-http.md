# Build 01-07 — Scrape Followers/Following via HTTP

> **Agent Role:** Implementer  
> **Depends on:** 01-endpoints, 02-client, 03-auth  
> **Creates:** `src/scrapers/twitter/http/relationships.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement follower/following scraping via Twitter's GraphQL API. These are authenticated-only endpoints that require `auth_token`.

---

## File: `src/scrapers/twitter/http/relationships.js`

### Functions

1. **`async scrapeFollowers(client, username, options = {})`**
   - Resolve username to user ID first
   - GraphQL query: `Followers` with `userId` variable
   - Options: `{ limit: 1000, cursor: null, onProgress }`
   - Auto-paginate via `client.graphqlPaginate()`
   - Return array of user objects matching XActions format:
     ```javascript
     { username, name, bio, verified, avatar, followersCount, followingCount, platform: 'twitter' }
     ```
   - Requires authentication (throws `AuthError` if guest token)

2. **`async scrapeFollowing(client, username, options = {})`**
   - GraphQL query: `Following` with `userId` variable
   - Same interface as `scrapeFollowers`

3. **`async scrapeNonFollowers(client, username, options = {})`**
   - Scrape both followers and following
   - Compare sets to find users you follow who don't follow back
   - Return `{ nonFollowers: [...], mutuals: [...], stats: { following, followers, nonFollowers, mutuals } }`
   - This is XActions' most popular feature

4. **`async scrapeLikers(client, tweetId, options = {})`**
   - GraphQL query: `Likes` (users who liked a tweet)
   - Returns array of user objects

5. **`async scrapeRetweeters(client, tweetId, options = {})`**
   - GraphQL query: `Retweeters` (users who retweeted)
   - Returns array of user objects

6. **`async scrapeListMembers(client, listId, options = {})`**
   - GraphQL query: `ListMembers`
   - Returns array of user objects

7. **`parseUserList(instructions)`** — Parse timeline instructions that contain user entries
   - Handle `TimelineAddEntries` with `user-` entry IDs
   - Extract user data from `user_results.result`
   - Use `parseUserData()` from profile.js for consistent formatting
   - Return `{ users: [], cursor: string|null }`

### Pagination Notes

Follower/following lists can be massive. Key considerations:
- Each page returns ~20-50 users
- Cursor format is different from tweet timelines
- Rate limit: ~15 requests per 15 minutes for followers endpoint
- For large accounts (>100K followers), implement chunked progress reporting

### Non-Follower Detection

```javascript
async scrapeNonFollowers(client, username, options = {}) {
  const { onProgress } = options;
  
  // Phase 1: Scrape following list
  onProgress?.({ phase: 'following', progress: 0 });
  const following = await scrapeFollowing(client, username, { 
    onProgress: (p) => onProgress?.({ phase: 'following', ...p }) 
  });
  
  // Phase 2: Scrape followers list
  onProgress?.({ phase: 'followers', progress: 0 });
  const followers = await scrapeFollowers(client, username, {
    onProgress: (p) => onProgress?.({ phase: 'followers', ...p })
  });
  
  // Phase 3: Compare
  const followerSet = new Set(followers.map(f => f.username));
  const nonFollowers = following.filter(f => !followerSet.has(f.username));
  const mutuals = following.filter(f => followerSet.has(f.username));
  
  return { nonFollowers, mutuals, stats: { ... } };
}
```

---

## Test File: `tests/http-scraper/relationships.test.js`

1. Test `parseUserList` with list of user entries
2. Test cursor extraction from follower response
3. Test `scrapeNonFollowers` comparison logic
4. Test auth requirement (throws `AuthError` for guest)
5. Test progress callback firing
6. Test pagination limit enforcement
7. Test deduplication across pages

---

## Acceptance Criteria

- [ ] Follower/following scraping works with pagination
- [ ] Non-follower detection produces correct set comparison
- [ ] Progress callbacks fire with accurate counts
- [ ] Auth requirement enforced
- [ ] Output matches existing XActions user format
- [ ] All tests pass
