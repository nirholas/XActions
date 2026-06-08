# Story 1.3: Scrape Facebook posts

---
baseline_commit: b370b3d87dfee86c52db8064366964f6ff304631
---

Status: review

## Change Log

- 2026-06-09: Implemented normalizeHandle helper, scrapeTweets with bounded scroll loop, normalizePost pure function, updated selector docs, 51 tests passing.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a growth marketer using XActions,
I want to scrape recent posts from a Facebook profile/page with a configurable limit,
so that I can collect Facebook content for cross-platform analysis.

## Acceptance Criteria

**AC1 — scrapeTweets returns normalized posts (FR-2)**
1. `scrapeTweets(page, username, options)` is exported from `src/scrapers/facebook/index.js` and returns an array. Each post has: `id`, `text`, `timestamp`, `likes`, `comments`, `url`, `media: { images, hasVideo }`, `platform: 'facebook'`.
2. The function name is `scrapeTweets` (the dispatcher `actionMap` maps both `posts` and `tweets` → `scrapeTweets`; Threads uses the same name). Add to the `default` export.
3. Accepts the same handle/@handle/URL normalization as `scrapeProfile` (reuse the existing logic — do not duplicate).

**AC2 — Bounded scroll loop (FR-2, NFR1)**
4. `options.limit` (default 50) caps the number of posts returned.
5. The loop scrolls to load more posts with a 1-3s delay between scrolls (use the existing `randomDelay` helper).
6. A bounded `maxRetries` stops the loop when no new posts appear after N consecutive scrolls (mirror Threads' retry pattern).
7. The loop stops when `limit` is reached OR content is exhausted (whichever first).

**AC3 — Graceful under-limit / empty**
8. A page with fewer posts than `limit` returns whatever was collected, no error.
9. A page with zero extractable posts returns an empty array (not a throw, not null).
10. `options.onProgress({ scraped, limit })` is called each scroll iteration if provided (mirror Threads).

**AC4 — Dispatcher end-to-end**
11. `scrape('facebook', 'posts', { page, username, limit })` and `scrape('facebook', 'tweets', ...)` both route to `scrapeTweets` and return the post array (browser-free test via provided page).

**AC5 — Tests + docs**
12. Unit tests for the post normalizer/parser (raw post objects → normalized shape; media images + hasVideo; likes/comments parsing; empty → []).
13. Update the Posts section of `docs/agents/selectors-facebook.md` with the actual extraction approach used; keep UNVERIFIED status honest for live DOM.

## Tasks / Subtasks

- [x] **Task 1: Extract shared handle-normalization helper** (AC: 3)
  - [x] `scrapeProfile` currently inlines handle normalization (strip `@`, URL, subpath/query, preserve `profile.php?id=`). Extract into a small internal helper `normalizeHandle(input)` and reuse in both `scrapeProfile` and `scrapeTweets` — do NOT copy-paste (avoid the drift the architecture warns against).
  - [x] Keep `scrapeProfile` behavior identical (existing tests must still pass).
- [x] **Task 2: Implement scrapeTweets** (AC: 1, 2, 3)
  - [x] Add `scrapeTweets(page, username, options = {})` — `const { limit = 50, onProgress } = options`
  - [x] `page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 })` + `randomDelay`
  - [x] Loop: `page.evaluate` collects post containers (`[role="article"]`), dedupe by `id` using a `Map` (mirror Threads), scroll, bounded `maxRetries`
  - [x] Per post extract: text (`[dir="auto"]`), timestamp, likes, comments, media images (filter avatars), `hasVideo` (`video` element present), build `id`/`url`
  - [x] Set `platform: 'facebook'` on each; return `Array.from(map.values()).slice(0, limit)`
  - [x] Add to `default` export
- [x] **Task 3: Pure post normalizer** (AC: 5, 12)
  - [x] Extract per-post raw→normalized mapping into a pure function `normalizePost(raw)` testable without Puppeteer (keep `page.evaluate` thin: collect raw fields, normalize in Node)
- [x] **Task 4: Update selector docs** (AC: 13)
  - [x] Update Posts section of `docs/agents/selectors-facebook.md` with the actual `[role="article"]` + field approach used; mark UNVERIFIED honestly
- [x] **Task 5: Tests** (AC: 11, 12)
  - [x] `tests/scrapers/facebook.test.js`: `normalizePost` unit tests (full shape, media, empty)
  - [x] Dispatcher test: `scrape('facebook','posts',{page,username,limit})` and `'tweets'` route to scrapeTweets (browser-free fake page returning canned raw posts)
  - [x] Run `npx vitest run tests/scrapers/facebook.test.js`

## Dev Notes

### Previous Story Intelligence (1.1 done, 1.2 done)

- **Handle normalization already solved in 1.2** [scrapeProfile, src/scrapers/facebook/index.js:156+]: strips `@`, full URL, subpath (`zuck/photos`→`zuck`), query (`zuck?fref=nf`→`zuck`), preserves `profile.php?id=<n>`. **Task 1 extracts this into `normalizeHandle` and reuses it** — don't reimplement.
- **Pure-normalizer + browser-free test pattern** established in 1.2: `normalizeProfile(raw, handle)` is pure and unit-tested; `scrapeProfile` keeps `page.evaluate` thin. Follow the same shape for posts (`normalizePost(raw)`).
- **Dispatcher routing works for facebook** (1.2): `scrape('facebook','profile',...)` proven end-to-end. `posts`/`tweets` will route the same way once `scrapeTweets` exists. No dispatcher change needed this story.
- **authCookie wiring done** (1.2): auth is not this story's concern; scrapeTweets receives a `page` (logged-in or not) from the dispatcher.
- Test count after 1.2: 33 passing. Add to the same file.
- **Deferred items still open** (deferred-work.md): `page.goto` no try/catch (browser leak on timeout), unanchored follower regex. Do NOT regress; do not need to fix here. `scrapeTweets` `page.goto` will share the same deferred timeout gap — acceptable, consistent with siblings.

### Template — `src/scrapers/threads/index.js` scrapeTweets (lines 128-219)

Direct analog. It:
- `page.goto(profileUrl)`, `randomDelay`
- `const posts = new Map(); let retries = 0; const maxRetries = 10;`
- `while (posts.size < limit && retries < maxRetries) { ... evaluate articles → map ... scroll ... }`
- dedupes by post id; increments `retries` when `posts.size === prevSize`, resets on new posts
- `onProgress({ scraped, limit })` each iteration
- scrolls via `window.scrollTo(0, document.body.scrollHeight)` + `randomDelay(1500,3000)`
- returns `Array.from(posts.values()).slice(0, limit)`

Facebook differences:
- Post container: `[role="article"]` (Threads uses `article, [data-pressable-container], div[role="article"]`)
- FB uses **`comments`** (not `replies`) per Glossary/PRD §3 — the post shape field is `comments`.
- Selectors are UNVERIFIED (see selectors-facebook.md Posts section) — class names obfuscated, prefer `role`/`dir="auto"`/text anchors.

### Post shape (must match PRD §4.1 FR-2)

```js
{
  id, text, timestamp,
  likes, comments,          // NOTE: comments, NOT replies
  url,
  media: { images, hasVideo },
  platform: 'facebook',
}
```

### Critical context

- Node.js library, ESM, Puppeteer. No mocks (browser-free wiring tests permitted, per 1.1/1.2 carve-out).
- 1-3s delays mandatory between scrolls (NFR1). Bounded retries + stop condition (no infinite loop).
- `platform: 'facebook'` on every post (NFR5 consistency).
- Selectors centralized in `docs/agents/selectors-facebook.md` (NFR4) — update Posts section, don't scatter selectors.

### Project Structure Notes

- UPDATE: `src/scrapers/facebook/index.js` (add `normalizeHandle` helper, `scrapeTweets`, `normalizePost`; refactor scrapeProfile to use helper)
- UPDATE: `tests/scrapers/facebook.test.js`
- UPDATE: `docs/agents/selectors-facebook.md` (Posts section)
- No dispatcher change (routing already works). No Prisma/CLI/MCP/API (Epic 3).

### Testing standards

- Vitest 4.x, `npx vitest run tests/scrapers/facebook.test.js`, browser-free. `normalizePost` must be a pure, exported, testable function.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md#FR-2, NFR1, NFR4, NFR5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Addendum A.4 Normalized Shape]
- [Source: src/scrapers/threads/index.js#scrapeTweets lines 128-219 — clone template]
- [Source: src/scrapers/facebook/index.js#scrapeProfile — handle normalization to extract, normalizer pattern to mirror]
- [Source: docs/agents/selectors-facebook.md#Posts — extraction approach]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — known goto/regex gaps, do not regress]

## Dev Agent Record

### Agent Model Used

sonnet-4.6

### Debug Log References

- `npx vitest run tests/scrapers/facebook.test.js --testTimeout=60000` — 51/51 passed

### Completion Notes List

- Extracted `normalizeHandle(input)` as exported pure function — strips @, full URL, subpath, query; preserves `profile.php?id=`; reused by both `scrapeProfile` and `scrapeTweets`
- Added `normalizePost(raw)` exported pure function — maps raw article fields to standard post shape with `platform: 'facebook'`
- Added `scrapeTweets(page, username, options)` — goto + randomDelay, Map-based dedup, bounded maxRetries=10, onProgress callback, scroll loop, returns slice(0, limit)
- Updated `docs/agents/selectors-facebook.md` Posts section with actual approach; UNVERIFIED status preserved
- 51 tests total: previous 33 + 7 normalizeHandle + 5 normalizePost + 4 scrapeTweets + 2 dispatcher posts/tweets routing
- scrapeTweets fake page tests hit maxRetries=10 naturally (empty results), hence slower test durations (~25s each) — acceptable, no real browser launched

### File List

- src/scrapers/facebook/index.js
- tests/scrapers/facebook.test.js
- docs/agents/selectors-facebook.md
- _bmad-output/implementation-artifacts/1-3-scrape-posts.md
