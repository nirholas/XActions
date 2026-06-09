---
baseline_commit: c860cef
---

# Story 3.2: MCP tool/option for Facebook

Status: complete

## Story

As an AI agent using the XActions MCP server,
I want to call Facebook scrape and automate actions with the same schema as other platforms,
So that I don't need platform-specific handling.

## Acceptance Criteria

**AC1 — Facebook MCP tools added**
1. `fb_login`, `fb_get_profile`, `fb_get_posts`, `fb_get_followers`, `fb_search` added to `src/mcp/local-tools.js`.
2. `fb_like`, `fb_comment`, `fb_post` automate tools added with `dryRun=true` default.
3. All tools exported in `toolMap` default export.

**AC2 — Schema additive**
4. Existing Twitter/X tools (`x_*`) unchanged.
5. Facebook tools follow same naming convention: `fb_*`.
6. No breaking changes to existing MCP tool contracts.

**AC3 — Dry-run preserved**
7. Automate actions (`fb_like`, `fb_comment`, `fb_post`) default to `dryRun=true`.
8. Explicit `dryRun: false` required for real writes.

## Technical Notes

### Implementation
- Added 8 Facebook MCP tools to `src/mcp/local-tools.js`
- Singleton Facebook browser management (`fbBrowser`, `fbPage`) parallel to existing Twitter browser
- Routes scrape through unified `scrape()` dispatcher
- Routes automate through `facebookAutomation.js` service functions

### Tools added
- `fb_login({ c_user, xs })` — apply Facebook session cookie
- `fb_get_profile({ username })` — scrape profile
- `fb_get_posts({ username, limit })` — scrape posts
- `fb_get_followers({ username, limit })` — scrape followers
- `fb_search({ query, limit })` — search posts
- `fb_like({ urls, dryRun })` — like posts (dry-run default)
- `fb_comment({ urls, text, dryRun })` — comment on posts (dry-run default)
- `fb_post({ text, dryRun })` — create post (dry-run default)

## Dependencies
- Story 3.1 CLI ✓
- Epic 2 automation ✓
- Epic 1 scraper ✓

## Status: COMPLETE
