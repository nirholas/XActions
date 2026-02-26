# Track 01 — HTTP-Based Scraper: Research & Plan

> **Agent Role:** Senior reverse-engineering researcher  
> **Output:** Architecture document + endpoint map + implementation plan  
> **Priority:** P0 — This is the single highest-impact improvement

---

## Objective

Research Twitter/X's internal GraphQL and REST API endpoints, document their request/response formats, and produce a complete architecture plan for an HTTP-based scraper layer that replaces Puppeteer for data retrieval operations.

---

## Research Tasks

### 1. Reverse-Engineer Twitter's Internal API

Study these open-source implementations that already use Twitter's internal API:

- **the-convocation/twitter-scraper** (Node.js, 588 stars) — `https://github.com/the-convocation/twitter-scraper`
  - Study `src/api.ts`, `src/auth.ts`, `src/profile.ts`, `src/tweets.ts`
  - Document how they get bearer tokens, guest tokens, and csrf tokens
  - Map every GraphQL query ID they use

- **d60/twikit** (Python, 4,060 stars) — `https://github.com/d60/twikit`
  - Study `twikit/client/`, `twikit/twikit_async/`
  - Document GraphQL query parameter formats
  - Note how they handle cursor-based pagination

- **romeoscript/agent-twitter-client** (415 stars) — `https://github.com/romeoscript/agent-twitter-client`
  - Study how they integrate with ElizaOS
  - Document their auth flow

### 2. Document API Endpoints

Create a complete endpoint map covering:

| Endpoint Type | Example | Authentication |
|--------------|---------|----------------|
| Guest endpoints | Trends, search (limited) | Bearer + guest token |
| Auth endpoints | Profile, tweets, followers | Bearer + auth_token cookie |
| Write endpoints | Post tweet, like, follow | Bearer + auth_token + ct0 csrf |
| GraphQL queries | UserByScreenName, TweetDetail | Bearer + auth_token |

For each endpoint, document:
- Full URL (e.g., `https://x.com/i/api/graphql/{queryId}/UserByScreenName`)
- HTTP method (GET/POST)
- Required headers (`authorization`, `x-csrf-token`, `cookie`, `x-twitter-auth-type`, `x-twitter-active-user`)
- Query parameters or POST body format
- Response JSON structure (with actual field names)
- Pagination cursor format
- Rate limits (requests per 15-min window)

### 3. Document Authentication Flows

Map all auth methods:
1. **Guest token flow** — unauthenticated, limited access
2. **Cookie-based auth** — import `auth_token` + `ct0` from browser
3. **Login flow** — POST username/password (triggers 2FA, captcha)
4. **OAuth 2.0 PKCE** — if applicable to internal API

### 4. Audit Current XActions Scraper

Read and document the current Puppeteer-based scraper:
- File: `src/scrapers/twitter/index.js` (952 lines)
- List every exported function and what it does
- Identify which functions can be replaced with HTTP calls
- Identify which functions genuinely need a browser (e.g., login with 2FA)

Current exports:
```
createBrowser, createPage, loginWithCookie,
scrapeProfile, scrapeFollowers, scrapeFollowing, scrapeTweets,
searchTweets, scrapeThread, scrapeLikes, scrapeHashtag, scrapeMedia,
scrapeListMembers, scrapeBookmarks, scrapeNotifications, scrapeTrending,
scrapeCommunityMembers, scrapeSpaces, exportToJSON, exportToCSV
```

### 5. Architecture Plan

Produce a detailed plan that:

1. **Keeps Puppeteer scraper untouched** — no breaking changes
2. **Adds `src/scrapers/twitter/http/` directory** with HTTP-based equivalents
3. **Adapter pattern** — `src/scrapers/adapters/` already exists, add `http.js` adapter
4. **Falls back gracefully** — if HTTP request returns 403/429, optionally fall back to Puppeteer
5. **Same function signatures** — `scrapeProfile(options)` works the same whether HTTP or Puppeteer

### 6. Dependency Analysis

Evaluate and recommend:
- **HTTP client:** `undici` (Node.js built-in), `got`, or raw `fetch`  
- **Cookie jar:** `tough-cookie` for managing session cookies
- **Proxy support:** HTTP/SOCKS5 proxy rotation
- **Response parsing:** Custom lightweight parsers vs full JSON parsing

---

## Output Format

Create a document called `docs/architecture/http-scraper.md` that contains:

1. **Endpoint Map** — Every endpoint with full request/response details
2. **Auth Flow Diagrams** — Mermaid diagrams of each auth method
3. **Architecture Diagram** — Module dependency graph
4. **Migration Table** — Which functions move to HTTP, which stay Puppeteer
5. **File Plan** — Every new file to create with its purpose
6. **Risk Assessment** — What can break, mitigation strategies

---

## Success Criteria

- [ ] Every GraphQL query ID documented with parameters and response shape
- [ ] Auth token acquisition flow documented step-by-step
- [ ] Architecture plan covers all 18 exported scraper functions
- [ ] No function signature changes from current API
- [ ] Fallback strategy defined for every failure mode
- [ ] Dependency choices justified with size/performance comparison
