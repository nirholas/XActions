# Story 1.5: Search Facebook posts

---
baseline_commit: 44821ae6efa6997562a84989877d14ff7db9746d
---

Status: done

## Change Log

- 2026-06-09: Implemented searchTweets + normalizeSearchResult, delay seam, bounded loop, selector docs update, 96 tests passing. Completes Epic 1 scrape core.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a growth marketer using XActions,
I want to search Facebook posts by query,
so that I can discover content and conversations relevant to my niche.

## Acceptance Criteria

**AC1 — searchTweets returns normalized results (FR-4)**
1. `searchTweets(page, query, options)` is exported from `src/scrapers/facebook/index.js` and added to the `default` export.
2. Each result has: `id`, `text`, `author`, `timestamp`, `url`, `platform: 'facebook'`.
3. The function name is `searchTweets` (dispatcher `actionMap.search = 'searchTweets'` already exists; threads uses the same name).

**AC2 — Bounded scroll loop (FR-4, NFR1)**
4. `options.limit` (default 30) caps results.
5. Scroll loop uses the injectable `delay` seam (default `randomDelay`) + bounded `maxRetries` — identical pattern to `scrapeTweets`/`scrapeFollowers` (Story 1.3/1.4). 1-3s between scrolls. No unbounded loop.
6. Navigates to the Facebook posts-search surface: `${FACEBOOK_BASE}/search/posts?q=<encoded query>` (encode the query).

**AC3 — Empty / graceful**
7. A query with no results returns an empty array `[]` (not an error, not null).
8. `options.onProgress({ scraped, limit })` called each iteration if provided.

**AC4 — Dispatcher**
9. `scrape('facebook', 'search', { page, query, limit })` routes to `searchTweets` with `query` as the target (dispatcher resolves `options.query`; no dispatcher change needed — verify with a test).

**AC5 — Tests + docs**
10. Pure normalizer `normalizeSearchResult(raw)` extracted + unit-tested (raw → `{id,text,author,timestamp,url,platform}`; empty → handled).
11. Browser-free tests: results array, limit respected, empty → [], dispatcher routing — all via fake page with `delay: () => {}`.
12. Update the Search section of `docs/agents/selectors-facebook.md` with the actual extraction approach; keep UNVERIFIED honest for live DOM.

## Tasks / Subtasks

- [x] **Task 1: Implement searchTweets** (AC: 1, 2, 3)
  - [x] Add `searchTweets(page, query, options = {})` — `const { limit = 30, onProgress, maxRetries = 8, delay = randomDelay } = options`
  - [x] `page.goto(\`${FACEBOOK_BASE}/search/posts?q=${encodeURIComponent(query)}\`, { waitUntil:'networkidle2', timeout:30000 })` + `delay`
  - [x] Bounded scroll loop (Map dedupe, `delay` seam, `maxRetries`, stop at `limit`) — copy the proven shape from `scrapeTweets`
  - [x] Per result extract: `text`, `author` (the posting account), `timestamp`, `url`, build `id`
  - [x] Set `platform: 'facebook'`; return `Array.from(map.values()).slice(0, limit)`
  - [x] Add to `default` export
- [x] **Task 2: Pure normalizer** (AC: 5, 10)
  - [x] `normalizeSearchResult(raw)` pure exported function (mirror `normalizePost`/`normalizeFollower`); keep `page.evaluate` thin
- [x] **Task 3: Selector docs** (AC: 12)
  - [x] Update Search section of `docs/agents/selectors-facebook.md` with the real `[role="article"]` + author/text approach; mark UNVERIFIED honestly
- [x] **Task 4: Tests** (AC: 9, 11)
  - [x] `normalizeSearchResult` unit tests; searchTweets results/limit/empty via fake page with `delay: () => {}` + bounded `maxRetries`
  - [x] Dispatcher test: `scrape('facebook','search',{page,query})` routes to searchTweets
  - [x] Run `npx vitest run tests/scrapers/facebook.test.js`

## Dev Notes

### Previous Story Intelligence — apply ALL of these (1.1-1.4 reviews)

