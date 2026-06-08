# Story 1.2: Scrape Facebook profile

---
baseline_commit: 17e476abaf6629de3eb93991ac6c9c48e5d4302e
---

Status: review

## Change Log

- 2026-06-09: Implemented scrapeProfile with meta-first extraction, normalizeProfile pure function, authCookie dispatcher wiring, selector doc update, and 29 passing tests.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a growth marketer using XActions,
I want to scrape a public Facebook profile/page,
so that I can analyze Facebook accounts with the same normalized format as Twitter.

## Acceptance Criteria

**AC1 — scrapeProfile returns normalized shape (FR-1)**
1. `scrapeProfile(page, username)` is exported from `src/scrapers/facebook/index.js` and returns an object with: `name`, `username`, `bio`, `avatar`, `followers`, `url`, `platform: 'facebook'`.
2. Accepts a handle (`zuck`), a handle with leading `@`, or a full profile/page URL — normalizes to the correct facebook.com URL before navigating.
3. The returned shape matches the profile shape of sibling adapters (compare `src/scrapers/threads/index.js` scrapeProfile output: same key names, `platform` field present).

**AC2 — Resilient extraction (FR-1, NFR4)**
4. Extraction prefers `og:` meta tags (`og:title`, `og:description`, `og:image`) first, with DOM fallback — mirroring the Threads adapter approach.
5. Selectors/extraction anchors used are documented in `docs/agents/selectors-facebook.md` (update the Profile section, change those rows from UNVERIFIED to the actual approach used).
6. `followers` is parsed best-effort from available text; when not extractable, it is `null` (not a crash, not a fabricated value).

**AC3 — Error handling**
7. A non-existent or blocked profile returns a clear error (thrown), not a hang and not an empty unlabeled object.
8. The `username` field in the result is always set from the input handle (even if DOM parse is partial).

**AC4 — Dispatcher end-to-end + auth wiring (FR-5, resolves 1.1 deferred gap)**
9. `scrape('facebook', 'profile', { username, authCookie: { c_user, xs } })` works end-to-end: auto-creates browser, logs in via the cookie object, scrapes, returns the normalized profile, auto-closes browser.
10. The dispatcher puppeteer branch in `src/scrapers/index.js` is extended to support an `authCookie` object for cookie-object platforms (Facebook), WITHOUT breaking the existing Twitter string `authToken` path.
11. `scrape('facebook', 'profile', { page, username })` (caller supplies own page) also works, skipping auto-login.

**AC5 — Tests**
12. Unit tests for the profile normalizer/parser (given representative meta-tag + DOM input, asserts the normalized shape) — no real browser launch, no live Facebook.
13. A dispatcher test asserts `scrape('facebook','profile',...)` routes through the puppeteer branch and calls `scrapeProfile` (browser-free, consistent with Story 1.1 test approach).

## Tasks / Subtasks

- [x] **Task 1: Implement scrapeProfile** (AC: 1, 2, 3)
  - [x] Add `scrapeProfile(page, username)` to `src/scrapers/facebook/index.js`
  - [x] Normalize input: strip leading `@`, accept full URL or handle, build `https://www.facebook.com/<handle>`
  - [x] `page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })` + `randomDelay`
  - [x] Extract via `page.evaluate`: prefer `og:title`/`og:description`/`og:image` meta, DOM fallback for name/bio/followers/avatar
  - [x] Parse follower count best-effort from description/DOM text → `null` if absent
  - [x] Always set `username` from input; set `platform: 'facebook'`; throw clear error on missing/blocked profile
  - [x] Add to `default` export object
- [x] **Task 2: Refactor extraction into testable normalizer** (AC: 5, 12)
  - [x] Extract pure parsing logic (meta/DOM raw → normalized shape) into a function unit-testable without Puppeteer (e.g. takes a raw object, returns normalized profile)
  - [x] Keep `page.evaluate` thin: collect raw values, pass to normalizer
- [x] **Task 3: Dispatcher authCookie wiring** (AC: 9, 10, 11) — resolves 1.1 deferred item
  - [x] In `src/scrapers/index.js` puppeteer branch (~line 213-216): if `options.authCookie` (object) is provided, call `mod.loginWithCookie(page, options.authCookie)`; keep the existing `options.authToken` (string) path for Twitter unchanged
  - [x] Do NOT break Twitter/Threads behavior — additive only
- [x] **Task 4: Update selector docs** (AC: 5)
  - [x] Update Profile section of `docs/agents/selectors-facebook.md` with the actual extraction approach used (meta-first); mark verify status honestly (still UNVERIFIED for live DOM if not tested on real session)
- [x] **Task 5: Tests** (AC: 12, 13)
  - [x] `tests/scrapers/facebook.test.js`: add normalizer unit tests (raw → normalized shape, follower null case, username always set)
  - [x] Add dispatcher test: `scrape('facebook','profile',...)` routes to puppeteer branch + invokes scrapeProfile (browser-free via injected fake page/module pattern from Story 1.1)
  - [x] Run `npx vitest run tests/scrapers/facebook.test.js`

## Dev Notes

### Previous Story Intelligence (Story 1.1 — done)

