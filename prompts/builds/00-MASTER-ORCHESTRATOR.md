# XActions — Master Build Orchestrator

> This document coordinates 11 build tracks that close every gap between XActions and the top X/Twitter repos (twikit 4k★, twitter-scraper 4k★, agent-twitter-client 415★, twitter-mcp 359★). Each track has its own prompt file with 15 agent-executable prompts. Every prompt produces production code — no mocks, no stubs, no placeholders.

---

## Gap Analysis Summary

| # | Track | Priority | Competitor Reference | Status |
|---|-------|----------|---------------------|--------|
| 1 | Programmatic Scraper Class | P0 | the-convocation/twitter-scraper, agent-twitter-client | `01-SCRAPER-LIBRARY.md` |
| 2 | Cookie Auth + Persistence | P0 | twikit, agent-twitter-client | `02-AUTH-SYSTEM.md` |
| 3 | Rate Limit + Adaptive Backoff | P1 | the-convocation/twitter-scraper | `03-RATE-LIMITING.md` |
| 4 | Comprehensive Test Suite | P1 | all top repos | `04-TEST-SUITE.md` |
| 5 | AsyncGenerator Pagination | P1 | the-convocation/twitter-scraper | `05-ASYNC-PAGINATION.md` |
| 6 | Media Upload Pipeline | P2 | agent-twitter-client | `06-MEDIA-PIPELINE.md` |
| 7 | Twitter API v2 Hybrid | P2 | agent-twitter-client | `07-V2-API-HYBRID.md` |
| 8 | Cloudflare TLS Bypass | P2 | the-convocation/twitter-scraper | `08-TLS-BYPASS.md` |
| 9 | Python SDK | P3 | twikit, bisguzar/twitter-scraper | `09-PYTHON-SDK.md` |
| 10 | Internationalization | P3 | twikit | `10-I18N.md` |
| 11 | CORS Proxy + Frontend Embedding | P3 | the-convocation/twitter-scraper | `11-CORS-PROXY.md` |

---

## Build Order (Dependency Graph)

```
Phase 1 (Foundation) — parallel:
  02-AUTH-SYSTEM       ← everything depends on auth
  03-RATE-LIMITING     ← needed by scraper + API

Phase 2 (Core Library) — depends on Phase 1:
  01-SCRAPER-LIBRARY   ← uses auth + rate limiting
  05-ASYNC-PAGINATION  ← built into scraper class

Phase 3 (Extensions) — depends on Phase 2:
  06-MEDIA-PIPELINE    ← extends scraper.sendTweet()
  07-V2-API-HYBRID     ← adds v2 methods to Scraper class
  08-TLS-BYPASS        ← plugs into Scraper HTTP layer

Phase 4 (Ecosystem) — depends on Phase 3:
  04-TEST-SUITE        ← tests everything above
  09-PYTHON-SDK        ← wraps the Node.js library
  10-I18N              ← documentation only
  11-CORS-PROXY        ← request transform layer
```

---

## Architecture Decisions

### File Layout for New Code

```
src/
  client/                     ← NEW: Programmatic Scraper class (no Puppeteer)
    Scraper.js                ← Main class — login, getTweet, sendTweet, etc.
    auth/
      CookieAuth.js           ← Cookie-based auth with JSON persistence
      CredentialAuth.js       ← Username/password login flow
      TokenManager.js         ← Guest token + bearer token management
    http/
      HttpClient.js           ← Fetch wrapper with retry, rate limits, TLS
      RateLimiter.js          ← Adaptive rate limiter with backoff
      TlsClient.js            ← Optional CycleTLS integration
      CorsProxy.js            ← CORS proxy transform for browser use
    api/
      tweets.js               ← Tweet CRUD (get, send, delete, like, retweet)
      users.js                ← User lookups, follow/unfollow
      search.js               ← Search tweets/users
      media.js                ← Media upload pipeline
      v2/                     ← Twitter API v2 optional endpoints
        polls.js
        analytics.js
        spaces.js
    pagination/
      AsyncCursor.js          ← AsyncGenerator cursor-based pagination
    types/
      index.d.ts              ← TypeScript definitions for Scraper class
  python/                     ← NEW: Python SDK
    xactions/
      __init__.py
      client.py
      auth.py
      ...
tests/
  client/                     ← NEW: Tests for Scraper class
    scraper.test.js
    auth.test.js
    rateLimit.test.js
    pagination.test.js
    media.test.js
    v2.test.js
    tls.test.js
    cors.test.js
i18n/                         ← NEW: Translated READMEs
  README-ja.md
  README-zh.md
  README-es.md
  README-ko.md
  README-pt.md
```