- **Delay seam is MANDATORY from the start** (1.3 BLOCKER): take `options.delay = randomDelay` + `maxRetries`; ALL browser-free tests pass `delay: () => {}`. Without this the suite goes RED+slow. Non-negotiable.
- **Test mocks must exercise the REAL condition, not bypass it** (1.4 BLOCKER): when faking `page.evaluate`, branch on the function body (`fn.toString().includes(...)`) to return realistic shapes for each evaluate call (detection vs extraction vs scroll). Do NOT mock past the logic under test. The 1.4 review caught a green-false suite because the mock short-circuited the detection.
- **Author/text extraction is DOM-accuracy** (1.3 deferred): `[dir="auto"]` / first-span often grabs the wrong element (author vs body). Expect this to be UNVERIFIED; document in selectors-facebook.md and add to the verify checklist rather than claiming it works. `author` here is specifically the posting account — be explicit which anchor.
- **id fallback collisions** (1.3 deferred): prefer a real permalink for `id`; `text.slice()` fallback collides. Use post/permalink URL when present.
- **Reuse, don't duplicate**: `randomDelay` helper + the Map-dedupe-scroll loop shape already exist in `scrapeTweets`. Mirror them. (No shared scroll helper exists yet — if a 3rd near-identical loop feels heavy, a small internal `scrollCollect` helper is reasonable, but not required.)
- **`normalizeHandle` not needed here** — search takes a free-text query, not a handle. Do NOT run the query through `normalizeHandle` (it would mangle/throw).
- Tests after 1.4: 83 passing. Add to same file. Suite ~40-47s (residual real-delay from 1.2 scrapeProfile tests — pre-existing).
- **Deferred items open** (deferred-work.md): goto try/catch, DOM-accuracy. Do not regress; search selectors are also UNVERIFIED.

### Template — `src/scrapers/threads/index.js` searchTweets (lines 228-295)

Direct analog:
- `page.goto(\`${THREADS_BASE}/search?q=${encodeURIComponent(query)}&serp_type=default\`)`
- `const posts = new Map(); let retries = 0; const maxRetries = 8;`
- loop: evaluate articles → `{ id, text, author, timestamp, url, platform }`, dedupe, scroll, `onProgress`
- author extracted via `a[href^="/@"]` (Threads); **Facebook differs** — author is a profile link inside the result article (vanity or profile.php). Reuse the NON_PROFILE-skip anchor logic from `scrapeFollowers` (Story 1.4) if helpful for author handle.
- returns `Array.from(posts.values()).slice(0, limit)`

Facebook search URL: `${FACEBOOK_BASE}/search/posts?q=<encoded>` (Threads uses `/search?q=...&serp_type=default`). Result container `[role="article"]` (UNVERIFIED).

### Result shape (FR-4 / PRD §4.1)