- **Dispatcher auth gap was DEFERRED to this story.** Story 1.1 review (decision-needed → deferred) flagged: dispatcher calls `mod.loginWithCookie(page, options.authToken)` with a string [src/scrapers/index.js:213-215], but Facebook's `loginWithCookie` expects `{ c_user, xs }`. **AC4/Task 3 of THIS story resolves it** via `options.authCookie`. See `_bmad-output/implementation-artifacts/deferred-work.md`.
- `loginWithCookie(page, { c_user, xs })` already exists and validated (throws on missing cookie, redacts values). Reuse as-is.
- `createBrowser` was patched in 1.1 to merge args (`[...stealthArgs, ...extraArgs]`) and respect `headless` only when undefined — do not regress this.
- `docs/agents/selectors-facebook.md` already has a Profile section (UNVERIFIED skeleton) recommending og: meta-first parsing.
- Test convention from 1.1: browser-free tests using minimal fake `page` objects are permitted (Dev Notes carve-out vs no-mock rule) when the alternative is launching a real browser. 15/15 tests passed.

### Template — `src/scrapers/threads/index.js` scrapeProfile (lines 66-119)

Threads' `scrapeProfile` is the direct analog. It:
- `page.goto(`${THREADS_BASE}/@${handle}`, { waitUntil: 'networkidle2', timeout: 30000 })`
- `page.evaluate` reads `meta[property="og:title"]`, `og:description`, `og:image`
- Parses follower count from description regex, extracts name from title, bio from description
- Falls back to visible DOM (`span[title]`) for stats
- Returns `{ name, username, bio, avatar, followers, url, platform }`, sets `username` from input after evaluate

Facebook differs: profile URL is `facebook.com/<handle>` (no `@`), and FB uses `comments` not `replies` (irrelevant for profile). Follower text may be in description or a DOM anchor. Keep the same meta-first strategy.

### Dispatcher puppeteer branch — `src/scrapers/index.js` (UPDATE, read lines 205-240)

Current behavior (must preserve):
- `needsPuppeteer` already includes `facebook`/`fb` (added in 1.1).
- Auto-creates browser via `mod.createBrowser(options.browserOptions || {})`, then `mod.createPage(browser)`.
- Line 213-216: `if (options.authToken && mod.loginWithCookie) { await mod.loginWithCookie(page, options.authToken); }` — **string path, Twitter only. Keep it.**
- Line 219: stores `page.__xactions_browser = browser` for cleanup.
- target resolved from `options.username || options.query || ...` (line 223); `fn(page, target, options)` (line 232).
- Auto-closes browser at line 236-238 unless `options.autoClose === false`.

**This story's change:** add an `authCookie` object branch alongside the `authToken` string branch. Example:
```js
if (options.authToken && mod.loginWithCookie) {
  await mod.loginWithCookie(page, options.authToken);      // Twitter (string) — unchanged
} else if (options.authCookie && mod.loginWithCookie) {
  await mod.loginWithCookie(page, options.authCookie);     // Facebook ({ c_user, xs })
}
```
Additive — do not alter the existing string path or other platforms.

> Note: the pre-existing browser-leak-on-login-throw ordering [line 219 after login] remains deferred (see deferred-work.md) — do NOT need to fix in this story, but be aware login throwing will skip cleanup.

### Critical context

- Node.js library context, ESM, Puppeteer. No mocks (browser-free wiring tests permitted per 1.1 carve-out).
- `platform: 'facebook'` MUST be on the returned object (consistency NFR5).
- Never log `c_user`/`xs` (NFR3).
- 1-3s delays already via `randomDelay` helper.

### Project Structure Notes

- UPDATE: `src/scrapers/facebook/index.js` (add scrapeProfile + normalizer)
- UPDATE: `src/scrapers/index.js` (dispatcher authCookie branch — additive)
- UPDATE: `docs/agents/selectors-facebook.md` (Profile section)
- UPDATE: `tests/scrapers/facebook.test.js` (normalizer + dispatcher tests)
- No Prisma/CLI/MCP/API changes (Epic 3).

### Testing standards

- Vitest 4.x, `npx vitest run tests/scrapers/facebook.test.js`. Browser-free. Normalizer must be testable as a pure function.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md#FR-1, NFR4, NFR5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Addendum A.4 Normalized Shape, A.5 ADR-006]
- [Source: src/scrapers/threads/index.js#scrapeProfile lines 66-119 — clone template]
- [Source: src/scrapers/index.js#scrape puppeteer branch lines 205-240 — dispatcher UPDATE]
- [Source: _bmad-output/implementation-artifacts/1-1-facebook-adapter-scaffold.md#Review Findings — deferred auth gap]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — auth wiring deferred item]
- [Source: docs/agents/selectors-facebook.md#Profile — extraction approach]

## Dev Agent Record

### Agent Model Used

sonnet-4.6

### Debug Log References

- `npx vitest run tests/scrapers/facebook.test.js` — 29/29 passed

### Completion Notes List

- Added `normalizeProfile(raw, inputHandle)` as a pure exported function — meta-first parsing (og:title/og:description/og:image), DOM body text fallback for followers, `null` when not extractable
- Added `scrapeProfile(page, username)` — normalizes handle (strips @, accepts full URL), goto + randomDelay, thin page.evaluate collecting raw values, delegates to normalizer, throws on blocked/missing profile
- Dispatcher `src/scrapers/index.js`: added `authCookie` object branch alongside existing `authToken` string branch — Twitter path unchanged, additive only
- Updated `docs/agents/selectors-facebook.md` Profile section to reflect meta-first approach; kept UNVERIFIED status for live DOM (not tested on real session)
- 29 tests total: cookie error handling (4), dispatcher wiring (7), module exports (4+3), normalizeProfile pure unit tests (6), scrapeProfile browser-free tests (5), dispatcher end-to-end routing test (1)

### File List

- src/scrapers/facebook/index.js
- src/scrapers/index.js
- tests/scrapers/facebook.test.js
- docs/agents/selectors-facebook.md
- _bmad-output/implementation-artifacts/1-2-scrape-profile.md
