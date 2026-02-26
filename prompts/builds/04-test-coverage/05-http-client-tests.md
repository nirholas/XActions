# Build 04-05 — HTTP Client Tests

> **Creates:** `tests/scrapers/httpClient.test.js`
> **Tests:** `src/scrapers/twitter/http.js` (from Track 01)

---

## Task

Write tests for the HTTP-based Twitter client. Mock `fetch` to return fixture responses and verify correct parsing, cursor pagination, and error handling.

---

## Test Plan

### Token & Auth
1. `getGuestToken()` returns valid token from activation endpoint
2. `getGuestToken()` throws AuthError on failure
3. `buildHeaders()` includes authorization, guest token, csrf token
4. `buildHeaders()` includes cookie when authenticated

### GraphQL Request Building
5. `buildGraphQLUrl()` constructs correct URL with variables and features
6. `buildGraphQLUrl()` encodes query parameters correctly
7. Request includes proper content-type header

### Profile Scraping
8. `scrapeProfile()` returns parsed profile from GraphQL response
9. `scrapeProfile()` maps `legacy` fields to flat structure
10. `scrapeProfile()` includes blue verification status
11. `scrapeProfile()` throws NotFoundError for code 34

### Tweet Scraping
12. `scrapeTweets()` extracts tweets from timeline instructions
13. `scrapeTweets()` handles cursor pagination
14. `scrapeTweets()` respects count limit
15. `scrapeTweets()` includes engagement metrics

### Follower Scraping
16. `scrapeFollowers()` parses follower user objects
17. `scrapeFollowers()` paginates with cursor
18. `scrapeFollowing()` works same as followers

### Search
19. `searchTweets()` passes query in variables
20. `searchTweets()` returns parsed search results

### Error Handling
21. 429 response → RateLimitError with retry info
22. 401 response → AuthError
23. 403 response → AuthError
24. 404 response → NotFoundError
25. 500 response → TwitterApiError
26. Network timeout → NetworkError
27. GraphQL error code 63 → SuspendedError

### Rate Limit Integration
28. Rate limit headers parsed after each request
29. Proactive throttle when remaining is low

---

## Implementation Pattern

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profileFixture, tweetsFixture, errorsFixture, rateLimitFixture } from '../fixtures/index.js';

describe('HTTP Twitter Client', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  describe('scrapeProfile', () => {
    it('returns parsed profile from GraphQL response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(Object.entries(rateLimitFixture.headers.normal)),
        json: async () => profileFixture,
      });

      const { scrapeProfile } = await import('../../src/scrapers/twitter/http.js');
      const profile = await scrapeProfile('testuser');
      
      expect(profile.username).toBe('testuser');
      expect(profile.followersCount).toBe(1234);
      expect(profile.isBlueVerified).toBe(true);
    });
  });
});
```

---

## Acceptance Criteria
- [ ] 29+ test cases covering all HTTP client functions
- [ ] fetch fully mocked — no real network requests
- [ ] Fixture data used for response parsing tests
- [ ] All HTTP error codes mapped to correct error classes
- [ ] Pagination/cursor logic tested
- [ ] Rate limit header extraction tested
- [ ] All tests pass
