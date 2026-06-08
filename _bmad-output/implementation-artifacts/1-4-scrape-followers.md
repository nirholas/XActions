# Story 1.4: Scrape Facebook followers (public-data fallback)

---
baseline_commit: 3f27fe8e6eeed57bf67eaf8cbf89055063e52bf6
---

Status: review

## Change Log

- 2026-06-09: Implemented scrapeFollowers with two-branch exposed/restricted logic, normalizeFollower pure function, delay seam, updated selectors-facebook.md Followers section (resolves Q3), 62 tests passing.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a growth marketer using XActions,
I want to scrape followers of a Facebook profile/page when publicly available,
so that I can understand audience composition without hitting a hard error when data is restricted.

## Acceptance Criteria

**AC1 — Followers returned when public (FR-3)**
1. `scrapeFollowers(page, username, options)` is exported from `src/scrapers/facebook/index.js` and added to the `default` export.
2. When the follower list is publicly exposed (typically Pages), it returns an **array** of follower objects, each `{ name, username, url }` (and may include `platform: 'facebook'`).
3. Reuses `normalizeHandle` for the input handle (no duplication).

**AC2 — Graceful fallback when restricted (FR-3, the core of this story)**
4. When Facebook does NOT expose the follower list (typical for personal profiles), the function returns an **object** with a `note` field explaining the limitation and `platform: 'facebook'` — NOT an array, NOT a throw, NOT an empty unlabeled result.
5. The fallback object also carries the `username` so the caller knows which target it refers to.
6. The function distinguishes "list present" vs "list not exposed" deterministically (e.g. presence of a followers container / count) rather than guessing.

**AC3 — Bounded + safe**
7. If the function scrolls a followers dialog/list, it uses the injectable `delay` seam (default `randomDelay`) and a bounded `maxRetries` / `limit` — consistent with `scrapeTweets` (Story 1.3 pattern). No unbounded loop.
8. `options.limit` (default e.g. 100) caps returned followers when a list is present.

**AC4 — Dispatcher**
9. `scrape('facebook', 'followers', { page, username })` routes to `scrapeFollowers` (dispatcher `actionMap.followers = 'scrapeFollowers'` already exists — no dispatcher change needed; verify it resolves).

**AC5 — Tests + docs (resolves Phase 1 blocker Q3)**
10. Browser-free unit tests: (a) list-present path returns array of `{name,username,url}`; (b) restricted path returns `{ note, username, platform }`; (c) the array path respects `limit`. Use the `delay: () => {}` seam — no real delays.
11. Update the Followers section of `docs/agents/selectors-facebook.md` with the actual detection approach (how "exposed vs not" is determined) and which fields are extractable. This is the artifact that **resolves PRD Open Question Q3** — document findings honestly, keep UNVERIFIED where not live-tested.

## Tasks / Subtasks

- [x] **Task 1: Implement scrapeFollowers with fallback** (AC: 1, 2, 3)
  - [x] Add `scrapeFollowers(page, username, options = {})` — `const { limit = 100, onProgress, maxRetries = 10, delay = randomDelay } = options`
  - [x] `normalizeHandle(username)`; navigate to the followers surface (e.g. `${FACEBOOK_BASE}/${handle}/followers` for Pages) with `page.goto` + `delay`
  - [x] Detect whether a follower list is present (container/count). If NOT present → return `{ note: '...not publicly exposed...', username: handle, platform: 'facebook' }`
  - [x] If present → bounded scroll loop (Map dedupe by username/url, `delay` seam, `maxRetries`, stop at `limit`), extract `{ name, username, url }` per follower
  - [x] Add to `default` export
- [x] **Task 2: Pure normalizer for follower rows** (AC: 5, 10)
  - [x] Extract per-row raw→`{name,username,url}` mapping into a pure exported `normalizeFollower(raw)` (testable, like `normalizePost`)
- [x] **Task 3: Selector docs — resolve Q3** (AC: 11)
  - [x] Update Followers section of `docs/agents/selectors-facebook.md`: detection logic (exposed vs not), extractable fields, Page-vs-personal reality. Mark verify status honestly.
- [x] **Task 4: Tests** (AC: 9, 10)
  - [x] `tests/scrapers/facebook.test.js`: `normalizeFollower` unit tests; scrapeFollowers list-present (array) + restricted (note object) + limit, all via fake page with `delay: () => {}`
  - [x] Dispatcher test: `scrape('facebook','followers',{page,username})` routes to scrapeFollowers
  - [x] Run `npx vitest run tests/scrapers/facebook.test.js`

## Dev Notes

### Previous Story Intelligence (1.1/1.2/1.3 done)

