---
baseline_commit: a53b6ac22a9eae45c990a2750ca374e814e0d4a6
---

# Story 3.2: MCP tool/option for Facebook

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an AI agent using the XActions MCP server,
I want to call Facebook scrape and automate actions with the same schema as other platforms,
so that I don't need platform-specific handling.

## Acceptance Criteria

**AC1 — Facebook added to scrape tool platform enums (additive)**
1. `facebook` (and `fb` alias) is added to the `platform` enum of existing scrape tools that already support multi-platform dispatch (e.g. `x_get_profile`, `x_get_followers`, and other tools whose enum is `['twitter','bluesky','mastodon','threads']`).
2. The additions are ADDITIVE — no existing enum value, tool name, required field, or description is removed or renamed. Existing tool contracts unchanged.
3. Scrape dispatch for `platform: 'facebook'` routes through the unified `scrape()` dispatcher (Epic 1), passing `authCookie` object (NOT `authToken` string) for Facebook auth.

**AC2 — New automate tool for Facebook**
4. A new MCP tool (e.g. `x_facebook_automate`) is registered with inputSchema: `action` enum `['like','comment','post']`, `urls` (array, for like/comment), `text` (string, for comment/post), `dryRun` (boolean), `authCookie` (object `{c_user, xs}`), `maxBatch` (number).
5. The tool dispatches to `likeFacebookPosts` / `commentOnFacebookPosts` / `createFacebookPost` from `api/services/facebookAutomation.js`.
6. `dryRun` defaults to `true` (consistent with CLI + service) — the schema default AND the handler default both resolve to dry-run unless the caller explicitly sets `dryRun: false`.

**AC3 — Auth + safety (mirror CLI 3.1 lessons)**
7. Facebook automate requires `authCookie`; missing it returns a clear MCP error (not a silent unauthenticated run). Mirror the CLI hard-guard from Story 3.1.
8. Required-arg validation (action-specific: urls for like/comment, text for comment/post) happens before launching a browser.
9. Account-risk warning from the guardrail is surfaced in the tool response when a real (`dryRun:false`) write runs.

**AC4 — Contract test (schema stability)**
10. A contract test asserts: (a) every pre-existing tool still lists its original platform enum values (additive check — facebook present, originals intact); (b) `x_facebook_automate` exists with the required schema fields and `action` enum; (c) no tool name was removed.
11. The test is browser-free — it inspects the exported tool definitions / schema, does NOT call Puppeteer.

**AC5 — Dispatch correctness**
12. Calling the scrape tools with `platform: 'facebook'` invokes the Facebook adapter path; calling `x_facebook_automate` with `dryRun` unset returns a dry-run preview (no real writes). Browser-free test via injected seam where practical, or schema/dispatch-level assertion.

## Tasks / Subtasks

- [x] **Task 1: Extend scrape tool platform enums** (AC: 1, 2)
  - [x] Find every tool whose `platform.enum` is `['twitter','bluesky','mastodon','threads']` (grep — there are ~5 around lines 84/114/141/182/209)
  - [x] Add `'facebook'` (+ `'fb'`) to each enum; update the description to mention Facebook
  - [x] Confirm scrape dispatch already routes facebook via the unified `scrape()` (Epic 1) — if the MCP scrape handler passes `authToken`, add `authCookie` passthrough for facebook (reuse CLI 3.1 pattern)
- [x] **Task 2: Register `x_facebook_automate` tool** (AC: 2, 3)
  - [x] Add tool definition with inputSchema (action enum, urls, text, dryRun, authCookie, maxBatch)
  - [x] Add handler in `executeTool` (or a dedicated `executeFacebookAutomateTool`) dispatching to like/comment/post service functions
  - [x] Hard auth guard: missing `authCookie` → clear MCP error
  - [x] Validate action-specific required args before browser launch
  - [x] `dryRun` defaults true; pass `delay: () => {}` only is NOT needed here (real runtime) — service handles delay
