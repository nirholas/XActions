---
baseline_commit: b08a462
---

# Story 2.3: Auto-comment on Facebook posts (dry-run default)

Status: ready

## Story

As a multi-account operator using XActions,
I want to auto-comment user-provided content on posts with a dry-run preview,
So that I can review target posts and comment text before posting.

## Acceptance Criteria

**AC1 — commentOnFacebookPosts entry point**
1. `commentOnFacebookPosts(page, postUrls, commentText, options)` is exported from `api/services/facebookAutomation.js` and added to its default export.
2. Routes through `runGuardedBatch(postUrls, commentPostFn, options)` — does NOT implement its own loop. Story 2.1's guardrail is the single chokepoint.
3. `dryRun` defaults to `true` (inherited from `runGuardedBatch`); only explicit `dryRun: false` enables real comments.
4. `commentText` is user-provided — the function does NOT auto-generate content.

**AC2 — Single-post comment helper (the actual DOM write)**
5. An internal `commentSinglePost(page, postUrl, commentText)` async function navigates to the post, finds the comment input, types the comment, submits it, returns `{ commented: boolean }`.
6. Selector strategy uses `aria-label` or `placeholder` for comment input (locale-aware): `[aria-label*="comment"]` (en) / `[placeholder*="Viết bình luận"]` (vi). Selectors taken from `docs/agents/selectors-facebook.md` — do NOT hard-code other locales.
7. Submit is via Enter key or click on submit button (whichever is more reliable).
8. If the comment input is not found within a reasonable wait, throw a clear error (`runGuardedBatch` will catch + record per-item).

**AC3 — Result shape (dry-run preview + real)**
9. Dry-run preview entries contain the post URL as `target` and preview text showing the comment that would be posted: `{ target, action: 'pending', previewComment: commentText }`.
10. Real-write `results` entries include `{ target, ok, error?, commentText }`. `ok: true` means the comment was successfully posted.

**AC4 — Safety (FR-9, ADR-007)**
11. The function does NOT call any DOM write under `dryRun=true`. Tests must verify no `page.type` or `page.keyboard.press` happens in dry-run.
12. Account-risk warning fires before the first real batch (inherited from `runGuardedBatch`).
13. Locale assumption is documented: caller is responsible for ensuring Facebook is rendered in a supported locale; mismatched locale raises "comment input not found" error — explicit, not silent.

**AC5 — Tests**
14. Browser-free unit tests using a fake `page` + spy `commentSinglePost`:
    - Dry-run returns preview with `previewComment` field, does NOT call commentSinglePost
    - `dryRun: false` calls commentSinglePost once per URL with correct (page, url, commentText)
    - Batch enforcement inherited (over maxBatch throws)
    - Failed comment (e.g., input not found) records `ok: false` with error message
15. Smoke test gated by `FACEBOOK_TEST_SESSION` env: real comment on test post, verify comment appears (manual cleanup).

## Technical Notes

### Selector Strategy
Comment input selectors (from `docs/agents/selectors-facebook.md`):
- English: `[aria-label*="Write a comment"]`, `[placeholder*="Write a comment"]`
- Vietnamese: `[aria-label*="Viết bình luận"]`, `[placeholder*="Viết bình luận"]`

Submit strategy:
- Type comment text
- Press Enter key: `await page.keyboard.press('Enter')`
- Wait briefly (500ms) for comment to post

### Error Handling
- Comment input not found → clear error
- Navigation timeout → caught by `runGuardedBatch` retry logic
- Rate limiting/blocking → return error in result (does not crash batch)

### Integration with Story 2.1 Guardrails
- Uses `runGuardedBatch(postUrls, actionFn, options)`
- `actionFn = (postUrl) => commentSinglePost(page, postUrl, commentText)`
- Inherits: dry-run default, delay between actions, maxBatch, maxRetry, shouldStop, onProgress, account-risk warning

## Dependencies
- Story 2.1: `runGuardedBatch` helper ✓ (committed in 42ad98f)
- Story 1.1: Facebook login (`loginWithCookie`) ✓
- `docs/agents/selectors-facebook.md`: comment input selectors (to be added)

## Out of Scope
- Auto-generating comment content (user must provide)
- Replying to existing comments (only top-level comments)
- Mentioning/tagging users in comments
- Adding media/emojis to comments (plain text only in MVP)

## Test Coverage Focus
- P0: dry-run default (no DOM writes), preview shape with commentText
- P0: dryRun:false invokes commentSinglePost per URL
- P0: batch enforcement (inherited from runGuardedBatch)
- P1: error handling (input not found, navigation failure)
- P1: commentText pass-through (user-provided, not generated)
- P2: locale selector coverage (en/vi)

## Implementation Checklist
- [ ] Add comment input selectors to `docs/agents/selectors-facebook.md`
- [ ] Implement `commentSinglePost(page, postUrl, commentText)` helper
- [ ] Implement `commentOnFacebookPosts(page, postUrls, commentText, options)` routing through `runGuardedBatch`
- [ ] Add to default export in `api/services/facebookAutomation.js`
- [ ] Write browser-free unit tests (dry-run, real write, error cases)
- [ ] Optional: smoke test with real Facebook session
- [ ] Update automation-summary.md after test verification
