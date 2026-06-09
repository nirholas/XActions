---
baseline_commit: 42ad98f0f1377d3f363ae795872694132e810adc
---

# Story 2.2: Auto-like Facebook posts (dry-run default)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a multi-account operator using XActions,
I want to auto-like one or more Facebook posts with a dry-run preview,
so that I can see exactly what will be affected before executing for real.

## Acceptance Criteria

**AC1 — likeFacebookPosts entry point**
1. `likeFacebookPosts(page, postUrls, options)` is exported from `api/services/facebookAutomation.js` and added to its default export.
2. Routes through `runGuardedBatch(postUrls, likePostFn, options)` — does NOT implement its own loop. Story 2.1's guardrail is the single chokepoint (FR-9, ADR-007).
3. `dryRun` defaults to `true` (inherited from `runGuardedBatch`); only explicit `dryRun: false` enables real likes.

**AC2 — Single-post like helper (the actual DOM write)**
4. An internal `likeSinglePost(page, postUrl)` async function navigates to the post URL, finds the Like button, clicks it, returns `{ liked: boolean, alreadyLiked: boolean }`.
5. Selector strategy uses `aria-label` (locale-aware): `[aria-label="Like"]` (en) / `[aria-label="Thích"]` (vi). Selectors taken from `docs/agents/selectors-facebook.md` — do NOT hard-code other locales here. Wrap in a small helper so the locale list lives in one place.
6. If the button is already in "Liked" state (`aria-label="Remove Like"` or "Bỏ thích"), do NOT click again — return `{ liked: false, alreadyLiked: true }`.
7. If the button is not found within a reasonable wait, throw a clear error (`runGuardedBatch` will catch + record per-item).

