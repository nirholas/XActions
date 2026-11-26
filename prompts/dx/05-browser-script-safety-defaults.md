# 05: every write script previews first

Read `prompts/dx/00-README.md` first. Wave 2. Needs 01 merged.

## Goal

Every browser script that changes an account supports a dry run, defaults to it, and
exposes the same controls. A check enforces it for new scripts.

## Why

Safety defaults differ from script to script. In `browser/` on 2026-11-26, 35 files set
`dryRun: true` and 10 set `dryRun: false`:

```bash
grep -l "dryRun: *true" browser/*.js | wc -l
grep -l "dryRun: *false" browser/*.js | wc -l
```

A user who learns on one script that pasting only previews will lose follows or posts on
the next one. Many scripts have no dry run at all; some of those are read-only and need
none, some are not.

## Do

1. Use the manifest's `writes` flag to list every script that changes the account.
   Verify the flag by reading each one: a script that clicks follow, unfollow, like,
   repost, reply, post, delete, block, mute, send or save is a write.
2. For each write script:
   - add `dryRun` to `CONFIG` if missing, defaulting to `true`;
   - in dry run, do everything except the final click or request, and log what would
     have happened in the same shape as a real run;
   - start by logging one clear line: preview mode and how to turn it off;
   - expose `window.XActions.pause()`, `resume()`, `abort()` and `status()` where the
     script loops, matching `browser/unfollowback.js`;
   - keep its existing delays. Never shorten one.
3. Scripts that default to `false` today flip to `true`. That is a behaviour change:
   list every one in the CHANGELOG entry.
4. Add `scripts/check-script-safety.mjs`: fails when a manifest entry has `writes: true`
   and either lacks `dryRun` or does not default it to `true`. Wire it into
   `npm run docs:check` and the pre-commit hook path for `browser/`.
5. Regenerate the manifest and the mirrors from prompt 01.

## Do not

- Do not add dry run to read-only scripts.
- Do not change selectors or flow beyond what dry run and the controls need.

## Done when

- `node scripts/check-script-safety.mjs` passes and fails on a deliberately broken
  fixture in its test.
- jsdom tests for at least five converted scripts prove that dry run performs no click on
  the action button and a real run does.
- `docs/browser-scripts.md` states the rule in one paragraph.
