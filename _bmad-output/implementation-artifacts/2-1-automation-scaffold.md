---
baseline_commit: 3a975430d0c25a768c57d1b9ebbbcdeda6239b6c
---

# Story 2.1: Automation service scaffold + shared guardrails

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a multi-account operator using XActions,
I want a Facebook automation service with built-in safety guardrails,
so that every write action is protected by dry-run, delay, and batch limits by default.

## Acceptance Criteria

**AC1 — Service scaffold, separate from scrape (ADR-007)**
1. `api/services/facebookAutomation.js` is created (and a `src/automation/facebook/` dir for loop scripts; an `index.js` placeholder is fine this story).
2. The service is SEPARATE from the scrape adapter (`src/scrapers/facebook/`) per ADR-007 — it imports `loginWithCookie` (and `createBrowser`/`createPage` as needed) from the scrape adapter, does NOT duplicate them.
3. Login reuse: the service authenticates via the Epic 1 `loginWithCookie(page, { c_user, xs })` cookie-object contract.

**AC2 — Shared guardrail helper (the heart of this story)**
4. A shared guardrail helper (e.g. `runGuardedBatch(items, actionFn, options)`) enforces, for every write: `dryRun` default `true`; 1-3s delay between actions via an injectable `delay` seam (default `randomDelay`); bounded batch size (`maxBatch`, default e.g. 20); bounded retry; explicit stop condition.
5. When `dryRun` is `true` (the default), the helper returns a **preview** of the actions that WOULD run (target + intended action) and performs NO real action.
6. A batch exceeding `maxBatch` is rejected (or split into capped chunks) — there is NO code path that performs an unbounded write loop.
7. An account-risk warning is surfaced (returned in the result and/or `console.warn`) before the first REAL (`dryRun=false`) write batch.

**AC3 — Dry-run is the default everywhere**
8. Every public write entry point in the service takes `dryRun` defaulting to `true`. No real write executes unless the caller explicitly passes `dryRun: false`.
9. The helper signature is reused by the future like/comment/post functions (Stories 2.2-2.4) — design it as the single chokepoint so those stories only supply an `actionFn`, not their own loop.

**AC4 — Operation result shape (no DB yet)**
10. The guardrail helper returns a structured result: `{ dryRun, platform: 'facebook', attempted, succeeded, failed, preview, results }` (or similar) so callers/Operation persistence (Epic 3) can record it. NO Prisma in this story — just the in-memory shape.

**AC5 — Tests + docs**
11. Browser-free unit tests (no real browser, `delay: () => {}`):
    - dry-run default → no `actionFn` invocation, preview returned;
    - `dryRun: false` → `actionFn` invoked per item with delay seam;
    - batch over `maxBatch` rejected/capped;
    - account-risk warning present before first real batch.
12. Tests must exercise the REAL guardrail logic (inject a spy `actionFn` + `delay: () => {}`), NOT mock past it (Epic 1 lesson 1.4).

## Tasks / Subtasks

- [x] **Task 1: Scaffold service + dir** (AC: 1, 2)
  - [x] Create `api/services/facebookAutomation.js`
  - [x] Create `src/automation/facebook/index.js` (placeholder export; loop scripts land in 2.2-2.4)
  - [x] Import `loginWithCookie`, `createBrowser`, `createPage` from `../../src/scrapers/facebook/index.js` (verify the relative path from `api/services/`); do not duplicate
- [x] **Task 2: Shared guardrail helper** (AC: 2, 3, 4)
  - [x] Implement `runGuardedBatch(items, actionFn, options = {})` — `const { dryRun = true, delay = randomDelay, maxBatch = 20, onProgress } = options`
  - [x] dryRun branch: build `preview` (one entry per item: `{ target, action }`), return without calling `actionFn`
  - [x] real branch: reject/cap when `items.length > maxBatch`; surface account-risk warning once before the loop; for each item `await actionFn(item)` then `await delay(1000, 3000)`; collect `succeeded`/`failed`
  - [x] return the structured result shape (AC4)
  - [x] export a local `randomDelay` (or import a shared one) — keep the delay seam injectable
- [x] **Task 3: Account-risk warning** (AC: 2.7)
  - [x] Define the warning message (account-lock risk, recommend test account) shown before the first real write batch; include it in the result
