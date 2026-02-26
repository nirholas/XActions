# Build 04-13 — Cross-Platform Scraper Tests

> **Creates:** `tests/scrapers/bluesky.test.js`, `tests/scrapers/mastodon.test.js`, `tests/scrapers/threads.test.js`
> **Tests:** `src/scrapers/bluesky/`, `src/scrapers/mastodon/`, `src/scrapers/threads/`

---

## Task

Write tests for all non-Twitter scraper modules. Each platform has its own API patterns.

---

## Test Plan

### Bluesky Scraper
1. `scrapeProfile(handle)` returns profile via AT Protocol
2. `scrapeProfile()` handles invalid handle
3. `scrapePosts(handle, count)` returns posts array
4. `scrapeFollowers(handle)` returns follower list
5. `scrapeFollowing(handle)` returns following list
6. `searchPosts(query)` returns search results
7. Auth with app password works
8. Rate limit handling

### Mastodon Scraper
9. `scrapeProfile(instance, username)` returns profile
10. `scrapePosts(instance, username)` returns toots
11. `scrapeFollowers(instance, username)` returns followers
12. `searchAccounts(instance, query)` returns matches
13. Instance URL validation
14. OAuth token handling
15. Federation-aware (handles remote accounts)

### Threads Scraper
16. `scrapeProfile(username)` returns profile
17. `scrapePosts(username)` returns threads posts
18. `searchPosts(query)` returns results
19. Handles Meta's GraphQL API structure

### Unified Interface (`src/scrapers/index.js`)
20. `scrape('twitter', 'profile', { username })` routes to Twitter
21. `scrape('bluesky', 'profile', { handle })` routes to Bluesky
22. `scrape('mastodon', 'profile', { instance, username })` routes to Mastodon
23. `scrape('threads', 'profile', { username })` routes to Threads
24. `scrape('unknown', ...)` throws error
25. Backward-compatible Twitter re-exports work

---

## Acceptance Criteria
- [ ] All 4 platform scrapers tested
- [ ] Unified `scrape()` interface routing tested
- [ ] API calls mocked — no real network requests
- [ ] Each platform's auth mechanism tested
- [ ] Error handling per platform
- [ ] Minimum 25 test cases
- [ ] All tests pass
