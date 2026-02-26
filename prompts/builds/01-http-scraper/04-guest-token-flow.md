# Build 01-04 — Guest Token Flow

> **Agent Role:** Implementer  
> **Depends on:** 02-http-client-core.md, 03-auth-token-manager.md  
> **Creates:** `src/scrapers/twitter/http/guest.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement a dedicated guest token manager that enables unauthenticated access to Twitter's public API. Guest tokens allow scraping public profiles, tweets, and search results without any login credentials.

---

## File: `src/scrapers/twitter/http/guest.js`

### Class: `GuestTokenManager`

1. **`async activate()`** — Get a new guest token
   - POST `https://api.x.com/1.1/guest/activate.json`
   - Headers: `authorization: Bearer {BEARER_TOKEN}`
   - Response: `{ guest_token: "1234567890" }`
   - Store token with timestamp

2. **`async getToken()`** — Get valid token (cached or fresh)
   - Return cached token if < 2.5 hours old (tokens expire ~3h)
   - Auto-activate new token if expired
   - Thread-safe: if multiple calls happen simultaneously, only one activation fires

3. **`async getHeaders()`** — Build unauthenticated request headers
   - `authorization: Bearer {BEARER_TOKEN}`
   - `x-guest-token: {token}`
   - `x-twitter-active-user: yes`
   - `x-twitter-client-language: en`
   - User-Agent from rotation pool

4. **`isExpired()`** — Check if current token is expired

5. **Token Pool** — Support multiple guest tokens for rate-limit distribution
   - `addToken(token)` — Add a pre-fetched token to the pool
   - `getNextToken()` — Round-robin through pool
   - `removeExpired()` — Prune expired tokens

### Rate Limits for Guest Tokens

Guest tokens have stricter limits than authenticated sessions:
- Search: ~50 requests per 15 minutes
- Profile lookup: ~100 requests per 15 minutes  
- Tweet lookup: ~100 requests per 15 minutes

Track per-token rate limits and auto-rotate to the next available token.

### Concurrency Safety

```javascript
// Prevent thundering herd on token activation
#activationPromise = null;

async getToken() {
  if (this.isExpired()) {
    if (!this.#activationPromise) {
      this.#activationPromise = this.activate().finally(() => {
        this.#activationPromise = null;
      });
    }
    await this.#activationPromise;
  }
  return this.#currentToken;
}
```

---

## Test File: `tests/http-scraper/guest.test.js`

1. Test token activation parses response correctly
2. Test caching returns same token within expiry window
3. Test auto-refresh after expiry
4. Test concurrent calls only trigger one activation
5. Test token pool round-robin
6. Test header generation includes guest token
7. Test rate-limit tracking per token

---

## Acceptance Criteria

- [ ] Guest token acquisition works with real bearer token
- [ ] Caching prevents unnecessary activations
- [ ] Concurrent safety via promise deduplication
- [ ] Token pool supports rate-limit distribution
- [ ] All tests pass
