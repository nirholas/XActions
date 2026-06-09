---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-write-tests', 'step-04-verify-tests']
lastStep: 'step-03b-subagent-backend-tea-round2'
lastSaved: '2026-06-09'
inputDocuments:
  - '/Users/luisphan/Documents/GitHub/XActions/_bmad/tea/config.yaml'
  - '/Users/luisphan/Documents/GitHub/XActions/.claude/worktrees/linear-stirring-reef/package.json'
  - '/Users/luisphan/Documents/GitHub/XActions/.claude/worktrees/linear-stirring-reef/tests/services/facebook-automation.test.js'
  - '/Users/luisphan/Documents/GitHub/XActions/.claude/worktrees/linear-stirring-reef/api/services/facebookAutomation.js'
---

# Coverage Plan

## Stack / Mode
- Stack: fullstack
- Mode: BMad-integrated
- Scope: Epic 2 — Facebook Automation (Stories 2.1–2.4)

## Targets

### Unit
- `api/services/facebookAutomation.js`
  - `runGuardedBatch` (Story 2.1)
  - `randomDelay` (Story 2.1)
  - `likeFacebookPosts` (Story 2.2)
  - `commentOnFacebookPosts` (Story 2.3)
  - `createFacebookPost` (Story 2.4)
- Priority: P0/P1
- Why: core guardrail logic and write actions are risk-bearing; exercised directly with spy actionFn/likeFn/commentFn/createPostFn and injectable delay

### No additional levels
- No API/E2E/browser flows for these stories
- No duplication of scraper tests
- No contract tests; no external provider involved

## Coverage focus
- Default `dryRun=true` across all functions
- Preview shape + no action invocation in dry-run
- `dryRun=false` path with per-item action execution
- `maxBatch` enforcement in dry-run + real run
- bounded retry
- explicit stop condition seam
- `onProgress` guard and failure isolation
- null/undefined item handling
- `randomDelay(min, max)` validation
- `alreadyLiked` idempotency (Story 2.2)
- `commentText` pass-through in results (Story 2.3)
- `previewContent` / `content` in results (Story 2.4)
- account-risk warning before first real write

## Priority rationale
- P0: guardrails, safety defaults, batch bounds, retry/stop semantics
- P1: callback/error isolation and input validation
- P2: minor shape edge cases / helper behavior

## Test Results

- File: `tests/services/facebook-automation.test.js`
- Runner: vitest v4.0.18
- Run date: 2026-06-09
- Result: **71 passed, 0 failed** (duration: ~223ms)

### Suites verified
- `runGuardedBatch > input validation` — 13 tests
- `runGuardedBatch > strict dryRun gate (HIGH safety guard)` — 4 tests
- `runGuardedBatch > dry-run default` — 6 tests
- `runGuardedBatch > dryRun:false — real write branch` — 6 tests
- `runGuardedBatch > maxBatch enforcement` — 4 tests
- `runGuardedBatch > account-risk warning` — 4 tests
- `runGuardedBatch > result shape` — 2 tests
- `runGuardedBatch > delay seam` — 3 tests
- `runGuardedBatch > maxRetry` — 3 tests
- `runGuardedBatch > shouldStop` — 3 tests
- `runGuardedBatch > onProgress` — 3 tests
- `runGuardedBatch > randomDelay` — 2 tests
- `likeFacebookPosts > dry-run default` — 1 test
- `likeFacebookPosts > dryRun:false — real write` — 1 test
- `likeFacebookPosts > alreadyLiked handling` — 2 tests
- `likeFacebookPosts > error handling` — 1 test
- `likeFacebookPosts > maxBatch enforcement` — 1 test
- `commentOnFacebookPosts > dry-run default` — 1 test
- `commentOnFacebookPosts > dryRun:false — real write` — 1 test
- `commentOnFacebookPosts > commentText in results` — 1 test
- `commentOnFacebookPosts > error handling` — 1 test
- `commentOnFacebookPosts > maxBatch enforcement` — 1 test
- `createFacebookPost > dry-run default` — 1 test
- `createFacebookPost > dryRun:false — real write` — 2 tests
- `createFacebookPost > content in results` — 1 test
- `createFacebookPost > error handling` — 1 test
- `createFacebookPost > account-risk warning` — 2 tests

## Status: COMPLETE

---

## TEA Round 2 — Story 2.2 Gap Coverage (2026-06-09)

### Coverage Gaps Addressed

| Gap | Priority | Resolution |
|---|---|---|
| `findLikeButton` — 0 tests | P0 | 6 unit tests added |
| `likeSinglePost` (private) — 0 tests | P1 | 6 integration tests via real stack |

### New Test Files

**`tests/services/facebookAutomation.findLikeButton.test.js`** (6 tests)
- English Like button → `{ alreadyLiked: false }`
- Vietnamese Like button (Thích) → `{ alreadyLiked: false }`
- English already-liked (Remove Like) → `{ alreadyLiked: true }`
- Vietnamese already-liked (Bỏ thích) → `{ alreadyLiked: true }`
- waitForSelector timeout → throws `/Like button not found/i`
- alreadyLiked priority over liked state

**`tests/services/facebook-automation.integration.test.js`** (6 tests)
- Navigate + click English Like → `ok:true, alreadyLiked:false`
- Navigate + click Vietnamese Like → `ok:true, alreadyLiked:false`
- Already liked en (Remove Like) → no click, `alreadyLiked:true`
- Already liked vi (Bỏ thích) → no click, `alreadyLiked:true`
- Button not found → `ok:false`, error matches `/Like button not found/i`
- Dry-run safety gate → no `goto`, no click

### Final Results

- **New tests:** +12 (6 unit + 6 integration)
- **Total service tests:** 83 pass, 0 fail
- **Regressions:** 0
- **Technique:** fake page objects + `vi.useFakeTimers()` for internal `sleep()` bypass