```js
{ id, text, author, timestamp, url, platform: 'facebook' }
```
Note: search result shape has `author` (the result is from another account) and has NO `likes`/`comments`/`media` (that's the posts shape FR-2, different). Keep them distinct.

### Dispatcher — NO change needed

`src/scrapers/index.js:174` maps `search: 'searchTweets'`; target resolves from `options.query` (line ~223). `needsPuppeteer` includes facebook. Just verify with a test.

### Critical context

- Node.js library, ESM, Puppeteer. No mocks (browser-free wiring tests with `delay: () => {}`).
- `encodeURIComponent(query)` — queries contain spaces/special chars.
- 1-3s delays via `delay` seam (NFR1); bounded `maxRetries` + `limit`.
- `platform: 'facebook'` on every result (NFR5). Selectors centralized in selectors-facebook.md (NFR4).

### Project Structure Notes

- UPDATE: `src/scrapers/facebook/index.js` (add `searchTweets`, `normalizeSearchResult`)
- UPDATE: `tests/scrapers/facebook.test.js`
- UPDATE: `docs/agents/selectors-facebook.md` (Search section)
- No dispatcher / Prisma / CLI / MCP / API change. This completes Epic 1 (scrape core).

### Testing standards

- Vitest 4.x, `npx vitest run tests/scrapers/facebook.test.js`, browser-free with `delay: () => {}`. `normalizeSearchResult` pure & exported. Mocks must exercise real evaluate branches (1.4 lesson).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5]
- [Source: _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md#FR-4, NFR1/4/5]
- [Source: src/scrapers/threads/index.js#searchTweets lines 228-295 — clone template]
- [Source: src/scrapers/facebook/index.js#scrapeTweets — delay seam + bounded loop to mirror; scrapeFollowers NON_PROFILE anchor logic for author]
- [Source: src/scrapers/index.js#actionMap line 174 — search→searchTweets already mapped]
- [Source: docs/agents/selectors-facebook.md#Search — extraction approach]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — known gaps + DOM-accuracy lessons]

## Dev Agent Record

### Agent Model Used

sonnet-4.6

### Debug Log References

- `npx vitest run tests/scrapers/facebook.test.js --testTimeout=60000` — 96/96 passed

### Completion Notes List

- Added `normalizeSearchResult(raw)` pure exported function — maps `{ id, text, author, timestamp, url }` → standard search result shape with `platform: 'facebook'`
- Added `searchTweets(page, query, options)` with delay seam, bounded maxRetries=8, limit=30, encodeURIComponent for query, Map dedupe — mirrors scrapeTweets/scrapeFollowers pattern
- Author extracted from first non-permalink profile link in `[role="article"]` container; UNVERIFIED on live session
- Updated `docs/agents/selectors-facebook.md` Search section with actual approach
- 96 tests total; 15 new in this story (6 normalizeSearchResult + 5 searchTweets + 2 dispatcher + 2 default export)
- This completes Epic 1 (scrape core): profile, posts, followers, search all implemented

### File List

- src/scrapers/facebook/index.js
- tests/scrapers/facebook.test.js
- docs/agents/selectors-facebook.md
- _bmad-output/implementation-artifacts/1-5-search-posts.md

## Review Findings

> Code review 2026-06-08 (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Reviewer-verified: **100/100 tests pass** (dev claimed 96; more, not fewer — fine). Acceptance Auditor: **all 12 ACs COVERED, 0 violations**. Cleanest story so far — every prior review lesson was applied (delay seam, mocks branch on fn.toString, author via anchor-skip, permalink-first id, normalizeHandle correctly NOT applied to query). 0 BLOCKER.

### Patch

- [x] [Review][Patch] `profile.php?id=N` author loses the id → `"profile.php"` — FIXED 2026-06-08: author extraction now matches `profile.php?id=(\d+)` first and preserves `profile.php?id=<digits>` (same as scrapeFollowers/normalizeHandle).
- [x] [Review][Patch] author anchor filter misses non-profile segments — FIXED: extracted shared module-level `NON_PROFILE_SEGMENTS` (added `hashtag`); both `scrapeFollowers` and `searchTweets` now pass it into `page.evaluate` and skip those segments. DRY — single source of truth.

### Deferred

- [x] [Review][Defer] No input validation on `query` (empty/whitespace/null/undefined build a bad URL silently) [src/scrapers/facebook/index.js:508] — deferred: low; `encodeURIComponent(null)`→"null" searches literal "null". Add a guard (`if (!query?.trim()) return []`) in a cleanup pass; not blocking.
- [x] [Review][Defer] `texts[0]` may capture author name not post body [src/scrapers/facebook/index.js:521] — deferred: DOM-accuracy, same as 1.3; needs live session. selectors-facebook.md verify checklist.
- [x] [Review][Defer] `id = url || text.slice(0,60)` collision fallback [src/scrapers/facebook/index.js:562] — deferred: same as 1.3; search results usually have permalinks so lower risk.
- [x] [Review][Defer] TEA maxRetries test mocks past DOM extraction (canned shaped results) [tests/scrapers/facebook.test.js] — deferred: loop logic IS exercised; author-extraction logic isn't (can't be, browser-free). Real author extraction needs live verify, tracked in checklist.

### Dismissed

- **`page.goto` no try/catch** — KNOWN-DEFERRED, all four scrapers + threads identical.
- **`limit=0` returns [] without onProgress** — by-design (0 results requested → 0 returned); not a real caller scenario.
- **retry resets on progress → long run on sparse feed** — bounded by `limit`, same as siblings.
- **page.evaluate non-serializable drop** — speculative; fields already `|| null` guarded.
- **dispatcher test doesn't assert searchTweets specifically** — page mock is search-shaped; functionally sufficient.