- [x] **Task 3: Contract test** (AC: 4, 5)
  - [x] `tests/mcp/facebook-tools.test.js` (or existing mcp test dir): assert additive enum changes, new tool schema, no removals
  - [x] Browser-free; import tool definitions and assert shape
  - [x] Run `npx vitest run tests/mcp/` — 30/30 passed
- [x] **Task 4: Docs**
  - [x] `x_list_platforms` description updated to include Facebook

## Dev Notes

### Apply ALL Epic 1/2/3.1 review lessons

- **dryRun default non-negotiable** (ADR-007, SM-2): the automate tool must default to dry-run. Don't pass `dryRun: !flag` (could be 0/null). Resolve to a real boolean; the service's strict gate (`dryRun === false`) is the final backstop.
- **Hard auth guard** (CLI 3.1 review HIGH): Facebook automate without `authCookie` must error clearly, NOT run unauthenticated. Mirror `src/cli/index.js` automate guard.
- **Fail-fast validation** (CLI 3.1 review MEDIUM): validate action + required args before any browser launch.
- **authCookie object, not authToken string** (Story 1.1/1.2): Facebook uses `{ c_user, xs }`. The unified `scrape()` dispatcher's puppeteer branch supports `options.authCookie` (added in 1.2). Pass it through.
- **Additive schema only** (PRD FR-11, AC2): adding enum values + a new tool is safe; renaming/removing breaks the MCP contract. The contract test enforces this.

### Reuse, don't duplicate

- Scrape: route through the unified `scrape(platform, action, options)` from `src/scrapers/index.js` — facebook already registered (Epic 1). The MCP scrape handlers likely already call it for other platforms; just widen the enum.
- Automate: call `likeFacebookPosts` / `commentOnFacebookPosts` / `createFacebookPost` from `api/services/facebookAutomation.js` (Epic 2) — all already route through `runGuardedBatch`. Do NOT add a new loop.

### MCP server structure (src/mcp/server.js, ~4101 lines)

- Tool definitions are objects with `{ name, description, inputSchema }` in a tools array near the top.
- `executeTool(name, args)` (line ~2228) is the dispatch root; it delegates to sub-executors by name prefix/list. Add facebook automate either as a dedicated `executeFacebookAutomateTool` or a case in the main dispatch — follow the existing delegation style (e.g. how `x_persona_` / `x_stream_` prefixes are routed).
- Scrape tools with multi-platform enum: lines ~84, 114, 141, 182, 209 (grep `enum: \['twitter'`). Widen each.
- `x_list_platforms` (line ~1249) description lists supported platforms — add Facebook.

### Operation persistence — still Epic 3.4 (deferred)

The automate tool returns the in-memory guardrail result. Prisma Operation persistence is Story 3.4 — do NOT add it here.

### Critical context

- Node.js, ESM. Contract test is browser-free (inspect schema/definitions).
- Never log `c_user`/`xs` (NFR3). MCP responses must not echo cookie values.
- Selectors for automate are UNVERIFIED (Epic 2 deferred) — MCP just exposes the existing service; no new selector work here.

### Project Structure Notes

- UPDATE: `src/mcp/server.js` — widen scrape enums + add `x_facebook_automate` tool + handler.
- NEW: `tests/mcp/facebook-tools.test.js` (or existing mcp test location) — contract test.
- No scrape-adapter / automation-service change (reuse). No Prisma.

### Testing standards

- Vitest 4.x. Contract test imports tool definitions, asserts additive enum + new tool schema + no removals. Browser-free.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md#FR-11, ADR-007, SM-2, NFR3]
- [Source: src/mcp/server.js — tool defs + executeTool dispatch (line ~2228)]
- [Source: src/scrapers/index.js — unified scrape() dispatcher, facebook registered]
- [Source: api/services/facebookAutomation.js — likeFacebookPosts/commentOnFacebookPosts/createFacebookPost]
- [Source: src/cli/index.js — Story 3.1 automate hard-auth-guard + fail-fast pattern to mirror]
- [Source: _bmad-output/implementation-artifacts/3-1-cli-platform.md — CLI review lessons]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — known open gaps]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5

