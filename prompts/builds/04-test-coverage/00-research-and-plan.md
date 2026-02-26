# Track 04 — Test Coverage: Research & Plan

> **Goal:** Bring test coverage from ~6.5% (12 tests for 184 files) to ≥80% with a professional test infrastructure.

---

## Research Phase

### 1. Audit current test infrastructure

- [ ] Read `vitest.config.js` — current setup, coverage config, globals, test paths
- [ ] Read all 12 existing test files — patterns used, what's tested, what's mocked
- [ ] Count tests per file, assertion styles used
- [ ] Check if coverage reporting is configured (c8, istanbul, v8)
- [ ] Check for any test utilities, helpers, fixtures, or factories
- [ ] Check package.json `scripts.test` command

### 2. Identify coverage gaps

- [ ] Map all 184 source files → which have tests, which don't
- [ ] Priority matrix: most critical un-tested code
  * `src/scrapers/twitter/index.js` (952 lines, 0 tests for scraper logic)
  * `src/mcp/server.js` (3,898 lines, 0 dedicated tests)
  * `src/cli/index.js` (2,982 lines, 0 dedicated tests)
  * `src/scrapers/index.js` (353 lines)
  * `src/utils/core.js` (674 lines)
  * `src/auth/teamManager.js` (270 lines)
  * `api/server.js` and all routes/services
- [ ] Categorize by test type needed:
  * Unit tests (pure functions, utils, validators)
  * Integration tests (scraper + error handling, MCP tool chains)
  * API tests (Express routes via supertest)
  * E2E tests (CLI commands, full scraper pipelines)

### 3. Research best test patterns for this stack

- [ ] Vitest mocking patterns for Puppeteer (how to mock browser, page, evaluate)
- [ ] Vitest mocking for node:fs, fetch, external APIs
- [ ] Supertest for Express API testing
- [ ] Commander.js CLI testing patterns
- [ ] Socket.IO testing patterns
- [ ] Prisma test utilities (mock or test DB)
- [ ] Coverage thresholds in vitest.config.js

### 4. Study competitor test suites

- [ ] `the-convocation/twitter-scraper` — TypeScript tests, how they mock HTTP responses
- [ ] `d60/twikit` — Python tests, coverage percentage
- [ ] Other well-tested Node.js scraper projects

---

## Planning Phase

### Test infrastructure additions

1. **Vitest configuration enhancements:**
   - Coverage provider (v8 or istanbul)
   - Coverage thresholds: 80% lines, 75% branches, 80% functions
   - Coverage reporter: text, html, lcov
   - Test path patterns, setup files, globals

2. **Test utilities:**
   - Mock factory for Puppeteer page/browser
   - Mock factory for Express req/res
   - Fixture data for Twitter responses (real JSON snapshots)
   - Test helpers: `createMockPage()`, `createMockBrowser()`, `createMockSocket()`

3. **Test categories and locations:**
   ```
   tests/
     unit/          → Pure function tests
     integration/   → Multi-module tests
     api/           → Express route tests (supertest)
     cli/           → CLI command tests
     mcp/           → MCP tool handler tests
     scrapers/      → Scraper-specific tests
     fixtures/      → JSON response fixtures
     helpers/       → Test utility functions
     setup.js       → Global test setup
   ```

4. **CI integration:**
   - Coverage gate in CI (fail if below threshold)
   - Coverage report uploaded as artifact
   - Badge in README

---

## Dependencies

- Track 03 (error handling) — need error classes for test assertions
- Existing test files preserved and migrated to new structure

---

## Build Sequence (15 prompts)

| # | Build | Description |
|---|-------|-------------|
| 01 | Vitest config | Coverage, thresholds, reporters, setup |
| 02 | Test helpers & factories | Mock page, browser, req, res, socket |
| 03 | Fixtures | Real Twitter API response snapshots |
| 04 | Scraper unit tests | `src/scrapers/twitter/index.js` functions |
| 05 | HTTP client tests | Track 01 HTTP scraper tests |
| 06 | Utils unit tests | `src/utils/core.js`, all utility files |
| 07 | Auth tests | `src/auth/teamManager.js`, cookie handling |
| 08 | MCP server tests | All 140+ tool handlers |
| 09 | CLI tests | All 12 Commander.js commands |
| 10 | API route tests | Express routes via supertest |
| 11 | WebSocket tests | Socket.IO event handlers |
| 12 | Adapter tests | Puppeteer, Playwright, Cheerio adapters |
| 13 | Cross-platform scraper tests | Bluesky, Mastodon, Threads |
| 14 | E2E pipeline tests | Full scrape workflows |
| 15 | CI coverage gate | GitHub Actions coverage enforcement |
