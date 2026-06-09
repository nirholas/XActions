---
baseline_commit: bec88e8
---

# Story 3.3: REST API + Dashboard for Facebook

Status: done

## Story

As a dashboard user of XActions,
I want to access Facebook scrape and automate via REST API and see it in the dashboard,
so that I can operate Facebook from the web UI.

## Acceptance Criteria

**AC1 — REST API routes (additive)**
1. `POST /api/facebook/scrape` — actions: profile, posts, followers, search. Validates input before processing.
2. `POST /api/facebook/automate` — actions: like, comment, post. Hard auth guard + fail-fast + strict dryRun gate.
3. All routes authorized by `authMiddleware` (JWT, userId scoped). Business logic lives in `api/services`.
4. Automate endpoint behind `heavyLimiter` (10 req / 15 min) — consistent with /api/graph and /api/operations.

**AC2 — Dashboard page**
5. `dashboard/facebook.html` added with scrape form (action selector, URL/query, optional authCookie) and automate form (action, URLs, text, dryRun toggle, authCookie, maxBatch).
6. All writes default to dry-run (dryRun checkbox pre-checked, notice visible).
7. Calls `/api/facebook/scrape` and `/api/facebook/automate` using unified JSON response shape `{ ok, ... }`.
8. Reuses shared CSS variables (`--bg-primary`, `--accent`, `--border`, etc.) from existing dashboard pattern.
9. Security: API-side authorization only — no client-side auth guards in the HTML.
10. Cookie values shown in password inputs, never echoed or stored (NFR3).

## Tasks / Subtasks

- [x] **Task 1: Create `api/routes/facebook.js`** (AC: 1, 2, 3, 4)
  - [x] POST /api/facebook/scrape — validate action + url/query, dynamic import scraper, userId in options
  - [x] POST /api/facebook/automate — hard auth guard, fail-fast arg validation, strict dryRun gate, browser open/close in finally
  - [x] `router.use(authMiddleware)` at top — all routes require JWT

- [x] **Task 2: Register route in `api/server.js`** (AC: 4)
  - [x] Import `facebookRoutes`
  - [x] `app.use('/api/facebook/automate', heavyLimiter)` before route registration
  - [x] `app.use('/api/facebook', facebookRoutes)`

- [x] **Task 3: Create `dashboard/facebook.html`** (AC: 5–10)
  - [x] Scrape section: action select, URL/query input, optional authCookie (collapsible)
  - [x] Automate section: action select, URLs textarea, text textarea, maxBatch, dryRun checkbox (pre-checked), required authCookie
  - [x] JS: `runScrape()` + `runAutomate()` call `/api/facebook/scrape` and `/api/facebook/automate`
  - [x] Uses same CSS variables as automations.html / existing dashboard pages

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5

### Completion Notes List

✅ **Story 3.3 Implementation Complete** (Date: 2026-06-10)

**Implemented:**
- `api/routes/facebook.js` (162 lines) — two POST endpoints with full validation chain
- `api/server.js` — 3 surgical edits: import, heavyLimiter, app.use
- `dashboard/facebook.html` — functional dashboard page with scrape + automate UI

**Safety:**
- Hard auth guard for automate (mirrors MCP + CLI pattern)
- Strict `dryRun === false` gate (ADR-007)
- authCookie in password inputs, never logged (NFR3)
- API-side JWT auth — no client-side security bypass possible

**Deferred:**
- Operation persistence → Story 3.4
- No Prisma changes (in-memory result shape from runGuardedBatch is the contract)
- Selector verification remains UNVERIFIED until live-tested

### File List

**New Files:**
- `api/routes/facebook.js` — REST routes for Facebook scrape + automate
- `dashboard/facebook.html` — dashboard UI for Facebook operations

**Modified Files:**
- `api/server.js` — import + rate-limit + route registration (3 surgical edits)