- [x] **Task 4: Tests** (AC: 11, 12)
  - [x] Create `tests/services/facebook-automation.test.js` (matched repo convention — `tests/` mirroring source)
  - [x] Spy `actionFn` (counts calls), `delay: () => {}`: assert dry-run default calls actionFn 0 times + returns preview; `dryRun:false` calls actionFn N times; over-maxBatch rejected/capped; warning present
  - [x] Run the relevant vitest path

### Review Findings (AI) — 2026-06-08

#### Decision Needed

- [x] [Review][Decision] `maxBatch` không được kiểm tra trong dry-run — **Resolved: apply maxBatch to dry-run too** — dry-run với >maxBatch items throw, preview phản ánh đúng real-run constraint
- [x] [Review][Decision] Missing bounded retry logic (AC2.4) — **Resolved: add `maxRetry` option** — `options.maxRetry = 1`, retry từng item trước khi ghi failed
- [x] [Review][Decision] Missing explicit stop condition (AC2.4) — **Resolved: add `shouldStop` callback seam** — `options.shouldStop = (results) => boolean`, check sau mỗi item

#### Patches

- [x] [Review][Patch] `items` không được validate là array — `items.map` throws `TypeError` với no context nếu null/undefined [api/services/facebookAutomation.js:31]
- [x] [Review][Patch] `null`/`undefined` item trong array passed thẳng vào `actionFn` — nên skip với error entry thay vì crash downstream [api/services/facebookAutomation.js:75]
- [x] [Review][Patch] `onProgress` không check `typeof === 'function'` — truthy non-function (e.g. `true`) throws `TypeError` trong loop, escapes `actionFn` try/catch [api/services/facebookAutomation.js:91]
- [x] [Review][Patch] `onProgress` throwing escapes `actionFn` try/catch — partial results bị mất [api/services/facebookAutomation.js:91]
- [x] [Review][Patch] `delay` throwing/rejecting aborts batch mid-way — partial results không trả về caller [api/services/facebookAutomation.js:94]
- [x] [Review][Patch] `randomDelay(min, max)` với `min > max` — `setTimeout` nhận negative ms, fires ngay lập tức (no actual delay) [api/services/facebookAutomation.js:15]
- [x] [Review][Patch] `maxBatch=NaN` bypass silently — `items.length > NaN` luôn `false`, không reject bất kỳ batch size nào [api/services/facebookAutomation.js:66]

#### Deferred

- [x] [Review][Defer] Empty array `[]` với `dryRun=false` emit `ACCOUNT_RISK_WARNING` dù không có item nào được xử lý — minor UX noise [api/services/facebookAutomation.js:70] — deferred, minor UX
- [x] [Review][Defer] Duplicate items trong array — cùng target bị action N lần silently, không có dedup guard — deferred, caller responsibility
- [x] [Review][Defer] `loginWithCookie` re-export untested — smoke test nice-to-have — deferred, import chain verified
- [x] [Review][Defer] Items array mutated externally during loop — defensive copy là perf tradeoff, không có spec requirement — deferred, pre-existing pattern

## Dev Notes

### CRITICAL — this is the WRITE side (ADR-007). Risk profile ≠ Epic 1.

- **Dry-run default is non-negotiable** (ADR-007, PRD FR-9/SM-2): every write entry point defaults `dryRun: true`. The PRD success metric SM-2 is "100% of write functions default dryRun=true". Treat any real-write-by-default as a hard failure.
- This story builds the **guardrail chokepoint** only — NO actual like/comment/post yet (those are 2.2/2.3/2.4). 2.2-2.4 must route through `runGuardedBatch`, so design the seam now.

### Apply ALL Epic 1 review lessons (carried from 1.1-1.5)

