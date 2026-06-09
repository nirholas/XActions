---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-write-tests', 'step-04-verify-tests']
lastStep: 'step-04-verify-tests'
lastSaved: '2026-06-10'
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
- Scope: story 2.1 Facebook automation guardrails

## Targets

### Unit
- `api/services/facebookAutomation.js`
  - `runGuardedBatch`
  - `randomDelay`
- Priority: P0/P1
- Why: core guardrail logic is pure-ish and risk-bearing; should be exercised directly with spy `actionFn` and injectable `delay`

### No additional levels
- No API/E2E/browser flows for this story
- No duplication of scraper tests
- No contract tests; no external provider involved

## Coverage focus
- Default `dryRun=true`
- Preview shape + no action invocation
- `dryRun=false` path with per-item action execution
- `maxBatch` enforcement in dry-run + real run
- bounded retry
- explicit stop condition seam
- `onProgress` guard and failure isolation
- null/undefined item handling
- `randomDelay(min, max)` validation

## Priority rationale
- P0: guardrails, safety defaults, batch bounds, retry/stop semantics
- P1: callback/error isolation and input validation
- P2: minor shape edge cases / helper behavior

## Test Results

- File: `tests/services/facebook-automation.test.js`
- Runner: vitest v4.0.18
- Run date: 2026-06-10
- Result: **59 passed, 0 failed** (duration: 220ms)

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

## Status: COMPLETE
