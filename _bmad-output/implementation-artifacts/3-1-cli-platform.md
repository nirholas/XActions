---
baseline_commit: fdb9cb4
---

# Story 3.1: CLI `--platform facebook`

Status: done

## Story

As a CLI user of XActions,
I want to run scrape and automate commands against Facebook via `--platform facebook`,
So that I can use Facebook from the terminal like any other platform.

## Acceptance Criteria

**AC1 — Scrape command with platform flag**
1. A new `xactions scrape` command accepts `--platform <platform>` and `--action <action>`.
2. When `--platform facebook` (or `--platform fb`), routes through the unified `scrape()` dispatcher in `src/scrapers/index.js`.
3. Supported actions: `profile`, `posts` (alias: `tweets`), `followers`, `search`.
4. Output routes through existing exporters (JSON/CSV via `--output`); console table otherwise.

**AC2 — Facebook auth via --auth-cookie**
5. Facebook requires `--auth-cookie '{"c_user":"...","xs":"..."}'` (JSON string) instead of `--auth-token`.
6. If `--platform facebook` but no `--auth-cookie`, surface a clear error before launching browser.
7. `--auth-cookie` content is never echoed in output or logs.

**AC3 — Automate command with platform flag**
8. A new `xactions automate` command accepts `--platform facebook`, `--action <action>`, and target args.
9. Supported actions: `like`, `comment`, `post`.
10. `--dry-run` flag defaults to enabled; `--no-dry-run` required for real writes.
11. Routes to the appropriate function from `api/services/facebookAutomation.js`.

**AC4 — Error handling**
12. Unknown platform → dispatcher's `Unknown platform` error displayed cleanly.
13. Unknown action → dispatcher's `Action not available` error displayed cleanly.
14. Missing required args surfaced before any browser launch.

**AC5 — Backward compatibility**
15. Existing Twitter commands (`profile`, `followers`, `tweets`, `search`, etc.) are NOT modified.
16. New commands are purely additive.

## Technical Notes

### Implementation approach
Two new top-level commands added to `src/cli/index.js`:

```
xactions scrape --platform facebook --action profile --username <handle> [--auth-cookie '{}'] [-o output.json]
xactions scrape --platform facebook --action posts --username <handle> --limit 20
xactions scrape --platform facebook --action followers --username <handle>
xactions scrape --platform facebook --action search --query "keyword" --limit 20

xactions automate --platform facebook --action like --urls url1,url2 [--no-dry-run]
xactions automate --platform facebook --action comment --urls url1,url2 --text "comment" [--no-dry-run]
xactions automate --platform facebook --action post --text "content" [--no-dry-run]
```

### Auth
- Scrape: `--auth-cookie '{"c_user":"xxx","xs":"yyy"}'`
- Automate: same `--auth-cookie` (needed for Puppeteer session)
- Cookie never logged or echoed

### Integration points
- Scrape: `import { scrape } from '../scrapers/index.js'` (already exports `scrape`)
- Automate: `import { likeFacebookPosts, commentOnFacebookPosts, createFacebookPost } from '../../api/services/facebookAutomation.js'`

## Dependencies
- Epic 1 dispatcher registration ✓ (`facebook`/`fb` in `src/scrapers/index.js` platforms)
- Epic 2 automation functions ✓ (`likeFacebookPosts`, `commentOnFacebookPosts`, `createFacebookPost`)

## Out of Scope
- Modifying existing Twitter-specific commands
- Interactive prompts for Facebook auth (provide via flag)
- `--google-sheets` export for Facebook (existing exporter handles this)

## Implementation Checklist
- [ ] Add `xactions scrape` command to `src/cli/index.js`
- [ ] Add `xactions automate` command to `src/cli/index.js`
- [ ] Handle `--auth-cookie` parsing and validation
- [ ] Route scrape actions through unified `scrape()` dispatcher
- [ ] Route automate actions through facebookAutomation exports
- [ ] Surface clear errors for unknown platform/action/missing auth

## Review Findings

> Batch code review 2026-06-09 (3-layer adversarial). Tests 71/71 pass.

### Patch
- [x] [Review][Patch][HIGH] `automate` command missing hard auth guard — `if (authCookie) loginWithCookie(...)` ran unauthenticated when --auth-cookie omitted, every action failing with confusing selector errors — FIXED: hard guard rejects missing --auth-cookie up front (mirrors scrape command); login now unconditional.
- [x] [Review][Patch][MEDIUM] `--text`/`--urls` validated after browser launch (wasted launch on bad args) — FIXED: action + required-arg validation moved before createBrowser(); removed duplicate in-try checks.

### Notes
- `dryRun = options.dryRun !== false` is safe (Commander `--no-dry-run` sets dryRun=false explicitly; undefined/true → dry-run). Not a bug — verified.