**AC3 — Result shape (dry-run preview + real)**
8. Dry-run preview entries contain the post URL as `target` (preview comes from `runGuardedBatch`'s default `{ target, action: 'pending' }`).
9. Real-write `results` entries include `{ target, ok, error?, alreadyLiked? }`. `ok: true` covers both "newly liked" and "already liked"; `alreadyLiked: true` distinguishes the no-op case.

**AC4 — Safety (FR-9, ADR-007)**
10. The function does NOT call any DOM write under `dryRun=true`. Tests must verify no `page.click` happens in dry-run.
11. Account-risk warning fires before the first real batch (inherited from `runGuardedBatch`).
12. Locale assumption is documented: caller is responsible for ensuring Facebook is rendered in a supported locale; mismatched locale raises the "button not found" error per AC2.7 — explicit, not silent.

**AC5 — Tests**
13. Browser-free unit tests using a fake `page` (`goto`, `waitForSelector`, `$`, `click`, etc. as needed) + spy `likeSinglePost`:
    - dry-run default → no `likeSinglePost` invocation, preview returned (route through `runGuardedBatch`).
    - `dryRun: false` → `likeSinglePost` invoked per URL with delay seam.
    - `alreadyLiked` path → `result.ok=true`, `alreadyLiked=true`, no click.
    - "button not found" → `result.ok=false`, error message clear.
    - over-`maxBatch` → throws (inherited from `runGuardedBatch`).

## Tasks / Subtasks

- [x] **Task 1: Implement `likeSinglePost(page, postUrl)`** (AC: 2)
  - [x] `await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 })`; `await delay(...)` if delay seam available, else short fixed wait
  - [x] Locale-aware Like button lookup: try `[aria-label="Like"]`, then `[aria-label="Thích"]` (helper `findLikeButton(page)`)
  - [x] If found AND state is "not liked" → click, return `{ liked: true, alreadyLiked: false }`
  - [x] If state is "Remove Like"/"Bỏ thích" → return `{ liked: false, alreadyLiked: true }` (no click)
  - [x] If not found within timeout → throw `Error('❌ Like button not found at <postUrl>; locale unsupported or post unreachable')`
- [x] **Task 2: Implement `likeFacebookPosts(page, postUrls, options)`** (AC: 1, 3, 4)
  - [x] Build `actionFn = async (postUrl) => { const r = await likeSinglePost(page, postUrl); return r; }`
  - [x] Call `runGuardedBatch(postUrls, actionFn, options)` and return its result
  - [x] Post-process the real-run result so `results[i]` includes `alreadyLiked` from the per-call return value (extend `runGuardedBatch` only if needed; otherwise wrap actionFn to capture and re-attach)
  - [x] Add to `default` export
- [x] **Task 3: Selector helper** (AC: 5)
  - [x] `findLikeButton(page)` returns `{ element, alreadyLiked }` or throws — single chokepoint for locale strings
  - [x] Document locale list in `docs/agents/selectors-facebook.md` (Automate Like row) — keep UNVERIFIED until live-tested
- [x] **Task 4: Tests** (AC: 13)
  - [x] Add to `tests/services/facebook-automation.test.js`: dry-run default (no clicks), real-run (per-URL invocation with `delay: () => {}`), alreadyLiked path, button-not-found error, over-maxBatch
  - [x] Use spy `likeSinglePost` injected via `options.actionFn` test seam (or expose it) so tests don't need a real `page` — see "Test seam" in Dev Notes
  - [x] Run `npx vitest run tests/services/facebook-automation.test.js`

## Dev Notes

### CRITICAL — first REAL write story. Apply ADR-007 + Story 2.1 review lessons.

- **Dry-run by default is non-negotiable** (FR-9, ADR-007, SM-2). Story 2.1's `runGuardedBatch` already enforces it — DO NOT add a parallel loop. Just supply `actionFn`.
- **Strict dryRun gate** (Story 2.1 review HIGH): `runGuardedBatch` now treats only explicit `dryRun: false` as real. Don't pass `dryRun: !someFlag` (could be 0/null/""); pass a real boolean.
- **`actionFn` validation** (Story 2.1 review HIGH): if you accidentally pass a non-function, `runGuardedBatch` throws early. Good — don't catch it.
- **Locale dependency is real** (selectors-facebook.md): aria-label changes per Facebook UI language. Document; don't pretend it works everywhere.

### Test seam — keep tests browser-free

`likeSinglePost(page, postUrl)` will be the part that actually touches DOM. To test `likeFacebookPosts` browser-free, the cleanest pattern is:
- Export `likeSinglePost` so tests can spy/replace it via module mocking, OR
- Accept an `options.likeFn` override (defaults to `likeSinglePost`) and test passes a spy.

**Recommend option B** (DI) — consistent with how `runGuardedBatch` already takes injectable `delay`. This lets tests assert the routing through `runGuardedBatch` without needing a real Puppeteer page.

For `likeSinglePost` itself, separate test cases (still browser-free) use a tiny fake page with `goto`/`$`/`click` stubs to drive each branch (locale match, alreadyLiked, not-found).

### Reuse, don't duplicate

- Use `runGuardedBatch` from `api/services/facebookAutomation.js` (Story 2.1) — the entire batch loop is already done.
- Use `randomDelay` exported from the same module (Story 2.1) — don't re-define.
- Use `loginWithCookie` from the scrape adapter (re-exported from `facebookAutomation.js` for convenience).

### File layout

- UPDATE: `api/services/facebookAutomation.js` — add `likeSinglePost` (internal helper) + `likeFacebookPosts` (public) + `findLikeButton` selector helper.
- UPDATE: `tests/services/facebook-automation.test.js` — add `likeFacebookPosts` test block.
- UPDATE: `docs/agents/selectors-facebook.md` — Automate Like section: document the locale list + UNVERIFIED status.
- NO Prisma changes (Operation persistence lands in Epic 3).
- NO new src/automation/facebook/ file unless a browser-paste variant is wanted (not required by AC).

### Operation tracking — Epic 3 deferred

AC says "an Operation record is created scoped by userId". Prisma persistence lives in Epic 3 (Story 3.4). For 2.2, the in-memory result shape from `runGuardedBatch` is the contract Epic 3 will persist. Do NOT add Prisma here. Document the deferred bit in Completion Notes.

### Lessons from Epic 1 + Story 2.1 reviews — apply ALL

- **Delay seam mandatory**: `runGuardedBatch` already handles it. Tests pass `delay: () => {}` through `options`.
- **Test mocks must exercise REAL logic** (1.4 lesson): use spy `likeFn` to count calls, NOT mock `runGuardedBatch` itself.
- **Verify regex/selector claims** (1.5 lesson): for the locale-list selector, document but don't claim "works on Vietnamese" without live verification.
- **Reuse existing helpers** (1.5 DRY lesson): NON_PROFILE_SEGMENTS isn't relevant here, but the `delay`/`randomDelay`/`runGuardedBatch` all are.

### Critical context

- Node.js, ESM, Puppeteer (server-side). `dryRun` test paths NEVER need a real browser.
- Never log session cookies (NFR3) — same as Epic 1.
- Selectors UNVERIFIED until live test — selectors-facebook.md is the single source of truth.
- 5 deferred items still open in `_bmad-output/implementation-artifacts/deferred-work.md` from earlier reviews; do not regress, but not blocking 2.2.

### Project Structure Notes

- `api/services/facebookAutomation.js` — extend (current 53 tests pass; new tests added under same file).
- No new top-level files this story.

### Testing standards

- Vitest 4.x. Browser-free. Tests pass `delay: () => {}` AND a spy `likeFn` to keep guardrail logic in scope without DOM. `likeSinglePost` itself tested with minimal fake page (`goto`/`$`/`click`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md#FR-6, FR-9, ADR-007, SM-2, NFR1/3]
- [Source: api/services/facebookAutomation.js#runGuardedBatch — chokepoint, do not duplicate]
- [Source: src/automation/autoLiker.js — Twitter equivalent (different runtime: browser-paste, not server Puppeteer); reference for action-loop conventions]
- [Source: docs/agents/selectors-facebook.md#Automate selectors — Like button locale strings, UNVERIFIED]
- [Source: _bmad-output/implementation-artifacts/2-1-automation-scaffold.md — guardrail signature + lessons]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — known open gaps]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

✅ **Story 2.2 Implementation Complete** (Date: 2026-06-09)

**Implemented Functions:**
- `findLikeButton(page)` - Locale-aware selector helper for Like button states
- `likeSinglePost(page, postUrl)` - Single post like helper with navigation and click logic  
- `likeFacebookPosts(page, postUrls, options)` - Main entry point with dry-run default

**Key Technical Decisions:**
- Used dependency injection pattern (`options.likeFn`) for test seams as recommended in Dev Notes
- Implemented closure pattern to capture `alreadyLiked` return values and merge into `runGuardedBatch` results
- Locale support: English ("Like"/"Remove Like") and Vietnamese ("Thích"/"Bỏ thích")
- All DOM writes routed through existing `runGuardedBatch` guardrail (no duplicate batch logic)

**Test Coverage:**
- 6 comprehensive test cases added to `facebook-automation.test.js`
- Browser-free testing using spy functions and fake page objects
- All 59 tests pass (53 existing + 6 new) with no regressions

**Safety Compliance:**
- Dry-run defaults to `true` (FR-9, ADR-007 compliance)
- Account-risk warning inherited from `runGuardedBatch`
- No DOM manipulation under `dryRun=true` (verified by tests)

**Deferred Items:**
- Operation persistence deferred to Epic 3 (Story 3.4) as documented
- Selector verification remains UNVERIFIED until live-tested on real Facebook session
- No Prisma changes in this story (per Dev Notes guidance)

### File List

**Modified Files:**
- `api/services/facebookAutomation.js` - Added `findLikeButton`, `likeSinglePost`, `likeFacebookPosts` functions (~110 lines added)
- `tests/services/facebook-automation.test.js` - Added comprehensive test suite for `likeFacebookPosts` (~140 lines added)  
- `docs/agents/selectors-facebook.md` - Updated Like button selectors to include both states (already liked/not liked)

## Change Log

**2026-06-09** — Story 2.2 implementation complete
- Added `likeFacebookPosts(page, postUrls, options)` entry point with dry-run default  
- Implemented `likeSinglePost(page, postUrl)` DOM helper with locale-aware Like button detection
- Added `findLikeButton(page)` selector helper supporting English/Vietnamese locales
- Comprehensive test suite added (6 test cases, browser-free with DI pattern)
- All functionality routes through existing `runGuardedBatch` guardrail
- Updated selectors documentation in `docs/agents/selectors-facebook.md`
- 59/59 tests pass with no regressions

## Review Findings

> Code review 2026-06-09 (3-layer adversarial). Reviewer-verified: tests pass (59 → 71 after patches). Acceptance Auditor: 12/13 COVERED, 1 PARTIAL (locale JSDoc). All 3 reviewers converged.

### Patch

- [x] [Review][Patch][HIGH] `likeFn: null` bypasses default → silent all-failed [api/services/facebookAutomation.js:287] — FIXED 2026-06-09: nullish-coalesce `likeFn = options.likeFn ?? likeSinglePost`. Same class as Story 2.1's dryRun-null guard. Tests added.
- [x] [Review][Patch][MEDIUM] `findLikeButton` race → spurious re-like on slow load [api/services/facebookAutomation.js:198] — FIXED: single combined `waitForSelector` (like+unlike) blocks until reaction area renders, THEN checks already-liked state via `page.$`. Eliminates the page.$-no-wait race AND collapses the 5s×N sequential-timeout latency on unsupported locales to one 5s wait. Tests added.

### Deferred (need live DOM / cosmetic)

- [x] [Review][Defer][MEDIUM] Selector ambiguity — `[aria-label="Like"]` also matches comment Like buttons, not just the post [api/services/facebookAutomation.js:200] — needs live DOM to scope into the post `[role="article"]` container. Tie to selectors-facebook.md verify checklist.
- [x] [Review][Defer][MEDIUM] Hardcoded `sleep(500/300)` in likeSinglePost not injectable [api/services/facebookAutomation.js:254,268] — minor within single-post scope; refactor to delay seam in a cleanup pass.
- [x] [Review][Defer][LOW] Duplicate URLs in postUrls → captured-result Map collision (reporting only) [api/services/facebookAutomation.js:296] — key by index if dedup not desired; low impact.
- [x] [Review][Defer][LOW] AC4.12 PARTIAL — add explicit "caller responsible for supported locale" to likeFacebookPosts JSDoc.

### Dismissed

- **Already-liked race → double-click** — REFUTED by Edge Case Hunter itself: no double-click path; worst case was spurious re-like (now fixed by patch 2).
- **`element.click()` throw** — CONFIRMED OK: caught by runGuardedBatch per-item try/catch + retry.
- **`goto` networkidle2 no try/catch** — KNOWN-DEFERRED (same pattern across all Epic 1 scrapers).
- **Silent error suppression in selector loops** — resolved by patch 2 (combined wait removes the per-selector try/catch swallowing).