- **CRITICAL — delay seam pattern from 1.3 review**: `scrapeTweets` now takes `options.delay = randomDelay` and `maxRetries`; ALL browser-free tests pass `delay: () => {}`. The 1.3 review BLOCKER was a 166s/RED suite because tests ran real delays. **scrapeFollowers MUST follow the same seam pattern from the start** — do not hardcode `randomDelay` in a scroll loop without the seam.
- **`normalizeHandle` is the shared helper** [src/scrapers/facebook/index.js:79] — now guards null/undefined (throws "handle is required"). Reuse it; do not reimplement.
- **Pure-normalizer + browser-free test pattern**: `normalizeProfile`, `normalizePost` are pure & exported & unit-tested. Mirror with `normalizeFollower`.
- **Fallback-with-`note` is the whole point of FR-3** — Threads' `scrapeFollowers` (template below) returns a `note` object because Threads doesn't expose followers. Facebook is similar for personal profiles but Pages may expose. The deterministic exposed-vs-not detection (AC2.6) is the key design decision.
- Tests after 1.3: 53 passing. Add to same file. Suite ~25s (residual from 1.2 scrapeProfile real-delay tests — pre-existing, not your concern).
- **Deferred items still open** (deferred-work.md) — goto try/catch, DOM-accuracy from 1.3. Do not regress; follower selectors are also UNVERIFIED (live-verify later).

### Template — `src/scrapers/threads/index.js` scrapeFollowers (lines 306-335)

Threads returns a `note` object (doesn't expose follower lists):
```js
export async function scrapeFollowers(page, username, options = {}) {
  const profile = await scrapeProfile(page, username);
  console.warn('⚠️ Threads does not expose full follower lists publicly...');
  return { followers: profile.followers, username: profile.username,
           note: 'Threads does not expose individual follower profiles publicly', platform: 'threads' };
}
```
Facebook differs: it CAN return a real array for Pages with public followers. So Facebook's version is a **two-branch** function: detect exposure → array OR note-object. Do not blindly copy Threads' always-note behavior.

### Dispatcher — NO change needed

`src/scrapers/index.js:170` already maps `followers: 'scrapeFollowers'`, and `needsPuppeteer` includes facebook (1.1). `scrape('facebook','followers',{page,username})` will route once `scrapeFollowers` exists. Just verify with a test.

### Return-shape contract (important — heterogeneous)

This function intentionally returns **either** an array (exposed) **or** an object with `note` (restricted). Callers must handle both. Document this clearly in the JSDoc. This matches FR-3 / PRD §4.1 and the Glossary "follower list not exposed → note, not error".

### Selectors (UNVERIFIED) — see selectors-facebook.md Followers section

- Page followers surface: `${FACEBOOK_BASE}/<page>/followers` (or `/likers`).
- Follower row: `[role="listitem"]` or `a[role="link"]` in the list dialog (UNVERIFIED).
- Personal profiles: list generally NOT public → note path.
- This story is the one that **resolves Open Question Q3** in the PRD by documenting what's actually extractable.

### Critical context

- Node.js library, ESM, Puppeteer. No mocks (browser-free wiring tests permitted; use `delay: () => {}`).
- 1-3s delays via the `delay` seam (NFR1). Bounded retries + limit (no infinite loop).
- `platform: 'facebook'` on outputs (NFR5). Selectors centralized in selectors-facebook.md (NFR4).

### Project Structure Notes

- UPDATE: `src/scrapers/facebook/index.js` (add `scrapeFollowers`, `normalizeFollower`)
- UPDATE: `tests/scrapers/facebook.test.js`
- UPDATE: `docs/agents/selectors-facebook.md` (Followers section — resolves Q3)
- No dispatcher / Prisma / CLI / MCP / API change.

### Testing standards

- Vitest 4.x, `npx vitest run tests/scrapers/facebook.test.js`, browser-free with `delay: () => {}`. `normalizeFollower` pure & exported.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md#FR-3, Open Question Q3, NFR1/4/5]
- [Source: src/scrapers/threads/index.js#scrapeFollowers lines 306-335 — note-fallback template]
- [Source: src/scrapers/facebook/index.js#scrapeTweets — delay seam + bounded loop pattern to mirror; normalizeHandle to reuse]
- [Source: src/scrapers/index.js#actionMap line 170 — followers→scrapeFollowers already mapped]
- [Source: docs/agents/selectors-facebook.md#Followers — detection approach, resolves Q3]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — known gaps, do not regress]

## Dev Agent Record

### Agent Model Used

sonnet-4.6

### Debug Log References

- `npx vitest run tests/scrapers/facebook.test.js --testTimeout=60000` — 62/62 passed

### Completion Notes List

- Added `normalizeFollower(raw)` exported pure function — maps `{ name, username, url }` → standard follower shape with `platform: 'facebook'`
- Added `scrapeFollowers(page, username, options)` with delay seam (`options.delay = randomDelay`), bounded `maxRetries`, `limit` — consistent with 1.3 pattern
- Two-branch logic: detect via `[role="listitem"]` presence OR "followers" heading → exposed (array) or restricted (note object)
- Updated `docs/agents/selectors-facebook.md` Followers section with detection approach; resolves PRD Open Question Q3
- 62 tests total (previous 51 + 5 normalizeFollower + 3 scrapeFollowers + 1 dispatcher followers routing + 2 already added from linter)

### File List

- src/scrapers/facebook/index.js
- tests/scrapers/facebook.test.js
- docs/agents/selectors-facebook.md
- _bmad-output/implementation-artifacts/1-4-scrape-followers.md
