---
baseline_commit: 5082917
---

# Story 2.4: Create Facebook post (dry-run default)

Status: done

## Story

As a multi-account operator using XActions,
I want to create a Facebook text post (with optional media) with a dry-run preview,
So that I can confirm content before it goes live.

## Acceptance Criteria

**AC1 — createFacebookPost entry point**
1. `createFacebookPost(page, content, options)` is exported from `api/services/facebookAutomation.js` and added to its default export.
2. Routes through `runGuardedBatch([content], createPostFn, options)` — uses guardrail for single-item batch consistency.
3. `dryRun` defaults to `true` (inherited from `runGuardedBatch`); only explicit `dryRun: false` enables real posts.
4. `content` is user-provided text — the function does NOT auto-generate content.

**AC2 — Single post creation helper (the actual DOM write)**
5. An internal `createSinglePost(page, content)` async function navigates to Facebook home, finds the post composer, types the content, submits it, returns `{ posted: boolean, postUrl?: string }`.
6. Selector strategy uses `aria-label` or text content for composer (locale-aware): `[aria-label*="What's on your mind"]` (en) / `[aria-label*="Bạn đang nghĩ gì"]` (vi). Selectors from `docs/agents/selectors-facebook.md`.
7. Submit via Post button: `[aria-label="Post"]` / `[aria-label="Đăng"]`.
8. If composer or submit button not found, throw clear error (`runGuardedBatch` will catch + record).

**AC3 — Result shape (dry-run preview + real)**
9. Dry-run preview entries contain the content as `target` and preview text: `{ target: content, action: 'pending', previewContent: content }`.
10. Real-write `results` entries include `{ target: content, ok, error?, postUrl?, content }`. `ok: true` means post was created successfully.

**AC4 — Safety (FR-9, ADR-007)**
11. The function does NOT call any DOM write under `dryRun=true`. Tests must verify no `page.type` or `page.click` happens in dry-run.
12. Account-risk warning fires before real batch (inherited from `runGuardedBatch`).
13. Single-item batch: content array `[content]` ensures guardrail consistency even for individual posts.

**AC5 — Tests**
14. Browser-free unit tests using fake `page` + spy `createSinglePost`:
    - Dry-run returns preview with `previewContent` field, does NOT call createSinglePost
    - `dryRun: false` calls createSinglePost with correct (page, content)
    - Success includes postUrl in result when available
    - Failed post (e.g., composer not found) records `ok: false` with error message
15. Smoke test gated by `FACEBOOK_TEST_SESSION` env: real post creation, verify post appears (manual cleanup).

## Technical Notes

### Selector Strategy
Post composer selectors (from `docs/agents/selectors-facebook.md`):
- English: `[aria-label*="What's on your mind"]`, `[role="textbox"][data-text*="What's on your mind"]`
- Vietnamese: `[aria-label*="Bạn đang nghĩ gì"]`, `[role="textbox"][data-text*="Bạn đang nghĩ gì"]`

Submit button selectors:
- English: `[aria-label="Post"]`, `[role="button"]:has-text("Post")`
- Vietnamese: `[aria-label="Đăng"]`, `[role="button"]:has-text("Đăng")`

Post flow:
1. Navigate to Facebook home (`https://facebook.com/`)
2. Click composer to focus
3. Type content text
4. Click Post/Đăng button
5. Wait for post creation (1-2s)
6. Extract post URL from browser location or success indicator

### Error Handling
- Composer not found → clear error
- Submit button not found → clear error
- Navigation timeout → caught by `runGuardedBatch` retry logic
- Rate limiting/blocking → return error in result (does not crash batch)

### Integration with Story 2.1 Guardrails
- Uses `runGuardedBatch([content], actionFn, options)` for single-item consistency
- `actionFn = (content) => createSinglePost(page, content)`
- Inherits: dry-run default, account-risk warning, maxRetry, error isolation

## Dependencies
- Story 2.1: `runGuardedBatch` helper ✓ (committed in 42ad98f)
- Story 1.1: Facebook login (`loginWithCookie`) ✓
- `docs/agents/selectors-facebook.md`: post composer selectors (to be added)

## Out of Scope
- Media/image upload (text posts only in MVP)
- Post scheduling (immediate posts only)
- Audience targeting (uses account's default audience)
- Auto-generating post content (user must provide)

## Test Coverage Focus
- P0: dry-run default (no DOM writes), preview shape with content
- P0: dryRun:false invokes createSinglePost with correct content
- P0: single-item batch consistency (uses guardrail even for one post)
- P1: error handling (composer not found, submit failure)
- P1: content pass-through (user-provided, not generated)
- P2: postUrl extraction when available

## Implementation Checklist
- [ ] Add post composer selectors to `docs/agents/selectors-facebook.md`
- [ ] Implement `createSinglePost(page, content)` helper
- [ ] Implement `createFacebookPost(page, content, options)` routing through `runGuardedBatch`
- [ ] Add to default export in `api/services/facebookAutomation.js`
- [ ] Write browser-free unit tests (dry-run, real write, error cases)
- [ ] Optional: smoke test with real Facebook session
- [ ] Update automation-summary.md after test verification
## Review Findings

> Batch code review 2026-06-09 (3-layer adversarial). Tests 71/71 pass.

### Patch
- [x] [Review][Patch][HIGH] `createPostFn: null` bypasses destructuring default → silent all-fail — FIXED: nullish-coalesce `createPostFn = options.createPostFn ?? createSinglePost`.
- [x] [Review][Patch][HIGH] `postUrl` discarded by runGuardedBatch; comment claimed "captured" but no Map existed — FIXED: added `captured` Map (same pattern as likeFacebookPosts) to surface `postUrl` into real-run results; documented best-effort caveat.
- [x] [Review][Patch][MEDIUM] Empty `content` types nothing then submits blank post — FIXED: validate non-empty string at entry, throws clear error.

### Deferred
- [x] [Review][Defer][MEDIUM] `postUrl` detection unreliable: Facebook composer submits via XHR without navigating, so `page.url()` stays on home feed → postUrl often undefined even on success [api/services/facebookAutomation.js:createSinglePost] — needs live DOM verify (e.g. watch for toast/permalink element). Tie to selectors-facebook.md verify checklist.
