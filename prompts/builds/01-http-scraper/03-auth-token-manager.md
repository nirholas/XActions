# Build 01-03 — Auth Token Manager

> **Agent Role:** Implementer  
> **Depends on:** 01-graphql-endpoint-map.md, 02-http-client-core.md  
> **Creates:** `src/scrapers/twitter/http/auth.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Build the authentication manager that handles all token lifecycle operations: guest token acquisition, cookie-based auth setup, session validation, and token refresh.

---

## File: `src/scrapers/twitter/http/auth.js`

### Class: `TwitterAuth`

Must implement:

1. **`async getGuestToken()`** — Acquire anonymous guest token
   - POST `https://api.x.com/1.1/guest/activate.json` with bearer token
   - Cache the guest token (valid for ~3 hours)
   - Auto-refresh when expired
   - Return `{ guestToken, expiresAt }`

2. **`async loginWithCookies(cookieString)`** — Set up authenticated session
   - Parse cookie string from browser (format: `auth_token=xxx; ct0=yyy; ...`)
   - Extract `auth_token`, `ct0`, `twid` cookies
   - Validate the session by calling `https://x.com/i/api/1.1/account/verify_credentials.json`
   - Return user info `{ id, username, name }` on success
   - Throw `AuthError` with descriptive message on failure

3. **`async loginWithCredentials(username, password, email)`** — Full login flow
   - Implement Twitter's multi-step login flow:
     1. `POST /i/api/1.1/onboarding/task.json` with flow_token init
     2. Submit username via `LoginJsInstrumentationSubtask`
     3. Submit password via `LoginEnterPassword`
     4. Handle `LoginAcid` (email verification step)
     5. Handle `AccountDuplicationCheck`
     6. Handle `LoginTwoFactorAuthChallenge` (2FA if enabled)
   - Save resulting cookies
   - Return user info on success

4. **`async refreshSession()`** — Refresh expired session
   - Detect when cookies are stale (API returns 401)
   - If we have credentials, re-login
   - If cookie-only, throw `AuthError('Session expired, re-import cookies')`

5. **`async saveCookies(filePath)`** — Persist cookies to disk
   - JSON format compatible with the-convocation/twitter-scraper
   - Encrypts sensitive values if encryption key provided

6. **`async loadCookies(filePath)`** — Load saved cookies
   - Parse JSON cookie file
   - Validate session is still active
   - Return false if expired

7. **`getHeaders(authenticated)`** — Build request headers
   - If authenticated: bearer + auth_token + ct0 + twitter auth headers
   - If guest: bearer + guest token
   - Always include: user-agent, accept, accept-language, content-type

### Cookie Management

Handle the full set of Twitter cookies:
- `auth_token` — The main session token (HttpOnly, Secure)
- `ct0` — CSRF token (must be sent as both cookie and `x-csrf-token` header)
- `twid` — Twitter user ID
- `guest_id` — Guest identifier
- `guest_id_marketing` / `guest_id_ads` — Tracking cookies
- `personalization_id` — Personalization token
- `kdt` — Keep-alive token

### Session Validation

```javascript
async validateSession() {
  // Call verify_credentials endpoint
  // Check response for valid user data
  // Return { valid: boolean, user: { id, username, name } | null, reason: string }
}
```

---

## Test File: `tests/http-scraper/auth.test.js`

1. Test cookie string parsing extracts all required cookies
2. Test guest token caching and refresh logic  
3. Test header generation for authenticated vs guest requests
4. Test session validation success and failure paths
5. Test cookie save/load round-trip
6. Test that expired guest tokens trigger refresh
7. Test login flow step sequencing (mocked responses)
8. Test CSRF token extraction from cookies

Use `vitest` with mocked `fetch`.

---

## Acceptance Criteria

- [ ] Guest token flow works end-to-end
- [ ] Cookie import handles real Chrome/Firefox cookie strings
- [ ] Login flow handles all Twitter subtask steps
- [ ] Session refresh handles expiration gracefully
- [ ] Cookie persistence works with JSON files
- [ ] All tests pass with mocked fetch