### Key Conventions

- All new code is ESM (`import`/`export`), consistent with existing codebase
- The `Scraper` class wraps Twitter's internal GraphQL API (same as twikit / agent-twitter-client)
- Puppeteer scrapers in `src/scrapers/` remain untouched — the new `src/client/` is a parallel HTTP-only approach
- The `Scraper` class is exported from the package root: `import { Scraper } from 'xactions'`
- Every file has `@author nich (@nichxbt)` and `@license MIT`
- No external API keys required for core functionality; v2 API is opt-in
- Real HTTP intercepts against Twitter's GraphQL endpoints, not mock data

### Twitter Internal API Endpoints Used

These are the actual endpoints the Scraper class will call (same as twikit/agent-twitter-client):

```
POST   https://api.x.com/1.1/guest/activate.json                    → Guest token
POST   https://api.x.com/1.1/onboarding/task.json                   → Login flow
GET    https://x.com/i/api/graphql/{queryId}/UserByScreenName        → Profile
GET    https://x.com/i/api/graphql/{queryId}/UserTweets              → User tweets
GET    https://x.com/i/api/graphql/{queryId}/TweetDetail              → Single tweet
GET    https://x.com/i/api/graphql/{queryId}/SearchTimeline           → Search
GET    https://x.com/i/api/graphql/{queryId}/Followers                → Followers
GET    https://x.com/i/api/graphql/{queryId}/Following                → Following
GET    https://x.com/i/api/graphql/{queryId}/Likes                    → User likes
GET    https://x.com/i/api/graphql/{queryId}/ListLatestTweetsTimeline  → List tweets
POST   https://x.com/i/api/graphql/{queryId}/CreateTweet              → Send tweet
POST   https://x.com/i/api/graphql/{queryId}/DeleteTweet              → Delete tweet
POST   https://x.com/i/api/graphql/{queryId}/FavoriteTweet            → Like
POST   https://x.com/i/api/graphql/{queryId}/UnfavoriteTweet          → Unlike
POST   https://x.com/i/api/graphql/{queryId}/CreateRetweet            → Retweet
POST   https://x.com/i/api/graphql/{queryId}/DeleteRetweet            → Unretweet
POST   https://upload.x.com/i/media/upload.json                      → Media upload
GET    https://x.com/i/api/2/guide.json                               → Trends
```

### Bearer Token (Public, Hardcoded in Twitter Web Client)

```
AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA
```

This is not a secret — it's embedded in Twitter's public JavaScript bundle and used by all scrapers.

---

## How to Run Each Track

Each prompt file (`01-*.md` through `11-*.md`) contains:

1. **Research Section** — what to read in the codebase before coding
2. **Architecture Section** — file layout, class design, integration points
3. **15 Numbered Prompts** — each is a self-contained agent task that produces working code
4. **Validation Section** — how to verify the build is correct

Feed prompts to an AI coding agent (Claude, Copilot, Cursor) one at a time, in order. Each prompt produces one or more files. After all 15, the track is complete.

---

## Success Criteria

When all 11 tracks are complete:

```javascript
// This "hello world" must work — matching twikit/agent-twitter-client UX:
import { Scraper } from 'xactions';

const scraper = new Scraper();
await scraper.login({ username: 'user', password: 'pass', email: 'e@mail.com' });
await scraper.saveCookies('cookies.json');

const profile = await scraper.getProfile('elonmusk');
const tweet = await scraper.getTweet('1234567890');

for await (const tweet of scraper.searchTweets('#nodejs', 100)) {
  console.log(tweet.text);
}

await scraper.sendTweet('Hello from XActions!', { media: ['photo.jpg'] });
await scraper.like('1234567890');
await scraper.follow('elonmusk');

// Optional v2 (requires API keys):
await scraper.v2.createPoll('Best language?', ['JS', 'Python', 'Rust'], 120);
```

```python
# Python SDK must also work:
from xactions import Scraper

scraper = Scraper()
scraper.login(username='user', password='pass', email='e@mail.com')
profile = scraper.get_profile('elonmusk')
```

All operations have:
- Adaptive rate limiting with exponential backoff
- Cookie persistence across restarts
- AsyncGenerator pagination for large result sets
- Full TypeScript type definitions
- 90%+ test coverage
- No mock data anywhere
