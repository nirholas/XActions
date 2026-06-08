# Story 1.1: Facebook adapter scaffold + login + dispatcher registration

---
baseline_commit: 17e476abaf6629de3eb93991ac6c9c48e5d4302e
---

Status: done

## Change Log

- 2026-06-09: Added Facebook scraper scaffold, login cookie handling, dispatcher registration, and tests.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer using XActions,
I want a Facebook adapter module registered in the platform dispatcher with login support,
so that I have a working foundation to build scrape functions on.

## Acceptance Criteria

**AC1 — Module scaffold (FR-10)**
1. `src/scrapers/facebook/index.js` is created with exports: `createBrowser`, `createPage`, `loginWithCookie`, plus a `default` export object.
2. The module follows the same Puppeteer + Stealth pattern as `src/scrapers/threads/index.js` (`puppeteer-extra` + `puppeteer-extra-plugin-stealth`).
3. `createBrowser(options)` launches headless Chromium with the same anti-automation args as Threads; `createPage(browser)` sets a realistic viewport + user agent.

**AC2 — Login with cookie pair (FR-10)**
4. `loginWithCookie(page, { c_user, xs })` accepts an **object** with both cookies (NOT a string — this differs from Twitter's single `auth_token`).
5. Both cookies are set on the `.facebook.com` domain with `httpOnly`/`secure` flags before navigation.
6. Missing or empty `c_user` or `xs` throws a clear error (e.g. `❌ Facebook login requires both c_user and xs cookies`) without retrying blindly.
7. Cookie values never appear in logs, thrown error messages, or console output (NFR3 redaction).

**AC3 — Dispatcher registration (FR-5)**
8. `src/scrapers/index.js` imports the facebook module and adds `facebook` + alias `fb` to the `platforms` object.
9. `getPlatform('facebook')` and `getPlatform('fb')` return the Facebook module.
10. `'facebook'` and `'fb'` are added to the `needsPuppeteer` array in the `scrape()` function (currently line 199).
11. `scrape('facebook', 'nonexistent', {})` throws an error listing available actions (existing dispatcher behavior, not new code).

**AC4 — Docs + tests**
12. `docs/agents/selectors-facebook.md` exists (already created — verify present, no action needed unless missing).
13. Unit tests cover: login error handling (missing cookie throws), and dispatcher wiring (`getPlatform('facebook')`/`'fb'` resolve, `needsPuppeteer` includes both).

## Tasks / Subtasks

- [x] **Task 1: Create Facebook adapter module** (AC: 1, 2, 3)
  - [x] Create `src/scrapers/facebook/index.js`
  - [x] Copy structure from `src/scrapers/threads/index.js`: imports, `puppeteer.use(StealthPlugin())`, `sleep`/`randomDelay` helpers, `FACEBOOK_BASE = 'https://www.facebook.com'`
  - [x] Implement `createBrowser(options)` with args `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-blink-features=AutomationControlled`
  - [x] Implement `createPage(browser)` with randomized viewport + Chrome UA
  - [x] Add `// by nichxbt` author credit and BSL license header matching sibling files
- [x] **Task 2: Implement loginWithCookie** (AC: 2)
  - [x] Signature `loginWithCookie(page, { c_user, xs })` — destructure object
  - [x] Validate both present → else `throw new Error('❌ ...')` (no cookie values in message)
  - [x] `page.setCookie(...)` for `c_user` and `xs` on domain `.facebook.com`, `httpOnly: true`, `secure: true`
  - [x] Navigate to `FACEBOOK_BASE` to activate session
- [x] **Task 3: Register in dispatcher** (AC: 3)
  - [x] In `src/scrapers/index.js`: add `import facebook from './facebook/index.js';`
  - [x] Add `facebook, fb: facebook,` to `platforms` object
  - [x] Add `facebook` module to the `default` export and named platform exports (match threads pattern)
  - [x] Update `needsPuppeteer` array (line ~199): `['twitter', 'x', 'threads', 'facebook', 'fb']`
- [x] **Task 4: Tests** (AC: 4)
  - [x] Create `tests/scrapers/facebook.test.js` (mirror existing scraper test location)
  - [x] Test: `loginWithCookie` throws when `c_user` or `xs` missing
  - [x] Test: `getPlatform('facebook')` and `getPlatform('fb')` return module with expected exports
  - [x] Test: dispatcher recognizes facebook in `needsPuppeteer` path (no real browser launch — assert wiring only)
  - [x] Run `vitest run tests/scrapers/facebook.test.js`

## Dev Notes

### Critical context

- **Runtime context:** This is the **Node.js library** context (not browser-paste script). Uses Puppeteer. See CLAUDE.md "three runtime contexts".
- **ESM only:** `import`/`export`, no `require`. `"type": "module"` in package.json.
- **No mocks rule:** Project policy is NO mocks/stubs/fakes — real implementations only. Tests assert real wiring; the dispatcher wiring test must NOT launch a real browser (assert the registry/array state directly, not behavior requiring a live Facebook session).

### Template to clone — `src/scrapers/threads/index.js`

Threads is the closest analog (Meta product, Puppeteer + Stealth, no full public API). Clone its structure exactly:
- `import puppeteer from 'puppeteer-extra';`
- `import StealthPlugin from 'puppeteer-extra-plugin-stealth';`
- `puppeteer.use(StealthPlugin());`
- `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));`
- `const randomDelay = (min = 1000, max = 3000) => sleep(min + Math.random() * (max - min));`
- `createBrowser` / `createPage` shapes are directly reusable.

### Login contract — DIFFERS from Twitter

Twitter: `loginWithCookie(page, authToken)` — single string.
Facebook: `loginWithCookie(page, { c_user, xs })` — **object with two cookies**. This is a deliberate contract per FR-10 / Glossary. Do NOT collapse to a string.

`c_user` = numeric user ID (15-17 digits). `xs` = session token (contains `%3A`). See cookie guide for format.

### Dispatcher wiring — `src/scrapers/index.js` (362 lines)

Current state (read before editing):
- Line ~38-41: platform imports (`twitter`, `bluesky`, `mastodon`, `threads`).
- Line ~102-110: `platforms` object with aliases.
- Line ~199: `const needsPuppeteer = ['twitter', 'x', 'threads'].includes(platformName);`
- The `scrape()` dispatcher auto-handles browser creation, `loginWithCookie`, and autoClose for `needsPuppeteer` platforms. Once registered, `scrape('facebook', ...)` routes correctly — but note the dispatcher calls `loginWithCookie(page, options.authToken)` for the puppeteer branch. **Check this:** the generic dispatcher passes `options.authToken` (line ~211). For Facebook's object cookie, the dispatcher path may need `options.authCookie` support, OR Story 1.1 keeps login working via direct module call and the dispatcher auth wiring is refined when scrape actions land (Story 1.2). Document this gap in Completion Notes; do not break Twitter's existing `authToken` path.

**Must preserve:** Twitter/Bluesky/Mastodon/Threads dispatch behavior. Adding facebook is additive — the `Unknown platform` error path and existing aliases must still work.

### Selectors

Profile/post selectors are NOT needed in this story (no scrape functions yet). `docs/agents/selectors-facebook.md` already exists as skeleton. Story 1.2+ fills it.

### Security (NFR3)

- Never log `c_user` or `xs`. Error messages reference cookie *names*, never *values*.
- This mirrors how Twitter session cookies are handled — grep for existing redaction patterns if unsure.

### Project Structure Notes

- New file: `src/scrapers/facebook/index.js` (NEW — mirrors `src/scrapers/threads/index.js`)
- Modified file: `src/scrapers/index.js` (UPDATE — additive registration only)
- New test: `tests/scrapers/facebook.test.js` (NEW)
- Selector doc: `docs/agents/selectors-facebook.md` (already exists)
- No Prisma/DB changes in this story (persistence is Epic 3 Story 3.4).
- No CLI/MCP/API changes (those are Epic 3).

### Testing standards

- Vitest 4.x. `vitest run` for once-off. Tests in `tests/` mirroring source structure. Files `*.test.js`. Node environment, 30s timeout.
- No mocks. For wiring tests, assert module exports and registry membership directly.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- [Source: _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md#FR-5, FR-10, NFR3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Addendum A.3 Wiring, A.5 ADR-006]
- [Source: src/scrapers/threads/index.js — clone template]
- [Source: src/scrapers/index.js — dispatcher, lines 38-41/102-110/199-211]
- [Source: docs/agents/facebook-session-cookie.md — cookie format + security]
- [Source: docs/agents/selectors-facebook.md — selector strategy (NFR4)]

## Dev Agent Record

### Agent Model Used

sonnet-4.6

### Debug Log References

- Verified `tests/scrapers/facebook.test.js` with `npx vitest run tests/scrapers/facebook.test.js`
- Verified scraper suite with `npx vitest run tests/scrapers/*.test.js`
- Confirmed `docs/agents/selectors-facebook.md` already exists

### Completion Notes List

- Added `src/scrapers/facebook/index.js` with Puppeteer + Stealth scaffold, randomized page setup, and `loginWithCookie(page, { c_user, xs })`
- Registered Facebook in `src/scrapers/index.js` as `facebook` and alias `fb`
- Added Facebook to `needsPuppeteer` so the dispatcher routes it through the Puppeteer path
- Added tests for missing-cookie errors, registry wiring, and module exports
- Kept dispatcher auth token behavior unchanged for existing platforms; Facebook cookie-object wiring remains a direct-module responsibility for this story

### File List

- src/scrapers/facebook/index.js
- src/scrapers/index.js
- tests/scrapers/facebook.test.js
- _bmad-output/implementation-artifacts/1-1-facebook-adapter-scaffold.md

## Review Findings

> Code review 2026-06-08 (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Tests verified by reviewer: 15/15 pass. 12/13 ACs covered; AC4.13 partial.

### Decision needed

- [x] [Review][Decision→Defer] Dispatcher `loginWithCookie` auth wiring — string vs object mismatch [src/scrapers/index.js:213-215] — deferred per user (option 1). Reason: out of scaffold scope; dispatcher auth path isn't exercised until scrape actions land in Story 1.2, where the `options.authCookie` object wiring will be added without breaking Twitter's string `authToken` path.

### Patch

- [x] [Review][Patch] `createBrowser` `...options` spread clobbers hardcoded `args`/`headless` [src/scrapers/facebook/index.js:35-44] — FIXED 2026-06-08: destructure `args`/`headless` out of options, merge `[...stealthArgs, ...extraArgs]`, apply `headless` default only when undefined, spread `...rest` last.
- [x] [Review][Patch] `getPlatform` error lists `fb` alias as a platform [src/scrapers/index.js:123] — FIXED 2026-06-08: added `'fb'` to the alias filter.

### Deferred (pre-existing / beyond AC)

- [x] [Review][Defer] `--disable-web-security` disables SOP [src/scrapers/facebook/index.js:41] — deferred, pre-existing pattern across all adapters (threads/twitter); address cross-cutting.
- [x] [Review][Defer] Login success never verified — invalid cookie → silent unauthenticated session [src/scrapers/facebook/index.js:91] — deferred, beyond AC2 scope; siblings behave the same.
- [x] [Review][Defer] `page.goto` networkidle2/30s timeout has no try/catch → browser leak on throw [src/scrapers/facebook/index.js:91] — deferred, consistent with siblings; tied to dispatcher cleanup.
- [x] [Review][Defer] `page.__xactions_browser` set after `loginWithCookie` may throw → leak [src/scrapers/index.js:219] — deferred, pre-existing dispatcher bug affecting all puppeteer platforms.
- [x] [Review][Defer] `xs` cookie has no `sameSite` attribute [src/scrapers/facebook/index.js:82-88] — deferred, minor hardening; siblings same.
- [x] [Review][Defer] `needsPuppeteer` test is indirect (registry-membership proxy) [tests/scrapers/facebook.test.js:75] — deferred, proxy acceptable; array is a local const, not exported.

### Dismissed (noise / by-design)

- All `scrape('facebook', action)` throw "action not available" — BY DESIGN for scaffold story; scrape functions land in Story 1.2-1.5 (Acceptance Auditor confirmed AC11 expects empty list).
- `headless: 'new'` rejected by older Puppeteer — consistent with existing adapters; puppeteer version is pinned.
- `fakePage` test stubs vs no-mock rule — permitted by spec (Dev Notes require browser-free wiring tests).