- **Delay seam MANDATORY from the start** (1.3 BLOCKER): `options.delay = randomDelay`, tests pass `delay: () => {}`. Without it the suite goes RED+slow. Non-negotiable.
- **Tests must exercise REAL logic, not mock past it** (1.4 BLOCKER): use a spy `actionFn` and assert call counts; do NOT stub the guardrail itself.
- **Reuse, don't duplicate** (1.3/1.5): import login/browser from the scrape adapter; do not re-implement. If a shared `randomDelay` belongs somewhere common, that's fine, but don't fork two copies that drift.
- **Separation of concerns** (ADR-007): automation service is its own module under `api/services/` + `src/automation/facebook/`. Do NOT add write logic into `src/scrapers/facebook/` (that's read-only).

### Existing infra to reference (not to duplicate)

- `api/services/browserAutomation.js` — existing Twitter-side Puppeteer service. Look at how it structures a service (session cookie in, Puppeteer page, returns results). Mirror the module shape, but Facebook write logic is new.
- `src/automation/autoLiker.js`, `src/automation/autoCommenter.js` — existing Twitter browser-paste automation scripts. Reference for the action-loop shape (delays, bounded batches) but these run in a different context (browser console). Facebook's service is server-side Puppeteer.
- `src/scrapers/facebook/index.js` — exports `loginWithCookie`, `createBrowser`, `createPage`, `NON_PROFILE_SEGMENTS`. Reuse login/browser.

### Guardrail result shape (define now, used by 2.2-2.4 + Epic 3 Operation)

```js
{
  dryRun: true,
  platform: 'facebook',
  attempted: 0,      // items processed
  succeeded: 0,
  failed: 0,
  preview: [ { target, action } ],  // populated when dryRun
  results: [ { target, ok, error? } ],  // populated when real
  warning: '...account risk...'      // present before first real batch
}
```
Keep it JSON-serializable (Epic 3 persists it via Prisma Operation).

### Critical context

- Node.js, ESM, Puppeteer. No mocks (browser-free guardrail tests with spy `actionFn` + `delay: () => {}`).
- Never log `c_user`/`xs` (NFR3) — same as Epic 1.
- This story has NO selectors (no DOM write yet) — selector work for Like/Comment/Post buttons is in 2.2-2.4 (selectors-facebook.md "Automate selectors" section, currently UNVERIFIED).
- Deferred items (deferred-work.md): goto try/catch etc. still open; do not regress.

### Project Structure Notes

- NEW: `api/services/facebookAutomation.js`
- NEW: `src/automation/facebook/index.js` (placeholder)
- NEW: `tests/...facebook-automation.test.js`
- No Prisma/CLI/MCP/API-route change (Epic 3). No scrape-adapter change.

### Testing standards

- Vitest 4.x, browser-free, `delay: () => {}`, spy `actionFn`. Guardrail helper should be pure enough to test without Puppeteer (pass items + actionFn; no real page needed for the guardrail logic itself).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md#FR-9, FR-6..FR-8, SM-2, NFR1/3]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-007 (automate separated, dry-run default), A.6 risks]
- [Source: api/services/browserAutomation.js — service module shape to mirror]
- [Source: src/automation/autoLiker.js, autoCommenter.js — action-loop reference (different runtime)]
- [Source: src/scrapers/facebook/index.js — loginWithCookie/createBrowser to reuse]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — known gaps]
- [Source: _bmad-output/implementation-artifacts/1-3-scrape-posts.md, 1-4-scrape-followers.md — delay seam + mock-realism lessons]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, no blockers.

### Completion Notes List

- Task 1: Created `api/services/facebookAutomation.js` importing `loginWithCookie`, `createBrowser`, `createPage` from scrape adapter (no duplication). Created `src/automation/facebook/index.js` as placeholder for 2.2-2.4 loop scripts.
- Task 2: Implemented `runGuardedBatch(items, actionFn, options)` with `dryRun=true` default, injectable `delay` seam, `maxBatch=20` hard cap, `onProgress` callback. Real branch rejects oversized batches with descriptive error. Result shape matches AC4 spec exactly.
- Task 3: Exported `ACCOUNT_RISK_WARNING` constant. `console.warn` fires before first real write; warning string included in result on real runs, `null` on dry-run.
- Task 4: 21 browser-free tests in `tests/services/facebook-automation.test.js`. All pass. Full regression: 1018 tests pass, 0 regressions. Pre-existing `tests/mcp/server.test.js` empty-suite failure is unrelated to this story.

### File List

- `api/services/facebookAutomation.js` (new)
- `src/automation/facebook/index.js` (new)
- `tests/services/facebook-automation.test.js` (new)

## Change Log

- 2026-06-08: Story 2.1 implemented — Facebook automation service scaffold, `runGuardedBatch` guardrail helper, account-risk warning, 21 unit tests. All ACs satisfied.