### Debug Log References

### Completion Notes List

✅ **Story 3.2 Implementation Complete** (Date: 2026-06-09)

**Implemented Changes:**
- 5 scrape tool `platform` enums widened from `['twitter','bluesky','mastodon','threads']` to include `'facebook'` and `'fb'` (lines ~84, 114, 141, 182, 209)
- `x_list_platforms` description updated to list Facebook
- New `x_facebook_automate` MCP tool registered with full inputSchema: action enum (`like`/`comment`/`post`), urls, text, dryRun (default true), authCookie (`{c_user, xs}`), maxBatch
- `executeFacebookAutomateTool(args)` handler with: hard auth guard, fail-fast arg validation, strict `dryRun === false` gate (ADR-007), dispatches to `likeFacebookPosts`/`commentOnFacebookPosts`/`createFacebookPost`, browser closed in `finally`
- Cookie values never logged (NFR3 compliance)

**Test Coverage:**
- 30 contract tests in `tests/mcp/facebook-tools.test.js` — browser-free schema assertions
- Full suite: 1110 passed, 23 failed (all in x402-integration, requires running server — expected per CLAUDE.md)

**Safety Compliance:**
- Hard auth guard mirrors CLI 3.1 pattern (AC3.7)
- Fail-fast validation before browser launch (AC3.8)
- dryRun defaults true; only explicit `false` enables real writes (ADR-007, SM-2)
- Additive only — no existing tool name/enum/field removed (AC1.2)

**Deferred:**
- Operation persistence to Epic 3.4 (no Prisma changes)
- Selector verification remains UNVERIFIED until live-tested

### File List

**Modified Files:**
- `src/mcp/server.js` — widened 5 platform enums, updated x_list_platforms description, added x_facebook_automate tool definition + executeFacebookAutomateTool handler (~120 lines added)

**New Files:**
- `tests/mcp/facebook-tools.test.js` — 30 browser-free contract tests

## Review Findings

> Code review 2026-06-09 (Blind Hunter). Contract tests 30/30 pass. Code applied all prior lessons (hard auth guard, fail-fast, strict dryRun gate, no cookie logging). Note: `tests/mcp/server.test.js` fails with "No test suite found" — PRE-EXISTING (node:test imports under Vitest, not in 3.2 commit, last touched by an x402 commit). Not a 3.2 regression.

### Patch
- [x] [Review][Patch][HIGH] Unknown action launched browser + login before throwing — FIXED: action allowlist guard moved before browser launch (true fail-fast).
- [x] [Review][Patch][MEDIUM] Numeric `c_user` crashed on `.trim()` → opaque TypeError instead of auth error — FIXED: `String(authCookie?.c_user ?? '').trim()` coercion. Verified: numeric c_user previously threw TypeError.
- [x] [Review][Patch][MEDIUM] Dry-run still launched browser + real Facebook login (account risk, no benefit) — FIXED: dry-run dispatches with `page=null`, no browser/login (runGuardedBatch skips actionFn in dry-run).
- [x] [Review][Patch][MEDIUM] `browser.close()` in finally could mask original error — FIXED: `.close().catch(() => {})`.

### Deferred
- [x] [Review][Defer][LOW] `maxBatch` validated downstream (after launch in real-run) — runGuardedBatch throws; could fold into fail-fast. Cleanup pass.
- [x] [Review][Defer][LOW] Individual `urls` entries not validated (only array non-empty) — needs FB-URL format check; tie to live verify.

### Dismissed
- **Cookie echo in result** — VERIFIED: runGuardedBatch result shape has no c_user/xs. No leak.
